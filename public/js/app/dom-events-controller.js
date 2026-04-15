/**
 * wires all global DOM event listeners - click, keydown, input, and submit -
 * delegating to the appropriate action based on data attributes
 */
function registerDomEventHandlers(dependencies) {
  const {
    apiRequest,
    appElement,
    appState,
    applyLanguagePreference,
    clearSearchDebounce,
    closeHeaderMenu,
    createProfileFromForm,
    formatApiError,
    getCurrentPath,
    getCurrentSearchQuery,
    loadDetailPage,
    loadHomeHero,
    loadProfiles,
    loadUserRatings,
    loadViewingHistory,
    loadWatchProgress,
    loadWatchlist,
    logoutUser,
    navigate,
    openProfileCreation,
    openProfileOverlay,
    removeWatchlistItemFromList,
    resetAuthFormState,
    resetProfileColorPickers,
    retryCatalogSection,
    runWithoutPageAnimations,
    scrollCarousel,
    selectActiveProfile,
    setAuthFormState,
    setDetailState,
    setHeroState,
    setPersonalRatingFromDetail,
    scheduleSearchDebounce,
    toggleFavoriteFromDetail,
    toggleThemePreference,
    updateProfileColorPicker,
    updateState,
  } = dependencies;

  // handles all delegated click events using data attributes to identify the target action
  document.addEventListener("click", (event) => {
    // close the header menu on any click outside it
    if (!event.target.closest("[data-header-menu]")) {
      closeHeaderMenu();
    }

    const colorPresetButton = event.target.closest(
      "[data-profile-color-preset]"
    );

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
      retryCatalogSection(
        retrySectionButton.getAttribute("data-retry-section")
      );
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

    const removeWatchlistButton = event.target.closest(
      "[data-remove-watchlist]"
    );

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

    const profileOverlayButton = event.target.closest(
      "[data-open-profile-overlay]"
    );

    if (profileOverlayButton) {
      openProfileOverlay();
      closeHeaderMenu();
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
      applyLanguagePreference(
        languageButton.getAttribute("data-set-language"),
        {
          reload: true,
        }
      );
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
          `/search?q=${encodeURIComponent(currentQuery)}&page=${nextPage}`
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

  // closes the header menu on Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHeaderMenu();
    }
  });

  // updates profile color pickers live and debounces search navigation on global search input
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

    scheduleSearchDebounce(() => {
      if (!searchQuery) {
        if (currentPath === "/search") {
          navigate("/search");
        }
        return;
      }

      navigate(`/search?q=${encodeURIComponent(searchQuery)}&page=1`);
    });
  });

  // handles search, profile creation, and auth form submissions
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
        navigate("/search");
        closeHeaderMenu();
        return;
      }

      navigate(`/search?q=${encodeURIComponent(searchQuery)}&page=1`);
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
        const response = await apiRequest("api/auth/login", {
          method: "POST",
          body: {
            email: formData.get("email"),
            password: formData.get("password"),
          },
        });

        const nextPath = appState.session.redirectAfterLogin || "/profile";

        updateState((state) => {
          state.session.status = "authenticated";
          state.session.user = response.user;
          state.session.redirectAfterLogin = null;
        });

        await loadProfiles({ force: true });
        await loadWatchlist({ force: true });
        await loadWatchProgress({ force: true });
        await loadViewingHistory({ force: true });
        await loadUserRatings({ force: true });
        resetAuthFormState();
        openProfileOverlay();
        navigate(nextPath);
        return;
      }

      if (mode === "register") {
        await apiRequest("api/auth/register", {
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
}

export { registerDomEventHandlers };
