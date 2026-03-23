const listeners = new Set();

export function getCurrentPath() {
  const hashValue = window.location.hash.replace(/^#/, "");

  if (!hashValue) {
    return "/";
  }

  return hashValue.startsWith("/") ? hashValue : `/${hashValue}`;
}

export function navigate(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (getCurrentPath() === normalizedPath) {
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
  const currentPath = getCurrentPath();
  listeners.forEach((listener) => listener(currentPath));
}

window.addEventListener("hashchange", notifyRouteChange);
