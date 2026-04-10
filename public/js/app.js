import { apiRequest, formatApiError } from "./api.js";
import { initializeCarousels, scrollCarousel } from "./components/carousel.js";
import {
  appState,
  setGenreCatalogState,
  setHomeCatalogState,
  setSessionState,
  setMoviesCatalogState,
  setHeroState,
  resetAuthFormState,
  setAuthFormState,
  setFlashMessage,
  setDetailState,
  setWatchlistState,
  resetWatchlistState,
  setSearchState,
  resetSearchState,
  subscribeState,
  updateState,
} from "./state.js";
import {
  getCurrentPath,
  getCurrentSearchParams,
  navigate,
  startRouter,
  subscribeRoute,
} from "./router.js";
import { resolveView } from "./views.js";

/**
 * @typedef {object} TmdbMediaItem
 * @property {number} [id]
 * @property {"movie" | "tv" | "person"} [media_type]
 * @property {string} [title]
 * @property {string} [name]
 * @property {number} [vote_average]
 * @property {string} [release_date]
 * @property {string} [first_air_date]
 * @property {string} [poster_path]
 * @property {string} [backdrop_path]
 * @property {string} [overview]
 */

const appElement = document.querySelector("#app");
const protectedPaths = new Set(["/favoris", "/profil"]);
const guestOnlyPaths = new Set(["/login", "/register"]);
const SEARCH_DEBOUNCE_MS = 350;
let currentDetailRequestId = 0;
let currentSearchDebounceId = null;
let currentSearchAbortController = null;
let currentSearchRequestId = 0;

const navItems = [
  { path: "/", label: "Accueil" },
  { path: "/films", label: "Films" },
  { path: "/favoris", label: "Favoris" },
  { path: "/profil", label: "Profil" },
  { path: "/login", label: "Connexion" },
  { path: "/register", label: "Inscription" },
];

function renderApp() {
  const currentPath = getCurrentPath();

  if (
    appState.session.status === "idle" ||
    appState.session.status === "loading"
  ) {
    document.title = "Chargement | NetflixLight";
    appElement.innerHTML = renderShell(renderSessionLoading(), currentPath);
    return;
  }

  if (!ensureRouteAccess(currentPath)) {
    return;
  }

  const currentRoute = resolveView(currentPath);

  document.title = getDocumentTitle(currentPath, currentRoute);
  appElement.innerHTML = renderShell(
    `
    ${renderFlash(appState.ui.flash)}
    ${currentRoute.render(appState)}
  `,
    currentPath
  );
  initializeCarousels(appElement);
}

function getDocumentTitle(currentPath, currentRoute) {
  if (currentPath === "/recherche" && appState.search.query) {
    return `Recherche: ${appState.search.query} | NetflixLight`;
  }

  const detailRoute = parseDetailPath(currentPath);

  if (detailRoute) {
    const detailState = appState.detail;
    const isMatchingDetail =
      detailState.type === detailRoute.type &&
      detailState.id === detailRoute.id;
    const detailTitle = isMatchingDetail
      ? detailState.item?.title || detailState.item?.name
      : null;

    if (detailTitle) {
      return `${detailTitle} | NetflixLight`;
    }
  }

  return `${currentRoute.title} | NetflixLight`;
}

function renderShell(content, currentPath) {
  const currentSearchQuery = getCurrentSearchQuery();

  return `
    <div class="min-h-screen">
      <header class="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center justify-between gap-4">
            <button
              type="button"
              data-nav-path="/"
              class="text-left text-lg font-semibold uppercase tracking-[0.25em] text-rose-400 transition hover:text-rose-300"
            >
              NetflixLight
            </button>
            ${renderSessionBadge()}
          </div>

          <div class="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
            ${renderSearchForm(currentSearchQuery)}
            <nav class="flex flex-wrap items-center justify-end gap-2">
            ${navItems.map((item) => renderNavLink(item, currentPath)).join("")}
            </nav>
          </div>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        ${content}
      </main>
    </div>
  `;
}

function renderSearchForm(currentQuery) {
  return `
    <form data-search-form class="w-full lg:max-w-md">
      <label class="sr-only" for="global-search">Rechercher un film ou une serie</label>
      <div class="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
        <input
          id="global-search"
          type="search"
          name="query"
          value="${escapeHtml(currentQuery)}"
          placeholder="Rechercher un film ou une serie"
          class="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          class="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
        >
          Rechercher
        </button>
      </div>
    </form>
  `;
}

