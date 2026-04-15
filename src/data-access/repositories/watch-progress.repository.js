const db = require("../sqlite/client");
const { toWatchProgress } = require("../../models/watch-progress.model");
const { ensureProfileScopedTables } = require("./profile-scoped-tables");

ensureProfileScopedTables();

/**
 * fetches the progress entry for a specific title, returns null if not found
 */
function findWatchProgressByUserAndMedia({ userId, profileId, type, tmdbId }) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, position_seconds, duration_seconds, updated_at, snapshot_title, snapshot_poster
    FROM watch_progress
    WHERE user_id = ? AND profile_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return toWatchProgress(statement.get(userId, profileId, type, tmdbId));
}

/**
 * returns at most 12 progress entries for a profile, sorted by most recently watched
 */
function listWatchProgressByUserId({ userId, profileId }) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, position_seconds, duration_seconds, updated_at, snapshot_title, snapshot_poster
    FROM watch_progress
    WHERE user_id = ? AND profile_id = ?
    ORDER BY updated_at DESC
    LIMIT 12;`
  );

  return statement.all(userId, profileId).map(toWatchProgress);
}

/**
 * creates or updates a watch progress entry
 * COALESCE ensures existing snapshot data is preserved when not re-supplied
 */
function upsertWatchProgress({
  userId,
  profileId,
  type,
  tmdbId,
  positionSeconds,
  durationSeconds,
  title,
  poster,
}) {
  const statement = db.prepare(
    `INSERT INTO watch_progress (
      user_id,
      profile_id,
      media_type,
      tmdb_id,
      position_seconds,
      duration_seconds,
      snapshot_title,
      snapshot_poster,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, profile_id, media_type, tmdb_id)
    DO UPDATE SET
      position_seconds = excluded.position_seconds,
      duration_seconds = excluded.duration_seconds,
      snapshot_title = COALESCE(excluded.snapshot_title, watch_progress.snapshot_title),
      snapshot_poster = COALESCE(excluded.snapshot_poster, watch_progress.snapshot_poster),
      updated_at = datetime('now');`
  );

  statement.run(
    userId,
    profileId,
    type,
    tmdbId,
    positionSeconds,
    durationSeconds,
    title || null,
    poster || null
  );

  return findWatchProgressByUserAndMedia({ userId, profileId, type, tmdbId });
}

/**
 * deletes a progress entry - no-op if it doesn't exist
 */
function removeWatchProgress({ userId, profileId, type, tmdbId }) {
  const statement = db.prepare(
    `DELETE FROM watch_progress
    WHERE user_id = ? AND profile_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return statement.run(userId, profileId, type, tmdbId);
}

module.exports = {
  findWatchProgressByUserAndMedia,
  listWatchProgressByUserId,
  upsertWatchProgress,
  removeWatchProgress,
};
