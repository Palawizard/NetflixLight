import { renderCarousel } from "../components/carousel.js";
import {
  DEFAULT_PROFILE_COLOR,
  PROFILE_COLOR_PRESETS,
} from "../config/app-config.js";
import { renderTmdbImage } from "../tmdb-images.js";
import {
  renderLoginView,
  renderLogoutFeedback,
  renderRegisterView,
} from "./auth-view.js";
import {
  createFavoriteKey,
  escapeHtml,
  formatLongDate,
  getPersonalRatingLabel,
  getSortedWatchlistItems,
} from "./view-utils.js";

// renders the favorites page with a header and the full watchlist content
function renderFavoritesView(state) {
  const username = state.session.user?.username || "utilisateur";
  const watchlistState = state.watchlist;
  const items = getSortedWatchlistItems(watchlistState.items);

  return `
    <section class="space-y-6">
      <header class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <div>
          <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">Favoris</p>
          <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Ma liste</h1>
          <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
            Retrouve ici les titres que tu veux garder de côté.
          </p>
        </div>
      </header>

      ${renderWatchlistContent(watchlistState, state.userRatings, items)}
    </section>
  `;
}

// renders watchlist content: skeleton during load, error block on failure, empty state, or the grid of cards
function renderWatchlistContent(watchlistState, userRatingsState, items) {
  if (watchlistState.status === "idle" || watchlistState.status === "loading") {
    return renderWatchlistLoading();
  }

  if (watchlistState.status === "error") {
    return renderWatchlistError(watchlistState.error);
  }

  if (items.length === 0) {
    return renderWatchlistEmpty();
  }

  return `
    <section class="grid gap-5 md:grid-cols-2">
      ${items
        .map((item) =>
          renderWatchlistCard(item, watchlistState, userRatingsState)
        )
        .join("")}
    </section>
  `;
}

// renders an animated pulse skeleton for the watchlist grid while items are loading
function renderWatchlistLoading() {
  return `
    <section class="grid gap-5 md:grid-cols-2">
      ${Array.from(
        { length: 4 },
        () => `
          <article class="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20">
            <div class="flex gap-5 p-5">
              <div class="h-36 w-24 shrink-0 animate-pulse rounded-2xl bg-white/10"></div>
              <div class="flex flex-1 flex-col justify-between">
                <div class="space-y-4">
                  <div class="h-4 w-24 animate-pulse rounded-full bg-white/10"></div>
                  <div class="h-8 w-full max-w-xs animate-pulse rounded-2xl bg-white/10"></div>
                </div>
                <div class="h-10 w-32 animate-pulse rounded-full bg-white/10"></div>
              </div>
            </div>
          </article>
        `
      ).join("")}
    </section>
  `;
}

// renders a watchlist error block with a retry button
function renderWatchlistError(errorMessage) {
  return `
    <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100 shadow-xl shadow-black/20">
      <p class="text-base leading-8">
        ${errorMessage || "Impossible de charger tes favoris pour le moment."}
      </p>
      <button
        type="button"
        data-retry-watchlist
        aria-label="Réessayer le chargement des favoris"
        class="mt-6 rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
      >
        Réessayer
      </button>
    </section>
  `;
}

// renders an empty state for the watchlist with a link to browse titles
function renderWatchlistEmpty() {
  return `
    <section class="rounded-4xl border border-white/10 bg-white/5 p-8 text-white/75 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">Liste vide</p>
      <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
        Aucun favori pour le moment
      </h2>
      <p class="mt-4 max-w-2xl text-base leading-8">
        Ajoute des films ou séries depuis une page détail pour les retrouver ici.
      </p>
      <button
        type="button"
        data-nav-path="/"
        aria-label="Explorer les titres depuis l'accueil"
        class="mt-6 rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
      >
        Explorer les titres
      </button>
    </section>
  `;
}

