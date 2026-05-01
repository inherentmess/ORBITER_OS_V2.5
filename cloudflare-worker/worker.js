const WM_V1_BASE = 'https://api.warframe.market/v1';
const WM_V2_BASE = 'https://api.warframe.market/v2';
const WIKI_API_BASE = 'https://wiki.warframe.com/api.php';
const WARFRAMESTAT_WORLDSTATE_URL = 'https://api.warframestat.us/pc';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function text(body = '', status = 200, extraHeaders = {}) {
  const mergedHeaders = (extraHeaders && typeof extraHeaders === 'object' && !Array.isArray(extraHeaders))
    ? extraHeaders
    : {};
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      ...mergedHeaders
    }
  });
}

function preflight() {
  return text('', 204, { 'cache-control': 'no-store' });
}

function json(...args) {
  let data;
  let status = 200;
  let extraHeaders = {};
  // Backward compatibility for existing callsites: json(request, data, status?, extraHeaders?)
  if (args.length >= 2 && (typeof args[0] === 'object' || args[0] === null)) {
    data = args[1];
    status = Number(args[2] ?? 200);
    extraHeaders = args[3] || {};
  } else {
    data = args[0];
    status = Number(args[1] ?? 200);
    extraHeaders = args[2] || {};
  }
  if (!Number.isFinite(status) || status < 100 || status > 999) status = 200;
  if (!extraHeaders || typeof extraHeaders !== 'object' || Array.isArray(extraHeaders)) extraHeaders = {};
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders
    }
  });
}

function buildCacheKeyRequest(request, pathOnly) {
  const url = new URL(request.url);
  const keyUrl = `${url.origin}${pathOnly}`;
  return new Request(keyUrl, { method: 'GET' });
}

async function cacheRoute(request, {
  pathOnly,
  cacheControl,
  ttlSeconds,
  bypassCache,
  produce
}) {
  const cache = caches.default;
  const cacheKey = buildCacheKeyRequest(request, pathOnly);

  if (!bypassCache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      return hit;
    }
  }

  const fresh = await produce();
  if (fresh.status >= 200 && fresh.status < 300) {
    await cache.put(cacheKey, fresh.clone());
  }

  return fresh;
}

async function fetchJson(upstreamUrl) {
  console.log(`[market-proxy] upstream request: ${upstreamUrl}`);
  const response = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Platform: 'pc'
    }
  });
  console.log(`[market-proxy] upstream response: ${response.status} ${upstreamUrl}`);

  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: `upstream_http_${response.status}`,
      upstreamUrl,
      body: text.slice(0, 300)
    };
  }

  if (!text.trim()) {
    return { ok: false, status: 502, error: 'upstream_empty_body', upstreamUrl };
  }

  try {
    return { ok: true, status: 200, data: JSON.parse(text) };
  } catch (error) {
    return { ok: false, status: 502, error: `upstream_parse_error: ${error.message}`, upstreamUrl };
  }
}

async function fetchWikiJson(params = {}) {
  const query = new URLSearchParams({
    format: 'json',
    ...params
  });
  const upstreamUrl = `${WIKI_API_BASE}?${query.toString()}`;
  console.log(`[wiki-proxy] upstream request: ${upstreamUrl}`);
  const response = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ORBITER-OS-Wiki-Proxy/1.0 (+https://orbiter-market-proxy.jrque.workers.dev)',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  console.log(`[wiki-proxy] upstream response: ${response.status} ${upstreamUrl}`);
  const text = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: `wiki_upstream_http_${response.status}`,
      upstreamUrl,
      body: text.slice(0, 300)
    };
  }
  if (!text.trim()) {
    return { ok: false, status: 502, error: 'wiki_upstream_empty_body', upstreamUrl };
  }
  try {
    return { ok: true, status: 200, data: JSON.parse(text), upstreamUrl };
  } catch (error) {
    return { ok: false, status: 502, error: `wiki_upstream_parse_error: ${error.message}`, upstreamUrl };
  }
}

function stripHtmlSnippet(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanWikiHtmlToText(value = '') {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(?:toc|mw-editsection|navbox|hatnote|reflist|reference)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[edit\s*\|\s*edit source\]/gi, ' ')
    .replace(/\[edit\]/gi, ' ')
    .replace(/\[\d+\]/g, ' ')
    .replace(/article\/section contains spoilers\.?/gi, ' ')
    .replace(/You'?re not supposed to be in here\.?/gi, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function decodeEntities(text = '') {
  const named = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  let out = String(text || '');
  Object.entries(named).forEach(([k, v]) => {
    out = out.split(k).join(v);
  });
  out = out.replace(/&#(\d+);/g, (_, num) => {
    const code = Number(num);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : _;
  });
  return out;
}

