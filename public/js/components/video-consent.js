import { translateText } from "../i18n.js";

// consent purpose and provider declared to the shared palawi.fr consent manager (/consent/palawi-consent.js)
const VIDEO_PURPOSE = "video";
const VIDEO_PROVIDER = "YouTube";

// privacy-enhanced YouTube host: no tracking cookies until the viewer plays the video
export const YOUTUBE_PRIVACY_HOST = "https://www.youtube-nocookie.com";

/**
 * returns the shared consent API, or null when the script is missing (local dev, blocked or failed load)
 */
function getConsentApi() {
  const api = window.PalawiConsent;

  return api && typeof api.gate === "function" ? api : null;
}

/**
 * returns the current UI language from <html lang> - kept in sync by translateApp
 */
function getLanguage() {
  return document.documentElement.lang === "en" ? "en" : "fr";
}

/**
 * true when YouTube embeds are allowed right now (saved choice or "load this time")
 */
export function hasVideoConsent() {
  return getConsentApi()?.get(VIDEO_PURPOSE) === true;
}

/**
 * calls callback once YouTube embeds become allowed - returns an unsubscribe function
 * without the consent manager nothing is ever allowed implicitly, so this is a no-op
 */
export function onVideoConsent(callback) {
  const api = getConsentApi();

  if (!api) {
    return () => {};
  }

  return api.onChange((choices) => {
    if (choices?.[VIDEO_PURPOSE] === true) {
      callback();
    }
  });
}

/**
 * runs load() right away when YouTube is allowed, otherwise shows a consent placeholder inside slot
 * and runs load() once the viewer allows it - returns a cancel function that removes the placeholder
 */
export function gateVideo(slot, load) {
  if (!slot) {
    return () => {};
  }

  const api = getConsentApi();

  if (api) {
    return api.gate(slot, VIDEO_PURPOSE, load, { provider: VIDEO_PROVIDER });
  }

  return renderFallbackGate(slot, load);
}

/**
 * placeholder used when the consent manager is unavailable - YouTube only loads on an explicit click
 */
function renderFallbackGate(slot, load) {
  const language = getLanguage();
  const placeholder = document.createElement("div");
  placeholder.className = "trailer-consent-fallback";

  const message = document.createElement("p");
  message.textContent = translateText(
    "La bande-annonce est hébergée sur YouTube, qui peut déposer des cookies.",
    language
  );

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = translateText("Charger la bande-annonce", language);
  button.addEventListener("click", () => {
    placeholder.remove();
    load();
  });

  placeholder.append(message, button);
  slot.appendChild(placeholder);

  return () => placeholder.remove();
}
