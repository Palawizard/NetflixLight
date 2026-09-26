const db = require("../sqlite/client");

/**
 * looks up a user by OpenID Connect subject - used after an Authentik sign-in
 */
function findBySubject(subject) {
  const statement = db.prepare(
    `SELECT id, email, username, created_at
    FROM users
    WHERE auth_subject = ?;`
  );

  return statement.get(subject);
}

/**
 * fetches a user by primary key - used internally after insert to return the full row
 */
function findById(id) {
  const statement = db.prepare(
    `SELECT id, email, username, created_at
    FROM users
    WHERE id = ?;`
  );

  return statement.get(id);
}

/**
 * inserts a user created by single sign-on (no local password) and returns the full record
 */
function createOidcUser({ subject, email, username }) {
  const statement = db.prepare(
    `INSERT INTO users (email, username, password_hash, auth_subject)
    VALUES (?, ?, '', ?);`
  );

  const result = statement.run(email, username, subject);
  return findById(Number(result.lastInsertRowid));
}

module.exports = {
  findBySubject,
  createOidcUser,
};
