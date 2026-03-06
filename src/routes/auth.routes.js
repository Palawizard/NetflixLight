const express = require("express");
const bcrypt = require("bcrypt");
const { config } = require("../config/env");
const { requireAuth } = require("../middlewares/require-auth.middleware");

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

router.post("/register", async (req, res) => {
  const validationResult = validateRegisterPayload(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      errors: validationResult.errors,
    });
  }

  const { email, username, password } = validationResult.data;

  const existingUserByEmail = findByEmail(email);
  if (existingUserByEmail) {
    return res.status(409).json({
      error: "email is already in use",
    });
  }

  const existingUserByUsername = findByUsername(username);
  if (existingUserByUsername) {
    return res.status(409).json({
      error: "username is already in use",
    });
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
      return res.status(409).json({
        error: "user already exists",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "internal server error",
    });
  }
});

router.post("/login", async (req, res) => {
  const validationResult = validateLoginPayload(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      errors: validationResult.errors,
    });
  }

  const { email, password } = validationResult.data;

  try {
    const user = findByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: "invalid credentials",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "invalid credentials",
      });
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
    console.error(error);
    return res.status(500).json({
      error: "internal server error",
    });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: req.authUser,
  });
});

router.post("/logout", (req, res) => {
  if (req.session && req.session.user) {
    return req.session.destroy((error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          error: "internal server error",
        });
      }

      res.clearCookie(config.session.cookieName);
      return res.status(204).send();
    });
  }

  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      error: "missing or invalid token",
    });
  }

  try {
    const existingSession = findByToken(token);

    if (!existingSession) {
      return res.status(401).json({
        error: "invalid token",
      });
    }

    deleteByToken(token);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "internal server error",
    });
  }
});

module.exports = router;
