const API_CACHE_TTL_MS = 60000;
const apiCache = new Map();

export async function apiRequest(
  pathname,
  { method = "GET", body, signal, cache = method === "GET", headers = {} } = {}
) {
  const normalizedMethod = method.toUpperCase();
  const requestHeaders = {
    ...headers,
    ...(body ? { "Content-Type": "application/json" } : {}),
  };
  const cacheKey = `${normalizedMethod}:${pathname}:${JSON.stringify(requestHeaders)}`;
  const shouldUseCache = cache && normalizedMethod === "GET" && !body;
  const cachedPayload = shouldUseCache ? getCachedPayload(cacheKey) : null;

  if (cachedPayload) {
    return cachedPayload;
  }

  const response = await fetch(pathname, {
    method: normalizedMethod,
    cache: "no-store",
    headers:
      Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    signal,
  });

  const isJsonResponse =
    response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload = isJsonResponse ? await response.json() : null;

  if (response.ok) {
    if (shouldUseCache) {
      setCachedPayload(cacheKey, payload);
    } else if (normalizedMethod !== "GET") {
      clearApiCache();
    }

    return payload;
  }

  const error = new Error(payload?.error?.message || "API request failed");
  error.status = response.status;
  error.payload = payload;
  throw error;
}

function getCachedPayload(cacheKey) {
  const cachedEntry = apiCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    apiCache.delete(cacheKey);
    return null;
  }

  return clonePayload(cachedEntry.payload);
}

function setCachedPayload(cacheKey, payload) {
  apiCache.set(cacheKey, {
    payload: clonePayload(payload),
    expiresAt: Date.now() + API_CACHE_TTL_MS,
  });
}

function clearApiCache() {
  apiCache.clear();
}

function clonePayload(payload) {
  if (payload === undefined || payload === null) {
    return payload;
  }

  return JSON.parse(JSON.stringify(payload));
}

export function formatApiError(error) {
  const details = error?.payload?.error?.details;

  if (Array.isArray(details) && details.length > 0) {
    return details.join(" ");
  }

  return (
    error?.payload?.error?.message ||
    error?.message ||
    "Une erreur est survenue."
  );
}
