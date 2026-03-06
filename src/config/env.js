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
  tmdb: {
    apiBaseUrl: process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3",
    apiKey: process.env.TMDB_API_KEY || "",
    readAccessToken: process.env.TMDB_API_READ_ACCESS_TOKEN || "",
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
