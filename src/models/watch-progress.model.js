/**
 * @typedef {object} WatchProgressRow
 * @property {"movie" | "tv"} media_type
 * @property {number} tmdb_id
 * @property {number} position_seconds
 * @property {number | null} duration_seconds
 * @property {string} updated_at
 * @property {string | null} snapshot_title
 * @property {string | null} snapshot_poster
 */

/**
 * @param {WatchProgressRow | null | undefined} row
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
