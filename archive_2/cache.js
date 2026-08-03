window.BoxCache = (function () {
  const PREFIX = 'box_cache_';
  const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  function get(key) {
    try {
      const itemStr = sessionStorage.getItem(PREFIX + key);
      if (!itemStr) return null;
      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        sessionStorage.removeItem(PREFIX + key);
        return null;
      }
      return item.data;
    } catch (e) {
      return null;
    }
  }

  function set(key, data, ttl = DEFAULT_TTL) {
    try {
      const item = {
        data: data,
        expiry: Date.now() + ttl
      };
      sessionStorage.setItem(PREFIX + key, JSON.stringify(item));
    } catch (e) {
      console.warn('SessionStorage full or unavailable');
    }
  }

  function clear() {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  }

  return { get, set, clear };
})();
