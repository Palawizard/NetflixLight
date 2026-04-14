/**
 * returns the default shape for a catalog section (trending, genre row, etc.)
 */
function createCatalogSectionState() {
  return {
    status: "idle",
    items: [],
    error: null,
  };
}

/**
 * returns the default shape for the detail view state
 */
function createDetailState() {
  return {
    status: "idle",
    type: null,
    id: null,
    item: null,
    error: null,
  };
}

/**
 * returns the default shape for the watchlist state - includes per-item pending flags
 */
function createWatchlistState() {
  return {
    status: "idle",
    items: [],
    itemKeys: {},
    pendingKeys: {},
    lastAction: null,
    error: null,
  };
}

/**
 * returns the default shape for the watch progress state
 */
function createWatchProgressState() {
  return {
    status: "idle",
    items: [],
    itemKeys: {},
    pendingKeys: {},
    error: null,
  };
}

/**
 * returns the default shape for the viewing history state
 */
function createViewingHistoryState() {
  return {
    status: "idle",
    items: [],
    itemKeys: {},
    error: null,
  };
}

/**
 * returns the default shape for the user ratings state
 */
function createUserRatingsState() {
  return {
    status: "idle",
    items: [],
    itemKeys: {},
    pendingKeys: {},
    lastAction: null,
    error: null,
  };
}

/**
 * returns the default shape for the profiles state
 */
function createProfilesState() {
  return {
    status: "idle",
    items: [],
    activeProfileId: null,
    pending: false,
    error: null,
    lastAction: null,
  };
}

/**
 * returns the default shape for the profile overlay UI state
 */
function createProfileOverlayState() {
  return {
    isOpen: false,
    isCreateOpen: false,
  };
}

/**
 * returns the default shape for the search state
 */
function createSearchState() {
  return {
    status: "idle",
    query: "",
    page: 1,
    totalPages: 0,
    totalResults: 0,
    items: [],
    error: null,
  };
}

/**
 * returns the default shape for the genre recommendations state
 */
function createGenreRecommendationsState() {
  return {
    status: "idle",
    genre: null,
    items: [],
    error: null,
  };
}

/**
 * returns the default shape for the logout UI state
 */
function createLogoutState() {
  return {
    pending: false,
    error: null,
  };
}

export const appState = {
  session: {
    status: "idle",
    user: null,
    redirectAfterLogin: null,
  },
  hero: {
    status: "idle",
    item: null,
    error: null,
  },
  detail: createDetailState(),
  watchlist: createWatchlistState(),
  watchProgress: createWatchProgressState(),
  viewingHistory: createViewingHistoryState(),
  userRatings: createUserRatingsState(),
  profiles: createProfilesState(),
  search: createSearchState(),
  genreRecommendations: createGenreRecommendationsState(),
  catalog: {
    home: {
      trending: createCatalogSectionState(),
      moviesPopular: createCatalogSectionState(),
      tvPopular: createCatalogSectionState(),
      topRated: createCatalogSectionState(),
    },
    movies: {
      ...createCatalogSectionState(),
    },
    series: {
      ...createCatalogSectionState(),
    },
    genres: {
      action: createCatalogSectionState(),
      adventure: createCatalogSectionState(),
      animation: createCatalogSectionState(),
      comedy: createCatalogSectionState(),
      crime: createCatalogSectionState(),
      drama: createCatalogSectionState(),
      family: createCatalogSectionState(),
      fantasy: createCatalogSectionState(),
      horror: createCatalogSectionState(),
      romance: createCatalogSectionState(),
      scienceFiction: createCatalogSectionState(),
      thriller: createCatalogSectionState(),
    },
    seriesGenres: {
      actionAdventure: createCatalogSectionState(),
      animation: createCatalogSectionState(),
      comedy: createCatalogSectionState(),
      crime: createCatalogSectionState(),
      documentary: createCatalogSectionState(),
      drama: createCatalogSectionState(),
      family: createCatalogSectionState(),
      kids: createCatalogSectionState(),
      mystery: createCatalogSectionState(),
      reality: createCatalogSectionState(),
      scifiFantasy: createCatalogSectionState(),
      talk: createCatalogSectionState(),
      warPolitics: createCatalogSectionState(),
    },
  },
  ui: {
    flash: null,
    authForm: {
      pending: false,
      error: null,
      success: null,
    },
    logout: createLogoutState(),
    profileOverlay: createProfileOverlayState(),
    theme: "dark",
    language: "fr",
  },
};

const listeners = new Set();

/**
 * registers a state listener - returns an unsubscribe function
 */
