/**
 * maps a sqlite row to a camelCase watch progress object - returns null if row is missing
 */
function toWatchProgress(row) {
  if (!row) {
    return null;
  }

  return {
    type: row.media_type,
    tmdbId: row.tmdb_id,
    positionSeconds: row.position_seconds,
    durationSeconds: row.duration_seconds,
    updatedAt: row.updated_at,
    snapshot: {
      title: row.snapshot_title,
      poster: row.snapshot_poster,
    },
  };
}

module.exports = {
  toWatchProgress,
};
