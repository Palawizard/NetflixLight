/* global YT */

let ytApiReady = false;
let ytApiLoading = false;
const ytReadyQueue = [];
let currentPlayer = null;
let inactivityTimerId = null;

const INACTIVITY_TIMEOUT_MS = 5_000;

// called by the YouTube iframe API script once it finishes loading
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  ytApiLoading = false;
  ytReadyQueue.splice(0).forEach((cb) => cb());
};

/**
 * injects the YouTube iframe API script into the page - no-ops if already loading or loaded
 */
function loadYoutubeApi() {
  if (ytApiReady || ytApiLoading) {
    return;
  }

  ytApiLoading = true;

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

/**
 * runs a callback once the YouTube iframe API is ready - queues it and loads the API if not yet available
 */
export function whenApiReady(callback) {
  if (ytApiReady) {
    callback();
    return;
  }

  ytReadyQueue.push(callback);
  loadYoutubeApi();
}

/**
 * mounts a YouTube player for the [data-youtube-player] element inside rootElement
 * destroys any currently active player before creating a new one
 */
function initializeYoutubePlayer(rootElement) {
  const container = rootElement.querySelector("[data-youtube-player]");

  if (!container) {
    destroyCurrentPlayer();
    return;
  }

  const videoKey = container.getAttribute("data-youtube-player");

  // skip re-initialization if the same video is already playing
  if (currentPlayer && currentPlayer.videoKey === videoKey) {
    return;
  }

  destroyCurrentPlayer();
  whenApiReady(() => mountPlayer(container, videoKey));
}

/**
 * destroys the currently active YouTube player and clears the inactivity timer
 */
function destroyCurrentPlayer() {
  clearInactivityTimer();

  if (!currentPlayer) {
    return;
  }

  try {
    currentPlayer.stopUpdater();
    currentPlayer.stopFullscreen?.();
    currentPlayer.ytPlayer.destroy();
  } catch {
    // player may already be gone if innerHTML was replaced
  }

  currentPlayer = null;
}

/**
 * creates and wires up a full YouTube player inside a container element
 */
function mountPlayer(container, videoKey) {
  const iframeTarget = container.querySelector("[data-youtube-player-iframe]");

  if (!iframeTarget) {
    return;
  }

  const spinner = container.querySelector("[data-player-spinner]");
  const controls = container.querySelector("[data-player-controls]");
  const playPauseBtn = controls?.querySelector("[data-player-play-pause]");
  const progressBar = controls?.querySelector("[data-player-progress]");
  const progressFill = controls?.querySelector("[data-player-progress-fill]");
  const timeDisplay = controls?.querySelector("[data-player-time]");
  const muteBtn = controls?.querySelector("[data-player-mute]");
  const volumeSlider = controls?.querySelector("[data-player-volume]");
  const fullscreenBtn = controls?.querySelector("[data-player-fullscreen]");

  let progressIntervalId = null;
  let lastVolumeBeforeMute = 100;

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
    },
    events: {
      onReady() {
        spinner?.remove();

        if (controls) {
          controls.hidden = false;
        }

        if (volumeSlider) {
          const initialVolume = ytPlayer.getVolume();
          volumeSlider.value = String(initialVolume);

          if (initialVolume > 0) {
            lastVolumeBeforeMute = initialVolume;
          }
        }

        setMuteIcons(ytPlayer.isMuted() || ytPlayer.getVolume() === 0);

        resetInactivity();
        bindControls();
      },
      onStateChange(event) {
        updatePlayPauseIcon(event.data);

        if (event.data === YT.PlayerState.PLAYING) {
          startProgressUpdater();
          resetInactivity();
        } else {
          stopProgressUpdater();

          if (event.data === YT.PlayerState.PAUSED) {
            clearInactivityTimer();
            showControls();
          }
        }
      },
    },
  });

  // starts polling the player position every 500ms to update the progress bar
  function startProgressUpdater() {
    stopProgressUpdater();
    progressIntervalId = setInterval(refreshProgress, 500);
  }

  // clears the progress polling interval
  function stopProgressUpdater() {
    if (progressIntervalId !== null) {
      clearInterval(progressIntervalId);
      progressIntervalId = null;
    }
  }

  // fetches current playback position and delegates to the UI updater
  function refreshProgress() {
    const duration = ytPlayer.getDuration?.() ?? 0;
    const current = ytPlayer.getCurrentTime?.() ?? 0;
    applyProgressUI(current, duration);
  }

  // updates the progress fill width, time display, and aria attributes
  function applyProgressUI(current, duration) {
    if (duration > 0 && progressFill) {
      progressFill.style.width = `${((current / duration) * 100).toFixed(2)}%`;
    }

    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }

    if (progressBar) {
      const pct = duration > 0 ? Math.round((current / duration) * 100) : 0;
      progressBar.setAttribute("aria-valuenow", String(pct));
      progressBar.setAttribute(
        "aria-valuetext",
        `${formatTime(current)} sur ${formatTime(duration)}`
      );
    }
  }

  // syncs the play/pause button icon and aria state to the current player state
  function updatePlayPauseIcon(playerState) {
    if (!playPauseBtn) {
      return;
    }

    const isPlaying = playerState === YT.PlayerState.PLAYING;

    playPauseBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    playPauseBtn.setAttribute(
      "aria-label",
      isPlaying ? "Mettre en pause" : "Lire"
    );
    playPauseBtn
      .querySelector("[data-icon-play]")
      ?.classList.toggle("hidden", isPlaying);
    playPauseBtn
      .querySelector("[data-icon-pause]")
      ?.classList.toggle("hidden", !isPlaying);
  }

  // makes the controls bar visible
  function showControls() {
    controls?.classList.remove("opacity-0", "pointer-events-none");
  }

  // hides the controls bar
  function hideControls() {
    controls?.classList.add("opacity-0", "pointer-events-none");
  }

  // shows controls and restarts the inactivity hide timer
  function resetInactivity() {
    clearInactivityTimer();
    showControls();
    inactivityTimerId = window.setTimeout(hideControls, INACTIVITY_TIMEOUT_MS);
  }

  // syncs the mute button icon and aria state
  function setMuteIcons(isMuted) {
    muteBtn?.setAttribute("aria-pressed", isMuted ? "true" : "false");
    muteBtn?.setAttribute(
      "aria-label",
      isMuted ? "Rétablir le son" : "Couper le son"
    );
    muteBtn
      ?.querySelector("[data-icon-unmuted]")
      ?.classList.toggle("hidden", isMuted);
    muteBtn
      ?.querySelector("[data-icon-muted]")
      ?.classList.toggle("hidden", !isMuted);
  }

  // attaches all event listeners for playback, progress, mute, volume, and fullscreen controls
  function bindControls() {
    playPauseBtn?.addEventListener("click", () => {
      if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
      resetInactivity();
    });

    progressBar?.addEventListener("click", (event) => {
      const rect = progressBar.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );
      const duration = ytPlayer.getDuration?.() ?? 0;

      if (duration > 0) {
        const newTime = ratio * duration;
        ytPlayer.seekTo(newTime, true);
        // update immediately - seekTo is async, getCurrentTime() would still
        // return the old position for several frames
        applyProgressUI(newTime, duration);
      }

      resetInactivity();
    });

    progressBar?.addEventListener("keydown", (event) => {
      const duration = ytPlayer.getDuration?.() ?? 0;

      if (!duration) {
        return;
      }

      const step = duration * 0.05;

      if (event.key === "ArrowRight") {
        const newTime = Math.min(duration, ytPlayer.getCurrentTime() + step);
        ytPlayer.seekTo(newTime, true);
        applyProgressUI(newTime, duration);
        resetInactivity();
        event.preventDefault();
      }

      if (event.key === "ArrowLeft") {
        const newTime = Math.max(0, ytPlayer.getCurrentTime() - step);
        ytPlayer.seekTo(newTime, true);
        applyProgressUI(newTime, duration);
        resetInactivity();
        event.preventDefault();
      }
    });

    muteBtn?.addEventListener("click", () => {
      const shouldMute = !ytPlayer.isMuted() && ytPlayer.getVolume() > 0;

      if (shouldMute) {
        const currentVolume = ytPlayer.getVolume();

        if (currentVolume > 0) {
          lastVolumeBeforeMute = currentVolume;
        }

        ytPlayer.setVolume(0);
        ytPlayer.mute();

        if (volumeSlider) {
          volumeSlider.value = "0";
        }

        setMuteIcons(true);
      } else {
        const restoredVolume =
          lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 100;

        ytPlayer.unMute();
        ytPlayer.setVolume(restoredVolume);

        if (volumeSlider) {
          volumeSlider.value = String(restoredVolume);
        }

        setMuteIcons(false);
      }

      resetInactivity();
    });

    volumeSlider?.addEventListener("input", () => {
      const vol = Number(volumeSlider.value);

      ytPlayer.setVolume(vol);

      if (vol > 0) {
        lastVolumeBeforeMute = vol;
      }

      if (vol === 0) {
        ytPlayer.mute();
        setMuteIcons(true);
      } else {
        ytPlayer.unMute();
        setMuteIcons(false);
      }

      resetInactivity();
    });

    container.addEventListener("mousemove", resetInactivity);
    container.addEventListener("touchstart", resetInactivity, {
      passive: true,
    });

    fullscreenBtn?.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        container.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      resetInactivity();
    });

    document.addEventListener("fullscreenchange", handleFullscreenChange);
  }

  // syncs the fullscreen button icon and aria state on fullscreen change events
  function handleFullscreenChange() {
    const isFullscreen = Boolean(document.fullscreenElement);
    fullscreenBtn?.setAttribute(
      "aria-pressed",
      isFullscreen ? "true" : "false"
    );
    fullscreenBtn?.setAttribute(
      "aria-label",
      isFullscreen ? "Quitter le plein écran" : "Plein écran"
    );
    fullscreenBtn
      ?.querySelector("[data-icon-fullscreen]")
      ?.classList.toggle("hidden", isFullscreen);
    fullscreenBtn
      ?.querySelector("[data-icon-exit-fullscreen]")
      ?.classList.toggle("hidden", !isFullscreen);
  }

  // removes the fullscreen change listener - called when the player is destroyed
  function stopFullscreen() {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }

  currentPlayer = {
    videoKey,
    ytPlayer,
    stopUpdater: stopProgressUpdater,
    stopFullscreen,
  };
}

/**
 * clears the global inactivity hide timer if one is pending
 */
function clearInactivityTimer() {
  if (inactivityTimerId !== null) {
    clearTimeout(inactivityTimerId);
    inactivityTimerId = null;
  }
}

/**
 * formats a total seconds value as M:SS
 */
function formatTime(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export { initializeYoutubePlayer };
