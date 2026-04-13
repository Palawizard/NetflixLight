function createWatchlistKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function createWatchProgressKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function buildWatchlistKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createWatchlistKey(item.type, item.tmdbId), true])
  );
}

function sortWatchlistItemsByAddedAt(items) {
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

function buildWatchProgressKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createWatchProgressKey(item.type, item.tmdbId), item])
  );
}

function createViewingHistoryKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function buildViewingHistoryKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createViewingHistoryKey(item.type, item.tmdbId), item])
  );
}

function createUserRatingKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

function buildUserRatingKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createUserRatingKey(item.type, item.tmdbId), item])
  );
}

export {
  buildUserRatingKeyMap,
  buildViewingHistoryKeyMap,
  buildWatchProgressKeyMap,
  buildWatchlistKeyMap,
  createUserRatingKey,
  createViewingHistoryKey,
  createWatchProgressKey,
  createWatchlistKey,
  sortWatchlistItemsByAddedAt,
};
