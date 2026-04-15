const express = require("express");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const {
  requireActiveProfile,
} = require("../middlewares/active-profile.middleware");
const { createApiError } = require("../utils/api-error");
const {
  findUserRatingByUserAndMedia,
  listUserRatingsByUserId,
  removeUserRating,
  upsertUserRating,
} = require("../data-access/repositories/user-rating.repository");

const router = express.Router();
const ALLOWED_MEDIA_TYPES = new Set(["movie", "tv"]);

/**
 * validates and coerces :type and :id route params
 * throws a 400 api error if either value is invalid
 */
function validateRatingParams(params) {
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
 * validates the request body for PUT /user-ratings/:type/:id
 * throws a 400 api error if rating is missing or out of range
 */
function validateRatingPayload(payload) {
  // guard against non-object bodies (null, string, etc.)
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};
  const rating = Number.parseInt(safePayload.rating, 10);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createApiError(
      400,
      "INVALID_RATING",
      "rating must be an integer between 1 and 5"
    );
  }

  return {
    rating,
  };
}

// list all ratings for the active profile
router.get("/", requireAuth, requireActiveProfile, (req, res, next) => {
  try {
    return res.status(200).json({
      items: listUserRatingsByUserId({
        userId: req.authUser.id,
        profileId: req.activeProfile.id,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

// get the rating for a specific movie or tv show - returns null if not rated
router.get(
  "/:type/:id",
  requireAuth,
  requireActiveProfile,
  (req, res, next) => {
    try {
      const { type, tmdbId } = validateRatingParams(req.params);

      return res.status(200).json({
        item: findUserRatingByUserAndMedia({
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

// create or update a rating (upsert, so safe to call multiple times)
router.put(
  "/:type/:id",
  requireAuth,
  requireActiveProfile,
  (req, res, next) => {
    try {
      const { type, tmdbId } = validateRatingParams(req.params);
      const { rating } = validateRatingPayload(req.body);

      return res.status(200).json({
        item: upsertUserRating({
          userId: req.authUser.id,
          profileId: req.activeProfile.id,
          type,
          tmdbId,
          rating,
        }),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// remove a rating — 204 whether it existed or not
router.delete(
  "/:type/:id",
  requireAuth,
  requireActiveProfile,
  (req, res, next) => {
    try {
      const { type, tmdbId } = validateRatingParams(req.params);
      removeUserRating({
        userId: req.authUser.id,
        profileId: req.activeProfile.id,
        type,
        tmdbId,
      });

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
