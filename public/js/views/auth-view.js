// renders an error message from the logout state - returns empty string if no error
function renderLogoutFeedback(logoutState) {
  if (!logoutState.error) {
    return "";
  }

  return `
    <p class="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      ${logoutState.error}
    </p>
  `;
}

// renders the login form with email, password fields, and auth feedback
function renderLoginView(state) {
  const authState = state.ui.authForm;

  return `
    <section class="mx-auto w-full max-w-xl rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.3em] text-violet-300">Connexion</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Connexion</h1>
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

// renders the registration form with username, email, password fields, and auth feedback
function renderRegisterView(state) {
  const authState = state.ui.authForm;

  return `
    <section class="mx-auto w-full max-w-xl rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Inscription</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Inscription</h1>
      <p class="mt-4 text-base leading-8 text-white/70">
        Crée ton compte pour enregistrer tes envies et y revenir quand tu veux.
      </p>

      ${renderAuthFeedback(authState)}

      <form data-auth-form="register" class="mt-8 space-y-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-white/80">Pseudo</span>
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
          ${authState.pending ? "Création..." : "Créer un compte"}
        </button>
      </form>
    </section>
  `;
}

// renders an error or success message from the auth form state - returns empty string when neither is set
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

export { renderLoginView, renderLogoutFeedback, renderRegisterView };
