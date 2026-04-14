import { renderCarousel } from "./components/carousel.js";
import { renderTmdbImage } from "./tmdb-images.js";
import {
  renderFavoritesView,
  renderLoginView,
  renderProfileView,
  renderRegisterView,
} from "./views/account-view.js";
import {
  renderCarouselSkeleton,
  renderGenreCarousels,
  renderHomeCarousels,
  renderMoviesCatalog,
  renderSeriesCatalog,
  renderSeriesGenreCarousels,
} from "./views/catalog-sections.js";
import { renderDetailView } from "./views/detail-view.js";
import { renderSearchView } from "./views/search-view.js";
import { escapeHtml, getPersonalRatingLabel } from "./views/view-utils.js";

/**
 * @typedef {object} TmdbMediaItem
 * @property {number} [id]
 * @property {"movie" | "tv" | "person"} [media_type]
 * @property {string} [title]
 * @property {string} [name]
 * @property {string} [overview]
 * @property {string} [release_date]
 * @property {string} [first_air_date]
 * @property {string} [backdrop_path]
 * @property {string} [poster_path]
 * @property {number} [vote_average]
 * @property {number} [runtime]
 * @property {number} [number_of_seasons]
 * @property {{ name?: string }[]} [genres]
 * @property {{ cast?: TmdbCastMember[] }} [credits]
 * @property {{ results?: TmdbMediaItem[] }} [similar]
 *
 * @typedef {object} TmdbCastMember
 * @property {number} [id]
 * @property {string} [name]
 * @property {string} [character]
 * @property {string} [profile_path]
 * @property {number} [order]
 */

// renders the home page with hero, continue watching, recommendations, and catalog carousels
function renderHomeView(state) {
  return `
    <section class="space-y-8">
      ${renderHomeHero(state.hero)}
      ${renderContinueWatchingSection(state.watchProgress, state.userRatings)}
      ${renderGenreRecommendationsSection(state.genreRecommendations)}
      ${renderHomeCarousels(state.catalog.home)}
    </section>
  `;
}

// renders the movies page with a header, popular movies, and genre carousels
function renderMoviesView(state) {
  const moviesState = state.catalog.movies;
  const genreState = state.catalog.genres;

  return `
    <section class="space-y-6">
      <header class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-amber-300">Films</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">À l'affiche</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Retrouve les films populaires du moment et garde de côté ceux qui te tentent.
        </p>
      </header>

      ${renderMoviesCatalog(moviesState)}
      ${renderGenreCarousels(genreState)}
    </section>
  `;
}

// renders the series page with a header, popular series, and genre carousels
function renderSeriesView(state) {
  const seriesState = state.catalog.series;
  const genreState = state.catalog.seriesGenres;

  return `
    <section class="space-y-6">
      <header class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-sky-300">Séries</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">À suivre</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Retrouve les séries populaires du moment et garde de côté celles qui te tentent.
        </p>
      </header>

      ${renderSeriesCatalog(seriesState)}
      ${renderSeriesGenreCarousels(genreState)}
    </section>
  `;
}

// renders the "continue watching" carousel from watch progress items - returns empty string if no items
function renderContinueWatchingSection(watchProgressState, userRatingsState) {
  if (
    watchProgressState.status !== "success" ||
    !Array.isArray(watchProgressState.items) ||
    watchProgressState.items.length === 0
  ) {
    return "";
  }

  const items = watchProgressState.items
    .filter((item) => item?.snapshot?.title)
    .map((item) => ({
      id: item.tmdbId,
      media_type: item.type,
      title: item.snapshot.title,
      poster_path: item.snapshot.poster,
      navigation_path: `/${item.type}/${item.tmdbId}`,
      personal_rating_label: getPersonalRatingLabel(userRatingsState, item),
      vote_average: null,
      release_date: item.updatedAt,
    }));

  if (items.length === 0) {
    return "";
  }

  return renderCarousel({
    id: "continue-watching",
    title: "Continuer à regarder",
    items,
  });
}

