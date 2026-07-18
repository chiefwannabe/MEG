import { escapeHtml } from "./utils.js";

const renameDialog = document.getElementById("renameDialog");
const renameInput = document.getElementById("renameInput");
const renameCancel = document.getElementById("renameCancel");
const renameConfirm = document.getElementById("renameConfirm");

const confirmDialog = document.getElementById("confirmDialog");
const confirmTitle = document.getElementById("confirmTitle");
const confirmBody = document.getElementById("confirmBody");
const confirmCancel = document.getElementById("confirmCancel");
const confirmOk = document.getElementById("confirmOk");

const createFolderDialog = document.getElementById("createFolderDialog");
const createFolderInput = document.getElementById("createFolderInput");
const createFolderCancel = document.getElementById("createFolderCancel");
const createFolderConfirm = document.getElementById("createFolderConfirm");

const moveFolderDialog = document.getElementById("moveFolderDialog");
const moveFolderList = document.getElementById("moveFolderList");
const moveFolderCancel = document.getElementById("moveFolderCancel");

const settingsDialog = document.getElementById("settingsDialog");
const settingsClose = document.getElementById("settingsClose");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const signOutBtn = document.getElementById("signOutBtn");

let activeContextMenu = null;

// ==================== RENAME DIALOG ====================
export function showRenameDialog(currentName, title = "Rename screenshot") {
  return new Promise((resolve) => {
    if (!renameDialog || !renameInput || !renameConfirm || !renameCancel) {
      resolve(null);
      return;
    }
    
    const titleEl = document.getElementById("renameTitle");
    if (titleEl) titleEl.textContent = title;
    renameInput.value = currentName || "";
    renameDialog.hidden = false;
    renameInput.focus();
    renameInput.select();

    const cleanup = () => {
      renameDialog.hidden = true;
      renameConfirm.removeEventListener("click", onConfirm);
      renameCancel.removeEventListener("click", onCancel);
      renameInput.removeEventListener("keydown", onKeydown);
    };

    const onConfirm = () => {
      const value = renameInput.value.trim();
      cleanup();
      resolve(value || null);
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onKeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    renameConfirm.addEventListener("click", onConfirm);
    renameCancel.addEventListener("click", onCancel);
    renameInput.addEventListener("keydown", onKeydown);
    renameDialog.addEventListener("click", (e) => {
      if (e.target === renameDialog) onCancel();
    });
  });
}

// ==================== CONFIRM DIALOG ====================
export function showConfirmDialog(title, body, okLabel = "Delete", danger = true) {
  return new Promise((resolve) => {
    if (!confirmDialog || !confirmOk || !confirmCancel) {
      resolve(false);
      return;
    }

    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmBody) confirmBody.textContent = body;
    confirmOk.textContent = okLabel;
    confirmOk.className = danger ? "btn btn--danger" : "btn btn--primary";
    confirmDialog.hidden = false;

    const cleanup = () => {
      confirmDialog.hidden = true;
      confirmOk.removeEventListener("click", onConfirm);
      confirmCancel.removeEventListener("click", onCancel);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    confirmOk.addEventListener("click", onConfirm);
    confirmCancel.addEventListener("click", onCancel);
    confirmDialog.addEventListener("click", (e) => {
      if (e.target === confirmDialog) onCancel();
    });
    
    document.addEventListener("keydown", function onEscape(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", onEscape);
        onCancel();
      }
    });
  });
}

