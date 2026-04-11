/**
 * @typedef {object} ViewingHistoryRow
 * @property {number} tmdb_id
 * @property {"movie" | "tv"} media_type
 * @property {string} viewed_at
 * @property {string} snapshot_title
 * @property {string | null} snapshot_poster
 */

/**
 * @param {ViewingHistoryRow | null | undefined} row
 */
function toViewingHistoryItem(row) {
  if (!row) {
    return null;
  }

  return {
    tmdbId: row.tmdb_id,
    type: row.media_type,
    viewedAt: row.viewed_at,
    snapshot: {
      title: row.snapshot_title,
      poster: row.snapshot_poster,
    },
  };
}

module.exports = {
  toViewingHistoryItem,
};
