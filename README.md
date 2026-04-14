# Pala's NetflixLight

<p align="center">
  <strong>Express + vanilla JavaScript web app</strong> to browse movies and series, manage multiple profiles, and save personal watch data.
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-required-339933?logo=node.js&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.2-38B2AC?logo=tailwindcss&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-ISC-111827">
</p>

<p align="center">
  <a href="#project-goal">Goal</a> •
  <a href="#run-locally">Run Locally</a> •
  <a href="#main-routes">Routes</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a>
</p>

## Project Goal

This repository is a small "NetflixLight" school project implemented as an Express app with a vanilla JavaScript frontend.

It provides one UI to:

- browse popular movies and TV series
- search titles from TMDB
- open detailed pages with trailers, cast, and similar content
- create an account and manage multiple profiles
- save favorites, watch progress, viewing history, and personal ratings

The project uses:

- **TMDB** as the media data source
- **Express** for the backend API
- **SQLite** for local persistence
- **Tailwind CSS** for styling
- **vanilla JavaScript** for the frontend SPA behavior

## Run Locally

Prerequisites: Node.js, npm, and TMDB credentials.

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Initialize the SQLite database:

```bash
npm run db:setup
```

4. Start the app in development:

```bash
npm run dev
```

Open `http://localhost:3000` by default.

### Configuration (.env)

The server loads `.env`. Main variables:

```bash
NODE_ENV=development
PORT=
DEV_PORT=3000
PROD_PORT=8080

TMDB_API_BASE_URL=https://api.themoviedb.org/3
TMDB_API_KEY=your_tmdb_api_key
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_access_token
TMDB_CACHE_TTL_MS=30000
TMDB_CACHE_MAX_ENTRIES=500

SQLITE_DB_PATH=./data/netflixlight.sqlite

BCRYPT_SALT_ROUNDS=12

SESSION_SECRET=change_me_in_prod
SESSION_COOKIE_NAME=netflixlight.sid
SESSION_MAX_AGE_MS=86400000
```

Notes:

- `PORT` overrides `DEV_PORT` and `PROD_PORT`.
- TMDB credentials are required for catalog, search, discover, and detail endpoints.
- SQLite is used for auth, sessions, profiles, favorites, history, progress, and ratings.
- Sessions are persisted through a custom SQLite-backed `express-session` store.

## Main Routes

Frontend navigation uses **hash routes** from the SPA:

- `#/`: home page with hero, recommendations, and carousels.
- `#/movies`: movies page.
- `#/series`: series page.
- `#/search?q=...&page=...`: search page.
- `#/movie/{id}`: movie detail page.
- `#/tv/{id}`: TV show detail page.
- `#/favorites`: favorites page (requires login).
- `#/profile`: account and profiles page (requires login).
- `#/login`: login page.
- `#/register`: register page.

Backend API routes:

- `POST /api/auth/register`: create account.
- `POST /api/auth/login`: login.
- `GET /api/auth/me`: get current authenticated user.
- `POST /api/auth/logout`: logout.
- `GET /api/profiles`: list user profiles.
- `POST /api/profiles`: create profile.
- `GET /api/watchlist`: list favorites.
- `POST /api/watchlist`: add favorite.
- `DELETE /api/watchlist/:type/:id`: remove favorite.
- `GET /api/watch-progress`: list watch progress.
- `GET /api/watch-progress/:type/:id`: get progress for one title.
- `PUT /api/watch-progress/:type/:id`: save watch progress.
- `GET /api/viewing-history`: list recently viewed titles.
- `POST /api/viewing-history`: save viewed title.
- `GET /api/user-ratings`: list personal ratings.
- `GET /api/user-ratings/:type/:id`: get rating for one title.
- `PUT /api/user-ratings/:type/:id`: save personal rating.
- `DELETE /api/user-ratings/:type/:id`: remove rating.
- `GET /api/tmdb/trending`: trending media.
- `GET /api/tmdb/movies/popular`: popular movies.
- `GET /api/tmdb/movies/top-rated`: top rated movies.
- `GET /api/tmdb/tv/popular`: popular TV shows.
- `GET /api/tmdb/tv/top-rated`: top rated TV shows.
- `GET /api/tmdb/discover`: discover by genre.
- `GET /api/tmdb/search`: multi-search filtered to movie/tv.
- `GET /api/tmdb/:type/:id`: detailed TMDB payload with credits, videos, images, and similar titles.

