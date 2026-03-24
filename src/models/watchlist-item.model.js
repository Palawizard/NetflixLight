/**
 * @typedef {object} WatchlistRow
 * @property {number} tmdb_id
 * @property {"movie" | "tv"} media_type
 * @property {string} added_at
 * @property {string} snapshot_title
 * @property {string | null} snapshot_poster
 */

/**
 * @param {WatchlistRow | null | undefined} row
 */
function toWatchlistItem(row) {
  if (!row) {
    return null;
  }

  return {
    tmdbId: row.tmdb_id,
    type: row.media_type,
    addedAt: row.added_at,
    snapshot: {
      title: row.snapshot_title,
      poster: row.snapshot_poster,
    },
  };
}

module.exports = {
  toWatchlistItem,
};
