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

    if (
      !video ||
      !playButton ||
      !muteButton ||
      !volumeInput ||
      !seekInput ||
      !timeLabel ||
      !fullscreenButton
    ) {
      return;
    }

    playerElement.dataset.playerReady = "true";
    video.volume = Number.parseFloat(volumeInput.value || "0.8");

    const syncControls = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const currentTime = Number.isFinite(video.currentTime)
        ? video.currentTime
        : 0;

      playButton.textContent = video.paused ? "Lecture" : "Pause";
      muteButton.textContent =
        video.muted || video.volume === 0 ? "Muet" : "Son";
      volumeInput.value = video.muted ? "0" : String(video.volume);
      seekInput.max = String(Math.max(duration, 0));
      seekInput.value = String(Math.min(currentTime, duration || currentTime));
      timeLabel.textContent = `${formatVideoTime(currentTime)} / ${formatVideoTime(duration)}`;
    };

    playButton.addEventListener("click", () => {
      if (video.paused) {
        void video.play();
        return;
      }

      video.pause();
    });

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
      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }

      void playerElement.requestFullscreen();
    });

    video.addEventListener("loadedmetadata", syncControls);
    video.addEventListener("timeupdate", syncControls);
    video.addEventListener("play", syncControls);
    video.addEventListener("pause", syncControls);
    video.addEventListener("volumechange", syncControls);
    document.addEventListener("fullscreenchange", () => {
      fullscreenButton.textContent = document.fullscreenElement
        ? "Quitter plein ecran"
        : "Plein ecran";
    });

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
