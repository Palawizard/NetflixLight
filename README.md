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
  <a href="#routes">Routes</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#useful-commands">Commands</a>
</p>

## Project Goal

Netflix-inspired app built with an Express backend and a vanilla JavaScript SPA frontend.

It lets users:

- browse popular movies and TV series by genre and by category
- search titles from TMDB
- open detail pages with trailers, cast, similar content, and personal ratings
- create an account and manage multiple profiles on the same account
- save favorites, watch progress, viewing history, and personal ratings per profile

Stack:

- **TMDB** - media data source
- **Express 5** - backend API
- **SQLite** via `better-sqlite3` - local persistence
- **Tailwind CSS 4** - styling
- **Vanilla JavaScript** - frontend SPA (no framework)

## Run Locally

Prerequisites: Node.js, npm, a TMDB API key or read access token.

```bash
# 1 - install dependencies
npm install

# 2 - create your environment file and fill in your TMDB credentials
cp .env.example .env

# 3 - initialize the SQLite database
npm run db:setup

# 4 - start the dev server + Tailwind watcher
npm run dev
```

Opens at `http://localhost:3000` by default.

### Configuration (.env)

```bash
NODE_ENV=development
PORT=                          # overrides DEV_PORT / PROD_PORT when set
DEV_PORT=3000
PROD_PORT=8080

TMDB_API_BASE_URL=https://api.themoviedb.org/3   # optional - has a default
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

- `TMDB_API_READ_ACCESS_TOKEN` is preferred (Bearer auth). `TMDB_API_KEY` is the fallback.
- Both are optional at startup but the catalog, search, and detail pages will not work without one of them.
- Sessions are persisted through a custom SQLite-backed `express-session` store.

## Routes

### Frontend (SPA hash routes)

| Path                      | Page                                    | Auth required |
| ------------------------- | --------------------------------------- | ------------- |
| `#/`                      | Home - hero, carousels, recommendations | no            |
| `#/movies`                | Movies - popular + genre carousels      | no            |
| `#/series`                | Series - popular + genre carousels      | no            |
| `#/search?q=...&page=...` | Search results                          | no            |
| `#/movie/:id`             | Movie detail page                       | no            |
| `#/tv/:id`                | TV show detail page                     | no            |
| `#/favorites`             | Saved titles (watchlist)                | yes           |
| `#/profile`               | Account, profiles, history, ratings     | yes           |
| `#/login`                 | Login                                   | no            |
| `#/register`              | Register                                | no            |

Direct paths like `/movies`, `/series`, `/search`, `/favorites`, `/profile` are served by the Express server and redirect to their `/#/...` equivalents.

### Backend API

**Auth** - `/api/auth`

| Method | Path        | Description      |
| ------ | ----------- | ---------------- |
| `POST` | `/register` | create account   |
| `POST` | `/login`    | login            |
| `GET`  | `/me`       | get current user |
| `POST` | `/logout`   | logout           |

**Profiles** - `/api/profiles` - requires auth

| Method | Path | Description    |
| ------ | ---- | -------------- |
| `GET`  | `/`  | list profiles  |
| `POST` | `/`  | create profile |

**Watchlist** - `/api/watchlist` - requires auth + active profile

| Method   | Path         | Description     |
| -------- | ------------ | --------------- |
| `GET`    | `/`          | list favorites  |
| `POST`   | `/`          | add favorite    |
| `DELETE` | `/:type/:id` | remove favorite |

**Watch progress** - `/api/watch-progress` - requires auth + active profile

| Method | Path         | Description                |
| ------ | ------------ | -------------------------- |
| `GET`  | `/`          | list all progress entries  |
| `GET`  | `/:type/:id` | get progress for one title |
| `PUT`  | `/:type/:id` | save progress              |

**Viewing history** - `/api/viewing-history` - requires auth + active profile

| Method | Path | Description                 |
| ------ | ---- | --------------------------- |
| `GET`  | `/`  | list recently viewed titles |
| `POST` | `/`  | record a viewed title       |

**Personal ratings** - `/api/user-ratings` - requires auth + active profile

