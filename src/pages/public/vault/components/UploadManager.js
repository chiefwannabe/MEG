/**
 * UploadManager Component - Drag & Drop Uploads, Queue Manager & Conflict Modal.
 */

import { formatBytes } from '../utils/fileUtils.js';

export class UploadManager {
  /**
   * @param {import('../services/FileService').FileService} fileService
   * @param {Function} onUploadComplete - () => void callback to refresh grid
   * @param {Function} showToast - (msg: string, type: string) => void
   */
  constructor(fileService, onUploadComplete, showToast) {
    this.fileService = fileService;
    this.onUploadComplete = onUploadComplete;
    this.showToast = showToast;
    this.currentFolder = '';
    this.uploadQueue = [];
    this.isUploading = false;

    this.dropzoneEl = null;
    this.queueWidgetEl = null;
    this.conflictModalEl = null;

    this.initUI();
    this.initDragEvents();
  }

  setCurrentFolder(folderPath) {
    this.currentFolder = folderPath || '';
  }

  initUI() {
    // 1. Dropzone Overlay
    let dropzone = document.getElementById('vaultDropzoneOverlay');
    if (!dropzone) {
      dropzone = document.createElement('div');
      dropzone.id = 'vaultDropzoneOverlay';
      dropzone.className = 'vault-dropzone-overlay hidden';
      dropzone.innerHTML = `
        <div class="dropzone-content">
          <div class="dropzone-icon">🚀</div>
          <h2>Drop Files to Upload to MEG Vault</h2>
          <p>Files will upload into current path</p>
        </div>
      `;
      document.body.appendChild(dropzone);
    }
    this.dropzoneEl = dropzone;

    // 2. Queue Floating Panel
    let queueWidget = document.getElementById('vaultUploadQueueWidget');
    if (!queueWidget) {
      queueWidget = document.createElement('div');
      queueWidget.id = 'vaultUploadQueueWidget';
      queueWidget.className = 'upload-queue-widget hidden';
      queueWidget.innerHTML = `
        <div class="queue-widget-header">
          <span class="queue-title">Upload Queue (<span id="queueCount">0</span>)</span>
          <button id="queueMinimizeBtn" class="widget-min-btn">&minus;</button>
        </div>
        <div class="queue-widget-body" id="queueListBody"></div>
      `;
      document.body.appendChild(queueWidget);
    }
    this.queueWidgetEl = queueWidget;

    // 3. Conflict Resolution Modal
    let conflictModal = document.getElementById('vaultConflictModal');
    if (!conflictModal) {
      conflictModal = document.createElement('div');
      conflictModal.id = 'vaultConflictModal';
      conflictModal.className = 'vault-modal-overlay hidden';
      conflictModal.innerHTML = `
        <div class="vault-modal-container conflict-dialog">
          <div class="vault-modal-header">
            <h3>File Already Exists</h3>
          </div>
          <div class="vault-modal-body">
            <p id="conflictFileName">File name conflict detected.</p>
            <p class="subtitle">Choose how to handle duplicate files:</p>
          </div>
          <div class="vault-modal-footer">
            <button id="conflictOverwriteBtn" class="btn btn-secondary btn-sm">Overwrite</button>
            <button id="conflictRenameBtn" class="btn btn-primary btn-sm">Auto-Rename</button>
            <button id="conflictSkipBtn" class="btn btn-ghost btn-sm">Skip</button>
          </div>
        </div>
      `;
      document.body.appendChild(conflictModal);
    }
    this.conflictModalEl = conflictModal;
  }

  initDragEvents() {
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (this.dropzoneEl) this.dropzoneEl.classList.remove('hidden');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0 && this.dropzoneEl) {
        this.dropzoneEl.classList.add('hidden');
        dragCounter = 0;
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (this.dropzoneEl) this.dropzoneEl.classList.add('hidden');

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFileSelect(Array.from(e.dataTransfer.files));
      }
    });
  }

  async handleFileSelect(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      this.uploadQueue.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        status: 'pending', // 'pending' | 'uploading' | 'completed' | 'failed'
        progress: 0,
        error: null,
      });
    }

    this.renderQueue();
    if (!this.isUploading) {
      this.processQueue();
    }
  }

  renderQueue() {
    if (!this.queueWidgetEl) return;
    const bodyEl = this.queueWidgetEl.querySelector('#queueListBody');
    const countEl = this.queueWidgetEl.querySelector('#queueCount');

    if (this.uploadQueue.length === 0) {
      this.queueWidgetEl.classList.add('hidden');
      return;
    }

    this.queueWidgetEl.classList.remove('hidden');
    countEl.textContent = this.uploadQueue.length;

    bodyEl.innerHTML = this.uploadQueue.map(item => `
      <div class="queue-item status-${item.status}">
        <div class="queue-item-info">
          <span class="q-name">${item.file.name}</span>
          <span class="q-size">${formatBytes(item.file.size)}</span>
        </div>
        <div class="queue-progress-bar">
          <div class="queue-progress-fill" style="width: ${item.progress}%"></div>
        </div>
        <span class="q-status-text">${item.status}</span>
      </div>
    `).join('');
  }

  async processQueue() {
    if (this.uploadQueue.length === 0) {
      this.isUploading = false;
      return;
    }

    this.isUploading = true;
    const pendingItem = this.uploadQueue.find(i => i.status === 'pending');

    if (!pendingItem) {
      this.isUploading = false;
      if (this.onUploadComplete) this.onUploadComplete();
      return;
    }

    pendingItem.status = 'uploading';
    pendingItem.progress = 30;
    this.renderQueue();

    const result = await this.fileService.uploadFile(pendingItem.file, this.currentFolder, { upsert: true });

    if (result.success) {
      pendingItem.status = 'completed';
      pendingItem.progress = 100;
      this.showToast(`Uploaded ${pendingItem.file.name}`, 'success');
    } else {
      pendingItem.status = 'failed';
      pendingItem.error = result.error;
      this.showToast(`Upload failed: ${result.error}`, 'error');
    }

    this.renderQueue();
    // Continue next item
    setTimeout(() => this.processQueue(), 300);
  }
}
