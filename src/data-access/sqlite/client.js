const Database = require("better-sqlite3");
const { config } = require("../../config/env");

// single shared db connection - better-sqlite3 is synchronous so one instance is fine
const db = new Database(config.database.filename);

db.pragma("foreign_keys = ON");

module.exports = db;
