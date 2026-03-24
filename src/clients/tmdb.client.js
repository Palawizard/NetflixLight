const { config } = require("../config/env");
const { createApiError } = require("../utils/api-error");

const DEFAULT_TIMEOUT_MS = 8000;
const tmdbCache = new Map();

function ensureTmdbCredentials() {
  if (config.tmdb.readAccessToken || config.tmdb.apiKey) {
    return;
  }

  throw createApiError(
    500,
    "TMDB_CONFIG_MISSING",
    "TMDB credentials are not configured"
  );
}

function buildTmdbUrl(endpointPath, query = {}) {
  const normalizedBaseUrl = config.tmdb.apiBaseUrl.endsWith("/")
    ? config.tmdb.apiBaseUrl
    : `${config.tmdb.apiBaseUrl}/`;
  const normalizedPath = endpointPath.startsWith("/")
    ? endpointPath.slice(1)
    : endpointPath;
  const url = new URL(normalizedPath, normalizedBaseUrl);

  if (!config.tmdb.readAccessToken && config.tmdb.apiKey) {
    url.searchParams.set("api_key", config.tmdb.apiKey);
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

function buildTmdbHeaders(extraHeaders = {}) {
  const headers = {
    Accept: "application/json",
    ...extraHeaders,
  };

  if (config.tmdb.readAccessToken) {
    headers.Authorization = `Bearer ${config.tmdb.readAccessToken}`;
  }

  return headers;
}

function clonePayload(payload) {
  if (payload === undefined || payload === null) {
    return payload;
  }

  return JSON.parse(JSON.stringify(payload));
}

function pruneExpiredCacheEntries(now = Date.now()) {
  for (const [cacheKey, cacheValue] of tmdbCache.entries()) {
    if (cacheValue.expiresAt <= now) {
      tmdbCache.delete(cacheKey);
    }
  }
}

function evictCacheIfNeeded() {
  const maxEntries = config.tmdb.cacheMaxEntries;

  while (tmdbCache.size >= maxEntries) {
    const firstKey = tmdbCache.keys().next().value;

    if (!firstKey) {
      return;
    }

    tmdbCache.delete(firstKey);
  }
}

function buildCacheKey(method, url, requestBody) {
  if (method !== "GET" || requestBody) {
    return null;
  }

  return `${method}:${url.toString()}`;
}

function getCachedPayload(cacheKey) {
  if (!cacheKey) {
    return null;
  }

  const now = Date.now();
  pruneExpiredCacheEntries(now);

  const cachedEntry = tmdbCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  return clonePayload(cachedEntry.payload);
}

function setCachedPayload(cacheKey, payload) {
  if (!cacheKey) {
    return;
  }

  pruneExpiredCacheEntries();
  evictCacheIfNeeded();

  tmdbCache.set(cacheKey, {
    payload: clonePayload(payload),
    expiresAt: Date.now() + config.tmdb.cacheTtlMs,
  });
}

async function parseTmdbResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapTmdbError(response, payload) {
  const details = {
    tmdbStatus: response.status,
  };

  if (payload && typeof payload === "object") {
    details.tmdb = payload;
  }

  if (response.status === 401 || response.status === 403) {
    return createApiError(
      502,
      "TMDB_AUTH_ERROR",
      "TMDB rejected authentication credentials",
      details
    );
  }

  if (response.status === 404) {
    return createApiError(
      404,
      "TMDB_NOT_FOUND",
      "TMDB resource not found",
      details
    );
  }

  if (response.status >= 500) {
    return createApiError(
      502,
      "TMDB_UPSTREAM_ERROR",
      "TMDB upstream error",
      details
    );
  }

  return createApiError(
    502,
    "TMDB_REQUEST_FAILED",
    "TMDB request failed",
    details
  );
}

async function tmdbRequest(
  endpointPath,
  { method = "GET", query, body, headers, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  ensureTmdbCredentials();

  const url = buildTmdbUrl(endpointPath, query);
  const controller = new AbortController();
  const requestBody = body ? JSON.stringify(body) : undefined;
  const requestHeaders = buildTmdbHeaders(headers);
  const cacheKey = buildCacheKey(method, url, requestBody);
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const cachedPayload = getCachedPayload(cacheKey);
  if (cachedPayload) {
    return cachedPayload;
  }

  if (requestBody) {
    requestHeaders["Content-Type"] = "application/json";
  }

  /** @type {Response} */
  let response;

  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw createApiError(504, "TMDB_TIMEOUT", "TMDB request timeout");
    }

    throw createApiError(502, "TMDB_UNREACHABLE", "Unable to reach TMDB");
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await parseTmdbResponseBody(response);

  if (!response.ok) {
    throw mapTmdbError(response, payload);
  }

  setCachedPayload(cacheKey, payload);
  return payload;
}

async function tmdbGet(endpointPath, { query, headers, timeoutMs } = {}) {
  return tmdbRequest(endpointPath, {
    method: "GET",
    query,
    headers,
    timeoutMs,
  });
}

module.exports = {
  tmdbGet,
};