| Method   | Path         | Description              |
| -------- | ------------ | ------------------------ |
| `GET`    | `/`          | list all ratings         |
| `GET`    | `/:type/:id` | get rating for one title |
| `PUT`    | `/:type/:id` | save rating (1–5)        |
| `DELETE` | `/:type/:id` | remove rating            |

**TMDB proxy** - `/api/tmdb` - public

| Method | Path                | Description                                       |
| ------ | ------------------- | ------------------------------------------------- |
| `GET`  | `/trending`         | trending media (weekly)                           |
| `GET`  | `/movies/popular`   | popular movies                                    |
| `GET`  | `/movies/top-rated` | top rated movies                                  |
| `GET`  | `/tv/popular`       | popular TV shows                                  |
| `GET`  | `/tv/top-rated`     | top rated TV shows                                |
| `GET`  | `/discover`         | discover by type and genre                        |
| `GET`  | `/search`           | multi-search filtered to movie/tv                 |
| `GET`  | `/:type/:id`        | detail payload - credits, videos, images, similar |

## Features

- TMDB-powered catalog for movies and series, browsable by genre
- Global search with debounce, pagination, and focus preservation while typing
- Detail pages with synopsis, genres, release info, runtime/seasons, cast (linked to Wikipedia), similar titles, YouTube trailer, and personal rating
- Favorites/watchlist with optimistic UI
- Watch progress tracking per profile
- Viewing history per profile
- Personal rating system (1–5 stars) per profile
- Multi-profile support - each account can have several named profiles
- Profile-scoped data isolation - watchlist, history, progress, and ratings are per profile
- Genre-based recommendations on the home page based on viewing history
- Language switcher (FR / EN)
- Light and dark theme with system preference detection
- PWA - manifest, service worker with shell caching, installable

## Architecture

