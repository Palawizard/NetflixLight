/**
 * @typedef {object} UserRatingRow
 * @property {"movie" | "tv"} media_type
 * @property {number} tmdb_id
 * @property {number} rating
 * @property {string} updated_at
 */

/**
 * @param {UserRatingRow | null | undefined} row
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
