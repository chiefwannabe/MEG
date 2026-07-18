import { watchAuth, signInAnon, signInGoogle, signOut } from "./auth.js";
import * as gallery from "./gallery.js";
import { connectGallery } from "./viewer.js";
import { exportGallery, importGallery } from "./export-import.js";
import { showToast } from "./toast.js";
import * as dialogs from "./dialogs.js";
import { 
  createFolder, 
  updateFolder, 
  deleteFolder, 
  fetchAllFolders,
  getFolderImageCount 
} from "./firestore-service.js";
import { currentUser } from "./auth.js";
import { escapeHtml } from "./utils.js";

// ==================== DOM ELEMENTS ====================
const authGate = document.getElementById("authGate");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const anonSignInBtn = document.getElementById("anonSignInBtn");
const avatarInitial = document.getElementById("avatarInitial");

const searchInput = document.getElementById("searchInput");
const sortBtn = document.getElementById("sortBtn");
const sortMenu = document.getElementById("sortMenu");
const sortLabel = document.getElementById("sortLabel");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const accountBtn = document.getElementById("accountBtn");

const dropzone = document.getElementById("dropzone");
const folderList = document.getElementById("folderList");
const createFolderBtn = document.getElementById("createFolderBtn");
const settingsBtn = document.getElementById("settingsBtn");

const breadcrumbRoot = document.getElementById("breadcrumbRoot");
const breadcrumbTrail = document.getElementById("breadcrumbTrail");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// ==================== STATE ====================
let currentView = "all"; // 'all', 'recent', 'trash'
let currentFolderId = null;
let folders = [];

const SORT_LABELS = { 
  newest: "Newest", 
  oldest: "Oldest", 
  name: "Name", 
  size: "Size" 
};

// ==================== VIEWER <-> GALLERY BRIDGE ====================
connectGallery({
  getImage: gallery.getImage,
  getOrder: gallery.getOrder,
  removeImage: gallery.removeImage,
  restoreImage: gallery.restoreImage,
  renameImageInGrid: gallery.renameImageInGrid,
  moveImageInGrid: gallery.moveImageInGrid
});

// ==================== AUTH ====================
let started = false;
watchAuth((user) => {
  if (user) {
    if (authGate) authGate.hidden = true;
    if (avatarInitial) {
      avatarInitial.textContent = (user.displayName?.[0] || user.email?.[0] || "A").toUpperCase();
    }
    if (!started) {
      started = true;
      initApp();
    }
  } else {
    if (authGate) authGate.hidden = false;
  }
});

if (googleSignInBtn) {
  googleSignInBtn.addEventListener("click", () => signInGoogle().catch((e) => showToast(e.message)));
}
if (anonSignInBtn) {
  anonSignInBtn.addEventListener("click", () => signInAnon().catch((e) => showToast(e.message)));
}

// ==================== APP INITIALIZATION ====================
async function initApp() {
  await loadFolders();
  gallery.initGallery({ view: currentView, folderId: currentFolderId });
  setupDragAndDrop();
  setupPasteUpload();
  setupMobileMenu();
}

// ==================== MOBILE MENU ====================
function setupMobileMenu() {
  if (!mobileMenuBtn || !sidebar || !sidebarOverlay) return;

  const toggleSidebar = () => {
    const isOpen = sidebar.classList.contains("is-open");
    if (isOpen) {
      sidebar.classList.remove("is-open");
      sidebarOverlay.classList.remove("is-active");
    } else {
      sidebar.classList.add("is-open");
      sidebarOverlay.classList.add("is-active");
    }
  };

  mobileMenuBtn.addEventListener("click", toggleSidebar);
  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("is-open");
    sidebarOverlay.classList.remove("is-active");
  });
}

// ==================== FOLDER MANAGEMENT ====================
async function loadFolders() {
  const user = currentUser();
  if (!user) return;
  
  folders = await fetchAllFolders(user.uid);
  renderFolders();
}

