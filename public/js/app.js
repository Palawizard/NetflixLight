import { apiRequest, formatApiError } from "./api.js";
import { initializeCarousels, scrollCarousel } from "./components/carousel.js";
import {
  appState,
  setHomeCatalogState,
  setSessionState,
  setMoviesCatalogState,
  setHeroState,
  resetAuthFormState,
  setAuthFormState,
  setFlashMessage,
  subscribeState,
  updateState,
} from "./state.js";
import {
  getCurrentPath,
  navigate,
  startRouter,
  subscribeRoute,
} from "./router.js";
import { resolveView } from "./views.js";

const appElement = document.querySelector("#app");
const protectedPaths = new Set(["/favoris", "/profil"]);
const guestOnlyPaths = new Set(["/login", "/register"]);

const navItems = [
  { path: "/", label: "Accueil" },
  { path: "/films", label: "Films" },
  { path: "/favoris", label: "Favoris" },
  { path: "/profil", label: "Profil" },
  { path: "/login", label: "Connexion" },
  { path: "/register", label: "Inscription" },
];

function renderApp() {
  const currentPath = getCurrentPath();

  if (
    appState.session.status === "idle" ||
    appState.session.status === "loading"
  ) {
    document.title = "Chargement | NetflixLight";
    appElement.innerHTML = renderShell(renderSessionLoading(), currentPath);
    return;
  }

  if (!ensureRouteAccess(currentPath)) {
    return;
  }

  const currentRoute = resolveView(currentPath);

  document.title = `${currentRoute.title} | NetflixLight`;
  appElement.innerHTML = renderShell(
    `
    ${renderFlash(appState.ui.flash)}
    ${currentRoute.render(appState)}
  `,
    currentPath
  );
  initializeCarousels(appElement);
}

function renderShell(content, currentPath) {
  return `
    <div class="min-h-screen">
      <header class="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <button
            type="button"
            data-nav-path="/"
            class="text-left text-lg font-semibold uppercase tracking-[0.25em] text-rose-400 transition hover:text-rose-300"
          >
            NetflixLight
          </button>
          <div class="flex flex-wrap items-center justify-end gap-3">
            ${renderSessionBadge()}
            <nav class="flex flex-wrap items-center justify-end gap-2">
            ${navItems.map((item) => renderNavLink(item, currentPath)).join("")}
            </nav>
          </div>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        ${content}
      </main>
    </div>
  `;
}

function renderSessionBadge() {
  if (appState.session.status !== "authenticated" || !appState.session.user) {
    return `
      <span class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/50">
        Visiteur
      </span>
    `;
  }

  return `
    <span class="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-100">
      ${appState.session.user.username}
    </span>
  `;
}

function renderNavLink(item, currentPath) {
  const isActive = item.path === currentPath;

  return `
    <button
      type="button"
      data-nav-path="${item.path}"
      class="rounded-full px-4 py-2 text-sm font-medium transition ${
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

function renderSessionLoading() {
  return `
    <section class="grid min-h-[60vh] place-items-center">
      <div class="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.35em] text-amber-300">Session</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight">Un instant</h1>
        <p class="mt-4 text-base leading-8 text-white/70">
          On prepare ton espace.
        </p>
      </div>
    </section>
  `;
}

function ensureRouteAccess(currentPath) {
  const isAuthenticated =
    appState.session.status === "authenticated" &&
    Boolean(appState.session.user);

  if (!isAuthenticated && protectedPaths.has(currentPath)) {
    appState.session.redirectAfterLogin = currentPath;
    appState.ui.flash = "Connecte-toi pour acceder a cette page.";
    navigate("/login");
    return false;
  }

  if (isAuthenticated && guestOnlyPaths.has(currentPath)) {
    navigate("/profil");
    return false;
  }

  return true;
}

async function initializeSession() {
  setSessionState({
    status: "loading",
    user: null,
  });

  try {
    const response = await apiRequest("/api/auth/me");

    setSessionState({
      status: "authenticated",
      user: response.user,
    });
  } catch (error) {
    if (error.status !== 401) {
      setFlashMessage("Impossible de charger ton espace.");
    }

    setSessionState({
      status: "guest",
      user: null,
    });
  }
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
      "/api/tmdb/movies/popular?language=fr-FR"
    );

    setMoviesCatalogState({
      status: "success",
      items: Array.isArray(response.results) ? response.results : [],
      error: null,
    });
  } catch (error) {
    setMoviesCatalogState({
      status: "error",
      error: formatApiError(error),
    });
  }
}

async function loadHomeCatalogSection(sectionKey, endpoint) {
  const sectionState = appState.catalog.home[sectionKey];

  if (
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
    const response = await apiRequest(endpoint);

    setHomeCatalogState(sectionKey, {
      status: "success",
      items: Array.isArray(response.results) ? response.results : [],
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
  loadHomeCatalogSection(
    "trending",
    "/api/tmdb/trending?media_type=all&time_window=week&language=fr-FR"
  );
  loadHomeCatalogSection(
    "moviesPopular",
    "/api/tmdb/movies/popular?language=fr-FR"
  );
  loadHomeCatalogSection("tvPopular", "/api/tmdb/tv/popular?language=fr-FR");
  loadHomeCatalogSection(
    "topRated",
    "/api/tmdb/movies/top-rated?language=fr-FR"
  );
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
      "/api/tmdb/trending?media_type=all&time_window=week&language=fr-FR"
    );

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

function handleRouteEffects(currentPath) {
  if (currentPath === "/") {
    loadHomeHero();
    loadHomeCarousels();
  }

  if (currentPath === "/films") {
    loadMoviesCatalog();
  }
}

document.addEventListener("click", (event) => {
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

  if (event.target.closest("[data-refresh-hero]")) {
    setHeroState({
      status: "idle",
      item: null,
      error: null,
    });

    loadHomeHero();
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

  navigate(targetPath);
});

document.addEventListener("submit", async (event) => {
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
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: {
          email: formData.get("email"),
          password: formData.get("password"),
        },
      });

      const nextPath = appState.session.redirectAfterLogin || "/profil";

      updateState((state) => {
        state.session.status = "authenticated";
        state.session.user = response.user;
        state.session.redirectAfterLogin = null;
      });

      resetAuthFormState();
      setFlashMessage("Connexion reussie.");
      navigate(nextPath);
      return;
    }

    if (mode === "register") {
      await apiRequest("/api/auth/register", {
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
        success: "Compte cree. Tu peux maintenant te connecter.",
      });
      setFlashMessage("Compte cree avec succes.");
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

subscribeRoute(renderApp);
subscribeRoute(handleRouteEffects);
subscribeState(renderApp);
resetAuthFormState();
initializeSession();
startRouter();
