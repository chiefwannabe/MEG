/**
 * ContextMenu Component - Custom Right-Click & Mobile Long-Press Context Menu.
 */

import { VAULT_CONFIG } from '../vault.config.js';

export class ContextMenu {
  /**
   * @param {Object} handlers - { onOpen, onDownload, onCopyLink, onStar, onPin, onRename, onDelete }
   */
  constructor(handlers) {
    this.handlers = handlers;
    this.menuEl = null;
    this.targetFile = null;
    this.init();
  }

  init() {
    let el = document.getElementById('vaultContextMenu');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vaultContextMenu';
      el.className = 'vault-context-menu hidden';
      el.innerHTML = `
        <div class="context-item" data-action="open">👁️ Open</div>
        <div class="context-item" data-action="download">⬇️ Download</div>
        <div class="context-item" data-action="copy">🔗 Copy Public Link</div>
        <div class="context-divider"></div>
        <div class="context-item" data-action="star">⭐ Star / Unstar</div>
        <div class="context-item" data-action="pin">📌 Pin / Unpin</div>
        <div class="context-divider"></div>
        <div class="context-item" data-action="rename">✏️ Rename</div>
        ${VAULT_CONFIG.enableDelete ? '<div class="context-item danger" data-action="delete">🗑️ Delete</div>' : ''}
      `;
      document.body.appendChild(el);
    }
    this.menuEl = el;

    // Item click listener
    el.addEventListener('click', (e) => {
      const item = e.target.closest('.context-item');
      if (!item || !this.targetFile) return;

      const action = item.dataset.action;
      this.hide();

      if (action === 'open' && this.handlers.onOpen) this.handlers.onOpen(this.targetFile);
      if (action === 'download' && this.handlers.onDownload) this.handlers.onDownload(this.targetFile);
      if (action === 'copy' && this.handlers.onCopyLink) this.handlers.onCopyLink(this.targetFile);
      if (action === 'star' && this.handlers.onStar) this.handlers.onStar(this.targetFile);
      if (action === 'pin' && this.handlers.onPin) this.handlers.onPin(this.targetFile);
      if (action === 'rename' && this.handlers.onRename) this.handlers.onRename(this.targetFile);
      if (action === 'delete' && this.handlers.onDelete && VAULT_CONFIG.enableDelete) this.handlers.onDelete(this.targetFile);
    });

    // Hide on window click or scroll or escape
    window.addEventListener('click', () => this.hide());
    window.addEventListener('scroll', () => this.hide(), true);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  show(event, file) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
      event.stopPropagation();
    }

    this.targetFile = file;

    const mouseX = event.clientX || (event.touches && event.touches[0].clientX) || 100;
    const mouseY = event.clientY || (event.touches && event.touches[0].clientY) || 100;

    this.menuEl.style.left = `${mouseX}px`;
    this.menuEl.style.top = `${mouseY}px`;
    this.menuEl.classList.remove('hidden');

    // Adjust position if overflowing window edges
    const rect = this.menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.menuEl.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.menuEl.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  }

  hide() {
    if (this.menuEl) {
      this.menuEl.classList.add('hidden');
      this.targetFile = null;
    }
  }
}
