import { renderTmdbImage } from "../tmdb-images.js";
import {
  getMainCast,
  getSimilarItems,
  renderMainCastSection,
  renderSimilarContentSection,
} from "./detail-related-sections.js";
import { createFavoriteKey, escapeHtml, formatLongDate } from "./view-utils.js";

const YOUTUBE_TRAILER_TYPES = new Set(["Trailer", "Teaser"]);
const YOUTUBE_TRAILER_LANGUAGES = ["fr", "en"];

function renderDetailView(state, type, id) {
  const detailState = state.detail;
  const isMatchingDetail = detailState.type === type && detailState.id === id;

  if (
    !isMatchingDetail ||
    detailState.status === "idle" ||
    detailState.status === "loading"
  ) {
    return renderDetailLoading();
  }

  if (detailState.status === "error") {
    return renderDetailError(type, id, detailState.error);
  }

  if (!detailState.item) {
    return renderDetailLoading();
  }

  return renderDetailContent(state, detailState.item, type);
}

function renderDetailLoading() {
  return `
    <section class="space-y-6">
      <div class="h-10 w-40 animate-pulse rounded-full bg-white/10"></div>

      <article class="overflow-hidden rounded-4xl border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
        <div class="h-88 animate-pulse bg-white/10"></div>
        <div class="space-y-5 p-8 sm:p-10">
          <div class="h-4 w-32 animate-pulse rounded-full bg-white/10"></div>
          <div class="h-12 w-full max-w-xl animate-pulse rounded-2xl bg-white/10"></div>
          <div class="h-24 w-full animate-pulse rounded-3xl bg-white/10"></div>
        </div>
      </article>
    </section>
  `;
}

function renderDetailError(type, id, errorMessage) {
  const detailPath = `/${type}/${id}`;
  const returnPath = type === "movie" ? "/films" : "/series";
  const returnLabel =
    type === "movie" ? "Retour aux films" : "Retour aux séries";

  return `
    <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
      <p class="text-sm uppercase tracking-[0.35em] text-rose-300">Détail</p>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
        Impossible de charger ce ${type === "movie" ? "film" : "contenu"}
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-rose-100/90">
        ${errorMessage || "Une erreur est survenue pendant le chargement."}
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          data-retry-detail="${detailPath}"
          class="rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Réessayer
        </button>
        <button
          type="button"
          data-nav-path="${returnPath}"
          class="rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
        >
          ${returnLabel}
        </button>
      </div>
    </section>
  `;
}

function renderDetailContent(state, item, type) {
  const title = escapeHtml(item.title || item.name || "Titre inconnu");
  const overview = escapeHtml(
    item.overview || "Aucun synopsis n'est disponible pour ce titre."
  );
  const backdropPath = item.backdrop_path || item.poster_path;
  const dateLabel = type === "movie" ? "Date de sortie" : "Première diffusion";
  const durationLabel = type === "movie" ? "Durée" : "Saisons";
  const returnPath = type === "movie" ? "/films" : "/series";
  const returnLabel =
    type === "movie" ? "Retour aux films" : "Retour aux séries";
  const genres = getGenreNames(item.genres);
  const mainCast = getMainCast(item.credits?.cast);
  const similarItems = getSimilarItems(item.similar?.results, type, item.id);
  const trailer = findBestYoutubeTrailer(item.videos?.results);

  return `
    <section class="space-y-8">
      <button
        type="button"
        data-nav-path="${returnPath}"
        class="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        ${returnLabel}
      </button>

      <article class="media-surface relative overflow-hidden rounded-4xl border border-white/10 shadow-2xl shadow-black/30">
        <div class="absolute inset-0">
          ${
            backdropPath
              ? renderTmdbImage({
                  path: backdropPath,
                  alt: title,
                  size: "w1280",
                  srcSetSizes: [
                    { size: "w780", width: 780 },
                    { size: "w1280", width: 1280 },
                    { size: "original", width: 1920 },
                  ],
                  sizes: "100vw",
                  loading: "eager",
                  fetchPriority: "high",
                  className: "h-full w-full object-cover",
                })
              : '<div class="h-full w-full bg-linear-to-br from-rose-500/30 via-black to-black"></div>'
          }
        </div>
        <div class="absolute inset-0 bg-linear-to-r from-black via-black/78 to-black/35"></div>

        <div class="relative z-10 flex min-h-96 items-end p-6 sm:min-h-120 sm:p-10">
          <div class="max-w-3xl">
            <div class="flex flex-wrap gap-3">
              <span class="rounded-full bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-rose-200">
                ${type === "movie" ? "Film" : "Série"}
              </span>
              <span class="media-chip rounded-full px-4 py-2 text-sm font-medium">
                Note ${formatVoteAverage(item.vote_average)}
              </span>
            </div>

            <h1 class="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-6xl">
              ${title}
            </h1>

            <p class="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
              ${overview}
            </p>

            ${renderFavoriteToggle(state, item, type)}
            ${renderPersonalRating(state, item, type)}

            <div class="mt-8 flex flex-wrap gap-3">
              ${renderDetailBadge(dateLabel, formatLongDate(item.release_date || item.first_air_date))}
              ${renderDetailBadge(durationLabel, type === "movie" ? formatRuntime(item.runtime) : formatSeasonCount(item.number_of_seasons))}
              ${renderDetailBadge("Genres", formatGenreSummary(genres))}
            </div>
          </div>
        </div>
      </article>

      ${renderYoutubeTrailerOption(trailer)}
      ${renderSimilarContentSection(similarItems, type, item.id)}
      ${renderMainCastSection(mainCast)}
    </section>
  `;
}

