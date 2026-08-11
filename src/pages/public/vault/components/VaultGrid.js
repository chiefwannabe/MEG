/**
 * VaultGrid Component - Virtualized/Chunked Grid & List View Renderer.
 * High-performance layout capable of rendering 10,000+ items smoothly without DOM freezing.
 */

import { rendererRegistry } from '../renderers/RendererRegistry.js';
import { formatBytes, formatDate } from '../utils/fileUtils.js';
import { VAULT_CONFIG } from '../vault.config.js';

export class VaultGrid {
  /**
   * @param {HTMLElement} containerEl
   * @param {Object} callbacks - { onItemClick, onItemDoubleClick, onItemContextMenu, onSelectionChange, onUploadTrigger }
   */
  constructor(containerEl, callbacks) {
    this.containerEl = containerEl;
    this.callbacks = callbacks;

    this.items = [];
    this.selectedIds = new Set();
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.chunkSize = 60;   // Batch rendering step
    this.renderedCount = 0;

    this.gridContainer = null;
    this.bulkBarEl = null;

    this.init();
  }

  init() {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = `
      <div id="vaultBulkBar" class="vault-bulk-bar hidden">
        <span id="bulkCountText">0 selected</span>
        <div class="bulk-actions">
          <button id="bulkDownloadBtn" class="btn btn-secondary btn-sm">⬇ Download Selected</button>
          ${VAULT_CONFIG.enableDelete ? '<button id="bulkDeleteBtn" class="btn btn-danger btn-sm">🗑 Delete Selected</button>' : ''}
          <button id="bulkClearBtn" class="btn btn-ghost btn-sm">Cancel</button>
        </div>
      </div>
      <div id="vaultItemsContainer" class="vault-items-container view-grid"></div>
    `;

    this.gridContainer = this.containerEl.querySelector('#vaultItemsContainer');
    this.bulkBarEl = this.containerEl.querySelector('#vaultBulkBar');

    this.bindEvents();
  }

