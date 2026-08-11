(async function () {
  let currentItems = [];
  let currentPath = '';
  let viewMode = localStorage.getItem('box_view_mode') || 'grid';
  let folderTreeData = null;
  let lastFocusedElement = null;

  // DOM Elements
  const fileGrid = document.getElementById('file-grid');
  const statusMsg = document.getElementById('status-message');
  const breadcrumbsNav = document.getElementById('breadcrumbs-nav');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const downloadSelectedBtn = document.getElementById('download-selected-btn');
  const filterButtons = document.querySelectorAll('.filter-btn, .sidebar-category-btn');
  let activeFilter = 'all';
  let folderCategory = null;
  const categoryFolders = [
    ['image', 'Images', 'icon-image'],
    ['file', 'Files', 'icon-file'],
    ['document', 'Documents', 'icon-doc'],
    ['video', 'Video', 'icon-video'],
    ['audio', 'Audio', 'icon-audio'],
    ['archive', 'Archives', 'icon-zip']
  ];
  const viewToggleBtn = document.getElementById('view-toggle-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const previewModal = document.getElementById('preview-modal');
  const closePreviewBtn = document.getElementById('close-preview-btn');
  const previewTitle = document.getElementById('preview-title');
  const previewBody = document.getElementById('preview-body');
  const previewDownloadBtn = document.getElementById('preview-download-btn');
  const copyUrlBtn = document.getElementById('copy-url-btn');
  const copyFileBtn = document.getElementById('copy-file-btn');
  const storageInfo = document.getElementById('storage-info');
  const repoLink = document.getElementById('repo-link');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const folderTree = document.getElementById('folder-tree');
  const selectedFiles = new Map();
  let previewFile = null;

  // Theme Setup
  const savedTheme = localStorage.getItem('box_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('box_theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    themeToggleBtn.innerHTML = theme === 'dark'
      ? '<svg class="icon"><use href="#icon-sun"></use></svg>'
      : '<svg class="icon"><use href="#icon-moon"></use></svg>';
  }

  // View Mode Toggle
  updateViewModeClass();
  viewToggleBtn.addEventListener('click', () => {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    localStorage.setItem('box_view_mode', viewMode);
    updateViewModeClass();
  });

  function updateViewModeClass() {
    fileGrid.className = `file-grid view-${viewMode}`;
    viewToggleBtn.innerHTML = viewMode === 'grid'
      ? '<svg class="icon"><use href="#icon-list"></use></svg>'
      : '<svg class="icon"><use href="#icon-grid"></use></svg>';
  }

  // Sidebar Toggle
  const isMobile = () => window.innerWidth < 1024;
  const sidebarCollapsed = localStorage.getItem('box_sidebar_collapsed') === 'true';

  function setSidebarCollapsed(collapsed) {
    if (collapsed) {
      sidebar.classList.add('collapsed');
      sidebarToggle.setAttribute('aria-expanded', 'false');
    } else {
      sidebar.classList.remove('collapsed');
      sidebarToggle.setAttribute('aria-expanded', 'true');
    }
    localStorage.setItem('box_sidebar_collapsed', collapsed.toString());
  }

  function setSidebarOpen(open) {
    if (open) {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('visible');
      sidebarToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
      sidebarToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }

  // Initialize sidebar state
  if (isMobile()) {
    setSidebarOpen(false);
  } else {
    setSidebarCollapsed(sidebarCollapsed);
  }

  sidebarToggle.addEventListener('click', () => {
    if (isMobile()) {
      setSidebarOpen(!sidebar.classList.contains('open'));
    } else {
      setSidebarCollapsed(!sidebar.classList.contains('collapsed'));
    }
  });

  sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));

  window.addEventListener('resize', () => {
    const wasMobile = sidebar.dataset.wasMobile === 'true';
    const nowMobile = isMobile();
    sidebar.dataset.wasMobile = nowMobile.toString();

    if (wasMobile && !nowMobile) {
      setSidebarOpen(false);
      setSidebarCollapsed(localStorage.getItem('box_sidebar_collapsed') === 'true');
    } else if (!wasMobile && nowMobile) {
      setSidebarCollapsed(false);
      setSidebarOpen(false);
    }
  });

  // Initialize Config & Application
  await BoxConfig.init();
  updateFooterInfo();

  // Preview Modal Close
  closePreviewBtn.addEventListener('click', () => closeModal(previewModal));
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closeModal(previewModal);
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(previewModal);
      if (isMobile() && sidebar.classList.contains('open')) {
        setSidebarOpen(false);
      }
    }
  });

  // Modal focus management
  function openModal(modal) {
    lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden');
    trapFocus(modal);
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', function handleTab(e) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }, { once: true });

    firstElement?.focus();
  }

  // Router listener
  BoxRouter.init((path) => {
    currentPath = path;
    loadDirectory(path);
  });

  async function loadDirectory(path) {
    fileGrid.innerHTML = '';
    statusMsg.textContent = 'Loading repository contents...';
    statusMsg.classList.remove('hidden');

    try {
      const cfg = BoxConfig.get();
      let targetPath = path || cfg.rootPath || '';

      const items = await BoxGitHub.fetchPath(targetPath);
      currentItems = Array.isArray(items) ? items : [items];

      // Build folder tree on first load
      if (!folderTreeData && targetPath === (cfg.rootPath || '')) {
        folderTreeData = buildFolderTree(currentItems);
        renderFolderTree(folderTreeData);
      }

      statusMsg.classList.add('hidden');
      renderBreadcrumbs(targetPath);
      renderItems();
      updateActiveFolder(targetPath);
    } catch (err) {
      statusMsg.textContent = err.message;
      statusMsg.classList.remove('hidden');
    }
  }

  function buildFolderTree(items) {
    const root = { name: '', path: '', children: [], isRoot: true };
    const pathMap = { '': root };

    items.forEach(item => {
      if (item.type === 'dir') {
        const parts = item.path.split('/').filter(Boolean);
        let currentPath = '';
        parts.forEach((part, index) => {
          currentPath += (currentPath ? '/' : '') + part;
          if (!pathMap[currentPath]) {
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            const parent = pathMap[parentPath] || root;
            const node = {
              name: part,
              path: currentPath,
              children: [],
              depth: index + 1
            };
            pathMap[currentPath] = node;
            parent.children.push(node);
          }
        });
      }
    });

    return root;
  }

  function renderFolderTree(tree) {
    folderTree.innerHTML = '';
    tree.children.forEach(node => {
      const el = createTreeNode(node);
      folderTree.appendChild(el);
    });
  }

  function createTreeNode(node) {
    const container = document.createElement('div');
    container.className = 'tree-node';
    container.dataset.path = node.path;

    const hasChildren = node.children.length > 0;
    const isExpanded = localStorage.getItem(`box_tree_expanded_${node.path}`) === 'true';

    const item = document.createElement('a');
    item.className = 'tree-item';
    item.href = `#path=${encodeURIComponent(node.path)}`;
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-expanded', hasChildren ? isExpanded.toString() : 'false');
    item.setAttribute('aria-level', node.depth.toString());

    if (hasChildren) {
      const toggle = document.createElement('button');
      toggle.className = 'tree-node-toggle' + (isExpanded ? ' expanded' : '');
      toggle.setAttribute('aria-label', isExpanded ? 'Collapse folder' : 'Expand folder');
      toggle.innerHTML = '<svg class="icon"><use href="#icon-chevron-right"></use></svg>';
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTreeNode(node.path, !isExpanded);
      });
      container.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.style.width = '20px';
      container.appendChild(spacer);
    }

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.classList.add('icon');
    icon.innerHTML = '<use href="#icon-folder"></use>';
    item.appendChild(icon);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tree-item-name';
    nameSpan.textContent = node.name;
    item.appendChild(nameSpan);

    container.appendChild(item);

    if (hasChildren) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';
      childrenContainer.style.display = isExpanded ? 'block' : 'none';
      childrenContainer.setAttribute('role', 'group');

      node.children.forEach(child => {
        childrenContainer.appendChild(createTreeNode(child));
      });

      container.appendChild(childrenContainer);
    }

    return container;
  }

  function toggleTreeNode(path, expanded) {
    localStorage.setItem(`box_tree_expanded_${path}`, expanded.toString());
    const nodeEl = folderTree.querySelector(`.tree-node[data-path="${path}"]`);
    if (!nodeEl) return;

    const toggle = nodeEl.querySelector('.tree-node-toggle');
    const children = nodeEl.querySelector('.tree-children');
    const item = nodeEl.querySelector('.tree-item');

    if (toggle) toggle.classList.toggle('expanded', expanded);
    if (children) children.style.display = expanded ? 'block' : 'none';
    if (item) item.setAttribute('aria-expanded', expanded.toString());
  }

  function updateActiveFolder(path) {
    folderTree.querySelectorAll('.tree-item').forEach(item => {
      const itemPath = item.getAttribute('href').replace('#path=', '');
      const decodedPath = decodeURIComponent(itemPath);
      item.classList.toggle('active', decodedPath === path);
    });
  }

  function renderItems() {
    fileGrid.innerHTML = '';

    if (activeFilter === 'dir' && !folderCategory) {
      renderCategoryFolders();
      return;
    }

    const items = currentItems;
    const filtered = BoxSearch.filterAndSort(
      items,
      searchInput.value,
      sortSelect.value,
      activeFilter
    );

    if (filtered.length === 0) {
      showEmptyState();
      return;
    }
    statusMsg.classList.add('hidden');

    filtered.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'listitem');
      card.dataset.index = index;
      card.dataset.path = item.path;

      const isDir = item.type === 'dir';
      const iconId = isDir ? 'icon-folder' : getIconForFile(item.name);

      card.innerHTML = `
        ${isDir ? '' : `<input class="file-select" type="checkbox" aria-label="Select ${escapeHtml(item.name)}" ${selectedFiles.has(item.path) ? 'checked' : ''} />`}
        <div class="file-info">
          <svg class="icon file-icon"><use href="#${iconId}"></use></svg>
          <span class="file-name">${escapeHtml(item.name)}</span>
        </div>
        <span class="file-meta">${isDir ? 'Folder' : formatBytes(item.size)}</span>
      `;

      const select = card.querySelector('.file-select');
      select?.addEventListener('click', e => e.stopPropagation());
      select?.addEventListener('change', e => {
        if (e.target.checked) selectedFiles.set(item.path, item);
        else selectedFiles.delete(item.path);
        card.classList.toggle('selected', e.target.checked);
        updateSelectedDownloadButton();
      });

      card.addEventListener('click', () => onItemClick(item));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onItemClick(item);
        }
      });

      fileGrid.appendChild(card);
    });

    // Focus first item if coming from keyboard
    if (document.activeElement === searchInput || document.activeElement === sortSelect) {
      const firstCard = fileGrid.querySelector('.file-card');
      firstCard?.focus();
    }
  }

  function showEmptyState() {
    statusMsg.classList.add('hidden');
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <svg class="icon" style="width: 64px; height: 64px;"><use href="#icon-folder"></use></svg>
      <div class="empty-state-title">No files found</div>
      <div class="empty-state-description">
        ${searchInput.value ? 'Try adjusting your search or filter.' : 'This folder appears to be empty.'}
      </div>
    `;
    fileGrid.appendChild(emptyState);
  }

  function onItemClick(item) {
    if (item.type === 'dir') {
      BoxRouter.navigate(item.path);
    } else {
      openPreview(item);
    }
  }

  function openPreview(file) {
    previewFile = file;
    previewTitle.textContent = file.name;
    const rawUrl = file.download_url || BoxGitHub.getRawUrl(file.path);
    previewDownloadBtn.href = rawUrl;
    copyFileBtn.hidden = file.size > 20 * 1024 * 1024;
    copyFileBtn.textContent = 'Copy to Clipboard';
    openModal(previewModal);
    BoxPreview.renderPreview(file, previewBody);
  }

  function updateSelectedDownloadButton() {
    downloadSelectedBtn.disabled = selectedFiles.size === 0;
    downloadSelectedBtn.textContent = selectedFiles.size
      ? `Download selected (${selectedFiles.size})`
      : 'Download selected';
  }

  downloadSelectedBtn.addEventListener('click', () => {
    [...selectedFiles.values()].forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = file.download_url || BoxGitHub.getRawUrl(file.path);
        link.download = file.name;
        link.click();
      }, index * 150);
    });
  });

  copyUrlBtn.addEventListener('click', async () => {
    if (!previewFile) return;
    try {
      await navigator.clipboard.writeText(previewFile.download_url || BoxGitHub.getRawUrl(previewFile.path));
      copyUrlBtn.textContent = 'URL Copied';
    } catch (error) {
      copyUrlBtn.textContent = 'Copy failed';
    }
    setTimeout(() => { copyUrlBtn.textContent = 'Copy URL'; }, 1200);
  });

  copyFileBtn.addEventListener('click', async () => {
    if (!previewFile) return;
    try {
      const url = previewFile.download_url || BoxGitHub.getRawUrl(previewFile.path);
      const response = await fetch(url);
      const blob = await response.blob();
      if (navigator.clipboard.write && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'application/octet-stream']: blob })]);
      } else {
        await navigator.clipboard.writeText(await blob.text());
      }
      copyFileBtn.textContent = 'Copied';
    } catch (error) {
      copyFileBtn.textContent = 'Copy failed';
    }
    setTimeout(() => { copyFileBtn.textContent = 'Copy to Clipboard'; }, 1200);
  });

  function renderBreadcrumbs(path) {
    breadcrumbsNav.innerHTML = '';
    const cfg = BoxConfig.get();

    const rootItem = document.createElement('a');
    rootItem.className = 'breadcrumb-item';
    rootItem.textContent = cfg.repo || 'Root';
    rootItem.href = '#path=';
    breadcrumbsNav.appendChild(rootItem);

    if (!path) return;

    const parts = path.split('/').filter(Boolean);
    let accumulated = '';

    parts.forEach((part, index) => {
      accumulated += (accumulated ? '/' : '') + part;

      const sep = document.createElement('span');
      sep.className = 'breadcrumb-separator';
      sep.textContent = '/';
      breadcrumbsNav.appendChild(sep);

      const link = document.createElement('a');
      link.className = 'breadcrumb-item' + (index === parts.length - 1 ? ' active' : '');
      link.textContent = part;
      link.href = `#path=${encodeURIComponent(accumulated)}`;
      if (index === parts.length - 1) {
        link.setAttribute('aria-current', 'page');
      }
      breadcrumbsNav.appendChild(link);
    });
  }

  function renderCategoryFolders() {
    statusMsg.classList.add('hidden');
    categoryFolders.forEach(([filter, name, icon]) => {
      const count = BoxSearch.filterAndSort(currentItems, '', 'name-asc', filter).length;
      const card = document.createElement('div');
      card.className = 'file-card virtual-folder-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="file-info">
          <svg class="icon file-icon"><use href="#${icon}"></use></svg>
          <span class="file-name">${name}</span>
        </div>
        <span class="file-meta">${count} ${count === 1 ? 'file' : 'files'}</span>
      `;
      const open = () => {
        folderCategory = filter;
        activeFilter = filter;
        updateFilterButtons();
        renderItems();
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
      fileGrid.appendChild(card);
    });
  }

  function getIconForFile(filename) {
    const type = BoxPreview.getFileType(filename);
    switch (type) {
      case 'image': return 'icon-image';
      case 'audio': return 'icon-audio';
      case 'video': return 'icon-video';
      case 'pdf': return 'icon-pdf';
      case 'markdown':
      case 'text': return 'icon-code';
      default: return 'icon-file';
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  }

  function updateFooterInfo() {
    const cfg = BoxConfig.get();
    if (cfg.owner && cfg.repo) {
      storageInfo.textContent = `Connected to ${cfg.owner}/${cfg.repo} (${cfg.branch})`;
      repoLink.href = `https://github.com/${cfg.owner}/${cfg.repo}/tree/${cfg.branch}`;
      repoLink.style.display = 'inline-flex';
    } else {
      storageInfo.textContent = 'Storage: Unconfigured';
      repoLink.style.display = 'none';
    }
  }

  // Filter Listeners
  searchInput.addEventListener('input', renderItems);
  sortSelect.addEventListener('change', renderItems);
  function updateFilterButtons() {
    filterButtons.forEach(button => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active.toString());
    });
  }

  filterButtons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    folderCategory = null;
    updateFilterButtons();
    renderItems();
  }));


  // Keyboard navigation for file grid
  fileGrid.addEventListener('keydown', (e) => {
    const cards = Array.from(fileGrid.querySelectorAll('.file-card:not(.hidden)'));
    const currentIndex = cards.findIndex(card => card === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    const cols = viewMode === 'grid' ? Math.max(1, Math.floor(fileGrid.offsetWidth / 200)) : 1;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = viewMode === 'grid' ? currentIndex + 1 : -1;
        break;
      case 'ArrowLeft':
        nextIndex = viewMode === 'grid' ? currentIndex - 1 : -1;
        break;
      case 'ArrowDown':
        nextIndex = viewMode === 'grid' ? currentIndex + cols : currentIndex + 1;
        break;
      case 'ArrowUp':
        nextIndex = viewMode === 'grid' ? currentIndex - cols : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = cards.length - 1;
        break;
    }

    if (nextIndex >= 0 && nextIndex < cards.length) {
      e.preventDefault();
      cards[nextIndex].focus();
      cards[nextIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });

  // Search focus shortcut
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        !document.activeElement.isContentEditable) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Home shortcut
  window.addEventListener('keydown', (e) => {
    if (e.key === 'g' && e.altKey) {
      e.preventDefault();
      BoxRouter.navigate('');
    }
  });

  // Load full tree after initial load if needed
  setTimeout(async () => {
    if (!folderTreeData) {
      try {
        const cfg = BoxConfig.get();
        if (cfg.owner && cfg.repo) {
          const items = await BoxGitHub.fetchPath(cfg.rootPath || '');
          folderTreeData = buildFolderTree(Array.isArray(items) ? items : [items]);
          renderFolderTree(folderTreeData);
        }
      } catch (e) {
        console.warn('Could not load folder tree:', e);
      }
    }
  }, 100);
})();
