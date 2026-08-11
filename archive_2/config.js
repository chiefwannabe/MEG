window.BoxConfig = (function () {
  // ponytail: read-only config with hardcoded fallback, ceiling: client-side fetch of config.json, upgrade path: env vars at build time
  let currentConfig = {
    owner: 'chiefwannabe',
    repo: 'assets',
    branch: 'main',
    rootPath: 'archive',
    token: ''
  };

  async function init() {
    try {
      const res = await fetch('config.json');
      if (res.ok) {
        const json = await res.json();
        currentConfig = { ...currentConfig, ...json };
      }
    } catch (e) {
      console.warn('Could not load config.json', e);
    }
    return currentConfig;
  }

  function get() {
    return currentConfig;
  }

  return { init, get };
})();

