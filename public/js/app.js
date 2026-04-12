import { apiRequest, formatApiError } from "./api.js";
import { initializeAnimations } from "./animations.js";
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
const THEME_STORAGE_KEY = "netflixlight.theme";
const GENRE_PREFERENCES_STORAGE_KEY = "netflixlight.genrePreferences";
const ACTIVE_PROFILE_STORAGE_PREFIX = "netflixlight.activeProfile";
const DEFAULT_PROFILE_COLOR = "#fb7185";
const PROFILE_COLOR_PRESETS = [
  "#fb7185",
  "#f43f5e",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#38bdf8",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f8fafc",
];
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const FLASH_MESSAGE_TIMEOUT_MS = 3500;
const GENRE_CATALOG_BATCH_SIZE = 4;
let currentDetailRequestId = 0;
let currentSearchDebounceId = null;
let currentSearchAbortController = null;
let currentSearchRequestId = 0;
let currentGenreCatalogRequestId = 0;
let lastRenderedMarkup = "";
let scheduledRenderId = null;
let flashMessageTimeoutId = null;
let flashMessageToken = 0;
let pageAnimationSuppressionCount = 0;
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
  adventure: {
    genreId: 12,
    mediaType: "movie",
  },
  animation: {
    genreId: 16,
    mediaType: "movie",
  },
  comedy: {
    genreId: 35,
    mediaType: "movie",
  },
  crime: {
    genreId: 80,
    mediaType: "movie",
  },
  drama: {
    genreId: 18,
    mediaType: "movie",
  },
  family: {
    genreId: 10751,
    mediaType: "movie",
  },
  fantasy: {
    genreId: 14,
    mediaType: "movie",
  },
  horror: {
    genreId: 27,
    mediaType: "movie",
  },
  romance: {
    genreId: 10749,
    mediaType: "movie",
  },
  scienceFiction: {
    genreId: 878,
    mediaType: "movie",
  },
  thriller: {
    genreId: 53,
    mediaType: "movie",
  },
};
const GENRE_SECTION_KEYS = Object.keys(GENRE_SECTION_CONFIG);

