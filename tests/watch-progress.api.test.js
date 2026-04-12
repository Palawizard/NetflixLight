const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "netflixlight-watch-progress-")
);
const dbPath = path.join(tmpDir, "watch-progress-test.sqlite");

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_SECRET = "watch_progress_test_secret";

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

test("watch progress flow works for authenticated user", async () => {
  const passwordHash = await bcrypt.hash("password123", 4);

  db.prepare(
    `INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?);`
  ).run("progress@example.com", "progress-user", passwordHash);

  /** @type {import("supertest").Agent} */
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    email: "progress@example.com",
    password: "password123",
  });

  assert.equal(loginResponse.status, 200);

  const emptyResponse = await agent.get("/api/watch-progress");
  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(emptyResponse.body.items, []);

  const saveResponse = await agent.put("/api/watch-progress/movie/550").send({
    positionSeconds: 42,
    durationSeconds: 120,
    title: "Fight Club",
    poster: "/fight-club.jpg",
  });

  assert.equal(saveResponse.status, 200);
  assert.equal(saveResponse.body.item.tmdbId, 550);
  assert.equal(saveResponse.body.item.type, "movie");
  assert.equal(saveResponse.body.item.positionSeconds, 42);
  assert.equal(saveResponse.body.item.durationSeconds, 120);
  assert.equal(saveResponse.body.item.snapshot.title, "Fight Club");

  const itemResponse = await agent.get("/api/watch-progress/movie/550");
  assert.equal(itemResponse.status, 200);
  assert.equal(itemResponse.body.item.positionSeconds, 42);

  const completeResponse = await agent
    .put("/api/watch-progress/movie/550")
    .send({
      positionSeconds: 118,
      durationSeconds: 120,
      title: "Fight Club",
      poster: "/fight-club.jpg",
    });

  assert.equal(completeResponse.status, 204);

  const finalResponse = await agent.get("/api/watch-progress");
  assert.equal(finalResponse.status, 200);
  assert.deepEqual(finalResponse.body.items, []);
});
