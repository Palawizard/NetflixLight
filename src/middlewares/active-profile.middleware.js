const {
  ensureDefaultProfile,
  findProfileByIdAndUserId,
} = require("../data-access/repositories/profile.repository");
const { createApiError } = require("../utils/api-error");

// resolves the active profile from X-Profile-Id header and attaches it to req.activeProfile
// falls back to the first profile if no header is sent
// must run after requireAuth since it reads req.authUser
function requireActiveProfile(req, res, next) {
  try {
    const userId = req.authUser.id;
    const requestedProfileId = Number.parseInt(
      req.get("x-profile-id") || "",
      10
    );
    const hasRequestedProfile =
      Number.isInteger(requestedProfileId) && requestedProfileId > 0;

    // auto-creates a default profile if the user has none yet
    const profiles = ensureDefaultProfile(req.authUser);
    const activeProfile = hasRequestedProfile
      ? findProfileByIdAndUserId({ userId, profileId: requestedProfileId })
      : profiles[0];

    if (!activeProfile) {
      return next(
        createApiError(
          403,
          "PROFILE_NOT_FOUND",
          "Ce profil est introuvable pour ce compte."
        )
      );
    }

    req.activeProfile = activeProfile;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireActiveProfile,
};
