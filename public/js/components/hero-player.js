/* global YT */

import {
  YOUTUBE_PRIVACY_HOST,
  gateVideo,
  hasVideoConsent,
  onVideoConsent,
} from "./video-consent.js";
import { whenApiReady } from "./youtube-player.js";

const HERO_AUTOPLAY_DELAY_MS = 2_000;
// shorter delay when the viewer explicitly asked for the trailer
const HERO_REQUESTED_DELAY_MS = 300;

let instanceId = 0;
let currentHeroPlayer = null;
let heroDelayTimerId = null;
let heroConsentCleanup = null;
// trailer whose consent panel the viewer opened - survives re-renders of the home page
let requestedTrailerKey = null;

/**
 * initializes the hero trailer player for the [data-hero] section inside rootElement
 * tears down any previous player and waits for the YouTube API before mounting
 * the trailer only autoplays when YouTube is already allowed - otherwise the backdrop stays and a
 * "Bande-annonce" button opens the consent placeholder
 */
export function initializeHeroPlayer(rootElement) {
  // invalidate any in-flight API callback from a previous call
  const myId = ++instanceId;

  // tear down previous player, timer and consent listeners
  if (heroDelayTimerId !== null) {
    clearTimeout(heroDelayTimerId);
    heroDelayTimerId = null;
  }

  if (heroConsentCleanup) {
    heroConsentCleanup();
    heroConsentCleanup = null;
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

  const iframeTarget = section.querySelector("[data-hero-player-iframe]");

  if (!iframeTarget) return;

  if (requestedTrailerKey !== videoKey) {
    requestedTrailerKey = null;
  }

  if (hasVideoConsent()) {
    mountHeroPlayer(section, iframeTarget, videoKey, myId, {
      autoplayDelay: requestedTrailerKey
        ? HERO_REQUESTED_DELAY_MS
        : HERO_AUTOPLAY_DELAY_MS,
    });
    return;
  }

  setupHeroConsent(section, iframeTarget, videoKey, myId);
}

/**
 * shows the trailer button and waits for consent - either from the shared banner/settings
 * or from the placeholder the button opens - before mounting the player
 */
function setupHeroConsent(section, iframeTarget, videoKey, myId) {
  const trailerButton = section.querySelector("[data-hero-trailer-button]");
  const consentSlot = section.querySelector("[data-hero-consent-slot]");
  let cancelGate = null;
  let started = false;

  // mounts the player once - consent can arrive from several listeners at the same time
  function start() {
    if (started || instanceId !== myId) return;
    started = true;
    cleanup();

    if (trailerButton) trailerButton.hidden = true;
    if (consentSlot) consentSlot.hidden = true;

    mountHeroPlayer(section, iframeTarget, videoKey, myId, {
      autoplayDelay: requestedTrailerKey
        ? HERO_REQUESTED_DELAY_MS
        : HERO_AUTOPLAY_DELAY_MS,
    });
  }

  // opens the consent placeholder under the hero actions
  function openPanel() {
    if (!consentSlot || cancelGate) return;
    requestedTrailerKey = videoKey;
    consentSlot.hidden = false;
    trailerButton?.setAttribute("aria-expanded", "true");
    cancelGate = gateVideo(consentSlot, start);
  }

  // closes the placeholder without loading anything
  function closePanel() {
    requestedTrailerKey = null;
    cancelGate?.();
    cancelGate = null;

    if (consentSlot) consentSlot.hidden = true;
    trailerButton?.setAttribute("aria-expanded", "false");
  }

  function handleTrailerClick() {
    if (cancelGate) {
      closePanel();
    } else {
      openPanel();
    }
  }

  const unsubscribe = onVideoConsent(start);

  function cleanup() {
    unsubscribe();
    cancelGate?.();
    cancelGate = null;
    trailerButton?.removeEventListener("click", handleTrailerClick);
  }

  heroConsentCleanup = cleanup;

  if (trailerButton) {
    trailerButton.hidden = false;
    trailerButton.setAttribute("aria-expanded", "false");
    trailerButton.addEventListener("click", handleTrailerClick);
  }

  // re-open the panel after a re-render if the viewer had asked for the trailer
  if (requestedTrailerKey === videoKey) {
    openPanel();
  }
}

/**
 * loads the YouTube API (privacy-enhanced host) and mounts the muted background trailer
 */
function mountHeroPlayer(section, iframeTarget, videoKey, myId, options) {
  const backdrop = section.querySelector("[data-hero-backdrop]");
  const videoLayer = section.querySelector("[data-hero-video-layer]");
  const muteBtn = section.querySelector("[data-hero-mute]");
  const clickArea = section.querySelector("[data-hero-click-area]");
  const feedbackInner = section.querySelector("[data-hero-feedback-inner]");

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
      host: YOUTUBE_PRIVACY_HOST,
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

          if (muteBtn) {
            muteBtn.hidden = false;
          }

          // delay autoplay slightly so the page has time to settle after render
          heroDelayTimerId = window.setTimeout(() => {
            heroDelayTimerId = null;
            startVideo();
          }, options.autoplayDelay);
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