// renders a single watchlist card with poster, title, added date, personal rating, and a remove button
function renderWatchlistCard(item, watchlistState, userRatingsState) {
  const watchlistKey = createFavoriteKey(item.type, item.tmdbId);
  const isPending = Boolean(watchlistState.pendingKeys[watchlistKey]);
  const title = escapeHtml(item.snapshot?.title || "Titre inconnu");
  const typeLabel = item.type === "movie" ? "Film" : "Série";
  const detailPath = `/${item.type}/${item.tmdbId}`;
  const personalRatingLabel = getPersonalRatingLabel(userRatingsState, item);
  const posterMarkup = item.snapshot?.poster
    ? renderTmdbImage({
        path: item.snapshot.poster,
        alt: `Poster de ${title}`,
        size: "w185",
        srcSetSizes: [
          { size: "w92", width: 92 },
          { size: "w185", width: 185 },
          { size: "w342", width: 342 },
        ],
        sizes: "6rem",
        className:
          "h-full w-full transform-gpu object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none",
      })
    : `
      <div class="flex h-full items-center justify-center bg-white/5 px-4 text-center text-xs uppercase tracking-[0.25em] text-white/40">
        ${title}
      </div>
    `;

  return `
    <article class="group transform-gpu overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur transition duration-300 hover:border-white/20 motion-reduce:transform-none motion-reduce:transition-none">
      <div class="flex gap-5 p-5">
        <button
          type="button"
          data-nav-path="${detailPath}"
          aria-label="Ouvrir la fiche détail de ${title}"
          class="w-24 shrink-0 overflow-hidden rounded-2xl bg-black/30 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
        >
          <div class="aspect-2/3">
            ${posterMarkup}
          </div>
        </button>

        <div class="flex min-w-0 flex-1 flex-col justify-between gap-5">
          <button
            type="button"
            data-nav-path="${detailPath}"
            aria-label="Ouvrir la fiche détail de ${title}"
            class="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            <p class="text-xs uppercase tracking-[0.3em] text-emerald-300">${typeLabel}</p>
            <h2 class="mt-3 line-clamp-2 text-2xl font-semibold tracking-tight text-white">
              ${title}
            </h2>
            <p class="mt-3 text-sm text-white/55">
              Ajouté le ${formatLongDate(item.addedAt)}
            </p>
            ${
              personalRatingLabel
                ? `
                  <p class="mt-4 inline-flex rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-200">
                    Ma note ${personalRatingLabel}
                  </p>
                `
                : ""
            }
          </button>

          <button
            type="button"
            data-remove-watchlist
            data-watchlist-type="${item.type}"
            data-watchlist-id="${item.tmdbId}"
            aria-label="Supprimer ${title} des favoris"
            class="inline-flex w-fit rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            ${isPending ? "disabled" : ""}
          >
            ${isPending ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </article>
  `;
}

// renders the account/profile page with user info, profiles section, and viewing history
function renderProfileView(state) {
  const user = state.session.user;
  const logoutState = state.ui.logout;
  const watchlistCount = Array.isArray(state.watchlist.items)
    ? state.watchlist.items.length
    : 0;

  return `
    <section class="space-y-6">
      <header class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-sm uppercase tracking-[0.3em] text-sky-300">Profil</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Mon compte</h1>
            <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
              Retrouve ici les informations liées à ton compte et gère ta session.
            </p>
          </div>

          <button
            type="button"
            data-logout
            aria-label="Se déconnecter du compte"
            class="inline-flex w-fit rounded-full border border-rose-300/20 bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            ${logoutState.pending ? "disabled" : ""}
          >
            ${logoutState.pending ? "Déconnexion..." : "Se déconnecter"}
          </button>
        </div>
        ${renderLogoutFeedback(logoutState)}
      </header>

      <dl class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Pseudo</dt>
          <dd class="mt-3 text-lg font-medium text-white">${escapeHtml(user?.username || "-")}</dd>
        </div>
        <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Email</dt>
          <dd class="mt-3 text-lg font-medium text-white">${escapeHtml(user?.email || "-")}</dd>
        </div>
        <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Membre depuis</dt>
          <dd class="mt-3 text-lg font-medium text-white">${formatLongDate(user?.created_at)}</dd>
        </div>
        <div class="rounded-3xl border border-white/10 bg-black/20 p-5">
          <dt class="text-xs uppercase tracking-[0.3em] text-white/40">Favoris</dt>
          <dd class="mt-3 text-lg font-medium text-white">
            ${watchlistCount} titre${watchlistCount > 1 ? "s" : ""}
          </dd>
        </div>
      </dl>

      ${renderProfilesSection(state.profiles)}
      ${renderViewingHistorySection(state.viewingHistory, state.userRatings)}
    </section>
  `;
}

// renders the profiles management section with profile cards, a create form, and feedback
function renderProfilesSection(profilesState) {
  const profiles = Array.isArray(profilesState.items)
    ? profilesState.items
    : [];

  return `
    <section class="space-y-6 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-violet-300">Profils</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          Profils du compte
        </h2>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Crée plusieurs profils sur le même compte et choisis celui qui est actif.
        </p>
      </div>

      ${renderProfileFeedback(profilesState)}

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        ${
          profilesState.status === "loading" || profilesState.status === "idle"
            ? Array.from(
                { length: 3 },
                () => `
                  <div class="h-32 animate-pulse rounded-3xl bg-white/10"></div>
                `
              ).join("")
            : profiles
                .map((profile) =>
                  renderAccountProfileCard(profile, profilesState)
                )
                .join("")
        }
      </div>

      <form data-profile-form class="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label class="space-y-2">
          <span class="text-sm font-medium text-white/80">Nom du nouveau profil</span>
          <input
            type="text"
            name="profileName"
            minlength="2"
            maxlength="30"
            required
            class="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            placeholder="Ex: Salon"
          />
        </label>
        <div class="space-y-2">
          <span class="text-sm font-medium text-white/80">Couleur</span>
          ${renderProfileColorPicker("bg-black/30")}
        </div>
        <button
          type="submit"
          class="rounded-full bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          ${profilesState.pending ? "disabled" : ""}
        >
          ${profilesState.pending ? "Création..." : "Créer"}
        </button>
      </form>
    </section>
  `;
}

