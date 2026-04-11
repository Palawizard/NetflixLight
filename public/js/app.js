import { apiRequest, formatApiError } from "./api.js";
import { initializeCarousels, scrollCarousel } from "./components/carousel.js";
import { initializePlayers } from "./player-controls.js";
import {
  appState,
  setGenreCatalogState,
  setHomeCatalogState,
  setSessionState,
  setMoviesCatalogState,
  setHeroState,
  resetAuthFormState,
  setAuthFormState,
  resetLogoutState,
  setLogoutState,
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
let lastRenderedMarkup = "";
let scheduledRenderId = null;
const HOME_SECTION_CONFIG = {
  trending: {
    endpoint:
      "/api/tmdb/trending?media_type=all&time_window=week&language=fr-FR",
  },
  moviesPopular: {
    endpoint: "/api/tmdb/movies/popular?language=fr-FR",
    mediaType: "movie",
  },
  tvPopular: {
    endpoint: "/api/tmdb/tv/popular?language=fr-FR",
    mediaType: "tv",
  },
  topRated: {
    endpoint: "/api/tmdb/movies/top-rated?language=fr-FR",
    mediaType: "movie",
  },
};
const GENRE_SECTION_CONFIG = {
  action: {
    genreId: 28,
    mediaType: "movie",
  },
  comedy: {
    genreId: 35,
    mediaType: "movie",
  },
  horror: {
    genreId: 27,
    mediaType: "movie",
  },
};

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
    commitAppMarkup(renderShell(renderSessionLoading(), currentPath));
    return;
  }

  if (!ensureRouteAccess(currentPath)) {
    return;
  }

  const currentRoute = resolveView(currentPath);

  document.title = getDocumentTitle(currentPath, currentRoute);
  const nextMarkup = renderShell(
    `
    ${renderFlash(appState.ui.flash)}
    ${currentRoute.render(appState)}
  `,
    currentPath
  );

  commitAppMarkup(nextMarkup);
}

function commitAppMarkup(nextMarkup) {
  if (nextMarkup === lastRenderedMarkup) {
    return;
  }

  appElement.innerHTML = nextMarkup;
  lastRenderedMarkup = nextMarkup;
  initializeCarousels(appElement);
  initializePlayers(appElement);
}

function scheduleRenderApp() {
  if (scheduledRenderId !== null) {
    return;
  }

  scheduledRenderId = window.requestAnimationFrame(() => {
    scheduledRenderId = null;
    renderApp();
  });
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
        <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap items-center justify-between gap-4">
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
            <nav class="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            ${navItems.map((item) => renderNavLink(item, currentPath)).join("")}
            </nav>
          </div>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        ${content}
      </main>
    </div>
  `;
}

function renderSearchForm(currentQuery) {
  return `
    <form data-search-form class="w-full lg:max-w-md">
      <label class="sr-only" for="global-search">Rechercher un film ou une série</label>
      <div class="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:rounded-full sm:py-2">
        <input
          id="global-search"
          type="search"
          name="query"
          value="${escapeHtml(currentQuery)}"
          placeholder="Rechercher un film ou une série"
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

function getCurrentSearchPage() {
  const rawPage = getCurrentSearchParams().get("page");
  const parsedPage = Number.parseInt(rawPage || "1", 10);

  if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
    return 1;
  }

  return parsedPage;
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
          On prépare ton espace.
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
    appState.ui.flash = "Connecte-toi pour accéder à cette page.";
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

function sortWatchlistItemsByAddedAt(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice().sort((leftItem, rightItem) => {
    const leftTime = Date.parse(leftItem.addedAt || "");
    const rightTime = Date.parse(rightItem.addedAt || "");
    const normalizedLeftTime = Number.isNaN(leftTime) ? 0 : leftTime;
    const normalizedRightTime = Number.isNaN(rightTime) ? 0 : rightTime;

    if (normalizedLeftTime !== normalizedRightTime) {
      return normalizedRightTime - normalizedLeftTime;
    }

    return rightItem.tmdbId - leftItem.tmdbId;
  });
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
    const items = sortWatchlistItemsByAddedAt(response.items);

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

async function removeWatchlistItemFromList(type, tmdbId) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    setFlashMessage("Connecte-toi pour gérer tes favoris.");
    navigate("/login");
    return;
  }

  const watchlistKey = createWatchlistKey(type, tmdbId);
  const isPending = Boolean(appState.watchlist.pendingKeys[watchlistKey]);
  const existingItem = appState.watchlist.items.find(
    (watchlistItem) =>
      createWatchlistKey(watchlistItem.type, watchlistItem.tmdbId) ===
      watchlistKey
  );

  if (isPending || !existingItem) {
    return;
  }

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
      message: "Suppression du favori...",
    };
    state.watchlist.error = null;
  });

  try {
    await apiRequest(`/api/watchlist/${type}/${tmdbId}`, {
      method: "DELETE",
    });

    updateState((state) => {
      delete state.watchlist.pendingKeys[watchlistKey];
      state.watchlist.lastAction = {
        key: watchlistKey,
        tone: "success",
        message: "Titre supprimé des favoris.",
      };
    });
  } catch (error) {
    if (error.status === 404) {
      updateState((state) => {
        delete state.watchlist.pendingKeys[watchlistKey];
        state.watchlist.lastAction = {
          key: watchlistKey,
          tone: "success",
          message: "Titre supprimé des favoris.",
        };
      });
      return;
    }

    updateState((state) => {
      state.watchlist.items = sortWatchlistItemsByAddedAt([
        existingItem,
        ...state.watchlist.items.filter(
          (watchlistItem) =>
            createWatchlistKey(watchlistItem.type, watchlistItem.tmdbId) !==
            watchlistKey
        ),
      ]);
      state.watchlist.itemKeys[watchlistKey] = true;
      delete state.watchlist.pendingKeys[watchlistKey];
      state.watchlist.lastAction = {
        key: watchlistKey,
        tone: "error",
        message: formatApiError(error),
      };
    });
  }
}

