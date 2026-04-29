const WM_V1_BASE = 'https://api.warframe.market/v1';
const WM_V2_BASE = 'https://api.warframe.market/v2';

function corsHeaders(request) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
}

function preflight(request) {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      'cache-control': 'no-store'
    }
  });
}

function json(request, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
      'cache-control': 'public, max-age=30',
      ...extraHeaders
    }
  });
}

function applyCorsAndCacheHeaders(request, response, cacheControl) {
  const headers = new Headers(response.headers || {});
  const cors = corsHeaders(request);
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
  if (cacheControl) headers.set('cache-control', cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
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
      return applyCorsAndCacheHeaders(request, hit, cacheControl);
    }
  }

  const fresh = await produce();
  const shaped = applyCorsAndCacheHeaders(request, fresh, cacheControl);

  if (shaped.status >= 200 && shaped.status < 300) {
    const cacheable = applyCorsAndCacheHeaders(request, shaped.clone(), `public, max-age=${ttlSeconds}`);
    await cache.put(cacheKey, cacheable);
  }

  return shaped;
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
    const normalized = {
      id: order.id || '',
      order_type: order.order_type || '',
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

function filterIngameTradeOrders(orders = []) {
  return (Array.isArray(orders) ? orders : []).filter(order => {
    const type = String(order?.order_type || '').toLowerCase().trim();
    const status = String(order?.user?.status || '').toLowerCase().trim();
    return (type === 'sell' || type === 'buy') && status === 'ingame';
  });
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

function summarizeOrderDebug(orders = []) {
  const list = Array.isArray(orders) ? orders : [];
  return {
    rawCount: list.length,
    uniqueStatus: [...new Set(list.map(o => String(o?.user?.status || '').toLowerCase().trim()))],
    uniqueType: [...new Set(list.map(o => String(o?.order_type || '').toLowerCase().trim()))]
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
    allSell.push(...sellPage);
    allBuy.push(...buyPage);
    if (sellPage.length < perPage && buyPage.length < perPage) break;
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
    const debug = summarizeOrderDebug(normalizedTrade);
    console.log(`[market-proxy] orders(v1) item=${normalizedName} raw=${debug.rawCount} ingame=${filterIngameTradeOrders(normalizedTrade).length}`);
    console.log('[market-proxy] orders(v1) unique user.status', debug.uniqueStatus);
    console.log('[market-proxy] orders(v1) unique order_type', debug.uniqueType);
    const filteredOrders = filterIngameTradeOrders(normalizedTrade);
    return json(requestUrl, {
      orders: filteredOrders,
      rawCount: debug.rawCount,
      ingameCount: filteredOrders.length
    });
  }

  const resultV2 = await fetchAllV2Orders(normalizedName);
  if (!resultV2.ok) {
    return json(requestUrl, {
      error: resultV1.error || resultV2.error,
      upstreamUrl: `${WM_V1_BASE}/items/${encodeURIComponent(normalizedName)}/orders?page=1&per_page=100 -> ${WM_V2_BASE}/orders/item/${encodeURIComponent(normalizedName)}?page=1&per_page=100`,
      orders: [],
      rawCount: 0,
      ingameCount: 0
    }, Math.max(resultV1.status || 500, resultV2.status || 500));
  }

  const normalized = normalizeOrders(resultV2.ordersPayload, normalizedName.replace(/_/g, ' '));
  const normalizedTrade = [...normalized.sellOrders, ...normalized.buyOrders]
    .map(normalizeTradeOrderForFilter)
    .filter(order => order.order_type === 'sell' || order.order_type === 'buy');
  const debug = summarizeOrderDebug(normalizedTrade);
  const filteredOrders = filterIngameTradeOrders(normalizedTrade);
  console.log(`[market-proxy] orders(v2) item=${normalizedName} raw=${debug.rawCount} ingame=${filteredOrders.length}`);
  console.log('[market-proxy] orders(v2) unique user.status', debug.uniqueStatus);
  console.log('[market-proxy] orders(v2) unique order_type', debug.uniqueType);
  return json(requestUrl, {
    orders: filteredOrders,
    rawCount: debug.rawCount,
    ingameCount: filteredOrders.length
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
          '/market/items',
          '/market/search?q=',
          '/market/orders/:url_name'
        ]
      }, 404);
    } catch (error) {
      console.error('[market-proxy] unhandled exception', {
        message: error?.message || String(error),
        stack: error?.stack || 'no_stack'
      });
      return json(request, { error: `worker_error: ${error.message}`, source: 'cloudflare-worker' }, 500);
    }
  }
};
