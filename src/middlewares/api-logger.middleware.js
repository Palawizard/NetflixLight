// logs method, path, status code and duration for every /api request
const apiRequestLogger = (req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next();
  }

  const startTime = Date.now();

  // uses the finish event so we can log the actual response status
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    console.log(
      `[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    );
  });

  return next();
};

module.exports = {
  apiRequestLogger,
};