async function logoutUser() {
  if (appState.ui.logout.pending) {
    return;
  }

  setLogoutState({
    pending: true,
    error: null,
  });

  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });

    updateState((state) => {
      state.session.status = "guest";
      state.session.user = null;
      state.session.redirectAfterLogin = null;
    });
    resetWatchlistState();
    resetAuthFormState();
    resetLogoutState();
    setFlashMessage("Tu es déconnecté.");
    navigate("/");
  } catch (error) {
    setLogoutState({
      pending: false,
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

    setFlashMessage("Connecte-toi pour gérer tes favoris.");
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
          message: "Retiré des favoris.",
        };
      });
    } catch (error) {
      if (error.status === 404) {
        updateState((state) => {
          delete state.watchlist.pendingKeys[watchlistKey];
          state.watchlist.lastAction = {
            key: watchlistKey,
            tone: "success",
            message: "Retiré des favoris.",
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
      state.watchlist.items = sortWatchlistItemsByAddedAt([
        savedItem,
        ...state.watchlist.items.filter(
          (watchlistItem) =>
            createWatchlistKey(watchlistItem.type, watchlistItem.tmdbId) !==
            watchlistKey
        ),
      ]);
      state.watchlist.itemKeys[watchlistKey] = true;
      delete state.watchlist.pendingKeys[watchlistKey];
      state.watchlist.lastAction = {
        key: watchlistKey,
        tone: "success",
        message: "Ajouté aux favoris.",
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
          message: "Déjà présent dans les favoris.",
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
      items: normalizeCatalogResults(response.results, "movie"),
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

async function loadSearchResults(searchQuery, page = 1) {
  const normalizedQuery =
    typeof searchQuery === "string" ? searchQuery.trim() : "";
  const normalizedPage =
    Number.isInteger(page) && page > 0 ? page : Number.parseInt(page, 10) || 1;

  clearSearchDebounce();

  if (!normalizedQuery) {
    cancelActiveSearchRequest();
    resetSearchState();
    return;
  }

  if (
    appState.search.status === "loading" &&
    appState.search.query === normalizedQuery &&
    appState.search.page === normalizedPage
  ) {
    return;
  }

  if (
    appState.search.status === "success" &&
    appState.search.query === normalizedQuery &&
    appState.search.page === normalizedPage
  ) {
    return;
  }

  setSearchState({
    status: "loading",
    query: normalizedQuery,
    page: normalizedPage,
    totalPages: 0,
    totalResults: 0,
    items: [],
    error: null,
  });

  cancelActiveSearchRequest();
  const requestId = currentSearchRequestId + 1;
  currentSearchRequestId = requestId;
  currentSearchAbortController = new AbortController();

  try {
    const response = await apiRequest(
      `/api/tmdb/search?q=${encodeURIComponent(normalizedQuery)}&page=${normalizedPage}&language=fr-FR`,
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
      page:
        Number.isInteger(response?.page) && response.page > 0
          ? response.page
          : normalizedPage,
      totalPages:
        Number.isInteger(response?.total_pages) && response.total_pages > 0
          ? response.total_pages
          : 0,
      totalResults:
        Number.isInteger(response?.total_results) && response.total_results >= 0
          ? response.total_results
          : normalizeSearchResults(response?.results).length,
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
      page: normalizedPage,
      totalPages: 0,
      totalResults: 0,
      items: [],
      error: formatApiError(error),
    });
  }
}

function normalizeCatalogResults(results, fallbackMediaType = null) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .filter((item) => item && Number.isInteger(item.id))
    .map((item) => ({
      ...item,
      media_type:
        item.media_type === "movie" || item.media_type === "tv"
          ? item.media_type
          : fallbackMediaType,
    }));
}

async function loadHomeCatalogSection(sectionKey) {
  const sectionState = appState.catalog.home[sectionKey];
  const sectionConfig = HOME_SECTION_CONFIG[sectionKey];

  if (
    !sectionConfig ||
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
    const response = await apiRequest(sectionConfig.endpoint);

    setHomeCatalogState(sectionKey, {
      status: "success",
      items: normalizeCatalogResults(
        response.results,
        sectionConfig.mediaType || null
      ),
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
  void loadHomeCatalogSection("trending");
  void loadHomeCatalogSection("moviesPopular");
  void loadHomeCatalogSection("tvPopular");
  void loadHomeCatalogSection("topRated");
}

async function loadGenreCatalogSection(sectionKey) {
  const sectionState = appState.catalog.genres[sectionKey];
  const sectionConfig = GENRE_SECTION_CONFIG[sectionKey];

  if (
    !sectionConfig ||
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
      `/api/tmdb/discover?type=movie&genre=${sectionConfig.genreId}&page=1`
    );

    setGenreCatalogState(sectionKey, {
      status: "success",
      items: normalizeCatalogResults(response.results, sectionConfig.mediaType),
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
  void loadGenreCatalogSection("action");
  void loadGenreCatalogSection("comedy");
  void loadGenreCatalogSection("horror");
}

function retryCatalogSection(retryKey) {
  switch (retryKey) {
    case "home-trending":
      void loadHomeCatalogSection("trending");
      return;
    case "home-movies-popular":
      void loadHomeCatalogSection("moviesPopular");
      return;
    case "home-tv-popular":
      void loadHomeCatalogSection("tvPopular");
      return;
    case "home-top-rated":
      void loadHomeCatalogSection("topRated");
      return;
    case "movies-popular":
      void loadMoviesCatalog();
      return;
    case "genre-action":
      void loadGenreCatalogSection("action");
      return;
    case "genre-comedy":
      void loadGenreCatalogSection("comedy");
      return;
    case "genre-horror":
      void loadGenreCatalogSection("horror");
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

function parsePlayerPath(pathname) {
  const playerMatch = pathname.match(/^\/lecture\/(movie|tv)\/(\d+)$/);

  if (!playerMatch) {
    return null;
  }

  return {
    type: playerMatch[1],
    id: Number.parseInt(playerMatch[2], 10),
  };
}

async function loadDetailPage(pathname) {
  const detailRoute = parseDetailPath(pathname) || parsePlayerPath(pathname);

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

  if (currentPath === "/favoris") {
    void loadWatchlist();
  }

  if (parseDetailPath(currentPath)) {
    void loadDetailPage(currentPath);
  }

  if (parsePlayerPath(currentPath)) {
    void loadDetailPage(currentPath);
  }

  if (currentPath === "/recherche") {
    void loadSearchResults(getCurrentSearchQuery(), getCurrentSearchPage());
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

  const retryWatchlistButton = event.target.closest("[data-retry-watchlist]");

  if (retryWatchlistButton) {
    void loadWatchlist({ force: true });
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

  const removeWatchlistButton = event.target.closest("[data-remove-watchlist]");

  if (removeWatchlistButton) {
    const type = removeWatchlistButton.getAttribute("data-watchlist-type");
    const tmdbId = Number.parseInt(
      removeWatchlistButton.getAttribute("data-watchlist-id") || "",
      10
    );

    if ((type === "movie" || type === "tv") && Number.isInteger(tmdbId)) {
      void removeWatchlistItemFromList(type, tmdbId);
    }
    return;
  }

  const logoutButton = event.target.closest("[data-logout]");

  if (logoutButton) {
    void logoutUser();
    return;
  }

  const favoriteToggleButton = event.target.closest("[data-toggle-favorite]");

  if (favoriteToggleButton) {
    void toggleFavoriteFromDetail();
    return;
  }

  const searchPageButton = event.target.closest("[data-search-page]");

  if (searchPageButton) {
    const nextPage = Number.parseInt(
      searchPageButton.getAttribute("data-search-page") || "",
      10
    );
    const currentQuery = getCurrentSearchQuery();

    if (currentQuery && Number.isInteger(nextPage) && nextPage > 0) {
      navigate(
        `/recherche?q=${encodeURIComponent(currentQuery)}&page=${nextPage}`
      );
    }
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

    navigate(`/recherche?q=${encodeURIComponent(searchQuery)}&page=1`);
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

    navigate(`/recherche?q=${encodeURIComponent(searchQuery)}&page=1`);
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
      setFlashMessage("Connexion réussie.");
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
        success: "Compte créé. Tu peux maintenant te connecter.",
      });
      setFlashMessage("Compte créé avec succès.");
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
subscribeRoute(() => {
  lastRenderedMarkup = "";
  renderApp();
});
subscribeState(scheduleRenderApp);
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