const EMPTY_GENRE_RECOMMENDATION = {
  status: "empty",
  genre: null,
  items: [],
  error: null,
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
    ${renderProfileSelectionOverlay(appState)}
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

function normalizeProfileColor(value) {
  return HEX_COLOR_PATTERN.test(value)
    ? value.toLowerCase()
    : DEFAULT_PROFILE_COLOR;
}

function updateProfileColorPicker(input, nextColor = input.value) {
  const color = normalizeProfileColor(nextColor);

  input.value = color;

  const picker = input.closest("[data-profile-color-picker]");

  if (!picker) {
    return;
  }

  picker.style.setProperty("--profile-color", color);

  const valueLabel = picker.querySelector("[data-profile-color-value]");

  if (valueLabel) {
    valueLabel.textContent = color.toUpperCase();
  }

  picker.querySelectorAll("[data-profile-color-preset]").forEach((button) => {
    const isSelected =
      normalizeProfileColor(
        button.getAttribute("data-profile-color-preset")
      ) === color;

    button.setAttribute("aria-pressed", String(isSelected));
    button.classList.toggle("ring-2", isSelected);
    button.classList.toggle("ring-white", isSelected);
  });
}

function resetProfileColorPickers(container) {
  container
    .querySelectorAll("[data-profile-color-input]")
    .forEach(updateProfileColorPicker);
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
        <div class="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_minmax(20rem,34rem)_1fr]">
          <div class="lg:col-start-1 lg:row-start-1">
            <button
              type="button"
              data-nav-path="/"
              aria-label="Retourner à l'accueil"
              class="text-left text-lg font-semibold uppercase tracking-[0.25em] text-rose-400 transition hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-300"
            >
              NetflixLight
            </button>
          </div>

          <div class="flex items-center justify-end gap-2 lg:col-start-3 lg:row-start-1">
            ${renderThemeToggle()}
            ${renderHeaderMenu(currentPath)}
          </div>

          <div class="col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-full">
            ${renderSearchForm(currentSearchQuery)}
          </div>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        ${content}
      </main>
    </div>
  `;
}

function renderHeaderMenu(currentPath) {
  const isAuthenticated =
    appState.session.status === "authenticated" &&
    Boolean(appState.session.user);
  const primaryNavItems = navItems.filter(
    (item) => !guestOnlyPaths.has(item.path)
  );
  const authMenuContent = isAuthenticated
    ? renderLogoutMenuButton()
    : navItems
        .filter((item) => guestOnlyPaths.has(item.path))
        .map((item) => renderNavLink(item, currentPath))
        .join("");

  return `
    <details data-header-menu class="group relative shrink-0">
      <summary class="inline-flex cursor-pointer list-none items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 [&::-webkit-details-marker]:hidden">
        <span class="flex h-4 w-5 flex-col justify-between" aria-hidden="true">
          <span class="h-0.5 w-full origin-left rounded-full bg-current transition duration-200 group-open:translate-x-0.5 group-open:rotate-45"></span>
          <span class="h-0.5 w-full rounded-full bg-current transition duration-200 group-open:opacity-0"></span>
          <span class="h-0.5 w-full origin-left rounded-full bg-current transition duration-200 group-open:translate-x-0.5 group-open:-rotate-45"></span>
        </span>
        Menu
      </summary>

      <div data-header-menu-panel class="header-menu-panel absolute right-0 top-full z-30 mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-3xl border p-3 shadow-2xl">
        <div class="mb-3 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          ${renderSessionBadge()}
        </div>
        <nav class="grid gap-2" aria-label="Navigation principale">
          ${primaryNavItems.map((item) => renderNavLink(item, currentPath)).join("")}
          <div class="mt-2 grid gap-2 border-t border-white/10 pt-3">
            ${authMenuContent}
          </div>
        </nav>
      </div>
    </details>
  `;
}

function renderLogoutMenuButton() {
  const logoutState = appState.ui.logout;

  return `
    <button
      type="button"
      data-logout
      aria-label="Se déconnecter du compte"
      class="w-full rounded-full bg-rose-500 px-4 py-2 text-left text-sm font-medium text-white transition hover:bg-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      ${logoutState.pending ? "disabled" : ""}
    >
      ${logoutState.pending ? "Déconnexion..." : "Déconnexion"}
    </button>
  `;
}

function closeHeaderMenu() {
  appElement.querySelectorAll("[data-header-menu][open]").forEach((menu) => {
    menu.open = false;
  });
}

function renderSearchForm(currentQuery) {
  return `
    <form data-search-form class="w-full lg:max-w-lg">
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

function getStoredThemePreference() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyThemePreference(theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateState((state) => {
    state.ui.theme = theme;
  });
}

function toggleThemePreference() {
  const nextTheme = appState.ui.theme === "light" ? "dark" : "light";

  applyThemePreference(nextTheme);
}

function readStoredGenrePreferences() {
  try {
    const storedPreferences = JSON.parse(
      window.localStorage.getItem(GENRE_PREFERENCES_STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(storedPreferences)) {
      return [];
    }

    return storedPreferences
      .filter(
        (preference) =>
          preference &&
          (preference.type === "movie" || preference.type === "tv") &&
          Number.isInteger(preference.id) &&
          typeof preference.name === "string" &&
          typeof preference.score === "number"
      )
      .sort((leftPreference, rightPreference) => {
        if (rightPreference.score !== leftPreference.score) {
          return rightPreference.score - leftPreference.score;
        }

        return leftPreference.name.localeCompare(rightPreference.name, "fr");
      })
      .slice(0, 12);
  } catch {
    return [];
  }
}

function writeStoredGenrePreferences(preferences) {
  window.localStorage.setItem(
    GENRE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences.slice(0, 12))
  );
}

function rememberGenrePreferencesFromDetail(item, type, scoreIncrement = 1) {
  if (
    !(type === "movie" || type === "tv") ||
    !Array.isArray(item?.genres) ||
    item.genres.length === 0
  ) {
    return;
  }

  const preferenceMap = new Map(
    readStoredGenrePreferences().map((preference) => [
      `${preference.type}:${preference.id}`,
      preference,
    ])
  );

  item.genres.forEach((genre) => {
    if (!Number.isInteger(genre?.id) || typeof genre.name !== "string") {
      return;
    }

    const preferenceKey = `${type}:${genre.id}`;
    const existingPreference = preferenceMap.get(preferenceKey);

    preferenceMap.set(preferenceKey, {
      type,
      id: genre.id,
      name: genre.name,
      score: (existingPreference?.score || 0) + scoreIncrement,
    });
  });

  const nextPreferences = Array.from(preferenceMap.values()).sort(
    (leftPreference, rightPreference) => {
      if (rightPreference.score !== leftPreference.score) {
        return rightPreference.score - leftPreference.score;
      }

      return leftPreference.name.localeCompare(rightPreference.name, "fr");
    }
  );

  writeStoredGenrePreferences(nextPreferences);
}

function getTopGenrePreference() {
  return readStoredGenrePreferences()[0] || null;
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
      `/api/tmdb/discover?type=${topPreference.type}&genre=${topPreference.id}&page=1&language=fr-FR`
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

function renderThemeToggle() {
  const isLightTheme = appState.ui.theme === "light";
  const label = isLightTheme
    ? "Passer au thème sombre"
    : "Passer au thème clair";
  const icon = isLightTheme
    ? `
      <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
    : `
      <svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/>
        <path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;

  return `
    <button
      type="button"
      data-toggle-theme
      aria-label="${label}"
      aria-pressed="${isLightTheme ? "true" : "false"}"
      title="${label}"
      class="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
    >
      ${icon}
      <span class="sr-only">${label}</span>
    </button>
  `;
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
      aria-label="Aller vers ${item.label}"
      class="w-full rounded-full px-4 py-2 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 ${
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

function renderProfileSelectionOverlay(state) {
  const isAuthenticated =
    state.session.status === "authenticated" && Boolean(state.session.user);

  if (!isAuthenticated || !state.ui.profileOverlay?.isOpen) {
    return "";
  }

  const profilesState = state.profiles;
  const profiles = Array.isArray(profilesState.items)
    ? profilesState.items
    : [];
  const isLoading =
    profilesState.status === "idle" || profilesState.status === "loading";
  const isCreateOpen = Boolean(state.ui.profileOverlay.isCreateOpen);

  return `
    <section
      aria-modal="true"
      aria-labelledby="profile-overlay-title"
      role="dialog"
      class="fixed inset-0 z-50 overflow-y-auto bg-black/95 px-5 py-10 text-white"
    >
      <div class="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center gap-10">
        <div class="text-center">
          <p class="text-sm uppercase tracking-[0.3em] text-white/45">NetflixLight</p>
          <h2 id="profile-overlay-title" class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Qui regarde ?
          </h2>
        </div>

        ${
          profilesState.error
            ? `<p class="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">${escapeHtml(profilesState.error)}</p>`
            : ""
        }

        <div class="flex w-full flex-wrap items-center justify-center gap-5">
          ${
            isLoading
              ? Array.from(
                  { length: 4 },
                  () => `
                    <div class="h-44 w-full max-w-48 animate-pulse rounded-3xl bg-white/10 sm:w-48"></div>
                  `
                ).join("")
              : `${profiles.map(renderProfileOverlayCard).join("")}
                ${renderCreateProfileOverlayTile()}`
          }
        </div>

        ${isCreateOpen ? renderProfileOverlayCreateForm(profilesState) : ""}
      </div>
    </section>
  `;
}

function renderProfileOverlayCard(profile) {
  const profileName = escapeHtml(profile.name || "Profil");
  const avatarColor = escapeHtml(profile.avatarColor || DEFAULT_PROFILE_COLOR);

  return `
    <button
      type="button"
      data-select-profile="${profile.id}"
      class="group flex min-h-44 w-full max-w-48 flex-col items-center justify-center gap-4 rounded-3xl border border-transparent bg-white/5 p-5 text-center transition hover:border-white/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-48"
    >
      <span
        aria-hidden="true"
        class="solid-on-color grid h-24 w-24 place-items-center rounded-3xl text-4xl font-semibold text-white shadow-2xl shadow-black/30 transition group-hover:scale-105"
        style="background-color: ${avatarColor}"
      >
        ${profileName.slice(0, 1).toUpperCase()}
      </span>
      <span class="max-w-full truncate text-xl font-medium text-white/75 transition group-hover:text-white">
        ${profileName}
      </span>
    </button>
  `;
}

function renderCreateProfileOverlayTile() {
  return `
    <button
      type="button"
      data-open-profile-create
      class="group flex min-h-44 w-full max-w-48 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/25 bg-white/5 p-5 text-center transition hover:border-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-48"
    >
      <span
        aria-hidden="true"
        class="grid h-24 w-24 place-items-center rounded-3xl border border-white/25 bg-white/10 text-5xl font-light text-white/70 transition group-hover:scale-105 group-hover:text-white"
      >
        +
      </span>
      <span class="text-xl font-medium text-white/75 transition group-hover:text-white">
        Ajouter
      </span>
    </button>
  `;
}

function renderProfileOverlayCreateForm(profilesState) {
  return `
    <form data-profile-form class="grid w-full max-w-3xl gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <label class="space-y-2">
        <span class="text-sm font-medium text-white/80">Nouveau profil</span>
        <input
          type="text"
          name="profileName"
          minlength="2"
          maxlength="30"
          required
          class="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
          placeholder="Nom du profil"
        />
      </label>
      <div class="space-y-2">
        <span class="text-sm font-medium text-white/80">Couleur</span>
        ${renderProfileColorPicker("bg-black/40")}
      </div>
      <button
        type="submit"
        class="rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        ${profilesState.pending ? "disabled" : ""}
      >
        ${profilesState.pending ? "Création..." : "Créer"}
      </button>
    </form>
  `;
}

function renderProfileColorPicker(backgroundClass) {
  const presets = PROFILE_COLOR_PRESETS.map(
    (color) => `
      <button
        type="button"
        data-profile-color-preset="${color}"
        aria-label="Choisir la couleur ${color}"
        aria-pressed="${color === DEFAULT_PROFILE_COLOR ? "true" : "false"}"
        class="h-7 w-7 rounded-lg border border-white/20 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${color === DEFAULT_PROFILE_COLOR ? "ring-2 ring-white" : ""}"
        style="background-color: ${color}"
      ></button>
    `
  ).join("");

  return `
    <div
      data-profile-color-picker
      style="--profile-color: ${DEFAULT_PROFILE_COLOR}"
      class="grid gap-3 rounded-2xl border border-white/10 ${backgroundClass} p-3 transition focus-within:border-violet-400"
    >
      <div class="flex items-center gap-3">
        <span
          aria-hidden="true"
          class="h-10 w-10 shrink-0 rounded-xl border border-white/20 shadow-lg shadow-black/20"
          style="background-color: var(--profile-color)"
        ></span>
        <span class="min-w-0">
          <span class="block text-sm font-medium text-white">Couleur du profil</span>
          <span data-profile-color-value class="block text-xs uppercase tracking-[0.2em] text-white/45">${DEFAULT_PROFILE_COLOR}</span>
        </span>
      </div>

      <div class="grid grid-cols-6 gap-2">
        ${presets}
      </div>

      <label class="relative inline-flex min-h-10 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 focus-within:border-white/40">
        Autre couleur
        <input
          type="color"
          name="avatarColor"
          value="${DEFAULT_PROFILE_COLOR}"
          data-profile-color-input
          aria-label="Choisir une autre couleur de profil"
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  `;
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

function createWatchlistKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function createWatchProgressKey(type, tmdbId) {
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

function buildWatchProgressKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createWatchProgressKey(item.type, item.tmdbId), item])
  );
}

async function loadWatchProgress({ force = false } = {}) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    resetWatchProgressState();
    return;
  }

  const progressState = appState.watchProgress;

  if (
    !force &&
    (progressState.status === "loading" || progressState.status === "success")
  ) {
    return;
  }

  setWatchProgressState({
    status: "loading",
    error: null,
  });

  try {
    const response = await apiRequest("/api/watch-progress");
    const items = Array.isArray(response.items) ? response.items : [];

    setWatchProgressState({
      status: "success",
      items,
      itemKeys: buildWatchProgressKeyMap(items),
      pendingKeys: {},
      error: null,
    });
  } catch (error) {
    if (error.status === 401) {
      resetWatchProgressState();
      return;
    }

    setWatchProgressState({
      status: "error",
      error: formatApiError(error),
    });
  }
}

function createViewingHistoryKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function buildViewingHistoryKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createViewingHistoryKey(item.type, item.tmdbId), item])
  );
}

async function loadViewingHistory({ force = false } = {}) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    resetViewingHistoryState();
    return;
  }

  const historyState = appState.viewingHistory;

  if (
    !force &&
    (historyState.status === "loading" || historyState.status === "success")
  ) {
    return;
  }

  setViewingHistoryState({
    status: "loading",
    error: null,
  });

  try {
    const response = await apiRequest("/api/viewing-history");
    const items = Array.isArray(response.items) ? response.items : [];

    setViewingHistoryState({
      status: "success",
      items,
      itemKeys: buildViewingHistoryKeyMap(items),
      error: null,
    });
  } catch (error) {
    if (error.status === 401) {
      resetViewingHistoryState();
      return;
    }

    setViewingHistoryState({
      status: "error",
      error: formatApiError(error),
    });
  }
}

function createUserRatingKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function buildUserRatingKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createUserRatingKey(item.type, item.tmdbId), item])
  );
}

async function loadUserRatings({ force = false } = {}) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    resetUserRatingsState();
    return;
  }

  const ratingsState = appState.userRatings;

  if (
    !force &&
    (ratingsState.status === "loading" || ratingsState.status === "success")
  ) {
    return;
  }

  setUserRatingsState({
    status: "loading",
    error: null,
  });

  try {
    const response = await apiRequest("/api/user-ratings");
    const items = Array.isArray(response.items) ? response.items : [];

    setUserRatingsState({
      status: "success",
      items,
      itemKeys: buildUserRatingKeyMap(items),
      pendingKeys: {},
      error: null,
    });
  } catch (error) {
    if (error.status === 401) {
      resetUserRatingsState();
      return;
    }

    setUserRatingsState({
      status: "error",
      error: formatApiError(error),
    });
  }
}