function clearSearchDebounce() {
  if (currentSearchDebounceId !== null) {
    window.clearTimeout(currentSearchDebounceId);
    currentSearchDebounceId = null;
  }
}

function cancelActiveSearchRequest() {
  if (currentSearchAbortController) {
    currentSearchAbortController.abort();
    currentSearchAbortController = null;
  }
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

function renderSessionBadge() {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    return `
      <span class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/50">
        Visiteur
      </span>
    `;
  }

  return `
    <span class="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-100">
      ${appState.session.user.username}
    </span>
  `;
}

function getCurrentSearchQuery() {
  return getCurrentSearchParams().get("q")?.trim() || "";
}

function renderNavLink(item, currentPath) {
  const isActive = item.path === currentPath;

  return `
    <button
      type="button"
      data-nav-path="${item.path}"
      class="rounded-full px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-white text-neutral-950"
          : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
      }"
      ${isActive ? 'aria-current="page"' : ""}
    >
      ${item.label}
    </button>
  `;
}

function renderFlash(flashMessage) {
  if (!flashMessage) {
    return "";
  }

  return `
    <div class="mb-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80 backdrop-blur">
      ${flashMessage}
    </div>
  `;
}

function renderSessionLoading() {
  return `
    <section class="grid min-h-[60vh] place-items-center">
      <div class="max-w-xl rounded-4xl border border-white/10 bg-white/5 p-8 text-center shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.35em] text-amber-300">Session</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight">Un instant</h1>
        <p class="mt-4 text-base leading-8 text-white/70">
          On prepare ton espace.
        </p>
      </div>
    </section>
  `;
}

function ensureRouteAccess(currentPath) {
  const isAuthenticated =
    appState.session.status === "authenticated" &&
    Boolean(appState.session.user);

  if (!isAuthenticated && protectedPaths.has(currentPath)) {
    appState.session.redirectAfterLogin = currentPath;
    appState.ui.flash = "Connecte-toi pour acceder a cette page.";
    navigate("/login");
    return false;
  }

  if (isAuthenticated && guestOnlyPaths.has(currentPath)) {
    navigate("/profil");
    return false;
  }

  return true;
}

async function initializeSession() {
  setSessionState({
    status: "loading",
    user: null,
  });

  try {
    const response = await apiRequest("/api/auth/me");

    setWatchlistState({
      status: "loading",
      error: null,
    });
    setSessionState({
      status: "authenticated",
      user: response.user,
    });
    void loadWatchlist();
  } catch (error) {
    if (error.status !== 401) {
      setFlashMessage("Impossible de charger ton espace.");
    }

    setSessionState({
      status: "guest",
      user: null,
    });
    resetWatchlistState();
  }
}

function createWatchlistKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function buildWatchlistKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createWatchlistKey(item.type, item.tmdbId), true])
  );
}

async function loadWatchlist({ force = false } = {}) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    resetWatchlistState();
    return;
  }

  const watchlistState = appState.watchlist;

  if (
    !force &&
    (watchlistState.status === "loading" || watchlistState.status === "success")
  ) {
    return;
  }

  setWatchlistState({
    status: "loading",
    error: null,
  });

  try {
    const response = await apiRequest("/api/watchlist");
    const items = Array.isArray(response.items) ? response.items : [];

    setWatchlistState({
      status: "success",
      items,
      itemKeys: buildWatchlistKeyMap(items),
      pendingKeys: {},
      lastAction: null,
      error: null,
    });
  } catch (error) {
    if (error.status === 401) {
      setSessionState({
        status: "guest",
        user: null,
      });
      resetWatchlistState();
      return;
    }

    setWatchlistState({
      status: "error",
      error: formatApiError(error),
    });
  }
}

function buildWatchlistSnapshotItem(item, type) {
  return {
    tmdbId: item.id,
    type,
    addedAt: new Date().toISOString(),
    snapshot: {
      title: item.title || item.name || "Titre inconnu",
      poster: item.poster_path || item.backdrop_path || null,
    },
  };
}

