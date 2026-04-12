const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "netflixlight-viewing-history-")
);
const dbPath = path.join(tmpDir, "viewing-history-test.sqlite");

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_SECRET = "viewing_history_test_secret";

const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const request = require("supertest");

const migrationSql = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/data-access/sqlite/migrations/001_create_tables.sql"
  ),
  { encoding: "utf8" }
);

const db = new Database(dbPath);
db.exec(migrationSql);

const { app } = require("../server");
const appDb = require("../src/data-access/sqlite/client");

test.after(() => {
  appDb.close();
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("viewing history flow stores latest consulted titles", async () => {
  const passwordHash = await bcrypt.hash("password123", 4);

  db.prepare(
    `INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?);`
  ).run("history@example.com", "history-user", passwordHash);

  /** @type {import("supertest").Agent} */
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    email: "history@example.com",
    password: "password123",
  });

  assert.equal(loginResponse.status, 200);

  const emptyResponse = await agent.get("/api/viewing-history");
  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(emptyResponse.body.items, []);

  const firstSaveResponse = await agent.post("/api/viewing-history").send({
    type: "movie",
    tmdbId: 550,
    title: "Fight Club",
    poster: "/fight-club.jpg",
  });

  assert.equal(firstSaveResponse.status, 201);
  assert.equal(firstSaveResponse.body.item.tmdbId, 550);
  assert.equal(firstSaveResponse.body.item.snapshot.title, "Fight Club");

  const secondSaveResponse = await agent.post("/api/viewing-history").send({
    type: "movie",
    tmdbId: 550,
    title: "Fight Club - updated",
    poster: "/fight-club-updated.jpg",
  });

  assert.equal(secondSaveResponse.status, 201);
  assert.equal(
    secondSaveResponse.body.item.snapshot.title,
    "Fight Club - updated"
  );

  const listResponse = await agent.get("/api/viewing-history");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.length, 1);
  assert.equal(
    listResponse.body.items[0].snapshot.poster,
    "/fight-club-updated.jpg"
  );
});