function renderYoutubeTrailerOption(trailer) {
  if (!trailer) {
    return "";
  }

  return `
    <section class="space-y-4 rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-amber-300">Bande-annonce</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          ${escapeHtml(trailer.title)}
        </h2>
      </div>

      <div
        data-youtube-player="${escapeHtml(trailer.key)}"
        class="overflow-hidden rounded-3xl border border-white/10 bg-black"
      >
        <div class="relative aspect-video w-full overflow-hidden bg-black">
          <div data-youtube-player-iframe class="h-full w-full"></div>
          <div
            data-player-spinner
            class="absolute inset-0 flex items-center justify-center bg-black"
            aria-hidden="true"
          >
            <div class="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
          </div>
        </div>

        <div
          data-player-controls
          hidden
          class="flex items-center gap-3 border-t border-white/10 bg-black/90 px-4 py-3"
          aria-label="Contrôles du lecteur vidéo"
        >
          <button
            type="button"
            data-player-play-pause
            aria-label="Lire"
            aria-pressed="false"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            <svg data-icon-play class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg data-icon-pause class="hidden h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>

          <span
            data-player-time
            class="shrink-0 text-xs tabular-nums text-white/40"
            aria-live="off"
          >0:00 / 0:00</span>

          <div
            data-player-progress
            role="slider"
            aria-label="Progression de la vidéo"
            aria-valuenow="0"
            aria-valuemin="0"
            aria-valuemax="100"
            tabindex="0"
            class="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/20 transition-all hover:h-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            <div
              data-player-progress-fill
              class="pointer-events-none h-full rounded-full bg-rose-400"
              style="width: 0%"
            ></div>
          </div>

          <button
            type="button"
            data-player-mute
            aria-label="Couper le son"
            aria-pressed="false"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            <svg data-icon-unmuted class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <svg data-icon-muted class="hidden h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>

          <input
            type="range"
            data-player-volume
            min="0"
            max="100"
            value="100"
            aria-label="Volume"
            class="w-28 shrink-0 cursor-pointer accent-rose-400"
          />
        </div>
      </div>
    </section>
  `;
}

function findBestYoutubeTrailer(videos) {
  if (!Array.isArray(videos)) {
    return null;
  }

  const youtubeVideos = videos.filter(
    (video) =>
      video &&
      video.site === "YouTube" &&
      typeof video.key === "string" &&
      video.key.trim() &&
      YOUTUBE_TRAILER_TYPES.has(video.type)
  );

  if (youtubeVideos.length === 0) {
    return null;
  }

  const bestVideo =
    youtubeVideos.find((video) => video.official && video.iso_639_1 === "fr") ||
    youtubeVideos.find((video) => video.iso_639_1 === "fr") ||
    youtubeVideos.find((video) => video.official && video.type === "Trailer") ||
    youtubeVideos.find((video) => video.type === "Trailer") ||
    youtubeVideos.find((video) =>
      YOUTUBE_TRAILER_LANGUAGES.includes(video.iso_639_1)
    ) ||
    youtubeVideos[0];

  return {
    title: bestVideo.name || "Bande-annonce",
    key: bestVideo.key.trim(),
  };
}

