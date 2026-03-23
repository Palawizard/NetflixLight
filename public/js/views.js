function createFeatureTile({ eyebrow, title, description }) {
  return `
    <article class="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-xs uppercase tracking-[0.3em] text-rose-300">${eyebrow}</p>
      <h3 class="mt-3 text-2xl font-semibold tracking-tight text-white">${title}</h3>
      <p class="mt-3 text-sm leading-7 text-white/70">${description}</p>
    </article>
  `;
}

function renderHomeView() {
  return `
    <section class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <article class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">NetflixLight</p>
        <h1 class="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Regarde ce qui te tente ce soir.
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
          Parcours les films du moment, garde tes envies de cote et retrouve
          rapidement ce que tu veux voir.
        </p>
      </article>

      <div class="grid gap-5">
        ${createFeatureTile({
          eyebrow: "A la une",
          title: "Les titres du moment",
          description:
            "Une selection simple a parcourir quand tu veux lancer quelque chose sans perdre de temps.",
        })}
        ${createFeatureTile({
          eyebrow: "Ma liste",
          title: "Tout garder sous la main",
          description:
            "Ajoute les films qui t'interessent et retrouve-les facilement dans ton espace.",
        })}
      </div>
    </section>
  `;
}

function renderMoviesView() {
  return `
    <section class="space-y-6">
      <header class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-amber-300">Films</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight">A l'affiche</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Retrouve les films populaires du moment et choisis ton prochain visionnage.
        </p>
      </header>
    </section>
  `;
}

function renderFavoritesView() {
  return `
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">Favoris</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Ma liste</h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
        Garde ici les titres que tu veux retrouver plus tard.
      </p>
    </section>
  `;
}

function renderProfileView() {
  return `
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-sky-300">Profil</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Mon compte</h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
        Retrouve ici les informations liees a ton compte.
      </p>
    </section>
  `;
}

function renderLoginView() {
  return `
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-violet-300">Connexion</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Connexion</h1>
      <p class="mt-4 text-base leading-8 text-white/70">
        Connecte-toi pour retrouver ton espace et ta liste.
      </p>
    </section>
  `;
}

function renderRegisterView() {
  return `
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Inscription</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Inscription</h1>
      <p class="mt-4 text-base leading-8 text-white/70">
        Cree ton compte pour enregistrer les titres qui te plaisent.
      </p>
    </section>
  `;
}

function renderNotFoundView(pathname) {
  return `
    <section class="grid min-h-[60vh] place-items-center">
      <div class="max-w-2xl rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.35em] text-rose-300">404</p>
        <h1 class="mt-4 text-5xl font-semibold tracking-tight">Page introuvable</h1>
        <p class="mt-5 text-base leading-8 text-white/70">
          La page <code>${pathname}</code> est introuvable.
        </p>
      </div>
    </section>
  `;
}

export const routeViews = {
  "/": {
    title: "Accueil",
    render: renderHomeView,
  },
  "/films": {
    title: "Films",
    render: renderMoviesView,
  },
  "/favoris": {
    title: "Favoris",
    render: renderFavoritesView,
  },
  "/profil": {
    title: "Profil",
    render: renderProfileView,
  },
  "/login": {
    title: "Connexion",
    render: renderLoginView,
  },
  "/register": {
    title: "Inscription",
    render: renderRegisterView,
  },
};

export function resolveView(pathname) {
  const route = routeViews[pathname];

  if (route) {
    return route;
  }

  return {
    title: "404",
    render: () => renderNotFoundView(pathname),
  };
}
