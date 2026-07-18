import { storage } from "../../../firebase.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";
import { uid as uidFn, extensionOfBlob } from "./utils.js";

const THUMB_MAX_DIM = 480;
const COMPRESS_MAX_DIM = 2200;
const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024;

/**
 * Resizes an image file to fit within maxDim on its longest edge and
 * re-encodes it as JPEG. Vector (SVG) and animated (GIF) files are
 * returned untouched.
 */
async function resizeImage(file, maxDim, quality = 0.85) {
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((res) => canvas.toBlob(res, outType, quality));
  return blob ? new File([blob], file.name, { type: outType }) : file;
}

/** Produces a small preview used everywhere in the grid, so the grid never pulls full-res bytes. */
export async function generateThumbnail(file) {
  return resizeImage(file, THUMB_MAX_DIM, 0.75);
}

/** Only compresses large raster photos; small files and vectors/gifs pass through untouched. */
export async function maybeCompress(file) {
  if (file.size < COMPRESS_ABOVE_BYTES) return file;
  return resizeImage(file, COMPRESS_MAX_DIM, 0.85);
}

/**
 * Uploads a single blob with progress reporting.
 * @returns {Promise<{ storagePath: string, url: string }>}
 */
export function uploadWithProgress(uid, path, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const r = ref(storage, path);
    const task = uploadBytesResumable(r, blob, { contentType: blob.type });
    task.on(
      "state_changed",
      (snap) => onProgress?.(snap.bytesTransferred / snap.totalBytes),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ storagePath: path, url });
      }
    );
  });
}

/**
 * Uploads original and thumbnail image blobs to Firebase Storage.
 * @returns {Promise<{ originalUrl: string, thumbUrl: string, storagePath: string, thumbStoragePath: string }>}
 */
export async function uploadToStorage(uid, originalBlob, thumbBlob, onProgress) {
  const id = uidFn();
  const basePath = `users/${uid}/images/${id}`;
  const ext = extensionOfBlob(originalBlob.type) || "jpg";
  const mainPath = `${basePath}/original.${ext}`;
  const thumbPath = `${basePath}/thumb.jpg`;

  let mainProgress = 0;
  let thumbProgress = 0;
  const updateProgress = () => {
    onProgress?.((mainProgress * 0.8) + (thumbProgress * 0.2));
  };

  const [mainResult, thumbResult] = await Promise.all([
    uploadWithProgress(uid, mainPath, originalBlob, (p) => { mainProgress = p; updateProgress(); }),
    uploadWithProgress(uid, thumbPath, thumbBlob, (p) => { thumbProgress = p; updateProgress(); })
  ]);

  return {
    originalUrl: mainResult.url,
    thumbUrl: thumbResult.url,
    storagePath: mainResult.storagePath,
    thumbStoragePath: thumbResult.storagePath
  };
}

export async function deleteFromStorage(paths) {
  await Promise.all(
    paths.filter(Boolean).map((p) => deleteObject(ref(storage, p)).catch(() => {
      // Already gone is fine — don't block the rest of the delete flow on it.
    }))
  );
}

export async function fetchAsBlob(url) {
  const res = await fetch(url);
  return res.blob();
}
