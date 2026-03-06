function apiRequestLogger(req, res, next) {
  if (!req.path.startsWith("/api")) {
    return next();
  }

  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    console.log(
      `[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    );
  });

  return next();
}

module.exports = {
  apiRequestLogger,
};
