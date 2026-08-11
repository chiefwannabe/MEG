import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class ImageRenderer extends BaseRenderer {
  supports(file) {
    return file && file.category === MIME_CATEGORIES.IMAGE;
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-image-wrapper';
    
    const img = document.createElement('img');
    img.src = file.url;
    img.alt = file.name;
    img.className = 'vault-preview-img';
    img.loading = 'lazy';
    
    container.appendChild(img);
    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-image';
    
    const thumb = document.createElement('img');
    thumb.src = file.url;
    thumb.alt = file.name;
    thumb.className = 'vault-card-thumb';
    thumb.loading = 'lazy';
    
    thumb.onerror = () => {
      el.innerHTML = '🖼️';
    };

    el.appendChild(thumb);
    return el;
  }
}
