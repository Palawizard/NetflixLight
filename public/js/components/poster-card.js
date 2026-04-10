/**
 * @typedef {object} TmdbMediaItem
 * @property {number} [id]
 * @property {"movie" | "tv" | "person"} [media_type]
 * @property {string} [title]
 * @property {string} [name]
 * @property {number} [vote_average]
 * @property {string} [release_date]
 * @property {string} [first_air_date]
 * @property {string} [poster_path]
 * @property {string} [backdrop_path]
 * @property {string} [overview]
 */

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

/**
 * @param {TmdbMediaItem} item
 */
export function renderPosterCard(item) {
  const title = escapeHtml(item.title || item.name || "Titre inconnu");
  const rating = formatRating(item.vote_average);
  const year = getReleaseYear(item.release_date || item.first_air_date);
  const detailPath = getDetailPath(item);
  const posterMarkup = item.poster_path
    ? `
      <img
        src="${TMDB_IMAGE_BASE_URL}${item.poster_path}"
        alt="Poster de ${title}"
        loading="lazy"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
    `
    : `
      <div class="flex h-full items-center justify-center bg-white/5 px-6 text-center text-sm uppercase tracking-[0.3em] text-white/40">
        ${title}
      </div>
    `;

  if (detailPath) {
    return `
      <button
        type="button"
        data-nav-path="${detailPath}"
        class="group block w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 text-left shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-white/20"
      >
        <div class="relative aspect-2/3 overflow-hidden bg-black/40">
          ${posterMarkup}
          <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-90 transition duration-300 group-hover:opacity-100"></div>

          <div class="absolute inset-x-0 bottom-0 p-5">
            <div class="translate-y-2 transition duration-300 group-hover:translate-y-0">
              <h3 class="text-lg font-semibold text-white">${title}</h3>
              <div class="mt-3 flex items-center gap-3 text-sm text-white/75">
                <span class="rounded-full bg-black/40 px-3 py-1 text-amber-300">
                  ${rating}
                </span>
                <span>${year}</span>
              </div>
            </div>
          </div>
        </div>
      </button>
    `;
  }

  return `
    <article class="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-white/20">
      <div class="relative aspect-2/3 overflow-hidden bg-black/40">
        ${posterMarkup}
        <div class="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-90 transition duration-300 group-hover:opacity-100"></div>

        <div class="absolute inset-x-0 bottom-0 p-5">
          <div class="translate-y-2 transition duration-300 group-hover:translate-y-0">
            <h3 class="text-lg font-semibold text-white">${title}</h3>
            <div class="mt-3 flex items-center gap-3 text-sm text-white/75">
              <span class="rounded-full bg-black/40 px-3 py-1 text-amber-300">
                ${rating}
              </span>
              <span>${year}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function formatRating(voteAverage) {
  if (typeof voteAverage !== "number" || Number.isNaN(voteAverage)) {
    return "N/A";
  }

  return `${voteAverage.toFixed(1)}/10`;
}

function getDetailPath(item) {
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
