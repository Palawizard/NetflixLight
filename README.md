# NetflixLight

## Environment

Copy `.env.example` into `.env` and provide your TMDB credentials.

Available variables:

- `NODE_ENV`: `development` or `production`
- `PORT`: optional explicit port override
- `DEV_PORT`: default port used in development
- `PROD_PORT`: default port used in production
- `TMDB_API_BASE_URL`: TMDB API base URL
- `TMDB_API_KEY`: TMDB API key
- `TMDB_API_READ_ACCESS_TOKEN`: TMDB read access token
- `SQLITE_DB_PATH`: SQLite database file path

Port resolution order:

1. `PORT`
2. `DEV_PORT` when `NODE_ENV=development`
3. `PROD_PORT` when `NODE_ENV=production`

## Data Access

Chosen storage: `SQLite`

Chosen data-access layer: `Repository` pattern over a dedicated SQLite adapter.

Planned structure:

- `src/data-access/sqlite/`: low-level SQLite adapter and connection bootstrap
- `src/data-access/repositories/`: repository files by domain
- `data/netflixlight.sqlite`: local SQLite database file

Useful scripts:

- `npm run db:create`: create the local SQLite database file
- `npm run db:inspect`: inspect the configured SQLite database