function getActiveProfileStorageKey(userId) {
  return `${ACTIVE_PROFILE_STORAGE_PREFIX}.${userId}`;
}

function getStoredActiveProfileId(userId) {
  const storedProfileId = Number.parseInt(
    window.localStorage.getItem(getActiveProfileStorageKey(userId)) || "",
    10
  );

  return Number.isInteger(storedProfileId) && storedProfileId > 0
    ? storedProfileId
    : null;
}

function persistActiveProfileId(userId, profileId) {
  window.localStorage.setItem(
    getActiveProfileStorageKey(userId),
    String(profileId)
  );
}

function openProfileOverlay() {
  updateState((state) => {
    state.ui.profileOverlay.isOpen = true;
  });
}

function closeProfileOverlay() {
  updateState((state) => {
    state.ui.profileOverlay.isOpen = false;
    state.ui.profileOverlay.isCreateOpen = false;
  });
}

function openProfileCreation() {
  updateState((state) => {
    state.ui.profileOverlay.isCreateOpen = true;
  });
}

function selectActiveProfile(profileId) {
  if (
    appState.session.status !== "authenticated" ||
    !appState.session.user ||
    !Number.isInteger(profileId)
  ) {
    return;
  }

  const activeProfile = appState.profiles.items.find(
    (profile) => profile.id === profileId
  );

  if (!activeProfile) {
    return;
  }

  persistActiveProfileId(appState.session.user.id, profileId);
  setProfilesState({
    activeProfileId: profileId,
    lastAction: {
      tone: "success",
      message: `Profil actif: ${activeProfile.name}.`,
    },
  });
  closeProfileOverlay();
}

