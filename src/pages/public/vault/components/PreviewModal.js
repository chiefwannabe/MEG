/**
 * PreviewModal Component - Lightbox Modal for File Previews.
 */

import { rendererRegistry } from '../renderers/RendererRegistry.js';
import { formatDate, formatBytes } from '../utils/fileUtils.js';

export class PreviewModal {
  constructor(onDownload, onCopyLink) {
    this.onDownload = onDownload;
    this.onCopyLink = onCopyLink;
    this.modalEl = null;
    this.currentFile = null;
    this.init();
  }

  init() {
    let el = document.getElementById('vaultPreviewModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vaultPreviewModal';
      el.className = 'vault-modal-overlay hidden';
      el.innerHTML = `
        <div class="vault-modal-container">
          <div class="vault-modal-header">
            <div class="modal-file-title">
              <span id="modalFileExt" class="badge">FILE</span>
              <h3 id="modalFileName">File Preview</h3>
            </div>
            <button id="modalCloseBtn" class="modal-close-btn" aria-label="Close Preview">&times;</button>
          </div>
          <div class="vault-modal-body" id="modalBody"></div>
          <div class="vault-modal-footer">
            <div class="modal-file-meta" id="modalFileMeta"></div>
            <div class="modal-actions">
              <button id="modalCopyBtn" class="btn btn-secondary btn-sm">🔗 Copy Link</button>
              <button id="modalOpenBtn" class="btn btn-secondary btn-sm">↗ Open</button>
              <button id="modalDownloadBtn" class="btn btn-primary btn-sm">⬇ Download</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(el);
    }

    this.modalEl = el;

    // Event listeners
    el.querySelector('#modalCloseBtn').addEventListener('click', () => this.close());
    el.addEventListener('click', (e) => {
      if (e.target === el) this.close();
    });

    el.querySelector('#modalCopyBtn').addEventListener('click', () => {
      if (this.currentFile && this.onCopyLink) this.onCopyLink(this.currentFile);
    });

    el.querySelector('#modalOpenBtn').addEventListener('click', () => {
      if (this.currentFile && this.currentFile.url) {
        window.open(this.currentFile.url, '_blank');
      }
    });

    el.querySelector('#modalDownloadBtn').addEventListener('click', () => {
      if (this.currentFile && this.onDownload) this.onDownload(this.currentFile);
    });

    // ESC shortcut listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modalEl.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  open(file) {
    if (!file) return;
    this.currentFile = file;

    const renderer = rendererRegistry.getRenderer(file);
    const bodyEl = this.modalEl.querySelector('#modalBody');
    bodyEl.innerHTML = '';
    bodyEl.appendChild(renderer.renderPreview(file));

    this.modalEl.querySelector('#modalFileName').textContent = file.name;
    this.modalEl.querySelector('#modalFileExt').textContent = file.label || file.extension.toUpperCase() || 'FILE';
    this.modalEl.querySelector('#modalFileMeta').textContent = `${formatBytes(file.size)} • Uploaded ${formatDate(file.updatedAt)}`;

    this.modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modalEl.classList.add('hidden');
    document.body.style.overflow = '';
    const bodyEl = this.modalEl.querySelector('#modalBody');
    bodyEl.innerHTML = ''; // Stop audio/video playback
    this.currentFile = null;
  }
}
