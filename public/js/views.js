import { renderCarousel } from "./components/carousel.js";
import { renderPosterCard } from "./components/poster-card.js";

const TMDB_PROFILE_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w300";

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

function createFeatureTile({ eyebrow, title, description }) {
  return `
    <article class="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-xs uppercase tracking-[0.3em] text-rose-300">${eyebrow}</p>
      <h3 class="mt-3 text-2xl font-semibold tracking-tight text-white">${title}</h3>
      <p class="mt-3 text-sm leading-7 text-white/70">${description}</p>
    </article>
  `;
}

function renderHomeView(state) {
  return `
    <section class="space-y-8">
      ${renderHomeHero(state.hero)}
      ${renderHomeCarousels(state.catalog.home)}

      <div class="grid gap-5 lg:grid-cols-2">
        ${createFeatureTile({
          eyebrow: "A la une",
          title: "Les titres du moment",
          description: "Retrouve rapidement ce qui fait parler en ce moment.",
        })}
        ${createFeatureTile({
          eyebrow: "Ma liste",
          title: "Tout garder sous la main",
          description: "Ajoute les titres que tu veux retrouver plus tard.",
        })}
      </div>
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
        <h1 class="mt-3 text-4xl font-semibold tracking-tight">A l'affiche</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Retrouve les films populaires du moment et garde de cote ceux qui te tentent.
        </p>
      </header>

      ${renderMoviesCatalog(moviesState)}
      ${renderGenreCarousels(genreState)}
    </section>
  `;
}

function renderFavoritesView(state) {
  const username = state.session.user?.username || "utilisateur";

  return `
    <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">Favoris</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Ma liste</h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
        Connecte en tant que ${username}. Retrouve ici les titres que tu veux garder de cote.
      </p>
    </section>
  `;
}

