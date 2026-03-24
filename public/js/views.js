import { renderCarousel } from "./components/carousel.js";

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
      <header class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
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
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
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
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-sky-300">Profil</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Mon compte</h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
        Retrouve ici les informations liees a ton compte.
      </p>

      <dl class="mt-8 grid gap-4 sm:grid-cols-2">
        <div class="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Username</dt>
          <dd class="mt-3 text-lg font-medium text-white">${user?.username || "-"}</dd>
        </div>
        <div class="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
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
    <section class="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
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
    <section class="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
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
      <div class="max-w-2xl rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
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
      render: () => renderDetailPlaceholder(type, id),
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
  if (moviesState.status === "loading" || moviesState.status === "idle") {
    return `
      <section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${Array.from({ length: 8 }, () => renderPosterSkeleton()).join("")}
      </section>
    `;
  }

  if (moviesState.status === "error") {
    return `
      <section class="rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100 shadow-xl shadow-black/20">
        Impossible de charger les films pour le moment.
      </section>
    `;
  }

  if (!moviesState.items.length) {
    return `
      <section class="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-white/70 shadow-xl shadow-black/20">
        Aucun film disponible pour le moment.
      </section>
    `;
  }

  return renderCarousel({
    id: "movies-popular",
    title: "Films populaires",
    items: moviesState.items,
  });
}

function renderPosterSkeleton() {
  return `
    <article class="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20">
      <div class="aspect-[2/3] animate-pulse bg-white/10"></div>
    </article>
  `;
}

function renderHomeHero(heroState) {
  if (heroState.status === "loading" || heroState.status === "idle") {
    return `
      <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">A la une</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          Chargement...
        </h1>
      </section>
    `;
  }

  if (heroState.status === "error" || !heroState.item) {
    return `
      <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
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

  const item = heroState.item;
  const title = item.title || item.name || "Titre inconnu";
  const overview =
    item.overview || "Decouvre ce titre dans la selection du moment.";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const mediaType = item.media_type;
  const backdropPath = item.backdrop_path || item.poster_path;
  const detailPath = `/${mediaType}/${item.id}`;

  return `
    <section class="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/30">
      <div class="absolute inset-0">
        <img
          src="https://image.tmdb.org/t/p/original${backdropPath}"
          alt="${title}"
          class="h-full w-full object-cover"
        />
      </div>

      <div class="absolute inset-0 bg-linear-to-r from-black via-black/75 to-black/20"></div>
      <div class="relative z-10 flex min-h-[28rem] items-end p-8 sm:p-10">
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
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDetailPlaceholder(type, id) {
  return `
    <section class="space-y-4">
      <p class="text-sm uppercase tracking-[0.3em] text-rose-300">Detail</p>
      <h1 class="text-4xl font-semibold tracking-tight">
        ${type === "movie" ? "Film" : "Serie"} #${id}
      </h1>
      <p class="text-white/70">
        La page detail sera branchee ensuite sur l'endpoint TMDB.
      </p>
    </section>
  `;
}

function renderHomeCarousels(homeCatalogState) {
  return `
    <div class="space-y-8">
      ${renderOptionalCarousel(homeCatalogState.trending, {
        id: "home-trending",
        title: "Tendances",
      })}
      ${renderOptionalCarousel(homeCatalogState.moviesPopular, {
        id: "home-movies-popular",
        title: "Films populaires",
      })}
      ${renderOptionalCarousel(homeCatalogState.tvPopular, {
        id: "home-tv-popular",
        title: "Series populaires",
      })}
      ${renderOptionalCarousel(homeCatalogState.topRated, {
        id: "home-top-rated",
        title: "Mieux notes",
      })}
    </div>
  `;
}

function renderOptionalCarousel(sectionState, { id, title }) {
  if (
    !sectionState ||
    sectionState.status !== "success" ||
    !Array.isArray(sectionState.items) ||
    sectionState.items.length === 0
  ) {
    return "";
  }

  return renderCarousel({
    id,
    title,
    items: sectionState.items,
  });
}

function renderGenreCarousels(genreState) {
  return `
    <div class="space-y-8">
      ${renderOptionalCarousel(genreState.action, {
        id: "genre-action",
        title: "Action",
      })}
      ${renderOptionalCarousel(genreState.comedy, {
        id: "genre-comedy",
        title: "Comedie",
      })}
      ${renderOptionalCarousel(genreState.horror, {
        id: "genre-horror",
        title: "Horreur",
      })}
    </div>
  `;
}
