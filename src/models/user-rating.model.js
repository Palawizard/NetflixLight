/**
 * maps a sqlite row to a camelCase user rating object - returns null if row is missing
 */
function toUserRating(row) {
  if (!row) {
    return null;
  }

  return {
    type: row.media_type,
    tmdbId: row.tmdb_id,
    rating: row.rating,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toUserRating,
};
