/**
 * VaultToolbar Component - Handles Search, Category Filters, Sorting, View Toggle, and Breadcrumbs.
 */

export class VaultToolbar {
  /**
   * @param {HTMLElement} containerEl
   * @param {Object} callbacks - { onSearch, onFilterCategory, onSortChange, onViewChange, onRefresh, onNavigateFolder }
   */
  constructor(containerEl, callbacks) {
    this.containerEl = containerEl;
    this.callbacks = callbacks;

    this.currentSearch = '';
    this.currentCategory = 'all';
    this.currentSortBy = 'name';
    this.currentSortOrder = 'asc';
    this.currentView = 'grid';
    this.currentFolderPath = '';

    this.init();
  }

  init() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <!-- Top Row: Breadcrumbs & Storage Metrics -->
      <div class="toolbar-top-row">
        <nav class="vault-breadcrumbs" id="vaultBreadcrumbs" aria-label="Folder Navigation">
          <span class="crumb active" data-path="">MEG Vault</span>
        </nav>

        <div class="vault-metrics-badge">
          <span id="metricFilesCount">0 items</span>
          <span class="dot">•</span>
          <span id="metricTotalSize">0 B</span>
        </div>
      </div>

      <!-- Controls Row: Search & Filters -->
      <div class="toolbar-controls-row">
        <div class="search-box-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" id="vaultSearchInput" placeholder="Search files by name..." autocomplete="off" />
        </div>

        <div class="toolbar-actions-group">
          <!-- Sort Dropdown -->
          <select id="vaultSortSelect" class="vault-select">
            <option value="name:asc">Sort: Name (A-Z)</option>
            <option value="name:desc">Sort: Name (Z-A)</option>
            <option value="date:desc">Sort: Newest First</option>
            <option value="date:asc">Sort: Oldest First</option>
            <option value="size:desc">Sort: Largest First</option>
            <option value="size:asc">Sort: Smallest First</option>
            <option value="type:asc">Sort: File Type</option>
          </select>

          <!-- View Toggle -->
          <div class="view-toggle-buttons">
            <button id="viewGridBtn" class="toggle-btn active" title="Grid View">📱 Grid</button>
            <button id="viewListBtn" class="toggle-btn" title="List View">≡ List</button>
          </div>

          <!-- Refresh Button -->
          <button id="vaultRefreshBtn" class="btn btn-secondary btn-icon" title="Refresh Storage Vault">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Category Chips Filter Row -->
      <div class="toolbar-chips-row" id="categoryChips">
        <button class="chip active" data-category="all">All Files</button>
        <button class="chip" data-category="image">🖼️ Images</button>
        <button class="chip" data-category="video">🎥 Videos</button>
        <button class="chip" data-category="audio">🎵 Audio</button>
        <button class="chip" data-category="pdf">📕 PDFs</button>
        <button class="chip" data-category="code">💻 Code</button>
        <button class="chip" data-category="text">📝 Text</button>
        <button class="chip" data-category="archive">📦 Archives</button>
        <button class="chip" data-category="document">📚 Docs</button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Search input
    const searchInput = this.containerEl.querySelector('#vaultSearchInput');
    searchInput.addEventListener('input', (e) => {
      this.currentSearch = e.target.value;
      if (this.callbacks.onSearch) this.callbacks.onSearch(this.currentSearch);
    });

    // Sort select
    const sortSelect = this.containerEl.querySelector('#vaultSortSelect');
    sortSelect.addEventListener('change', (e) => {
      const [by, order] = e.target.value.split(':');
      this.currentSortBy = by;
      this.currentSortOrder = order;
      if (this.callbacks.onSortChange) this.callbacks.onSortChange(by, order);
    });

    // View toggle
    const gridBtn = this.containerEl.querySelector('#viewGridBtn');
    const listBtn = this.containerEl.querySelector('#viewListBtn');

    gridBtn.addEventListener('click', () => {
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
      this.currentView = 'grid';
      if (this.callbacks.onViewChange) this.callbacks.onViewChange('grid');
    });

    listBtn.addEventListener('click', () => {
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
      this.currentView = 'list';
      if (this.callbacks.onViewChange) this.callbacks.onViewChange('list');
    });

    // Refresh
    const refreshBtn = this.containerEl.querySelector('#vaultRefreshBtn');
    refreshBtn.addEventListener('click', () => {
      if (this.callbacks.onRefresh) this.callbacks.onRefresh();
    });

    // Category Chips
    const chipsContainer = this.containerEl.querySelector('#categoryChips');
    chipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      chipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      this.currentCategory = chip.dataset.category;
      if (this.callbacks.onFilterCategory) this.callbacks.onFilterCategory(this.currentCategory);
    });

    // Breadcrumb Navigation
    const breadcrumbs = this.containerEl.querySelector('#vaultBreadcrumbs');
    breadcrumbs.addEventListener('click', (e) => {
      const crumb = e.target.closest('.crumb');
      if (!crumb) return;
      const targetPath = crumb.dataset.path || '';
      if (this.callbacks.onNavigateFolder) this.callbacks.onNavigateFolder(targetPath);
    });
  }

  updateMetrics(totalFiles, totalSizeFormatted) {
    const filesEl = this.containerEl.querySelector('#metricFilesCount');
    const sizeEl = this.containerEl.querySelector('#metricTotalSize');
    if (filesEl) filesEl.textContent = `${totalFiles} items`;
    if (sizeEl) sizeEl.textContent = totalSizeFormatted;
  }

  updateBreadcrumbs(folderPath) {
    this.currentFolderPath = folderPath || '';
    const breadcrumbs = this.containerEl.querySelector('#vaultBreadcrumbs');
    if (!breadcrumbs) return;

    if (!folderPath) {
      breadcrumbs.innerHTML = `<span class="crumb active" data-path="">MEG Vault</span>`;
      return;
    }

    const parts = folderPath.split('/').filter(Boolean);
    let accumulated = '';

    let html = `<span class="crumb" data-path="">MEG Vault</span> <span class="sep">/</span> `;
    parts.forEach((part, index) => {
      accumulated += (index === 0 ? '' : '/') + part;
      const isLast = index === parts.length - 1;
      if (isLast) {
        html += `<span class="crumb active" data-path="${accumulated}">${part}</span>`;
      } else {
        html += `<span class="crumb" data-path="${accumulated}">${part}</span> <span class="sep">/</span> `;
      }
    });

    breadcrumbs.innerHTML = html;
  }
}
