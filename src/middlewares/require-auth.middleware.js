const { createApiError } = require("../utils/api-error");

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return next(
      createApiError(401, "AUTH_REQUIRED", "Authentication required")
    );
  }

  req.authUser = req.session.user;
  return next();
}

module.exports = {
  requireAuth,
};
