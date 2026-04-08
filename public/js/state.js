function createCatalogSectionState() {
  return {
    status: "idle",
    items: [],
    error: null,
  };
}

function createDetailState() {
  return {
    status: "idle",
    type: null,
    id: null,
    item: null,
    error: null,
  };
}

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
    genres: {
      action: createCatalogSectionState(),
      comedy: createCatalogSectionState(),
      horror: createCatalogSectionState(),
    },
  },
  ui: {
    flash: null,
    authForm: {
      pending: false,
      error: null,
      success: null,
    },
  },
};

const listeners = new Set();

export function subscribeState(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function updateState(mutator) {
  mutator(appState);
  listeners.forEach((listener) => listener(appState));
}

export function setFlashMessage(message) {
  updateState((state) => {
    state.ui.flash = message;
  });
}

export function setAuthFormState(nextAuthFormState) {
  updateState((state) => {
    state.ui.authForm = {
      ...state.ui.authForm,
      ...nextAuthFormState,
    };
  });
}

export function resetAuthFormState() {
  updateState((state) => {
    state.ui.authForm = {
      pending: false,
      error: null,
      success: null,
    };
  });
}

export function setSessionState(nextSessionState) {
  updateState((state) => {
    state.session = {
      ...state.session,
      ...nextSessionState,
    };
  });
}

export function setMoviesCatalogState(nextMoviesState) {
  updateState((state) => {
    state.catalog.movies = {
      ...state.catalog.movies,
      ...nextMoviesState,
    };
  });
}

export function setHomeCatalogState(sectionKey, nextSectionState) {
  updateState((state) => {
    state.catalog.home[sectionKey] = {
      ...state.catalog.home[sectionKey],
      ...nextSectionState,
    };
  });
}

export function setGenreCatalogState(sectionKey, nextSectionState) {
  updateState((state) => {
    state.catalog.genres[sectionKey] = {
      ...state.catalog.genres[sectionKey],
      ...nextSectionState,
    };
  });
}

export function setHeroState(nextHeroState) {
  updateState((state) => {
    state.hero = {
      ...state.hero,
      ...nextHeroState,
    };
  });
}

export function setDetailState(nextDetailState) {
  updateState((state) => {
    state.detail = {
      ...state.detail,
      ...nextDetailState,
    };
  });
}

export function setWatchlistState(nextWatchlistState) {
  updateState((state) => {
    state.watchlist = {
      ...state.watchlist,
      ...nextWatchlistState,
    };
  });
}

export function resetWatchlistState() {
  updateState((state) => {
    state.watchlist = createWatchlistState();
  });
}