// renders the genre recommendations carousel based on the user's top-rated genre - handles loading/error/empty states
function renderGenreRecommendationsSection(recommendationsState) {
  if (!recommendationsState || recommendationsState.status === "idle") {
    return "";
  }

  if (recommendationsState.status === "empty") {
    return "";
  }

  if (recommendationsState.status === "loading") {
    return renderCarouselSkeleton(
      `Recommandé: ${recommendationsState.genre?.name || "genre favori"}`
    );
  }

  if (recommendationsState.status === "error") {
    return `
      <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100 shadow-xl shadow-black/20">
        <p class="text-sm uppercase tracking-[0.3em] text-rose-200">Recommandations</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight">
          Impossible de charger tes recommandations
        </h2>
        <p class="mt-5 text-base leading-8">
          ${recommendationsState.error || "Une erreur est survenue pendant le chargement."}
        </p>
      </section>
    `;
  }

  if (
    !Array.isArray(recommendationsState.items) ||
    recommendationsState.items.length === 0
  ) {
    return "";
  }

  return renderCarousel({
    id: "genre-recommendations",
    title: `Parce que tu aimes ${recommendationsState.genre?.name || "ce genre"}`,
    items: recommendationsState.items,
  });
}

// renders a 404 error block for an unmatched pathname
function renderNotFoundView(pathname) {
  return `
    <section class="grid min-h-[60vh] place-items-center">
      <div class="max-w-2xl rounded-4xl border border-rose-400/20 bg-rose-500/10 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">404</p>
        <h1 class="mt-4 text-5xl font-semibold tracking-tight">Page introuvable</h1>
        <p class="mt-5 text-base leading-8 text-white/70">
          La page <code>${pathname}</code> est introuvable.
        </p>
      </div>
    </section>
  `;
}

export const routeViews = {
  "/": {
    title: "Accueil",
    render: renderHomeView,
  },
  "/search": {
    title: "Recherche",
    render: renderSearchView,
  },
  "/movies": {
    title: "Films",
    render: renderMoviesView,
  },
  "/series": {
    title: "Séries",
    render: renderSeriesView,
  },
  "/favorites": {
    title: "Favoris",
    render: renderFavoritesView,
  },
  "/profile": {
    title: "Profil",
    render: renderProfileView,
  },
  "/login": {
    title: "Connexion",
    render: renderLoginView,
  },
  "/register": {
    title: "Inscription",
    render: renderRegisterView,
  },
};

/**
 * resolves a pathname to a view descriptor ({ title, render }) - handles detail routes and 404
 */
export function resolveView(pathname) {
  const route = routeViews[pathname];

  if (route) {
    return route;
  }

  const detailMatch = pathname.match(/^\/(movie|tv)\/(\d+)$/);

  if (detailMatch) {
    const [, type, id] = detailMatch;

    return {
      title: "Détail",
      render: (state) => renderDetailView(state, type, Number.parseInt(id, 10)),
    };
  }

  return {
    title: "404",
    render: () => renderNotFoundView(pathname),
  };
}

