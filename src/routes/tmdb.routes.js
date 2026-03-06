const express = require("express");
const { tmdbGet } = require("../clients/tmdb.client");
const { createApiError } = require("../utils/api-error");

const router = express.Router();

const ALLOWED_MEDIA_TYPES = new Set(["all", "movie", "tv", "person"]);
const ALLOWED_TIME_WINDOWS = new Set(["day", "week"]);

function parsePage(pageValue) {
  if (pageValue === undefined) {
    return undefined;
  }

  const parsedPage = Number.parseInt(pageValue, 10);

  if (!Number.isInteger(parsedPage) || parsedPage <= 0 || parsedPage > 500) {
    throw createApiError(
      400,
      "INVALID_PAGE",
      "page must be an integer between 1 and 500"
    );
  }

  return parsedPage;
}

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
    const page = parsePage(req.query.page);
    const language = req.query.language;

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

module.exports = router;
