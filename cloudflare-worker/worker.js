const WARFRAME_MARKET_BASE = 'https://api.warframe.market/v2';

function corsHeaders(request) {
  let origin = '*';
  try {
    if (request && request.headers && typeof request.headers.get === 'function') {
      origin = request.headers.get('Origin') || '*';
    }
  } catch (error) {
    console.error('[market-proxy] cors header read failed', error?.message || String(error));
  }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
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

function normalizeSearchItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      item_name: item?.item_name || item?.name || item?.i18n?.en?.name || item?.title || item?.slug || item?.url_name || '',
      url_name: item?.item_url_name || item?.url_name || item?.slug || item?.id || '',
      thumb: item?.thumb || item?.i18n?.en?.thumb || item?.i18n?.en?.icon || ''
    }))
    .filter(item => item.item_name && item.url_name);
}

function detectItemArrayPaths(payload) {
  const paths = [
    ['payload.items', payload?.payload?.items],
    ['payload.item', payload?.payload?.item],
    ['payload', payload?.payload],
    ['data.payload.items', payload?.data?.payload?.items],
    ['data.items', payload?.data?.items],
    ['items', payload?.items],
    ['data', payload?.data]
  ];
  const detected = paths.find(([, value]) => Array.isArray(value));
  return {
    path: detected ? detected[0] : 'none',
    items: detected ? detected[1] : []
  };
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

async function handleSearch(url) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const upstream = `${WARFRAME_MARKET_BASE}/items`;
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

async function handleOrders(requestUrl, itemUrlName) {
  if (!itemUrlName) {
    return json(requestUrl, { error: 'missing_item', source: 'cloudflare-worker' }, 400);
  }

  const normalizedName = decodeURIComponent(String(itemUrlName || '')).trim().toLowerCase().replace(/\s+/g, '_');
  const upstream = `${WARFRAME_MARKET_BASE}/orders/item/${encodeURIComponent(normalizedName)}/top`;
  const result = await fetchJson(upstream);
  if (!result.ok) {
    return json(requestUrl, {
      error: result.error,
      upstreamUrl: result.upstreamUrl || upstream,
      source: 'cloudflare-worker',
      sellOrders: [],
      buyOrders: []
    }, result.status);
  }

  const payload = {
    payload: {
      orders: [
        ...((result.data?.data?.sell || []).map(order => ({ ...order, order_type: 'sell' }))),
        ...((result.data?.data?.buy || []).map(order => ({ ...order, order_type: 'buy' })))
      ]
    }
  };
  const normalized = normalizeOrders(payload, normalizedName.replace(/_/g, ' '));
  return json(requestUrl, {
    source: 'cloudflare-worker',
    item: normalizedName,
    fetchedAt: new Date().toISOString(),
    sellOrders: normalized.sellOrders,
    buyOrders: normalized.buyOrders
  });
}

export default {
  async fetch(request) {
    try {
      if (request.method === 'OPTIONS') {
        return json(request, { ok: true }, 204, { 'cache-control': 'no-store' });
      }
      if (request.method !== 'GET') {
        return json(request, { error: 'method_not_allowed' }, 405);
      }

      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, '');
      console.log(`[market-proxy] incoming route: ${path} query=${url.search}`);

      if (path === '/api/market/search') {
        return handleSearch(url);
      }

      const orderMatch = path.match(/^\/api\/market\/orders\/([^/]+)$/);
      if (orderMatch) {
        return handleOrders(url, orderMatch[1]);
      }

      return json(request, {
        ok: true,
        source: 'cloudflare-worker',
        routes: ['/api/market/search?q=', '/api/market/orders/:item']
      });
    } catch (error) {
      console.error('[market-proxy] unhandled exception', {
        message: error?.message || String(error),
        stack: error?.stack || 'no_stack'
      });
      return json(request, { error: `worker_error: ${error.message}`, source: 'cloudflare-worker' }, 500);
    }
  }
};
