const db = require("../sqlite/client");
const {
  toViewingHistoryItem,
} = require("../../models/viewing-history-item.model");
const { ensureProfileScopedTables } = require("./profile-scoped-tables");

/**
 * creates the viewing_history table if it doesn't exist - runs once at module load
 * uses a per-media primary key so each title appears only once - upsert refreshes viewed_at when rewatched
 */
function ensureViewingHistoryTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS viewing_history (
      user_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      snapshot_title TEXT NOT NULL,
      snapshot_poster TEXT,
      PRIMARY KEY (user_id, media_type, tmdb_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_viewing_history_user
    ON viewing_history(user_id, viewed_at DESC);`
  ).run();
}

ensureViewingHistoryTable();
ensureProfileScopedTables();

/**
 * returns at most 12 items for a profile, sorted by most recently viewed
 */
function listViewingHistoryByUserId({ userId, profileId }) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, viewed_at, snapshot_title, snapshot_poster
    FROM viewing_history
    WHERE user_id = ? AND profile_id = ?
    ORDER BY viewed_at DESC, tmdb_id DESC
    LIMIT 12;`
  );

  return statement.all(userId, profileId).map(toViewingHistoryItem);
}

/**
 * inserts or refreshes a viewing history entry for the given title
 */
function upsertViewingHistoryItem({
  userId,
  profileId,
  type,
  tmdbId,
  title,
  poster,
}) {
  const statement = db.prepare(
    `INSERT INTO viewing_history (
      user_id,
      profile_id,
      media_type,
      tmdb_id,
      snapshot_title,
      snapshot_poster,
      viewed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, profile_id, media_type, tmdb_id)
    DO UPDATE SET
      snapshot_title = excluded.snapshot_title,
      snapshot_poster = excluded.snapshot_poster,
      viewed_at = datetime('now');`
  );

  statement.run(userId, profileId, type, tmdbId, title, poster || null);

  return findViewingHistoryItemByUserAndMedia({
    userId,
    profileId,
    type,
    tmdbId,
  });
}

/**
 * fetches a single history entry, used internally after upsert to return the saved row
 */
function findViewingHistoryItemByUserAndMedia({
  userId,
  profileId,
  type,
  tmdbId,
}) {
  const statement = db.prepare(
    `SELECT media_type, tmdb_id, viewed_at, snapshot_title, snapshot_poster
    FROM viewing_history
    WHERE user_id = ? AND profile_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return toViewingHistoryItem(statement.get(userId, profileId, type, tmdbId));
}

module.exports = {
  listViewingHistoryByUserId,
  upsertViewingHistoryItem,
};
