const express = require("express");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const {
  requireActiveProfile,
} = require("../middlewares/active-profile.middleware");
const { createApiError } = require("../utils/api-error");
const {
  addWatchlistItem,
  findWatchlistItemByUserAndMedia,
  listWatchlistItemsByUserId,
  removeWatchlistItem,
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
    errors.push("Le type doit être `movie` ou `tv`.");
  }

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    errors.push("L'identifiant TMDB doit être un entier positif.");
  }

  if (!title) {
    errors.push("Le titre est obligatoire.");
  }

  if (poster === "") {
    errors.push(
      "Le poster doit être une chaîne de caractères lorsqu'il est fourni."
    );
  }

  if (errors.length > 0) {
    throw createApiError(
      400,
      "VALIDATION_ERROR",
      "Les informations des favoris sont invalides.",
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

function validateWatchlistRouteParams(params) {
  const type = typeof params.type === "string" ? params.type.trim() : "";
  const tmdbId = Number.parseInt(params.id, 10);

  if (!ALLOWED_WATCHLIST_TYPES.has(type)) {
    throw createApiError(
      400,
      "INVALID_TYPE",
      "Le type doit être `movie` ou `tv`."
    );
  }

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw createApiError(
      400,
      "INVALID_ID",
      "L'identifiant doit être un entier positif."
    );
  }

  return {
    type,
    tmdbId,
  };
}

router.get("/", requireAuth, requireActiveProfile, (req, res, next) => {
  try {
    const items = listWatchlistItemsByUserId({
      userId: req.authUser.id,
      profileId: req.activeProfile.id,
    });

    return res.status(200).json({
      items,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requireActiveProfile, (req, res, next) => {
  try {
    const payload = validateWatchlistPayload(req.body);
    const userId = req.authUser.id;
    const profileId = req.activeProfile.id;

    const existingItem = findWatchlistItemByUserAndMedia({
      userId,
      profileId,
      type: payload.type,
      tmdbId: payload.tmdbId,
    });

    if (existingItem) {
      return next(
        createApiError(
          409,
          "WATCHLIST_ITEM_EXISTS",
          "Ce titre est déjà présent dans les favoris."
        )
      );
    }

    const item = addWatchlistItem({
      userId,
      profileId,
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
          "Ce titre est déjà présent dans les favoris."
        )
      );
    }

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return next(
        createApiError(
          409,
          "WATCHLIST_ITEM_EXISTS",
          "Ce titre est déjà présent dans les favoris."
        )
      );
    }

    return next(error);
  }
});

router.delete(
  "/:type/:id",
  requireAuth,
  requireActiveProfile,
  (req, res, next) => {
    try {
      const { type, tmdbId } = validateWatchlistRouteParams(req.params);
      const { changes } = removeWatchlistItem({
        userId: req.authUser.id,
        profileId: req.activeProfile.id,
        type,
        tmdbId,
      });

      if (changes === 0) {
        return next(
          createApiError(
            404,
            "WATCHLIST_ITEM_NOT_FOUND",
            "Ce titre est introuvable dans les favoris."
          )
        );
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
