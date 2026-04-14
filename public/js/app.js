import { apiRequest, formatApiError } from "./api.js";
import { initializeAnimations } from "./animations.js";
import { initializeCarousels, scrollCarousel } from "./components/carousel.js";
import { initializeHeroPlayer } from "./components/hero-player.js";
import { initializeYoutubePlayer } from "./components/youtube-player.js";
import {
  appState,
  setGenreCatalogState,
  setHomeCatalogState,
  setSessionState,
  setMoviesCatalogState,
  setSeriesCatalogState,
  setHeroState,
  resetAuthFormState,
  setAuthFormState,
  resetLogoutState,
  setLogoutState,
  setFlashMessage as setFlashMessageState,
  setDetailState,
  setWatchlistState,
  resetWatchlistState,
  setWatchProgressState,
  resetWatchProgressState,
  setViewingHistoryState,
  resetViewingHistoryState,
  setUserRatingsState,
  resetUserRatingsState,
  setProfilesState,
  resetProfilesState,
  setSearchState,
  resetSearchState,
  setGenreRecommendationsState,
  setSeriesGenreCatalogState,
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
import { translateApp } from "./i18n.js";
import { createCatalogController } from "./app/catalog-controller.js";
import { registerDomEventHandlers } from "./app/dom-events-controller.js";
import { createPreferencesController } from "./app/preferences-controller.js";
import { createUserDataController } from "./app/user-data-controller.js";
import {
  EMPTY_GENRE_RECOMMENDATION,
  GENRE_CATALOG_BATCH_SIZE,
  GENRE_SECTION_CONFIG,
  GENRE_SECTION_KEYS,
  HOME_SECTION_CONFIG,
  SEARCH_DEBOUNCE_MS,
  SERIES_GENRE_SECTION_CONFIG,
  SERIES_GENRE_SECTION_KEYS,
  SUPPORTED_LANGUAGES,
  guestOnlyPaths,
  protectedPaths,
} from "./config/app-config.js";
import {
  closeHeaderMenu as closeShellHeaderMenu,
  renderFlash,
  renderProfileSelectionOverlay,
  renderSessionLoading,
  renderShell,
  resetProfileColorPickers,
  updateProfileColorPicker,
} from "./shell.js";

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
const ACTIVE_PROFILE_STORAGE_PREFIX = "netflixlight.activeProfile";
const FLASH_MESSAGE_TIMEOUT_MS = 3500;
let currentSearchDebounceId = null;
let lastRenderedMarkup = "";
let scheduledRenderId = null;
let flashMessageTimeoutId = null;
let flashMessageToken = 0;
let pageAnimationSuppressionCount = 0;

const {
  getStoredLanguagePreference,
  applyLanguagePreference,
  withTmdbLanguage,
  getStoredThemePreference,
  applyThemePreference,
  toggleThemePreference,
  rememberGenrePreferencesFromDetail,
  getTopGenrePreference,
} = createPreferencesController({
  SUPPORTED_LANGUAGES,
  appState,
  updateState,
});

const {
  loadWatchlist,
  loadWatchProgress,
  loadViewingHistory,
  loadUserRatings,
  openProfileOverlay,
  openProfileCreation,
  selectActiveProfile,
  loadProfiles,
  createProfileFromForm,
  saveViewingHistoryFromDetail,
  setPersonalRatingFromDetail,
  removeWatchlistItemFromList,
  logoutUser,
  toggleFavoriteFromDetail,
} = createUserDataController({
  ACTIVE_PROFILE_STORAGE_PREFIX,
  apiRequest,
  appState,
  formatApiError,
  getCurrentPath,
  navigate,
  rememberGenrePreferencesFromDetail,
  resetAuthFormState,
  resetLogoutState,
  resetProfilesState,
  resetUserRatingsState,
  resetViewingHistoryState,
  resetWatchProgressState,
  resetWatchlistState,
  setFlashMessage,
  setLogoutState,
  setProfilesState,
  setSessionState,
  setUserRatingsState,
  setViewingHistoryState,
  setWatchProgressState,
  setWatchlistState,
  updateState,
});

const {
  cancelActiveSearchRequest,
  loadMoviesCatalog,
  loadSeriesCatalog,
  loadSearchResults,
  normalizeCatalogResults,
  loadHomeCarousels,
  loadGenreCarousels,
  loadSeriesGenreCarousels,
  retryCatalogSection,
  loadHomeHero,
  parseDetailPath,
  loadDetailPage,
} = createCatalogController({
  GENRE_CATALOG_BATCH_SIZE,
  GENRE_SECTION_CONFIG,
  GENRE_SECTION_KEYS,
  HOME_SECTION_CONFIG,
  SERIES_GENRE_SECTION_CONFIG,
  SERIES_GENRE_SECTION_KEYS,
  apiRequest,
  appState,
  clearSearchDebounce,
  formatApiError,
  rememberGenrePreferencesFromDetail,
  resetSearchState,
  saveViewingHistoryFromDetail,
  setDetailState,
  setGenreCatalogState,
  setHeroState,
  setHomeCatalogState,
  setMoviesCatalogState,
  setSearchState,
  setSeriesCatalogState,
  setSeriesGenreCatalogState,
  updateState,
  withTmdbLanguage,
});

// renders the full shell + current view into the app element, handling session loading and route access
function renderApp() {
  const currentPath = getCurrentPath();

  if (
    appState.session.status === "idle" ||
    appState.session.status === "loading"
  ) {
    document.title = "Chargement | NetflixLight";
    commitAppMarkup(
      renderShell({
        appState,
        content: renderSessionLoading(),
        currentPath,
        currentSearchQuery: getCurrentSearchQuery(),
      })
    );
    return;
  }

  if (!ensureRouteAccess(currentPath)) {
    return;
  }

  const currentRoute = resolveView(currentPath);

  document.title = getDocumentTitle(currentPath, currentRoute);
  const nextMarkup = renderShell({
    appState,
    content: `
    ${renderFlash(appState.ui.flash)}
    ${currentRoute.render(appState)}
    ${renderProfileSelectionOverlay(appState)}
  `,
    currentPath,
    currentSearchQuery: getCurrentSearchQuery(),
  });

  commitAppMarkup(nextMarkup);
}

// writes markup to the DOM only when it changed, then runs translations, animations, and component init
function commitAppMarkup(nextMarkup) {
  if (nextMarkup === lastRenderedMarkup) {
    return;
  }

  // snapshot the live input value and cursor before the DOM is replaced -
  // the rendered HTML uses the URL query which lags behind what the user typed during debounce
  const searchInput = appElement.querySelector("#global-search");
  const hadSearchFocus = searchInput !== null && searchInput === document.activeElement;
  const liveSearchValue = hadSearchFocus ? searchInput.value : null;
  const searchSelectionStart = hadSearchFocus ? searchInput.selectionStart : null;
  const searchSelectionEnd = hadSearchFocus ? searchInput.selectionEnd : null;

  appElement.innerHTML = nextMarkup;
  lastRenderedMarkup = nextMarkup;
  translateApp(appElement, appState.ui.language);
  if (pageAnimationSuppressionCount === 0) {
    initializeAnimations(appElement);
  }
  initializeCarousels(appElement);
  initializeYoutubePlayer(appElement);
  initializeHeroPlayer(appElement);

  // restore the live value (not the URL-derived one), then focus and cursor position
  if (hadSearchFocus) {
    const newSearchInput = appElement.querySelector("#global-search");
    if (newSearchInput) {
      newSearchInput.value = liveSearchValue;
      newSearchInput.focus();
      newSearchInput.setSelectionRange(searchSelectionStart, searchSelectionEnd);
    }
  }
}

// batches render calls into a single requestAnimationFrame so multiple state updates only render once
function scheduleRenderApp() {
  if (scheduledRenderId !== null) {
    return;
  }

  scheduledRenderId = window.requestAnimationFrame(() => {
    scheduledRenderId = null;
    renderApp();
  });
}

/**
 * runs an action with entry animations disabled, then re-enables them after the next frame -
 * used for in-place state updates like toggling a favorite that should not animate the whole page
 */
function runWithoutPageAnimations(action) {
  pageAnimationSuppressionCount += 1;

  let result;

  try {
    result = action();
  } catch (error) {
    pageAnimationSuppressionCount = Math.max(
      0,
      pageAnimationSuppressionCount - 1
    );
    throw error;
  }

  return Promise.resolve(result).finally(() => {
    window.requestAnimationFrame(() => {
      pageAnimationSuppressionCount = Math.max(
        0,
        pageAnimationSuppressionCount - 1
      );
    });
  });
}

/**
 * resolves the browser tab title for the given path - uses search query, detail item title,
 * or the current route title as fallback
 */
function getDocumentTitle(currentPath, currentRoute) {
  if (currentPath === "/search" && appState.search.query) {
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

// cancels any pending search debounce timeout
function clearSearchDebounce() {
  if (currentSearchDebounceId !== null) {
    window.clearTimeout(currentSearchDebounceId);
    currentSearchDebounceId = null;
  }
}

// resets the debounce timer and runs callback after the configured delay
function scheduleSearchDebounce(callback) {
  clearSearchDebounce();
  currentSearchDebounceId = window.setTimeout(callback, SEARCH_DEBOUNCE_MS);
}

// fetches recommendations for the user's top genre preference and updates the home section state
async function loadGenreRecommendations({ force = false } = {}) {
  const topPreference = getTopGenrePreference();

  if (!topPreference) {
    setGenreRecommendationsState(EMPTY_GENRE_RECOMMENDATION);
    return;
  }

  const recommendationsState = appState.genreRecommendations;
  const isSameGenre =
    recommendationsState.genre?.type === topPreference.type &&
    recommendationsState.genre?.id === topPreference.id;

  if (
    !force &&
    isSameGenre &&
    (recommendationsState.status === "loading" ||
      recommendationsState.status === "success")
  ) {
    return;
  }

  setGenreRecommendationsState({
    status: "loading",
    genre: topPreference,
    items: [],
    error: null,
  });

  try {
    const response = await apiRequest(
      withTmdbLanguage(
        `api/tmdb/discover?type=${topPreference.type}&genre=${topPreference.id}&page=1`
      )
    );

    setGenreRecommendationsState({
      status: "success",
      genre: topPreference,
      items: normalizeCatalogResults(response.results, topPreference.type),
      error: null,
    });
  } catch (error) {
    setGenreRecommendationsState({
      status: "error",
      genre: topPreference,
      items: [],
      error: formatApiError(error),
    });
  }
}

/**
 * reads the current q param from the hash search string and returns it trimmed, or an empty string
 */
function getCurrentSearchQuery() {
  return getCurrentSearchParams().get("q")?.trim() || "";
}

/**
 * reads the page param from the hash search string and returns a valid positive integer, defaulting to 1
 */
function getCurrentSearchPage() {
  const rawPage = getCurrentSearchParams().get("page");
  const parsedPage = Number.parseInt(rawPage || "1", 10);

  if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
    return 1;
  }

  return parsedPage;
}

// shows a flash message and auto-clears it after the timeout, cancelling any previously scheduled clear
function setFlashMessage(message) {
  flashMessageToken += 1;
  const currentToken = flashMessageToken;

  if (flashMessageTimeoutId !== null) {
    window.clearTimeout(flashMessageTimeoutId);
    flashMessageTimeoutId = null;
  }

  setFlashMessageState(message);

  if (!message) {
    return;
  }

  flashMessageTimeoutId = window.setTimeout(() => {
    if (currentToken === flashMessageToken) {
      setFlashMessageState(null);
      flashMessageTimeoutId = null;
    }
  }, FLASH_MESSAGE_TIMEOUT_MS);
}

// redirects unauthenticated users away from protected paths and authenticated users away from guest-only paths
function ensureRouteAccess(currentPath) {
  const isAuthenticated =
    appState.session.status === "authenticated" &&
    Boolean(appState.session.user);

  if (!isAuthenticated && protectedPaths.has(currentPath)) {
    appState.session.redirectAfterLogin = currentPath;
    setFlashMessage("Connecte-toi pour accéder à cette page.");
    navigate("/login");
    return false;
  }

  if (isAuthenticated && guestOnlyPaths.has(currentPath)) {
    navigate("/profile");
    return false;
  }

  return true;
}

// checks the server session and sets the auth state to authenticated or guest on startup
async function initializeSession() {
  setSessionState({
    status: "loading",
    user: null,
  });

  try {
    const response = await apiRequest("api/auth/me");

    setSessionState({
      status: "authenticated",
      user: response.user,
    });
    void loadProfiles();
  } catch (error) {
    if (error.status !== 401) {
      setFlashMessage("Impossible de charger ton espace.");
    }

    setSessionState({
      status: "guest",
      user: null,
    });
    resetWatchlistState();
    resetWatchProgressState();
    resetViewingHistoryState();
    resetUserRatingsState();
    resetProfilesState();
  }
}

// triggers all data loads needed for the new route whenever navigation occurs
function handleRouteEffects(currentPath) {
  const canLoadProfileScopedData =
    appState.session.status === "authenticated" &&
    Number.isInteger(appState.profiles.activeProfileId);

  if (
    appState.session.status === "authenticated" &&
    (appState.profiles.status === "idle" ||
      appState.profiles.status === "error")
  ) {
    void loadProfiles();
  }

  if (
    canLoadProfileScopedData &&
    (appState.watchlist.status === "idle" ||
      appState.watchlist.status === "error")
  ) {
    void loadWatchlist();
  }

  if (
    canLoadProfileScopedData &&
    (appState.watchProgress.status === "idle" ||
      appState.watchProgress.status === "error")
  ) {
    void loadWatchProgress();
  }

  if (
    canLoadProfileScopedData &&
    (appState.viewingHistory.status === "idle" ||
      appState.viewingHistory.status === "error")
  ) {
    void loadViewingHistory();
  }

  if (
    canLoadProfileScopedData &&
    (appState.userRatings.status === "idle" ||
      appState.userRatings.status === "error")
  ) {
    void loadUserRatings();
  }

  if (currentPath === "/") {
    void loadHomeHero();
    loadHomeCarousels();
    void loadGenreRecommendations();
  }

  if (currentPath === "/movies") {
    void loadMoviesCatalog();
    void loadGenreCarousels();
  }

  if (currentPath === "/series") {
    void loadSeriesCatalog();
    void loadSeriesGenreCarousels();
  }

  if (currentPath === "/favorites" && canLoadProfileScopedData) {
    void loadWatchlist();
  }

  if (parseDetailPath(currentPath)) {
    void loadDetailPage(currentPath);
  }

  if (currentPath === "/search") {
    void loadSearchResults(getCurrentSearchQuery(), getCurrentSearchPage());
    return;
  }

  clearSearchDebounce();
  cancelActiveSearchRequest();
  if (appState.search.status !== "idle") {
    resetSearchState();
  }
}

// registers the service worker in production and cleans up any existing registrations on localhost
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister())
          )
        )
        .catch((error) => {
          console.warn("Service worker cleanup failed", error);
        });

      if ("caches" in window) {
        window.caches
          .keys()
          .then((cacheNames) =>
            Promise.all(
              cacheNames
                .filter((cacheName) => cacheName.startsWith("netflixlight-"))
                .map((cacheName) => window.caches.delete(cacheName))
            )
          )
          .catch((error) => {
            console.warn("Service worker cache cleanup failed", error);
          });
      }
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