```text
netflixlight/
├── public/
│   ├── css/
│   │   └── app.css                  # compiled Tailwind stylesheet
│   ├── icons/
│   │   └── icon.svg                 # PWA app icon
│   ├── js/
│   │   ├── app/
│   │   │   ├── catalog-controller.js       # loads catalog, search, hero, detail, and genre sections
│   │   │   ├── dom-events-controller.js    # centralizes click, input, submit, and keyboard handlers
│   │   │   ├── preferences-controller.js   # manages theme, language, and stored genre preferences
│   │   │   ├── user-data-controller.js     # manages profiles, watchlist, ratings, history, and auth
│   │   │   ├── user-data-keys.js           # shared key builders for user-data collections
│   │   │   └── watchlist-actions.js        # handles optimistic watchlist add/remove
│   │   ├── components/
│   │   │   ├── carousel.js          # carousel renderer and scroll behavior
│   │   │   ├── hero-player.js       # home hero trailer autoplay behavior
│   │   │   ├── poster-card.js       # poster card HTML renderer
│   │   │   └── youtube-player.js    # embedded YouTube player with custom controls
│   │   ├── config/
│   │   │   └── app-config.js        # route guards, genre IDs, section config, and app constants
│   │   ├── views/
│   │   │   ├── account-view.js              # favorites, account, profiles, and history pages
│   │   │   ├── auth-view.js                 # login and register forms
│   │   │   ├── catalog-sections.js          # catalog section blocks and skeletons
│   │   │   ├── detail-related-sections.js   # cast grid and similar titles carousel
│   │   │   ├── detail-view.js               # movie/series detail page
│   │   │   ├── search-view.js               # search results and pagination
│   │   │   └── view-utils.js                # shared formatting and escaping helpers
│   │   ├── animations.js            # intersection-based reveal animations
│   │   ├── api.js                   # fetch wrapper with 60s cache and error formatter
│   │   ├── app.js                   # entry point - orchestration, routing, and render lifecycle
│   │   ├── i18n.js                  # FR/EN translation dictionary and runtime translator
│   │   ├── router.js                # hash-based SPA router
│   │   ├── shell.js                 # app shell, header, menu, search bar, and overlays
│   │   ├── state.js                 # global state store and mutation helpers
│   │   ├── tmdb-images.js           # TMDB image URL builder and responsive srcset helpers
│   │   └── views.js                 # route-to-renderer map and page builders
│   ├── index.html                   # SPA HTML shell
│   ├── manifest.webmanifest         # PWA manifest
│   └── sw.js                        # service worker - shell caching with cache-first strategy
├── scripts/
│   ├── db-inspect.js                # prints the DB path and table list
│   └── db-setup.js                  # runs the SQL migration to initialize the database
├── src/
│   ├── clients/
│   │   └── tmdb.client.js           # TMDB HTTP client with auth, TTL cache, and error mapping
│   ├── config/
│   │   └── env.js                   # parses all env variables into one central config object
│   ├── data-access/
│   │   ├── repositories/
│   │   │   ├── profile.repository.js         # profile CRUD
│   │   │   ├── profile-scoped-tables.js      # runtime schema helpers for profile-scoped tables
│   │   │   ├── session.repository.js         # session lookup and deletion
│   │   │   ├── user.repository.js            # user lookup and creation
│   │   │   ├── user-rating.repository.js     # personal ratings CRUD
│   │   │   ├── viewing-history.repository.js # viewing history CRUD
│   │   │   ├── watchlist.repository.js       # watchlist CRUD
│   │   │   └── watch-progress.repository.js  # watch progress CRUD
│   │   └── sqlite/
│   │       ├── migrations/
│   │       │   └── 001_create_tables.sql     # full DB schema
│   │       ├── client.js                     # shared better-sqlite3 connection
│   │       └── session-store.js              # SQLite-backed express-session store
│   ├── middlewares/
│   │   ├── active-profile.middleware.js      # resolves active profile from X-Profile-Id header
│   │   ├── api-error.middleware.js           # 404 handler and centralized error serializer
│   │   ├── api-logger.middleware.js          # logs incoming API requests
│   │   └── require-auth.middleware.js        # rejects unauthenticated requests with 401
│   ├── models/
│   │   ├── profile.model.js                  # maps DB rows to profile objects
│   │   ├── user-rating.model.js              # maps DB rows to rating objects
│   │   ├── viewing-history-item.model.js     # maps DB rows to history objects
│   │   ├── watchlist-item.model.js           # maps DB rows to watchlist objects
│   │   └── watch-progress.model.js           # maps DB rows to progress objects
│   ├── routes/
│   │   ├── auth.routes.js            # register, login, me, logout
│   │   ├── profiles.routes.js        # profile list and create
│   │   ├── tmdb.routes.js            # trending, search, discover, detail
│   │   ├── tmdb-movies.routes.js     # popular and top-rated movies
│   │   ├── tmdb-query.utils.js       # shared query param validators
│   │   ├── tmdb-tv.routes.js         # popular and top-rated TV
│   │   ├── user-ratings.routes.js    # ratings CRUD
│   │   ├── viewing-history.routes.js # history list and record
│   │   ├── watchlist.routes.js       # watchlist CRUD
│   │   └── watch-progress.routes.js  # progress get and save
│   ├── styles/
│   │   └── app.css                   # Tailwind source + custom theme variables
│   └── utils/
│       └── api-error.js              # ApiError class and factory helper
├── code-tree.sh                      # prints the project file tree
├── docker-entrypoint.sh              # container init - runs db:setup on first boot then starts the server
├── Dockerfile                        # production image - node:22-alpine, builds CSS, prunes devDeps
├── eslint.config.js                  # ESLint config
├── jsconfig.json                     # editor/tooling JS config
├── package.json                      # scripts, dependencies, dev dependencies
├── package-lock.json                 # locked dependency versions
├── prettier.config.mjs               # Prettier config
└── server.js                         # Express app wiring and server entry point
```

## Useful Commands

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `npm run dev`        | Dev server + Tailwind watcher  |
| `npm run dev:server` | Dev server only                |
| `npm start`          | Production server              |
| `npm run build:css`  | Compile Tailwind once          |
| `npm run watch:css`  | Watch and recompile Tailwind   |
| `npm run db:setup`   | Initialize the SQLite database |
| `npm run db:inspect` | Print DB path and table list   |
| `npm run lint`       | ESLint + Prettier check        |
| `npm run lint:fix`   | Auto-fix ESLint issues         |
| `npm run format`     | Prettier format all files      |
