const db = require("../sqlite/client");
const { toWatchlistItem } = require("../../models/watchlist-item.model");
const { ensureProfileScopedTables } = require("./profile-scoped-tables");

ensureProfileScopedTables();

/**
 * fetches a single watchlist entry, returns null if not found
 */
function findWatchlistItemByUserAndMedia({ userId, profileId, type, tmdbId }) {
  const statement = db.prepare(
    `SELECT user_id, media_type, tmdb_id, snapshot_title, snapshot_poster, added_at
    FROM watchlist_items
    WHERE user_id = ? AND profile_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  const row = statement.get(userId, profileId, type, tmdbId);
  return toWatchlistItem(row);
}

/**
 * returns all watchlist entries for a profile, newest first
 */
function listWatchlistItemsByUserId({ userId, profileId }) {
  const statement = db.prepare(
    `SELECT user_id, media_type, tmdb_id, snapshot_title, snapshot_poster, added_at
    FROM watchlist_items
    WHERE user_id = ? AND profile_id = ?
    ORDER BY added_at DESC, tmdb_id DESC;`
  );

  return statement.all(userId, profileId).map(toWatchlistItem);
}

/**
 * inserts a new watchlist entry and returns it - poster is nullable
 */
function addWatchlistItem({ userId, profileId, type, tmdbId, title, poster }) {
  const statement = db.prepare(
    `INSERT INTO watchlist_items (user_id, profile_id, media_type, tmdb_id, snapshot_title, snapshot_poster)
    VALUES (?, ?, ?, ?, ?, ?);`
  );

  statement.run(userId, profileId, type, tmdbId, title, poster || null);

  return findWatchlistItemByUserAndMedia({
    userId,
    profileId,
    type,
    tmdbId,
  });
}

/**
 * deletes a watchlist entry - no-op if it doesn't exist
 */
function removeWatchlistItem({ userId, profileId, type, tmdbId }) {
  const statement = db.prepare(
    `DELETE FROM watchlist_items
    WHERE user_id = ? AND profile_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return statement.run(userId, profileId, type, tmdbId);
}

module.exports = {
  findWatchlistItemByUserAndMedia,
  listWatchlistItemsByUserId,
  addWatchlistItem,
  removeWatchlistItem,
};
