const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function parsePort(value, fallbackPort) {
  const parsedPort = Number.parseInt(value, 10);

  if (Number.isInteger(parsedPort) && parsedPort > 0) {
    return parsedPort;
  }

  return fallbackPort;
}

function parseSaltRounds(value, fallbackValue) {
  const parsedSaltRounds = Number.parseInt(value, 10);

  if (Number.isInteger(parsedSaltRounds) && parsedSaltRounds > 0) {
    return parsedSaltRounds;
  }
  return fallbackValue;
}

function parsePositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return fallbackValue;
}

const environment =
  process.env.NODE_ENV === "production" ? "production" : "development";
const devPort = parsePort(process.env.DEV_PORT, 3000);
const prodPort = parsePort(process.env.PROD_PORT, 8080);
const sqliteDbPath = process.env.SQLITE_DB_PATH || "./data/netflixlight.sqlite";
const port = parsePort(
  process.env.PORT,
  environment === "production" ? prodPort : devPort
);
const bcryptSaltRounds = parseSaltRounds(process.env.BCRYPT_SALT_ROUNDS, 12);
const sessionSecret = process.env.SESSION_SECRET || "dev_session_secret";
const sessionCookieName = process.env.SESSION_COOKIE_NAME || "netflixlight.sid";
const sessionMaxAgeMs = parsePositiveInt(
  process.env.SESSION_MAX_AGE_MS,
  86400000
);
const tmdbCacheTtlMs = parsePositiveInt(process.env.TMDB_CACHE_TTL_MS, 30000);
const tmdbCacheMaxEntries = parsePositiveInt(
  process.env.TMDB_CACHE_MAX_ENTRIES,
  500
);

const config = {
  environment,
  isDevelopment: environment === "development",
  isProduction: environment === "production",
  port,
  bcryptSaltRounds,
  ports: {
    development: devPort,
    production: prodPort,
  },
  session: {
    secret: sessionSecret,
    cookieName: sessionCookieName,
    maxAgeMs: sessionMaxAgeMs,
  },
  tmdb: {
    apiBaseUrl: process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3",
    apiKey: process.env.TMDB_API_KEY || "",
    readAccessToken: process.env.TMDB_API_READ_ACCESS_TOKEN || "",
    cacheTtlMs: tmdbCacheTtlMs,
    cacheMaxEntries: tmdbCacheMaxEntries,
  },
  database: {
    client: "sqlite",
    driver: "better-sqlite3",
    url: sqliteDbPath,
    filename: path.resolve(process.cwd(), sqliteDbPath),
    dataAccessLayer: "repository",
  },
};

const missingTmdbVars = ["TMDB_API_KEY", "TMDB_API_READ_ACCESS_TOKEN"].filter(
  (variableName) => !process.env[variableName]
);

module.exports = {
  config,
  missingTmdbVars,
};
