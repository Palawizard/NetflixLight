const express = require("express");
const { config } = require("../config/env");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const { createApiError } = require("../utils/api-error");

const {
  findByToken,
  deleteByToken,
} = require("../data-access/repositories/session.repository");

const router = express.Router();

/**
 * @typedef {object} UserRow
 * @property {number} id
 * @property {string} email
 * @property {string} username
 * @property {string} created_at
 */

/**
 * parses a Bearer token from an Authorization header - returns null if missing or malformed
 */
function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

// sign-in and sign-up are handled by Authentik, see src/auth/oidc.js (mounted on /auth)

// returns the current session user - requires auth
router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: req.authUser,
  });
});

// log out - destroys the session or invalidates a bearer token depending on what's present
router.post("/logout", (req, res, next) => {
  if (req.session && req.session.user) {
    return req.session.destroy((error) => {
      if (error) {
        return next(error);
      }

      res.clearCookie(config.session.cookieName);
      return res.status(204).send();
    });
  }

  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next(
      createApiError(
        401,
        "MISSING_OR_INVALID_TOKEN",
        "Jeton manquant ou invalide."
      )
    );
  }

  try {
    const existingSession = findByToken(token);

    if (!existingSession) {
      return next(createApiError(401, "INVALID_TOKEN", "Jeton invalide."));
    }

    deleteByToken(token);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
