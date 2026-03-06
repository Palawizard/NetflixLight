const { config } = require("../config/env");
const { ApiError, createApiError } = require("../utils/api-error");

const DEFAULT_TIMEOUT_MS = 8000;

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
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const requestBody = body ? JSON.stringify(body) : undefined;
    const requestHeaders = buildTmdbHeaders(headers);

    if (requestBody) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    const payload = await parseTmdbResponseBody(response);

    if (!response.ok) {
      throw mapTmdbError(response, payload);
    }

    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      throw createApiError(504, "TMDB_TIMEOUT", "TMDB request timeout");
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw createApiError(502, "TMDB_UNREACHABLE", "Unable to reach TMDB");
  } finally {
    clearTimeout(timeoutId);
  }
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
  tmdbRequest,
  tmdbGet,
};
