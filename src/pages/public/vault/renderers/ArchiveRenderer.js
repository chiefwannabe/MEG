import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class ArchiveRenderer extends BaseRenderer {
  supports(file) {
    return file && file.category === MIME_CATEGORIES.ARCHIVE;
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-generic';
    container.innerHTML = `
      <div class="preview-generic-icon">🗜️</div>
      <h3>${file.name}</h3>
      <p class="subtitle">Archive Package (${file.label})</p>
    `;
    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-archive';
    el.innerHTML = '<span class="icon-emoji">🗜️</span>';
    return el;
  }
}
