const THEME_STORAGE_KEY = "netflixlight.theme";
const LANGUAGE_STORAGE_KEY = "netflixlight.language";
const GENRE_PREFERENCES_STORAGE_KEY = "netflixlight.genrePreferences";

function createPreferencesController(dependencies) {
  const { SUPPORTED_LANGUAGES, appState, updateState } = dependencies;

  function getStoredLanguagePreference() {
    try {
      const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

      return SUPPORTED_LANGUAGES.has(storedLanguage) ? storedLanguage : "fr";
    } catch {
      return "fr";
    }
  }

  function setStoredLanguagePreference(language) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }

  function applyLanguagePreference(language, { reload = false } = {}) {
    const nextLanguage = SUPPORTED_LANGUAGES.has(language) ? language : "fr";
    const shouldReload = reload && nextLanguage !== appState.ui.language;

    updateState((state) => {
      state.ui.language = nextLanguage;
    });
    setStoredLanguagePreference(nextLanguage);

    if (shouldReload) {
      window.location.reload();
    }
  }

  function getTmdbLanguageCode() {
    return appState.ui.language === "en" ? "en-US" : "fr-FR";
  }

  function withTmdbLanguage(url) {
    const urlWithoutLanguage = url
      .replace(/([?&])language=[^&]+&?/, "$1")
      .replace(/[?&]$/, "");
    const separator = urlWithoutLanguage.includes("?") ? "&" : "?";

    return `${urlWithoutLanguage}${separator}language=${getTmdbLanguageCode()}`;
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

  return {
    getStoredLanguagePreference,
    applyLanguagePreference,
    withTmdbLanguage,
    getStoredThemePreference,
    applyThemePreference,
    toggleThemePreference,
    rememberGenrePreferencesFromDetail,
    getTopGenrePreference,
  };
}

export { createPreferencesController };
