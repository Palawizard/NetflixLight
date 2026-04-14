// opens the database in read-only mode and prints the path and the list of tables
const Database = require("better-sqlite3");
const { config } = require("../src/config/env");

const db = new Database(config.database.filename, { readonly: true });

try {
  const tables = db
    .prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table'
       ORDER BY name;`
    )
    .all()
    .map((row) => row.name);

  console.log(`main: ${config.database.filename}`);
  console.log(`tables: ${tables.length > 0 ? tables.join(", ") : "(none)"}`);
} finally {
  db.close();
}