async function renderFolders() {
  if (!folderList) return;
  folderList.innerHTML = "";
  
  if (folders.length === 0) {
    folderList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--ink-faint); font-size: 12px;">No folders yet</div>';
    return;
  }
  
  for (const folder of folders) {
    const count = await getFolderImageCount(currentUser().uid, folder.id);
    const item = document.createElement("button");
    item.className = "folder-item";
    if (currentFolderId === folder.id) {
      item.classList.add("folder-item--active");
    }
    item.dataset.folderId = folder.id;
    item.innerHTML = `
      <svg class="folder-item__icon" viewBox="0 0 24 24" fill="none">
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2z" stroke="currentColor" stroke-width="1.6"/>
      </svg>
      <span class="folder-item__name">${escapeHtml(folder.name)}</span>
      ${count > 0 ? `<span class="folder-item__count">${count}</span>` : ''}
      <button class="iconbtn iconbtn--sm folder-item__menu" data-action="menu" aria-label="Folder options">
        <svg class="icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.6" fill="currentColor"/>
        </svg>
      </button>
    `;
    
    item.addEventListener("click", (e) => {
      if (e.target.closest('[data-action="menu"]')) {
        e.stopPropagation();
        showFolderMenu(folder, e.target.closest('[data-action="menu"]'));
        return;
      }
      navigateToFolder(folder.id);
      if (sidebar && sidebar.classList.contains("is-open")) {
        sidebar.classList.remove("is-open");
        if (sidebarOverlay) sidebarOverlay.classList.remove("is-active");
      }
    });
    
    folderList.appendChild(item);
  }
}

function showFolderMenu(folder, button) {
  dialogs.showContextMenu(button, [
    {
      label: "Rename",
      onClick: () => renameFolder(folder)
    },
    {
      label: "Delete",
      danger: true,
      onClick: () => deleteFolderWithConfirm(folder)
    }
  ]);
}

async function renameFolder(folder) {
  const newName = await dialogs.showRenameDialog(folder.name, "Rename folder");
  if (!newName || newName === folder.name) return;
  
  try {
    await updateFolder(currentUser().uid, folder.id, { name: newName });
    await loadFolders();
    showToast("Folder renamed");
  } catch (err) {
    console.error(err);
    showToast("Failed to rename folder");
  }
}

async function deleteFolderWithConfirm(folder) {
  const confirmed = await dialogs.showConfirmDialog(
    "Delete folder?",
    "Screenshots in this folder will be moved to All Screenshots."
  );
  if (!confirmed) return;
  
  try {
    await deleteFolder(currentUser().uid, folder.id);
    if (currentFolderId === folder.id) {
      navigateToView("all");
    }
    await loadFolders();
    showToast("Folder deleted");
  } catch (err) {
    console.error(err);
    showToast("Failed to delete folder");
  }
}

if (createFolderBtn) {
  createFolderBtn.addEventListener("click", async () => {
    const name = await dialogs.showCreateFolderDialog();
    if (!name) return;
    
    try {
      await createFolder(currentUser().uid, name);
      await loadFolders();
      showToast("Folder created");
    } catch (err) {
      console.error(err);
      showToast("Failed to create folder");
    }
  });
}

// ==================== NAVIGATION ====================
function navigateToView(view) {
  currentView = view;
  currentFolderId = null;
  
  // Update sidebar active states
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("nav-item--active");
    item.removeAttribute("aria-current");
  });
  
  const activeNav = document.querySelector(`[data-view="${view}"]`);
  if (activeNav) {
    activeNav.classList.add("nav-item--active");
    activeNav.setAttribute("aria-current", "page");
  }
  
  // Update folder active states
  document.querySelectorAll(".folder-item").forEach((item) => {
    item.classList.remove("folder-item--active");
  });
  
  // Update breadcrumb
  updateBreadcrumb();
  
  // Reload gallery
  gallery.setView(view, null);
}

function navigateToFolder(folderId) {
  currentView = "all";
  currentFolderId = folderId;
  
  // Update sidebar active states
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("nav-item--active");
    item.removeAttribute("aria-current");
  });
  
  // Update folder active states
  document.querySelectorAll(".folder-item").forEach((item) => {
    if (item.dataset.folderId === folderId) {
      item.classList.add("folder-item--active");
    } else {
      item.classList.remove("folder-item--active");
    }
  });
  
  // Update breadcrumb
  updateBreadcrumb();
  
  // Reload gallery
  gallery.setView("all", folderId);
}

