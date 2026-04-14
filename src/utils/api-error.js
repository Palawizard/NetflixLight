// structured error class for api responses
// routes throw these and apiErrorHandler serializes them into { error: { code, message, details } }
class ApiError extends Error {
  constructor({
    status = 500,
    code = "INTERNAL_ERROR",
    message,
    details,
  } = {}) {
    super(message || "Internal server error");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * shorthand to create and return an ApiError without new
 */
function createApiError(status, code, message, details) {
  return new ApiError({
    status,
    code,
    message,
    details,
  });
}

module.exports = {
  ApiError,
  createApiError,
};
