/**
 * returns a "type:tmdbId" lookup key for a watchlist item
 */
function createWatchlistKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

/**
 * returns a "type:tmdbId" lookup key for a watch progress item
 */
function createWatchProgressKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

/**
 * builds a { "type:tmdbId": true } map for fast watchlist membership checks
 */
function buildWatchlistKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createWatchlistKey(item.type, item.tmdbId), true])
  );
}

/**
 * sorts watchlist items newest-first by addedAt, breaking ties by tmdbId descending
 */
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

/**
 * builds a { "type:tmdbId": item } map for fast watch progress lookups
 */
function buildWatchProgressKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createWatchProgressKey(item.type, item.tmdbId), item])
  );
}

/**
 * returns a "type:tmdbId" lookup key for a viewing history item
 */
function createViewingHistoryKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

/**
 * builds a { "type:tmdbId": item } map for fast viewing history lookups
 */
function buildViewingHistoryKeyMap(items) {
  return Object.fromEntries(
    items.map((item) => [createViewingHistoryKey(item.type, item.tmdbId), item])
  );
}

/**
 * returns a "type:tmdbId" lookup key for a user rating
 */
function createUserRatingKey(type, tmdbId) {
  return `${type}:${tmdbId}`;
}

/**
 * builds a { "type:tmdbId": item } map for fast user rating lookups
 */
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
