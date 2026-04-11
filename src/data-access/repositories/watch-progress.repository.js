const db = require("../sqlite/client");
const { toWatchProgress } = require("../../models/watch-progress.model");

function ensureWatchProgressSnapshotColumns() {
  const columns = db.prepare(`PRAGMA table_info(watch_progress);`).all();
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("snapshot_title")) {
    db.prepare(
      `ALTER TABLE watch_progress ADD COLUMN snapshot_title TEXT;`
    ).run();
  }

  if (!columnNames.has("snapshot_poster")) {
    db.prepare(
      `ALTER TABLE watch_progress ADD COLUMN snapshot_poster TEXT;`
    ).run();
  }
}

ensureWatchProgressSnapshotColumns();

function findWatchProgressByUserAndMedia({ userId, type, tmdbId }) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, position_seconds, duration_seconds, updated_at, snapshot_title, snapshot_poster
    FROM watch_progress
    WHERE user_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return toWatchProgress(statement.get(userId, type, tmdbId));
}

function listWatchProgressByUserId(userId) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, position_seconds, duration_seconds, updated_at, snapshot_title, snapshot_poster
    FROM watch_progress
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT 12;`
  );

  return statement.all(userId).map(toWatchProgress);
}

function upsertWatchProgress({
  userId,
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
      media_type,
      tmdb_id,
      position_seconds,
      duration_seconds,
      snapshot_title,
      snapshot_poster,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, media_type, tmdb_id)
    DO UPDATE SET
      position_seconds = excluded.position_seconds,
      duration_seconds = excluded.duration_seconds,
      snapshot_title = COALESCE(excluded.snapshot_title, watch_progress.snapshot_title),
      snapshot_poster = COALESCE(excluded.snapshot_poster, watch_progress.snapshot_poster),
      updated_at = datetime('now');`
  );

  statement.run(
    userId,
    type,
    tmdbId,
    positionSeconds,
    durationSeconds,
    title || null,
    poster || null
  );

  return findWatchProgressByUserAndMedia({ userId, type, tmdbId });
}

function removeWatchProgress({ userId, type, tmdbId }) {
  const statement = db.prepare(
    `DELETE FROM watch_progress
    WHERE user_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return statement.run(userId, type, tmdbId);
}

module.exports = {
  findWatchProgressByUserAndMedia,
  listWatchProgressByUserId,
  upsertWatchProgress,
  removeWatchProgress,
};
