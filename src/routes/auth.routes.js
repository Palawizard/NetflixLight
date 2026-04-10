const express = require("express");
const bcrypt = require("bcrypt");
const { config } = require("../config/env");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const { createApiError } = require("../utils/api-error");

const {
  findByEmail,
  findByUsername,
  createUser,
} = require("../data-access/repositories/user.repository");

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
 * @property {string} password_hash
 * @property {string} created_at
 */

function validateRegisterPayload(payload) {
  const errors = [];
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};

  const rawEmail = safePayload.email;
  const rawUsername = safePayload.username;
  const rawPassword = safePayload.password;

  let email = "";

  if (typeof rawEmail !== "string") {
    errors.push("L'email doit être une chaîne de caractères.");
  } else {
    email = rawEmail.trim().toLowerCase();

    if (email.length === 0) {
      errors.push("L'email est obligatoire.");
    } else if (!email.includes("@")) {
      errors.push("Le format de l'email est invalide.");
    }
  }

  let username = "";

  if (typeof rawUsername !== "string") {
    errors.push("Le pseudo doit être une chaîne de caractères.");
  } else {
    username = rawUsername.trim();

    if (username.length === 0) {
      errors.push("Le pseudo est obligatoire.");
    } else if (username.length < 3) {
      errors.push("Le pseudo doit contenir au moins 3 caractères.");
    } else if (username.length > 30) {
      errors.push("Le pseudo doit contenir au maximum 30 caractères.");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push("Le pseudo contient des caractères invalides.");
    }
  }

  let password = "";

  if (typeof rawPassword !== "string") {
    errors.push("Le mot de passe doit être une chaîne de caractères.");
  } else {
    password = rawPassword;

    if (password.length < 8) {
      errors.push("Le mot de passe doit contenir au moins 8 caractères.");
    } else if (password.length > 72) {
      errors.push("Le mot de passe doit contenir au maximum 72 caractères.");
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      email,
      username,
      password,
    },
  };
}

function validateLoginPayload(payload) {
  const errors = [];
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};

  const rawEmail = safePayload.email;
  const rawPassword = safePayload.password;

  let email = "";
  let password = "";

  if (typeof rawEmail !== "string") {
    errors.push("L'email doit être une chaîne de caractères.");
  } else {
    email = rawEmail.trim().toLowerCase();

    if (email.length === 0) {
      errors.push("L'email est obligatoire.");
    }
  }

  if (typeof rawPassword !== "string") {
    errors.push("Le mot de passe doit être une chaîne de caractères.");
  } else {
    password = rawPassword;

    if (password.length === 0) {
      errors.push("Le mot de passe est obligatoire.");
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      email,
      password,
    },
  };
}

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

router.post("/register", async (req, res, next) => {
  const validationResult = validateRegisterPayload(req.body);

  if (!validationResult.success) {
    return next(
      createApiError(
        400,
        "VALIDATION_ERROR",
        "Les informations d'inscription sont invalides.",
        validationResult.errors
      )
    );
  }

  const { email, username, password } = validationResult.data;

  const existingUserByEmail = findByEmail(email);
  if (existingUserByEmail) {
    return next(
      createApiError(
        409,
        "EMAIL_TAKEN",
        "Cette adresse e-mail est déjà utilisée."
      )
    );
  }

  const existingUserByUsername = findByUsername(username);
  if (existingUserByUsername) {
    return next(
      createApiError(409, "USERNAME_TAKEN", "Ce pseudo est déjà utilisé.")
    );
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

  try {
    const createdUser = createUser({
      email,
      username,
      passwordHash,
    });
    const safeUser = {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      created_at: createdUser.created_at,
    };

    return res.status(201).json({
      user: safeUser,
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return next(
        createApiError(409, "USER_EXISTS", "Cet utilisateur existe déjà.")
      );
    }

    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const validationResult = validateLoginPayload(req.body);

  if (!validationResult.success) {
    return next(
      createApiError(
        400,
        "VALIDATION_ERROR",
        "Les informations de connexion sont invalides.",
        validationResult.errors
      )
    );
  }

  const { email, password } = validationResult.data;

  try {
    /** @type {UserRow | undefined} */
    const user = findByEmail(email);

    if (!user) {
      return next(
        createApiError(401, "INVALID_CREDENTIALS", "Identifiants invalides.")
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return next(
        createApiError(401, "INVALID_CREDENTIALS", "Identifiants invalides.")
      );
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
    };

    req.session.user = safeUser;

    return res.status(200).json({
      user: safeUser,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: req.authUser,
  });
});

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
