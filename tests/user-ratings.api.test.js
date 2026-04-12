const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "netflixlight-user-ratings-")
);
const dbPath = path.join(tmpDir, "user-ratings-test.sqlite");

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_SECRET = "user_ratings_test_secret";

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

test("user ratings flow stores a personal score per title", async () => {
  const passwordHash = await bcrypt.hash("password123", 4);

  db.prepare(
    `INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?);`
  ).run("ratings@example.com", "ratings-user", passwordHash);

  /** @type {import("supertest").Agent} */
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    email: "ratings@example.com",
    password: "password123",
  });

  assert.equal(loginResponse.status, 200);

  const emptyResponse = await agent.get("/api/user-ratings");
  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(emptyResponse.body.items, []);

  const saveResponse = await agent.put("/api/user-ratings/movie/550").send({
    rating: 4,
  });

  assert.equal(saveResponse.status, 200);
  assert.equal(saveResponse.body.item.tmdbId, 550);
  assert.equal(saveResponse.body.item.rating, 4);

  const updateResponse = await agent.put("/api/user-ratings/movie/550").send({
    rating: 5,
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.item.rating, 5);

  const itemResponse = await agent.get("/api/user-ratings/movie/550");
  assert.equal(itemResponse.status, 200);
  assert.equal(itemResponse.body.item.rating, 5);

  const invalidResponse = await agent.put("/api/user-ratings/movie/550").send({
    rating: 6,
  });

  assert.equal(invalidResponse.status, 400);
  assert.equal(invalidResponse.body.error.code, "INVALID_RATING");
});
