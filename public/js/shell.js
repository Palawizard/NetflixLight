import {
  DEFAULT_PROFILE_COLOR,
  HEX_COLOR_PATTERN,
  PROFILE_COLOR_PRESETS,
  guestOnlyPaths,
  navItems,
} from "./config/app-config.js";

/**
 * normalizes a hex color string - returns the default profile color if the value is not a valid hex
 */
function normalizeProfileColor(value) {
  return HEX_COLOR_PATTERN.test(value)
    ? value.toLowerCase()
    : DEFAULT_PROFILE_COLOR;
}

/**
 * syncs the color picker UI to reflect a new color value - updates the input, preview, label, and preset buttons
 */
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

/**
 * resets all color picker inputs inside a container to their current values
 */
function resetProfileColorPickers(container) {
  container
    .querySelectorAll("[data-profile-color-input]")
    .forEach(updateProfileColorPicker);
}

/**
 * renders the full page shell - header, nav, search, and main content area
 */
function renderShell({ appState, content, currentPath, currentSearchQuery }) {
  return `
    <div class="min-h-screen">
      <header data-app-header class="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div class="mx-auto grid max-w-[88rem] grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_minmax(20rem,34rem)_1fr]">
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
            ${renderLanguageChooser(appState)}
            ${renderThemeToggle(appState)}
            ${renderHeaderMenu(appState, currentPath)}
          </div>

          <div class="col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-full">
            ${renderSearchForm(currentSearchQuery)}
          </div>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-[88rem] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        ${content}
      </main>
    </div>
  `;
}

/**
 * renders the hamburger menu with nav links, session badge, and auth actions
 */
function renderHeaderMenu(appState, currentPath) {
  const isAuthenticated =
    appState.session.status === "authenticated" &&
    Boolean(appState.session.user);
  const primaryNavItems = navItems.filter(
    (item) => !guestOnlyPaths.has(item.path)
  );
  const authMenuContent = isAuthenticated
    ? renderLogoutMenuButton(appState)
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
          ${renderSessionBadge(appState)}
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

/**
 * renders the fr/en language switcher buttons
 */
function renderLanguageChooser(appState) {
  const currentLanguage = appState.ui.language;

  return `
    <div class="inline-flex rounded-full border border-white/10 bg-white/5 p-1" aria-label="Choisir la langue">
      ${["fr", "en"]
        .map((language) => {
          const isActive = currentLanguage === language;

          return `
            <button
              type="button"
              data-set-language="${language}"
              aria-label="${language === "fr" ? "Passer le site en français" : "Switch site to English"}"
              aria-pressed="${isActive ? "true" : "false"}"
              class="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                isActive
                  ? "bg-white text-neutral-950"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }"
            >
              ${language}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

/**
 * renders the logout button - shown as disabled while a logout is in progress
 */
function renderLogoutMenuButton(appState) {
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

/**
 * closes any open header menu <details> elements inside a container
 */
function closeHeaderMenu(container) {
  container.querySelectorAll("[data-header-menu][open]").forEach((menu) => {
    menu.open = false;
  });
}

/**
 * renders the global search form pre-filled with the current query string
 */
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

/**
 * renders the dark/light theme toggle button with the appropriate icon and aria state
 */
function renderThemeToggle(appState) {
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

/**
 * renders a session badge - shows active profile info when authenticated, "Visiteur" otherwise
 */
function renderSessionBadge(appState) {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    return `
      <span class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/50">
        Visiteur
      </span>
    `;
  }

  const activeProfile = appState.profiles.items.find(
    (profile) => profile.id === appState.profiles.activeProfileId
  );
  const profileNameText = activeProfile?.name || "Profil";
  const profileName = escapeHtml(profileNameText);
  const profileInitial = escapeHtml(profileNameText.slice(0, 1).toUpperCase());
  const avatarColor = escapeHtml(
    normalizeProfileColor(activeProfile?.avatarColor || DEFAULT_PROFILE_COLOR)
  );
  const username = escapeHtml(appState.session.user.username || "Compte");

  return `
    <button
      type="button"
      data-open-profile-overlay
      aria-label="Changer de profil"
      title="Changer de profil"
      class="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
    >
      <span
        aria-hidden="true"
        class="solid-on-color grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-semibold text-white shadow-lg shadow-black/25"
        style="background-color: ${avatarColor}"
      >
        ${profileInitial}
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold text-white">${profileName}</span>
        <span class="block truncate text-xs text-white/45">${username}</span>
      </span>
    </button>
  `;
}

/**
 * renders a nav link button - highlighted when it matches currentPath
 */
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

/**
 * renders a dismissible flash message banner - returns empty string if no message
 */
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

/**
 * renders a full-screen loading placeholder shown while the session is being resolved
 */
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

/**
 * renders the full-screen profile selection overlay - returns empty string when not open or unauthenticated
 */
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

/**
 * renders a single profile card button in the selection overlay
 */
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

/**
 * renders the "+" tile that opens the create profile form
 */
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

/**
 * renders the inline form for creating a new profile inside the overlay
 */
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

/**
 * renders a color picker with preset swatches and a native color input fallback
 */
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

export {
  closeHeaderMenu,
  normalizeProfileColor,
  renderFlash,
  renderProfileSelectionOverlay,
  renderSessionLoading,
  renderShell,
  resetProfileColorPickers,
  updateProfileColorPicker,
};

/**
 * escapes a value for safe insertion into HTML attributes and text content
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