function renderProfileView(state) {
  const user = state.session.user;

  return `
    <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-sky-300">Profil</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Mon compte</h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
        Retrouve ici les informations liees a ton compte.
      </p>

      <dl class="mt-8 grid gap-4 sm:grid-cols-2">
        <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Username</dt>
          <dd class="mt-3 text-lg font-medium text-white">${user?.username || "-"}</dd>
        </div>
        <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Email</dt>
          <dd class="mt-3 text-lg font-medium text-white">${user?.email || "-"}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderLoginView(state) {
  const authState = state.ui.authForm;

  return `
    <section class="mx-auto w-full max-w-xl rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.3em] text-violet-300">Connexion</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Connexion</h1>
      <p class="mt-4 text-base leading-8 text-white/70">
        Connecte-toi pour retrouver ta liste et ton compte.
      </p>

      ${renderAuthFeedback(authState)}

      <form data-auth-form="login" class="mt-8 space-y-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Email</span>
          <input
            type="email"
            name="email"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            placeholder="email@example.com"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          class="inline-flex rounded-full bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          ${authState.pending ? "disabled" : ""}
        >
          ${authState.pending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </section>
  `;
}

function renderRegisterView(state) {
  const authState = state.ui.authForm;

  return `
    <section class="mx-auto w-full max-w-xl rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Inscription</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Inscription</h1>
      <p class="mt-4 text-base leading-8 text-white/70">
        Cree ton compte pour enregistrer tes envies et y revenir quand tu veux.
      </p>

      ${renderAuthFeedback(authState)}

      <form data-auth-form="register" class="mt-8 space-y-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Username</span>
          <input
            type="text"
            name="username"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
            placeholder="mon-pseudo"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Email</span>
          <input
            type="email"
            name="email"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
            placeholder="email@example.com"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          class="inline-flex rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
          ${authState.pending ? "disabled" : ""}
        >
          ${authState.pending ? "Creation..." : "Creer un compte"}
        </button>
      </form>
    </section>
  `;
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
      title: "Detail",
      render: (state) => renderDetailView(state, type, Number.parseInt(id, 10)),
    };
  }

  return {
    title: "404",
    render: () => renderNotFoundView(pathname),
  };
}

function renderAuthFeedback(authState) {
  if (authState.error) {
    return `
      <div class="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        ${authState.error}
      </div>
    `;
  }

  if (authState.success) {
    return `
      <div class="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        ${authState.success}
      </div>
    `;
  }

  return "";
}

function renderMoviesCatalog(moviesState) {
  return renderCatalogCarouselSection(moviesState, {
    id: "movies-popular",
    title: "Films populaires",
    retryKey: "movies-popular",
  });
}

function renderSearchView(state) {
  const searchState = state.search;
  const hasQuery = Boolean(searchState.query);

  return `
    <section class="space-y-6">
      <header class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Recherche</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight">
          ${
            hasQuery
              ? `Resultats pour "${escapeHtml(searchState.query)}"`
              : "Trouve ton prochain visionnage"
          }
        </h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          ${
            hasQuery
              ? "Parcours les films et series correspondants puis ouvre leur fiche detail."
              : "Utilise la barre de recherche du header pour chercher un film ou une serie depuis n'importe quelle page."
          }
        </p>
      </header>

      ${renderSearchResults(searchState)}
    </section>
  `;
}

function renderHomeHero(heroState) {
  if (heroState.status === "loading" || heroState.status === "idle") {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">A la une</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          Chargement...
        </h1>
      </section>
    `;
  }

  if (heroState.status === "error") {
    return `
      <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">A la une</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          Impossible de charger la selection
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-8 text-rose-100/90 sm:text-lg">
          ${heroState.error || "Une erreur est survenue."}
        </p>
        <button
          type="button"
          data-retry-hero
          class="mt-8 rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Reessayer
        </button>
      </section>
    `;
  }

  if (!heroState.item) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">A la une</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          Regarde ce qui te tente ce soir.
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
          Parcours les films du moment et trouve ton prochain visionnage.
        </p>
      </section>
    `;
  }

  /** @type {TmdbMediaItem} */
  const item = heroState.item;
  const title = item.title || item.name || "Titre inconnu";
  const overview =
    item.overview || "Decouvre ce titre dans la selection du moment.";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const mediaType = item.media_type;
  const backdropPath = item.backdrop_path || item.poster_path;
  const detailPath = `/${mediaType}/${item.id}`;

  return `
    <section class="relative overflow-hidden rounded-4xl border border-white/10 shadow-2xl shadow-black/30">
      <div class="absolute inset-0">
        <img
          src="https://image.tmdb.org/t/p/original${backdropPath}"
          alt="${title}"
          class="h-full w-full object-cover"
        />
      </div>

      <div class="absolute inset-0 bg-linear-to-r from-black via-black/75 to-black/20"></div>
      <div class="relative z-10 flex min-h-112 items-end p-8 sm:p-10">
        <div class="max-w-2xl">
          <p class="text-sm uppercase tracking-[0.35em] text-rose-300">
            ${mediaType === "movie" ? "Film" : "Serie"}${year ? ` • ${year}` : ""}
          </p>

          <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            ${title}
          </h1>

          <p class="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
            ${overview}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              data-nav-path="${detailPath}"
              class="rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
            >
              Voir le detail
            </button>

            <button
              type="button"
              data-refresh-hero
              class="rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Changer
            </button>
            <button
              type="button"
              data-retry-hero
              class="rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDetailView(state, type, id) {
  const detailState = state.detail;
  const isMatchingDetail = detailState.type === type && detailState.id === id;

  if (
    !isMatchingDetail ||
    detailState.status === "idle" ||
    detailState.status === "loading"
  ) {
    return renderDetailLoading();
  }

  if (detailState.status === "error") {
    return renderDetailError(type, id, detailState.error);
  }

  if (!detailState.item) {
    return renderDetailLoading();
  }

  return renderDetailContent(state, detailState.item, type);
}

function renderDetailLoading() {
  return `
    <section class="space-y-6">
      <div class="h-10 w-40 animate-pulse rounded-full bg-white/10"></div>

      <article class="overflow-hidden rounded-4xl border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
        <div class="h-88 animate-pulse bg-white/10"></div>
        <div class="space-y-5 p-8 sm:p-10">
          <div class="h-4 w-32 animate-pulse rounded-full bg-white/10"></div>
          <div class="h-12 w-full max-w-xl animate-pulse rounded-2xl bg-white/10"></div>
          <div class="h-24 w-full animate-pulse rounded-3xl bg-white/10"></div>
        </div>
      </article>
    </section>
  `;
}

