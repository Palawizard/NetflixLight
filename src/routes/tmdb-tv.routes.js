const express = require("express");
const { tmdbGet } = require("../clients/tmdb.client");
const {
  parseTmdbPage,
  parseOptionalTmdbString,
} = require("./tmdb-query.utils");

const router = express.Router();

// proxy popular tv shows from tmdb
router.get("/popular", async (req, res, next) => {
  try {
    const page = parseTmdbPage(req.query.page);
    const language = parseOptionalTmdbString(req.query.language, "language");

    const payload = await tmdbGet("/tv/popular", {
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

// proxy top-rated tv shows from tmdb
router.get("/top-rated", async (req, res, next) => {
  try {
    const page = parseTmdbPage(req.query.page);
    const language = parseOptionalTmdbString(req.query.language, "language");

    const payload = await tmdbGet("/tv/top_rated", {
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

module.exports = router;
