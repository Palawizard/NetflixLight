/* global YT */

let ytApiReady = false;
let ytApiLoading = false;
const ytReadyQueue = [];
let currentPlayer = null;
let inactivityTimerId = null;

const INACTIVITY_TIMEOUT_MS = 300_000;

window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  ytApiLoading = false;
  ytReadyQueue.splice(0).forEach((cb) => cb());
};

function loadYoutubeApi() {
  if (ytApiReady || ytApiLoading) {
    return;
  }

  ytApiLoading = true;

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

function whenApiReady(callback) {
  if (ytApiReady) {
    callback();
    return;
  }

  ytReadyQueue.push(callback);
  loadYoutubeApi();
}

function initializeYoutubePlayer(rootElement) {
  const container = rootElement.querySelector("[data-youtube-player]");

  if (!container) {
    destroyCurrentPlayer();
    return;
  }

  const videoKey = container.getAttribute("data-youtube-player");

  if (currentPlayer && currentPlayer.videoKey === videoKey) {
    return;
  }

  destroyCurrentPlayer();
  whenApiReady(() => mountPlayer(container, videoKey));
}

function destroyCurrentPlayer() {
  clearInactivityTimer();

  if (!currentPlayer) {
    return;
  }

  try {
    currentPlayer.stopUpdater();
    currentPlayer.ytPlayer.destroy();
  } catch {
    // player may already be gone if innerHTML was replaced
  }

  currentPlayer = null;
}

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

  let progressIntervalId = null;

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
          volumeSlider.value = String(ytPlayer.getVolume());
        }

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
          }
        }
      },
    },
  });

  function startProgressUpdater() {
    stopProgressUpdater();
    progressIntervalId = setInterval(refreshProgress, 500);
  }

  function stopProgressUpdater() {
    if (progressIntervalId !== null) {
      clearInterval(progressIntervalId);
      progressIntervalId = null;
    }
  }

  function refreshProgress() {
    const duration = ytPlayer.getDuration?.() ?? 0;
    const current = ytPlayer.getCurrentTime?.() ?? 0;

    if (duration > 0 && progressFill) {
      progressFill.style.width = `${((current / duration) * 100).toFixed(2)}%`;
    }

    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }

    if (progressBar) {
      const pct = duration > 0 ? Math.round((current / duration) * 100) : 0;
      progressBar.setAttribute("aria-valuenow", String(pct));
    }
  }

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

  function resetInactivity() {
    clearInactivityTimer();
    inactivityTimerId = window.setTimeout(() => {
      try {
        if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
          ytPlayer.pauseVideo();
        }
      } catch {
        // ignore if player is gone
      }
    }, INACTIVITY_TIMEOUT_MS);
  }

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
        ytPlayer.seekTo(ratio * duration, true);
        refreshProgress();
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
        ytPlayer.seekTo(
          Math.min(duration, ytPlayer.getCurrentTime() + step),
          true
        );
        refreshProgress();
        resetInactivity();
        event.preventDefault();
      }

      if (event.key === "ArrowLeft") {
        ytPlayer.seekTo(Math.max(0, ytPlayer.getCurrentTime() - step), true);
        refreshProgress();
        resetInactivity();
        event.preventDefault();
      }
    });

    muteBtn?.addEventListener("click", () => {
      const nowMuted = !ytPlayer.isMuted();

      if (nowMuted) {
        ytPlayer.mute();
      } else {
        ytPlayer.unMute();
      }

      setMuteIcons(nowMuted);
      resetInactivity();
    });

    volumeSlider?.addEventListener("input", () => {
      const vol = Number(volumeSlider.value);

      ytPlayer.setVolume(vol);

      if (vol > 0 && ytPlayer.isMuted()) {
        ytPlayer.unMute();
        setMuteIcons(false);
      }

      if (vol === 0) {
        setMuteIcons(true);
      }

      resetInactivity();
    });

    container.addEventListener("mousemove", resetInactivity);
    container.addEventListener("touchstart", resetInactivity, {
      passive: true,
    });
  }

  currentPlayer = { videoKey, ytPlayer, stopUpdater: stopProgressUpdater };
}

function clearInactivityTimer() {
  if (inactivityTimerId !== null) {
    clearTimeout(inactivityTimerId);
    inactivityTimerId = null;
  }
}

function formatTime(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export { initializeYoutubePlayer };
