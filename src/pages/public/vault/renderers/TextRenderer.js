import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class TextRenderer extends BaseRenderer {
  supports(file) {
    return file && file.category === MIME_CATEGORIES.TEXT;
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-text-wrapper';
    container.innerHTML = `<div class="vault-loading-spinner">Loading text file...</div>`;

    fetch(file.url)
      .then(res => res.text())
      .then(text => {
        const pre = document.createElement('pre');
        pre.className = 'vault-text-block';
        pre.textContent = text.slice(0, 50000);
        container.innerHTML = '';
        container.appendChild(pre);
      })
      .catch(_ => {
        container.innerHTML = `<p class="error-msg">Could not load text preview.</p>`;
      });

    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-text';
    el.innerHTML = '<span class="icon-emoji">📝</span>';
    return el;
  }
}
