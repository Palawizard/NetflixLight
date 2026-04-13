import { apiRequest, formatApiError } from "./api.js";
import { initializeAnimations } from "./animations.js";
import { initializeCarousels, scrollCarousel } from "./components/carousel.js";
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

function commitAppMarkup(nextMarkup) {
  if (nextMarkup === lastRenderedMarkup) {
    return;
  }

  appElement.innerHTML = nextMarkup;
  lastRenderedMarkup = nextMarkup;
  translateApp(appElement, appState.ui.language);
  if (pageAnimationSuppressionCount === 0) {
    initializeAnimations(appElement);
  }
  initializeCarousels(appElement);
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

function clearSearchDebounce() {
  if (currentSearchDebounceId !== null) {
    window.clearTimeout(currentSearchDebounceId);
    currentSearchDebounceId = null;
  }
}

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
        `/api/tmdb/discover?type=${topPreference.type}&genre=${topPreference.id}&page=1`
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

    setSessionState({
      status: "authenticated",
      user: response.user,
    });
    void loadWatchlist();
    void loadWatchProgress();
    void loadViewingHistory();
    void loadUserRatings();
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

function handleRouteEffects(currentPath) {
  if (
    appState.session.status === "authenticated" &&
    (appState.watchlist.status === "idle" ||
      appState.watchlist.status === "error")
  ) {
    void loadWatchlist();
  }

  if (
    appState.session.status === "authenticated" &&
    (appState.watchProgress.status === "idle" ||
      appState.watchProgress.status === "error")
  ) {
    void loadWatchProgress();
  }

  if (
    appState.session.status === "authenticated" &&
    (appState.viewingHistory.status === "idle" ||
      appState.viewingHistory.status === "error")
  ) {
    void loadViewingHistory();
  }

  if (
    appState.session.status === "authenticated" &&
    (appState.userRatings.status === "idle" ||
      appState.userRatings.status === "error")
  ) {
    void loadUserRatings();
  }

  if (
    appState.session.status === "authenticated" &&
    (appState.profiles.status === "idle" ||
      appState.profiles.status === "error")
  ) {
    void loadProfiles();
  }

  if (currentPath === "/") {
    void loadHomeHero();
    loadHomeCarousels();
    void loadGenreRecommendations();
  }

  if (currentPath === "/films") {
    void loadMoviesCatalog();
    void loadGenreCarousels();
  }

  if (currentPath === "/series") {
    void loadSeriesCatalog();
    void loadSeriesGenreCarousels();
  }

  if (currentPath === "/favoris") {
    void loadWatchlist();
  }

  if (parseDetailPath(currentPath)) {
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
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-header-menu]")) {
    closeHeaderMenu();
  }

  const colorPresetButton = event.target.closest("[data-profile-color-preset]");

  if (colorPresetButton) {
    const picker = colorPresetButton.closest("[data-profile-color-picker]");
    const colorInput = picker?.querySelector("[data-profile-color-input]");

    if (colorInput) {
      updateProfileColorPicker(
        colorInput,
        colorPresetButton.getAttribute("data-profile-color-preset")
      );
    }
    return;
  }

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
      void runWithoutPageAnimations(() =>
        removeWatchlistItemFromList(type, tmdbId)
      );
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
    void runWithoutPageAnimations(toggleFavoriteFromDetail);
    return;
  }

  const ratingButton = event.target.closest("[data-set-rating]");

  if (ratingButton) {
    const rating = Number.parseInt(
      ratingButton.getAttribute("data-set-rating") || "",
      10
    );

    void runWithoutPageAnimations(() => setPersonalRatingFromDetail(rating));
    return;
  }

  const profileButton = event.target.closest("[data-select-profile]");

  if (profileButton) {
    const profileId = Number.parseInt(
      profileButton.getAttribute("data-select-profile") || "",
      10
    );

    selectActiveProfile(profileId);
    return;
  }

  const profileCreateButton = event.target.closest(
    "[data-open-profile-create]"
  );

  if (profileCreateButton) {
    openProfileCreation();
    return;
  }

  const themeToggleButton = event.target.closest("[data-toggle-theme]");

  if (themeToggleButton) {
    toggleThemePreference();
    return;
  }

  const languageButton = event.target.closest("[data-set-language]");

  if (languageButton) {
    applyLanguagePreference(languageButton.getAttribute("data-set-language"), {
      reload: true,
    });
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

  closeHeaderMenu();
  navigate(targetPath);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHeaderMenu();
  }
});

document.addEventListener("input", (event) => {
  const colorInput = event.target.closest("[data-profile-color-input]");

  if (colorInput) {
    updateProfileColorPicker(colorInput);
    return;
  }

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
      closeHeaderMenu();
      return;
    }

    navigate(`/recherche?q=${encodeURIComponent(searchQuery)}&page=1`);
    closeHeaderMenu();
    return;
  }

  const profileForm = event.target.closest("[data-profile-form]");

  if (profileForm) {
    event.preventDefault();
    await createProfileFromForm(new FormData(profileForm));
    profileForm.reset();
    resetProfileColorPickers(profileForm);
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
      await loadWatchProgress({ force: true });
      await loadViewingHistory({ force: true });
      await loadUserRatings({ force: true });
      await loadProfiles({ force: true });
      resetAuthFormState();
      openProfileOverlay();
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
applyThemePreference(getStoredThemePreference());
applyLanguagePreference(getStoredLanguagePreference());
resetAuthFormState();
void initializeSession();
registerServiceWorker();
startRouter();

function closeHeaderMenu() {
  closeShellHeaderMenu(appElement);
}