function wikiPageUrl(title = '') {
  return `https://wiki.warframe.com/w/${encodeURIComponent(String(title || '').replace(/\s+/g, '_'))}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeWarframeStatWorldstate(raw = {}) {
  // Debug: log the upstream root so we can verify field names in Cloudflare logs.
  console.log('TRACKERS RAW:', JSON.stringify({
    topLevelKeys: Object.keys(raw || {}),
    fissuresLength: Array.isArray(raw?.fissures) ? raw.fissures.length : 'not array',
    eventsLength: Array.isArray(raw?.events) ? raw.events.length : 'not array',
    invasionsLength: Array.isArray(raw?.invasions) ? raw.invasions.length : 'not array',
    syndicateMissionsLength: Array.isArray(raw?.syndicateMissions) ? raw.syndicateMissions.length : 'not array',
    sortie: raw?.sortie ? 'present' : 'missing',
    arbitration: raw?.arbitration ? 'present' : 'missing',
    nightwave: raw?.nightwave ? 'present' : 'missing',
    cetusCycle: raw?.cetusCycle ? 'present' : 'missing',
    earthCycle: raw?.earthCycle ? 'present' : 'missing',
    vallisCycle: raw?.vallisCycle ? 'present' : 'missing',
    cambionCycle: raw?.cambionCycle ? 'present' : 'missing'
  }));

  // Map directly from the upstream root -- no .data nesting, no renaming.
  // app.js reads these exact field names from the normalized object.
  return {
    events:            toArray(raw?.events),
    fissures:          toArray(raw?.fissures),
    invasions:         toArray(raw?.invasions),
    alerts:            toArray(raw?.alerts),
    dailyDeals:        toArray(raw?.dailyDeals),
    syndicateMissions: toArray(raw?.syndicateMissions),

    sortie:      raw?.sortie      || null,
    arbitration: raw?.arbitration || null,
    archonHunt:  raw?.archonHunt  || null,
    nightwave:   raw?.nightwave   || null,
    voidTrader:  raw?.voidTrader  || null,
    steelPath:   raw?.steelPath   || null,

    cetusCycle:   raw?.cetusCycle   || null,
    earthCycle:   raw?.earthCycle   || null,
    vallisCycle:  raw?.vallisCycle  || null,
    cambionCycle: raw?.cambionCycle || null,

    worldstateSource: 'WarframeStat.us'
  };
}

async function handleWorldstate(request) {
  console.log(`[worldstate-proxy] upstream request: ${WARFRAMESTAT_WORLDSTATE_URL}`);
  const response = await fetch(WARFRAMESTAT_WORLDSTATE_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'ORBITER-OS/2.5 (https://github.com/inherentmess/ORBITER_OS_V2.5; worldstate-proxy)',
    }
  });
  console.log(`[worldstate-proxy] upstream response: ${response.status} ${WARFRAMESTAT_WORLDSTATE_URL}`);

  const body = await response.text();
  console.log(`[worldstate-proxy] upstream body length: ${body.length}, preview: ${body.slice(0, 120)}`);

  if (!response.ok) {
    return json(request, {
      ok: false,
      error: `worldstate_upstream_http_${response.status}`,
      source: 'cloudflare-worker',
      upstreamUrl: WARFRAMESTAT_WORLDSTATE_URL,
      data: {}
    }, response.status);
  }

  let parsed = {};
  try {
    parsed = JSON.parse(body || '{}');
  } catch (error) {
    return json(request, {
      ok: false,
      error: `worldstate_parse_error_${error.message}`,
      source: 'cloudflare-worker',
      upstreamUrl: WARFRAMESTAT_WORLDSTATE_URL,
      data: {}
    }, 502);
  }

  // Log what the upstream root actually contains so we can verify field names.
  console.log(`[worldstate-proxy] upstream root keys: ${Object.keys(parsed).slice(0, 30).join(', ')}`);
  console.log(`[worldstate-proxy] fissures: ${Array.isArray(parsed.fissures) ? parsed.fissures.length : typeof parsed.fissures}`);
  console.log(`[worldstate-proxy] events: ${Array.isArray(parsed.events) ? parsed.events.length : typeof parsed.events}`);
  console.log(`[worldstate-proxy] sortie: ${parsed.sortie ? 'present' : 'missing'}`);
  console.log(`[worldstate-proxy] arbitration: ${parsed.arbitration ? 'present' : 'missing'}`);

  const normalized = normalizeWarframeStatWorldstate(parsed);
  return json(request, {
    ok: true,
    source: 'WarframeStat.us',
    upstreamUrl: WARFRAMESTAT_WORLDSTATE_URL,
    data: normalized
  }, 200, { 'cache-control': 'public, max-age=30' });
}

async function handleWikiSearch(request, url) {
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) {
    return json(request, { ok: true, query: '', source: 'cloudflare-worker', items: [], summary: null });
  }

  const searchResult = await fetchWikiJson({
    action: 'query',
    list: 'search',
    srsearch: q,
    srlimit: '8'
  });
  if (!searchResult.ok) {
    return json(request, {
      ok: false,
      error: searchResult.error,
      source: 'cloudflare-worker',
      upstreamUrl: searchResult.upstreamUrl,
      items: [],
      summary: null
    }, searchResult.status || 502);
  }

  const rows = Array.isArray(searchResult?.data?.query?.search) ? searchResult.data.query.search : [];
  const items = rows.map(entry => ({
    title: entry?.title || '',
    snippet: stripHtmlSnippet(entry?.snippet || ''),
    url: wikiPageUrl(entry?.title || '')
  }));

  let summary = null;
  const topTitle = items[0]?.title || '';
  if (topTitle) {
    const summaryResult = await fetchWikiJson({
      action: 'query',
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      redirects: '1',
      titles: topTitle
    });
    if (summaryResult.ok) {
      const pages = summaryResult?.data?.query?.pages || {};
      const firstPage = Object.values(pages)[0] || null;
      if (firstPage && !firstPage.missing && !firstPage.invalid) {
        summary = {
          title: firstPage.title || topTitle,
          extract: String(firstPage.extract || '').trim(),
          url: wikiPageUrl(firstPage.title || topTitle)
        };
      }
    }
  }

  return json(request, {
    ok: true,
    source: 'cloudflare-worker',
    query: q,
    items,
    summary
  }, 200, { 'cache-control': 'public, max-age=30' });
}

async function handleWikiPage(request, url) {
  const route = '/api/wiki/page';
  try {
    const title = (url.searchParams.get('title') || '').trim();
    if (!title) {
      return json(request, { ok: false, error: 'missing_title', source: 'cloudflare-worker', summary: null, page: null }, 400);
    }

    const summaryResult = await fetchWikiJson({
      action: 'query',
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      redirects: '1',
      titles: title
    });
    if (!summaryResult.ok) {
      console.error('[wiki-page] upstream failure', {
        route,
        upstreamUrl: summaryResult.upstreamUrl || '',
        status: summaryResult.status || 502,
        error: summaryResult.error || 'unknown'
      });
      return json(request, {
        ok: false,
        error: summaryResult.error,
        source: 'cloudflare-worker',
        upstreamUrl: summaryResult.upstreamUrl,
        summary: null,
        page: null
      }, summaryResult.status || 502);
    }

    const pages = summaryResult?.data?.query?.pages || {};
    const firstPage = Object.values(pages)[0] || null;
    if (!firstPage || firstPage.missing || firstPage.invalid) {
      return json(request, {
        ok: true,
        source: 'cloudflare-worker',
        summary: null,
        page: null
      });
    }

    const resolvedTitle = firstPage.title || title;
    const summary = {
      title: resolvedTitle,
      extract: String(firstPage.extract || '').trim(),
      url: wikiPageUrl(resolvedTitle)
    };

    let page = {
      title: resolvedTitle,
      url: wikiPageUrl(resolvedTitle),
      sections: [],
      importantSections: [],
      links: [],
      images: [],
      html: '',
      plainText: ''
    };

    const parseResult = await fetchWikiJson({
      action: 'parse',
      page: resolvedTitle,
      prop: 'text|sections|links|images',
      redirects: '1'
    });

    if (parseResult.ok) {
    const parse = parseResult?.data?.parse || {};
    const sections = Array.isArray(parse?.sections) ? parse.sections : [];
    const links = Array.isArray(parse?.links) ? parse.links : [];
    const images = Array.isArray(parse?.images) ? parse.images : [];
    const html = String(parse?.text?.['*'] || '');
    const plainText = html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1800);

    const skipSectionNames = new Set([
      'gallery',
      'media',
      'references',
      'patch history',
      'changelog',
      'notes and references'
    ]);

    let normalizedSections = sections
      .map(section => ({
        title: String(section?.line || '').trim(),
        number: String(section?.number || ''),
        line: String(section?.line || '').trim(),
        index: String(section?.index || '').trim(),
        level: Number(section?.level || section?.toclevel || 0),
        anchor: String(section?.anchor || '').trim(),
        content: ''
      }))
      .filter(section => section.line && section.index)
      .filter(section => !skipSectionNames.has(section.title.toLowerCase()))
      .slice(0, 12);

    normalizedSections = (await Promise.all(normalizedSections.map(async (section) => {
      const idx = String(section?.index || '').trim();
      if (!idx) return section;
      const sectionResult = await fetchWikiJson({
        action: 'parse',
        page: resolvedTitle,
        prop: 'text',
        section: idx,
        redirects: '1'
      });
      if (!sectionResult.ok) return section;
      const sectionHtml = String(sectionResult?.data?.parse?.text?.['*'] || '');
      const sectionText = decodeEntities(cleanWikiHtmlToText(sectionHtml)).slice(0, 2800);
      return {
        ...section,
        content: sectionText
      };
    })))
      .filter(section => String(section?.content || '').trim().length > 0);

    const importantTerms = ['acquisition', 'drop', 'drops', 'farming', 'abilities', 'stats', 'build', 'notes', 'tips'];
    const importantSections = normalizedSections
      .filter(section => importantTerms.some(term => section.line.toLowerCase().includes(term)))
      .slice(0, 8);

    const normalizedLinks = links
      .filter(link => Number(link?.ns) === 0 && link?.['*'])
      .map(link => String(link['*']).trim())
      .filter(Boolean)
      .slice(0, 24);

    const normalizedImages = images
      .map(name => String(name || '').trim())
      .filter(Boolean)
      .slice(0, 12);

      page = {
        title: resolvedTitle,
        url: wikiPageUrl(resolvedTitle),
        sections: normalizedSections.map(section => ({
          title: section.title,
          index: section.index,
          content: section.content,
          number: section.number,
          anchor: section.anchor
        })),
        importantSections,
        links: normalizedLinks,
      images: normalizedImages,
      html: html.slice(0, 20000),
      plainText
      };
    } else {
      console.error('[wiki-page] parse upstream failure', {
        route,
        upstreamUrl: parseResult.upstreamUrl || '',
        status: parseResult.status || 502,
        error: parseResult.error || 'unknown'
      });
    }

    return json(request, {
      ok: true,
      source: 'cloudflare-worker',
      summary,
      page
    }, 200, { 'cache-control': 'public, max-age=30' });
  } catch (err) {
    console.error('[wiki-page] exception', {
      route,
      exception: String(err?.message || err)
    });
    return json(request, {
      ok: false,
      error: String(err?.message || err),
      source: 'cloudflare-worker',
      summary: null,
      page: null
    }, 500);
  }
}

function detectItemArrayPaths(payload) {
  const top = payload || {};
  const paths = [
    ['payload.items', top?.payload?.items],
    ['payload.item', top?.payload?.item],
    ['payload', top?.payload],
    ['data.payload.items', top?.data?.payload?.items],
    ['data.items', top?.data?.items],
    ['items', top?.items],
    ['data', top?.data]
  ];
  const detected = paths.find(([, value]) => Array.isArray(value));
  return {
    path: detected ? detected[0] : 'none',
    items: detected ? detected[1] : [],
    topLevelKeys: Object.keys(top),
    payloadKeys: Object.keys(top?.payload || {}),
    itemsType: Array.isArray(top?.payload?.items)
  };
}

function normalizeCatalogItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      item_name: item?.item_name || item?.name || item?.i18n?.en?.name || item?.title || item?.slug || item?.url_name || '',
      url_name: item?.item_url_name || item?.url_name || item?.slug || item?.id || '',
      id: item?.id || item?.url_name || item?.slug || '',
      thumb: item?.thumb || item?.i18n?.en?.thumb || item?.i18n?.en?.icon || null
    }))
    .filter(item => item.item_name || item.url_name);
}

function normalizeSearchItems(items = []) {
  return normalizeCatalogItems(items).map(item => ({
    item_name: item.item_name,
    url_name: item.url_name,
    id: item.id,
    thumb: item.thumb
  }));
}

function normalizeOrders(payload = {}, itemName = '') {
  const orders = payload?.payload?.orders || [];
  const sellOrders = [];
  const buyOrders = [];

  for (const order of orders) {
    if (!order || order.visible === false) continue;
    const user = order.user || {};
    const rawType = String(order.order_type || order.type || order.side || '').toLowerCase().trim();
    const normalizedType = rawType === 'seller' ? 'sell'
      : rawType === 'buyer' ? 'buy'
        : rawType;
    const normalized = {
      id: order.id || '',
      order_type: normalizedType,
      platinum: Number(order.platinum),
      quantity: Number(order.quantity || 1),
      visible: order.visible !== false,
      platform: order.platform || 'pc',
      region: order.region || 'en',
      creation_date: order.creation_date || '',
      user: {
        ingameName: user.ingame_name || user.ingameName || 'Unknown',
        status: user.status || 'unknown',
        reputation: Number(user.reputation || 0),
        platform: user.platform || order.platform || 'pc'
      },
      item_name: itemName || ''
    };

    if (normalized.order_type === 'sell') sellOrders.push(normalized);
    if (normalized.order_type === 'buy') buyOrders.push(normalized);
  }

  return { sellOrders, buyOrders };
}

function normalizeTradeOrderForFilter(order = {}) {
  const type = String(order?.order_type || '').toLowerCase().trim();
  const status = String(order?.user?.status || '').toLowerCase().trim();
  return {
    ...order,
    order_type: type,
    user: {
      ...(order?.user || {}),
      status
    }
  };
}

async function fetchCatalogFromUpstream() {
  const v1Url = `${WM_V1_BASE}/items`;
  const v1 = await fetchJson(v1Url);
  if (v1.ok) {
    const detectedV1 = detectItemArrayPaths(v1.data);
    const normalizedV1 = normalizeCatalogItems(detectedV1.items);
    if (normalizedV1.length) {
      return {
        ok: true,
        source: 'cloudflare-worker:v1',
        upstreamUrl: v1Url,
        detectedPath: detectedV1.path,
        topLevelKeys: detectedV1.topLevelKeys,
        payloadKeys: detectedV1.payloadKeys,
        itemsType: detectedV1.itemsType,
        items: normalizedV1
      };
    }
  }

  const v2Url = `${WM_V2_BASE}/items`;
  const v2 = await fetchJson(v2Url);
  if (v2.ok) {
    const detectedV2 = detectItemArrayPaths(v2.data);
    const normalizedV2 = normalizeCatalogItems(detectedV2.items);
    if (normalizedV2.length) {
      return {
        ok: true,
        source: 'cloudflare-worker:v2-fallback',
        upstreamUrl: v2Url,
        detectedPath: detectedV2.path,
        topLevelKeys: detectedV2.topLevelKeys,
        payloadKeys: detectedV2.payloadKeys,
        itemsType: detectedV2.itemsType,
        items: normalizedV2
      };
    }
    return {
      ok: false,
      status: 200,
      error: 'catalog_parse_failed',
      source: 'cloudflare-worker:v2-fallback',
      upstreamUrl: v2Url,
      diagnostic: {
        topLevelKeys: detectedV2.topLevelKeys,
        payloadKeys: detectedV2.payloadKeys,
        itemsType: detectedV2.itemsType,
        detectedPath: detectedV2.path,
        sample: Array.isArray(detectedV2.items) && detectedV2.items.length ? detectedV2.items[0] : null
      }
    };
  }

  return {
    ok: false,
    status: Math.max(v1.status || 500, v2.status || 500),
    error: v1.error || v2.error || 'upstream_catalog_failed',
    source: 'cloudflare-worker',
    upstreamUrl: `${v1Url} -> ${v2Url}`
  };
}

async function handleItems(request) {
  const result = await fetchCatalogFromUpstream();
  if (!result.ok) {
    return json(request, {
      ok: false,
      error: result.error || 'catalog_parse_failed',
      source: result.source || 'cloudflare-worker',
      upstreamUrl: result.upstreamUrl,
      items: [],
      diagnostic: result.diagnostic || null
    }, result.status || 200);
  }

  console.log(`[market-proxy] catalog source=${result.source} upstream=${result.upstreamUrl} detectedPath=${result.detectedPath} usable=${result.items.length}`);
  console.log('[market-proxy] catalog first usable item sample', result.items[0] || null);
  return json(request, {
    ok: true,
    source: result.source,
    upstreamUrl: result.upstreamUrl,
    items: result.items.map(item => ({
      item_name: item.item_name,
      url_name: item.url_name,
      id: item.id,
      thumb: item.thumb
    }))
  });
}

async function handleSearch(request, url) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const catalog = await fetchCatalogFromUpstream();
  if (!catalog.ok) {
    return json(request, {
      ok: false,
      error: catalog.error || 'catalog_parse_failed',
      source: catalog.source || 'cloudflare-worker',
      upstreamUrl: catalog.upstreamUrl,
      items: [],
      diagnostic: catalog.diagnostic || null
    }, catalog.status || 200);
  }

  const allItems = normalizeSearchItems(catalog.items);
  const filtered = !q
    ? allItems
    : allItems.filter(item => String(item.item_name || '').toLowerCase().includes(q) || String(item.url_name || '').toLowerCase().includes(q));
  console.log(`[market-proxy] search q="${q}" total=${allItems.length} matched=${filtered.length}`);
  console.log('[market-proxy] search first usable item sample', filtered[0] || allItems[0] || null);
  return json(request, {
    ok: true,
    source: catalog.source,
    upstreamUrl: catalog.upstreamUrl,
    count: filtered.length,
    items: filtered
  });
}

function normalizeOrdersFromV2(data = {}) {
  const top = data || {};
  if (Array.isArray(top?.data)) {
    return {
      payload: {
        orders: top.data.map(order => {
          const rawType = String(order?.order_type || order?.type || order?.side || '').toLowerCase().trim();
          const mappedType = rawType === 'seller' ? 'sell'
            : rawType === 'buyer' ? 'buy'
              : rawType;
          return { ...order, order_type: mappedType };
        })
      }
    };
  }
  const pickArray = (candidates) => candidates.find(Array.isArray) || [];
  const digArray = (node, path) => {
    try {
      return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), node);
    } catch {
      return undefined;
    }
  };

  const sell = [
    top?.data?.sell,
    top?.data?.sell_orders,
    top?.payload?.sell,
    top?.payload?.sell_orders,
    top?.sell,
    top?.sell_orders
  ].find(Array.isArray) || [];
  const buy = [
    top?.data?.buy,
    top?.data?.buy_orders,
    top?.payload?.buy,
    top?.payload?.buy_orders,
    top?.buy,
    top?.buy_orders
  ].find(Array.isArray) || [];
  const genericOrders = [
    top?.data?.orders,
    top?.payload?.orders,
    top?.orders
  ].find(Array.isArray) || [];

  // Additional v2 variants observed in different payload envelopes.
  const sellAlt = pickArray([
    digArray(top, 'data.sell.orders'),
    digArray(top, 'data.sell.items'),
    digArray(top, 'payload.sell.orders'),
    digArray(top, 'payload.sell.items'),
    digArray(top, 'sell.orders'),
    digArray(top, 'sell.items')
  ]);
  const buyAlt = pickArray([
    digArray(top, 'data.buy.orders'),
    digArray(top, 'data.buy.items'),
    digArray(top, 'payload.buy.orders'),
    digArray(top, 'payload.buy.items'),
    digArray(top, 'buy.orders'),
    digArray(top, 'buy.items')
  ]);
  const genericAlt = pickArray([
    digArray(top, 'data.payload.orders'),
    digArray(top, 'payload.data.orders'),
    digArray(top, 'payload.payload.orders'),
    digArray(top, 'response.orders')
  ]);

  const mergedSell = [...sell, ...sellAlt];
  const mergedBuy = [...buy, ...buyAlt];
  const mergedGeneric = [...genericOrders, ...genericAlt];

  const ordersFromGeneric = mergedGeneric.map(order => {
    const side = String(order?.order_type || order?.orderType || order?.type || order?.side || '').toLowerCase();
    if (side === 'seller') return { ...order, order_type: 'sell' };
    if (side === 'buyer') return { ...order, order_type: 'buy' };
    return { ...order, order_type: side };
  });

  if (!mergedSell.length && !mergedBuy.length && !mergedGeneric.length) {
    console.log('[market-proxy] v2 parser found no known arrays', {
      topLevelKeys: Object.keys(top || {}),
      dataKeys: Object.keys(top?.data || {}),
      payloadKeys: Object.keys(top?.payload || {})
    });
  } else {
    console.log('[market-proxy] v2 parser arrays', {
      sell: mergedSell.length,
      buy: mergedBuy.length,
      generic: mergedGeneric.length
    });
  }

  return {
    payload: {
      orders: [
        ...mergedSell.map(order => ({ ...order, order_type: 'sell' })),
        ...mergedBuy.map(order => ({ ...order, order_type: 'buy' })),
        ...ordersFromGeneric
      ]
    }
  };
}

function uniqueOrdersById(orders = []) {
  const out = [];
  const seen = new Set();
  for (const order of orders) {
    const key = String(order?.id || '');
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(order);
  }
  return out;
}

async function fetchAllV1Orders(normalizedName) {
  const perPage = 100;
  const maxPages = 30;
  const all = [];
  let firstError = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const upstream = `${WM_V1_BASE}/items/${encodeURIComponent(normalizedName)}/orders?page=${page}&per_page=${perPage}`;
    const result = await fetchJson(upstream);
    if (!result.ok) {
      if (page === 1) return { ok: false, error: result.error, status: result.status, upstreamUrl: upstream };
      firstError = firstError || result.error;
      break;
    }
    const pageOrders = result.data?.payload?.orders || [];
    all.push(...pageOrders);
    if (!Array.isArray(pageOrders) || pageOrders.length < perPage) break;
  }

  return {
    ok: true,
    source: 'cloudflare-worker:v1',
    warning: firstError || null,
    orders: uniqueOrdersById(all)
  };
}

async function fetchAllV2Orders(normalizedName) {
  const perPage = 100;
  const maxPages = 30;
  const allSell = [];
  const allBuy = [];
  const allGeneric = [];
  let firstError = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const upstream = `${WM_V2_BASE}/orders/item/${encodeURIComponent(normalizedName)}?page=${page}&per_page=${perPage}`;
    const result = await fetchJson(upstream);
    if (!result.ok) {
      if (page === 1) return { ok: false, error: result.error, status: result.status, upstreamUrl: upstream };
      firstError = firstError || result.error;
      break;
    }
    const normalizedPage = normalizeOrdersFromV2(result.data);
    const combined = normalizedPage?.payload?.orders || [];
    const sellPage = combined.filter(order => String(order?.order_type || '').toLowerCase() === 'sell');
    const buyPage = combined.filter(order => String(order?.order_type || '').toLowerCase() === 'buy');
    const genericPage = combined.filter(order => {
      const type = String(order?.order_type || '').toLowerCase();
      return type === 'sell' || type === 'buy';
    });
    allSell.push(...sellPage);
    allBuy.push(...buyPage);
    allGeneric.push(...genericPage);
    if (Array.isArray(result.data?.data)) break;
    if (sellPage.length < perPage && buyPage.length < perPage) break;
  }

  const uniqueGeneric = uniqueOrdersById(allGeneric);
  if (uniqueGeneric.length) {
    return {
      ok: true,
      source: 'cloudflare-worker:v2-fallback',
      warning: firstError || null,
      ordersPayload: { payload: { orders: uniqueGeneric } }
    };
  }

  return {
    ok: true,
    source: 'cloudflare-worker:v2-fallback',
    warning: firstError || null,
    ordersPayload: normalizeOrdersFromV2({ data: { sell: uniqueOrdersById(allSell), buy: uniqueOrdersById(allBuy) } })
  };
}

async function handleOrders(requestUrl, itemUrlName) {
  if (!itemUrlName) {
    return json(requestUrl, { error: 'missing_item', source: 'cloudflare-worker' }, 400);
  }

  const normalizedName = decodeURIComponent(String(itemUrlName || '')).trim().toLowerCase().replace(/\s+/g, '_');
  const resultV1 = await fetchAllV1Orders(normalizedName);
  if (resultV1.ok) {
    const payload = { payload: { orders: resultV1.orders } };
    const normalized = normalizeOrders(payload, normalizedName.replace(/_/g, ' '));
    const normalizedTrade = [...normalized.sellOrders, ...normalized.buyOrders]
      .map(normalizeTradeOrderForFilter)
      .filter(order => order.order_type === 'sell' || order.order_type === 'buy');
    const uniqueStatus = [...new Set(normalizedTrade.map(o => String(o?.user?.status || '').toLowerCase().trim()))];
    const uniqueType = [...new Set(normalizedTrade.map(o => String(o?.order_type || '').toLowerCase().trim()))];
    console.log(`[market-proxy] orders(v1) item=${normalizedName} raw=${normalizedTrade.length}`);
    console.log('[market-proxy] orders(v1) unique user.status', uniqueStatus);
    console.log('[market-proxy] orders(v1) unique order_type', uniqueType);
    return json(requestUrl, {
      orders: normalizedTrade
    });
  }

  const resultV2 = await fetchAllV2Orders(normalizedName);
  if (!resultV2.ok) {
    return json(requestUrl, {
      error: resultV1.error || resultV2.error,
      upstreamUrl: `${WM_V1_BASE}/items/${encodeURIComponent(normalizedName)}/orders?page=1&per_page=100 -> ${WM_V2_BASE}/orders/item/${encodeURIComponent(normalizedName)}?page=1&per_page=100`,
      orders: []
    }, Math.max(resultV1.status || 500, resultV2.status || 500));
  }

  const normalized = normalizeOrders(resultV2.ordersPayload, normalizedName.replace(/_/g, ' '));
  const normalizedTrade = [...normalized.sellOrders, ...normalized.buyOrders]
    .map(normalizeTradeOrderForFilter)
    .filter(order => order.order_type === 'sell' || order.order_type === 'buy');
  const uniqueStatus = [...new Set(normalizedTrade.map(o => String(o?.user?.status || '').toLowerCase().trim()))];
  const uniqueType = [...new Set(normalizedTrade.map(o => String(o?.order_type || '').toLowerCase().trim()))];
  console.log(`[market-proxy] orders(v2) item=${normalizedName} raw=${normalizedTrade.length}`);
  console.log('[market-proxy] orders(v2) unique user.status', uniqueStatus);
  console.log('[market-proxy] orders(v2) unique order_type', uniqueType);
  return json(requestUrl, {
    orders: normalizedTrade
  });
}

async function handleSearchLegacy(url) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const upstream = `${WM_V2_BASE}/items`;
  const result = await fetchJson(upstream);
  if (!result.ok) {
    return json(null, { error: result.error, upstreamUrl: result.upstreamUrl || upstream, source: 'cloudflare-worker', items: [] }, result.status);
  }

  const topLevelKeys = Object.keys(result?.data || {});
  const detected = detectItemArrayPaths(result.data);
  const rawItems = detected.items;
  const allItems = normalizeSearchItems(rawItems);
  console.log(`[market-proxy] search top-level keys=${topLevelKeys.join(',')}`);
  console.log(`[market-proxy] search detected item array path=${detected.path}`);
  console.log(`[market-proxy] search source rows=${rawItems.length} usable=${allItems.length} query="${q}"`);
  console.log('[market-proxy] search first usable item sample', allItems[0] || null);
  if (!allItems.length) {
    return json(null, {
      error: 'catalog_zero_usable_items',
      source: 'cloudflare-worker',
      items: [],
      diagnostic: {
        detectedPath: detected.path,
        topLevelKeys,
        sourceCount: Array.isArray(rawItems) ? rawItems.length : 0,
        firstSourceItem: Array.isArray(rawItems) && rawItems.length ? rawItems[0] : null
      }
    }, 200);
  }
  const filtered = !q
    ? allItems
    : allItems.filter(item => item.item_name.toLowerCase().includes(q) || item.url_name.toLowerCase().includes(q));

  return json(null, {
    source: 'cloudflare-worker',
    count: filtered.length,
    items: filtered
  });
}

export default {
  async fetch(request) {
    try {
      if (request.method === 'OPTIONS') {
        return preflight(request);
      }
      if (request.method !== 'GET') {
        return json(request, { error: 'method_not_allowed' }, 405);
      }

      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, '');
      const refreshRequested = url.searchParams.get('refresh') === '1';
      console.log(`[market-proxy] incoming route: ${path} query=${url.search}`);

      if (path === '/api/market/items' || path === '/market/items') {
        return cacheRoute(request, {
          pathOnly: path,
          cacheControl: 'public, max-age=600',
          ttlSeconds: 600,
          bypassCache: refreshRequested,
          produce: () => handleItems(request)
        });
      }

      if (path === '/api/market/search' || path === '/market/search') {
        return handleSearch(request, url);
      }

      if (path === '/api/wiki/search') {
        return handleWikiSearch(request, url);
      }

      if (path === '/api/wiki/page') {
        return handleWikiPage(request, url);
      }

      if (path === '/api/worldstate') {
        return cacheRoute(request, {
          pathOnly: path,
          cacheControl: 'public, max-age=30',
          ttlSeconds: 30,
          bypassCache: refreshRequested,
          produce: () => handleWorldstate(request)
        });
      }

      const orderMatch = path.match(/^\/(?:api\/)?market\/orders\/([^/]+)$/);
      if (orderMatch) {
        return cacheRoute(request, {
          pathOnly: path,
          cacheControl: 'public, max-age=30',
          ttlSeconds: 30,
          bypassCache: refreshRequested,
          produce: () => handleOrders(url, orderMatch[1])
        });
      }

      return json(request, {
        ok: false,
        error: 'not_found',
        source: 'cloudflare-worker',
        orders: [],
        routes: [
          '/api/market/items',
          '/api/market/search?q=',
          '/api/market/orders/:url_name',
          '/api/wiki/search?q=',
          '/api/wiki/page?title=',
          '/api/worldstate',
          '/market/items',
          '/market/search?q=',
          '/market/orders/:url_name'
        ]
      }, 404);
      } catch (error) {
        console.error('worker_exception', {
          message: error?.message || String(error),
          stack: error?.stack || 'no_stack'
        });
        return json({
          ok: false,
          error: 'worker_exception',
          message: String(error?.message || error)
        }, 500);
      }
    }
  };
