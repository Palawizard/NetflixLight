/**
 * creates and returns watchlist action handlers - encapsulates add/remove logic with optimistic updates
 */
function createWatchlistActions(dependencies) {
  const {
    appState,
    createWatchlistKey,
    formatApiError,
    getCurrentPath,
    navigate,
    profileApiRequest,
    setFlashMessage,
    sortWatchlistItemsByAddedAt,
    updateState,
  } = dependencies;

  // removes a watchlist item directly from the favorites list view - redirects to login if unauthenticated
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

    // optimistically remove the item before the API call
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
      await profileApiRequest(`api/watchlist/${type}/${tmdbId}`, {
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
        // item was already gone - treat as success
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

      // roll back the optimistic removal on unexpected errors
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

  // toggles the favorite status for the current detail page item - add or remove depending on current state
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
      await removeFavoriteFromDetail({
        optimisticItem,
        type,
        id,
        watchlistKey,
      });
      return;
    }

    await addFavoriteFromDetail({ optimisticItem, type, id, watchlistKey });
  }

  // optimistically removes a favorite from the detail page and rolls back on API error
  async function removeFavoriteFromDetail({
    optimisticItem,
    type,
    id,
    watchlistKey,
  }) {
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
      await profileApiRequest(`api/watchlist/${type}/${id}`, {
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
  }

  // optimistically adds a favorite from the detail page and rolls back on API error
  async function addFavoriteFromDetail({
    optimisticItem,
    type,
    id,
    watchlistKey,
  }) {
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
      const response = await profileApiRequest("api/watchlist", {
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
        // already in watchlist - treat as success
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

  // builds a minimal watchlist item object from a tmdb detail item for optimistic UI updates
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

  return {
    removeWatchlistItemFromList,
    toggleFavoriteFromDetail,
  };
}

export { createWatchlistActions };