// renders a success or error feedback message from the last profile action
function renderProfileFeedback(profilesState) {
  const message = profilesState.lastAction?.message || profilesState.error;

  if (!message) {
    return "";
  }

  const tone = profilesState.lastAction?.tone || "error";
  const toneClass =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : "border-rose-400/20 bg-rose-500/10 text-rose-100";

  return `
    <p class="rounded-2xl border px-4 py-3 text-sm ${toneClass}">
      ${escapeHtml(message)}
    </p>
  `;
}

// renders a single profile card with avatar, name, status, and a select button - highlighted when active
function renderAccountProfileCard(profile, profilesState) {
  const isActive = profile.id === profilesState.activeProfileId;
  const profileName = escapeHtml(profile.name);

  return `
    <article class="rounded-3xl border ${
      isActive
        ? "border-violet-300/40 bg-violet-500/10"
        : "border-white/10 bg-black/20"
    } p-5">
      <div class="flex items-center gap-4">
        <span
          aria-hidden="true"
          class="solid-on-color grid h-14 w-14 place-items-center rounded-2xl text-lg font-semibold text-white shadow-lg"
          style="background-color: ${escapeHtml(profile.avatarColor)}"
        >
          ${profileName.slice(0, 1).toUpperCase()}
        </span>
        <div class="min-w-0">
          <h3 class="truncate text-lg font-semibold text-white">${profileName}</h3>
          <p class="text-sm text-white/55">
            ${isActive ? "Profil actif" : "Profil disponible"}
          </p>
        </div>
      </div>
      <button
        type="button"
        data-select-profile="${profile.id}"
        class="mt-5 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${
          isActive
            ? "bg-white text-neutral-950"
            : "bg-white/10 text-white hover:bg-white/20"
        }"
        ${isActive ? "disabled" : ""}
      >
        ${isActive ? "Sélectionné" : "Utiliser ce profil"}
      </button>
    </article>
  `;
}

// renders the viewing history carousel or an appropriate loading/error/empty state
function renderViewingHistorySection(historyState, userRatingsState) {
  if (!historyState || historyState.status === "idle") {
    return renderViewingHistoryLoading();
  }

  if (historyState.status === "loading") {
    return renderViewingHistoryLoading();
  }

  if (historyState.status === "error") {
    return `
      <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100 shadow-xl shadow-black/20">
        <p class="text-sm uppercase tracking-[0.3em] text-rose-200">Historique</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight">Derniers contenus consultés</h2>
        <p class="mt-5 text-base leading-8">
          ${historyState.error || "Impossible de charger ton historique pour le moment."}
        </p>
      </section>
    `;
  }

  const items = Array.isArray(historyState.items)
    ? historyState.items
        .filter((item) => item?.snapshot?.title)
        .map((item) => ({
          id: item.tmdbId,
          media_type: item.type,
          title: item.snapshot.title,
          poster_path: item.snapshot.poster,
          release_date: item.viewedAt,
          personal_rating_label: getPersonalRatingLabel(userRatingsState, item),
          vote_average: null,
        }))
    : [];

  if (items.length === 0) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 text-white/70 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Historique</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          Derniers contenus consultés
        </h2>
        <p class="mt-5 text-base leading-8">
          Ouvre quelques fiches détail pour retrouver ici tes derniers contenus consultés.
        </p>
      </section>
    `;
  }

  return `
    <section class="space-y-6">
      ${renderCarousel({
        id: "viewing-history",
        title: "Historique",
        items,
      })}
    </section>
  `;
}

// renders a pulse skeleton for the viewing history section while data is loading
function renderViewingHistoryLoading() {
  return `
    <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Historique</p>
      <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
        Derniers contenus consultés
      </h2>
      <div class="mt-6 grid gap-5 sm:grid-cols-3">
        ${Array.from(
          { length: 3 },
          () => `
            <div class="h-48 animate-pulse rounded-[1.75rem] bg-white/10"></div>
          `
        ).join("")}
      </div>
    </section>
  `;
}

// renders the color picker widget with preset swatches and a native color input fallback
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
  renderFavoritesView,
  renderLoginView,
  renderProfileView,
  renderRegisterView,
};
