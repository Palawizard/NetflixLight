const appElement = document.querySelector("#app");

const routes = {
  "/": renderHomeView,
  "/movies": renderMoviesView,
  "/watchlist": renderWatchlistView,
};

function setDocumentTitle(title) {
  document.title = `${title} | NetflixLight`;
}

function createCard({ eyebrow, title, description, cta }) {
  const ctaMarkup = cta
    ? `<a href="${cta.href}" data-link class="inline-flex items-center rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400">${cta.label}</a>`
    : "";

  return `
    <article class="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-xs uppercase tracking-[0.25em] text-rose-300">${eyebrow}</p>
      <h3 class="mt-3 text-2xl font-semibold text-white">${title}</h3>
      <p class="mt-3 text-sm leading-7 text-white/70">${description}</p>
      <div class="mt-6">${ctaMarkup}</div>
    </article>
  `;
}

function renderHomeView() {
  setDocumentTitle("Accueil");

  return `
    <section class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
      <div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">Single Page App</p>
        <h1 class="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Navigation fluide en vanilla JS, sans framework.
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
          Cette interface utilise l'History API pour changer de vue sans rechargement complet,
          tout en gardant des URLs propres et une vue 404 cote client.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a
            href="/movies"
            data-link
            class="rounded-full bg-rose-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-rose-400"
          >
            Voir la vue Films
          </a>
          <a
            href="/watchlist"
            data-link
            class="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            Ouvrir la watchlist
          </a>
        </div>
      </div>

      <div class="grid gap-5">
        ${createCard({
          eyebrow: "Router",
          title: "History API",
          description:
            "Les clics de navigation sont interceptes, l'URL change avec pushState et la vue est rerendue sans refresh.",
        })}
        ${createCard({
          eyebrow: "404",
          title: "Vue inconnue",
          description:
            "Les chemins non definis restent servis par index.html cote serveur puis tombent sur une vue 404 cote client.",
          cta: { href: "/route-inconnue", label: "Tester la 404" },
        })}
      </div>
    </section>
  `;
}

function renderMoviesView() {
  setDocumentTitle("Films");

  return `
    <section class="space-y-8">
      <div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-amber-300">Vue /movies</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight">Films</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Cette vue est rendue par le routeur SPA. Un refresh direct sur <code>/movies</code>
          reste fonctionnel grace au fallback Express vers <code>index.html</code>.
        </p>
      </div>

      <div class="grid gap-5 md:grid-cols-2">
        ${createCard({
          eyebrow: "Route locale",
          title: "Chargement instantane",
          description:
            "Le changement de vue ne fait pas de nouveau document HTML. Seul le contenu de #app change.",
        })}
        ${createCard({
          eyebrow: "Prochaine etape",
          title: "Brancher TMDB",
          description:
            "Cette vue peut ensuite appeler /api/tmdb/trending ou /api/tmdb/movies/popular pour afficher de vraies donnees.",
        })}
      </div>
    </section>
  `;
}

function renderWatchlistView() {
  setDocumentTitle("Watchlist");

  return `
    <section class="space-y-8">
      <div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">Vue /watchlist</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight">Watchlist</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          La route existe deja cote API. Cette vue SPA est prete a consommer
          <code>GET /api/watchlist</code> quand tu voudras lier les donnees reelles.
        </p>
      </div>

      <div class="grid gap-5 md:grid-cols-3">
        ${createCard({
          eyebrow: "API",
          title: "Liste connectee",
          description:
            "L'utilisateur authentifie peut recuperer sa liste via l'endpoint watchlist deja present dans le backend.",
        })}
        ${createCard({
          eyebrow: "JS vanilla",
          title: "Pas de framework",
          description:
            "Le rendu est gere avec des fonctions qui retournent du HTML, puis injecte dans le shell principal.",
        })}
        ${createCard({
          eyebrow: "Navigation",
          title: "Retour rapide",
          description:
            "Le bouton precedent/suivant du navigateur continue de fonctionner grace a popstate.",
          cta: { href: "/", label: "Retour accueil" },
        })}
      </div>
    </section>
  `;
}

function renderNotFoundView(pathname) {
  setDocumentTitle("404");

  return `
    <section class="grid min-h-[70vh] place-items-center">
      <div class="max-w-2xl rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">404</p>
        <h1 class="mt-4 text-5xl font-semibold tracking-tight">Vue introuvable</h1>
        <p class="mt-6 text-base leading-8 text-white/70">
          La route <code>${pathname}</code> n'est pas definie dans le router client.
        </p>
        <a
          href="/"
          data-link
          class="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
        >
          Revenir a l'accueil
        </a>
      </div>
    </section>
  `;
}

function renderRoute(pathname) {
  const renderView = routes[pathname];

  if (!renderView) {
    appElement.innerHTML = renderNotFoundView(pathname);
    return;
  }

  appElement.innerHTML = renderView();
}

function navigateTo(pathname) {
  if (window.location.pathname === pathname) {
    renderRoute(pathname);
    return;
  }

  window.history.pushState({}, "", pathname);
  renderRoute(pathname);
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-link]");

  if (!link) {
    return;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const href = link.getAttribute("href");

  if (!href || !href.startsWith("/")) {
    return;
  }

  event.preventDefault();
  navigateTo(href);
});

window.addEventListener("popstate", () => {
  renderRoute(window.location.pathname);
});

renderRoute(window.location.pathname);
