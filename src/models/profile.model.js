/**
 * @typedef {object} ProfileRow
 * @property {number} id
 * @property {number} user_id
 * @property {string} name
 * @property {string} avatar_color
 * @property {string} created_at
 */

/**
 * @param {ProfileRow | null | undefined} row
 */
function toProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  };
}

module.exports = {
  toProfile,
};
