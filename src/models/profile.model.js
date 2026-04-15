// maps a sqlite row to a camelCase profile object - returns null if row is missing
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
