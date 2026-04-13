const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "netflixlight-profile-scoped-data-")
);
const dbPath = path.join(tmpDir, "profile-scoped-data-test.sqlite");

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_SECRET = "profile_scoped_data_test_secret";

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

test("profile-scoped data stays isolated within one account", async () => {
  const passwordHash = await bcrypt.hash("password123", 4);

  db.prepare(
    `INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?);`
  ).run("profiles-data@example.com", "profiles-data-user", passwordHash);

  /** @type {import("supertest").Agent} */
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    email: "profiles-data@example.com",
    password: "password123",
  });

  assert.equal(loginResponse.status, 200);

  const initialProfilesResponse = await agent.get("/api/profiles");
  assert.equal(initialProfilesResponse.status, 200);
  const defaultProfileId = initialProfilesResponse.body.items[0].id;

  const childProfileResponse = await agent.post("/api/profiles").send({
    name: "Enfant",
    avatarColor: "#38bdf8",
  });
  assert.equal(childProfileResponse.status, 201);
  const childProfileId = childProfileResponse.body.item.id;

  await agent
    .post("/api/watchlist")
    .set("X-Profile-Id", String(defaultProfileId))
    .send({
      tmdbId: 550,
      type: "movie",
      title: "Fight Club",
      poster: "/fight-club.jpg",
    })
    .expect(201);

  const childInitialWatchlistResponse = await agent
    .get("/api/watchlist")
    .set("X-Profile-Id", String(childProfileId));

  assert.equal(childInitialWatchlistResponse.status, 200);
  assert.deepEqual(childInitialWatchlistResponse.body.items, []);

  await agent
    .post("/api/watchlist")
    .set("X-Profile-Id", String(childProfileId))
    .send({
      tmdbId: 551,
      type: "movie",
      title: "The Kids Are All Right",
      poster: "/kids.jpg",
    })
    .expect(201);

  const defaultWatchlistResponse = await agent
    .get("/api/watchlist")
    .set("X-Profile-Id", String(defaultProfileId));
  assert.equal(defaultWatchlistResponse.body.items.length, 1);
  assert.equal(defaultWatchlistResponse.body.items[0].tmdbId, 550);

  await agent
    .put("/api/watch-progress/movie/550")
    .set("X-Profile-Id", String(defaultProfileId))
    .send({
      positionSeconds: 42,
      durationSeconds: 120,
      title: "Fight Club",
      poster: "/fight-club.jpg",
    })
    .expect(200);

  await agent
    .put("/api/watch-progress/movie/550")
    .set("X-Profile-Id", String(childProfileId))
    .send({
      positionSeconds: 12,
      durationSeconds: 120,
      title: "Fight Club",
      poster: "/fight-club.jpg",
    })
    .expect(200);

  const childProgressResponse = await agent
    .get("/api/watch-progress/movie/550")
    .set("X-Profile-Id", String(childProfileId));
  assert.equal(childProgressResponse.body.item.positionSeconds, 12);

  await agent
    .post("/api/viewing-history")
    .set("X-Profile-Id", String(defaultProfileId))
    .send({
      type: "movie",
      tmdbId: 550,
      title: "Fight Club",
      poster: "/fight-club.jpg",
    })
    .expect(201);

  const childHistoryResponse = await agent
    .get("/api/viewing-history")
    .set("X-Profile-Id", String(childProfileId));
  assert.deepEqual(childHistoryResponse.body.items, []);

  await agent
    .put("/api/user-ratings/movie/550")
    .set("X-Profile-Id", String(defaultProfileId))
    .send({ rating: 4 })
    .expect(200);

  await agent
    .put("/api/user-ratings/movie/550")
    .set("X-Profile-Id", String(childProfileId))
    .send({ rating: 2 })
    .expect(200);

  const defaultRatingResponse = await agent
    .get("/api/user-ratings/movie/550")
    .set("X-Profile-Id", String(defaultProfileId));
  const childRatingResponse = await agent
    .get("/api/user-ratings/movie/550")
    .set("X-Profile-Id", String(childProfileId));

  assert.equal(defaultRatingResponse.body.item.rating, 4);
  assert.equal(childRatingResponse.body.item.rating, 2);
});