async function toggleFavoriteFromDetail() {
  if (
    appState.session.status !== "authenticated" ||
    !appState.session.user ||
    appState.detail.status !== "success" ||
    !appState.detail.item ||
    !appState.detail.type ||
    !appState.detail.id
  ) {
    const currentPath = getCurrentPath();

    setFlashMessage("Connecte-toi pour gerer tes favoris.");
    updateState((state) => {
      state.session.redirectAfterLogin = currentPath;
    });
    navigate("/login");
    return;
  }

  const { type, id, item } = appState.detail;
  const watchlistKey = createWatchlistKey(type, id);
  const isFavorite = Boolean(appState.watchlist.itemKeys[watchlistKey]);
  const isPending = Boolean(appState.watchlist.pendingKeys[watchlistKey]);
  const isHydratingWatchlist =
    appState.watchlist.status === "idle" ||
    appState.watchlist.status === "loading";

  if (isPending || isHydratingWatchlist) {
    return;
  }

  const optimisticItem = buildWatchlistSnapshotItem(item, type);

  if (isFavorite) {
    updateState((state) => {
      state.watchlist.items = state.watchlist.items.filter(
        (watchlistItem) =>
          createWatchlistKey(watchlistItem.type, watchlistItem.tmdbId) !==
          watchlistKey
      );
      delete state.watchlist.itemKeys[watchlistKey];
      state.watchlist.pendingKeys[watchlistKey] = true;
      state.watchlist.lastAction = {
        key: watchlistKey,
        tone: "neutral",
        message: "Retrait des favoris...",
      };
      state.watchlist.error = null;
    });

    try {
      await apiRequest(`/api/watchlist/${type}/${id}`, {
        method: "DELETE",
      });

      updateState((state) => {
        delete state.watchlist.pendingKeys[watchlistKey];
        state.watchlist.lastAction = {
          key: watchlistKey,
          tone: "success",
          message: "Retire des favoris.",
        };
      });
    } catch (error) {
      if (error.status === 404) {
        updateState((state) => {
          delete state.watchlist.pendingKeys[watchlistKey];
          state.watchlist.lastAction = {
            key: watchlistKey,
            tone: "success",
            message: "Retire des favoris.",
          };
        });
        return;
      }

      updateState((state) => {
        state.watchlist.items = [
          optimisticItem,
          ...state.watchlist.items.filter(
            (watchlistItem) =>
              createWatchlistKey(watchlistItem.type, watchlistItem.tmdbId) !==
              watchlistKey
          ),
        ];
        state.watchlist.itemKeys[watchlistKey] = true;
        delete state.watchlist.pendingKeys[watchlistKey];
        state.watchlist.lastAction = {
          key: watchlistKey,
          tone: "error",
          message: formatApiError(error),
        };
      });
    }

    return;
  }

  updateState((state) => {
    state.watchlist.items = [optimisticItem, ...state.watchlist.items];
    state.watchlist.itemKeys[watchlistKey] = true;
    state.watchlist.pendingKeys[watchlistKey] = true;
    state.watchlist.lastAction = {
      key: watchlistKey,
      tone: "neutral",
      message: "Ajout aux favoris...",
    };
    state.watchlist.error = null;
  });

  try {
    const response = await apiRequest("/api/watchlist", {
      method: "POST",
      body: {
        tmdbId: id,
        type,
        title: optimisticItem.snapshot.title,
        poster: optimisticItem.snapshot.poster,
      },
    });

    updateState((state) => {
      const savedItem = response?.item || optimisticItem;
      state.watchlist.items = [
        savedItem,
        ...state.watchlist.items.filter(
          (watchlistItem) =>
            createWatchlistKey(watchlistItem.type, watchlistItem.tmdbId) !==
            watchlistKey
        ),
      ];
      state.watchlist.itemKeys[watchlistKey] = true;
      delete state.watchlist.pendingKeys[watchlistKey];
      state.watchlist.lastAction = {
        key: watchlistKey,
        tone: "success",
        message: "Ajoute aux favoris.",
      };
    });
  } catch (error) {
    if (error.status === 409) {
      updateState((state) => {
        state.watchlist.itemKeys[watchlistKey] = true;
        delete state.watchlist.pendingKeys[watchlistKey];
        state.watchlist.lastAction = {
          key: watchlistKey,
          tone: "success",
          message: "Deja present dans les favoris.",
        };
      });
      return;
    }

    updateState((state) => {
      state.watchlist.items = state.watchlist.items.filter(
        (watchlistItem) =>
          createWatchlistKey(watchlistItem.type, watchlistItem.tmdbId) !==
          watchlistKey
      );
      delete state.watchlist.itemKeys[watchlistKey];
      delete state.watchlist.pendingKeys[watchlistKey];
      state.watchlist.lastAction = {
        key: watchlistKey,
        tone: "error",
        message: formatApiError(error),
      };
    });
  }
}

