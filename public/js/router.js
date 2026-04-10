const listeners = new Set();

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

export function getCurrentPath() {
  return parseHashLocation().pathname;
}

export function getCurrentSearchParams() {
  return parseHashLocation().searchParams;
}

export function navigate(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const currentHashValue = window.location.hash.replace(/^#/, "") || "/";

  if (currentHashValue === normalizedPath) {
    notifyRouteChange();
    return;
  }

  window.location.hash = normalizedPath;
}

export function subscribeRoute(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function startRouter() {
  if (!window.location.hash) {
    window.location.hash = "/";
    return;
  }

  notifyRouteChange();
}

function notifyRouteChange() {
  const currentLocation = parseHashLocation();
  listeners.forEach((listener) => listener(currentLocation.pathname));
}

window.addEventListener("hashchange", notifyRouteChange);
