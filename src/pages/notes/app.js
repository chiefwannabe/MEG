/**
 * ZenPad — Distraction-Free Professional Notepad
 * Pure Vanilla JavaScript Application with Firebase Cloud Sync
 */

import { auth } from "../../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  getUserNotes,
  setUserNote,
  deleteUserNote
} from "../../firestore.js";

// --------------------------------------------------------------------------
// Constants & Initial State
// --------------------------------------------------------------------------
const STORAGE_KEY_NOTES = 'zenpad_notes_data';
const STORAGE_KEY_ACTIVE = 'zenpad_active_note_id';
const STORAGE_KEY_SETTINGS = 'zenpad_settings';

const ZEN_QUOTES = [
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Write what should not be forgotten.", author: "Isabel Allende" },
  { text: "Start writing, no matter what. The water does not flow until the faucet is turned on.", author: "Louis L'Amour" },
  { text: "Clutter is nothing more than postponed decisions.", author: "Barbara Hemphill" },
  { text: "Silence is a source of great strength.", author: "Lao Tzu" },
  { text: "Do one thing at a time, and while doing it put your whole soul into it.", author: "Swami Vivekananda" },
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
  { text: "Ideas are like fish. If you want to catch little fish, you can stay in the shallow water.", author: "David Lynch" }
];

