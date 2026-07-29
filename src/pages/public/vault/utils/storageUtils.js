/**
 * Local Storage & Cache Utilities.
 * Manages in-memory URL caching, local state persistence (favorites/pins), and offline network monitoring.
 */

const URL_CACHE = new Map();
const STARRED_KEY = 'meg_vault_starred_files';
const PINNED_KEY = 'meg_vault_pinned_files';

/**
 * Retrieves cached URL if valid, or null.
 * @param {string} key
 * @returns {string|null}
 */
export function getCachedUrl(key) {
  const cached = URL_CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  return null;
}

/**
 * Stores a public/signed URL in the cache with expiry timestamp.
 * @param {string} key
 * @param {string} url
 * @param {number} ttlMs Default 50 minutes
 */
export function setCachedUrl(key, url, ttlMs = 3000000) {
  URL_CACHE.set(key, {
    url,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Gets set of starred file paths from localStorage.
 * @returns {Set<string>}
 */
export function getStarredSet() {
  try {
    const raw = localStorage.getItem(STARRED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (_) {
    return new Set();
  }
}

/**
 * Toggles starred status for a file path.
 * @param {string} path
 * @returns {boolean} New starred state
 */
export function toggleStarred(path) {
  const set = getStarredSet();
  let isStarred = false;
  if (set.has(path)) {
    set.delete(path);
  } else {
    set.add(path);
    isStarred = true;
  }
  try {
    localStorage.setItem(STARRED_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
  return isStarred;
}

/**
 * Gets set of pinned file/folder paths from localStorage.
 * @returns {Set<string>}
 */
export function getPinnedSet() {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (_) {
    return new Set();
  }
}

/**
 * Toggles pinned status for a file/folder path.
 * @param {string} path
 * @returns {boolean} New pinned state
 */
export function togglePinned(path) {
  const set = getPinnedSet();
  let isPinned = false;
  if (set.has(path)) {
    set.delete(path);
  } else {
    set.add(path);
    isPinned = true;
  }
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
  return isPinned;
}

/**
 * Registers an offline network event listener and invokes callback on network state change.
 * @param {Function} onChange - (isOnline: boolean) => void
 */
export function initNetworkMonitor(onChange) {
  window.addEventListener('online', () => onChange(true));
  window.addEventListener('offline', () => onChange(false));
  onChange(navigator.onLine);
}
