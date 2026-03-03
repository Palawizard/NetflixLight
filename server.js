const path = require("path");
const express = require("express");
const { config, missingTmdbVars } = require("./src/config/env");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

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
  res.render("index", {
    title: "NetflixLight",
  });
});

app.get("/movies", (req, res) => {
  res.render("movies", {
    title: "NetflixLight",
  });
});

app.listen(config.port, () => {
  console.log(
    `Server running on http://localhost:${config.port} (${config.environment})`
  );
});