async function loadProfiles({ force = false } = {}) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    resetProfilesState();
    return;
  }

  if (
    !force &&
    (appState.profiles.status === "loading" ||
      appState.profiles.status === "success")
  ) {
    return;
  }

  setProfilesState({
    status: "loading",
    error: null,
  });

  try {
    const response = await apiRequest("/api/profiles");
    const profiles = Array.isArray(response.items) ? response.items : [];
    const storedProfileId = getStoredActiveProfileId(appState.session.user.id);
    const activeProfile =
      profiles.find((profile) => profile.id === storedProfileId) || profiles[0];

    if (activeProfile) {
      persistActiveProfileId(appState.session.user.id, activeProfile.id);
    }

    setProfilesState({
      status: "success",
      items: profiles,
      activeProfileId: activeProfile?.id || null,
      pending: false,
      error: null,
    });
  } catch (error) {
    setProfilesState({
      status: "error",
      pending: false,
      error: formatApiError(error),
    });
  }
}

async function createProfileFromForm(formData) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    setFlashMessage("Connecte-toi pour gérer les profils.");
    navigate("/login");
    return;
  }

  if (appState.profiles.pending) {
    return;
  }

  setProfilesState({
    pending: true,
    error: null,
    lastAction: null,
  });

  try {
    const response = await apiRequest("/api/profiles", {
      method: "POST",
      body: {
        name: formData.get("profileName"),
        avatarColor: formData.get("avatarColor"),
      },
    });

    const nextProfiles = response?.item
      ? [...appState.profiles.items, response.item]
      : appState.profiles.items;

    if (response?.item) {
      persistActiveProfileId(appState.session.user.id, response.item.id);
    }

    setProfilesState({
      status: "success",
      items: nextProfiles,
      activeProfileId: response?.item?.id || appState.profiles.activeProfileId,
      pending: false,
      error: null,
      lastAction: {
        tone: "success",
        message: "Profil créé et sélectionné.",
      },
    });
    closeProfileOverlay();
  } catch (error) {
    setProfilesState({
      pending: false,
      error: formatApiError(error),
      lastAction: {
        tone: "error",
        message: formatApiError(error),
      },
    });
  }
}

