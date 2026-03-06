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

function validateRegisterPayload(payload) {
  const errors = [];
  const safePayload =
    payload !== null && typeof payload === "object" ? payload : {};

  const rawEmail = safePayload.email;
  const rawUsername = safePayload.username;
  const rawPassword = safePayload.password;

  let email = "";

  if (typeof rawEmail !== "string") {
    errors.push("email must be a string");
  } else {
    email = rawEmail.trim().toLowerCase();

    if (email.length === 0) {
      errors.push("email is required");
    } else if (!email.includes("@")) {
      errors.push("email format is invalid");
    }
  }

  let username = "";

  if (typeof rawUsername !== "string") {
    errors.push("username must be a string");
  } else {
    username = rawUsername.trim();

    if (username.length === 0) {
      errors.push("username is required");
    } else if (username.length < 3) {
      errors.push("username must be at least 3 characters");
    } else if (username.length > 30) {
      errors.push("username must be at most 30 characters");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push("username contains invalid characters");
    }
  }

  let password = "";

  if (typeof rawPassword !== "string") {
    errors.push("password must be a string");
  } else {
    password = rawPassword;

    if (password.length < 8) {
      errors.push("password must be at least 8 characters");
    } else if (password.length > 72) {
      errors.push("password must be at most 72 characters");
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
    errors.push("email must be a string");
  } else {
    email = rawEmail.trim().toLowerCase();

    if (email.length === 0) {
      errors.push("email is required");
    }
  }

  if (typeof rawPassword !== "string") {
    errors.push("password must be a string");
  } else {
    password = rawPassword;

    if (password.length === 0) {
      errors.push("password is required");
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
        "Invalid registration payload",
        validationResult.errors
      )
    );
  }

  const { email, username, password } = validationResult.data;

  const existingUserByEmail = findByEmail(email);
  if (existingUserByEmail) {
    return next(createApiError(409, "EMAIL_TAKEN", "Email is already in use"));
  }

  const existingUserByUsername = findByUsername(username);
  if (existingUserByUsername) {
    return next(
      createApiError(409, "USERNAME_TAKEN", "Username is already in use")
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
      return next(createApiError(409, "USER_EXISTS", "User already exists"));
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
        "Invalid login payload",
        validationResult.errors
      )
    );
  }

  const { email, password } = validationResult.data;

  try {
    const user = findByEmail(email);

    if (!user) {
      return next(
        createApiError(401, "INVALID_CREDENTIALS", "Invalid credentials")
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return next(
        createApiError(401, "INVALID_CREDENTIALS", "Invalid credentials")
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
        "Missing or invalid token"
      )
    );
  }

  try {
    const existingSession = findByToken(token);

    if (!existingSession) {
      return next(createApiError(401, "INVALID_TOKEN", "Invalid token"));
    }

    deleteByToken(token);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