registerDomEventHandlers({
  apiRequest,
  appElement,
  appState,
  applyLanguagePreference,
  clearSearchDebounce,
  closeHeaderMenu,
  createProfileFromForm,
  formatApiError,
  getCurrentPath,
  getCurrentSearchQuery,
  loadDetailPage,
  loadHomeHero,
  loadProfiles,
  loadUserRatings,
  loadViewingHistory,
  loadWatchProgress,
  loadWatchlist,
  logoutUser,
  navigate,
  openProfileCreation,
  openProfileOverlay,
  removeWatchlistItemFromList,
  resetAuthFormState,
  resetProfileColorPickers,
  retryCatalogSection,
  runWithoutPageAnimations,
  scheduleSearchDebounce,
  scrollCarousel,
  selectActiveProfile,
  setAuthFormState,
  setDetailState,
  setFlashMessage,
  setHeroState,
  setPersonalRatingFromDetail,
  toggleFavoriteFromDetail,
  toggleThemePreference,
  updateProfileColorPicker,
  updateState,
});

subscribeRoute(handleRouteEffects);
subscribeRoute(() => {
  lastRenderedMarkup = "";
  renderApp();
});
subscribeState(scheduleRenderApp);
applyThemePreference(getStoredThemePreference());
applyLanguagePreference(getStoredLanguagePreference());
resetAuthFormState();
void initializeSession();
registerServiceWorker();
startRouter();

// closes the shell header menu by passing the app element
function closeHeaderMenu() {
  closeShellHeaderMenu(appElement);
}
