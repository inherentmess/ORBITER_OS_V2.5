import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { searchItems, getItemOrders } from "./services/warframeMarket.mjs";

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const TENNO_TOOLS_WORLDSTATE_URL = process.env.TENNO_TOOLS_WORLDSTATE_URL || "https://api.tenno.tools/worldstate/pc";
const WORLDSTATE_CACHE_MS = Number(process.env.WORLDSTATE_CACHE_MS || 30000);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS = {
  worldstate: Number(process.env.RATE_LIMIT_WORLDSTATE || 60),
  marketSearch: Number(process.env.RATE_LIMIT_MARKET_SEARCH || 60),
  marketOrders: Number(process.env.RATE_LIMIT_MARKET_ORDERS || 120),
  fallback: Number(process.env.RATE_LIMIT_FALLBACK || 60)
};
const DEFAULT_ALLOWED_ORIGINS = [
  "https://inherentmess.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
  .split(",")
  .map(value => value.trim())
  .filter(Boolean)
  .map(value => {
    try {
      return new URL(value).origin;
    } catch {
      return "";
    }
  })
  .filter(Boolean);
const allowedOriginSet = new Set(ALLOWED_ORIGINS);
const rateLimitStore = new Map();
let rateLimitSweepCounter = 0;
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

function apiCorsHeaders(corsOrigin) {
  const headers = {
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type,accept"
  };
  if (corsOrigin) {
    headers["access-control-allow-origin"] = corsOrigin;
    headers.vary = "Origin";
  }
  return headers;
}

function send(res, status, body, type = "application/json; charset=utf-8", cache = "no-store", extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": cache
    ,
    ...extraHeaders
  });
  res.end(body);
}

function sendJson(res, status, body, cache = "no-store", extraHeaders = {}) {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8", cache, extraHeaders);
}

function isApiPath(pathname = "") {
  return pathname.startsWith("/api/");
}

function resolveCorsOrigin(originHeader) {
  if (!originHeader) return { allowed: true, origin: "" };
  let normalized = "";
  try {
    normalized = new URL(originHeader).origin;
  } catch {
    return { allowed: false, origin: "" };
  }
  return { allowed: allowedOriginSet.has(normalized), origin: normalized };
}

function routeRateConfig(pathname = "") {
  if (pathname === "/api/worldstate") return { key: "worldstate", limit: RATE_LIMITS.worldstate };
  if (pathname === "/api/market/search") return { key: "market-search", limit: RATE_LIMITS.marketSearch };
  if (/^\/api\/market\/orders\/[^/]+$/.test(pathname)) return { key: "market-orders", limit: RATE_LIMITS.marketOrders };
  return { key: "api-fallback", limit: RATE_LIMITS.fallback };
}

function getClientIp(req) {
  const forwarded = (req.headers["x-forwarded-for"] || "").toString();
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || "unknown";
}

function sweepRateLimitStore(now) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) rateLimitStore.delete(key);
  }
}

function checkRateLimit(req, pathname) {
  const route = routeRateConfig(pathname);
  const now = Date.now();
  rateLimitSweepCounter += 1;
  if (rateLimitSweepCounter % 200 === 0) {
    sweepRateLimitStore(now);
  }

  const ip = getClientIp(req);
  const key = `${route.key}:${ip}`;
  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(key, next);
    return {
      allowed: true,
      routeKey: route.key,
      limit: route.limit,
      remaining: route.limit - 1,
      retryAfterSec: Math.ceil((next.resetAt - now) / 1000)
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, route.limit - existing.count);
  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > route.limit) {
    return { allowed: false, routeKey: route.key, limit: route.limit, remaining, retryAfterSec };
  }
  return { allowed: true, routeKey: route.key, limit: route.limit, remaining, retryAfterSec };
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

async function handleApi(req, res, url, corsOrigin) {
  const corsHeaders = apiCorsHeaders(corsOrigin);
  const rate = checkRateLimit(req, url.pathname);
  if (!rate.allowed) {
    sendJson(res, 429, {
      error: "rate_limited",
      route: url.pathname,
      routeKey: rate.routeKey,
      limit: rate.limit,
      windowSeconds: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
      retryAfter: rate.retryAfterSec
    }, "no-store", {
      ...corsHeaders,
      "retry-after": String(rate.retryAfterSec)
    });
    return;
  }

  try {
    if (url.pathname === "/api/market/items") {
      const result = await searchItems("");
      sendJson(res, 200, result, "public, max-age=300", corsHeaders);
      return;
    }

    if (url.pathname === "/api/market/search") {
      const q = url.searchParams.get("q") || "";
      const result = await searchItems(q);
      sendJson(res, 200, result, "public, max-age=300", corsHeaders);
      return;
    }

    const orderMatch = url.pathname.match(/^\/api\/market\/orders\/([^/]+)$/);
    if (orderMatch) {
      const item = decodeURIComponent(orderMatch[1]);
      const result = await getItemOrders(item);
      sendJson(res, 200, result, "no-store", corsHeaders);
      return;
    }

    if (url.pathname === "/api/worldstate") {
      const payload = await fetchWorldstate();
      sendJson(res, 200, payload, "no-store", corsHeaders);
      return;
    }

    sendJson(res, 404, { error: "Unknown API route" }, "no-store", corsHeaders);
  } catch (error) {
    console.error("[api-proxy]", error);
    sendJson(res, 502, {
      error: error.message || String(error),
      route: url.pathname
    }, "no-store", corsHeaders);
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

  if (url.pathname.startsWith("/api/")) {
    const cors = resolveCorsOrigin(req.headers.origin);
    if (!cors.allowed) {
      sendJson(res, 403, {
        error: "origin_not_allowed",
        origin: req.headers.origin || ""
      }, "no-store", { vary: "Origin" });
      return;
    }

    if (req.method === "OPTIONS") {
      send(res, 204, "", "text/plain; charset=utf-8", "no-store", apiCorsHeaders(cors.origin));
      return;
    }

    await handleApi(req, res, url, cors.origin);
    return;
  }

  if (req.method === "OPTIONS") {
    send(res, 204, "", "text/plain; charset=utf-8", "no-store");
    return;
  }

  await handleStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`ORBITER_OS proxy listening on port ${PORT}`);
});
