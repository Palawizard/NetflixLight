const express = require("express");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const {
  requireActiveProfile,
} = require("../middlewares/active-profile.middleware");
const { createApiError } = require("../utils/api-error");
const {
  findWatchProgressByUserAndMedia,
  listWatchProgressByUserId,
  removeWatchProgress,
  upsertWatchProgress,
} = require("../data-access/repositories/watch-progress.repository");

const router = express.Router();
const ALLOWED_MEDIA_TYPES = new Set(["movie", "tv"]);

/**
 * validates and coerces :type and :id route params - throws a 400 api error on invalid input
 */
function validateMediaParams(params) {
  const type = typeof params.type === "string" ? params.type.trim() : "";
  const tmdbId = Number.parseInt(params.id, 10);

  if (!ALLOWED_MEDIA_TYPES.has(type)) {
    throw createApiError(400, "INVALID_TYPE", "type must be one of: movie, tv");
  }

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw createApiError(400, "INVALID_ID", "id must be a positive integer");
  }

  return {
    type,
    tmdbId,
  };
}

/**
 * validates and coerces the PUT body - throws a 400 api error if positionSeconds or durationSeconds are invalid
 */
function validateProgressPayload(payload) {
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};
  const positionSeconds = Math.floor(Number(safePayload.positionSeconds));
  const durationSeconds =
    safePayload.durationSeconds === null ||
    safePayload.durationSeconds === undefined
      ? null
      : Math.floor(Number(safePayload.durationSeconds));
  const title =
    typeof safePayload.title === "string" ? safePayload.title.trim() : "";
  const poster =
    typeof safePayload.poster === "string" ? safePayload.poster.trim() : null;

  if (!Number.isInteger(positionSeconds) || positionSeconds < 0) {
    throw createApiError(
      400,
      "INVALID_POSITION",
      "positionSeconds must be a positive integer"
    );
  }

  if (
    durationSeconds !== null &&
    (!Number.isInteger(durationSeconds) || durationSeconds < 0)
  ) {
    throw createApiError(
      400,
      "INVALID_DURATION",
      "durationSeconds must be a positive integer"
    );
  }

  return {
    positionSeconds,
    durationSeconds,
    title,
    poster,
  };
}

// list all watch progress entries for the active profile
router.get("/", requireAuth, requireActiveProfile, (req, res, next) => {
  try {
    return res.status(200).json({
      items: listWatchProgressByUserId({
        userId: req.authUser.id,
        profileId: req.activeProfile.id,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

// get the progress entry for a specific title - returns null if none saved
router.get(
  "/:type/:id",
  requireAuth,
  requireActiveProfile,
  (req, res, next) => {
    try {
      const { type, tmdbId } = validateMediaParams(req.params);

      return res.status(200).json({
        item: findWatchProgressByUserAndMedia({
          userId: req.authUser.id,
          profileId: req.activeProfile.id,
          type,
          tmdbId,
        }),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// upsert a progress entry - auto-deletes and returns 204 when position reaches the end
router.put(
  "/:type/:id",
  requireAuth,
  requireActiveProfile,
  (req, res, next) => {
    try {
      const { type, tmdbId } = validateMediaParams(req.params);
      const payload = validateProgressPayload(req.body);

      if (
        payload.durationSeconds !== null &&
        payload.durationSeconds > 0 &&
        payload.positionSeconds >= payload.durationSeconds - 3
      ) {
        removeWatchProgress({
          userId: req.authUser.id,
          profileId: req.activeProfile.id,
          type,
          tmdbId,
        });
        return res.status(204).send();
      }

      return res.status(200).json({
        item: upsertWatchProgress({
          userId: req.authUser.id,
          profileId: req.activeProfile.id,
          type,
          tmdbId,
          ...payload,
        }),
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
