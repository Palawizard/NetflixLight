const db = require("../sqlite/client");

let didEnsureProfileScopedTables = false;

function ensureProfileScopedTables() {
  if (didEnsureProfileScopedTables) {
    return;
  }

  didEnsureProfileScopedTables = true;
  ensureProfilesTable();
  ensureDefaultProfilesForExistingUsers();
  migrateWatchlistItemsTable();
  migrateWatchProgressTable();
  migrateViewingHistoryTable();
  migrateUserRatingsTable();
}

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

function ensureDefaultProfilesForExistingUsers() {
  db.prepare(
    `INSERT INTO profiles (user_id, name, avatar_color)
    SELECT users.id, users.username, '#fb7185'
    FROM users
    WHERE NOT EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.user_id = users.id
    );`
  ).run();
}

function tableExists(tableName) {
  return Boolean(
    db
      .prepare(
        `SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?;`
      )
      .get(tableName)
  );
}

function hasColumn(tableName, columnName) {
  return db
    .prepare(`PRAGMA table_info(${tableName});`)
    .all()
    .some((column) => column.name === columnName);
}

function getDefaultProfileIdExpression(tableAlias) {
  return `(SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = ${tableAlias}.user_id
    ORDER BY profiles.created_at ASC, profiles.id ASC
    LIMIT 1)`;
}

function migrateWatchlistItemsTable() {
  if (!tableExists("watchlist_items")) {
    createWatchlistItemsTable();
    return;
  }

  if (hasColumn("watchlist_items", "profile_id")) {
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_watchlist_items_profile
      ON watchlist_items(user_id, profile_id, added_at DESC);`
    ).run();
    return;
  }

  db.transaction(() => {
    db.prepare(
      `ALTER TABLE watchlist_items RENAME TO watchlist_items_legacy;`
    ).run();
    createWatchlistItemsTable();
    db.prepare(
      `INSERT OR IGNORE INTO watchlist_items (
        user_id,
        profile_id,
        media_type,
        tmdb_id,
        snapshot_title,
        snapshot_poster,
        added_at
      )
      SELECT
        legacy.user_id,
        ${getDefaultProfileIdExpression("legacy")},
        legacy.media_type,
        legacy.tmdb_id,
        legacy.snapshot_title,
        legacy.snapshot_poster,
        legacy.added_at
      FROM watchlist_items_legacy legacy;`
    ).run();
    db.prepare(`DROP TABLE watchlist_items_legacy;`).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_watchlist_items_profile
      ON watchlist_items(user_id, profile_id, added_at DESC);`
    ).run();
  })();
}

function createWatchlistItemsTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS watchlist_items (
      user_id INTEGER NOT NULL,
      profile_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      snapshot_title TEXT NOT NULL,
      snapshot_poster TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, profile_id, media_type, tmdb_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_watchlist_items_profile
    ON watchlist_items(user_id, profile_id, added_at DESC);`
  ).run();
}

function migrateWatchProgressTable() {
  if (!tableExists("watch_progress")) {
    createWatchProgressTable();
    return;
  }

  const hasProfileId = hasColumn("watch_progress", "profile_id");

  if (hasProfileId) {
    ensureWatchProgressSnapshotColumns();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_watch_progress_profile
      ON watch_progress(user_id, profile_id, updated_at DESC);`
    ).run();
    return;
  }

  ensureWatchProgressSnapshotColumns();

  db.transaction(() => {
    db.prepare(
      `ALTER TABLE watch_progress RENAME TO watch_progress_legacy;`
    ).run();
    createWatchProgressTable();
    db.prepare(
      `INSERT OR IGNORE INTO watch_progress (
        user_id,
        profile_id,
        media_type,
        tmdb_id,
        position_seconds,
        duration_seconds,
        updated_at,
        snapshot_title,
        snapshot_poster
      )
      SELECT
        legacy.user_id,
        ${getDefaultProfileIdExpression("legacy")},
        legacy.media_type,
        legacy.tmdb_id,
        legacy.position_seconds,
        legacy.duration_seconds,
        legacy.updated_at,
        legacy.snapshot_title,
        legacy.snapshot_poster
      FROM watch_progress_legacy legacy;`
    ).run();
    db.prepare(`DROP TABLE watch_progress_legacy;`).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_watch_progress_profile
      ON watch_progress(user_id, profile_id, updated_at DESC);`
    ).run();
  })();
}

function createWatchProgressTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS watch_progress (
      user_id INTEGER NOT NULL,
      profile_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
      duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      snapshot_title TEXT,
      snapshot_poster TEXT,
      PRIMARY KEY (user_id, profile_id, media_type, tmdb_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_watch_progress_profile
    ON watch_progress(user_id, profile_id, updated_at DESC);`
  ).run();
}

