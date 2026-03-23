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

function renderFavoritesView(state) {
  const username = state.session.user?.username || "utilisateur";

  return `
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">Favoris</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Ma liste</h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
        Connecte en tant que ${username}. Retrouve ici les titres que tu veux garder de cote.
      </p>
    </section>
  `;
}

function renderProfileView(state) {
  const user = state.session.user;

  return `
    <section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-sky-300">Profil</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Mon compte</h1>
      <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
        Retrouve ici les informations liees a ton compte.
      </p>

      <dl class="mt-8 grid gap-4 sm:grid-cols-2">
        <div class="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Username</dt>
          <dd class="mt-3 text-lg font-medium text-white">${user?.username || "-"}</dd>
        </div>
        <div class="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Email</dt>
          <dd class="mt-3 text-lg font-medium text-white">${user?.email || "-"}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderLoginView(state) {
  const authState = state.ui.authForm;

  return `
    <section class="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.3em] text-violet-300">Connexion</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Connexion</h1>
      <p class="mt-4 text-base leading-8 text-white/70">
        Connecte-toi pour retrouver ta liste et ton compte.
      </p>

      ${renderAuthFeedback(authState)}

      <form data-auth-form="login" class="mt-8 space-y-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Email</span>
          <input
            type="email"
            name="email"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            placeholder="email@example.com"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          class="inline-flex rounded-full bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          ${authState.pending ? "disabled" : ""}
        >
          ${authState.pending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </section>
  `;
}

function renderRegisterView(state) {
  const authState = state.ui.authForm;

  return `
    <section class="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Inscription</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Inscription</h1>
      <p class="mt-4 text-base leading-8 text-white/70">
        Cree ton compte pour enregistrer tes envies et y revenir quand tu veux.
      </p>

      ${renderAuthFeedback(authState)}

      <form data-auth-form="register" class="mt-8 space-y-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Username</span>
          <input
            type="text"
            name="username"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
            placeholder="mon-pseudo"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Email</span>
          <input
            type="email"
            name="email"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
            placeholder="email@example.com"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          class="inline-flex rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
          ${authState.pending ? "disabled" : ""}
        >
          ${authState.pending ? "Creation..." : "Creer un compte"}
        </button>
      </form>
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

function renderAuthFeedback(authState) {
  if (authState.error) {
    return `
      <div class="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        ${authState.error}
      </div>
    `;
  }

  if (authState.success) {
    return `
      <div class="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        ${authState.success}
      </div>
    `;
  }

  return "";
}
