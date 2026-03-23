import { apiRequest, formatApiError } from "./api.js";
import {
  appState,
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
  const currentRoute = resolveView(currentPath);

  document.title = `${currentRoute.title} | NetflixLight`;
  appElement.innerHTML = `
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
          <nav class="flex flex-wrap items-center justify-end gap-2">
            ${navItems.map((item) => renderNavLink(item, currentPath)).join("")}
          </nav>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        ${renderFlash(appState.ui.flash)}
        ${currentRoute.render(appState)}
      </main>
    </div>
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

document.addEventListener("click", (event) => {
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

      updateState((state) => {
        state.session.user = response.user;
      });

      resetAuthFormState();
      setFlashMessage("Connexion reussie.");
      navigate("/profil");
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
subscribeState(renderApp);
resetAuthFormState();
startRouter();
