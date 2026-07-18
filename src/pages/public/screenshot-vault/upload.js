import { currentUser } from "./auth.js";
import { createImageDoc, findByHash } from "./firestore-service.js";
import { uploadToStorage } from "./storage-service.js";
import { showToast } from "./toast.js";
import { escapeHtml, hashFile } from "./utils.js";

const uploadTray = document.getElementById("uploadTray");
let onNewImageCallback = null;

export function setOnNewImage(callback) {
  onNewImageCallback = callback;
}

export async function uploadFiles(files, folderId = null) {
  const user = currentUser();
  if (!user) {
    showToast("Please sign in first");
    return;
  }

  for (const file of files) {
    uploadFile(file, user.uid, folderId);
  }
}

async function uploadFile(file, uid, folderId) {
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create upload item in tray
  const item = document.createElement("div");
  item.className = "upload-item";
  item.id = uploadId;
  item.innerHTML = `
    <div class="upload-item__row">
      <span class="upload-item__name">${escapeHtml(file.name)}</span>
      <span class="upload-item__status">0%</span>
    </div>
    <div class="upload-item__bar">
      <div class="upload-item__fill" style="width: 0%"></div>
    </div>
  `;
  
  if (uploadTray) {
    uploadTray.hidden = false;
    uploadTray.appendChild(item);
  }

  try {
    // Calculate hash for duplicate detection
    const hash = await hashFile(file);
    
    // Check for duplicates
    const existing = await findByHash(uid, hash);
    if (existing) {
      item.classList.add("is-error");
      const statusEl = item.querySelector(".upload-item__status");
      if (statusEl) statusEl.textContent = "Duplicate";
      showToast(`Skipped duplicate: ${file.name}`);
      setTimeout(() => {
        item.remove();
        if (uploadTray && uploadTray.children.length === 0) uploadTray.hidden = true;
      }, 3000);
      return;
    }

    // Compress and create thumbnail
    const { original, thumb } = await processImage(file);

    // Upload to storage
    const onProgress = (progress) => {
      const percent = Math.round(progress * 100);
      const statusEl = item.querySelector(".upload-item__status");
      const fillEl = item.querySelector(".upload-item__fill");
      if (statusEl) statusEl.textContent = `${percent}%`;
      if (fillEl) fillEl.style.width = `${percent}%`;
    };

    const { originalUrl, thumbUrl, storagePath, thumbStoragePath } = await uploadToStorage(
      uid,
      original,
      thumb,
      onProgress
    );

    // Create Firestore document
    const imageId = await createImageDoc(uid, {
      filename: file.name,
      storagePath,
      thumbStoragePath,
      url: originalUrl,
      thumbUrl,
      size: file.size,
      width: original.width,
      height: original.height,
      hash,
      folderId
    });

    // Mark as done
    item.classList.add("is-done");
    const statusEl = item.querySelector(".upload-item__status");
    const fillEl = item.querySelector(".upload-item__fill");
    if (statusEl) statusEl.textContent = "Done";
    if (fillEl) fillEl.style.width = "100%";

    // Notify gallery
    if (onNewImageCallback) {
      onNewImageCallback({
        id: imageId,
        filename: file.name,
        url: originalUrl,
        thumbUrl,
        size: file.size,
        width: original.width,
        height: original.height,
        folderId,
        trashed: false,
        uploadedAtMs: Date.now()
      });
    }

    // Remove from tray after delay
    setTimeout(() => {
      item.remove();
      if (uploadTray && uploadTray.children.length === 0) {
        uploadTray.hidden = true;
      }
    }, 2000);

  } catch (err) {
    console.error(err);
    item.classList.add("is-error");
    const statusEl = item.querySelector(".upload-item__status");
    if (statusEl) statusEl.textContent = "Failed";
    showToast(`Upload failed: ${file.name}`);
    setTimeout(() => {
      item.remove();
      if (uploadTray && uploadTray.children.length === 0) uploadTray.hidden = true;
    }, 5000);
  }
}

async function processImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      // Create original (compressed if needed)
      const originalCanvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Compress if too large (max 4K)
      const maxDim = 4096;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }

      originalCanvas.width = width;
      originalCanvas.height = height;
      const originalCtx = originalCanvas.getContext("2d");
      originalCtx.drawImage(img, 0, 0, width, height);

      // Create thumbnail (max 800px)
      const thumbCanvas = document.createElement("canvas");
      const thumbMaxDim = 800;
      let thumbWidth = width;
      let thumbHeight = height;

      if (thumbWidth > thumbMaxDim || thumbHeight > thumbMaxDim) {
        if (thumbWidth > thumbHeight) {
          thumbHeight = (thumbHeight / thumbWidth) * thumbMaxDim;
          thumbWidth = thumbMaxDim;
        } else {
          thumbWidth = (thumbWidth / thumbHeight) * thumbMaxDim;
          thumbHeight = thumbMaxDim;
        }
      }

      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;
      const thumbCtx = thumbCanvas.getContext("2d");
      thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

      // Convert to blobs
      originalCanvas.toBlob((originalBlob) => {
        thumbCanvas.toBlob((thumbBlob) => {
          resolve({
            original: Object.assign(originalBlob || new Blob([]), { width, height }),
            thumb: thumbBlob || new Blob([])
          });
        }, "image/jpeg", 0.85);
      }, file.type === "image/png" ? "image/png" : "image/jpeg", 0.9);
    };

    img.onerror = reject;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
