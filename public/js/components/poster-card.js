/**
 * @typedef {object} TmdbMediaItem
 * @property {number} [id]
 * @property {"movie" | "tv" | "person"} [media_type]
 * @property {string} [title]
 * @property {string} [name]
 * @property {number} [vote_average]
 * @property {string} [personal_rating_label]
 * @property {string} [release_date]
 * @property {string} [first_air_date]
 * @property {string} [poster_path]
 * @property {string} [backdrop_path]
 * @property {string} [overview]
 * @property {string} [navigation_path]
 */

import { renderTmdbImage } from "../tmdb-images.js";

/**
 * @param {TmdbMediaItem} item
 */
export function renderPosterCard(item) {
  const title = escapeHtml(item.title || item.name || "Titre inconnu");
  const overview =
    typeof item.overview === "string" && item.overview.trim()
      ? escapeHtml(item.overview.trim())
      : "";
  const ratingChips = renderRatingChips(item);
  const year = getReleaseYear(item.release_date || item.first_air_date);
  const detailPath = getDetailPath(item);
  const posterMarkup = item.poster_path
    ? renderTmdbImage({
        path: item.poster_path,
        alt: `Poster de ${title}`,
        size: "w342",
        srcSetSizes: [
          { size: "w185", width: 185 },
          { size: "w342", width: 342 },
          { size: "w500", width: 500 },
        ],
        sizes: "(max-width: 640px) 70vw, 18rem",
        className:
          "h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]",
      })
    : `
      <div class="media-surface flex h-full items-center justify-center bg-linear-to-br from-white/10 via-white/5 to-black/40 px-6 text-center text-sm uppercase tracking-[0.3em] text-white/40">
        ${title}
      </div>
    `;

  if (detailPath) {
    return `
      <button
        type="button"
        data-nav-path="${detailPath}"
        aria-label="Ouvrir la fiche détail de ${title}"
        class="group block w-full transform-gpu overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 text-left shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-300 motion-reduce:transform-none motion-reduce:transition-none"
      >
        <div class="media-surface relative aspect-2/3 overflow-hidden bg-black/40">
          ${posterMarkup}
          <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-90 transition duration-300 group-hover:opacity-100"></div>

        <div class="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div class="translate-y-2 transition duration-300 group-hover:translate-y-0">
              <h3 class="text-base font-semibold text-white sm:text-lg">${title}</h3>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/75 sm:text-sm">
                ${ratingChips}
                <span>${year}</span>
              </div>
              ${overview ? `<p class="mt-2 line-clamp-2 text-xs leading-relaxed text-white/60 opacity-0 transition duration-300 group-hover:opacity-100">${overview}</p>` : ""}
            </div>
          </div>
        </div>
      </button>
    `;
  }

  return `
    <article class="group transform-gpu overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-white/20 motion-reduce:transform-none motion-reduce:transition-none">
      <div class="media-surface relative aspect-2/3 overflow-hidden bg-black/40">
        ${posterMarkup}
        <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-90 transition duration-300 group-hover:opacity-100"></div>

        <div class="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div class="translate-y-2 transition duration-300 group-hover:translate-y-0">
            <h3 class="text-base font-semibold text-white sm:text-lg">${title}</h3>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/75 sm:text-sm">
              ${ratingChips}
              <span>${year}</span>
            </div>
            ${overview ? `<p class="mt-2 line-clamp-2 text-xs leading-relaxed text-white/60 opacity-0 transition duration-300 group-hover:opacity-100">${overview}</p>` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderRatingChips(item) {
  const chips = [];
  const tmdbRating = formatTmdbRating(item.vote_average);
  const personalRating =
    typeof item.personal_rating_label === "string"
      ? item.personal_rating_label.trim()
      : "";

  if (tmdbRating) {
    chips.push(`TMDB ${tmdbRating}`);
  }

  if (personalRating) {
    chips.push(`Ma note ${personalRating}`);
  }

  return chips
    .map(
      (chip) => `
        <span class="media-chip rounded-full px-3 py-1">
          ${escapeHtml(chip)}
        </span>
      `
    )
    .join("");
}

function formatTmdbRating(voteAverage) {
  if (typeof voteAverage !== "number" || Number.isNaN(voteAverage)) {
    return null;
  }

  return `${voteAverage.toFixed(1)}/10`;
}

function getDetailPath(item) {
  if (typeof item?.navigation_path === "string" && item.navigation_path) {
    return item.navigation_path;
  }

  if (!item?.id) {
    return null;
  }

  if (item.media_type === "movie" || item.media_type === "tv") {
    return `/${item.media_type}/${item.id}`;
  }

  return null;
}

function getReleaseYear(dateString) {
  if (typeof dateString !== "string" || dateString.length < 4) {
    return "Année inconnue";
  }

  return dateString.slice(0, 4);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
