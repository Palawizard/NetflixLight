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

Port resolution order:

1. `PORT`
2. `DEV_PORT` when `NODE_ENV=development`
3. `PROD_PORT` when `NODE_ENV=production`
