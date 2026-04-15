const session = require("express-session");
const db = require("./client");

// express-session store backed by sqlite
// implements the required get/set/destroy interface plus touch for sliding expiry
class SqliteSessionStore extends session.Store {
  constructor({ ttlMs } = {}) {
    super();

    this.ttlMs = ttlMs;
    this.ensureTable();
  }

  // creates the sessions table if it doesn't exist yet - called once at startup
  ensureTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS express_sessions (
        sid TEXT PRIMARY KEY,
        session_json TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_express_sessions_expires_at
      ON express_sessions(expires_at);
    `);
  }

  // reads a session by id - returns null if expired or missing, destroys it lazily on expiry
  get(sid, callback) {
    try {
      const row = db
        .prepare(
          `SELECT session_json, expires_at
           FROM express_sessions
           WHERE sid = ?;`
        )
        .get(sid);

      if (!row) {
        callback(null, null);
        return;
      }

      // lazily expire - destroy on read instead of running a scheduled cleanup job
      if (row.expires_at <= Date.now()) {
        this.destroy(sid, (error) => {
          callback(error, null);
        });
        return;
      }

      callback(null, JSON.parse(row.session_json));
    } catch (error) {
      callback(error);
    }
  }

  // upserts a session row with the latest data and expiry
  set(sid, sessionValue, callback = () => {}) {
    try {
      db.prepare(
        `INSERT INTO express_sessions (sid, session_json, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET
           session_json = excluded.session_json,
           expires_at = excluded.expires_at;`
      ).run(
        sid,
        JSON.stringify(sessionValue),
        this.getSessionExpiration(sessionValue)
      );

      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  // deletes a session row - used on logout and lazy expiry cleanup
  destroy(sid, callback = () => {}) {
    try {
      db.prepare(`DELETE FROM express_sessions WHERE sid = ?;`).run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  // refreshes the expiry without changing the session data
  touch(sid, sessionValue, callback = () => {}) {
    try {
      db.prepare(
        `UPDATE express_sessions
         SET expires_at = ?
         WHERE sid = ?;`
      ).run(this.getSessionExpiration(sessionValue), sid);

      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * resolves expiry from the session cookie if set, otherwise falls back to ttlMs from now
   */
  getSessionExpiration(sessionValue) {
    const cookieExpiresAt = sessionValue?.cookie?.expires;

    if (cookieExpiresAt) {
      return new Date(cookieExpiresAt).getTime();
    }

    return Date.now() + this.ttlMs;
  }
}

module.exports = {
  SqliteSessionStore,
};
