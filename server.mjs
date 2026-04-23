import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const PORT = Number(process.env.PORT || 8787);
const ROOT = process.cwd();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MARKET_API = "https://api.warframe.market/v2";
const BROWSE_ORACLE_API = "https://oracle.browse.wf";
const BROWSE_WF_API = "https://browse.wf";
const cache = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "cache-control": status === 200 ? "public, max-age=60" : "no-store"
  });
  res.end(body);
}

async function fetchJsonCached(key, url) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return { source: "memory-cache", data: cached.data };
  }

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Warframe Market HTTP ${response.status} for ${url}`);
  }

  const data = await response.json();
  cache.set(key, { time: Date.now(), data });

  if (key === "items") {
    await writeFile(join(ROOT, "warframe-market-items-v2.json"), JSON.stringify(data));
  }

  return { source: "warframe-market", data };
}

async function fetchTextCached(key, url, ttl = 120000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < ttl) {
    return { source: "memory-cache", data: cached.data };
  }

  const response = await fetch(url, { headers: { accept: "application/json,text/plain" } });
  if (!response.ok) {
    throw new Error(`browse.wf HTTP ${response.status} for ${url}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`browse.wf returned an empty body for ${url}`);
  }

  cache.set(key, { time: Date.now(), data: text });
  return { source: "browse.wf", data: text };
}

async function fetchBrowseWorldstateCached() {
  const worldstate = await fetchTextCached("browse:worldstate", `${BROWSE_ORACLE_API}/worldState.json`);
  const incursions = await fetchTextCached("browse:sp-incursions", `${BROWSE_WF_API}/sp-incursions.txt`, 6 * 60 * 60 * 1000);
  const arbys = await fetchTextCached("browse:arbys", `${BROWSE_WF_API}/arbys.txt`, 6 * 60 * 60 * 1000);
  const bountyCycle = await fetchTextCached("browse:bounty-cycle", `${BROWSE_ORACLE_API}/bounty-cycle`);
  const locationBounties = await fetchTextCached("browse:location-bounties", `${BROWSE_ORACLE_API}/location-bounties`);
  const data = {
    worldState: JSON.parse(worldstate.data),
    spIncursionsText: incursions.data,
    arbysText: arbys.data,
    bountyCycle: JSON.parse(bountyCycle.data),
    locationBounties: JSON.parse(locationBounties.data)
  };
  const key = "worldstate:browse";
  cache.set(key, { time: Date.now(), data });
  return { source: "browse.wf oracle + sp-incursions", data };
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname === "/api/market/items") {
      const result = await fetchJsonCached("items", `${MARKET_API}/items`);
      send(res, 200, JSON.stringify(result));
      return;
    }

    if (url.pathname === "/api/worldstate") {
      const result = await fetchBrowseWorldstateCached();
      send(res, 200, JSON.stringify(result));
      return;
    }

    const orderMatch = url.pathname.match(/^\/api\/market\/orders\/([^/]+)$/);
    if (orderMatch) {
      const slug = encodeURIComponent(decodeURIComponent(orderMatch[1]));
      const result = await fetchJsonCached(`orders:${slug}`, `${MARKET_API}/orders/item/${slug}/top`);
      send(res, 200, JSON.stringify(result));
      return;
    }

    send(res, 404, JSON.stringify({ error: "Unknown API route" }));
  } catch (error) {
    console.error("[market-proxy]", error);
    send(res, 502, JSON.stringify({ error: error.message || String(error) }));
  }
}

async function handleStatic(req, res, url) {
  const safePath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = resolve(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(filePath);
    send(res, 200, body, types[extname(filePath)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }

  await handleStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`Orbit Companion running at http://localhost:${PORT}`);
});
