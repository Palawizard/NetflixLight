const { ApiError, createApiError } = require("../utils/api-error");

/** @type {import("express").RequestHandler} */
const apiNotFoundHandler = (req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next();
  }

  return next(
    createApiError(
      404,
      "NOT_FOUND",
      `Route not found: ${req.method} ${req.path}`
    )
  );
};

/** @type {import("express").ErrorRequestHandler} */
const apiErrorHandler = (err, req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next(err);
  }

  const isApiError = err instanceof ApiError;
  const isInvalidJson = err && err.type === "entity.parse.failed";

  const status = isApiError ? err.status : isInvalidJson ? 400 : 500;
  const code = isApiError
    ? err.code
    : isInvalidJson
      ? "INVALID_JSON"
      : "INTERNAL_ERROR";
  const message = isApiError
    ? err.message
    : isInvalidJson
      ? "Malformed JSON body"
      : "Internal server error";
  const details = isApiError ? err.details : undefined;

  if (status >= 500) {
    console.error(`[API_ERROR] ${req.method} ${req.originalUrl}`, err);
  } else {
    console.warn(
      `[API_WARN] ${req.method} ${req.originalUrl} -> ${status} ${code}`
    );
  }

  const payload = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    payload.error.details = details;
  }

  return res.status(status).json(payload);
};

module.exports = {
  apiNotFoundHandler,
  apiErrorHandler,
};
