import { currentUser } from "./auth.js";
import { 
  fetchImagePage, 
  updateImageDoc, 
  moveToTrash,
  restoreFromTrash,
  deleteImageDoc 
} from "./firestore-service.js";
import { deleteFromStorage } from "./storage-service.js";
import { formatBytes, escapeHtml, debounce } from "./utils.js";
import { showToast } from "./toast.js";
import { setOnNewImage } from "./upload.js";
import { openViewer } from "./viewer.js";

const grid = document.getElementById("galleryGrid");
const sentinel = document.getElementById("sentinel");
const emptyState = document.getElementById("emptyState");

/** In-memory record of every loaded image, keyed by id */
const store = new Map();
let order = []; // ordered ids as currently displayed
let cursor = null;
let hasMore = true;
let loading = false;
let state = { 
  sort: "newest", 
  search: "",
  view: "all", // 'all', 'recent', 'trash'
  folderId: null 
};

// Lazy loading with intersection observer
const visibilityObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const img = entry.target;
    if (entry.isIntersecting) {
      if (img.dataset.src && img.src !== img.dataset.src) img.src = img.dataset.src;
    } else if (img.dataset.src) {
      img.removeAttribute("src");
    }
  }
}, { rootMargin: "1200px 0px" });

function cardHtml(image) {
  const dims = image.width && image.height ? `${image.width}×${image.height}` : "";
  const meta = [formatBytes(image.size), dims].filter(Boolean).join(" · ");
  return `
    <img data-src="${image.thumbUrl || image.url}" alt="${escapeHtml(image.filename)}" loading="lazy" width="${image.width || 400}" height="${image.height || 300}">
    <div class="card__overlay">
      <span class="card__name">${escapeHtml(image.filename)}</span>
      <span class="card__meta">${meta}</span>
    </div>
  `;
}

function buildCard(image) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = image.id;
  card.setAttribute("role", "listitem");
  card.tabIndex = 0;
  card.setAttribute("aria-label", `${image.filename}, open viewer`);
  card.innerHTML = cardHtml(image);

  card.addEventListener("click", () => openViewer(image.id));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openViewer(image.id);
    }
  });

  const imgEl = card.querySelector("img");
  if (imgEl) visibilityObserver.observe(imgEl);
  return card;
}

function renderEmptyIfNeeded() {
  const empty = order.length === 0;
  if (emptyState) emptyState.hidden = !empty;
  if (grid) grid.hidden = empty;
  
  // Update empty state message based on view
  if (empty && emptyState) {
    const h2 = emptyState.querySelector("h2");
    const p = emptyState.querySelector("p");
    
    if (h2 && p) {
      if (state.view === "trash") {
        h2.textContent = "Trash is empty";
        p.textContent = "Deleted screenshots will appear here.";
      } else if (state.view === "recent") {
        h2.textContent = "No recent screenshots";
        p.textContent = "Screenshots from the last 7 days will appear here.";
      } else if (state.folderId) {
        h2.textContent = "Folder is empty";
        p.textContent = "Upload screenshots to this folder.";
      } else {
        h2.textContent = "No screenshots yet";
        p.textContent = "Upload your first screenshot to get started.";
      }
    }
  }
}

async function loadNextPage() {
  const user = currentUser();
  if (!user || loading || !hasMore) return;
  loading = true;

  try {
    const { items, nextCursor } = await fetchImagePage(user.uid, {
      sort: state.sort,
      searchPrefix: state.search,
      cursor,
      folderId: state.folderId,
      view: state.view
    });

    cursor = nextCursor;
    hasMore = Boolean(nextCursor);

    const frag = document.createDocumentFragment();
    for (const image of items) {
      if (store.has(image.id)) continue;
      store.set(image.id, image);
      order.push(image.id);
      frag.appendChild(buildCard(image));
    }
    if (grid) grid.appendChild(frag);
    renderEmptyIfNeeded();
  } catch (err) {
    console.error("Error loading gallery page:", err);
  } finally {
    loading = false;
  }
}

async function resetAndLoad() {
  if (grid) grid.innerHTML = "";
  store.clear();
  order = [];
  cursor = null;
  hasMore = true;
  await loadNextPage();
}

if (sentinel) {
  const pageObserver = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) loadNextPage();
  }, { rootMargin: "800px 0px" });
  pageObserver.observe(sentinel);
}

export function setSort(sort) {
  state.sort = sort;
  resetAndLoad();
}

export const setSearch = debounce((v) => {
  state.search = v;
  resetAndLoad();
}, 250);

export function setView(view, folderId = null) {
  state.view = view;
  state.folderId = folderId;
  resetAndLoad();
}

export function initGallery(opts = {}) {
  state.view = opts.view || "all";
  state.folderId = opts.folderId || null;
  resetAndLoad();
  setOnNewImage(prependImage);
}

function prependImage(image) {
  // Only prepend if it matches current view/folder
  if (state.view === "trash" && !image.trashed) return;
  if (state.view !== "trash" && image.trashed) return;
  if (state.folderId !== null && image.folderId !== state.folderId) return;
  
  if (store.has(image.id)) return;
  store.set(image.id, image);
  order.unshift(image.id);
  if (grid) grid.prepend(buildCard(image));
  renderEmptyIfNeeded();
}

export function getImage(id) {
  return store.get(id);
}

export function getOrder() {
  return order;
}

function cardEl(id) {
  if (!grid) return null;
  return grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
}

export function renameImageInGrid(id, filename) {
  const image = store.get(id);
  if (!image) return;
  image.filename = filename;
  const el = cardEl(id);
  if (el) {
    const nameEl = el.querySelector(".card__name");
    const imgEl = el.querySelector("img");
    if (nameEl) nameEl.textContent = filename;
    if (imgEl) imgEl.alt = filename;
  }
}

export function moveImageInGrid(id, folderId) {
  const image = store.get(id);
  if (!image) return;
  image.folderId = folderId;
  
  // Remove from grid if it no longer matches current folder filter
  if (state.folderId !== null && folderId !== state.folderId) {
    store.delete(id);
    order = order.filter((x) => x !== id);
    cardEl(id)?.remove();
    renderEmptyIfNeeded();
  }
}

export async function removeImage(id, permanent = false) {
  const image = store.get(id);
  if (!image) return;
  
  store.delete(id);
  order = order.filter((x) => x !== id);
  cardEl(id)?.remove();
  renderEmptyIfNeeded();

  try {
    if (permanent) {
      // Permanent delete from trash
      await deleteImageDoc(currentUser().uid, id);
      await deleteFromStorage([image.storagePath, image.thumbStoragePath]);
    } else {
      // Move to trash
      await moveToTrash(currentUser().uid, id);
    }
  } catch (err) {
    console.error(err);
    showToast("Delete failed");
  }
}

export function restoreImage(image) {
  // Re-insert image
  prependImage(image);
}

export async function restoreFromTrashAction(id) {
  const image = store.get(id);
  if (!image) return;
  
  try {
    await restoreFromTrash(currentUser().uid, id);
    
    // Remove from trash view
    if (state.view === "trash") {
      store.delete(id);
      order = order.filter((x) => x !== id);
      cardEl(id)?.remove();
      renderEmptyIfNeeded();
    }
    
    showToast("Screenshot restored");
  } catch (err) {
    console.error(err);
    showToast("Restore failed");
  }
}
