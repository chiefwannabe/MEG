import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class CodeRenderer extends BaseRenderer {
  supports(file) {
    return file && file.category === MIME_CATEGORIES.CODE;
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-code-wrapper';
    container.innerHTML = `<div class="vault-loading-spinner">Loading code content...</div>`;

    fetch(file.url)
      .then(res => res.text())
      .then(text => {
        const pre = document.createElement('pre');
        pre.className = 'vault-code-block';
        const code = document.createElement('code');
        code.textContent = text.slice(0, 50000); // Limit 50k chars for safety
        pre.appendChild(code);
        container.innerHTML = '';
        container.appendChild(pre);
      })
      .catch(_ => {
        container.innerHTML = `<p class="error-msg">Could not load raw code content. Click Download/Open to view.</p>`;
      });

    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-code';
    el.innerHTML = '<span class="icon-emoji">💻</span>';
    return el;
  }
}
