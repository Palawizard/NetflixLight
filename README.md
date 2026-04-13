# NetflixLight

NetflixLight est une application web vanilla JavaScript qui reproduit une partie de l'expérience Netflix pour un projet de cours : exploration TMDB, fiches détails, lecteur vidéo, favoris, progression de lecture, historique, notes personnelles, profils et PWA basique.

Le backend est une API Express en CommonJS avec une base SQLite locale. Le frontend reste volontairement sans framework : pages HTML statiques, modules JavaScript dans `public/js/`, et styles Tailwind compilés depuis `src/styles/app.css`.

## Installation

Prérequis :

- Node.js récent
- npm
- Un compte TMDB avec clé API et Read Access Token

Installation locale :

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

En développement, l'application démarre par défaut sur `http://localhost:3000` si `DEV_PORT=3000`.

Scripts utiles :

- `npm run dev` : lance Express avec `nodemon` et Tailwind en mode watch.
- `npm run start:dev` : lance le serveur une seule fois en mode développement.
- `npm run start` : lance le serveur en production.
- `npm run build:css` : compile `src/styles/app.css` vers `public/css/app.css`.
- `npm run db:setup` : crée la base SQLite et applique la migration principale.
- `npm run db:inspect` : affiche la base SQLite configurée.
- `npm run lint` : lance ESLint puis Prettier en vérification.
- `npm run format` : reformate les fichiers avec Prettier.
- `npm test` : lance tous les tests API Node.
- `npm run test:watchlist` : lance le test API watchlist.

Tests API complémentaires :

```bash
node --test tests/watch-progress.api.test.js
node --test tests/viewing-history.api.test.js
node --test tests/user-ratings.api.test.js
node --test tests/profiles.api.test.js
node --test tests/profile-scoped-data.api.test.js
```

## Configuration

Copier `.env.example` vers `.env`, puis renseigner les variables TMDB et session.

Variables principales :

- `NODE_ENV` : `development` ou `production`.
- `PORT` : port explicite, prioritaire sur `DEV_PORT` et `PROD_PORT`.
- `DEV_PORT` : port par défaut en développement.
- `PROD_PORT` : port par défaut en production.
- `TMDB_API_BASE_URL` : URL de base TMDB, par défaut `https://api.themoviedb.org/3`.
- `TMDB_API_KEY` : clé API TMDB.
- `TMDB_API_READ_ACCESS_TOKEN` : token Bearer TMDB.
- `TMDB_CACHE_TTL_MS` : durée de cache backend TMDB.
- `TMDB_CACHE_MAX_ENTRIES` : nombre maximal d'entrées du cache TMDB.
- `SQLITE_DB_PATH` : chemin du fichier SQLite, par défaut `./data/netflixlight.sqlite`.
- `BCRYPT_SALT_ROUNDS` : coût bcrypt pour les mots de passe.
- `SESSION_SECRET` : secret de session Express.
- `SESSION_COOKIE_NAME` : nom du cookie de session.
- `SESSION_MAX_AGE_MS` : durée de vie du cookie de session.

Ordre de résolution du port :

1. `PORT`
2. `DEV_PORT` quand `NODE_ENV=development`
3. `PROD_PORT` quand `NODE_ENV=production`

## Configuration TMDB

Le serveur appelle TMDB via `src/clients/tmdb.client.js`. Il utilise prioritairement `TMDB_API_READ_ACCESS_TOKEN` en Bearer token, avec les paramètres et le cache configurés dans `src/config/env.js`.

Endpoints TMDB utilisés côté backend :

- Tendances : `/trending/{media_type}/{time_window}`
- Films populaires : `/movie/popular`
- Films mieux notés : `/movie/top_rated`
- Séries populaires : `/tv/popular`
- Séries mieux notées : `/tv/top_rated`
- Découverte par genre : `/discover/{movie|tv}`
- Recherche multi : `/search/multi`
- Détail film/série : `/{movie|tv}/{id}` avec `credits,similar,images,videos`

Si `TMDB_API_KEY` ou `TMDB_API_READ_ACCESS_TOKEN` est manquant, le serveur affiche un warning au démarrage.

## Architecture

Structure principale :

- `server.js` : point d'entrée Express, middleware session, routes API et fichiers statiques.
- `public/` : frontend servi directement par Express.
- `public/index.html` : shell principal de l'application SPA.
- `public/js/app.js` : orchestration frontend, état applicatif, appels API et handlers.
- `public/js/app/` : contrôleurs frontend par domaine (catalogue, préférences, données utilisateur, événements DOM).
- `public/js/views.js` : rendu HTML des vues.
- `public/js/components/` : composants vanilla JS réutilisables.
- `public/manifest.webmanifest` et `public/sw.js` : PWA basique.
- `src/config/env.js` : parsing centralisé de la configuration.
- `src/routes/` : routes API Express.
- `src/clients/tmdb.client.js` : client HTTP TMDB avec cache.
- `src/data-access/sqlite/` : client SQLite et migration.
- `src/data-access/repositories/` : accès aux données par domaine.
- `src/models/` : mapping des lignes SQL vers objets API.
- `tests/` : tests API Node `node:test` + `supertest`.