async function loadMoviesCatalog() {
  if (
    appState.catalog.movies.status === "loading" ||
    appState.catalog.movies.status === "success"
  ) {
    return;
  }

  setMoviesCatalogState({
    status: "loading",
    error: null,
  });

  try {
    const response = await apiRequest(
      "/api/tmdb/movies/popular?language=fr-FR"
    );

    setMoviesCatalogState({
      status: "success",
      items: Array.isArray(response.results) ? response.results : [],
      error: null,
    });
  } catch (error) {
    setMoviesCatalogState({
      status: "error",
      error: formatApiError(error),
    });
  }
}

function normalizeSearchResults(results) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .filter(
      (item) =>
        item &&
        Number.isInteger(item.id) &&
        (item.media_type === "movie" || item.media_type === "tv")
    )
    .map((item) => ({
      ...item,
      media_type: item.media_type,
    }));
}

async function loadSearchResults(searchQuery) {
  const normalizedQuery =
    typeof searchQuery === "string" ? searchQuery.trim() : "";

  clearSearchDebounce();

  if (!normalizedQuery) {
    cancelActiveSearchRequest();
    resetSearchState();
    return;
  }

  if (
    appState.search.status === "loading" &&
    appState.search.query === normalizedQuery
  ) {
    return;
  }

  if (
    appState.search.status === "success" &&
    appState.search.query === normalizedQuery
  ) {
    return;
  }

  setSearchState({
    status: "loading",
    query: normalizedQuery,
    items: [],
    error: null,
  });

  cancelActiveSearchRequest();
  const requestId = currentSearchRequestId + 1;
  currentSearchRequestId = requestId;
  currentSearchAbortController = new AbortController();

  try {
    const response = await apiRequest(
      `/api/tmdb/search?q=${encodeURIComponent(normalizedQuery)}&language=fr-FR`,
      {
        signal: currentSearchAbortController.signal,
      }
    );

    if (requestId !== currentSearchRequestId) {
      return;
    }

    currentSearchAbortController = null;
    setSearchState({
      status: "success",
      query: normalizedQuery,
      items: normalizeSearchResults(response?.results),
      error: null,
    });
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }

    if (requestId !== currentSearchRequestId) {
      return;
    }

    currentSearchAbortController = null;
    setSearchState({
      status: "error",
      query: normalizedQuery,
      items: [],
      error: formatApiError(error),
    });
  }
}

async function loadHomeCatalogSection(sectionKey, endpoint) {
  const sectionState = appState.catalog.home[sectionKey];

  if (
    !sectionState ||
    sectionState.status === "loading" ||
    sectionState.status === "success"
  ) {
    return;
  }

  setHomeCatalogState(sectionKey, {
    status: "loading",
    items: [],
    error: null,
  });

  try {
    const response = await apiRequest(endpoint);

    setHomeCatalogState(sectionKey, {
      status: "success",
      items: Array.isArray(response.results) ? response.results : [],
      error: null,
    });
  } catch (error) {
    setHomeCatalogState(sectionKey, {
      status: "error",
      items: [],
      error: formatApiError(error),
    });
  }
}

function loadHomeCarousels() {
  void loadHomeCatalogSection(
    "trending",
    "/api/tmdb/trending?media_type=all&time_window=week&language=fr-FR"
  );
  void loadHomeCatalogSection(
    "moviesPopular",
    "/api/tmdb/movies/popular?language=fr-FR"
  );
  void loadHomeCatalogSection(
    "tvPopular",
    "/api/tmdb/tv/popular?language=fr-FR"
  );
  void loadHomeCatalogSection(
    "topRated",
    "/api/tmdb/movies/top-rated?language=fr-FR"
  );
}

async function loadGenreCatalogSection(sectionKey, genreId) {
  const sectionState = appState.catalog.genres[sectionKey];

  if (
    !sectionState ||
    sectionState.status === "loading" ||
    sectionState.status === "success"
  ) {
    return;
  }

  setGenreCatalogState(sectionKey, {
    status: "loading",
    items: [],
    error: null,
  });

  try {
    const response = await apiRequest(
      `/api/tmdb/discover?type=movie&genre=${genreId}&page=1`
    );

    setGenreCatalogState(sectionKey, {
      status: "success",
      items: Array.isArray(response.results) ? response.results : [],
      error: null,
    });
  } catch (error) {
    setGenreCatalogState(sectionKey, {
      status: "error",
      items: [],
      error: formatApiError(error),
    });
  }
}

