const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export function buildTmdbImageUrl(path, size) {
  if (!path) {
    return "";
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function buildTmdbSrcSet(path, sizes) {
  if (!path || !Array.isArray(sizes)) {
    return "";
  }

  return sizes
    .map(({ size, width }) => `${buildTmdbImageUrl(path, size)} ${width}w`)
    .join(", ");
}

export function renderTmdbImage({
  path,
  alt,
  className,
  size,
  srcSetSizes,
  sizes,
  loading = "lazy",
  fetchPriority = "auto",
}) {
  if (!path) {
    return "";
  }

  const srcSet = buildTmdbSrcSet(path, srcSetSizes);

  return `
    <img
      src="${buildTmdbImageUrl(path, size)}"
      ${srcSet ? `srcset="${srcSet}"` : ""}
      ${sizes ? `sizes="${sizes}"` : ""}
      alt="${alt}"
      loading="${loading}"
      decoding="async"
      fetchpriority="${fetchPriority}"
      class="${className}"
    />
  `;
}
