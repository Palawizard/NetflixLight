const db = require("../sqlite/client");

function findByEmail(email) {
  const statement = db.prepare(
    `SELECT id, email, username, password_hash, created_at
    FROM users
    WHERE email = ?;`
  );

  return statement.get(email);
}

function findByUsername(username) {
  const statement = db.prepare(
    `SELECT id, email, username, password_hash, created_at
    FROM users
    WHERE username = ?;`
  );

  return statement.get(username);
}

function findById(id) {
  const statement = db.prepare(
    `SELECT id, email, username, password_hash, created_at
    FROM users
    WHERE id = ?;`
  );

  return statement.get(id);
}

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
