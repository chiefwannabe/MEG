import { currentUser } from "./auth.js";
import { updateImageDoc, moveImageToFolder } from "./firestore-service.js";
import { formatBytes, escapeHtml } from "./utils.js";
import { showToast } from "./toast.js";
import * as dialogs from "./dialogs.js";
import { folders } from "./main.js";

const viewer = document.getElementById("viewer");
const viewerBackdrop = document.getElementById("viewerBackdrop");
const viewerClose = document.getElementById("viewerClose");
const viewerPrev = document.getElementById("viewerPrev");
const viewerNext = document.getElementById("viewerNext");
const viewerStage = document.getElementById("viewerStage");
const viewerImg = document.getElementById("viewerImg");
const viewerName = document.getElementById("viewerName");
const viewerMeta = document.getElementById("viewerMeta");
const viewerCopy = document.getElementById("viewerCopy");
const viewerDownload = document.getElementById("viewerDownload");
const viewerMove = document.getElementById("viewerMove");
const viewerRename = document.getElementById("viewerRename");
const viewerDelete = document.getElementById("viewerDelete");

let galleryBridge = null;
let currentImageId = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panOffset = { x: 0, y: 0 };
let scale = 1;

export function connectGallery(bridge) {
  galleryBridge = bridge;
}

export function openViewer(imageId) {
  if (!galleryBridge || !viewer) return;
  
  const image = galleryBridge.getImage(imageId);
  if (!image) return;
  
  currentImageId = imageId;
  viewer.hidden = false;
  document.body.style.overflow = "hidden";
  
  loadImage(image);
  updateNavButtons();
}

function closeViewer() {
  if (!viewer) return;
  viewer.hidden = true;
  document.body.style.overflow = "";
  currentImageId = null;
  resetTransform();
}

function loadImage(image) {
  if (viewerImg) viewerImg.src = image.url;
  if (viewerName) viewerName.textContent = image.filename;
  
  const dims = image.width && image.height ? `${image.width}×${image.height}` : "";
  const meta = [formatBytes(image.size), dims].filter(Boolean).join(" · ");
  if (viewerMeta) viewerMeta.textContent = meta;
  
  resetTransform();
}

function resetTransform() {
  scale = 1;
  panOffset = { x: 0, y: 0 };
  if (viewerImg) viewerImg.style.transform = "none";
}

function updateNavButtons() {
  if (!galleryBridge) return;
  
  const order = galleryBridge.getOrder();
  const currentIndex = order.indexOf(currentImageId);
  
  if (viewerPrev) {
    viewerPrev.disabled = currentIndex <= 0;
    viewerPrev.style.opacity = currentIndex <= 0 ? "0.3" : "1";
  }
  if (viewerNext) {
    viewerNext.disabled = currentIndex >= order.length - 1;
    viewerNext.style.opacity = currentIndex >= order.length - 1 ? "0.3" : "1";
  }
}

function navigatePrev() {
  if (!galleryBridge) return;
  
  const order = galleryBridge.getOrder();
  const currentIndex = order.indexOf(currentImageId);
  if (currentIndex <= 0) return;
  
  const prevId = order[currentIndex - 1];
  const prevImage = galleryBridge.getImage(prevId);
  if (prevImage) {
    currentImageId = prevId;
    loadImage(prevImage);
    updateNavButtons();
  }
}

function navigateNext() {
  if (!galleryBridge) return;
  
  const order = galleryBridge.getOrder();
  const currentIndex = order.indexOf(currentImageId);
  if (currentIndex >= order.length - 1) return;
  
  const nextId = order[currentIndex + 1];
  const nextImage = galleryBridge.getImage(nextId);
  if (nextImage) {
    currentImageId = nextId;
    loadImage(nextImage);
    updateNavButtons();
  }
}

async function copyImage() {
  const image = galleryBridge?.getImage(currentImageId);
  if (!image) return;
  
  try {
    const response = await fetch(image.url);
    const blob = await response.blob();
    
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      showToast("Image copied to clipboard");
    } else {
      showToast("Copy not supported in this browser");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to copy image");
  }
}

function downloadImage() {
  const image = galleryBridge?.getImage(currentImageId);
  if (!image) return;
  
  const a = document.createElement("a");
  a.href = image.url;
  a.download = image.filename;
  a.target = "_blank";
  a.click();
  showToast("Download started");
}

