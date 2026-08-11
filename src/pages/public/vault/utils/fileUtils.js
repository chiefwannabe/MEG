/**
 * File & Data Formatting Utilities.
 * Provides file size formatting, timestamp parsing, sorting helpers, and string sanitization.
 */

/**
 * Formats a raw byte count into a human-readable file size string.
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @returns {string} e.g. "1.5 MB", "450 KB"
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats an ISO date string or timestamp into a readable date format.
 * @param {string|number|Date} dateVal
 * @returns {string} e.g. "2026-07-29" or "Jul 29, 2026"
 */
export function formatDate(dateVal) {
  if (!dateVal) return 'Unknown';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (_) {
    return 'Unknown';
  }
}

/**
 * Sorts an array of vault items based on field and direction.
 * Folders are always prioritized at the top.
 * @param {Array} items
 * @param {string} sortBy - 'name' | 'date' | 'size' | 'type'
 * @param {string} order - 'asc' | 'desc'
 * @returns {Array} New sorted array
 */
export function sortItems(items, sortBy = 'name', order = 'asc') {
  const isAsc = order === 'asc';
  return [...items].sort((a, b) => {
    // Priority: Folders always first
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;

    // Secondary priority: Pinned items
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    } else if (sortBy === 'size') {
      const sizeA = a.size || 0;
      const sizeB = b.size || 0;
      comparison = sizeA - sizeB;
    } else if (sortBy === 'date') {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      comparison = dateA - dateB;
    } else if (sortBy === 'type') {
      const typeA = a.extension || '';
      const typeB = b.extension || '';
      comparison = typeA.localeCompare(typeB);
    }

    return isAsc ? comparison : -comparison;
  });
}

/**
 * Filters items by a search query against filename.
 * @param {Array} items
 * @param {string} query
 * @returns {Array}
 */
export function filterItems(items, query = '') {
  if (!query || !query.trim()) return items;
  const q = query.trim().toLowerCase();
  return items.filter(item => item.name.toLowerCase().includes(q));
}

/**
 * Copies text content to user clipboard and returns success boolean.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (_) {
    return false;
  }
}
