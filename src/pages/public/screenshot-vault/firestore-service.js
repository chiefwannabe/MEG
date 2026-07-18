import { db } from "../../../firebase.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, limit, startAfter, serverTimestamp, writeBatch
} from "firebase/firestore";

// Collections:
// - users/{uid}/images/{imageId} - screenshot metadata
// - users/{uid}/folders/{folderId} - folder metadata
const imagesCol = (uid) => collection(db, "users", uid, "images");
const foldersCol = (uid) => collection(db, "users", uid, "folders");

export const SORTS = {
  newest: { field: "uploadedAtMs", dir: "desc" },
  oldest: { field: "uploadedAtMs", dir: "asc" },
  name:   { field: "filenameLower", dir: "asc" },
  size:   { field: "size", dir: "desc" }
};

const PAGE_SIZE = 60;

// ==================== FOLDER OPERATIONS ====================

export async function createFolder(uid, name, parentId = null) {
  const ref = await addDoc(foldersCol(uid), {
    name,
    nameLower: name.toLowerCase(),
    parentId,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now()
  });
  return ref.id;
}

export async function updateFolder(uid, folderId, patch) {
  const patchWithLower = { ...patch };
  if (patch.name) patchWithLower.nameLower = patch.name.toLowerCase();
  await updateDoc(doc(db, "users", uid, "folders", folderId), patchWithLower);
}

export async function deleteFolder(uid, folderId) {
  // Move all images in this folder to root (folderId = null)
  const imagesInFolder = await getDocs(
    query(imagesCol(uid), where("folderId", "==", folderId), where("trashed", "==", false))
  );
  
  const batch = writeBatch(db);
  imagesInFolder.docs.forEach((doc) => {
    batch.update(doc.ref, { folderId: null });
  });
  
  // Delete the folder
  batch.delete(doc(db, "users", uid, "folders", folderId));
  await batch.commit();
}

export async function fetchAllFolders(uid) {
  const snap = await getDocs(query(foldersCol(uid), orderBy("nameLower", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getFolderImageCount(uid, folderId) {
  const q = query(
    imagesCol(uid),
    where("folderId", "==", folderId),
    where("trashed", "==", false)
  );
  const snap = await getDocs(q);
  return snap.size;
}

// ==================== IMAGE OPERATIONS ====================

export async function createImageDoc(uid, data) {
  const ref = await addDoc(imagesCol(uid), {
    filename: data.filename,
    filenameLower: data.filename.toLowerCase(),
    storagePath: data.storagePath,
    thumbStoragePath: data.thumbStoragePath,
    url: data.url,
    thumbUrl: data.thumbUrl,
    size: data.size,
    width: data.width || 0,
    height: data.height || 0,
    hash: data.hash,
    folderId: data.folderId || null,
    trashed: false,
    trashedAt: null,
    uploadedAtMs: Date.now(),
    uploadedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateImageDoc(uid, imageId, patch) {
  const patchWithLower = { ...patch };
  if (patch.filename) patchWithLower.filenameLower = patch.filename.toLowerCase();
  await updateDoc(doc(db, "users", uid, "images", imageId), patchWithLower);
}

export async function deleteImageDoc(uid, imageId) {
  await deleteDoc(doc(db, "users", uid, "images", imageId));
}

export async function getImageDoc(uid, imageId) {
  const snap = await getDoc(doc(db, "users", uid, "images", imageId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function findByHash(uid, hash) {
  const q = query(imagesCol(uid), where("hash", "==", hash), where("trashed", "==", false), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Fetches one page of images for infinite scroll.
 * @param {string} uid
 * @param {{ 
 *   sort: keyof SORTS, 
 *   searchPrefix: string, 
 *   cursor: any,
 *   folderId: string | null,
 *   view: 'all' | 'recent' | 'trash'
 * }} opts
 */
export async function fetchImagePage(uid, opts) {
  const { 
    sort = "newest", 
    searchPrefix = "", 
    cursor = null,
    folderId = null,
    view = "all"
  } = opts;
  
  const constraints = [];

  // View filtering
  if (view === "trash") {
    constraints.push(where("trashed", "==", true));
  } else {
    constraints.push(where("trashed", "==", false));
    
    // Folder filtering (only filter by folderId if a specific folderId is selected)
    if (folderId !== null && folderId !== undefined) {
      constraints.push(where("folderId", "==", folderId));
    }
    
    // Recent view: last 7 days
    if (view === "recent") {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      constraints.push(where("uploadedAtMs", ">=", sevenDaysAgo));
    }
  }

  // Search filtering
  const usingSearch = searchPrefix.trim().length > 0;
  const orderField = usingSearch ? "filenameLower" : SORTS[sort].field;
  const orderDir = usingSearch ? "asc" : SORTS[sort].dir;

  if (usingSearch) {
    const p = searchPrefix.trim().toLowerCase();
    constraints.push(where("filenameLower", ">=", p));
    constraints.push(where("filenameLower", "<=", p + "\uf8ff"));
  }

  constraints.push(orderBy(orderField, orderDir));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(PAGE_SIZE));

  const snap = await getDocs(query(imagesCol(uid), ...constraints));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
}

export async function fetchAllImages(uid) {
  const snap = await getDocs(
    query(imagesCol(uid), where("trashed", "==", false), orderBy("uploadedAtMs", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ==================== TRASH OPERATIONS ====================

export async function moveToTrash(uid, imageId) {
  await updateDoc(doc(db, "users", uid, "images", imageId), {
    trashed: true,
    trashedAt: serverTimestamp(),
    trashedAtMs: Date.now()
  });
}

export async function restoreFromTrash(uid, imageId) {
  await updateDoc(doc(db, "users", uid, "images", imageId), {
    trashed: false,
    trashedAt: null,
    trashedAtMs: null
  });
}

export async function emptyTrash(uid) {
  const trashedImages = await getDocs(
    query(imagesCol(uid), where("trashed", "==", true))
  );
  
  const batch = writeBatch(db);
  trashedImages.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  
  return trashedImages.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function moveImageToFolder(uid, imageId, folderId) {
  await updateDoc(doc(db, "users", uid, "images", imageId), {
    folderId: folderId || null
  });
}
