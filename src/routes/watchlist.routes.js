const express = require("express");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const { createApiError } = require("../utils/api-error");
const {
  addWatchlistItem,
  findWatchlistItemByUserAndMedia,
  listWatchlistItemsByUserId,
} = require("../data-access/repositories/watchlist.repository");

const router = express.Router();
const ALLOWED_WATCHLIST_TYPES = new Set(["movie", "tv"]);

function validateWatchlistPayload(payload) {
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};
  const errors = [];

  const type =
    typeof safePayload.type === "string" ? safePayload.type.trim() : "";
  const title =
    typeof safePayload.title === "string" ? safePayload.title.trim() : "";
  const poster =
    safePayload.poster === undefined || safePayload.poster === null
      ? null
      : typeof safePayload.poster === "string"
        ? safePayload.poster.trim()
        : "";
  const tmdbId = Number.parseInt(safePayload.tmdbId, 10);

  if (!ALLOWED_WATCHLIST_TYPES.has(type)) {
    errors.push("type must be one of: movie, tv");
  }

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    errors.push("tmdbId must be a positive integer");
  }

  if (!title) {
    errors.push("title is required");
  }

  if (poster === "") {
    errors.push("poster must be a string when provided");
  }

  if (errors.length > 0) {
    throw createApiError(
      400,
      "VALIDATION_ERROR",
      "Invalid watchlist payload",
      errors
    );
  }

  return {
    type,
    tmdbId,
    title,
    poster,
  };
}

router.get("/", requireAuth, (req, res, next) => {
  try {
    const items = listWatchlistItemsByUserId(req.authUser.id);

    return res.status(200).json({
      items,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, (req, res, next) => {
  try {
    const payload = validateWatchlistPayload(req.body);
    const userId = req.authUser.id;

    const existingItem = findWatchlistItemByUserAndMedia({
      userId,
      type: payload.type,
      tmdbId: payload.tmdbId,
    });

    if (existingItem) {
      return next(
        createApiError(
          409,
          "WATCHLIST_ITEM_EXISTS",
          "Watchlist item already exists"
        )
      );
    }

    const item = addWatchlistItem({
      userId,
      type: payload.type,
      tmdbId: payload.tmdbId,
      title: payload.title,
      poster: payload.poster,
    });

    return res.status(201).json({
      item,
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return next(
        createApiError(
          409,
          "WATCHLIST_ITEM_EXISTS",
          "Watchlist item already exists"
        )
      );
    }

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return next(
        createApiError(
          409,
          "WATCHLIST_ITEM_EXISTS",
          "Watchlist item already exists"
        )
      );
    }

    return next(error);
  }
});

module.exports = router;
