const db = require("../sqlite/client");
const { toWatchlistItem } = require("../../models/watchlist-item.model");

function findWatchlistItemByUserAndMedia({ userId, type, tmdbId }) {
  const statement = db.prepare(
    `SELECT user_id, media_type, tmdb_id, snapshot_title, snapshot_poster, added_at
    FROM watchlist_items
    WHERE user_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  const row = statement.get(userId, type, tmdbId);
  return toWatchlistItem(row);
}

function listWatchlistItemsByUserId(userId) {
  const statement = db.prepare(
    `SELECT user_id, media_type, tmdb_id, snapshot_title, snapshot_poster, added_at
    FROM watchlist_items
    WHERE user_id = ?
    ORDER BY added_at DESC, tmdb_id DESC;`
  );

  return statement.all(userId).map(toWatchlistItem);
}

function addWatchlistItem({ userId, type, tmdbId, title, poster }) {
  const statement = db.prepare(
    `INSERT INTO watchlist_items (user_id, media_type, tmdb_id, snapshot_title, snapshot_poster)
    VALUES (?, ?, ?, ?, ?);`
  );

  statement.run(userId, type, tmdbId, title, poster || null);

  return findWatchlistItemByUserAndMedia({
    userId,
    type,
    tmdbId,
  });
}

function removeWatchlistItem({ userId, type, tmdbId }) {
  const statement = db.prepare(
    `DELETE FROM watchlist_items
    WHERE user_id = ? AND media_type = ? AND tmdb_id = ?;`
  );

  return statement.run(userId, type, tmdbId);
}

module.exports = {
  findWatchlistItemByUserAndMedia,
  listWatchlistItemsByUserId,
  addWatchlistItem,
  removeWatchlistItem,
};
