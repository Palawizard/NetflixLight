/**
 * maps a sqlite row to a camelCase watchlist item - returns null if row is missing
 * snapshot fields are stored at insert time so the watchlist can render without hitting tmdb again
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
