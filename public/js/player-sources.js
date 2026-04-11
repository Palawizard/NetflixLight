export const SAMPLE_VIDEO_SOURCE = {
  type: "mp4",
  label: "Film test",
  title: "Big Buck Bunny - extrait 30s",
  src: "https://raw.githubusercontent.com/bower-media-samples/big-buck-bunny-1080p-30s/master/video.mp4",
  poster:
    "https://raw.githubusercontent.com/bower-media-samples/big-buck-bunny-1080p-30s/master/poster.jpg",
  attribution:
    "Big Buck Bunny, Blender Foundation, Creative Commons Attribution 3.0.",
};

const YOUTUBE_TRAILER_TYPES = new Set(["Trailer", "Teaser"]);
const YOUTUBE_TRAILER_LANGUAGES = ["fr", "en"];

export function getPlaybackSources(item) {
  const youtubeTrailer = findBestYoutubeTrailer(item?.videos?.results);

  return {
    sample: SAMPLE_VIDEO_SOURCE,
    trailer: youtubeTrailer,
    preferredSource: youtubeTrailer || SAMPLE_VIDEO_SOURCE,
  };
}

function findBestYoutubeTrailer(videos) {
  if (!Array.isArray(videos)) {
    return null;
  }

  const youtubeVideos = videos.filter(
    (video) =>
      video &&
      video.site === "YouTube" &&
      typeof video.key === "string" &&
      video.key.trim() &&
      YOUTUBE_TRAILER_TYPES.has(video.type)
  );

  if (youtubeVideos.length === 0) {
    return null;
  }

  const bestVideo =
    youtubeVideos.find((video) => video.official && video.iso_639_1 === "fr") ||
    youtubeVideos.find((video) => video.iso_639_1 === "fr") ||
    youtubeVideos.find((video) => video.official && video.type === "Trailer") ||
    youtubeVideos.find((video) => video.type === "Trailer") ||
    youtubeVideos.find((video) =>
      YOUTUBE_TRAILER_LANGUAGES.includes(video.iso_639_1)
    ) ||
    youtubeVideos[0];

  return {
    type: "youtube",
    label:
      bestVideo.type === "Teaser" ? "Teaser YouTube" : "Bande-annonce YouTube",
    title: bestVideo.name || "Bande-annonce",
    key: bestVideo.key.trim(),
    url: `https://www.youtube.com/watch?v=${bestVideo.key.trim()}`,
  };
}
