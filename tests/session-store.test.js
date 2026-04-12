const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "netflixlight-session-"));
const dbPath = path.join(tmpDir, "session-test.sqlite");

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_SECRET = "session_store_test_secret";

const {
  SqliteSessionStore,
} = require("../src/data-access/sqlite/session-store");
const appDb = require("../src/data-access/sqlite/client");

test.after(() => {
  appDb.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function getSession(store, sid) {
  return new Promise((resolve, reject) => {
    store.get(sid, (error, sessionValue) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(sessionValue);
    });
  });
}

function setSession(store, sid, sessionValue) {
  return new Promise((resolve, reject) => {
    store.set(sid, sessionValue, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

test("sqlite session store persists sessions across store instances", async () => {
  const sid = "persistent-session-id";
  const sessionValue = {
    cookie: {
      expires: new Date(Date.now() + 60_000).toISOString(),
      httpOnly: true,
    },
    user: {
      id: 1,
      email: "session@example.com",
      username: "session-user",
    },
  };

  const firstStore = new SqliteSessionStore({ ttlMs: 60_000 });
  await setSession(firstStore, sid, sessionValue);

  const secondStore = new SqliteSessionStore({ ttlMs: 60_000 });
  const persistedSession = await getSession(secondStore, sid);

  assert.deepEqual(persistedSession.user, sessionValue.user);
});

test("sqlite session store ignores expired sessions", async () => {
  const sid = "expired-session-id";
  const store = new SqliteSessionStore({ ttlMs: 60_000 });

  await setSession(store, sid, {
    cookie: {
      expires: new Date(Date.now() - 60_000).toISOString(),
      httpOnly: true,
    },
    user: {
      id: 2,
      email: "expired@example.com",
      username: "expired-user",
    },
  });

  const expiredSession = await getSession(store, sid);

  assert.equal(expiredSession, null);
});
