function createCatalogController(dependencies) {
  const {
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
  } = dependencies;

  let currentDetailRequestId = 0;
  let currentSearchAbortController = null;
  let currentSearchRequestId = 0;
  let currentGenreCatalogRequestId = 0;
  let currentSeriesGenreCatalogRequestId = 0;

  function cancelActiveSearchRequest() {
    if (currentSearchAbortController) {
      currentSearchAbortController.abort();
      currentSearchAbortController = null;
    }
  }

  function isAbortError(error) {
    return error?.name === "AbortError";
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
        withTmdbLanguage("/api/tmdb/movies/popular")
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

  async function loadSeriesCatalog() {
    if (
      appState.catalog.series.status === "loading" ||
      appState.catalog.series.status === "success"
    ) {
      return;
    }

    setSeriesCatalogState({
      status: "loading",
      error: null,
    });

    try {
      const response = await apiRequest(
        withTmdbLanguage("/api/tmdb/tv/popular")
      );

      setSeriesCatalogState({
        status: "success",
        items: normalizeCatalogResults(response.results, "tv"),
        error: null,
      });
    } catch (error) {
      setSeriesCatalogState({
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
      Number.isInteger(page) && page > 0
        ? page
        : Number.parseInt(page, 10) || 1;

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
        withTmdbLanguage(
          `/api/tmdb/search?q=${encodeURIComponent(normalizedQuery)}&page=${normalizedPage}`
        ),
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
          Number.isInteger(response?.total_results) &&
          response.total_results >= 0
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
      const response = await apiRequest(
        withTmdbLanguage(sectionConfig.endpoint)
      );

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
        withTmdbLanguage(
          `/api/tmdb/discover?type=movie&genre=${sectionConfig.genreId}&page=1`
        )
      );

      setGenreCatalogState(sectionKey, {
        status: "success",
        items: normalizeCatalogResults(
          response.results,
          sectionConfig.mediaType
        ),
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
        withTmdbLanguage(
          `/api/tmdb/discover?type=${sectionConfig.mediaType}&genre=${sectionConfig.genreId}&page=1`
        )
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

  async function loadSeriesGenreCatalogSection(sectionKey) {
    const sectionState = appState.catalog.seriesGenres[sectionKey];
    const sectionConfig = SERIES_GENRE_SECTION_CONFIG[sectionKey];

    if (
      !sectionConfig ||
      !sectionState ||
      sectionState.status === "loading" ||
      sectionState.status === "success"
    ) {
      return;
    }

    setSeriesGenreCatalogState(sectionKey, {
      status: "loading",
      items: [],
      error: null,
    });

    try {
      const response = await apiRequest(
        withTmdbLanguage(
          `/api/tmdb/discover?type=tv&genre=${sectionConfig.genreId}&page=1`
        )
      );

      setSeriesGenreCatalogState(sectionKey, {
        status: "success",
        items: normalizeCatalogResults(
          response.results,
          sectionConfig.mediaType
        ),
        error: null,
      });
    } catch (error) {
      setSeriesGenreCatalogState(sectionKey, {
        status: "error",
        items: [],
        error: formatApiError(error),
      });
    }
  }

  async function loadSeriesGenreCatalogBatchItem(sectionKey) {
    const sectionConfig = SERIES_GENRE_SECTION_CONFIG[sectionKey];

    try {
      const response = await apiRequest(
        withTmdbLanguage(
          `/api/tmdb/discover?type=${sectionConfig.mediaType}&genre=${sectionConfig.genreId}&page=1`
        )
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

  async function loadSeriesGenreCarousels() {
    const genreKeysToLoad = SERIES_GENRE_SECTION_KEYS.filter((sectionKey) => {
      const sectionState = appState.catalog.seriesGenres[sectionKey];

      return (
        sectionState &&
        sectionState.status !== "loading" &&
        sectionState.status !== "success"
      );
    });

    if (genreKeysToLoad.length === 0) {
      return;
    }

    const requestId = ++currentSeriesGenreCatalogRequestId;

    updateState((state) => {
      genreKeysToLoad.forEach((sectionKey) => {
        state.catalog.seriesGenres[sectionKey] = {
          ...state.catalog.seriesGenres[sectionKey],
          status: "loading",
          items: [],
          error: null,
        };
      });
    });

    const results = await runLimitedBatch(
      genreKeysToLoad,
      GENRE_CATALOG_BATCH_SIZE,
      loadSeriesGenreCatalogBatchItem
    );

    if (requestId !== currentSeriesGenreCatalogRequestId) {
      return;
    }

    updateState((state) => {
      results.forEach(({ key, nextState }) => {
        state.catalog.seriesGenres[key] = {
          ...state.catalog.seriesGenres[key],
          ...nextState,
        };
      });
    });
  }

  function retryCatalogSection(retryKey) {
    const genreRetryPrefix = "genre-";
    const seriesGenreRetryPrefix = "series-genre-";

    if (retryKey.startsWith(seriesGenreRetryPrefix)) {
      const genreKey = retryKey.slice(seriesGenreRetryPrefix.length);

      if (SERIES_GENRE_SECTION_CONFIG[genreKey]) {
        void loadSeriesGenreCatalogSection(genreKey);
      }

      return;
    }

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
      case "series-popular":
        void loadSeriesCatalog();
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
        withTmdbLanguage("/api/tmdb/trending?media_type=all&time_window=week")
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
      const response = await apiRequest(
        withTmdbLanguage(`/api/tmdb/${type}/${id}`)
      );

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

  return {
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
  };
}

export { createCatalogController };
