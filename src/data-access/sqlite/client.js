const Database = require("better-sqlite3");
const { config } = require("../../config/env");

const db = new Database(config.database.filename);

db.pragma("foreign_keys = ON");

module.exports = db;
