const CONTROLS_IDLE_DELAY_MS = 3000;

export function initializePlayers(container) {
  const playerElements = container.querySelectorAll("[data-player]");

  playerElements.forEach((playerElement) => {
    if (playerElement.dataset.playerReady === "true") {
      return;
    }

    const video = playerElement.querySelector("[data-player-video]");
    const playButton = playerElement.querySelector("[data-player-play]");
    const muteButton = playerElement.querySelector("[data-player-mute]");
    const volumeInput = playerElement.querySelector("[data-player-volume]");
    const seekInput = playerElement.querySelector("[data-player-seek]");
    const timeLabel = playerElement.querySelector("[data-player-time]");
    const fullscreenButton = playerElement.querySelector(
      "[data-player-fullscreen]"
    );
    const controls = playerElement.querySelector("[data-player-controls]");

    if (
      !video ||
      !playButton ||
      !muteButton ||
      !volumeInput ||
      !seekInput ||
      !timeLabel ||
      !fullscreenButton ||
      !controls
    ) {
      return;
    }

    playerElement.dataset.playerReady = "true";
    video.volume = Number.parseFloat(volumeInput.value || "0.8");
    let controlsIdleTimeoutId = null;

    const setControlsVisible = (isVisible) => {
      playerElement.dataset.controlsHidden = isVisible ? "false" : "true";
      controls.classList.toggle("opacity-0", !isVisible);
      controls.classList.toggle("pointer-events-none", !isVisible);
    };

    const clearControlsIdleTimeout = () => {
      if (controlsIdleTimeoutId !== null) {
        window.clearTimeout(controlsIdleTimeoutId);
        controlsIdleTimeoutId = null;
      }
    };

    const scheduleControlsAutoHide = () => {
      clearControlsIdleTimeout();

      if (video.paused || controls.contains(document.activeElement)) {
        setControlsVisible(true);
        return;
      }

      controlsIdleTimeoutId = window.setTimeout(() => {
        if (!video.paused && !controls.contains(document.activeElement)) {
          setControlsVisible(false);
        }
      }, CONTROLS_IDLE_DELAY_MS);
    };

    const revealControls = () => {
      setControlsVisible(true);
      scheduleControlsAutoHide();
    };

    const syncControls = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const currentTime = Number.isFinite(video.currentTime)
        ? video.currentTime
        : 0;

      playButton.textContent = video.paused ? "Lecture" : "Pause";
      playButton.setAttribute("aria-pressed", video.paused ? "false" : "true");
      playButton.setAttribute(
        "aria-label",
        video.paused ? "Lancer la lecture" : "Mettre en pause"
      );
      muteButton.textContent =
        video.muted || video.volume === 0 ? "Muet" : "Son";
      muteButton.setAttribute(
        "aria-pressed",
        video.muted || video.volume === 0 ? "true" : "false"
      );
      muteButton.setAttribute(
        "aria-label",
        video.muted || video.volume === 0 ? "Réactiver le son" : "Couper le son"
      );
      volumeInput.value = video.muted ? "0" : String(video.volume);
      volumeInput.setAttribute(
        "aria-valuetext",
        `${Math.round(Number.parseFloat(volumeInput.value) * 100)}%`
      );
      seekInput.max = String(Math.max(duration, 0));
      seekInput.value = String(Math.min(currentTime, duration || currentTime));
      seekInput.setAttribute(
        "aria-valuetext",
        `${formatVideoTime(currentTime)} sur ${formatVideoTime(duration)}`
      );
      timeLabel.textContent = `${formatVideoTime(currentTime)} / ${formatVideoTime(duration)}`;
    };

    const togglePlayback = () => {
      if (video.paused) {
        void video.play();
        return;
      }

      video.pause();
    };

    const toggleFullscreen = () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }

      void playerElement.requestFullscreen();
    };

    const seekBy = (seconds) => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const nextTime = Math.min(
        Math.max(video.currentTime + seconds, 0),
        duration || video.currentTime + seconds
      );

      video.currentTime = nextTime;
      syncControls();
    };

    playButton.addEventListener("click", togglePlayback);

    muteButton.addEventListener("click", () => {
      video.muted = !video.muted;
      syncControls();
    });

    volumeInput.addEventListener("input", () => {
      const nextVolume = Number.parseFloat(volumeInput.value);

      video.volume = Number.isFinite(nextVolume)
        ? Math.min(Math.max(nextVolume, 0), 1)
        : video.volume;
      video.muted = video.volume === 0;
      syncControls();
    });

    seekInput.addEventListener("input", () => {
      const nextTime = Number.parseFloat(seekInput.value);

      if (Number.isFinite(nextTime)) {
        video.currentTime = nextTime;
      }
    });

    fullscreenButton.addEventListener("click", () => {
      toggleFullscreen();
    });

    video.addEventListener("loadedmetadata", syncControls);
    video.addEventListener("timeupdate", syncControls);
    video.addEventListener("play", () => {
      syncControls();
      scheduleControlsAutoHide();
    });
    video.addEventListener("pause", () => {
      syncControls();
      setControlsVisible(true);
      clearControlsIdleTimeout();
    });
    video.addEventListener("volumechange", syncControls);
    playerElement.addEventListener("pointermove", revealControls);
    playerElement.addEventListener("click", revealControls);
    playerElement.addEventListener("keydown", (event) => {
      revealControls();

      if (event.target.matches("input")) {
        return;
      }

      switch (event.key) {
        case " ":
        case "k":
        case "K":
          event.preventDefault();
          togglePlayback();
          break;
        case "ArrowLeft":
          event.preventDefault();
          seekBy(-5);
          break;
        case "ArrowRight":
          event.preventDefault();
          seekBy(5);
          break;
        case "m":
        case "M":
          event.preventDefault();
          video.muted = !video.muted;
          syncControls();
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;
        default:
      }
    });
    playerElement.addEventListener("focusin", () => {
      setControlsVisible(true);
      clearControlsIdleTimeout();
    });
    playerElement.addEventListener("focusout", scheduleControlsAutoHide);
    document.addEventListener("fullscreenchange", () => {
      fullscreenButton.textContent = document.fullscreenElement
        ? "Quitter plein écran"
        : "Plein écran";
      fullscreenButton.setAttribute(
        "aria-label",
        document.fullscreenElement
          ? "Quitter le plein écran"
          : "Passer en plein écran"
      );
    });

    setControlsVisible(true);
    syncControls();
  });
}

function formatVideoTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0:00";
  }

  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
