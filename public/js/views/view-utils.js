function createFavoriteKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function formatLongDate(dateString) {
  if (typeof dateString !== "string" || !dateString.trim()) {
    return "Date inconnue";
  }

  const dateParts = dateString
    .split("-")
    .map((part) => Number.parseInt(part, 10));

  if (
    dateParts.length !== 3 ||
    dateParts.some((part) => !Number.isInteger(part))
  ) {
    return "Date inconnue";
  }

  const [year, month, day] = dateParts;
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPersonalRatingLabel(userRatingsState, historyItem) {
  const isLoading =
    userRatingsState?.status === "idle" ||
    userRatingsState?.status === "loading";

  if (isLoading) {
    return "";
  }

  const ratingKey = createFavoriteKey(historyItem.type, historyItem.tmdbId);
  const ratingItem = userRatingsState?.itemKeys?.[ratingKey];

  if (!Number.isInteger(ratingItem?.rating)) {
    return "";
  }

  return `${ratingItem.rating}/5`;
}

function getSortedWatchlistItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice().sort((leftItem, rightItem) => {
    const leftTime = Date.parse(leftItem.addedAt || "");
    const rightTime = Date.parse(rightItem.addedAt || "");
    const normalizedLeftTime = Number.isNaN(leftTime) ? 0 : leftTime;
    const normalizedRightTime = Number.isNaN(rightTime) ? 0 : rightTime;

    if (normalizedLeftTime !== normalizedRightTime) {
      return normalizedRightTime - normalizedLeftTime;
    }

    return rightItem.tmdbId - leftItem.tmdbId;
  });
}

export {
  createFavoriteKey,
  escapeHtml,
  formatLongDate,
  getPersonalRatingLabel,
  getSortedWatchlistItems,
};
