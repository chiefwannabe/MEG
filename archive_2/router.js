window.BoxRouter = (function () {
  let onChangeCallback = null;

  function init(callback) {
    onChangeCallback = callback;
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function handleRoute() {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const path = params.get('path') || '';
    if (onChangeCallback) {
      onChangeCallback(path);
    }
  }

  function navigate(path) {
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    window.location.hash = `path=${encodeURIComponent(cleanPath)}`;
  }

  return { init, navigate };
})();
