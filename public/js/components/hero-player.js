/* global YT */

import { whenApiReady } from "./youtube-player.js";

const HERO_AUTOPLAY_DELAY_MS = 2_000;

let instanceId = 0;
let currentHeroPlayer = null;
let heroDelayTimerId = null;

export function initializeHeroPlayer(rootElement) {
  // Invalidate any in-flight API callback from a previous call
  const myId = ++instanceId;

  // Tear down previous player and timer
  if (heroDelayTimerId !== null) {
    clearTimeout(heroDelayTimerId);
    heroDelayTimerId = null;
  }

  if (currentHeroPlayer) {
    try {
      currentHeroPlayer.ytPlayer?.destroy();
    } catch {
      // player may already be gone
    }

    currentHeroPlayer = null;
  }

  const section = rootElement.querySelector("[data-hero]");

  if (!section) return;

  const videoKey = section.getAttribute("data-hero-trailer-key");

  if (!videoKey) return;

  const backdrop = section.querySelector("[data-hero-backdrop]");
  const videoLayer = section.querySelector("[data-hero-video-layer]");
  const iframeTarget = section.querySelector("[data-hero-player-iframe]");
  const muteBtn = section.querySelector("[data-hero-mute]");
  const clickArea = section.querySelector("[data-hero-click-area]");
  const feedbackInner = section.querySelector("[data-hero-feedback-inner]");

  if (!iframeTarget) return;

  let isMuted = true;

  function showFeedback(type) {
    if (!feedbackInner) return;
    feedbackInner
      .querySelectorAll("[data-feedback-icon]")
      .forEach((el) => el.classList.add("hidden"));
    feedbackInner
      .querySelector(`[data-feedback-icon="${type}"]`)
      ?.classList.remove("hidden");
    feedbackInner.classList.remove("hero-feedback-active");
    void feedbackInner.offsetWidth;
    feedbackInner.classList.add("hero-feedback-active");
  }

  whenApiReady(() => {
    if (instanceId !== myId) return;

    const ytPlayer = new YT.Player(iframeTarget, {
      height: "100%",
      width: "100%",
      videoId: videoKey,
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
        mute: 1,
        playsinline: 1,
      },
      events: {
        onReady() {
          ytPlayer.mute();
          heroDelayTimerId = window.setTimeout(() => {
            heroDelayTimerId = null;
            startVideo();
          }, HERO_AUTOPLAY_DELAY_MS);
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.ENDED) {
            showBackdrop();
          }
        },
      },
    });

    currentHeroPlayer = { ytPlayer };

    function startVideo() {
      backdrop?.classList.add("opacity-0");
      videoLayer?.classList.remove("opacity-0");
      ytPlayer.playVideo();
    }

    function showBackdrop() {
      backdrop?.classList.remove("opacity-0");
      videoLayer?.classList.add("opacity-0");
      ytPlayer.stopVideo();
    }

    function syncMuteIcons() {
      muteBtn?.setAttribute("aria-pressed", isMuted ? "true" : "false");
      muteBtn?.setAttribute(
        "aria-label",
        isMuted ? "Activer le son" : "Couper le son"
      );
      muteBtn
        ?.querySelector("[data-icon-muted]")
        ?.classList.toggle("hidden", !isMuted);
      muteBtn
        ?.querySelector("[data-icon-unmuted]")
        ?.classList.toggle("hidden", isMuted);
    }

    muteBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      isMuted = !isMuted;

      if (isMuted) {
        ytPlayer.mute();
      } else {
        ytPlayer.unMute();
      }

      syncMuteIcons();
      showFeedback(isMuted ? "muted" : "unmuted");
    });

    clickArea?.addEventListener("click", () => {
      const state = ytPlayer.getPlayerState?.();

      if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
        showFeedback("pause");
      } else {
        ytPlayer.playVideo();
        showFeedback("play");
      }
    });

    syncMuteIcons();
  });
}
