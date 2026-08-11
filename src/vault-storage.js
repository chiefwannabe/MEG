import { db, storage } from "./firebase.js";
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, writeBatch } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

const typeOf = (file) => file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "document";
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

function audit(batch, uid, action, target, before, after) {
  batch.set(doc(collection(db, "auditLogs")), { actorUid: uid, action, target, before, after, createdAt: serverTimestamp() });
}

export async function listVaultFiles({ includeTrashed = false } = {}) {
  const files = collection(db, "vaultFiles");
  const snapshot = await getDocs(query(files, where("deleted", "==", includeTrashed)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function uploadVaultFile(file, { folderId = "", visibility = "private", uid, onProgress } = {}) {
  if (!file || !uid) throw new Error("A file and authenticated admin are required.");
  const fileRef = doc(collection(db, "vaultFiles"));
  const path = `${visibility === "public" ? "media/public" : "vault"}/${fileRef.id}/${safeName(file.name)}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type || "application/octet-stream" });
  return new Promise((resolve, reject) => task.on("state_changed", (snapshot) => onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes), reject, async () => {
    try {
      const batch = writeBatch(db);
      const metadata = { name: file.name, storagePath: path, folderId, mimeType: file.type || "application/octet-stream", mediaType: typeOf(file), size: file.size, visibility, status: "active", deleted: false, downloadCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: uid, updatedBy: uid };
      batch.set(fileRef, metadata);
      audit(batch, uid, "vaultFile.upload", { type: "vaultFile", id: fileRef.id }, {}, { name: file.name, storagePath: path, folderId, status: "active" });
      await batch.commit();
      resolve({ id: fileRef.id, ...metadata, url: await getDownloadURL(ref(storage, path)) });
    } catch (error) {
      await deleteObject(ref(storage, path)).catch(() => {});
      reject(error);
    }
  }));
}

export async function trashVaultFile(id, uid) {
  const fileRef = doc(db, "vaultFiles", id); const previous = await getDoc(fileRef);
  if (!previous.exists()) throw new Error("File no longer exists.");
  const batch = writeBatch(db); const data = previous.data();
  batch.update(fileRef, { deleted: true, status: "trashed", updatedAt: serverTimestamp(), updatedBy: uid });
  audit(batch, uid, "vaultFile.trash", { type: "vaultFile", id }, { name: data.name, status: data.status }, { name: data.name, status: "trashed" });
  await batch.commit();
}

export async function restoreVaultFile(id, uid) {
  const fileRef = doc(db, "vaultFiles", id); const previous = await getDoc(fileRef);
  if (!previous.exists()) throw new Error("File no longer exists.");
  const batch = writeBatch(db); const data = previous.data();
  batch.update(fileRef, { deleted: false, status: "active", updatedAt: serverTimestamp(), updatedBy: uid });
  audit(batch, uid, "vaultFile.restore", { type: "vaultFile", id }, { name: data.name, status: data.status }, { name: data.name, status: "active" });
  await batch.commit();
}
