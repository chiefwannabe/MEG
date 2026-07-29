import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class GenericRenderer extends BaseRenderer {
  supports(file) {
    return true; // Universal fallback
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-generic';
    
    let emoji = '📦';
    if (file.isFolder) emoji = '📁';
    else if (file.category === MIME_CATEGORIES.APK) emoji = '📱';
    else if (file.category === MIME_CATEGORIES.ISO) emoji = '💿';

    container.innerHTML = `
      <div class="preview-generic-icon">${emoji}</div>
      <h3>${file.name}</h3>
      <p class="subtitle">${file.isFolder ? 'Folder' : (file.label + ' File')}</p>
    `;
    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-generic';
    
    let emoji = '📦';
    if (file.isFolder) emoji = '📁';
    else if (file.category === MIME_CATEGORIES.APK) emoji = '📱';
    else if (file.category === MIME_CATEGORIES.ISO) emoji = '💿';

    el.innerHTML = `<span class="icon-emoji">${emoji}</span>`;
    return el;
  }
}
