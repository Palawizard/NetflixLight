const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "netflixlight-profiles-"));
const dbPath = path.join(tmpDir, "profiles-test.sqlite");

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_SECRET = "profiles_test_secret";

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

test("profiles flow creates multiple profiles for one account", async () => {
  const passwordHash = await bcrypt.hash("password123", 4);

  db.prepare(
    `INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?);`
  ).run("profiles@example.com", "profiles-user", passwordHash);

  /** @type {import("supertest").Agent} */
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    email: "profiles@example.com",
    password: "password123",
  });

  assert.equal(loginResponse.status, 200);

  const initialResponse = await agent.get("/api/profiles");
  assert.equal(initialResponse.status, 200);
  assert.equal(initialResponse.body.items.length, 1);
  assert.equal(initialResponse.body.items[0].name, "profiles-user");

  const createResponse = await agent.post("/api/profiles").send({
    name: "Salon",
    avatarColor: "#123abc",
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.item.name, "Salon");
  assert.equal(createResponse.body.item.avatarColor, "#123abc");

  const duplicateResponse = await agent.post("/api/profiles").send({
    name: "Salon",
    avatarColor: "#123abc",
  });

  assert.equal(duplicateResponse.status, 409);
  assert.equal(duplicateResponse.body.error.code, "PROFILE_ALREADY_EXISTS");

  const listResponse = await agent.get("/api/profiles");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.length, 2);
});
