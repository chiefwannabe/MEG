import { currentUser } from "./auth.js";
import { fetchAllImages, createImageDoc, findByHash } from "./firestore-service.js";
import { fetchAsBlob, uploadWithProgress, generateThumbnail } from "./storage-service.js";
import { hashFile, sanitizeFilename, uid } from "./utils.js";

let jszipPromise = null;
function loadJSZip() {
  if (!jszipPromise) {
    jszipPromise = import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm").then((m) => m.default);
  }
  return jszipPromise;
}

/** Downloads every image plus a manifest of all metadata as a single .zip. */
export async function exportGallery(onProgress) {
  const user = currentUser();
  if (!user) return;

  const JSZip = await loadJSZip();
  const zip = new JSZip();
  const images = await fetchAllImages(user.uid);

  const manifest = {
    exportedAt: new Date().toISOString(),
    count: images.length,
    images: []
  };

  const folder = zip.folder("images");
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    onProgress?.((i / images.length) * 0.9);
    try {
      const blob = await fetchAsBlob(img.url);
      const safeName = `${img.id}_${sanitizeFilename(img.filename)}`;
      folder.file(safeName, blob);
      manifest.images.push({ ...img, zipEntry: `images/${safeName}` });
    } catch (err) {
      console.error("Skipping image in export:", img.filename, err);
    }
  }

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  onProgress?.(0.95);

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  onProgress?.(1);

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `screenshot-vault-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Restores a gallery from a previously exported .zip: re-uploads every
 * image and recreates its metadata.
 * Duplicate content (by hash) is skipped automatically.
 */
export async function importGallery(file, onProgress) {
  const user = currentUser();
  if (!user) return { imported: 0, skipped: 0 };

  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) throw new Error("This doesn't look like a Screenshot Vault backup (no manifest.json).");

  const manifest = JSON.parse(await manifestEntry.async("string"));
  let imported = 0, skipped = 0;

  for (let i = 0; i < manifest.images.length; i++) {
    const meta = manifest.images[i];
    onProgress?.(i / manifest.images.length);
    const entry = zip.file(meta.zipEntry);
    if (!entry) { skipped++; continue; }

    const blob = await entry.async("blob");
    const typedBlob = new Blob([blob], { type: blob.type || guessType(meta.filename) });
    const imgFile = new File([typedBlob], meta.filename, { type: typedBlob.type });

    const hash = await hashFile(imgFile);
    const existing = await findByHash(user.uid, hash);
    if (existing) { skipped++; continue; }

    const id = uid();
    const basePath = `users/${user.uid}/images/${id}`;
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg" }[typedBlob.type] || "jpg";
    const thumb = await generateThumbnail(imgFile);

    const [mainResult, thumbResult] = await Promise.all([
      uploadWithProgress(user.uid, `${basePath}/original.${ext}`, imgFile),
      uploadWithProgress(user.uid, `${basePath}/thumb.jpg`, thumb)
    ]);

    await createImageDoc(user.uid, {
      filename: meta.filename,
      storagePath: mainResult.storagePath,
      thumbStoragePath: thumbResult.storagePath,
      url: mainResult.url,
      thumbUrl: thumbResult.url,
      size: imgFile.size,
      width: meta.width || 0,
      height: meta.height || 0,
      hash,
      folderId: meta.folderId || null
    });
    imported++;
  }

  return { imported, skipped };
}

function guessType(filename) {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml" }[ext] || "image/jpeg";
}
