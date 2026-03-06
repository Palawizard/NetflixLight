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
