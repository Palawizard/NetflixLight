const db = require("../sqlite/client");

/**
 * looks up a session row by its token - used for token-based auth flows
 */
function findByToken(token) {
  const statement = db.prepare(
    `SELECT id, user_id, token, expires_at, created_at
    FROM sessions
    WHERE token = ?;`
  );

  return statement.get(token);
}

/**
 * removes a session row by token - used on logout
 */
function deleteByToken(token) {
  const statement = db.prepare(`DELETE FROM sessions WHERE token = ?;`);

  return statement.run(token);
}

module.exports = {
  findByToken,
  deleteByToken,
};