function ensureWatchProgressSnapshotColumns() {
  if (!hasColumn("watch_progress", "snapshot_title")) {
    db.prepare(
      `ALTER TABLE watch_progress ADD COLUMN snapshot_title TEXT;`
    ).run();
  }

  if (!hasColumn("watch_progress", "snapshot_poster")) {
    db.prepare(
      `ALTER TABLE watch_progress ADD COLUMN snapshot_poster TEXT;`
    ).run();
  }
}

function migrateViewingHistoryTable() {
  if (!tableExists("viewing_history")) {
    createViewingHistoryTable();
    return;
  }

  if (hasColumn("viewing_history", "profile_id")) {
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_viewing_history_profile
      ON viewing_history(user_id, profile_id, viewed_at DESC);`
    ).run();
    return;
  }

  db.transaction(() => {
    db.prepare(
      `ALTER TABLE viewing_history RENAME TO viewing_history_legacy;`
    ).run();
    createViewingHistoryTable();
    db.prepare(
      `INSERT OR IGNORE INTO viewing_history (
        user_id,
        profile_id,
        media_type,
        tmdb_id,
        viewed_at,
        snapshot_title,
        snapshot_poster
      )
      SELECT
        legacy.user_id,
        ${getDefaultProfileIdExpression("legacy")},
        legacy.media_type,
        legacy.tmdb_id,
        legacy.viewed_at,
        legacy.snapshot_title,
        legacy.snapshot_poster
      FROM viewing_history_legacy legacy;`
    ).run();
    db.prepare(`DROP TABLE viewing_history_legacy;`).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_viewing_history_profile
      ON viewing_history(user_id, profile_id, viewed_at DESC);`
    ).run();
  })();
}

function createViewingHistoryTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS viewing_history (
      user_id INTEGER NOT NULL,
      profile_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      snapshot_title TEXT NOT NULL,
      snapshot_poster TEXT,
      PRIMARY KEY (user_id, profile_id, media_type, tmdb_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_viewing_history_profile
    ON viewing_history(user_id, profile_id, viewed_at DESC);`
  ).run();
}

function migrateUserRatingsTable() {
  if (!tableExists("user_ratings")) {
    createUserRatingsTable();
    return;
  }

  if (hasColumn("user_ratings", "profile_id")) {
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_user_ratings_profile
      ON user_ratings(user_id, profile_id, updated_at DESC);`
    ).run();
    return;
  }

  db.transaction(() => {
    db.prepare(`ALTER TABLE user_ratings RENAME TO user_ratings_legacy;`).run();
    createUserRatingsTable();
    db.prepare(
      `INSERT OR IGNORE INTO user_ratings (
        user_id,
        profile_id,
        media_type,
        tmdb_id,
        rating,
        updated_at
      )
      SELECT
        legacy.user_id,
        ${getDefaultProfileIdExpression("legacy")},
        legacy.media_type,
        legacy.tmdb_id,
        legacy.rating,
        legacy.updated_at
      FROM user_ratings_legacy legacy;`
    ).run();
    db.prepare(`DROP TABLE user_ratings_legacy;`).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_user_ratings_profile
      ON user_ratings(user_id, profile_id, updated_at DESC);`
    ).run();
  })();
}

function createUserRatingsTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS user_ratings (
      user_id INTEGER NOT NULL,
      profile_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
      tmdb_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, profile_id, media_type, tmdb_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_user_ratings_profile
    ON user_ratings(user_id, profile_id, updated_at DESC);`
  ).run();
}

module.exports = {
  ensureProfileScopedTables,
};
