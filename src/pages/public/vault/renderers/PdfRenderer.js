import { BaseRenderer } from './BaseRenderer.js';
import { MIME_CATEGORIES } from '../utils/mimeUtils.js';

export class PdfRenderer extends BaseRenderer {
  supports(file) {
    return file && (file.category === MIME_CATEGORIES.PDF || file.extension === 'pdf');
  }

  renderPreview(file) {
    const container = document.createElement('div');
    container.className = 'vault-preview-pdf-wrapper';
    
    const iframe = document.createElement('iframe');
    iframe.src = file.url;
    iframe.title = file.name;
    iframe.className = 'vault-preview-pdf-iframe';

    container.appendChild(iframe);
    return container;
  }

  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon vault-icon-pdf';
    el.innerHTML = '<span class="icon-emoji">📕</span>';
    return el;
  }
}