const DEFAULT_WELCOME_NOTE = {
  id: 'welcome-note-1',
  title: 'Welcome to ZenPad',
  content: `Welcome to ZenPad — your clean, distraction-free Notepad app.

Key Features:
- ⚡ Instant Auto-Save: Everything you type is automatically saved to your browser's local storage.
- ☁️ Firebase Cloud Sync: Sign in to sync your notes across all your devices seamlessly.
- 🎨 Calm Themes: Toggle between Light and Dark mode anytime (Alt + T).
- 🔤 Typography Options: Choose Sans-Serif, Serif, Monospace, or Display fonts and adjust text size.
- 📊 Real-time Stats: Keep track of word count, character count, and estimated reading time.
- 📂 Multi-Note Management: Create, search, switch, and instant delete notes directly from the sidebar.
- 📥 Export as .txt: Click "Download .txt" or press Ctrl+S to save your note locally.
- 🧘 Focus Mode: Press Alt + F to hide all UI elements for distraction-free writing.

Shortcuts Quick Reference:
- Alt + N : Create New Note
- Alt + S : Toggle Sidebar
- Alt + F : Toggle Focus Mode
- Alt + T : Toggle Light / Dark Mode
- Ctrl + S : Download Note (.txt)
- Tab : Insert tab indent (2 spaces)

Start typing your thoughts here...`,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

let notes = [];
let activeNoteId = null;
let saveDebounceTimer = null;
let searchDebounceTimer = null;
let confirmDeleteTargetId = null;
let currentQuote = null;
let currentUser = null;

  let settings = {
    theme: 'light',
    fontFamily: 'sans',
    fontSize: 16,
    sidebarOpen: true
  };

  // --------------------------------------------------------------------------
  // DOM Elements
  // --------------------------------------------------------------------------
  const elements = {
    // Top Bar
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    saveStatusBadge: document.getElementById('save-status-badge'),
    saveStatusText: document.getElementById('save-status-text'),
    fontFamilySelect: document.getElementById('font-family-select'),
    btnFontDecrease: document.getElementById('btn-font-decrease'),
    btnFontIncrease: document.getElementById('btn-font-increase'),
    fontSizeDisplay: document.getElementById('font-size-display'),
    btnCopy: document.getElementById('btn-copy'),
    btnDownload: document.getElementById('btn-download'),
    btnFocusMode: document.getElementById('btn-focus-mode'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    btnHelp: document.getElementById('btn-help'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),

    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    btnNewNote: document.getElementById('btn-new-note'),
    searchNotesInput: document.getElementById('search-notes'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    notesList: document.getElementById('notes-list'),
    noNotesState: document.getElementById('no-notes-state'),
    notesCountBadge: document.getElementById('notes-count-badge'),
    storageUsedLabel: document.getElementById('storage-used'),
    btnClearAll: document.getElementById('btn-clear-all'),

    // Editor Area
    noteTitleInput: document.getElementById('note-title-input'),
    lastEditedTimeLabel: document.getElementById('last-edited-time'),
    btnDeleteNote: document.getElementById('btn-delete-note'),
    noteContentArea: document.getElementById('note-content-area'),
    btnExitFocus: document.getElementById('btn-exit-focus'),

    // Footer Stats
    statWords: document.getElementById('stat-words'),
    statChars: document.getElementById('stat-chars'),
    statCharsNoSpace: document.getElementById('stat-chars-nospace'),
    statLines: document.getElementById('stat-lines'),
    statReadTime: document.getElementById('stat-readtime'),

    // Anime Modal
    animeModal: document.getElementById('anime-modal'),

    // Quote Modal
    quoteModal: document.getElementById('quote-modal'),
    quoteText: document.getElementById('quote-text'),
    quoteAuthor: document.getElementById('quote-author'),
    btnCloseQuoteModal: document.getElementById('btn-close-quote-modal'),
    btnNextQuote: document.getElementById('btn-next-quote'),
    btnInsertQuote: document.getElementById('btn-insert-quote'),

    // Shortcuts & Confirm Modals & Toasts
    shortcutsModal: document.getElementById('shortcuts-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnModalOk: document.getElementById('btn-modal-ok'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmModalMsg: document.getElementById('confirm-modal-message'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    toastContainer: document.getElementById('toast-container')
  };

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  function init() {
    loadSettings();
    loadNotes();
    setupEventListeners();
    applySettings();
    renderNotesList();
    loadActiveNoteIntoEditor();
    updateStatistics();
    updateStorageUsage();
    setupAnimeButton();
    setupCoolSparkButton();
    setupAuthSync();
  }

  // --------------------------------------------------------------------------
  // Firebase Auth & Cloud Firestore Sync
  // --------------------------------------------------------------------------
  function setupAuthSync() {
    const btnAuthUser = document.getElementById('btn-auth-user');

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        if (btnAuthUser) {
          btnAuthUser.title = `Signed in as ${user.displayName || user.email || 'User'} (Cloud Synced)`;
          btnAuthUser.classList.add('synced');
        }
        setSaveStatus('cloud');
        await syncNotesWithCloud(user.uid);
      } else {
        if (btnAuthUser) {
          btnAuthUser.title = 'Sign In to sync notes across devices';
          btnAuthUser.classList.remove('synced');
        }
        setSaveStatus('saved');
      }
    });
  }

  async function syncNotesWithCloud(uid) {
    try {
      const cloudNotes = await getUserNotes(uid);
      if (cloudNotes && cloudNotes.length > 0) {
        // Merge local notes into cloud notes if local notes have items not in cloud
        const cloudIds = new Set(cloudNotes.map(n => n.id));
        for (const localNote of notes) {
          if (!cloudIds.has(localNote.id) && localNote.id !== 'welcome-note-1') {
            await setUserNote(uid, localNote.id, localNote);
            cloudNotes.push(localNote);
          }
        }
        notes = cloudNotes;
        notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      } else if (notes.length > 0) {
        // First time cloud sync: upload existing local notes to cloud
        for (const localNote of notes) {
          await setUserNote(uid, localNote.id, localNote);
        }
      }
      saveNotesToStorage();
      if (!notes.find(n => n.id === activeNoteId)) {
        activeNoteId = notes[0]?.id || null;
        localStorage.setItem(STORAGE_KEY_ACTIVE, activeNoteId);
      }
      renderNotesList();
      loadActiveNoteIntoEditor();
      updateStatistics();
      setSaveStatus('cloud');
      showToast('Notes synced with Cloud', 'success');
    } catch (err) {
      console.error('Failed to sync notes with cloud:', err);
      setSaveStatus('saved');
    }
  }

  // --------------------------------------------------------------------------
  // Cool Spark Quote Button Handlers
  // --------------------------------------------------------------------------
  function setupCoolSparkButton() {
    const coolBtn = document.getElementById("coolBtn");

    function renderRandomQuote() {
      const idx = Math.floor(Math.random() * ZEN_QUOTES.length);
      currentQuote = ZEN_QUOTES[idx];
      elements.quoteText.textContent = `"${currentQuote.text}"`;
      elements.quoteAuthor.textContent = `— ${currentQuote.author}`;
    }

    if (coolBtn) {
      coolBtn.addEventListener("click", () => {
        renderRandomQuote();
        openModal(elements.quoteModal);
      });
    }

    if (elements.btnNextQuote) {
      elements.btnNextQuote.addEventListener("click", renderRandomQuote);
    }

    if (elements.btnCloseQuoteModal) {
      elements.btnCloseQuoteModal.addEventListener("click", () => closeModal(elements.quoteModal));
    }

    if (elements.btnInsertQuote) {
      elements.btnInsertQuote.addEventListener("click", () => {
        if (!currentQuote) return;
        const textToInsert = `\n\n"${currentQuote.text}"\n— ${currentQuote.author}\n`;
        elements.noteContentArea.value += textToInsert;
        triggerAutoSave();
        updateStatistics();
        closeModal(elements.quoteModal);
        showToast('Quote inserted into note!', 'success');
      });
    }
  }

  // --------------------------------------------------------------------------
  // Anime Button & Image Click / Download Handlers
  // --------------------------------------------------------------------------
  function setupAnimeButton() {
    const animeBtn = document.getElementById("animeBtn");
    const animeImage = document.getElementById("animeImage");
    const btnDownloadAnime = document.getElementById("btn-download-anime");

    async function fetchNextWaifuImage() {
      try {
        const response = await fetch(
          "https://api.waifu.im/images?IncludedTags=waifu"
        );

        const data = await response.json();

        if (data && data.items && data.items.length > 0) {
          animeImage.src = data.items[0].url;
        }
      } catch (error) {
        console.error(error);
      }
    }

    if (animeBtn) {
      animeBtn.addEventListener("click", async () => {
        openModal(elements.animeModal);
        await fetchNextWaifuImage();
      });
    }

    // Clicking directly on the image acts as "Next" to load another image
    if (animeImage) {
      animeImage.addEventListener("click", async (e) => {
        e.stopPropagation();
        await fetchNextWaifuImage();
      });
    }

    // Download icon click handler
    if (btnDownloadAnime) {
      btnDownloadAnime.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (animeImage && animeImage.src) {
          await triggerImageDownload(animeImage.src);
        }
      });
    }

    // Clicking outside the image closes the modal
    if (elements.animeModal) {
      elements.animeModal.addEventListener("click", (e) => {
        if (e.target === elements.animeModal || e.target.classList.contains('anime-card-borderless')) {
          closeModal(elements.animeModal);
        }
      });
    }
  }

  async function triggerImageDownload(imageUrl) {
    showToast('Downloading image...', 'info');
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      const fileExt = imageUrl.split('.').pop().split('?')[0] || 'jpg';
      a.download = `anime-waifu-${Date.now()}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      showToast('Image downloaded!', 'success');
    } catch (err) {
      console.warn('Direct blob download failed, opening in new tab:', err);
      window.open(imageUrl, '_blank');
    }
  }

  // --------------------------------------------------------------------------
  // LocalStorage & State Handlers
  // --------------------------------------------------------------------------
  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        settings = Object.assign(settings, JSON.parse(saved));
      } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          settings.theme = 'dark';
        }
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }

  function loadNotes() {
    try {
      const savedNotes = localStorage.getItem(STORAGE_KEY_NOTES);
      if (savedNotes) {
        notes = JSON.parse(savedNotes);
      }
    } catch (e) {
      console.warn('Failed to load notes from localStorage:', e);
      notes = [];
    }

    if (!notes || notes.length === 0) {
      notes = [DEFAULT_WELCOME_NOTE];
      saveNotesToStorage();
    }

    activeNoteId = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (!activeNoteId || !notes.find(n => n.id === activeNoteId)) {
      activeNoteId = notes[0].id;
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeNoteId);
    }
  }

  function saveNotesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
      updateStorageUsage();
    } catch (e) {
      console.error('Failed to save notes to localStorage:', e);
      showToast('Storage limit reached or unavailable!', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Apply Preferences (Theme, Font, Size, Sidebar)
  // --------------------------------------------------------------------------
  function applySettings() {
    document.documentElement.setAttribute('data-theme', settings.theme);
    if (settings.theme === 'dark') {
      elements.sunIcon.classList.add('hidden');
      elements.moonIcon.classList.remove('hidden');
    } else {
      elements.sunIcon.classList.remove('hidden');
      elements.moonIcon.classList.add('hidden');
    }

    elements.fontFamilySelect.value = settings.fontFamily;
    elements.noteContentArea.className = `note-content-area font-${settings.fontFamily}`;

    elements.noteContentArea.style.fontSize = `${settings.fontSize}px`;
    elements.fontSizeDisplay.textContent = `${settings.fontSize}px`;

    if (!settings.sidebarOpen) {
      elements.sidebar.classList.add('collapsed');
      elements.sidebarBackdrop.classList.add('hidden');
    } else {
      elements.sidebar.classList.remove('collapsed');
    }
  }

  // --------------------------------------------------------------------------
  // Auto-Save & Debounce Editor Input
  // --------------------------------------------------------------------------
  function triggerAutoSave() {
    setSaveStatus('saving');

    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }

    saveDebounceTimer = setTimeout(() => {
      performSave();
    }, 300);
  }

  async function performSave() {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    const titleValue = elements.noteTitleInput.value.trim();
    const contentValue = elements.noteContentArea.value;

    activeNote.title = titleValue || 'Untitled Note';
    activeNote.content = contentValue;
    activeNote.updatedAt = Date.now();

    saveNotesToStorage();
    renderNotesList();
    updateLastEditedTime(activeNote.updatedAt);

    if (currentUser) {
      try {
        await setUserNote(currentUser.uid, activeNote.id, activeNote);
        setSaveStatus('cloud');
      } catch (err) {
        console.warn('Failed to sync note to cloud:', err);
        setSaveStatus('saved');
      }
    } else {
      setSaveStatus('saved');
    }
  }

  function setSaveStatus(status) {
    if (status === 'saving') {
      elements.saveStatusBadge.className = 'status-badge saving';
      elements.saveStatusText.textContent = 'Saving...';
    } else if (status === 'cloud') {
      elements.saveStatusBadge.className = 'status-badge saved cloud';
      elements.saveStatusText.textContent = 'Cloud Synced';
    } else {
      elements.saveStatusBadge.className = 'status-badge saved';
      elements.saveStatusText.textContent = currentUser ? 'Cloud Synced' : 'Saved (Local)';
    }
  }

  // --------------------------------------------------------------------------
  // Note Operations (Create, Select, Delete, Search)
  // --------------------------------------------------------------------------
  async function createNewNote() {
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    notes.unshift(newNote);
    activeNoteId = newNote.id;
    localStorage.setItem(STORAGE_KEY_ACTIVE, activeNoteId);

    saveNotesToStorage();
    renderNotesList();
    loadActiveNoteIntoEditor();
    updateStatistics();

    if (currentUser) {
      try {
        await setUserNote(currentUser.uid, newNote.id, newNote);
        setSaveStatus('cloud');
      } catch (err) {
        console.warn('Failed to push new note to cloud:', err);
      }
    }

    elements.noteTitleInput.focus();
    elements.noteTitleInput.select();

    showToast('New note created', 'info');

    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  function selectNote(id) {
    if (activeNoteId === id) return;

    performSave();

    activeNoteId = id;
    localStorage.setItem(STORAGE_KEY_ACTIVE, activeNoteId);

    renderNotesList();
    loadActiveNoteIntoEditor();
    updateStatistics();

    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  function promptDeleteCurrentNote() {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    confirmDeleteTargetId = activeNote.id;
    elements.confirmModalMsg.textContent = `Are you sure you want to delete "${activeNote.title || 'Untitled Note'}"?`;
    openModal(elements.confirmModal);
  }

  async function deleteSpecificNoteInstant(id, e) {
    if (e) e.stopPropagation();

    const targetId = id;
    notes = notes.filter(n => n.id !== targetId);

    if (notes.length === 0) {
      const emptyNote = {
        id: 'note_' + Date.now(),
        title: 'Untitled Note',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      notes.push(emptyNote);
      activeNoteId = emptyNote.id;
      if (currentUser) setUserNote(currentUser.uid, emptyNote.id, emptyNote);
    } else if (activeNoteId === targetId) {
      activeNoteId = notes[0].id;
    }

    localStorage.setItem(STORAGE_KEY_ACTIVE, activeNoteId);
    saveNotesToStorage();
    renderNotesList();
    loadActiveNoteIntoEditor();
    updateStatistics();

    if (currentUser) {
      try {
        await deleteUserNote(currentUser.uid, targetId);
      } catch (err) {
        console.warn('Failed to delete note from cloud:', err);
      }
    }

    showToast('Note deleted', 'info');
  }

  async function executeDeleteNote() {
    if (!confirmDeleteTargetId) return;

    const targetId = confirmDeleteTargetId;
    notes = notes.filter(n => n.id !== targetId);

    if (notes.length === 0) {
      const emptyNote = {
        id: 'note_' + Date.now(),
        title: 'Untitled Note',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      notes.push(emptyNote);
      activeNoteId = emptyNote.id;
      if (currentUser) setUserNote(currentUser.uid, emptyNote.id, emptyNote);
    } else if (activeNoteId === targetId) {
      activeNoteId = notes[0].id;
    }

    localStorage.setItem(STORAGE_KEY_ACTIVE, activeNoteId);
    saveNotesToStorage();
    renderNotesList();
    loadActiveNoteIntoEditor();
    updateStatistics();
    closeModal(elements.confirmModal);

    if (currentUser) {
      try {
        await deleteUserNote(currentUser.uid, targetId);
      } catch (err) {
        console.warn('Failed to delete note from cloud:', err);
      }
    }

    showToast('Note deleted', 'info');
    confirmDeleteTargetId = null;
  }

  function promptClearAllNotes() {
    confirmDeleteTargetId = 'ALL';
    elements.confirmModalMsg.textContent = 'Are you sure you want to delete ALL notes? This cannot be undone.';
    openModal(elements.confirmModal);
  }

  async function executeClearAllNotes() {
    const oldNotes = [...notes];
    notes = [];
    const freshNote = {
      id: 'note_' + Date.now(),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    notes.push(freshNote);
    activeNoteId = freshNote.id;

    localStorage.setItem(STORAGE_KEY_ACTIVE, activeNoteId);
    saveNotesToStorage();
    renderNotesList();
    loadActiveNoteIntoEditor();
    updateStatistics();
    closeModal(elements.confirmModal);

    if (currentUser) {
      try {
        await setUserNote(currentUser.uid, freshNote.id, freshNote);
        for (const old of oldNotes) {
          await deleteUserNote(currentUser.uid, old.id).catch(() => {});
        }
      } catch (err) {
        console.warn('Failed to clear notes in cloud:', err);
      }
    }

    showToast('All notes cleared', 'info');
    confirmDeleteTargetId = null;
  }

  // --------------------------------------------------------------------------
  // UI Rendering & Editor Updating
  // --------------------------------------------------------------------------
  function loadActiveNoteIntoEditor() {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    elements.noteTitleInput.value = activeNote.title || '';
    elements.noteContentArea.value = activeNote.content || '';
    updateLastEditedTime(activeNote.updatedAt);
    setSaveStatus('saved');
  }

  function renderNotesList() {
    const query = elements.searchNotesInput.value.trim().toLowerCase();
    elements.notesList.innerHTML = '';

    const filteredNotes = notes.filter(n => {
      return (
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
      );
    });

    elements.notesCountBadge.textContent = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;

    if (filteredNotes.length === 0) {
      elements.noNotesState.classList.remove('hidden');
      return;
    } else {
      elements.noNotesState.classList.add('hidden');
    }

    filteredNotes.forEach(note => {
      const li = document.createElement('li');
      li.className = `note-item ${note.id === activeNoteId ? 'active' : ''}`;
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      const titleText = note.title || 'Untitled Note';
      const previewText = note.content.trim().substring(0, 60).replace(/\n/g, ' ') || 'No additional text';
      const formattedDate = formatDateShort(note.updatedAt);

      li.innerHTML = `
        <div class="note-item-top">
          <div class="note-item-title">${escapeHTML(titleText)}</div>
          <button class="btn-delete-item" title="Delete note immediately" aria-label="Delete note">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
        <div class="note-item-preview">${escapeHTML(previewText)}</div>
        <div class="note-item-meta">
          <span>${formattedDate}</span>
        </div>
      `;

      li.addEventListener('click', () => selectNote(note.id));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectNote(note.id);
        }
      });

      const deleteBtn = li.querySelector('.btn-delete-item');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSpecificNoteInstant(note.id, e);
      });

      elements.notesList.appendChild(li);
    });
  }

  // --------------------------------------------------------------------------
  // Live Word & Character Counter
  // --------------------------------------------------------------------------
  function updateStatistics() {
    const text = elements.noteContentArea.value;

    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const charsTotal = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const lines = text === '' ? 1 : text.split('\n').length;
    const readMinutes = Math.ceil(words / 200);
    const readTimeText = words === 0 ? '0 min' : (readMinutes < 1 ? '< 1 min' : `${readMinutes} min`);

    elements.statWords.textContent = words.toLocaleString();
    elements.statChars.textContent = charsTotal.toLocaleString();
    elements.statCharsNoSpace.textContent = `(${charsNoSpace.toLocaleString()} w/o spaces)`;
    elements.statLines.textContent = lines.toLocaleString();
    elements.statReadTime.textContent = readTimeText;
  }

  function updateStorageUsage() {
    try {
      const dataStr = JSON.stringify(notes);
      const bytes = new Blob([dataStr]).size;
      const kb = (bytes / 1024).toFixed(1);
      elements.storageUsedLabel.textContent = `${kb} KB`;
    } catch (e) {
      elements.storageUsedLabel.textContent = '0 KB';
    }
  }

  // --------------------------------------------------------------------------
  // Action Toolbar Handlers
  // --------------------------------------------------------------------------
  function downloadCurrentNote() {
    performSave();
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    const rawTitle = activeNote.title.trim() || 'Untitled Note';
    const cleanFileName = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_') + '.txt';

    const blob = new Blob([activeNote.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Downloaded as ${cleanFileName}`, 'success');
  }

  function copyNoteToClipboard() {
    const text = elements.noteContentArea.value;
    if (!text) {
      showToast('Note is empty!', 'warning');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Copied text to clipboard!', 'success'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    elements.noteContentArea.select();
    try {
      document.execCommand('copy');
      showToast('Copied text to clipboard!', 'success');
    } catch (e) {
      showToast('Failed to copy text', 'error');
    }
  }

  function toggleTheme() {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
    applySettings();
    saveSettings();
    showToast(`Switched to ${settings.theme} mode`, 'info');
  }

  function changeFontFamily(family) {
    settings.fontFamily = family;
    applySettings();
    saveSettings();
  }

  function changeFontSize(delta) {
    let newSize = settings.fontSize + delta;
    if (newSize < 12) newSize = 12;
    if (newSize > 32) newSize = 32;

    settings.fontSize = newSize;
    applySettings();
    saveSettings();
  }

  function toggleFocusMode() {
    document.body.classList.toggle('focus-mode');
    const isFocus = document.body.classList.contains('focus-mode');

    if (isFocus) {
      elements.btnExitFocus.classList.remove('hidden');
      showToast('Focus Mode activated (Esc to exit)', 'info');
    } else {
      elements.btnExitFocus.classList.add('hidden');
    }
  }

  function exitFocusMode() {
    document.body.classList.remove('focus-mode');
    elements.btnExitFocus.classList.add('hidden');
  }

  function toggleSidebar() {
    settings.sidebarOpen = !settings.sidebarOpen;
    elements.sidebar.classList.toggle('collapsed', !settings.sidebarOpen);

    if (window.innerWidth <= 768) {
      elements.sidebarBackdrop.classList.toggle('hidden', !settings.sidebarOpen);
    }

    saveSettings();
  }

  function closeSidebar() {
    settings.sidebarOpen = false;
    elements.sidebar.classList.add('collapsed');
    elements.sidebarBackdrop.classList.add('hidden');
    saveSettings();
  }

  // --------------------------------------------------------------------------
  // Tab Key Handling in Textarea
  // --------------------------------------------------------------------------
  function handleTextareaTabKey(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = elements.noteContentArea;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const tabSpaces = '  ';
      textarea.value = value.substring(0, start) + tabSpaces + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + tabSpaces.length;

      triggerAutoSave();
      updateStatistics();
    }
  }

  // --------------------------------------------------------------------------
  // Event Listeners Setup
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    elements.noteTitleInput.addEventListener('input', () => {
      triggerAutoSave();
    });

    elements.noteContentArea.addEventListener('input', () => {
      triggerAutoSave();
      updateStatistics();
    });

    elements.noteContentArea.addEventListener('keydown', handleTextareaTabKey);

    elements.btnToggleSidebar.addEventListener('click', toggleSidebar);
    elements.sidebarBackdrop.addEventListener('click', closeSidebar);
    elements.btnThemeToggle.addEventListener('click', toggleTheme);
    elements.btnFocusMode.addEventListener('click', toggleFocusMode);
    elements.btnExitFocus.addEventListener('click', exitFocusMode);
    elements.btnDownload.addEventListener('click', downloadCurrentNote);
    elements.btnCopy.addEventListener('click', copyNoteToClipboard);

    elements.fontFamilySelect.addEventListener('change', (e) => changeFontFamily(e.target.value));
    elements.btnFontDecrease.addEventListener('click', () => changeFontSize(-2));
    elements.btnFontIncrease.addEventListener('click', () => changeFontSize(2));

    elements.btnNewNote.addEventListener('click', createNewNote);
    elements.btnDeleteNote.addEventListener('click', promptDeleteCurrentNote);
    elements.btnClearAll.addEventListener('click', promptClearAllNotes);

    elements.searchNotesInput.addEventListener('input', (e) => {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      const query = e.target.value;
      elements.btnClearSearch.classList.toggle('hidden', query.length === 0);
      searchDebounceTimer = setTimeout(() => {
        renderNotesList();
      }, 150);
    });

    elements.btnClearSearch.addEventListener('click', () => {
      elements.searchNotesInput.value = '';
      elements.btnClearSearch.classList.add('hidden');
      renderNotesList();
    });

    elements.btnHelp.addEventListener('click', () => openModal(elements.shortcutsModal));
    elements.btnCloseModal.addEventListener('click', () => closeModal(elements.shortcutsModal));
    elements.btnModalOk.addEventListener('click', () => closeModal(elements.shortcutsModal));

    elements.btnConfirmCancel.addEventListener('click', () => closeModal(elements.confirmModal));
    elements.btnConfirmDelete.addEventListener('click', () => {
      if (confirmDeleteTargetId === 'ALL') {
        executeClearAllNotes();
      } else {
        executeDeleteNote();
      }
    });

    window.addEventListener('keydown', handleGlobalShortcuts);

    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768 && settings.sidebarOpen) {
        closeSidebar();
      }
    });
  }

  function handleGlobalShortcuts(e) {
    if (e.key === 'Escape') {
      if (document.body.classList.contains('focus-mode')) {
        exitFocusMode();
      }
      closeModal(elements.shortcutsModal);
      closeModal(elements.confirmModal);
      closeModal(elements.animeModal);
      closeModal(elements.quoteModal);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        downloadCurrentNote();
      } else if (e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyNoteToClipboard();
      }
    }

    if (e.altKey) {
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewNote();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusMode();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      }
    }

    if (e.key === '?' && document.activeElement !== elements.noteContentArea && document.activeElement !== elements.noteTitleInput && document.activeElement !== elements.searchNotesInput) {
      e.preventDefault();
      openModal(elements.shortcutsModal);
    }
  }

  // --------------------------------------------------------------------------
  // Modals & Toast Utilities
  // --------------------------------------------------------------------------
  function openModal(modalEl) {
    modalEl.classList.remove('hidden');
    modalEl.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalEl) {
    modalEl.classList.add('hidden');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  function showToast(message, type = 'info', duration = 2800) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${escapeHTML(message)}</span>`;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
    }, duration);
  }

  // --------------------------------------------------------------------------
  // Helper Functions
  // --------------------------------------------------------------------------
  function updateLastEditedTime(timestamp) {
    if (!timestamp) {
      elements.lastEditedTimeLabel.textContent = 'Edited just now';
      return;
    }
    elements.lastEditedTimeLabel.textContent = `Edited ${formatRelativeTime(timestamp)}`;
  }

  function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    return formatDateShort(timestamp);
  }

  function formatDateShort(timestamp) {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