function updateBreadcrumb() {
  if (!breadcrumbRoot || !breadcrumbTrail) return;
  if (currentView === "recent") {
    breadcrumbRoot.textContent = "Recent";
    breadcrumbTrail.innerHTML = "";
  } else if (currentView === "trash") {
    breadcrumbRoot.textContent = "Trash";
    breadcrumbTrail.innerHTML = "";
  } else if (currentFolderId) {
    const folder = folders.find((f) => f.id === currentFolderId);
    breadcrumbRoot.textContent = "All Screenshots";
    breadcrumbTrail.innerHTML = `
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__item breadcrumb__item--active">${escapeHtml(folder?.name || "Folder")}</span>
    `;
  } else {
    breadcrumbRoot.textContent = "All Screenshots";
    breadcrumbTrail.innerHTML = "";
  }
}

if (breadcrumbRoot) {
  breadcrumbRoot.addEventListener("click", () => {
    if (currentFolderId || currentView !== "all") {
      navigateToView("all");
    }
  });
}

// Setup nav items
document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
  item.addEventListener("click", () => {
    navigateToView(item.dataset.view);
    if (sidebar && sidebar.classList.contains("is-open")) {
      sidebar.classList.remove("is-open");
      if (sidebarOverlay) sidebarOverlay.classList.remove("is-active");
    }
  });
});

// ==================== SEARCH & SORT ====================
if (searchInput) {
  searchInput.addEventListener("input", (e) => gallery.setSearch(e.target.value));
}

if (sortBtn && sortMenu) {
  sortBtn.addEventListener("click", () => toggleMenu(sortMenu, sortBtn));
  sortMenu.addEventListener("click", (e) => {
    const item = e.target.closest(".menu__item");
    if (!item?.dataset.sort) return;
    
    if (sortLabel) sortLabel.textContent = SORT_LABELS[item.dataset.sort];
    gallery.setSort(item.dataset.sort);
    closeAllMenus();
  });
}

function toggleMenu(menu, btn) {
  const willOpen = menu.hidden;
  closeAllMenus();
  menu.hidden = !willOpen;
  btn.setAttribute("aria-expanded", String(willOpen));
}

function closeAllMenus() {
  if (sortMenu) sortMenu.hidden = true;
  if (sortBtn) sortBtn.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu") && !e.target.closest("#sortBtn")) {
    closeAllMenus();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllMenus();
});

// ==================== UPLOAD ====================
if (uploadBtn && fileInput) {
  uploadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFiles(Array.from(fileInput.files));
      fileInput.value = "";
    }
  });
}

function setupDragAndDrop() {
  if (!dropzone) return;
  let dragCounter = 0;
  
  document.body.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      dropzone.hidden = false;
    }
  });
  
  document.body.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropzone.hidden = true;
    }
  });
  
  document.body.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  
  document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropzone.hidden = true;
    
    if (e.dataTransfer && e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter((f) => 
        f.type.startsWith("image/")
      );
      
      if (files.length > 0) {
        handleFiles(files);
      }
    }
  });
}

function setupPasteUpload() {
  document.addEventListener("paste", (e) => {
    // If target is inside an input/textarea, let normal paste happen
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

    if (!e.clipboardData || !e.clipboardData.items) return;
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    
    if (imageItems.length === 0) return;
    
    e.preventDefault();
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    if (files.length > 0) {
      handleFiles(files);
      showToast(`Pasting ${files.length} screenshot${files.length === 1 ? "" : "s"}…`);
    }
  });
}

function handleFiles(files) {
  import("./upload.js").then((module) => {
    module.uploadFiles(files, currentFolderId);
  }).catch((err) => {
    console.error("Error importing upload module:", err);
    showToast("Upload failed to initialize");
  });
}

// ==================== SETTINGS ====================
function openSettings() {
  dialogs.showSettingsDialog({
    onExport: async () => {
      const stop = showToast("Preparing backup…", { duration: 999999 });
      try {
        await exportGallery();
        stop();
        showToast("Backup downloaded");
      } catch (err) {
        stop();
        console.error(err);
        showToast("Export failed");
      }
    },
    onImport: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".zip";
      input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        const stop = showToast("Restoring gallery…", { duration: 999999 });
        try {
          const { imported, skipped } = await importGallery(file);
          stop();
          showToast(`Restored ${imported} screenshot${imported === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}`);
          await loadFolders();
          gallery.setView(currentView, currentFolderId);
        } catch (err) {
          stop();
          console.error(err);
          showToast(err.message || "Import failed");
        }
      });
      input.click();
    },
    onSignOut: () => {
      signOut();
    }
  });
}

if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
if (accountBtn) accountBtn.addEventListener("click", openSettings);

// Export for use by other modules
export { loadFolders, folders, currentView, currentFolderId };