function renderDetailError(type, id, errorMessage) {
  const detailPath = `/${type}/${id}`;
  const returnPath = type === "movie" ? "/films" : "/";
  const returnLabel =
    type === "movie" ? "Retour aux films" : "Retour a l'accueil";

  return `
    <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.35em] text-rose-300">Detail</p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        Impossible de charger ce ${type === "movie" ? "film" : "contenu"}
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-rose-100/90">
        ${errorMessage || "Une erreur est survenue pendant le chargement."}
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          data-retry-detail="${detailPath}"
          class="rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Reessayer
        </button>
        <button
          type="button"
          data-nav-path="${returnPath}"
          class="rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
        >
          ${returnLabel}
        </button>
      </div>
    </section>
  `;
}

function renderDetailContent(state, item, type) {
  const title = escapeHtml(item.title || item.name || "Titre inconnu");
  const overview = escapeHtml(
    item.overview || "Aucun synopsis n'est disponible pour ce titre."
  );
  const backdropPath = item.backdrop_path || item.poster_path;
  const dateLabel = type === "movie" ? "Date de sortie" : "Premiere diffusion";
  const durationLabel = type === "movie" ? "Duree" : "Saisons";
  const returnPath = type === "movie" ? "/films" : "/";
  const returnLabel =
    type === "movie" ? "Retour aux films" : "Retour a l'accueil";
  const genres = getGenreNames(item.genres);
  const mainCast = getMainCast(item.credits?.cast);
  const similarItems = getSimilarItems(item.similar?.results, type, item.id);

  return `
    <section class="space-y-8">
      <button
        type="button"
        data-nav-path="${returnPath}"
        class="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        ${returnLabel}
      </button>

      <article class="relative overflow-hidden rounded-4xl border border-white/10 shadow-2xl shadow-black/30">
        <div class="absolute inset-0">
          ${
            backdropPath
              ? `
                <img
                  src="https://image.tmdb.org/t/p/original${backdropPath}"
                  alt="${title}"
                  class="h-full w-full object-cover"
                />
              `
              : '<div class="h-full w-full bg-linear-to-br from-rose-500/30 via-black to-black"></div>'
          }
        </div>
        <div class="absolute inset-0 bg-linear-to-r from-black via-black/78 to-black/35"></div>

        <div class="relative z-10 flex min-h-120 items-end p-8 sm:p-10">
          <div class="max-w-3xl">
            <div class="flex flex-wrap gap-3">
              <span class="rounded-full bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-rose-200">
                ${type === "movie" ? "Film" : "Serie"}
              </span>
              <span class="rounded-full bg-amber-400/15 px-4 py-2 text-sm font-medium text-amber-200">
                Note ${formatVoteAverage(item.vote_average)}
              </span>
            </div>

            <h1 class="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              ${title}
            </h1>

            <p class="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
              ${overview}
            </p>

            ${renderFavoriteToggle(state, item, type)}

            <div class="mt-8 flex flex-wrap gap-3">
              ${renderDetailBadge(dateLabel, formatLongDate(item.release_date || item.first_air_date))}
              ${renderDetailBadge(durationLabel, type === "movie" ? formatRuntime(item.runtime) : formatSeasonCount(item.number_of_seasons))}
              ${renderDetailBadge("Genres", formatGenreSummary(genres))}
            </div>
          </div>
        </div>
      </article>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <article class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
          <p class="text-sm uppercase tracking-[0.3em] text-sky-300">Synopsis</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
            L'histoire
          </h2>
          <p class="mt-5 text-base leading-8 text-white/75">
            ${overview}
          </p>
        </article>

        <aside class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
          <p class="text-sm uppercase tracking-[0.3em] text-amber-300">Infos</p>
          <div class="mt-6 space-y-5">
            ${renderDetailFact(dateLabel, formatLongDate(item.release_date || item.first_air_date))}
            ${renderDetailFact(durationLabel, type === "movie" ? formatRuntime(item.runtime) : formatSeasonCount(item.number_of_seasons))}
            ${renderDetailFact("Genres", formatGenreSummary(genres))}
            ${renderDetailFact("Note moyenne", formatVoteAverage(item.vote_average))}
          </div>
        </aside>
      </div>

      ${renderSimilarContentSection(similarItems, type, item.id)}
      ${renderMainCastSection(mainCast)}
    </section>
  `;
}

