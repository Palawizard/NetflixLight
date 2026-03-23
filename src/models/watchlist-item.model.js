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