export function subscribeState(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * runs a mutator against appState then notifies all listeners
 */
export function updateState(mutator) {
  mutator(appState);
  listeners.forEach((listener) => listener(appState));
}

/**
 * sets the global flash message
 */
export function setFlashMessage(message) {
  updateState((state) => {
    state.ui.flash = message;
  });
}

/**
 * merges partial auth form state
 */
export function setAuthFormState(nextAuthFormState) {
  updateState((state) => {
    state.ui.authForm = {
      ...state.ui.authForm,
      ...nextAuthFormState,
    };
  });
}

/**
 * resets the auth form to its initial idle state
 */
export function resetAuthFormState() {
  updateState((state) => {
    state.ui.authForm = {
      pending: false,
      error: null,
      success: null,
    };
  });
}

/**
 * merges partial logout UI state
 */
export function setLogoutState(nextLogoutState) {
  updateState((state) => {
    state.ui.logout = {
      ...state.ui.logout,
      ...nextLogoutState,
    };
  });
}

/**
 * resets logout UI to its initial state
 */
export function resetLogoutState() {
  updateState((state) => {
    state.ui.logout = createLogoutState();
  });
}

/**
 * merges partial session state
 */
export function setSessionState(nextSessionState) {
  updateState((state) => {
    state.session = {
      ...state.session,
      ...nextSessionState,
    };
  });
}

/**
 * merges partial movies catalog state
 */
export function setMoviesCatalogState(nextMoviesState) {
  updateState((state) => {
    state.catalog.movies = {
      ...state.catalog.movies,
      ...nextMoviesState,
    };
  });
}

/**
 * merges partial series catalog state
 */
export function setSeriesCatalogState(nextSeriesState) {
  updateState((state) => {
    state.catalog.series = {
      ...state.catalog.series,
      ...nextSeriesState,
    };
  });
}

/**
 * merges partial state into one home catalog section by key
 */
export function setHomeCatalogState(sectionKey, nextSectionState) {
  updateState((state) => {
    state.catalog.home[sectionKey] = {
      ...state.catalog.home[sectionKey],
      ...nextSectionState,
    };
  });
}

/**
 * merges partial state into one movie genre catalog section by key
 */
export function setGenreCatalogState(sectionKey, nextSectionState) {
  updateState((state) => {
    state.catalog.genres[sectionKey] = {
      ...state.catalog.genres[sectionKey],
      ...nextSectionState,
    };
  });
}

/**
 * merges partial state into one series genre catalog section by key
 */
export function setSeriesGenreCatalogState(sectionKey, nextSectionState) {
  updateState((state) => {
    state.catalog.seriesGenres[sectionKey] = {
      ...state.catalog.seriesGenres[sectionKey],
      ...nextSectionState,
    };
  });
}

/**
 * merges partial hero state
 */
export function setHeroState(nextHeroState) {
  updateState((state) => {
    state.hero = {
      ...state.hero,
      ...nextHeroState,
    };
  });
}

/**
 * merges partial detail view state
 */
export function setDetailState(nextDetailState) {
  updateState((state) => {
    state.detail = {
      ...state.detail,
      ...nextDetailState,
    };
  });
}

/**
 * merges partial watchlist state
 */
export function setWatchlistState(nextWatchlistState) {
  updateState((state) => {
    state.watchlist = {
      ...state.watchlist,
      ...nextWatchlistState,
    };
  });
}

/**
 * resets watchlist to its initial empty state
 */
export function resetWatchlistState() {
  updateState((state) => {
    state.watchlist = createWatchlistState();
  });
}

/**
 * merges partial watch progress state
 */
export function setWatchProgressState(nextWatchProgressState) {
  updateState((state) => {
    state.watchProgress = {
      ...state.watchProgress,
      ...nextWatchProgressState,
    };
  });
}

/**
 * resets watch progress to its initial empty state
 */
export function resetWatchProgressState() {
  updateState((state) => {
    state.watchProgress = createWatchProgressState();
  });
}

/**
 * merges partial viewing history state
 */
export function setViewingHistoryState(nextViewingHistoryState) {
  updateState((state) => {
    state.viewingHistory = {
      ...state.viewingHistory,
      ...nextViewingHistoryState,
    };
  });
}

/**
 * resets viewing history to its initial empty state
 */
export function resetViewingHistoryState() {
  updateState((state) => {
    state.viewingHistory = createViewingHistoryState();
  });
}

/**
 * merges partial user ratings state
 */
export function setUserRatingsState(nextUserRatingsState) {
  updateState((state) => {
    state.userRatings = {
      ...state.userRatings,
      ...nextUserRatingsState,
    };
  });
}

/**
 * resets user ratings to its initial empty state
 */
export function resetUserRatingsState() {
  updateState((state) => {
    state.userRatings = createUserRatingsState();
  });
}

/**
 * merges partial profiles state
 */
export function setProfilesState(nextProfilesState) {
  updateState((state) => {
    state.profiles = {
      ...state.profiles,
      ...nextProfilesState,
    };
  });
}

/**
 * resets profiles to its initial empty state
 */
export function resetProfilesState() {
  updateState((state) => {
    state.profiles = createProfilesState();
  });
}

/**
 * merges partial search state
 */
export function setSearchState(nextSearchState) {
  updateState((state) => {
    state.search = {
      ...state.search,
      ...nextSearchState,
    };
  });
}

/**
 * resets search to its initial empty state
 */
export function resetSearchState() {
  updateState((state) => {
    state.search = createSearchState();
  });
}

/**
 * merges partial genre recommendations state
 */
export function setGenreRecommendationsState(nextRecommendationsState) {
  updateState((state) => {
    state.genreRecommendations = {
      ...state.genreRecommendations,
      ...nextRecommendationsState,
    };
  });
}