function buildProgressSnapshotItem(item) {
  return {
    title: item.title || item.name || "Titre inconnu",
    poster: item.poster_path || item.backdrop_path || null,
  };
}

async function saveViewingHistoryFromDetail(item, type) {
  if (
    appState.session.status !== "authenticated" ||
    !appState.session.user ||
    !item?.id ||
    !(type === "movie" || type === "tv")
  ) {
    return;
  }

  const historyKey = createViewingHistoryKey(type, item.id);
  const snapshot = buildProgressSnapshotItem(item);

  try {
    const response = await apiRequest("/api/viewing-history", {
      method: "POST",
      body: {
        type,
        tmdbId: item.id,
        title: snapshot.title,
        poster: snapshot.poster,
      },
    });

    updateState((state) => {
      if (!response?.item) {
        return;
      }

      state.viewingHistory.items = [
        response.item,
        ...state.viewingHistory.items.filter(
          (historyItem) =>
            createViewingHistoryKey(historyItem.type, historyItem.tmdbId) !==
            historyKey
        ),
      ].slice(0, 12);
      state.viewingHistory.itemKeys[historyKey] = response.item;
      state.viewingHistory.status = "success";
      state.viewingHistory.error = null;
    });
  } catch (error) {
    setViewingHistoryState({
      error: formatApiError(error),
    });
  }
}

