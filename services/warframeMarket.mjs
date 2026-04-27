const DEFAULT_MARKET_BASE_URL = "https://api.warframe.market/v1";

const MARKET_BASE_URL = (process.env.WARFRAME_MARKET_BASE_URL || DEFAULT_MARKET_BASE_URL).replace(/\/+$/, "");
const MARKET_FALLBACK_BASE_URL = (process.env.WARFRAME_MARKET_FALLBACK_BASE_URL || "https://api.warframe.market/v2").replace(/\/+$/, "");
const MARKET_PLATFORM = process.env.WARFRAME_MARKET_PLATFORM || "pc";
const ITEMS_TTL_MS = Number(process.env.MARKET_ITEMS_TTL_MS || 30 * 60 * 1000);

let itemCache = {
  at: 0,
  items: []
};

function normalize(text = "") {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function marketFetch(path, baseUrl = MARKET_BASE_URL) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      platform: MARKET_PLATFORM,
      language: "en",
      "User-Agent": "ORBITER_OS_V2.5"
    }
  });

  if (!response.ok) {
    throw new Error(`Warframe Market HTTP ${response.status} for ${url}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Warframe Market returned an empty body for ${url}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Warframe Market JSON parse failed for ${url}: ${error.message}`);
  }
}

async function marketFetchWithFallback(v1Path, v2Path) {
  try {
    return {
      source: "warframe.market v1",
      json: await marketFetch(v1Path, MARKET_BASE_URL)
    };
  } catch (error) {
    console.warn("[warframe-market] v1 request failed, using centralized v2 fallback:", error.message || error);
    return {
      source: "warframe.market v2 fallback",
      json: await marketFetch(v2Path, MARKET_FALLBACK_BASE_URL)
    };
  }
}

function mapItem(item) {
  const itemName = item.item_name || item.en?.item_name || item.i18n?.en?.name || item.name || item.url_name || "";
  return {
    item_name: itemName,
    url_name: item.url_name || item.slug || normalize(itemName).replace(/\s+/g, "_"),
    id: item.id || item.item_id || "",
    thumb: item.thumb || ""
  };
}

async function loadItems() {
  if (itemCache.items.length && Date.now() - itemCache.at < ITEMS_TTL_MS) {
    return itemCache.items;
  }

  const result = await marketFetchWithFallback("/items", "/items");
  const rawItems = result.json?.payload?.items || result.json?.data || result.json?.items || [];
  const items = rawItems.map(mapItem).filter(item => item.item_name && item.url_name);

  itemCache = {
    at: Date.now(),
    items,
    source: result.source
  };

  return items;
}

export async function searchItems(query = "") {
  const items = await loadItems();
  const q = normalize(query);
  const filtered = q
    ? items.filter(item => normalize(item.item_name).includes(q) || normalize(item.url_name).includes(q))
    : items;

  return {
    source: itemCache.source || "warframe.market",
    cachedAt: itemCache.at ? new Date(itemCache.at).toISOString() : null,
    count: filtered.length,
    items: q ? filtered.slice(0, 40) : filtered
  };
}

function mapOrder(order, itemName, side) {
  const user = order.user || {};
  const price = Number(order.platinum);
  const username = user.ingame_name || user.ingameName || user.slug || "Unknown";

  return {
    id: order.id || "",
    type: order.order_type || order.type || side,
    user: username,
    status: String(user.status || order.status || "unknown").toLowerCase(),
    platinum: Number.isFinite(price) ? price : null,
    quantity: Number(order.quantity || 1),
    platform: user.platform || MARKET_PLATFORM,
    reputation: Number.isFinite(Number(user.reputation)) ? Number(user.reputation) : null,
    visible: order.visible !== false,
    updatedAt: order.last_update || order.updatedAt || null,
    whisper: `/w ${username} Hi! I want to buy: "${itemName}" for ${Number.isFinite(price) ? price : "?"} platinum. (warframe.market)`
  };
}

export async function getItemOrders(urlName) {
  if (!urlName) throw new Error("Missing market item url_name");

  const result = await marketFetchWithFallback(
    `/items/${encodeURIComponent(urlName)}/orders`,
    `/orders/item/${encodeURIComponent(urlName)}`
  );
  const rawOrders = result.json?.payload?.orders || result.json?.data || result.json?.orders || [];
  const itemName = result.json?.payload?.item?.item_name || urlName.replace(/_/g, " ");

  const sellOrders = rawOrders
    .map(order => mapOrder(order, itemName, "sell"))
    .filter(order => order.visible && order.type === "sell" && order.status === "ingame" && Number.isFinite(order.platinum))
    .sort((a, b) => a.platinum - b.platinum);

  const buyOrders = rawOrders
    .map(order => {
      const mapped = mapOrder(order, itemName, "buy");
      mapped.whisper = `/w ${mapped.user} Hi! I want to sell: "${itemName}" for ${mapped.platinum ?? "?"} platinum. (warframe.market)`;
      return mapped;
    })
    .filter(order => order.visible && order.type === "buy" && order.status === "ingame" && Number.isFinite(order.platinum))
    .sort((a, b) => b.platinum - a.platinum);

  return {
    source: result.source,
    fetchedAt: new Date().toISOString(),
    item: {
      item_name: itemName,
      url_name: urlName
    },
    sellOrders,
    buyOrders
  };
}
