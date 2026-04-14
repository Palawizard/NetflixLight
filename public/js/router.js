const listeners = new Set();

/**
 * parses the current window hash into a pathname and URLSearchParams
 */
function parseHashLocation(hashValue = window.location.hash) {
  const normalizedHash = hashValue.replace(/^#/, "");
  const rawLocation = normalizedHash || "/";
  const locationWithSlash = rawLocation.startsWith("/")
    ? rawLocation
    : `/${rawLocation}`;
  const [pathname, rawSearch = ""] = locationWithSlash.split("?");

  return {
    pathname: pathname || "/",
    searchParams: new URLSearchParams(rawSearch),
  };
}

/**
 * returns the pathname portion of the current hash location
 */
export function getCurrentPath() {
  return parseHashLocation().pathname;
}

/**
 * returns the search params from the current hash location
 */
export function getCurrentSearchParams() {
  return parseHashLocation().searchParams;
}

/**
 * updates the hash to trigger a route change - re-notifies listeners if the path is unchanged
 */
export function navigate(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const currentHashValue = window.location.hash.replace(/^#/, "") || "/";

  if (currentHashValue === normalizedPath) {
    notifyRouteChange();
    return;
  }

  window.location.hash = normalizedPath;
}

/**
 * registers a listener that fires on every route change - returns an unsubscribe function
 */
export function subscribeRoute(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * initializes the router - sets the hash to / if missing, otherwise fires the first route notification
 */
export function startRouter() {
  if (!window.location.hash) {
    window.location.hash = "/";
    return;
  }

  notifyRouteChange();
}

/**
 * calls all registered route listeners with the current pathname
 */
function notifyRouteChange() {
  const currentLocation = parseHashLocation();
  listeners.forEach((listener) => listener(currentLocation.pathname));
}

window.addEventListener("hashchange", notifyRouteChange);
