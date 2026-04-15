const { config } = require("../config/env");
const { createApiError } = require("../utils/api-error");

const DEFAULT_TIMEOUT_MS = 8000;
const tmdbCache = new Map();

/**
 * throws a 500 api error if neither tmdb credential is configured
 */
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

/**
 * builds a full tmdb URL from an endpoint path and optional query params
 * falls back to api_key param when no bearer token is configured
 */
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

/**
 * builds the headers for a tmdb request - injects bearer token when available
 */
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

/**
 * deep-clones a payload through JSON serialization - returns null/undefined as-is
 */
function clonePayload(payload) {
  if (payload === undefined || payload === null) {
    return payload;
  }

  return JSON.parse(JSON.stringify(payload));
}

/**
 * removes all expired entries from the cache based on the current timestamp
 */
function pruneExpiredCacheEntries(now = Date.now()) {
  for (const [cacheKey, cacheValue] of tmdbCache.entries()) {
    if (cacheValue.expiresAt <= now) {
      tmdbCache.delete(cacheKey);
    }
  }
}

/**
 * evicts the oldest entry from the cache when the max size is reached
 */
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

/**
 * returns a cache key string for a GET request - returns null for non-GET or requests with a body
 */
function buildCacheKey(method, url, requestBody) {
  if (method !== "GET" || requestBody) {
    return null;
  }

  return `${method}:${url.toString()}`;
}

/**
 * returns the cached payload for a key if it exists and hasn't expired - null otherwise
 */
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

/**
 * stores a cloned payload in the cache under the given key with a ttl-based expiry
 */
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

/**
 * parses the json body from a tmdb response - returns null if content-type is not json or parsing fails
 */
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

/**
 * maps a non-ok tmdb response to an api error with an appropriate status code
 */
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

/**
 * sends a request to the tmdb api - handles auth, caching, timeout, and error mapping
 */
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

/**
 * convenience wrapper around tmdbRequest for GET requests
 */
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
