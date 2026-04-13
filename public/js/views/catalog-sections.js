import { renderCarousel } from "../components/carousel.js";

function renderMoviesCatalog(moviesState) {
  return renderCatalogCarouselSection(moviesState, {
    id: "movies-popular",
    title: "Films populaires",
    retryKey: "movies-popular",
  });
}

function renderSeriesCatalog(seriesState) {
  return renderCatalogCarouselSection(seriesState, {
    id: "series-popular",
    title: "Séries populaires",
    retryKey: "series-popular",
  });
}

function renderHomeCarousels(homeCatalogState) {
  return `
    <div class="space-y-8">
      ${renderCatalogCarouselSection(homeCatalogState.trending, {
        id: "home-trending",
        title: "Tendances",
        retryKey: "home-trending",
      })}
      ${renderCatalogCarouselSection(homeCatalogState.moviesPopular, {
        id: "home-movies-popular",
        title: "Films populaires",
        retryKey: "home-movies-popular",
      })}
      ${renderCatalogCarouselSection(homeCatalogState.tvPopular, {
        id: "home-tv-popular",
        title: "Séries populaires",
        retryKey: "home-tv-popular",
      })}
      ${renderCatalogCarouselSection(homeCatalogState.topRated, {
        id: "home-top-rated",
        title: "Mieux notés",
        retryKey: "home-top-rated",
      })}
    </div>
  `;
}

function renderGenreCarousels(genreState) {
  const genreSections = [
    { key: "action", id: "genre-action", title: "Action" },
    { key: "adventure", id: "genre-adventure", title: "Aventure" },
    { key: "animation", id: "genre-animation", title: "Animation" },
    { key: "comedy", id: "genre-comedy", title: "Comédie" },
    { key: "crime", id: "genre-crime", title: "Crime" },
    { key: "drama", id: "genre-drama", title: "Drame" },
    { key: "family", id: "genre-family", title: "Famille" },
    { key: "fantasy", id: "genre-fantasy", title: "Fantastique" },
    { key: "horror", id: "genre-horror", title: "Horreur" },
    { key: "romance", id: "genre-romance", title: "Romance" },
    {
      key: "scienceFiction",
      id: "genre-science-fiction",
      title: "Science-fiction",
    },
    { key: "thriller", id: "genre-thriller", title: "Thriller" },
  ];
  const isLoading = genreSections.some((genreSection) => {
    const sectionState = genreState[genreSection.key];

    return (
      !sectionState ||
      sectionState.status === "idle" ||
      sectionState.status === "loading"
    );
  });
  const carouselMarkup = genreSections
    .map((genreSection) =>
      renderGenreCarouselSection(genreState[genreSection.key], genreSection)
    )
    .filter(Boolean)
    .join("");

  return `
    <div class="space-y-8">
      ${isLoading ? renderCarouselSkeleton("Genres de films") : ""}
      ${carouselMarkup || (isLoading ? "" : renderCarouselEmpty("Genres de films"))}
    </div>
  `;
}

function renderSeriesGenreCarousels(genreState) {
  const genreSections = [
    {
      key: "actionAdventure",
      id: "series-genre-action-adventure",
      title: "Action & aventure",
    },
    { key: "animation", id: "series-genre-animation", title: "Animation" },
    { key: "comedy", id: "series-genre-comedy", title: "Comédie" },
    { key: "crime", id: "series-genre-crime", title: "Crime" },
    {
      key: "documentary",
      id: "series-genre-documentary",
      title: "Documentaire",
    },
    { key: "drama", id: "series-genre-drama", title: "Drame" },
    { key: "family", id: "series-genre-family", title: "Famille" },
    { key: "kids", id: "series-genre-kids", title: "Jeunesse" },
    { key: "mystery", id: "series-genre-mystery", title: "Mystère" },
    { key: "reality", id: "series-genre-reality", title: "Télé-réalité" },
    {
      key: "scifiFantasy",
      id: "series-genre-scifi-fantasy",
      title: "Science-fiction & fantastique",
    },
    { key: "talk", id: "series-genre-talk", title: "Talk-show" },
    {
      key: "warPolitics",
      id: "series-genre-war-politics",
      title: "Guerre & politique",
    },
  ];
  const isLoading = genreSections.some((genreSection) => {
    const sectionState = genreState[genreSection.key];

    return (
      !sectionState ||
      sectionState.status === "idle" ||
      sectionState.status === "loading"
    );
  });
  const carouselMarkup = genreSections
    .map((genreSection) =>
      renderGenreCarouselSection(genreState[genreSection.key], genreSection)
    )
    .filter(Boolean)
    .join("");

  return `
    <div class="space-y-8">
      ${isLoading ? renderCarouselSkeleton("Genres de séries") : ""}
      ${carouselMarkup || (isLoading ? "" : renderCarouselEmpty("Genres de séries"))}
    </div>
  `;
}

function renderGenreCarouselSection(sectionState, { id, title }) {
  if (
    !sectionState ||
    sectionState.status === "idle" ||
    sectionState.status === "loading" ||
    sectionState.status === "error" ||
    !Array.isArray(sectionState.items) ||
    sectionState.items.length === 0
  ) {
    return "";
  }

  return renderCarousel({
    id,
    title,
    items: sectionState.items,
  });
}

function renderCatalogCarouselSection(sectionState, { id, title, retryKey }) {
  if (!sectionState || sectionState.status === "idle") {
    return renderCarouselSkeleton(title);
  }

  if (sectionState.status === "loading") {
    return renderCarouselSkeleton(title);
  }

  if (sectionState.status === "error") {
    return renderCarouselError(title, retryKey, sectionState.error);
  }

  if (!Array.isArray(sectionState.items) || sectionState.items.length === 0) {
    return renderCarouselEmpty(title);
  }

  return renderCarousel({
    id,
    title,
    items: sectionState.items,
  });
}

function renderCarouselSkeleton(title) {
  return `
    <section class="space-y-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/40">Sélection</p>
        <h2 class="text-2xl font-semibold tracking-tight text-white">${title}</h2>
      </div>

      <div class="flex gap-5 overflow-hidden pb-4">
        ${Array.from(
          { length: 5 },
          () => `
          <article class="w-[16rem] shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20 sm:w-[18rem]">
            <div class="aspect-2/3 animate-pulse bg-white/10"></div>
          </article>
        `
        ).join("")}
      </div>
    </section>
  `;
}

function renderCarouselError(title, retryKey, errorMessage) {
  return `
    <section class="space-y-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/40">Sélection</p>
        <h2 class="text-2xl font-semibold tracking-tight text-white">${title}</h2>
      </div>

      <div class="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100 shadow-xl shadow-black/20">
        <p class="text-sm text-rose-100/90">
          ${errorMessage || "Impossible de charger cette section pour le moment."}
        </p>
        <button
          type="button"
          data-retry-section="${retryKey}"
          class="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Réessayer
        </button>
      </div>
    </section>
  `;
}

function renderCarouselEmpty(title) {
  return `
    <section class="space-y-4">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/40">Sélection</p>
        <h2 class="text-2xl font-semibold tracking-tight text-white">${title}</h2>
      </div>

      <div class="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-white/70 shadow-xl shadow-black/20">
        Aucun titre disponible pour le moment.
      </div>
    </section>
  `;
}

export {
  renderCarouselSkeleton,
  renderGenreCarousels,
  renderHomeCarousels,
  renderMoviesCatalog,
  renderSeriesCatalog,
  renderSeriesGenreCarousels,
};
