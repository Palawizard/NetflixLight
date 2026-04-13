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
import { createWatchlistActions } from "./watchlist-actions.js";

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

  function buildActiveProfileHeaders() {
    if (!Number.isInteger(appState.profiles.activeProfileId)) {
      return {};
    }

    return {
      "X-Profile-Id": String(appState.profiles.activeProfileId),
    };
  }

  function isActiveProfileStill(profileId) {
    return appState.profiles.activeProfileId === profileId;
  }

  function profileApiRequest(pathname, options = {}) {
    return apiRequest(pathname, {
      ...options,
      headers: {
        ...buildActiveProfileHeaders(),
        ...(options.headers || {}),
      },
    });
  }

  function resetProfileScopedDataStates() {
    resetWatchlistState();
    resetWatchProgressState();
    resetViewingHistoryState();
    resetUserRatingsState();
  }

  function loadProfileScopedData({ force = true } = {}) {
    void loadWatchlist({ force });
    void loadWatchProgress({ force });
    void loadViewingHistory({ force });
    void loadUserRatings({ force });
  }

  function shouldWaitForActiveProfile() {
    if (Number.isInteger(appState.profiles.activeProfileId)) {
      return false;
    }

    if (
      appState.profiles.status === "idle" ||
      appState.profiles.status === "error"
    ) {
      void loadProfiles();
    }

    return true;
  }

  const { removeWatchlistItemFromList, toggleFavoriteFromDetail } =
    createWatchlistActions({
      appState,
      createWatchlistKey,
      formatApiError,
      getCurrentPath,
      navigate,
      profileApiRequest,
      setFlashMessage,
      sortWatchlistItemsByAddedAt,
      updateState,
    });

  async function loadWatchlist({ force = false } = {}) {
    if (appState.session.status !== "authenticated" || !appState.session.user) {
      resetWatchlistState();
      return;
    }

    if (shouldWaitForActiveProfile()) {
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
      const requestProfileId = appState.profiles.activeProfileId;
      const response = await profileApiRequest("/api/watchlist");
      const items = sortWatchlistItemsByAddedAt(response.items);

      if (!isActiveProfileStill(requestProfileId)) {
        return;
      }

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

    if (shouldWaitForActiveProfile()) {
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
      const requestProfileId = appState.profiles.activeProfileId;
      const response = await profileApiRequest("/api/watch-progress");
      const items = Array.isArray(response.items) ? response.items : [];

      if (!isActiveProfileStill(requestProfileId)) {
        return;
      }

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

    if (shouldWaitForActiveProfile()) {
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
      const requestProfileId = appState.profiles.activeProfileId;
      const response = await profileApiRequest("/api/viewing-history");
      const items = Array.isArray(response.items) ? response.items : [];

      if (!isActiveProfileStill(requestProfileId)) {
        return;
      }

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

    if (shouldWaitForActiveProfile()) {
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
      const requestProfileId = appState.profiles.activeProfileId;
      const response = await profileApiRequest("/api/user-ratings");
      const items = Array.isArray(response.items) ? response.items : [];

      if (!isActiveProfileStill(requestProfileId)) {
        return;
      }

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
    resetProfileScopedDataStates();
    setProfilesState({
      activeProfileId: profileId,
      lastAction: {
        tone: "success",
        message: `Profil actif: ${activeProfile.name}.`,
      },
    });
    closeProfileOverlay();
    loadProfileScopedData();
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
      const previousActiveProfileId = appState.profiles.activeProfileId;

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

      if (activeProfile?.id && previousActiveProfileId !== activeProfile.id) {
        resetProfileScopedDataStates();
        loadProfileScopedData();
      }
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

      if (response?.item) {
        resetProfileScopedDataStates();
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
      if (response?.item) {
        loadProfileScopedData();
      }
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
      const response = await profileApiRequest("/api/viewing-history", {
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
      const response = await profileApiRequest(
        `/api/user-ratings/${type}/${id}`,
        {
          method: "PUT",
          body: {
            rating,
          },
        }
      );

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