function loadGenreCarousels() {
  void loadGenreCatalogSection("action", 28);
  void loadGenreCatalogSection("comedy", 35);
  void loadGenreCatalogSection("horror", 27);
}

function retryCatalogSection(retryKey) {
  switch (retryKey) {
    case "home-trending":
      void loadHomeCatalogSection(
        "trending",
        "/api/tmdb/trending?media_type=all&time_window=week&language=fr-FR"
      );
      return;
    case "home-movies-popular":
      void loadHomeCatalogSection(
        "moviesPopular",
        "/api/tmdb/movies/popular?language=fr-FR"
      );
      return;
    case "home-tv-popular":
      void loadHomeCatalogSection(
        "tvPopular",
        "/api/tmdb/tv/popular?language=fr-FR"
      );
      return;
    case "home-top-rated":
      void loadHomeCatalogSection(
        "topRated",
        "/api/tmdb/movies/top-rated?language=fr-FR"
      );
      return;
    case "movies-popular":
      void loadMoviesCatalog();
      return;
    case "genre-action":
      void loadGenreCatalogSection("action", 28);
      return;
    case "genre-comedy":
      void loadGenreCatalogSection("comedy", 35);
      return;
    case "genre-horror":
      void loadGenreCatalogSection("horror", 27);
      return;
    default:
  }
}

async function loadHomeHero() {
  if (
    appState.hero.status === "loading" ||
    appState.hero.status === "success"
  ) {
    return;
  }

  setHeroState({
    status: "loading",
    item: null,
    error: null,
  });

  try {
    const response = await apiRequest(
      "/api/tmdb/trending?media_type=all&time_window=week&language=fr-FR"
    );

    /** @type {TmdbMediaItem[]} */
    const results = Array.isArray(response.results) ? response.results : [];
    const eligibleItems = results.filter((item) => {
      const mediaType = item.media_type;

      return (
        (mediaType === "movie" || mediaType === "tv") &&
        item.id &&
        (item.backdrop_path || item.poster_path)
      );
    });

    if (eligibleItems.length === 0) {
      setHeroState({
        status: "error",
        item: null,
        error: "Aucun titre disponible.",
      });
      return;
    }

    const randomIndex = Math.floor(Math.random() * eligibleItems.length);
    const randomItem = eligibleItems[randomIndex];

    setHeroState({
      status: "success",
      item: randomItem,
      error: null,
    });
  } catch (error) {
    setHeroState({
      status: "error",
      item: null,
      error: formatApiError(error),
    });
  }
}

function parseDetailPath(pathname) {
  const detailMatch = pathname.match(/^\/(movie|tv)\/(\d+)$/);

  if (!detailMatch) {
    return null;
  }

  return {
    type: detailMatch[1],
    id: Number.parseInt(detailMatch[2], 10),
  };
}

async function loadDetailPage(pathname) {
  const detailRoute = parseDetailPath(pathname);

  if (!detailRoute) {
    return;
  }

  const { type, id } = detailRoute;
  const detailState = appState.detail;

  if (
    detailState.type === type &&
    detailState.id === id &&
    (detailState.status === "loading" || detailState.status === "success")
  ) {
    return;
  }

  const requestId = currentDetailRequestId + 1;
  currentDetailRequestId = requestId;

  setDetailState({
    status: "loading",
    type,
    id,
    item: null,
    error: null,
  });

  try {
    const response = await apiRequest(`/api/tmdb/${type}/${id}?language=fr-FR`);

    if (requestId !== currentDetailRequestId) {
      return;
    }

    setDetailState({
      status: "success",
      type,
      id,
      item: response,
      error: null,
    });
  } catch (error) {
    if (requestId !== currentDetailRequestId) {
      return;
    }

    setDetailState({
      status: "error",
      type,
      id,
      item: null,
      error: formatApiError(error),
    });
  }
}

function handleRouteEffects(currentPath) {
  if (
    appState.session.status === "authenticated" &&
    (appState.watchlist.status === "idle" ||
      appState.watchlist.status === "error")
  ) {
    void loadWatchlist();
  }

  if (currentPath === "/") {
    void loadHomeHero();
    loadHomeCarousels();
  }

  if (currentPath === "/films") {
    void loadMoviesCatalog();
    loadGenreCarousels();
  }

  if (parseDetailPath(currentPath)) {
    void loadDetailPage(currentPath);
  }

  if (currentPath === "/recherche") {
    void loadSearchResults(getCurrentSearchQuery());
    return;
  }

  clearSearchDebounce();
  cancelActiveSearchRequest();
  if (appState.search.status !== "idle") {
    resetSearchState();
  }
}

