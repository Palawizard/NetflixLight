const path = require("path");
const express = require("express");
const { config, missingTmdbVars } = require("./src/config/env");
const authRoutes = require("./src/routes/auth.routes");

const app = express();
const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));
app.use(express.json());
app.use("/api/auth", authRoutes);

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
  res.sendFile(path.join(publicDir, "movies.html"));
});

app.listen(config.port, () => {
  console.log(
    `Server running on http://localhost:${config.port} (${config.environment})`
  );
});
