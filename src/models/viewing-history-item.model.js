/**
 * maps a sqlite row to a camelCase viewing history item - returns null if row is missing
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