document.addEventListener("click", (event) => {
  const retryHeroButton = event.target.closest("[data-retry-hero]");

  if (retryHeroButton) {
    setHeroState({
      status: "idle",
      item: null,
      error: null,
    });
    void loadHomeHero();
    return;
  }

  const retrySectionButton = event.target.closest("[data-retry-section]");

  if (retrySectionButton) {
    retryCatalogSection(retrySectionButton.getAttribute("data-retry-section"));
    return;
  }

  const retryDetailButton = event.target.closest("[data-retry-detail]");

  if (retryDetailButton) {
    const detailPath = retryDetailButton.getAttribute("data-retry-detail");

    if (detailPath) {
      setDetailState({
        status: "idle",
        type: null,
        id: null,
        item: null,
        error: null,
      });
      void loadDetailPage(detailPath);
    }
    return;
  }

  const favoriteToggleButton = event.target.closest("[data-toggle-favorite]");

  if (favoriteToggleButton) {
    void toggleFavoriteFromDetail();
    return;
  }

  const previousButton = event.target.closest("[data-carousel-prev]");

  if (previousButton) {
    scrollCarousel(
      appElement,
      previousButton.getAttribute("data-carousel-prev"),
      "prev"
    );
    return;
  }

  const nextButton = event.target.closest("[data-carousel-next]");

  if (nextButton) {
    scrollCarousel(
      appElement,
      nextButton.getAttribute("data-carousel-next"),
      "next"
    );
    return;
  }

  if (event.target.closest("[data-refresh-hero]")) {
    setHeroState({
      status: "idle",
      item: null,
      error: null,
    });

    void loadHomeHero();
    return;
  }

  const trigger = event.target.closest("[data-nav-path]");

  if (!trigger) {
    return;
  }

  const targetPath = trigger.getAttribute("data-nav-path");

  if (!targetPath) {
    return;
  }

  navigate(targetPath);
});

document.addEventListener("input", (event) => {
  const searchInput = event.target.closest('#global-search[name="query"]');

  if (!searchInput) {
    return;
  }

  const searchQuery = searchInput.value.trim();
  const currentPath = getCurrentPath();

  clearSearchDebounce();
  currentSearchDebounceId = window.setTimeout(() => {
    if (!searchQuery) {
      if (currentPath === "/recherche") {
        navigate("/recherche");
      }
      return;
    }

    navigate(`/recherche?q=${encodeURIComponent(searchQuery)}`);
  }, SEARCH_DEBOUNCE_MS);
});

document.addEventListener("submit", async (event) => {
  const searchForm = event.target.closest("[data-search-form]");

  if (searchForm) {
    event.preventDefault();
    clearSearchDebounce();

    const formData = new FormData(searchForm);
    const searchQuery =
      typeof formData.get("query") === "string"
        ? formData.get("query").trim()
        : "";

    if (!searchQuery) {
      navigate("/recherche");
      return;
    }

    navigate(`/recherche?q=${encodeURIComponent(searchQuery)}`);
    return;
  }

  const form = event.target.closest("[data-auth-form]");

  if (!form) {
    return;
  }

  event.preventDefault();

  const mode = form.getAttribute("data-auth-form");
  const formData = new FormData(form);

  setAuthFormState({
    pending: true,
    error: null,
    success: null,
  });

  try {
    if (mode === "login") {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: formData.get("email"),
          password: formData.get("password"),
        },
      });

      const nextPath = appState.session.redirectAfterLogin || "/profil";

      updateState((state) => {
        state.session.status = "authenticated";
        state.session.user = response.user;
        state.session.redirectAfterLogin = null;
      });

      await loadWatchlist({ force: true });
      resetAuthFormState();
      setFlashMessage("Connexion reussie.");
      navigate(nextPath);
      return;
    }

    if (mode === "register") {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: {
          username: formData.get("username"),
          email: formData.get("email"),
          password: formData.get("password"),
        },
      });

      setAuthFormState({
        pending: false,
        error: null,
        success: "Compte cree. Tu peux maintenant te connecter.",
      });
      setFlashMessage("Compte cree avec succes.");
      navigate("/login");
    }
  } catch (error) {
    setAuthFormState({
      pending: false,
      error: formatApiError(error),
      success: null,
    });
  }
});

subscribeRoute(handleRouteEffects);
subscribeRoute(renderApp);
subscribeState(renderApp);
resetAuthFormState();
void initializeSession();
startRouter();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
