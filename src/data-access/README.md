# Data Access

This project uses:

- `SQLite` as the persistence layer
- `better-sqlite3` as the SQLite driver
- a `Repository` layer as the application-facing data-access abstraction

Directory intent:

- `sqlite/`: SQLite-specific connection and adapter code
- `repositories/`: domain repositories such as users, movies, or favorites

No tables or repository implementations are defined yet.
