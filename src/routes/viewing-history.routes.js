const express = require("express");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const {
  requireActiveProfile,
} = require("../middlewares/active-profile.middleware");
const { createApiError } = require("../utils/api-error");
const {
  listViewingHistoryByUserId,
  upsertViewingHistoryItem,
} = require("../data-access/repositories/viewing-history.repository");

const router = express.Router();
const ALLOWED_MEDIA_TYPES = new Set(["movie", "tv"]);

function validateViewingHistoryPayload(payload) {
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};
  const type =
    typeof safePayload.type === "string" ? safePayload.type.trim() : "";
  const tmdbId = Number.parseInt(safePayload.tmdbId, 10);
  const title =
    typeof safePayload.title === "string" ? safePayload.title.trim() : "";
  const poster =
    safePayload.poster === undefined || safePayload.poster === null
      ? null
      : typeof safePayload.poster === "string"
        ? safePayload.poster.trim()
        : "";
  const errors = [];

  if (!ALLOWED_MEDIA_TYPES.has(type)) {
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
      "Viewing history payload is invalid.",
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

router.get("/", requireAuth, requireActiveProfile, (req, res, next) => {
  try {
    return res.status(200).json({
      items: listViewingHistoryByUserId({
        userId: req.authUser.id,
        profileId: req.activeProfile.id,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requireActiveProfile, (req, res, next) => {
  try {
    const payload = validateViewingHistoryPayload(req.body);

    return res.status(201).json({
      item: upsertViewingHistoryItem({
        userId: req.authUser.id,
        profileId: req.activeProfile.id,
        ...payload,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
