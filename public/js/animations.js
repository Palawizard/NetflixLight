const ANIMATION_SELECTOR = [
  "main > section > header",
  "main > section > article",
  "main > section > div",
  "main [data-carousel-root]",
].join(",");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

export function initializeAnimations(container) {
  const elements = Array.from(container.querySelectorAll(ANIMATION_SELECTOR));

  if (elements.length === 0) {
    return;
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach(showElementImmediately);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        revealElement(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  elements.forEach((element, index) => {
    if (element.dataset.animationReady === "true") {
      return;
    }

    element.dataset.animationReady = "true";
    element.style.opacity = "0";
    element.style.transform = "translate3d(0, 18px, 0)";
    element.style.transition = [
      "opacity 420ms ease",
      "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
    ].join(", ");
    element.style.transitionDelay = `${Math.min(index * 35, 180)}ms`;
    observer.observe(element);
  });
}

function revealElement(element) {
  window.requestAnimationFrame(() => {
    element.style.opacity = "1";
    element.style.transform = "translate3d(0, 0, 0)";
  });
}

function showElementImmediately(element) {
  element.style.opacity = "1";
  element.style.transform = "none";
  element.style.transition = "none";
}
