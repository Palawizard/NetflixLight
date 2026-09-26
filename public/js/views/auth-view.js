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

// builds the Authentik sign-in link - relative so it works under any path prefix
function buildSignInHref(state) {
  const nextPath = state.session.redirectAfterLogin || "/profile";
  return `auth/login?next=${encodeURIComponent(nextPath)}`;
}

// renders the sign-in card - accounts are managed by Authentik (single sign-on)
function renderSignInCard(
  state,
  { eyebrow, accent, title, text, buttonLabel }
) {
  const authState = state.ui.authForm;

  return `
    <section class="mx-auto w-full max-w-xl rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.3em] ${accent.text}">${eyebrow}</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">${title}</h1>
      <p class="mt-4 text-base leading-8 text-white/70">${text}</p>

      ${renderAuthFeedback(authState)}

      <a
        href="${buildSignInHref(state)}"
        class="mt-8 inline-flex rounded-full ${accent.button} px-5 py-3 text-sm font-medium text-white transition"
      >
        ${buttonLabel}
      </a>
      <p class="mt-6 text-sm leading-6 text-white/50">
        Un seul compte pour toutes les apps de palawi.fr : la connexion et l'inscription se font sur auth.palawi.fr.
      </p>
    </section>
  `;
}

// renders the login view
function renderLoginView(state) {
  return renderSignInCard(state, {
    eyebrow: "Connexion",
    accent: {
      text: "text-violet-300",
      button: "bg-violet-500 hover:bg-violet-400",
    },
    title: "Connexion",
    text: "Connecte-toi pour retrouver ta liste et ton compte.",
    buttonLabel: "Se connecter",
  });
}

// renders the registration view - account creation happens on Authentik
function renderRegisterView(state) {
  return renderSignInCard(state, {
    eyebrow: "Inscription",
    accent: {
      text: "text-fuchsia-300",
      button: "bg-fuchsia-500 hover:bg-fuchsia-400",
    },
    title: "Inscription",
    text: "Crée ton compte pour enregistrer tes envies et y revenir quand tu veux.",
    buttonLabel: "Créer un compte",
  });
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
