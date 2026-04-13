const path = require("path");
const express = require("express");
const session = require("express-session");
const { config, missingTmdbVars } = require("./src/config/env");
const authRoutes = require("./src/routes/auth.routes");
const tmdbRoutes = require("./src/routes/tmdb.routes");
const watchlistRoutes = require("./src/routes/watchlist.routes");
const watchProgressRoutes = require("./src/routes/watch-progress.routes");
const viewingHistoryRoutes = require("./src/routes/viewing-history.routes");
const userRatingsRoutes = require("./src/routes/user-ratings.routes");
const profilesRoutes = require("./src/routes/profiles.routes");
const {
  SqliteSessionStore,
} = require("./src/data-access/sqlite/session-store");
const { apiRequestLogger } = require("./src/middlewares/api-logger.middleware");
const {
  apiNotFoundHandler,
  apiErrorHandler,
} = require("./src/middlewares/api-error.middleware");

const app = express();
const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));
app.use(express.json());
app.use(apiRequestLogger);
app.use(
  session({
    name: config.session.cookieName,
    secret: config.session.secret,
    store: new SqliteSessionStore({
      ttlMs: config.session.maxAgeMs,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: config.session.maxAgeMs,
    },
  })
);
app.use("/api/auth", authRoutes);
app.use("/api/tmdb", tmdbRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/watch-progress", watchProgressRoutes);
app.use("/api/viewing-history", viewingHistoryRoutes);
app.use("/api/user-ratings", userRatingsRoutes);
app.use("/api/profiles", profilesRoutes);

app.locals.appConfig = {
  environment: config.environment,
  tmdbApiBaseUrl: config.tmdb.apiBaseUrl,
};

if (missingTmdbVars.length > 0) {
  console.warn(
    `Missing TMDB environment variables: ${missingTmdbVars.join(", ")}`
  );
}

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/movies", (req, res) => {
  res.redirect(301, "/#/films");
});

app.use(apiNotFoundHandler);
app.use(apiErrorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(
      `Server running on http://localhost:${config.port} (${config.environment})`
    );
  });
}

module.exports = {
  app,
};
