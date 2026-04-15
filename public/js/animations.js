const ANIMATION_SELECTOR = [
  "main > section > header",
  "main > section > article",
  "main > section > div",
  "main [data-carousel-root]",
].join(",");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

/**
 * sets up intersection-observer-based entrance animations on matching elements
 * skips animation entirely when the user prefers reduced motion or IntersectionObserver is unavailable
 */
export function initializeAnimations(container) {
  const elements = Array.from(
    container.querySelectorAll(ANIMATION_SELECTOR)
  ).filter((element) => {
    const isSectionDiv =
      element.parentElement?.tagName === "SECTION" && element.tagName === "DIV";

    // exclude wrapper divs that just contain a carousel - the carousel animates its own children
    return !isSectionDiv || !element.querySelector("[data-carousel-root]");
  });

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
      threshold: 0.01,
      rootMargin: "0px 0px 20% 0px",
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
    // stagger each element up to a max of 180ms so they don't all animate at the same time
    element.style.transitionDelay = `${Math.min(index * 35, 180)}ms`;
    observer.observe(element);
  });
}

/**
 * animates an element into view by resetting its opacity and transform
 */
function revealElement(element) {
  window.requestAnimationFrame(() => {
    element.style.opacity = "1";
    element.style.transform = "translate3d(0, 0, 0)";
  });
}

/**
 * makes an element visible instantly without any transition
 */
function showElementImmediately(element) {
  element.style.opacity = "1";
  element.style.transform = "none";
  element.style.transition = "none";
}
