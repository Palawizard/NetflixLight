import { renderPosterCard } from "./poster-card.js";

/**
 * renders a labeled carousel section with scroll buttons and a row of poster cards
 */
export function renderCarousel({ id, title, items }) {
  return `
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.3em] text-white/40">Selection</p>
          <h2 class="text-2xl font-semibold tracking-tight text-white">${title}</h2>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            data-carousel-prev="${id}"
            aria-label="Faire défiler ${title} vers la gauche"
            class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            ←
          </button>
          <button
            type="button"
            data-carousel-next="${id}"
            aria-label="Faire défiler ${title} vers la droite"
            class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            →
          </button>
        </div>
      </div>

      <div class="relative overflow-hidden" data-carousel-root="${id}">
        <div
          class="carousel-edge-mask flex gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-carousel-track="${id}"
        >
          ${items
            .map(
              (item) => `
              <div class="w-[11rem] shrink-0 sm:w-[14rem] lg:w-[18rem]">
                  ${renderPosterCard(item)}
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

/**
 * attaches pointer-based drag-to-scroll behavior to all carousel tracks inside a container
 * skips tracks that have already been initialized
 */
export function initializeCarousels(container) {
  const tracks = container.querySelectorAll("[data-carousel-track]");

  tracks.forEach((track) => {
    if (track.dataset.carouselReady === "true") {
      return;
    }

    track.dataset.carouselReady = "true";

    let isDragging = false;
    let didDrag = false;
    let startX = 0;
    let startScrollLeft = 0;
    let activePointerId = null;

    track.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      // don't intercept clicks on interactive elements inside the track
      if (
        event.target.closest(
          "[data-nav-path], button, a, input, select, textarea"
        )
      ) {
        return;
      }

      isDragging = true;
      didDrag = false;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = track.scrollLeft;
      track.setPointerCapture(event.pointerId);
      track.classList.add("cursor-grabbing");
    });

    track.addEventListener("pointermove", (event) => {
      if (!isDragging) {
        return;
      }

      const deltaX = event.clientX - startX;
      // only count as a drag once the pointer moves more than 6px to avoid suppressing regular clicks
      if (Math.abs(deltaX) > 6) {
        didDrag = true;
      }
      track.scrollLeft = startScrollLeft - deltaX;
    });

    // stops dragging and releases pointer capture
    const stopDragging = (event) => {
      if (!isDragging || event.pointerId !== activePointerId) {
        return;
      }

      isDragging = false;
      activePointerId = null;
      track.classList.remove("cursor-grabbing");

      if (
        event.pointerId !== undefined &&
        track.hasPointerCapture(event.pointerId)
      ) {
        track.releasePointerCapture(event.pointerId);
      }
    };

    track.addEventListener("pointerup", stopDragging);
    track.addEventListener("pointercancel", stopDragging);
    track.addEventListener("pointerleave", stopDragging);
    track.addEventListener(
      "click",
      (event) => {
        // suppress the click event when the pointer was dragged so cards don't navigate on drag-release
        if (didDrag) {
          event.preventDefault();
          event.stopPropagation();
          didDrag = false;
        }
      },
      true
    );
  });
}

/**
 * scrolls a carousel track by ~85% of its visible width in the given direction
 */
export function scrollCarousel(container, id, direction) {
  const track = container.querySelector(`[data-carousel-track="${id}"]`);

  if (!track) {
    return;
  }

  const amount = Math.round(track.clientWidth * 0.85);
  track.scrollBy({
    left: direction === "next" ? amount : -amount,
    behavior: "smooth",
  });
}