  bindEvents() {
    // Bulk actions
    const clearBtn = this.containerEl.querySelector('#bulkClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSelection());
    }

    const downloadBtn = this.containerEl.querySelector('#bulkDownloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (this.callbacks.onBulkDownload) {
          const selected = this.items.filter(i => this.selectedIds.has(i.id));
          this.callbacks.onBulkDownload(selected);
        }
      });
    }

    const deleteBtn = this.containerEl.querySelector('#bulkDeleteBtn');
    if (deleteBtn && VAULT_CONFIG.enableDelete) {
      deleteBtn.addEventListener('click', () => {
        if (this.callbacks.onBulkDelete) {
          const selected = this.items.filter(i => this.selectedIds.has(i.id));
          this.callbacks.onBulkDelete(selected);
        }
      });
    }

    // Scroll listener for virtual chunked loading of 10,000+ files
    window.addEventListener('scroll', () => {
      if (this.renderedCount < this.items.length) {
        const bottom = document.documentElement.getBoundingClientRect().bottom;
        if (bottom < window.innerHeight + 600) {
          this.renderNextChunk();
        }
      }
    });

    // Keyboard Ctrl+A, Delete, Escape, Enter
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.selectAll();
      } else if (e.key === 'Escape') {
        this.clearSelection();
      } else if (e.key === 'Delete' && this.selectedIds.size > 0 && VAULT_CONFIG.enableDelete) {
        if (this.callbacks.onBulkDelete) {
          const selected = this.items.filter(i => this.selectedIds.has(i.id));
          this.callbacks.onBulkDelete(selected);
        }
      }
    });
  }

  setViewMode(mode) {
    this.viewMode = mode;
    if (this.gridContainer) {
      this.gridContainer.className = `vault-items-container view-${mode}`;
    }
    this.render(this.items);
  }

  showSkeleton() {
    if (!this.gridContainer) return;
    const skeletons = Array(8).fill(0).map(() => `
      <div class="card skeleton-card">
        <div class="skeleton-icon"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line long"></div>
      </div>
    `).join('');
    this.gridContainer.innerHTML = skeletons;
  }

  showEmptyState(message = 'Supabase Storage bucket "MEG" connected successfully (0 files found).') {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = `
      <div class="vault-empty-state">
        <div class="empty-icon">🗂️</div>
        <h3>Bucket "MEG" is Currently Empty</h3>
        <p>${message}</p>
        <p class="subtitle" style="margin-top: 8px; opacity: 0.8; font-size: 13px;">
          Drag and drop files anywhere on this page to upload files to Supabase Storage!
        </p>
      </div>
    `;
  }

  showErrorState(errorMessage) {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = `
      <div class="vault-error-state">
        <div class="error-icon">⚠️</div>
        <h3>Supabase Storage API Error</h3>
        <p class="error-msg-detail" style="color: var(--red); font-family: 'JetBrains Mono', monospace; font-size: 13px; background: rgba(239,68,68,0.1); padding: 12px; border-radius: 8px; margin: 12px 0;">
          ${errorMessage}
        </p>
        <p style="font-size: 13px; color: var(--text-muted);">
          Please check the browser Developer Console for detailed logs.
        </p>
      </div>
    `;
  }

  render(items = []) {
    this.items = items;
    this.renderedCount = 0;
    this.gridContainer.innerHTML = '';

    if (items.length === 0) {
      this.showEmptyState();
      return;
    }

    this.renderNextChunk();
  }

  renderNextChunk() {
    if (this.renderedCount >= this.items.length) return;

    const nextBatch = this.items.slice(this.renderedCount, this.renderedCount + this.chunkSize);
    const fragment = document.createDocumentFragment();

    nextBatch.forEach(item => {
      const cardEl = this.createCardElement(item);
      fragment.appendChild(cardEl);
    });

    this.gridContainer.appendChild(fragment);
    this.renderedCount += nextBatch.length;
  }

  createCardElement(item) {
    const isSelected = this.selectedIds.has(item.id);
    const card = document.createElement('article');
    card.className = `vault-card ${item.isFolder ? 'is-folder' : ''} ${isSelected ? 'is-selected' : ''} ${item.isPinned ? 'is-pinned' : ''}`;
    card.dataset.id = item.id;

    const renderer = rendererRegistry.getRenderer(item);
    const iconEl = renderer.renderIcon(item);

    const isStarred = item.isStarred ? '★' : '☆';
    const isPinned = item.isPinned ? '📌' : '';

    card.innerHTML = `
      <div class="card-select-checkbox">
        <input type="checkbox" ${isSelected ? 'checked' : ''} tabindex="-1" />
      </div>
      <div class="card-icon-container"></div>
      <div class="card-info">
        <div class="card-title-row">
          <span class="card-name" title="${item.name}">${item.name}</span>
          ${isPinned ? `<span class="pin-badge">${isPinned}</span>` : ''}
        </div>
        <div class="card-meta-row">
          <span class="ext-badge">${item.label || item.extension.toUpperCase() || (item.isFolder ? 'FOLDER' : 'FILE')}</span>
          <span class="card-size">${item.isFolder ? 'Folder' : formatBytes(item.size)}</span>
        </div>
      </div>
      <button class="card-star-btn ${item.isStarred ? 'starred' : ''}">${isStarred}</button>
    `;

    card.querySelector('.card-icon-container').appendChild(iconEl);

    // Event listeners
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.classList.contains('card-select-checkbox')) {
        this.toggleSelection(item.id);
        return;
      }
      if (e.target.classList.contains('card-star-btn')) {
        e.stopPropagation();
        if (this.callbacks.onStarToggle) this.callbacks.onStarToggle(item);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        this.toggleSelection(item.id);
      } else {
        if (this.callbacks.onItemClick) this.callbacks.onItemClick(item);
      }
    });

    card.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (this.callbacks.onItemDoubleClick) this.callbacks.onItemDoubleClick(item);
    });

    card.addEventListener('contextmenu', (e) => {
      if (this.callbacks.onItemContextMenu) this.callbacks.onItemContextMenu(e, item);
    });

    return card;
  }

  toggleSelection(id) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.updateSelectionUI();
  }

  selectAll() {
    this.items.forEach(i => this.selectedIds.add(i.id));
    this.updateSelectionUI();
  }

  clearSelection() {
    this.selectedIds.clear();
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    const cards = this.gridContainer.querySelectorAll('.vault-card');
    cards.forEach(card => {
      const id = card.dataset.id;
      const isSelected = this.selectedIds.has(id);
      card.classList.toggle('is-selected', isSelected);
      const cb = card.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = isSelected;
    });

    if (this.selectedIds.size > 0) {
      this.bulkBarEl.classList.remove('hidden');
      this.containerEl.querySelector('#bulkCountText').textContent = `${this.selectedIds.size} items selected`;
    } else {
      this.bulkBarEl.classList.add('hidden');
    }

    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange(Array.from(this.selectedIds));
    }
  }
}