Choix techniques :

- Frontend 100% vanilla JS, sans framework ni moteur de template serveur.
- Express + sessions cookie HTTP-only pour l'authentification web.
- SQLite avec `better-sqlite3` pour une base locale simple à versionner par migration.
- Repository pattern pour isoler SQL et logique route.
- TMDB proxyfié par le backend pour centraliser les clés, la validation et le cache.
- Tailwind CSS v4 compilé depuis `src/styles/app.css`.
- PWA minimaliste : manifest, icône SVG, service worker avec cache du shell statique.

## Base De Données

La migration principale se trouve dans `src/data-access/sqlite/migrations/001_create_tables.sql`.

Tables principales :

- `users` : comptes utilisateurs.
- `sessions` : ancienne table de session token, conservée côté repository.
- `watchlist_items` : favoris par profil avec snapshot titre/poster.
- `watch_progress` : progression vidéo par profil et contenu.
- `viewing_history` : derniers contenus consultés par profil.
- `user_ratings` : notes personnelles 1-5 par profil.
- `profiles` : profils d'un même compte.
- `favorites` et `video_sources` : tables historiques/conservées.

## Frontend

Routes frontend gérées par le router vanilla :

- `/` : accueil, hero, carrousels, recommandations et “Continuer à regarder”.
- `/films` : page films.
- `/recherche?q=...&page=...` : résultats mixtes films/séries.
- `/movie/:id` et `/tv/:id` : pages détail.
- `/lecture/:type/:id` : lecteur vidéo.
- `/favoris` : watchlist, protégée par connexion.
- `/profil` : compte, profils et historique, protégée par connexion.
- `/login` et `/register` : authentification.

Le choix du thème et le profil actif sont persistés dans `localStorage`. Les données de visionnage comme favoris, progression, historique et notes sont isolées par profil puis persistées côté SQLite.

## API Backend

Toutes les réponses d'erreur API suivent le format :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message lisible",
    "details": ["Détail optionnel"]
  }
}
```

Les routes protégées nécessitent une session valide créée via `POST /api/auth/login`. La session est stockée dans le cookie HTTP-only `netflixlight.sid` par défaut.

Les routes de données personnelles (`watchlist`, progression, historique, notes) utilisent le profil actif. Le frontend envoie `X-Profile-Id` avec l'identifiant du profil sélectionné ; si l'en-tête est absent, le serveur utilise le profil principal du compte.

### Auth

`POST /api/auth/register`

- Body : `email`, `username`, `password`
- Succès : `201`

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","username":"demo","password":"password123"}'
```

Réponse :

```json
{
  "user": {
    "id": 1,
    "email": "demo@example.com",
    "username": "demo",
    "created_at": "2026-04-12 10:00:00"
  }
}
```

`POST /api/auth/login`

- Body : `email`, `password`
- Succès : `200`, crée la session cookie

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'
```

`GET /api/auth/me`

- Auth requise
- Succès : `200`

```bash
curl http://localhost:3000/api/auth/me -b "netflixlight.sid=<cookie>"
```

`POST /api/auth/logout`

- Auth requise via session cookie ou Bearer token historique
- Succès : `204`

### TMDB

`GET /api/tmdb/trending`

- Query : `media_type=all|movie|tv|person`, `time_window=day|week`, `page`, `language`

```bash
curl "http://localhost:3000/api/tmdb/trending?media_type=all&time_window=week&page=1&language=fr-FR"
```

`GET /api/tmdb/movies/popular`

- Query : `page`, `language`

```bash
curl "http://localhost:3000/api/tmdb/movies/popular?page=1&language=fr-FR"
```

`GET /api/tmdb/movies/top-rated`

- Query : `page`, `language`

```bash
curl "http://localhost:3000/api/tmdb/movies/top-rated?page=1&language=fr-FR"
```

`GET /api/tmdb/tv/popular`

- Query : `page`, `language`

```bash
curl "http://localhost:3000/api/tmdb/tv/popular?page=1&language=fr-FR"
```

`GET /api/tmdb/tv/top-rated`

- Query : `page`, `language`

```bash
curl "http://localhost:3000/api/tmdb/tv/top-rated?page=1&language=fr-FR"
```

`GET /api/tmdb/discover`

- Query obligatoire : `type=movie|tv`, `genre=<id>`
- Query optionnelle : `page`, `language`

```bash
curl "http://localhost:3000/api/tmdb/discover?type=movie&genre=28&page=1&language=fr-FR"
```

`GET /api/tmdb/search`

- Query obligatoire : `q`
- Query optionnelle : `page`, `language`
- Retourne uniquement les résultats `movie` et `tv`

```bash
curl "http://localhost:3000/api/tmdb/search?q=matrix&page=1&language=fr-FR"
```

`GET /api/tmdb/:type/:id`

- Params : `type=movie|tv`, `id=<tmdb id>`
- Query : `language`
- Inclut `credits`, `similar`, `images`, `videos`

```bash
curl "http://localhost:3000/api/tmdb/movie/550?language=fr-FR"
```

### Watchlist

`GET /api/watchlist`

- Auth requise
- Succès : `200`

```bash
curl http://localhost:3000/api/watchlist -b "netflixlight.sid=<cookie>"
```

`POST /api/watchlist`

- Auth requise
- Body : `type=movie|tv`, `tmdbId`, `title`, `poster`
- Succès : `201`

```bash
curl -X POST http://localhost:3000/api/watchlist \
  -H "Content-Type: application/json" \
  -b "netflixlight.sid=<cookie>" \
  -d '{"type":"movie","tmdbId":550,"title":"Fight Club","poster":"/poster.jpg"}'