function renderFavoriteToggle(state, item, type) {
  const isAuthenticated =
    state.session.status === "authenticated" && Boolean(state.session.user);
  const tmdbId = item.id;
  const watchlistKey = createFavoriteKey(type, tmdbId);
  const isHydratingWatchlist =
    isAuthenticated &&
    (state.watchlist.status === "idle" || state.watchlist.status === "loading");
  const isFavorite = Boolean(state.watchlist.itemKeys[watchlistKey]);
  const isPending = Boolean(state.watchlist.pendingKeys[watchlistKey]);
  const lastAction =
    state.watchlist.lastAction?.key === watchlistKey
      ? state.watchlist.lastAction
      : null;
  const buttonLabel = isHydratingWatchlist
    ? "Verification..."
    : isPending
      ? "Mise a jour..."
      : isFavorite
        ? "Retirer des favoris"
        : "Ajouter aux favoris";
  const buttonClass = isFavorite
    ? "bg-rose-500 text-white hover:bg-rose-400"
    : "bg-white text-neutral-950 hover:bg-white/90";

  return `
    <div class="mt-8 space-y-3">
      <button
        type="button"
        data-toggle-favorite
        class="rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}"
        ${isPending || isHydratingWatchlist ? "disabled" : ""}
      >
        ${buttonLabel}
      </button>
      <p class="text-sm ${
        lastAction?.tone === "error"
          ? "text-rose-200"
          : lastAction?.tone === "success"
            ? "text-emerald-200"
            : "text-white/65"
      }">
        ${
          lastAction?.message ||
          (isHydratingWatchlist
            ? "On verifie si ce titre est deja dans tes favoris."
            : null) ||
          (isAuthenticated
            ? "Ajoute ce titre a ta liste ou retire-le en un clic."
            : "Connecte-toi pour enregistrer ce titre dans tes favoris.")
        }
      </p>
    </div>
  `;
}

function renderHomeCarousels(homeCatalogState) {
  return `
    <div class="space-y-8">
      ${renderCatalogCarouselSection(homeCatalogState.trending, {
        id: "home-trending",
        title: "Tendances",
        retryKey: "home-trending",
      })}
      ${renderCatalogCarouselSection(homeCatalogState.moviesPopular, {
        id: "home-movies-popular",
        title: "Films populaires",
        retryKey: "home-movies-popular",
      })}
      ${renderCatalogCarouselSection(homeCatalogState.tvPopular, {
        id: "home-tv-popular",
        title: "Series populaires",
        retryKey: "home-tv-popular",
      })}
      ${renderCatalogCarouselSection(homeCatalogState.topRated, {
        id: "home-top-rated",
        title: "Mieux notes",
        retryKey: "home-top-rated",
      })}
    </div>
  `;
}

function renderGenreCarousels(genreState) {
  return `
    <div class="space-y-8">
      ${renderCatalogCarouselSection(genreState.action, {
        id: "genre-action",
        title: "Action",
        retryKey: "genre-action",
      })}
      ${renderCatalogCarouselSection(genreState.comedy, {
        id: "genre-comedy",
        title: "Comedie",
        retryKey: "genre-comedy",
      })}
      ${renderCatalogCarouselSection(genreState.horror, {
        id: "genre-horror",
        title: "Horreur",
        retryKey: "genre-horror",
      })}
    </div>
  `;
}

function renderCatalogCarouselSection(sectionState, { id, title, retryKey }) {
  if (!sectionState || sectionState.status === "idle") {
    return renderCarouselSkeleton(title);
  }

  if (sectionState.status === "loading") {
    return renderCarouselSkeleton(title);
  }

  if (sectionState.status === "error") {
    return renderCarouselError(title, retryKey, sectionState.error);
  }

  if (!Array.isArray(sectionState.items) || sectionState.items.length === 0) {
    return renderCarouselEmpty(title);
  }

  return renderCarousel({
    id,
    title,
    items: sectionState.items,
  });
}

function renderCarouselSkeleton(title) {
  return `
    <section class="space-y-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/40">Selection</p>
        <h2 class="text-2xl font-semibold tracking-tight text-white">${title}</h2>
      </div>

      <div class="flex gap-5 overflow-hidden pb-4">
        ${Array.from(
          { length: 5 },
          () => `
          <article class="w-[16rem] shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20 sm:w-[18rem]">
            <div class="aspect-2/3 animate-pulse bg-white/10"></div>
          </article>
        `
        ).join("")}
      </div>
    </section>
  `;
}

