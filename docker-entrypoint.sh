#!/bin/sh
set -e

# initialize the sqlite database if it does not exist yet
if [ ! -f "$SQLITE_DB_PATH" ]; then
  echo "database not found at $SQLITE_DB_PATH, running db:setup..."
  node ./scripts/db-setup.js
fi

exec node server.js
