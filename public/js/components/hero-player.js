/* global YT */

import { whenApiReady } from "./youtube-player.js";

const HERO_AUTOPLAY_DELAY_MS = 2_000;

let instanceId = 0;
let currentHeroPlayer = null;
let heroDelayTimerId = null;

/**
 * initializes the hero trailer player for the [data-hero] section inside rootElement
 * tears down any previous player and waits for the YouTube API before mounting
 */
export function initializeHeroPlayer(rootElement) {
  // invalidate any in-flight API callback from a previous call
  const myId = ++instanceId;

  // tear down previous player and timer
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

  // briefly shows a play/pause/mute icon overlay to give visual feedback on interactions
  function showFeedback(type) {
    if (!feedbackInner) return;
    feedbackInner
      .querySelectorAll("[data-feedback-icon]")
      .forEach((el) => el.classList.add("hidden"));
    feedbackInner
      .querySelector(`[data-feedback-icon="${type}"]`)
      ?.classList.remove("hidden");
    // force a reflow to restart the CSS animation
    feedbackInner.classList.remove("hero-feedback-active");
    void feedbackInner.offsetWidth;
    feedbackInner.classList.add("hero-feedback-active");
  }

  whenApiReady(() => {
    // guard against stale callbacks if initializeHeroPlayer was called again before this ran
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
          // delay autoplay slightly so the page has time to settle after render
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

    // fades out the backdrop and fades in the video layer, then plays
    function startVideo() {
      backdrop?.classList.add("opacity-0");
      videoLayer?.classList.remove("opacity-0");
      ytPlayer.playVideo();
    }

    // restores the static backdrop and stops playback when the video ends
    function showBackdrop() {
      backdrop?.classList.remove("opacity-0");
      videoLayer?.classList.add("opacity-0");
      ytPlayer.stopVideo();
    }

    // syncs the mute button aria state and icon visibility to the current isMuted flag
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

    // clicking the video area toggles play/pause and shows the appropriate feedback icon
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
