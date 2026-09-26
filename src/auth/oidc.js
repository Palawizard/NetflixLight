const crypto = require("crypto");
const express = require("express");
const { config } = require("../config/env");
const {
  findBySubject,
  createOidcUser,
} = require("../data-access/repositories/user.repository");

// sign-in is delegated to Authentik (auth.palawi.fr) through OpenID Connect
// openid-client v6 is ESM-only, so it is loaded lazily with a dynamic import

let clientModulePromise = null;
let discoveryPromise = null;

function loadClient() {
  if (!clientModulePromise) {
    clientModulePromise = import("openid-client");
  }
  return clientModulePromise;
}

async function getConfiguration() {
  const { issuer, clientId, clientSecret, redirectUrl } = config.oidc;
  if (!issuer || !clientId || !clientSecret || !redirectUrl) {
    throw new Error(
      "OIDC is not configured (OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URL)"
    );
  }
  if (!discoveryPromise) {
    discoveryPromise = loadClient()
      .then((client) =>
        client.discovery(new URL(issuer), clientId, clientSecret)
      )
      .catch((error) => {
        // retry discovery on the next request (e.g. Authentik restarting)
        discoveryPromise = null;
        throw error;
      });
  }
  return discoveryPromise;
}

// the SPA root, derived from the callback URL (".../netflix-light/auth/callback" -> ".../netflix-light/")
function appRootUrl() {
  return new URL("../", config.oidc.redirectUrl).toString();
}

// keeps only SPA hash paths such as "/profile" to avoid open redirects
function safeNextPath(value) {
  if (typeof value !== "string" || !/^\/[a-zA-Z0-9/_-]*$/.test(value)) {
    return "/profile";
  }
  return value;
}

/**
 * builds a unique username from the identity provider name (3-30 chars, [a-zA-Z0-9_-])
 */
function usernameCandidate(name, attempt) {
  let base = String(name || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 30);
  if (base.length < 3) {
    base = "membre";
  }
  if (attempt === 0) {
    return base;
  }
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${base.slice(0, 25)}-${suffix}`;
}

function upsertUser({ subject, email, preferredUsername }) {
  const existing = findBySubject(subject);
  if (existing) {
    return existing;
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return createOidcUser({
        subject,
        // e-mail stays unique in the legacy schema: fall back to a placeholder if taken or absent
        email:
          attempt < 2 && email ? email.toLowerCase() : `${subject}@sso.invalid`,
        username: usernameCandidate(preferredUsername, attempt),
      });
    } catch (error) {
      if (error.code !== "SQLITE_CONSTRAINT_UNIQUE") {
        throw error;
      }
      const raced = findBySubject(subject);
      if (raced) {
        return raced;
      }
    }
  }
  throw new Error("could not create the user");
}

const router = express.Router();

// starts the sign-in (and sign-up) on Authentik
router.get("/login", async (req, res, next) => {
  try {
    const oidcConfig = await getConfiguration();
    const client = await loadClient();
    const codeVerifier = client.randomPKCECodeVerifier();
    const state = client.randomState();
    const nonce = client.randomNonce();

    req.session.oidc = {
      codeVerifier,
      state,
      nonce,
      next: safeNextPath(req.query.next),
    };

    const authorizationUrl = client.buildAuthorizationUrl(oidcConfig, {
      redirect_uri: config.oidc.redirectUrl,
      scope: "openid profile email",
      code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
      code_challenge_method: "S256",
      state,
      nonce,
    });

    req.session.save((error) => {
      if (error) {
        return next(error);
      }
      return res.redirect(302, authorizationUrl.href);
    });
  } catch (error) {
    return next(error);
  }
});

// finishes the sign-in and opens the local session
router.get("/callback", async (req, res, next) => {
  const pending = req.session && req.session.oidc;
  if (!pending) {
    return res.redirect(302, appRootUrl() + "#/login");
  }
  delete req.session.oidc;

  if (req.query.error) {
    return res.redirect(302, appRootUrl());
  }

  try {
    const oidcConfig = await getConfiguration();
    const client = await loadClient();
    // the app does not know its public prefix: rebuild the callback URL from the configured one
    const currentUrl = new URL(config.oidc.redirectUrl);
    currentUrl.search = new URL(req.originalUrl, "http://local").search;

    const tokens = await client.authorizationCodeGrant(oidcConfig, currentUrl, {
      pkceCodeVerifier: pending.codeVerifier,
      expectedState: pending.state,
      expectedNonce: pending.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();

    const user = upsertUser({
      subject: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      preferredUsername: claims.preferred_username || claims.name,
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
    };

    // new session id on sign-in (session fixation)
    return req.session.regenerate((error) => {
      if (error) {
        return next(error);
      }
      req.session.user = safeUser;
      return req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }
        return res.redirect(302, appRootUrl() + "#" + pending.next);
      });
    });
  } catch (error) {
    console.error("OIDC callback failed:", error && error.message);
    return res.redirect(302, appRootUrl() + "#/login");
  }
});

module.exports = router;
