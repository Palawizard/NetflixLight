const express = require("express");
const { tmdbGet } = require("../clients/tmdb.client");
const { createApiError } = require("../utils/api-error");
const tmdbMoviesRoutes = require("./tmdb-movies.routes");
const tmdbTvRoutes = require("./tmdb-tv.routes");
const {
  parseTmdbPage,
  parseOptionalTmdbString,
  parseRequiredTmdbString,
  parseRequiredPositiveInt,
} = require("./tmdb-query.utils");

const router = express.Router();

const ALLOWED_MEDIA_TYPES = new Set(["all", "movie", "tv", "person"]);
const ALLOWED_TIME_WINDOWS = new Set(["day", "week"]);
const ALLOWED_DISCOVER_TYPES = new Set(["movie", "tv"]);

router.use("/movies", tmdbMoviesRoutes);
router.use("/tv", tmdbTvRoutes);

router.get("/trending", async (req, res, next) => {
  const mediaType = req.query.media_type || "all";
  const timeWindow = req.query.time_window || "day";

  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return next(
      createApiError(
        400,
        "INVALID_MEDIA_TYPE",
        "media_type must be one of: all, movie, tv, person"
      )
    );
  }

  if (!ALLOWED_TIME_WINDOWS.has(timeWindow)) {
    return next(
      createApiError(
        400,
        "INVALID_TIME_WINDOW",
        "time_window must be one of: day, week"
      )
    );
  }

  try {
    const page = parseTmdbPage(req.query.page);
    const language = parseOptionalTmdbString(req.query.language, "language");

    const payload = await tmdbGet(`/trending/${mediaType}/${timeWindow}`, {
      query: {
        page,
        language,
      },
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/discover", async (req, res, next) => {
  try {
    const type = parseRequiredTmdbString(req.query.type, "type");
    const genreId = parseRequiredPositiveInt(req.query.genre, "genre");
    const page = parseTmdbPage(req.query.page);

    if (!ALLOWED_DISCOVER_TYPES.has(type)) {
      return next(
        createApiError(400, "INVALID_TYPE", "type must be one of: movie, tv")
      );
    }

    const payload = await tmdbGet(`/discover/${type}`, {
      query: {
        with_genres: genreId,
        page,
      },
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
