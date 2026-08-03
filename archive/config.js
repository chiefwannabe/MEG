window.BoxConfig = (function () {
  const currentConfig = {
    owner: 'chiefwannabe',
    repo: 'assets',
    branch: 'main',
    rootPath: 'archive',
    token: ''
  };

  async function init() {
    return currentConfig;
  }

  function get() {
    return currentConfig;
  }

  return { init, get };
})();

