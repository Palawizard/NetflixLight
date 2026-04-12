PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     email TEXT NOT NULL UNIQUE,
                                     username TEXT NOT NULL UNIQUE,
                                     password_hash TEXT NOT NULL,
                                     created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE TABLE IF NOT EXISTS sessions (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        user_id INTEGER NOT NULL,
                                        token TEXT NOT NULL UNIQUE,
                                        expires_at TEXT,
                                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS express_sessions (
                                                sid TEXT PRIMARY KEY,
                                                session_json TEXT NOT NULL,
                                                expires_at INTEGER NOT NULL
    );

CREATE TABLE IF NOT EXISTS favorites (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         user_id INTEGER NOT NULL,
                                         media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, media_type, tmdb_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS video_sources (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('youtube', 'url')),
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (media_type, tmdb_id, provider, source)
    );

CREATE TABLE IF NOT EXISTS watch_progress (
                                              user_id INTEGER NOT NULL,
                                              media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    snapshot_title TEXT,
    snapshot_poster TEXT,
    PRIMARY KEY (user_id, media_type, tmdb_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS watchlist_items (
                                               user_id INTEGER NOT NULL,
                                               media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    snapshot_title TEXT NOT NULL,
    snapshot_poster TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, media_type, tmdb_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS viewing_history (
                                               user_id INTEGER NOT NULL,
                                               media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    snapshot_title TEXT NOT NULL,
    snapshot_poster TEXT,
    PRIMARY KEY (user_id, media_type, tmdb_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS user_ratings (
                                             user_id INTEGER NOT NULL,
                                             media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, media_type, tmdb_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS profiles (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        user_id INTEGER NOT NULL,
                                        name TEXT NOT NULL,
                                        avatar_color TEXT NOT NULL DEFAULT '#fb7185',
                                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_express_sessions_expires_at ON express_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_video_sources_media ON video_sources(media_type, tmdb_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user ON watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_viewing_history_user ON viewing_history(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
