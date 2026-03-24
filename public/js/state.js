function createCatalogSectionState() {
  return {
    status: "idle",
    items: [],
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

export function clearFlashMessage() {
  updateState((state) => {
    state.ui.flash = null;
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

export function setRedirectAfterLogin(pathname) {
  updateState((state) => {
    state.session.redirectAfterLogin = pathname;
  });
}

export function clearRedirectAfterLogin() {
  updateState((state) => {
    state.session.redirectAfterLogin = null;
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
