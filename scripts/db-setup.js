// creates the data directory if needed and runs the migration SQL to initialize the SQLite database
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { config } = require("../src/config/env");

const migrationPath = path.resolve(
  __dirname,
  "../src/data-access/sqlite/migrations/001_create_tables.sql"
);
const migrationSql = fs.readFileSync(migrationPath, { encoding: "utf8" });

fs.mkdirSync(path.dirname(config.database.filename), { recursive: true });

const db = new Database(config.database.filename);

try {
  db.exec(migrationSql);
  console.log(`SQLite database ready: ${config.database.filename}`);
} finally {
  db.close();
}
