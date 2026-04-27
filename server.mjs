import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { searchItems, getItemOrders } from "./services/warframeMarket.mjs";

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const TENNO_TOOLS_WORLDSTATE_URL = process.env.TENNO_TOOLS_WORLDSTATE_URL || "https://api.tenno.tools/worldstate/pc";
const WORLDSTATE_CACHE_MS = Number(process.env.WORLDSTATE_CACHE_MS || 30000);
const worldstateCache = {
  expiresAt: 0,
  payload: null,
  inFlight: null
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wav": "audio/wav",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, type = "application/json; charset=utf-8", cache = "no-store") {
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type,accept",
    "cache-control": cache
  });
  res.end(body);
}

function sendJson(res, status, body, cache = "no-store") {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8", cache);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "User-Agent": "ORBITER_OS_V2.5"
    }
  });
  const contentType = response.headers.get("content-type") || "";
  console.log("[api-proxy] upstream response", {
    status: response.status,
    url: response.url,
    contentType
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Upstream HTTP ${response.status} for ${url}`);
  }

  if (!text.trim()) {
    return {
      upstreamError: true,
      reason: "empty_body",
      status: response.status,
      url: response.url,
      contentType,
      message: `Upstream returned an empty body for ${url}`
    };
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Upstream JSON parse failed for ${url}: ${error.message}`);
  }
}

async function fetchWorldstate() {
  const now = Date.now();
  if (worldstateCache.payload && worldstateCache.expiresAt > now) {
    return { ...worldstateCache.payload, cached: true };
  }

  if (worldstateCache.inFlight) return worldstateCache.inFlight;

  const upstreamUrl = TENNO_TOOLS_WORLDSTATE_URL;
  worldstateCache.inFlight = (async () => {
    try {
      const data = await fetchJson(upstreamUrl);
      const payload = {
        source: "tenno.tools",
        upstreamUrl,
        fetchedAt: new Date().toISOString(),
        data
      };
      worldstateCache.payload = payload;
      worldstateCache.expiresAt = Date.now() + WORLDSTATE_CACHE_MS;
      return { ...payload, cached: false };
    } finally {
      worldstateCache.inFlight = null;
    }
  })();

  return worldstateCache.inFlight;
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname === "/api/market/search") {
      const q = url.searchParams.get("q") || "";
      const result = await searchItems(q);
      sendJson(res, 200, result, "public, max-age=300");
      return;
    }

    const orderMatch = url.pathname.match(/^\/api\/market\/orders\/([^/]+)$/);
    if (orderMatch) {
      const item = decodeURIComponent(orderMatch[1]);
      const result = await getItemOrders(item);
      sendJson(res, 200, result, "no-store");
      return;
    }

    if (url.pathname === "/api/worldstate") {
      const payload = await fetchWorldstate();
      sendJson(res, 200, payload, "no-store");
      return;
    }

    sendJson(res, 404, { error: "Unknown API route" });
  } catch (error) {
    console.error("[api-proxy]", error);
    sendJson(res, 502, {
      error: error.message || String(error),
      route: url.pathname
    });
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
    send(res, 200, body, types[extname(filePath)] || "application/octet-stream", "public, max-age=60");
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
  console.log(`ORBITER_OS proxy listening on port ${PORT}`);
});