function renderCarouselError(title, retryKey, errorMessage) {
  return `
    <section class="space-y-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/40">Selection</p>
        <h2 class="text-2xl font-semibold tracking-tight text-white">${title}</h2>
      </div>

      <div class="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100 shadow-xl shadow-black/20">
        <p class="text-sm text-rose-100/90">
          ${errorMessage || "Impossible de charger cette section pour le moment."}
        </p>
        <button
          type="button"
          data-retry-section="${retryKey}"
          class="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Reessayer
        </button>
      </div>
    </section>
  `;
}

function renderCarouselEmpty(title) {
  return `
    <section class="space-y-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/40">Selection</p>
        <h2 class="text-2xl font-semibold tracking-tight text-white">${title}</h2>
      </div>

      <div class="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-white/70 shadow-xl shadow-black/20">
        Aucun titre disponible pour le moment.
      </div>
    </section>
  `;
}

function renderSearchResults(searchState) {
  if (!searchState.query) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 text-white/70 shadow-xl shadow-black/20 backdrop-blur">
        Lance une recherche pour voir apparaitre les resultats ici.
      </section>
    `;
  }

  if (searchState.status === "loading" || searchState.status === "idle") {
    return `
      <section class="space-y-4">
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${Array.from(
            { length: 8 },
            () => `
              <article class="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20">
                <div class="aspect-2/3 animate-pulse bg-white/10"></div>
              </article>
            `
          ).join("")}
        </div>
      </section>
    `;
  }

  if (searchState.status === "error") {
    return `
      <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100 shadow-xl shadow-black/20">
        <p class="text-base leading-8">
          ${searchState.error || "Impossible de charger les resultats pour le moment."}
        </p>
      </section>
    `;
  }

  if (!Array.isArray(searchState.items) || searchState.items.length === 0) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 text-white/70 shadow-xl shadow-black/20 backdrop-blur">
        Aucun resultat pour "${escapeHtml(searchState.query)}".
      </section>
    `;
  }

  return `
    <section class="space-y-4">
      <p class="text-sm uppercase tracking-[0.3em] text-white/40">
        ${searchState.items.length} resultat${searchState.items.length > 1 ? "s" : ""}
      </p>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${searchState.items
          .map(
            (item) => `
              <div>
                ${renderPosterCard(item)}
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDetailBadge(label, value) {
  return `
    <span class="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
      <span class="font-medium text-white">${label}:</span> ${escapeHtml(value)}
    </span>
  `;
}

function renderDetailFact(label, value) {
  return `
    <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
      <p class="text-xs uppercase tracking-[0.3em] text-white/40">${escapeHtml(label)}</p>
      <p class="mt-3 text-lg font-medium text-white">${escapeHtml(value)}</p>
    </div>
  `;
}

function createFavoriteKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function renderSimilarContentSection(similarItems, type, itemId) {
  const sectionTitle =
    type === "movie" ? "Films similaires" : "Series similaires";

  if (!Array.isArray(similarItems) || similarItems.length === 0) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">A voir aussi</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          ${sectionTitle}
        </h2>
        <p class="mt-5 text-base leading-8 text-white/70">
          Aucun contenu similaire n'est disponible pour ce ${
            type === "movie" ? "film" : "titre"
          }.
        </p>
      </section>
    `;
  }

  return `
    <section class="space-y-6">
      <div class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">A voir aussi</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          ${sectionTitle}
        </h2>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Continue avec des titres proches et ouvre leur fiche detail directement depuis le carrousel.
        </p>
      </div>

      ${renderCarousel({
        id: `detail-similar-${type}-${itemId}`,
        title: sectionTitle,
        items: similarItems,
      })}
    </section>
  `;
}

function renderMainCastSection(cast) {
  if (!Array.isArray(cast) || cast.length === 0) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Casting</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          Casting principal
        </h2>
        <p class="mt-5 text-base leading-8 text-white/70">
          Les informations de casting ne sont pas disponibles pour ce titre.
        </p>
      </section>
    `;
  }

  return `
    <section class="space-y-6">
      <div class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Casting</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          Casting principal
        </h2>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Retrouve les interpretes principaux et les personnages qu'ils incarnent.
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        ${cast.map((member) => renderCastCard(member)).join("")}
      </div>
    </section>
  `;
}

