import { renderCarousel } from "../components/carousel.js";
import { renderTmdbImage } from "../tmdb-images.js";
import { escapeHtml } from "./view-utils.js";

function renderSimilarContentSection(similarItems, type, itemId) {
  const sectionTitle =
    type === "movie" ? "Films similaires" : "Séries similaires";

  if (!Array.isArray(similarItems) || similarItems.length === 0) {
    return "";
  }

  return `
    <section class="space-y-6">
      ${renderCarousel({
        id: `detail-similar-${type}-${itemId}`,
        title: sectionTitle,
        items: similarItems,
      })}
    </section>
  `;
}

function renderMainCastSection(cast) {
  if (!Array.isArray(cast) || cast.length === 0) {
    return `
      <section class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Casting</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          Casting principal
        </h2>
        <p class="mt-5 text-base leading-8 text-white/70">
          Les informations de casting ne sont pas disponibles pour ce titre.
        </p>
      </section>
    `;
  }

  return `
    <section class="space-y-6">
      <div class="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Casting</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
          Casting principal
        </h2>
        <p class="mt-4 max-w-3xl text-base leading-8 text-white/70">
          Retrouve les interprètes principaux et les personnages qu'ils incarnent.
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        ${cast.map((member) => renderCastCard(member)).join("")}
      </div>
    </section>
  `;
}

function renderCastCard(member) {
  const actorName = escapeHtml(member.name || "Nom inconnu");
  const characterName = escapeHtml(formatCharacterName(member.character));
  const photoMarkup = member.profile_path
    ? renderTmdbImage({
        path: member.profile_path,
        alt: actorName,
        size: "w185",
        srcSetSizes: [
          { size: "w185", width: 185 },
          { size: "h632", width: 421 },
        ],
        sizes: "(max-width: 640px) 50vw, 20rem",
        className: "h-full w-full object-cover",
      })
    : `
      <div class="flex h-full items-center justify-center bg-linear-to-br from-white/10 via-white/5 to-black/40 px-6 text-center text-sm uppercase tracking-[0.3em] text-white/40">
        ${actorName}
      </div>
    `;

  return `
    <article class="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl shadow-black/20">
      <div class="aspect-[4/5] overflow-hidden bg-black/30">
        ${photoMarkup}
      </div>
      <div class="space-y-2 p-5">
        <h3 class="text-lg font-semibold text-white">${actorName}</h3>
        <p class="text-sm uppercase tracking-[0.25em] text-white/35">Personnage</p>
        <p class="text-sm leading-7 text-white/75">${characterName}</p>
      </div>
    </article>
  `;
}

function getMainCast(cast) {
  if (!Array.isArray(cast)) {
    return [];
  }

  const seenCastMembers = new Set();

  return cast
    .filter((member) => member && typeof member.name === "string")
    .slice()
    .sort((leftMember, rightMember) => {
      const leftOrder = Number.isInteger(leftMember.order)
        ? leftMember.order
        : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isInteger(rightMember.order)
        ? rightMember.order
        : Number.MAX_SAFE_INTEGER;

      return leftOrder - rightOrder;
    })
    .filter((member) => {
      const castKey = Number.isInteger(member.id)
        ? `id:${member.id}`
        : `name:${member.name.trim().toLowerCase()}`;

      if (seenCastMembers.has(castKey)) {
        return false;
      }

      seenCastMembers.add(castKey);
      return true;
    })
    .slice(0, 8);
}

function getSimilarItems(similarResults, mediaType, currentItemId) {
  if (!Array.isArray(similarResults)) {
    return [];
  }

  const seenSimilarIds = new Set();

  return similarResults
    .filter(
      (item) => item && Number.isInteger(item.id) && item.id !== currentItemId
    )
    .sort((leftItem, rightItem) => {
      const leftHasArtwork = Boolean(
        leftItem?.poster_path || leftItem?.backdrop_path
      );
      const rightHasArtwork = Boolean(
        rightItem?.poster_path || rightItem?.backdrop_path
      );

      if (leftHasArtwork === rightHasArtwork) {
        return 0;
      }

      return leftHasArtwork ? -1 : 1;
    })
    .map((item) => ({
      ...item,
      media_type: mediaType,
    }))
    .filter((item) => {
      if (seenSimilarIds.has(item.id)) {
        return false;
      }

      seenSimilarIds.add(item.id);
      return true;
    })
    .slice(0, 12);
}

function formatCharacterName(characterName) {
  if (typeof characterName !== "string") {
    return "Personnage non renseigné";
  }

  const normalizedCharacterName = characterName.trim();

  if (!normalizedCharacterName) {
    return "Personnage non renseigné";
  }

  return normalizedCharacterName;
}

export {
  getMainCast,
  getSimilarItems,
  renderMainCastSection,
  renderSimilarContentSection,
};
