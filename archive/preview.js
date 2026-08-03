window.BoxPreview = (function () {
  function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (['mp4', 'webm', 'ogv'].includes(ext)) return 'video';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['md', 'markdown'].includes(ext)) return 'markdown';
    if (['txt', 'js', 'ts', 'html', 'css', 'json', 'py', 'sh', 'yml', 'yaml', 'c', 'cpp', 'java'].includes(ext)) return 'text';
    return 'binary';
  }

  function simpleMarkdownParse(mdStr) {
    return mdStr
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\n\n/gim, '<br/><br/>');
  }

  async function renderPreview(file, containerElement) {
    containerElement.innerHTML = '<div class="status-message">Loading preview...</div>';
    const type = getFileType(file.name);
    const rawUrl = file.download_url || BoxGitHub.getRawUrl(file.path);

    try {
      if (type === 'image') {
        containerElement.innerHTML = `<img src="${rawUrl}" alt="${file.name}" class="preview-media" />`;
      } else if (type === 'audio') {
        containerElement.innerHTML = `<audio controls src="${rawUrl}" style="width: 100%; max-width: 400px;"></audio>`;
      } else if (type === 'video') {
        containerElement.innerHTML = `<video controls src="${rawUrl}" class="preview-media"></video>`;
      } else if (type === 'pdf') {
        containerElement.innerHTML = `<iframe src="${rawUrl}" class="preview-iframe"></iframe>`;
      } else if (type === 'markdown' || type === 'text') {
        const res = await fetch(rawUrl);
        const text = await res.text();
        if (type === 'markdown') {
          containerElement.innerHTML = `<div class="preview-markdown">${simpleMarkdownParse(text)}</div>`;
        } else {
          containerElement.innerHTML = `<pre class="preview-text"><code>${escapeHtml(text)}</code></pre>`;
        }
      } else {
        containerElement.innerHTML = `
          <div style="text-align: center; padding: 2rem;">
            <svg class="icon" style="width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 1rem;"><use href="#icon-file"></use></svg>
            <p>Preview not directly supported for this file type.</p>
          </div>
        `;
      }
    } catch (err) {
      containerElement.innerHTML = `<div class="status-message">Failed to load preview: ${err.message}</div>`;
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { getFileType, renderPreview };
})();
