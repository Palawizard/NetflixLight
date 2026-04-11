const db = require("../sqlite/client");
const { toUserRating } = require("../../models/user-rating.model");

function ensureUserRatingsTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS user_ratings (
      user_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, media_type, tmdb_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_user_ratings_user
    ON user_ratings(user_id, updated_at DESC);`
  ).run();
}

ensureUserRatingsTable();

function listUserRatingsByUserId(userId) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, rating, updated_at
    FROM user_ratings
    WHERE user_id = ?
    ORDER BY updated_at DESC;`
  );

  return statement.all(userId).map(toUserRating);
}

function findUserRatingByUserAndMedia({ userId, type, tmdbId }) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, rating, updated_at
    FROM user_ratings
    WHERE user_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return toUserRating(statement.get(userId, type, tmdbId));
}

function upsertUserRating({ userId, type, tmdbId, rating }) {
  const statement = db.prepare(
    `INSERT INTO user_ratings (user_id, media_type, tmdb_id, rating, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, media_type, tmdb_id)
    DO UPDATE SET
      rating = excluded.rating,
      updated_at = datetime('now');`
  );

  statement.run(userId, type, tmdbId, rating);

  return findUserRatingByUserAndMedia({
    userId,
    type,
    tmdbId,
  });
}

function removeUserRating({ userId, type, tmdbId }) {
  const statement = db.prepare(
    `DELETE FROM user_ratings
    WHERE user_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return statement.run(userId, type, tmdbId);
}

module.exports = {
  listUserRatingsByUserId,
  findUserRatingByUserAndMedia,
  upsertUserRating,
  removeUserRating,
};
