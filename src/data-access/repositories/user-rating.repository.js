const db = require("../sqlite/client");
const { toUserRating } = require("../../models/user-rating.model");
const { ensureProfileScopedTables } = require("./profile-scoped-tables");

/**
 * creates the user_ratings table if it doesn't exist - runs once at module load
 */
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
ensureProfileScopedTables();

/**
 * returns all ratings for a profile, newest first
 */
function listUserRatingsByUserId({ userId, profileId }) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, rating, updated_at
    FROM user_ratings
    WHERE user_id = ? AND profile_id = ?
    ORDER BY updated_at DESC;`
  );

  return statement.all(userId, profileId).map(toUserRating);
}

/**
 * fetches the rating for a specific title, returns null if not rated
 */
function findUserRatingByUserAndMedia({ userId, profileId, type, tmdbId }) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, rating, updated_at
    FROM user_ratings
    WHERE user_id = ? AND profile_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return toUserRating(statement.get(userId, profileId, type, tmdbId));
}

/**
 * creates or updates a rating and returns the saved row
 */
function upsertUserRating({ userId, profileId, type, tmdbId, rating }) {
  const statement = db.prepare(
    `INSERT INTO user_ratings (user_id, profile_id, media_type, tmdb_id, rating, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, profile_id, media_type, tmdb_id)
    DO UPDATE SET
      rating = excluded.rating,
      updated_at = datetime('now');`
  );

  statement.run(userId, profileId, type, tmdbId, rating);

  return findUserRatingByUserAndMedia({
    userId,
    profileId,
    type,
    tmdbId,
  });
}

/**
 * deletes a rating - no-op if it doesn't exist
 */
function removeUserRating({ userId, profileId, type, tmdbId }) {
  const statement = db.prepare(
    `DELETE FROM user_ratings
    WHERE user_id = ? AND profile_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return statement.run(userId, profileId, type, tmdbId);
}

module.exports = {
  listUserRatingsByUserId,
  findUserRatingByUserAndMedia,
  upsertUserRating,
  removeUserRating,
};