## Features

- TMDB-powered catalog for movies and series.
- Search across movies and TV shows.
- Detail pages with:
  - synopsis
  - genres
  - release information
  - cast
  - similar titles
  - YouTube trailer

- Favorites/watchlist with persistent storage.
- Watch progress tracking.
- Viewing history.
- Personal rating system.
- Multi-profile support inside one account.
- Profile-scoped user data isolation.
- Language switcher (`fr` / `en`).
- Light and dark theme support.
- PWA basics:
  - manifest
  - service worker
  - installable icon

## Architecture

```text
netflixlight/
├── public/
│   ├── css/
│   │   └── app.css                  # compiled frontend stylesheet served to the browser
│   ├── js/
│   │   ├── app/
│   │   │   ├── catalog-controller.js       # loads TMDB catalog, search, hero, detail, and genre sections
│   │   │   ├── dom-events-controller.js    # centralizes click, input, submit, and keyboard event handlers
│   │   │   ├── preferences-controller.js   # manages theme, language, and stored genre preferences
│   │   │   ├── user-data-controller.js     # manages profiles, watchlist, ratings, history, and session-linked data
│   │   │   ├── user-data-keys.js           # shared key builders and helpers for user-data collections
│   │   │   └── watchlist-actions.js        # handles optimistic add/remove watchlist actions
│   │   ├── components/
│   │   │   ├── carousel.js          # reusable carousel renderer and drag/scroll behavior
│   │   │   ├── hero-player.js       # homepage hero trailer player behavior
│   │   │   ├── poster-card.js       # reusable poster card HTML renderer
│   │   │   └── youtube-player.js    # custom embedded YouTube player with controls
│   │   ├── config/
│   │   │   └── app-config.js        # frontend constants, route guards, genres, and app settings
│   │   ├── views/
│   │   │   ├── account-view.js              # renders favorites, account page, profiles, and history sections
│   │   │   ├── auth-view.js                 # renders login/register forms and auth feedback blocks
│   │   │   ├── catalog-sections.js          # renders home/movie/series catalog section blocks
│   │   │   ├── detail-related-sections.js   # renders cast and similar-content sections
│   │   │   ├── detail-view.js               # renders the main movie/series detail page
│   │   │   ├── search-view.js               # renders search results and pagination
│   │   │   └── view-utils.js                # shared frontend formatting and escaping helpers
│   │   ├── animations.js            # reveals sections with intersection-based animations
│   │   ├── api.js                   # frontend fetch wrapper, cache, and API error formatter
│   │   ├── app.js                   # frontend entrypoint, orchestration, routing, and rendering lifecycle
│   │   ├── i18n.js                  # frontend translation dictionary and runtime text translation
│   │   ├── router.js                # hash-based SPA router helpers
│   │   ├── shell.js                 # shared app shell, header, menu, search bar, and overlays
│   │   ├── state.js                 # global frontend state store and mutation helpers
│   │   ├── tmdb-images.js           # TMDB image URL and responsive image helpers
│   │   └── views.js                 # maps routes to page renderers and builds main pages
│   ├── index.html                   # SPA HTML shell loaded by the browser
│   └── sw.js                        # service worker for basic shell caching
├── scripts/
│   ├── db-inspect.js                # small utility to inspect the configured SQLite database
│   └── db-setup.js                  # initializes the SQLite database from the main migration
├── src/
│   ├── clients/
│   │   └── tmdb.client.js           # backend TMDB client with auth, timeout, error mapping, and cache
│   ├── config/
│   │   └── env.js                   # parses environment variables into one central config object
│   ├── data-access/
│   │   ├── repositories/
│   │   │   ├── profile.repository.js         # profile queries and default-profile creation
│   │   │   ├── profile-scoped-tables.js      # runtime schema migration helpers for profile-scoped tables
│   │   │   ├── session.repository.js         # token-based session lookup and deletion helpers
│   │   │   ├── user.repository.js            # user lookup and user creation queries
│   │   │   ├── user-rating.repository.js     # CRUD access for personal ratings
│   │   │   ├── viewing-history.repository.js # CRUD access for viewing history
│   │   │   ├── watchlist.repository.js       # CRUD access for watchlist items
│   │   │   └── watch-progress.repository.js  # CRUD access for watch progress entries
│   │   └── sqlite/
│   │       ├── migrations/
│   │       │   └── 001_create_tables.sql     # main SQL schema migration
│   │       ├── client.js                     # shared better-sqlite3 connection
│   │       └── session-store.js              # SQLite-backed express-session store
│   ├── middlewares/
│   │   ├── active-profile.middleware.js      # resolves and validates the active profile from requests
│   │   ├── api-error.middleware.js           # API 404 handler and centralized error serializer
│   │   ├── api-logger.middleware.js          # request logger for API calls
│   │   └── require-auth.middleware.js        # blocks unauthenticated API access
│   ├── models/
│   │   ├── profile.model.js          # maps DB rows to profile objects
│   │   ├── user-rating.model.js      # maps DB rows to rating objects
│   │   ├── viewing-history-item.model.js  # maps DB rows to viewing-history objects
│   │   ├── watchlist-item.model.js   # maps DB rows to watchlist objects
│   │   └── watch-progress.model.js   # maps DB rows to progress objects
│   ├── routes/
│   │   ├── auth.routes.js            # register, login, me, and logout endpoints
│   │   ├── profiles.routes.js        # profile listing and creation endpoints
│   │   ├── tmdb.routes.js            # main TMDB proxy endpoints for trending, search, discover, and detail
│   │   ├── tmdb-movies.routes.js     # movie-specific TMDB endpoints
│   │   ├── tmdb-query.utils.js       # shared TMDB query validation helpers
│   │   ├── tmdb-tv.routes.js         # TV-specific TMDB endpoints
│   │   ├── user-ratings.routes.js    # personal rating API endpoints
│   │   ├── viewing-history.routes.js # viewing history API endpoints
│   │   ├── watchlist.routes.js       # watchlist API endpoints
│   │   └── watch-progress.routes.js  # watch progress API endpoints
│   ├── styles/
│   │   └── app.css                   # Tailwind source stylesheet and custom theme rules
│   └── utils/
│       └── api-error.js              # structured API error class and helper factory
├── tests/
│   ├── profiles.api.test.js          # tests profile creation/listing flow
│   ├── profile-scoped-data.api.test.js # tests isolation of data between profiles
│   ├── session-store.test.js         # tests custom SQLite session store behavior
│   ├── user-ratings.api.test.js      # tests rating endpoints
│   ├── viewing-history.api.test.js   # tests viewing history endpoints
│   ├── watchlist.api.test.js         # tests watchlist endpoints
│   └── watch-progress.api.test.js    # tests watch progress endpoints
├── code-tree.sh                      # utility script to print the project tree
├── eslint.config.js                  # ESLint configuration
├── jsconfig.json                     # JS tooling and editor configuration
├── package.json                      # project metadata, scripts, dependencies, and dev dependencies
├── package-lock.json                 # locked dependency versions
├── prettier.config.mjs               # Prettier configuration
└── server.js                         # Express server entrypoint and app wiring
```

## Useful Commands

- Development server + Tailwind watch: `npm run dev`
- Development server only: `npm run dev:server`
- Production server: `npm start`
- Build CSS: `npm run build:css`
- Initialize DB: `npm run db:setup`
- Inspect DB: `npm run db:inspect`
- Lint: `npm run lint`
- Auto-fix lint issues: `npm run lint:fix`
- Format files: `npm run format`
- Run tests: `npm test`

```

```
