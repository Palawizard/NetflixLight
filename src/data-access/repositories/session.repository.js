const db = require("../sqlite/client");

function findByToken(token) {
  const statement = db.prepare(
    `SELECT id, user_id, token, expires_at, created_at
    FROM sessions
    WHERE token = ?;`
  );

  return statement.get(token);
}

function deleteByToken(token) {
  const statement = db.prepare(`DELETE FROM sessions WHERE token = ?;`);

  return statement.run(token);
}

module.exports = {
  findByToken,
  deleteByToken,
};
