const protectedPaths = new Set(["/favoris", "/profil"]);

const guestOnlyPaths = new Set(["/login", "/register"]);

const SEARCH_DEBOUNCE_MS = 350;

const DEFAULT_PROFILE_COLOR = "#fb7185";

const PROFILE_COLOR_PRESETS = [
  "#fb7185",
  "#f43f5e",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#38bdf8",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f8fafc",
];

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const GENRE_CATALOG_BATCH_SIZE = 4;

const SUPPORTED_LANGUAGES = new Set(["fr", "en"]);

const HOME_SECTION_CONFIG = {
  trending: {
    endpoint: "/api/tmdb/trending?media_type=all&time_window=week",
  },
  moviesPopular: {
    endpoint: "/api/tmdb/movies/popular",
    mediaType: "movie",
  },
  tvPopular: {
    endpoint: "/api/tmdb/tv/popular",
    mediaType: "tv",
  },
  topRated: {
    endpoint: "/api/tmdb/movies/top-rated",
    mediaType: "movie",
  },
};

const GENRE_SECTION_CONFIG = {
  action: {
    genreId: 28,
    mediaType: "movie",
  },
  adventure: {
    genreId: 12,
    mediaType: "movie",
  },
  animation: {
    genreId: 16,
    mediaType: "movie",
  },
  comedy: {
    genreId: 35,
    mediaType: "movie",
  },
  crime: {
    genreId: 80,
    mediaType: "movie",
  },
  drama: {
    genreId: 18,
    mediaType: "movie",
  },
  family: {
    genreId: 10751,
    mediaType: "movie",
  },
  fantasy: {
    genreId: 14,
    mediaType: "movie",
  },
  horror: {
    genreId: 27,
    mediaType: "movie",
  },
  romance: {
    genreId: 10749,
    mediaType: "movie",
  },
  scienceFiction: {
    genreId: 878,
    mediaType: "movie",
  },
  thriller: {
    genreId: 53,
    mediaType: "movie",
  },
};

const GENRE_SECTION_KEYS = Object.keys(GENRE_SECTION_CONFIG);

const SERIES_GENRE_SECTION_CONFIG = {
  actionAdventure: {
    genreId: 10759,
    mediaType: "tv",
  },
  animation: {
    genreId: 16,
    mediaType: "tv",
  },
  comedy: {
    genreId: 35,
    mediaType: "tv",
  },
  crime: {
    genreId: 80,
    mediaType: "tv",
  },
  documentary: {
    genreId: 99,
    mediaType: "tv",
  },
  drama: {
    genreId: 18,
    mediaType: "tv",
  },
  family: {
    genreId: 10751,
    mediaType: "tv",
  },
  kids: {
    genreId: 10762,
    mediaType: "tv",
  },
  mystery: {
    genreId: 9648,
    mediaType: "tv",
  },
  reality: {
    genreId: 10764,
    mediaType: "tv",
  },
  scifiFantasy: {
    genreId: 10765,
    mediaType: "tv",
  },
  talk: {
    genreId: 10767,
    mediaType: "tv",
  },
  warPolitics: {
    genreId: 10768,
    mediaType: "tv",
  },
};

const SERIES_GENRE_SECTION_KEYS = Object.keys(SERIES_GENRE_SECTION_CONFIG);

const EMPTY_GENRE_RECOMMENDATION = {
  status: "empty",
  genre: null,
  items: [],
  error: null,
};

const navItems = [
  { path: "/", label: "Accueil" },
  { path: "/films", label: "Films" },
  { path: "/series", label: "Séries" },
  { path: "/favoris", label: "Favoris" },
  { path: "/profil", label: "Profil" },
  { path: "/login", label: "Connexion" },
  { path: "/register", label: "Inscription" },
];

export {
  DEFAULT_PROFILE_COLOR,
  EMPTY_GENRE_RECOMMENDATION,
  GENRE_CATALOG_BATCH_SIZE,
  GENRE_SECTION_CONFIG,
  GENRE_SECTION_KEYS,
  HEX_COLOR_PATTERN,
  HOME_SECTION_CONFIG,
  PROFILE_COLOR_PRESETS,
  SEARCH_DEBOUNCE_MS,
  SERIES_GENRE_SECTION_CONFIG,
  SERIES_GENRE_SECTION_KEYS,
  SUPPORTED_LANGUAGES,
  guestOnlyPaths,
  navItems,
  protectedPaths,
};