```

`DELETE /api/watchlist/:type/:id`

- Auth requise
- Params : `type=movie|tv`, `id=<tmdb id>`
- Succès : `204`

```bash
curl -X DELETE http://localhost:3000/api/watchlist/movie/550 -b "netflixlight.sid=<cookie>"
```

### Watch Progress

`GET /api/watch-progress`

- Auth requise
- Retourne les 12 progressions les plus récentes

```bash
curl http://localhost:3000/api/watch-progress -b "netflixlight.sid=<cookie>"
```

`GET /api/watch-progress/:type/:id`

- Auth requise
- Params : `type=movie|tv`, `id=<tmdb id>`

```bash
curl http://localhost:3000/api/watch-progress/movie/550 -b "netflixlight.sid=<cookie>"
```

`PUT /api/watch-progress/:type/:id`

- Auth requise
- Body : `positionSeconds`, `durationSeconds`, `title`, `poster`
- Succès : `200`
- Si la position est proche de la fin (`durationSeconds - 3`), la progression est supprimée et la réponse est `204`

```bash
curl -X PUT http://localhost:3000/api/watch-progress/movie/550 \
  -H "Content-Type: application/json" \
  -b "netflixlight.sid=<cookie>" \
  -d '{"positionSeconds":42,"durationSeconds":120,"title":"Fight Club","poster":"/poster.jpg"}'
```

### Viewing History

`GET /api/viewing-history`

- Auth requise
- Retourne les 12 derniers contenus consultés

```bash
curl http://localhost:3000/api/viewing-history -b "netflixlight.sid=<cookie>"
```

`POST /api/viewing-history`

- Auth requise
- Body : `type=movie|tv`, `tmdbId`, `title`, `poster`
- Succès : `201`

```bash
curl -X POST http://localhost:3000/api/viewing-history \
  -H "Content-Type: application/json" \
  -b "netflixlight.sid=<cookie>" \
  -d '{"type":"movie","tmdbId":550,"title":"Fight Club","poster":"/poster.jpg"}'
```

### User Ratings

`GET /api/user-ratings`

- Auth requise

```bash
curl http://localhost:3000/api/user-ratings -b "netflixlight.sid=<cookie>"
```

`GET /api/user-ratings/:type/:id`

- Auth requise
- Params : `type=movie|tv`, `id=<tmdb id>`

```bash
curl http://localhost:3000/api/user-ratings/movie/550 -b "netflixlight.sid=<cookie>"
```

`PUT /api/user-ratings/:type/:id`

- Auth requise
- Body : `rating` entier entre `1` et `5`

```bash
curl -X PUT http://localhost:3000/api/user-ratings/movie/550 \
  -H "Content-Type: application/json" \
  -b "netflixlight.sid=<cookie>" \
  -d '{"rating":5}'
```

`DELETE /api/user-ratings/:type/:id`

- Auth requise
- Succès : `204`

```bash
curl -X DELETE http://localhost:3000/api/user-ratings/movie/550 -b "netflixlight.sid=<cookie>"
```

### Profiles

`GET /api/profiles`

- Auth requise
- Crée automatiquement un profil principal si le compte n'en a aucun

```bash
curl http://localhost:3000/api/profiles -b "netflixlight.sid=<cookie>"
```

`POST /api/profiles`

- Auth requise
- Body : `name` entre 2 et 30 caractères, `avatarColor` optionnel
- Couleurs acceptées : `#fb7185`, `#38bdf8`, `#34d399`, `#f59e0b`, `#a78bfa`

```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -b "netflixlight.sid=<cookie>" \
  -d '{"name":"Salon","avatarColor":"#38bdf8"}'
```

## PWA

La PWA est volontairement simple :

- `public/manifest.webmanifest` décrit le nom, l'icône, le mode standalone et les couleurs.
- `public/icons/icon.svg` sert d'icône installable.
- `public/sw.js` met en cache le shell statique et ignore les routes `/api/` pour éviter de servir des données compte périmées.

## Vérification Avant Rendu

Commandes recommandées :

```bash
npm run lint
npm run build:css
npm test
npm run test:watchlist
node --test tests/watch-progress.api.test.js
node --test tests/viewing-history.api.test.js
node --test tests/user-ratings.api.test.js
node --test tests/profiles.api.test.js
node --test tests/profile-scoped-data.api.test.js
```
