import {
  buildUserRatingKeyMap,
  buildViewingHistoryKeyMap,
  buildWatchProgressKeyMap,
  buildWatchlistKeyMap,
  createUserRatingKey,
  createViewingHistoryKey,
  createWatchProgressKey,
  createWatchlistKey,
  sortWatchlistItemsByAddedAt,
} from "./user-data-keys.js";

function createUserDataController(dependencies) {
  const {
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
  } = dependencies;

  async function loadWatchlist({ force = false } = {}) {
    if (appState.session.status !== "authenticated" || !appState.session.user) {
      resetWatchlistState();
      return;
    }

    const watchlistState = appState.watchlist;

    if (
      !force &&
      (watchlistState.status === "loading" ||
        watchlistState.status === "success")
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
      const storedProfileId = getStoredActiveProfileId(
        appState.session.user.id
      );
      const activeProfile =
        profiles.find((profile) => profile.id === storedProfileId) ||
        profiles[0];

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
        activeProfileId:
          response?.item?.id || appState.profiles.activeProfileId,
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
              (item) =>
                createUserRatingKey(item.type, item.tmdbId) !== ratingKey
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

  return {
    createWatchlistKey,
    createWatchProgressKey,
    createViewingHistoryKey,
    createUserRatingKey,
    loadWatchlist,
    loadWatchProgress,
    loadViewingHistory,
    loadUserRatings,
    openProfileOverlay,
    closeProfileOverlay,
    openProfileCreation,
    selectActiveProfile,
    loadProfiles,
    createProfileFromForm,
    saveViewingHistoryFromDetail,
    setPersonalRatingFromDetail,
    removeWatchlistItemFromList,
    logoutUser,
    toggleFavoriteFromDetail,
  };
}

export { createUserDataController };