function renderFavoriteToggle(state, item, type) {
  const isAuthenticated =
    state.session.status === "authenticated" && Boolean(state.session.user);
  const tmdbId = item.id;
  const watchlistKey = createFavoriteKey(type, tmdbId);
  const isHydratingWatchlist =
    isAuthenticated &&
    (state.watchlist.status === "idle" || state.watchlist.status === "loading");
  const isFavorite = Boolean(state.watchlist.itemKeys[watchlistKey]);
  const isPending = Boolean(state.watchlist.pendingKeys[watchlistKey]);
  const lastAction =
    state.watchlist.lastAction?.key === watchlistKey
      ? state.watchlist.lastAction
      : null;
  const buttonLabel = isHydratingWatchlist
    ? "Vérification..."
    : isPending
      ? "Mise à jour..."
      : isFavorite
        ? "Retirer des favoris"
        : "Ajouter aux favoris";
  const buttonClass = isFavorite
    ? "bg-rose-500 text-white hover:bg-rose-400"
    : "bg-white text-neutral-950 hover:bg-white/90";
  const helperMessage =
    lastAction?.message ||
    (isHydratingWatchlist
      ? "On vérifie si ce titre est déjà dans tes favoris."
      : null) ||
    (isAuthenticated
      ? ""
      : "Connecte-toi pour enregistrer ce titre dans tes favoris.");

  return `
    <div class="mt-8 space-y-3">
      <button
        type="button"
        data-toggle-favorite
        aria-label="${buttonLabel}"
        class="rounded-full px-5 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}"
        ${isPending || isHydratingWatchlist ? "disabled" : ""}
      >
        ${buttonLabel}
      </button>
      ${
        helperMessage
          ? `
            <p class="text-sm ${
              lastAction?.tone === "error"
                ? "text-rose-200"
                : lastAction?.tone === "success"
                  ? "text-emerald-200"
                  : "text-white/65"
            }">
              ${helperMessage}
            </p>
          `
          : ""
      }
    </div>
  `;
}

function renderPersonalRating(state, item, type) {
  const isAuthenticated =
    state.session.status === "authenticated" && Boolean(state.session.user);
  const ratingKey = createFavoriteKey(type, item.id);
  const ratingItem = state.userRatings.itemKeys[ratingKey];
  const selectedRating = ratingItem?.rating || 0;
  const isHydratingRatings =
    isAuthenticated &&
    (state.userRatings.status === "idle" ||
      state.userRatings.status === "loading");
  const isPending = Boolean(state.userRatings.pendingKeys[ratingKey]);
  const lastAction =
    state.userRatings.lastAction?.key === ratingKey
      ? state.userRatings.lastAction
      : null;
  const helperMessage =
    lastAction?.message ||
    (isHydratingRatings
      ? "On charge ta note personnelle."
      : selectedRating > 0
        ? ""
        : isAuthenticated
          ? "Note ce titre de 1 à 5 étoiles."
          : "Connecte-toi pour noter ce titre.");

  return `
    <section class="media-panel mt-8 rounded-3xl border border-white/10 p-5">
      <p class="text-xs uppercase tracking-[0.3em] text-amber-300">Ta note</p>
      <div class="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Notation personnelle">
        ${[1, 2, 3, 4, 5]
          .map((rating) =>
            renderRatingStarButton({
              rating,
              selectedRating,
              disabled: isPending || isHydratingRatings,
            })
          )
          .join("")}
      </div>
      ${
        helperMessage
          ? `
            <p class="mt-4 text-sm ${
              lastAction?.tone === "error"
                ? "text-rose-200"
                : lastAction?.tone === "success"
                  ? "text-emerald-200"
                  : "text-white/65"
            }">
              ${helperMessage}
            </p>
          `
          : ""
      }
    </section>
  `;
}

function renderRatingStarButton({ rating, selectedRating, disabled }) {
  const isSelected = rating <= selectedRating;

  return `
    <button
      type="button"
      data-set-rating="${rating}"
      aria-label="Mettre ${rating} étoile${rating > 1 ? "s" : ""} sur 5"
      aria-pressed="${isSelected ? "true" : "false"}"
      class="rounded-full border px-4 py-2 text-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60 ${
        isSelected
          ? "border-amber-300/40 bg-amber-400/20 text-amber-200"
          : "border-white/10 bg-white/5 text-white/45 hover:bg-white/10 hover:text-amber-200"
      }"
      ${disabled ? "disabled" : ""}
    >
      ★
    </button>
  `;
}

function renderDetailBadge(label, value) {
  return `
    <span class="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
      <span class="font-medium text-white">${label}:</span> ${escapeHtml(value)}
    </span>
  `;
}

function getGenreNames(genres) {
  if (!Array.isArray(genres)) {
    return [];
  }

  return genres
    .map((genre) => (typeof genre?.name === "string" ? genre.name.trim() : ""))
    .filter(Boolean);
}

function formatGenreSummary(genres) {
  if (!Array.isArray(genres) || genres.length === 0) {
    return "Genres indisponibles";
  }

  return genres.join(", ");
}

function formatRuntime(runtime) {
  if (!Number.isInteger(runtime) || runtime <= 0) {
    return "Durée inconnue";
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatSeasonCount(numberOfSeasons) {
  if (!Number.isInteger(numberOfSeasons) || numberOfSeasons <= 0) {
    return "Nombre de saisons inconnu";
  }

  return `${numberOfSeasons} ${numberOfSeasons === 1 ? "saison" : "saisons"}`;
}

function formatVoteAverage(voteAverage) {
  if (typeof voteAverage !== "number" || Number.isNaN(voteAverage)) {
    return "indisponible";
  }

  return `${voteAverage.toFixed(1)}/10`;
}

export { renderDetailView };