// renders the full-bleed home hero with backdrop, trailer player, and content overlay - handles loading/error/success states
function renderHomeHero(heroState) {
  if (heroState.status === "loading" || heroState.status === "idle") {
    return `
      <section
        class="relative -mt-8 min-h-[80vh] animate-pulse bg-white/5 sm:-mt-10"
        style="width:100vw;margin-left:calc(50% - 50vw)"
      >
        <div class="flex min-h-[80vh] items-end p-6 pb-14 sm:p-14 sm:pb-20">
          <div class="max-w-2xl space-y-4">
            <div class="h-3 w-24 rounded-full bg-white/10"></div>
            <div class="h-12 w-80 rounded-2xl bg-white/10 sm:h-16 sm:w-lg"></div>
            <div class="h-4 w-full max-w-md rounded-full bg-white/10"></div>
            <div class="h-4 w-64 rounded-full bg-white/10"></div>
          </div>
        </div>
      </section>
    `;
  }

  if (heroState.status === "error") {
    return `
      <section
        class="relative -mt-8 min-h-[80vh] bg-rose-500/10 sm:-mt-10"
        style="width:100vw;margin-left:calc(50% - 50vw)"
      >
        <div class="flex min-h-[80vh] items-end p-6 pb-14 sm:p-14 sm:pb-20">
          <div class="max-w-2xl">
            <p class="text-sm uppercase tracking-[0.35em] text-rose-300">À la une</p>
            <h1 class="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Impossible de charger la sélection
            </h1>
            <p class="mt-6 max-w-xl text-base leading-8 text-rose-100/90">
              ${heroState.error || "Une erreur est survenue."}
            </p>
            <button
              type="button"
              data-retry-hero
              class="mt-8 rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Réessayer
            </button>
          </div>
        </div>
      </section>
    `;
  }

  if (!heroState.item) {
    return "";
  }

  /** @type {TmdbMediaItem} */
  const item = heroState.item;
  const title = item.title || item.name || "Titre inconnu";
  const overview =
    item.overview || "Découvre ce titre dans la sélection du moment.";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const mediaType = item.media_type;
  const backdropPath = item.backdrop_path || item.poster_path;
  const detailPath = `/${mediaType}/${item.id}`;
  const trailerKey =
    typeof item.trailerKey === "string" && item.trailerKey
      ? item.trailerKey
      : null;

  return `
    <section
      data-hero
      ${trailerKey ? `data-hero-trailer-key="${escapeHtml(trailerKey)}"` : ""}
      class="media-surface group relative -mt-8 overflow-hidden sm:-mt-10"
      style="width:100vw;margin-left:calc(50% - 50vw)"
    >
      <div data-hero-backdrop class="absolute inset-0 transition-opacity duration-1000">
        ${renderTmdbImage({
          path: backdropPath,
          alt: title,
          size: "w1280",
          srcSetSizes: [
            { size: "w780", width: 780 },
            { size: "w1280", width: 1280 },
            { size: "original", width: 1920 },
          ],
          sizes: "100vw",
          loading: "eager",
          fetchPriority: "high",
          className: "h-full w-full object-cover",
        })}
        <div class="pointer-events-none absolute inset-0 bg-linear-to-r from-black/75 via-black/35 to-transparent"></div>
        <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>
      </div>

      ${
        trailerKey
          ? `
      <div data-hero-video-layer class="absolute inset-0 opacity-0 transition-opacity duration-1000">
        <div class="absolute inset-0 overflow-hidden">
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 aspect-video"
            style="width:max(100%, 177.78vh)"
          >
            <div data-hero-player-iframe class="h-full w-full"></div>
          </div>
        </div>
        <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>
        <div data-hero-click-area class="absolute inset-0 cursor-pointer"></div>
      </div>

      <div data-hero-feedback class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" aria-hidden="true">
        <div data-hero-feedback-inner class="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm">
          <svg data-feedback-icon="play" class="hidden h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg data-feedback-icon="pause" class="hidden h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg data-feedback-icon="muted" class="hidden h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
          <svg data-feedback-icon="unmuted" class="hidden h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </div>
      </div>

      <button
        type="button"
        data-hero-mute
        aria-label="Activer le son"
        aria-pressed="true"
        class="absolute bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/70 group-hover:opacity-100"
      >
        <svg data-icon-muted class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
        <svg data-icon-unmuted class="hidden h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      </button>
      `
          : ""
      }

      <div
        data-hero-content
        class="pointer-events-none relative z-10 flex min-h-[80vh] items-end p-6 pb-14 sm:min-h-[82vh] sm:p-14 sm:pb-20"
      >
        <div class="max-w-2xl">
          <p class="text-sm font-medium uppercase tracking-[0.35em] text-rose-300">
            ${mediaType === "movie" ? "Film" : "Série"}${year ? ` · ${year}` : ""}
          </p>

          <h1 class="mt-4 text-4xl font-bold tracking-tight text-white sm:text-7xl">
            ${title}
          </h1>

          <p class="mt-5 max-w-xl text-base leading-7 text-white/80 line-clamp-3 sm:text-lg sm:leading-8">
            ${overview}
          </p>

          <div class="pointer-events-auto mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              data-nav-path="${detailPath}"
              class="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-white/90"
            >
              Voir le détail
            </button>
            <button
              type="button"
              data-retry-hero
              class="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              Changer
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}