async function setPersonalRatingFromDetail(rating) {
  if (
    appState.session.status !== "authenticated" ||
    !appState.session.user ||
    appState.detail.status !== "success" ||
    !appState.detail.item ||
    !appState.detail.type ||
    !appState.detail.id
  ) {
    const currentPath = getCurrentPath();

    setFlashMessage("Connecte-toi pour noter ce titre.");
    updateState((state) => {
      state.session.redirectAfterLogin = currentPath;
    });
    navigate("/login");
    return;
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return;
  }

  const { type, id } = appState.detail;
  const ratingKey = createUserRatingKey(type, id);

  if (appState.userRatings.pendingKeys[ratingKey]) {
    return;
  }

  updateState((state) => {
    state.userRatings.pendingKeys[ratingKey] = true;
    state.userRatings.lastAction = {
      key: ratingKey,
      tone: "neutral",
      message: "Enregistrement de ta note...",
    };
    state.userRatings.error = null;
  });

  try {
    const response = await apiRequest(`/api/user-ratings/${type}/${id}`, {
      method: "PUT",
      body: {
        rating,
      },
    });

    updateState((state) => {
      delete state.userRatings.pendingKeys[ratingKey];

      if (response?.item) {
        state.userRatings.itemKeys[ratingKey] = response.item;
        state.userRatings.items = [
          response.item,
          ...state.userRatings.items.filter(
            (item) => createUserRatingKey(item.type, item.tmdbId) !== ratingKey
          ),
        ];
      }

      state.userRatings.status = "success";
      state.userRatings.lastAction = {
        key: ratingKey,
        tone: "success",
        message: "Ta note est enregistrée.",
      };
    });
    rememberGenrePreferencesFromDetail(appState.detail.item, type, rating);
  } catch (error) {
    updateState((state) => {
      delete state.userRatings.pendingKeys[ratingKey];
      state.userRatings.lastAction = {
        key: ratingKey,
        tone: "error",
        message: formatApiError(error),
      };
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
      state.ui.profileOverlay.isOpen = false;
    });
    resetWatchlistState();
    resetWatchProgressState();
    resetViewingHistoryState();
    resetUserRatingsState();
    resetProfilesState();
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

async function loadGenreCatalogBatchItem(sectionKey) {
  const sectionConfig = GENRE_SECTION_CONFIG[sectionKey];

  try {
    const response = await apiRequest(
      `/api/tmdb/discover?type=${sectionConfig.mediaType}&genre=${sectionConfig.genreId}&page=1&language=fr-FR`
    );

    return {
      key: sectionKey,
      nextState: {
        status: "success",
        items: normalizeCatalogResults(
          response.results,
          sectionConfig.mediaType
        ),
        error: null,
      },
    };
  } catch (error) {
    return {
      key: sectionKey,
      nextState: {
        status: "error",
        items: [],
        error: formatApiError(error),
      },
    };
  }
}

async function runLimitedBatch(items, limit, task) {
  const results = [];
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        results.push(await task(item));
      }
    })
  );

  return results;
}

async function loadGenreCarousels() {
  const genreKeysToLoad = GENRE_SECTION_KEYS.filter((sectionKey) => {
    const sectionState = appState.catalog.genres[sectionKey];

    return (
      sectionState &&
      sectionState.status !== "loading" &&
      sectionState.status !== "success"
    );
  });

  if (genreKeysToLoad.length === 0) {
    return;
  }

  const requestId = ++currentGenreCatalogRequestId;

  updateState((state) => {
    genreKeysToLoad.forEach((sectionKey) => {
      state.catalog.genres[sectionKey] = {
        ...state.catalog.genres[sectionKey],
        status: "loading",
        items: [],
        error: null,
      };
    });
  });

  const results = await runLimitedBatch(
    genreKeysToLoad,
    GENRE_CATALOG_BATCH_SIZE,
    loadGenreCatalogBatchItem
  );

  if (requestId !== currentGenreCatalogRequestId) {
    return;
  }

  updateState((state) => {
    results.forEach(({ key, nextState }) => {
      state.catalog.genres[key] = {
        ...state.catalog.genres[key],
        ...nextState,
      };
    });
  });
}

function retryCatalogSection(retryKey) {
  const genreRetryPrefix = "genre-";

  if (retryKey.startsWith(genreRetryPrefix)) {
    const genreKey = retryKey.slice(genreRetryPrefix.length);

    if (GENRE_SECTION_CONFIG[genreKey]) {
      void loadGenreCatalogSection(genreKey);
    }

    return;
  }

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
    rememberGenrePreferencesFromDetail(response, type);
    void saveViewingHistoryFromDetail(response, type);
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
resetAuthFormState();
void initializeSession();
registerServiceWorker();
startRouter();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
