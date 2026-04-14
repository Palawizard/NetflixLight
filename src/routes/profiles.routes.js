const express = require("express");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const { createApiError } = require("../utils/api-error");
const {
  createProfile,
  ensureDefaultProfile,
} = require("../data-access/repositories/profile.repository");

const router = express.Router();
const DEFAULT_PROFILE_COLOR = "#fb7185";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * validates and coerces the profile creation body - throws a 400 api error if name is out of range
 */
function validateProfilePayload(payload) {
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};
  const name =
    typeof safePayload.name === "string" ? safePayload.name.trim() : "";
  const avatarColor =
    typeof safePayload.avatarColor === "string"
      ? safePayload.avatarColor.trim()
      : DEFAULT_PROFILE_COLOR;

  if (name.length < 2 || name.length > 30) {
    throw createApiError(
      400,
      "INVALID_PROFILE_NAME",
      "Le nom du profil doit contenir entre 2 et 30 caractères."
    );
  }

  return {
    name,
    avatarColor: HEX_COLOR_PATTERN.test(avatarColor)
      ? avatarColor.toLowerCase()
      : DEFAULT_PROFILE_COLOR,
  };
}

// list profiles for the current user - creates the default one if none exist yet
router.get("/", requireAuth, (req, res, next) => {
  try {
    return res.status(200).json({
      items: ensureDefaultProfile(req.authUser),
    });
  } catch (error) {
    return next(error);
  }
});

// create a new profile - 409 if name already taken
router.post("/", requireAuth, (req, res, next) => {
  try {
    const payload = validateProfilePayload(req.body);

    return res.status(201).json({
      item: createProfile({
        userId: req.authUser.id,
        ...payload,
      }),
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return next(
        createApiError(
          409,
          "PROFILE_ALREADY_EXISTS",
          "Un profil avec ce nom existe déjà."
        )
      );
    }

    return next(error);
  }
});

module.exports = router;