function renderCastCard(member) {
  const actorName = escapeHtml(member.name || "Nom inconnu");
  const characterName = escapeHtml(formatCharacterName(member.character));
  const photoMarkup = member.profile_path
    ? `
      <img
        src="${TMDB_PROFILE_IMAGE_BASE_URL}${member.profile_path}"
        alt="${actorName}"
        loading="lazy"
        class="h-full w-full object-cover"
      />
    `
    : `
      <div class="flex h-full items-center justify-center bg-linear-to-br from-white/10 via-white/5 to-black/40 px-6 text-center text-sm uppercase tracking-[0.3em] text-white/40">
        ${actorName}
      </div>
    `;

  return `
    <article class="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20">
      <div class="aspect-[4/5] overflow-hidden bg-black/30">
        ${photoMarkup}
      </div>
      <div class="space-y-2 p-5">
        <h3 class="text-lg font-semibold text-white">${actorName}</h3>
        <p class="text-sm uppercase tracking-[0.25em] text-white/35">Personnage</p>
        <p class="text-sm leading-7 text-white/75">${characterName}</p>
      </div>
    </article>
  `;
}

function getMainCast(cast) {
  if (!Array.isArray(cast)) {
    return [];
  }

  const seenCastMembers = new Set();

  return cast
    .filter((member) => member && typeof member.name === "string")
    .slice()
    .sort((leftMember, rightMember) => {
      const leftOrder = Number.isInteger(leftMember.order)
        ? leftMember.order
        : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isInteger(rightMember.order)
        ? rightMember.order
        : Number.MAX_SAFE_INTEGER;

      return leftOrder - rightOrder;
    })
    .filter((member) => {
      const castKey = Number.isInteger(member.id)
        ? `id:${member.id}`
        : `name:${member.name.trim().toLowerCase()}`;

      if (seenCastMembers.has(castKey)) {
        return false;
      }

      seenCastMembers.add(castKey);
      return true;
    })
    .slice(0, 8);
}

function getSimilarItems(similarResults, mediaType, currentItemId) {
  if (!Array.isArray(similarResults)) {
    return [];
  }

  const seenSimilarIds = new Set();

  return similarResults
    .filter(
      (item) => item && Number.isInteger(item.id) && item.id !== currentItemId
    )
    .sort((leftItem, rightItem) => {
      const leftHasArtwork = Boolean(
        leftItem?.poster_path || leftItem?.backdrop_path
      );
      const rightHasArtwork = Boolean(
        rightItem?.poster_path || rightItem?.backdrop_path
      );

      if (leftHasArtwork === rightHasArtwork) {
        return 0;
      }

      return leftHasArtwork ? -1 : 1;
    })
    .map((item) => ({
      ...item,
      media_type: mediaType,
    }))
    .filter((item) => {
      if (seenSimilarIds.has(item.id)) {
        return false;
      }

      seenSimilarIds.add(item.id);
      return true;
    })
    .slice(0, 12);
}

function formatCharacterName(characterName) {
  if (typeof characterName !== "string") {
    return "Personnage non renseigne";
  }

  const normalizedCharacterName = characterName.trim();

  if (!normalizedCharacterName) {
    return "Personnage non renseigne";
  }

  return normalizedCharacterName;
}

function getGenreNames(genres) {
  if (!Array.isArray(genres)) {
    return [];
  }

  return genres
    .map((genre) => (typeof genre?.name === "string" ? genre.name.trim() : ""))
    .filter(Boolean);
}

function formatGenreSummary(genres) {
  if (!Array.isArray(genres) || genres.length === 0) {
    return "Genres indisponibles";
  }

  return genres.join(", ");
}

function formatLongDate(dateString) {
  if (typeof dateString !== "string" || !dateString.trim()) {
    return "Date inconnue";
  }

  const dateParts = dateString
    .split("-")
    .map((part) => Number.parseInt(part, 10));

  if (
    dateParts.length !== 3 ||
    dateParts.some((part) => !Number.isInteger(part))
  ) {
    return "Date inconnue";
  }

  const [year, month, day] = dateParts;
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatRuntime(runtime) {
  if (!Number.isInteger(runtime) || runtime <= 0) {
    return "Duree inconnue";
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatSeasonCount(numberOfSeasons) {
  if (!Number.isInteger(numberOfSeasons) || numberOfSeasons <= 0) {
    return "Nombre de saisons inconnu";
  }

  return `${numberOfSeasons} ${numberOfSeasons === 1 ? "saison" : "saisons"}`;
}

function formatVoteAverage(voteAverage) {
  if (typeof voteAverage !== "number" || Number.isNaN(voteAverage)) {
    return "indisponible";
  }

  return `${voteAverage.toFixed(1)}/10`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
