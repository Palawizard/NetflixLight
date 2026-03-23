export const appState = {
  session: {
    status: "idle",
    user: null,
  },
  ui: {
    flash: null,
  },
};

const listeners = new Set();

export function subscribeState(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function updateState(mutator) {
  mutator(appState);
  listeners.forEach((listener) => listener(appState));
}

export function setFlashMessage(message) {
  updateState((state) => {
    state.ui.flash = message;
  });
}

export function clearFlashMessage() {
  updateState((state) => {
    state.ui.flash = null;
  });
}
