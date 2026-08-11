window.BoxGitHub = (function () {
  async function fetchPath(path = '') {
    const cfg = BoxConfig.get();
    if (!cfg.owner || !cfg.repo) {
      throw new Error('Repository owner and name are required.');
    }

    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const cacheKey = `${cfg.owner}/${cfg.repo}/${cfg.branch}/${cleanPath}`;
    
    const cached = BoxCache.get(cacheKey);
    if (cached) return cached;

    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cleanPath}?ref=${cfg.branch}`;
    
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (cfg.token) {
      headers['Authorization'] = `token ${cfg.token}`;
    }

    const res = await fetch(apiUrl, { headers });
    
    if (res.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Set a token in config.json if needed.');
    }
    if (!res.ok) {
      throw new Error(`Failed to load directory (${res.status} ${res.statusText})`);
    }

    const data = await res.json();
    BoxCache.set(cacheKey, data);
    return data;
  }

  function getRawUrl(filePath) {
    const cfg = BoxConfig.get();
    return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${filePath}`;
  }

  return { fetchPath, getRawUrl };
})();
