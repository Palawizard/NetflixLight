const db = require("../sqlite/client");

/**
 * looks up a user by email - used during login
 */
function findByEmail(email) {
  const statement = db.prepare(
    `SELECT id, email, username, password_hash, created_at
    FROM users
    WHERE email = ?;`
  );

  return statement.get(email);
}

/**
 * looks up a user by username - used during registration to check uniqueness
 */
function findByUsername(username) {
  const statement = db.prepare(
    `SELECT id, email, username, password_hash, created_at
    FROM users
    WHERE username = ?;`
  );

  return statement.get(username);
}

/**
 * fetches a user by primary key - used internally after insert to return the full row
 */
function findById(id) {
  const statement = db.prepare(
    `SELECT id, email, username, password_hash, created_at
    FROM users
    WHERE id = ?;`
  );

  return statement.get(id);
}

/**
 * inserts a new user row and returns the full record by re-fetching with the inserted id
 */
function createUser({ email, username, passwordHash }) {
  const statement = db.prepare(
    `INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?);`
  );

  const result = statement.run(email, username, passwordHash);
  return findById(Number(result.lastInsertRowid));
}

module.exports = {
  findByEmail,
  findByUsername,
  createUser,
};
