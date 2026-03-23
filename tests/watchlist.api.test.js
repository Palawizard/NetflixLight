const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "netflixlight-watchlist-")
);
const dbPath = path.join(tmpDir, "watchlist-test.sqlite");

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_SECRET = "watchlist_test_secret";

const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const request = require("supertest");

const migrationSql = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/data-access/sqlite/migrations/001_create_tables.sql"
  ),
  "utf8"
);

const db = new Database(dbPath);
db.exec(migrationSql);

const { app } = require("../server");

test.after(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("watchlist flow works for authenticated user", async () => {
  const passwordHash = await bcrypt.hash("password123", 4);

  db.prepare(
    `INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?);`
  ).run("watchlist@example.com", "watchlist-user", passwordHash);

  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    email: "watchlist@example.com",
    password: "password123",
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.user.email, "watchlist@example.com");

  const initialListResponse = await agent.get("/api/watchlist");
  assert.equal(initialListResponse.status, 200);
  assert.deepEqual(initialListResponse.body.items, []);

  const addResponse = await agent.post("/api/watchlist").send({
    tmdbId: 550,
    type: "movie",
    title: "Fight Club",
    poster: "/fight-club.jpg",
  });

  assert.equal(addResponse.status, 201);
  assert.equal(addResponse.body.item.tmdbId, 550);
  assert.equal(addResponse.body.item.type, "movie");
  assert.equal(addResponse.body.item.snapshot.title, "Fight Club");

  const duplicateResponse = await agent.post("/api/watchlist").send({
    tmdbId: 550,
    type: "movie",
    title: "Fight Club",
    poster: "/fight-club.jpg",
  });

  assert.equal(duplicateResponse.status, 409);
  assert.equal(duplicateResponse.body.error.code, "WATCHLIST_ITEM_EXISTS");

  const listResponse = await agent.get("/api/watchlist");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.length, 1);
  assert.equal(listResponse.body.items[0].snapshot.poster, "/fight-club.jpg");

  const removeResponse = await agent.delete("/api/watchlist/movie/550");
  assert.equal(removeResponse.status, 204);

  const finalListResponse = await agent.get("/api/watchlist");
  assert.equal(finalListResponse.status, 200);
  assert.deepEqual(finalListResponse.body.items, []);
});
