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
import { getPersonalRatingLabel } from "./views/view-utils.js";

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
  "/recherche": {
    title: "Recherche",
    render: renderSearchView,
  },
  "/films": {
    title: "Films",
    render: renderMoviesView,
  },
  "/series": {
    title: "Séries",
    render: renderSeriesView,
  },
  "/favoris": {
    title: "Favoris",
    render: renderFavoritesView,
  },
  "/profil": {
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

function renderHomeHero(heroState) {
  if (heroState.status === "loading" || heroState.status === "idle") {
    return `
      <section class="-mx-4 -mt-8 flex min-h-[75vh] animate-pulse items-end bg-white/5 p-6 sm:-mx-6 sm:-mt-10 sm:p-14">
        <div class="max-w-2xl space-y-4">
          <div class="h-3 w-24 rounded-full bg-white/10"></div>
          <div class="h-12 w-80 rounded-2xl bg-white/10 sm:h-16"></div>
          <div class="h-4 w-full max-w-md rounded-full bg-white/10"></div>
          <div class="h-4 w-64 rounded-full bg-white/10"></div>
        </div>
      </section>
    `;
  }

  if (heroState.status === "error") {
    return `
      <section class="-mx-4 -mt-8 flex min-h-[75vh] items-end bg-rose-500/10 p-6 sm:-mx-6 sm:-mt-10 sm:p-14">
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

  return `
    <section class="media-surface relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 sm:-mt-10">
      <div class="absolute inset-0">
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
          className: "h-full w-full object-cover object-top",
        })}
      </div>

      <div class="absolute inset-0 bg-linear-to-r from-black via-black/65 to-transparent"></div>
      <div class="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent"></div>

      <div class="relative z-10 flex min-h-[75vh] items-end p-6 pb-14 sm:min-h-[82vh] sm:p-14 sm:pb-20">
        <div class="max-w-2xl">
          <p class="text-sm font-medium uppercase tracking-[0.35em] text-rose-300">
            ${mediaType === "movie" ? "Film" : "Série"}${year ? ` · ${year}` : ""}
          </p>

          <h1 class="mt-4 text-4xl font-bold tracking-tight text-white sm:text-7xl">
            ${title}
          </h1>

          <p class="mt-5 max-w-xl text-base leading-7 text-white/75 line-clamp-3 sm:text-lg sm:leading-8">
            ${overview}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
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
