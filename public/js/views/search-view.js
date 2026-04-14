import { renderPosterCard } from "../components/poster-card.js";
import { escapeHtml } from "./view-utils.js";

// renders the search page with a header showing the current query/result count and the results section
function renderSearchView(state) {
  const searchState = state.search;
  const hasQuery = Boolean(searchState.query);
  const totalResultsLabel =
    searchState.totalResults > 0
      ? `${searchState.totalResults} résultat${searchState.totalResults > 1 ? "s" : ""}`
      : "Résultats";

  return `
    <section class="space-y-6">
      <header class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-cyan-300">Recherche</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          ${
            hasQuery
              ? `Résultats pour "${escapeHtml(searchState.query)}"`
              : "Trouve ton prochain visionnage"
          }
        </h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          ${
            hasQuery
              ? "Parcours les films et séries correspondants puis ouvre leur fiche détail."
              : "Utilise la barre de recherche du header pour chercher un film ou une série depuis n'importe quelle page."
          }
        </p>
        ${
          hasQuery
            ? `
              <div class="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/55">
                <span class="rounded-full border border-white/10 bg-black/20 px-4 py-2">
                  ${totalResultsLabel}
                </span>
                ${
                  searchState.totalPages > 0
                    ? `
                      <span class="rounded-full border border-white/10 bg-black/20 px-4 py-2">
                        Page ${searchState.page} / ${searchState.totalPages}
                      </span>
                    `
                    : ""
                }
              </div>
            `
            : ""
        }
      </header>

      ${renderSearchResults(searchState)}
    </section>
  `;
}

// renders search results as a poster grid - shows a prompt, skeleton, error, empty state, or the grid depending on state
function renderSearchResults(searchState) {
  if (!searchState.query) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 text-white/70 shadow-xl shadow-black/20 backdrop-blur">
        Lance une recherche pour voir apparaître les résultats ici.
      </section>
    `;
  }

  if (searchState.status === "loading" || searchState.status === "idle") {
    return `
      <section class="space-y-4">
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${Array.from(
            { length: 8 },
            () => `
              <article class="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20">
                <div class="aspect-2/3 animate-pulse bg-white/10"></div>
              </article>
            `
          ).join("")}
        </div>
      </section>
    `;
  }

  if (searchState.status === "error") {
    return `
      <section class="rounded-4xl border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100 shadow-xl shadow-black/20">
        <p class="text-base leading-8">
          ${searchState.error || "Impossible de charger les résultats pour le moment."}
        </p>
      </section>
    `;
  }

  if (!Array.isArray(searchState.items) || searchState.items.length === 0) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 text-white/70 shadow-xl shadow-black/20 backdrop-blur">
        Aucun résultat pour "${escapeHtml(searchState.query)}".
      </section>
    `;
  }

  return `
    <section class="space-y-4">
      <p class="text-sm uppercase tracking-[0.3em] text-white/40">
        ${searchState.items.length} résultat${searchState.items.length > 1 ? "s" : ""} sur cette page
      </p>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${searchState.items
          .map(
            (item) => `
              <div>
                ${renderPosterCard(item)}
              </div>
            `
          )
          .join("")}
      </div>
      ${renderSearchPagination(searchState)}
    </section>
  `;
}

// renders previous/next page buttons for search results - returns empty string when there is only one page
function renderSearchPagination(searchState) {
  if (
    !Number.isInteger(searchState.totalPages) ||
    searchState.totalPages <= 1 ||
    !Number.isInteger(searchState.page) ||
    searchState.page <= 0
  ) {
    return "";
  }

  const canGoPrevious = searchState.page > 1;
  const canGoNext = searchState.page < searchState.totalPages;

  return `
    <div class="flex flex-col gap-3 rounded-4xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-white/65">
        Navigation entre les pages de résultats.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-search-page="${searchState.page - 1}"
          class="rounded-full border border-white/10 px-4 py-2 text-sm font-medium transition ${
            canGoPrevious
              ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
              : "bg-white/5 text-white/35"
          }"
          ${canGoPrevious ? "" : "disabled"}
        >
          Page précédente
        </button>
        <span class="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">
          ${searchState.page} / ${searchState.totalPages}
        </span>
        <button
          type="button"
          data-search-page="${searchState.page + 1}"
          class="rounded-full border border-white/10 px-4 py-2 text-sm font-medium transition ${
            canGoNext
              ? "bg-white text-neutral-950 hover:bg-white/90"
              : "bg-white/5 text-white/35"
          }"
          ${canGoNext ? "" : "disabled"}
        >
          Page suivante
        </button>
      </div>
    </div>
  `;
}

export { renderSearchView };
