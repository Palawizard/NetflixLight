# Data Access

This directory contains the SQLite persistence layer and repository modules used by the Express routes.

## Structure

- `sqlite/`: SQLite client, session store, and SQL migrations.
- `repositories/`: domain repositories for users, sessions, profiles, watchlist, watch progress, viewing history, and ratings.

The main schema is defined in `sqlite/migrations/001_create_tables.sql`. Runtime compatibility helpers live next to the repositories when older local databases need lightweight migration, for example profile-scoped user data.

Application routes should call repositories instead of issuing SQL directly.
