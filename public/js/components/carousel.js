import { renderPosterCard } from "./poster-card.js";

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
            class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            ←
          </button>
          <button
            type="button"
            data-carousel-next="${id}"
            class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            →
          </button>
        </div>
      </div>

      <div class="relative overflow-hidden" data-carousel-root="${id}">
        <div
          class="flex gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-carousel-track="${id}"
        >
          ${items
            .map(
              (item) => `
                <div class="w-[16rem] shrink-0 sm:w-[18rem]">
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
      if (Math.abs(deltaX) > 6) {
        didDrag = true;
      }
      track.scrollLeft = startScrollLeft - deltaX;
    });

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
