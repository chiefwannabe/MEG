/**
 * Abstract Base Class for Plugin-Based File Renderers.
 * Every file renderer plugin must extend this class and implement `supports`, `renderPreview`, and `renderIcon`.
 */

export class BaseRenderer {
  /**
   * Evaluates if this renderer plugin supports the given file object.
   * @param {Object} file - Vault file object
   * @returns {boolean} True if supported
   */
  supports(file) {
    return false;
  }

  /**
   * Renders the preview DOM element for the preview modal/lightbox.
   * @param {Object} file - Vault file object
   * @returns {HTMLElement}
   */
  renderPreview(file) {
    const el = document.createElement('div');
    el.className = 'vault-preview-generic';
    el.innerHTML = `<div class="preview-generic-icon">📦</div><p>${file.name}</p>`;
    return el;
  }

  /**
   * Renders the icon / thumbnail DOM element for grid cards or list rows.
   * @param {Object} file - Vault file object
   * @returns {HTMLElement}
   */
  renderIcon(file) {
    const el = document.createElement('div');
    el.className = 'vault-file-icon';
    el.textContent = '📦';
    return el;
  }
}