// ==================== CREATE FOLDER DIALOG ====================
export function showCreateFolderDialog() {
  return new Promise((resolve) => {
    if (!createFolderDialog || !createFolderInput || !createFolderConfirm || !createFolderCancel) {
      resolve(null);
      return;
    }

    createFolderInput.value = "";
    createFolderDialog.hidden = false;
    createFolderInput.focus();

    const cleanup = () => {
      createFolderDialog.hidden = true;
      createFolderConfirm.removeEventListener("click", onConfirm);
      createFolderCancel.removeEventListener("click", onCancel);
      createFolderInput.removeEventListener("keydown", onKeydown);
    };

    const onConfirm = () => {
      const value = createFolderInput.value.trim();
      cleanup();
      resolve(value || null);
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onKeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    createFolderConfirm.addEventListener("click", onConfirm);
    createFolderCancel.addEventListener("click", onCancel);
    createFolderInput.addEventListener("keydown", onKeydown);
    createFolderDialog.addEventListener("click", (e) => {
      if (e.target === createFolderDialog) onCancel();
    });
  });
}

// ==================== MOVE TO FOLDER DIALOG ====================
export function showMoveFolderDialog(folders, currentFolderId) {
  return new Promise((resolve) => {
    if (!moveFolderDialog || !moveFolderList || !moveFolderCancel) {
      resolve(undefined);
      return;
    }

    moveFolderList.innerHTML = "";
    
    // Add "All Screenshots" option (root)
    const rootItem = document.createElement("button");
    rootItem.className = "folder-picker__item";
    rootItem.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
      </svg>
      <span>All Screenshots</span>
    `;
    rootItem.addEventListener("click", () => {
      cleanup();
      resolve(null);
    });
    moveFolderList.appendChild(rootItem);
    
    // Add folders
    (folders || []).forEach((folder) => {
      if (folder.id === currentFolderId) return; // Skip current folder
      
      const item = document.createElement("button");
      item.className = "folder-picker__item";
      item.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none">
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2z" stroke="currentColor" stroke-width="1.6"/>
        </svg>
        <span>${escapeHtml(folder.name)}</span>
      `;
      item.addEventListener("click", () => {
        cleanup();
        resolve(folder.id);
      });
      moveFolderList.appendChild(item);
    });
    
    moveFolderDialog.hidden = false;

    const cleanup = () => {
      moveFolderDialog.hidden = true;
      moveFolderCancel.removeEventListener("click", onCancel);
    };

    const onCancel = () => {
      cleanup();
      resolve(undefined); // undefined means cancelled
    };

    moveFolderCancel.addEventListener("click", onCancel);
    moveFolderDialog.addEventListener("click", (e) => {
      if (e.target === moveFolderDialog) onCancel();
    });
    
    document.addEventListener("keydown", function onEscape(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", onEscape);
        onCancel();
      }
    });
  });
}

// ==================== SETTINGS DIALOG ====================
export function showSettingsDialog({ onExport, onImport, onSignOut }) {
  if (!settingsDialog) return;
  settingsDialog.hidden = false;

  const cleanup = () => {
    settingsDialog.hidden = true;
    if (settingsClose) settingsClose.removeEventListener("click", onClose);
    if (exportBtn) exportBtn.removeEventListener("click", handleExport);
    if (importBtn) importBtn.removeEventListener("click", handleImport);
    if (signOutBtn) signOutBtn.removeEventListener("click", handleSignOut);
  };

  const onClose = () => {
    cleanup();
  };

  const handleExport = () => {
    cleanup();
    if (onExport) onExport();
  };

  const handleImport = () => {
    cleanup();
    if (onImport) onImport();
  };

  const handleSignOut = () => {
    cleanup();
    if (onSignOut) onSignOut();
  };

  if (settingsClose) settingsClose.addEventListener("click", onClose);
  if (exportBtn) exportBtn.addEventListener("click", handleExport);
  if (importBtn) importBtn.addEventListener("click", handleImport);
  if (signOutBtn) signOutBtn.addEventListener("click", handleSignOut);
  settingsDialog.addEventListener("click", (e) => {
    if (e.target === settingsDialog) onClose();
  });
  
  document.addEventListener("keydown", function onEscape(e) {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", onEscape);
      onClose();
    }
  });
}

// ==================== CONTEXT MENU ====================
export function showContextMenu(anchor, items) {
  // Close existing menu
  if (activeContextMenu) {
    activeContextMenu.remove();
    activeContextMenu = null;
  }

  const menu = document.createElement("div");
  menu.className = "menu";
  menu.style.position = "fixed";
  menu.style.zIndex = "400";
  
  (items || []).forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "menu__item";
    if (item.danger) btn.style.color = "var(--danger)";
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      menu.remove();
      activeContextMenu = null;
      if (item.onClick) item.onClick();
    });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  activeContextMenu = menu;

  // Position menu
  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left}px`;
  
  // Adjust if off-screen
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    menu.style.left = `${rect.right - menuRect.width}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    menu.style.top = `${rect.top - menuRect.height - 4}px`;
  }

  // Close on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      activeContextMenu = null;
      document.removeEventListener("click", closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener("click", closeMenu);
  }, 0);
}
