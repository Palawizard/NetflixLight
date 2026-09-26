const db = require("./client");

/**
 * applies idempotent schema changes that came after 001_create_tables.sql
 * - users.auth_subject: OpenID Connect subject of the Authentik account (single sign-on)
 */
function ensureSchema() {
  const hasUsersTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users';"
    )
    .get();
  if (!hasUsersTable) {
    return;
  }

  const columns = db.prepare("PRAGMA table_info(users);").all();
  if (!columns.some((column) => column.name === "auth_subject")) {
    db.exec("ALTER TABLE users ADD COLUMN auth_subject TEXT;");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_auth_subject_idx ON users(auth_subject);"
  );
}

module.exports = {
  ensureSchema,
};