async function moveImage() {
  const image = galleryBridge?.getImage(currentImageId);
  if (!image) return;
  
  const newFolderId = await dialogs.showMoveFolderDialog(folders, image.folderId);
  if (newFolderId === undefined) return; // Cancelled
  
  try {
    await moveImageToFolder(currentUser().uid, currentImageId, newFolderId);
    galleryBridge.moveImageInGrid(currentImageId, newFolderId);
    
    const folderName = newFolderId 
      ? folders.find((f) => f.id === newFolderId)?.name || "folder"
      : "All Screenshots";
    showToast(`Moved to ${folderName}`);
  } catch (err) {
    console.error(err);
    showToast("Failed to move screenshot");
  }
}

async function renameImage() {
  const image = galleryBridge?.getImage(currentImageId);
  if (!image) return;
  
  const newName = await dialogs.showRenameDialog(image.filename);
  if (!newName || newName === image.filename) return;
  
  try {
    await updateImageDoc(currentUser().uid, currentImageId, { filename: newName });
    galleryBridge.renameImageInGrid(currentImageId, newName);
    if (viewerName) viewerName.textContent = newName;
    showToast("Screenshot renamed");
  } catch (err) {
    console.error(err);
    showToast("Failed to rename screenshot");
  }
}

async function deleteImage() {
  const image = galleryBridge?.getImage(currentImageId);
  if (!image) return;
  
  const confirmed = await dialogs.showConfirmDialog(
    "Delete screenshot?",
    "This will move the screenshot to trash."
  );
  if (!confirmed) return;
  
  const deletedImage = { ...image };
  const deletedId = currentImageId;
  
  // Navigate to next/prev before deleting
  const order = galleryBridge.getOrder();
  const currentIndex = order.indexOf(currentImageId);
  if (order.length > 1) {
    if (currentIndex < order.length - 1) {
      navigateNext();
    } else if (currentIndex > 0) {
      navigatePrev();
    } else {
      closeViewer();
    }
  } else {
    closeViewer();
  }
  
  // Delete from gallery
  await galleryBridge.removeImage(deletedId);
  
  // Show undo toast
  showToast("Moved to trash", {
    duration: 5000,
    actionLabel: "Undo",
    onAction: async () => {
      try {
        await galleryBridge.restoreImage(deletedImage);
        showToast("Screenshot restored");
      } catch (err) {
        console.error(err);
        showToast("Failed to restore");
      }
    }
  });
}

// ==================== EVENT LISTENERS ====================

if (viewerClose) viewerClose.addEventListener("click", closeViewer);
if (viewerBackdrop) viewerBackdrop.addEventListener("click", closeViewer);
if (viewerPrev) viewerPrev.addEventListener("click", navigatePrev);
if (viewerNext) viewerNext.addEventListener("click", navigateNext);
if (viewerCopy) viewerCopy.addEventListener("click", copyImage);
if (viewerDownload) viewerDownload.addEventListener("click", downloadImage);
if (viewerMove) viewerMove.addEventListener("click", moveImage);
if (viewerRename) viewerRename.addEventListener("click", renameImage);
if (viewerDelete) viewerDelete.addEventListener("click", deleteImage);

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (!viewer || viewer.hidden) return;
  
  if (e.key === "Escape") {
    closeViewer();
  } else if (e.key === "ArrowLeft") {
    navigatePrev();
  } else if (e.key === "ArrowRight") {
    navigateNext();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteImage();
  }
});

// Pan & Zoom
if (viewerStage) {
  viewerStage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.5, Math.min(3, scale * delta));
    updateTransform();
  });
}

if (viewerImg) {
  viewerImg.addEventListener("mousedown", (e) => {
    if (scale <= 1) return;
    isPanning = true;
    panStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    viewerImg.style.cursor = "grabbing";
  });

  viewerImg.addEventListener("dblclick", () => {
    if (scale === 1) {
      scale = 2;
    } else {
      resetTransform();
    }
    updateTransform();
  });
}

document.addEventListener("mousemove", (e) => {
  if (!isPanning) return;
  panOffset = { x: e.clientX - panStart.x, y: e.clientY - panStart.y };
  updateTransform();
});

document.addEventListener("mouseup", () => {
  if (isPanning) {
    isPanning = false;
    if (viewerImg) viewerImg.style.cursor = "grab";
  }
});

function updateTransform() {
  if (viewerImg) {
    viewerImg.style.transform = `scale(${scale}) translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)`;
  }
}
