const db = require("../sqlite/client");
const { toProfile } = require("../../models/profile.model");

const DEFAULT_PROFILE_COLOR = "#fb7185";

function ensureProfilesTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#fb7185',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);`
  ).run();
}

ensureProfilesTable();

function listProfilesByUserId(userId) {
  const statement = db.prepare(
    `SELECT id, user_id, name, avatar_color, created_at
    FROM profiles
    WHERE user_id = ?
    ORDER BY created_at ASC, id ASC;`
  );

  return statement.all(userId).map(toProfile);
}

function createProfile({ userId, name, avatarColor = DEFAULT_PROFILE_COLOR }) {
  const statement = db.prepare(
    `INSERT INTO profiles (user_id, name, avatar_color)
    VALUES (?, ?, ?);`
  );

  const result = statement.run(userId, name, avatarColor);

  return findProfileByIdAndUserId({
    userId,
    profileId: result.lastInsertRowid,
  });
}

function ensureDefaultProfile(user) {
  const profiles = listProfilesByUserId(user.id);

  if (profiles.length > 0) {
    return profiles;
  }

  createProfile({
    userId: user.id,
    name: user.username || "Profil principal",
  });

  return listProfilesByUserId(user.id);
}

function findProfileByIdAndUserId({ userId, profileId }) {
  const statement = db.prepare(
    `SELECT id, user_id, name, avatar_color, created_at
    FROM profiles
    WHERE user_id = ? AND id = ?;`
  );

  return toProfile(statement.get(userId, profileId));
}

module.exports = {
  listProfilesByUserId,
  createProfile,
  ensureDefaultProfile,
  findProfileByIdAndUserId,
};
