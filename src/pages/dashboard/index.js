import { auth } from "../../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "../../firestore.js";

// ==========================================================================
// 1. HELPERS
// ==========================================================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function svgUse(iconId) {
  return `<svg class="icon" aria-hidden="true"><use href="#${iconId}"></use></svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==========================================================================
// 2. THEME TOGGLE & SETTINGS SYNC
// ==========================================================================
function initTheme() {
  const root = document.documentElement;
  const toggle = $('#theme-toggle');
  const settingsDarkModeToggle = $('#setting-dark-mode');
  const stored = localStorage.getItem('dashboard-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');

  function applyTheme(mode) {
    const isDark = mode === 'dark';
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    if (settingsDarkModeToggle) {
      settingsDarkModeToggle.checked = isDark;
    }
  }

  applyTheme(initial);

  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('dashboard-theme', next);
  });

  if (settingsDarkModeToggle) {
    settingsDarkModeToggle.addEventListener('change', (e) => {
      const next = e.target.checked ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem('dashboard-theme', next);
    });
  }
}

// ==========================================================================
// 3. WELCOME HEADER & PROFILE SYNC
// ==========================================================================
let currentUsername = '';

function updateProfileUI(username, photoURL) {
  if (username) currentUsername = username;
  const now = new Date();
  const hour = now.getHours();
  const nameStr = currentUsername ? `, ${currentUsername}` : '';
  const greeting = hour < 5 ? `Working late${nameStr}`
    : hour < 12 ? `Good morning${nameStr}`
    : hour < 17 ? `Good afternoon${nameStr}`
    : hour < 21 ? `Good evening${nameStr}`
    : `Working late${nameStr}`;

  const headingEl = $('#welcome-heading');
  const dateEl = $('#welcome-date');
  if (headingEl) headingEl.textContent = greeting;
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }

  const profileChip = $('.profile-chip');
  if (profileChip) {
    if (currentUsername) profileChip.setAttribute('aria-label', `Profile: ${currentUsername}`);
    const avatarEl = profileChip.querySelector('.avatar');
    if (avatarEl) {
      if (photoURL) {
        avatarEl.innerHTML = `<img src="${photoURL}" alt="${escapeHtml(currentUsername)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        const initials = currentUsername
          ? (currentUsername.length >= 2 ? currentUsername.slice(0, 2).toUpperCase() : currentUsername.toUpperCase())
          : 'U';
        avatarEl.textContent = initials;
      }
    }
  }
}

function initWelcome() {
  updateProfileUI(currentUsername);
}

function initAuthSync() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
      let username = user.displayName || (user.email ? user.email.split('@')[0] : '');
      let photoURL = user.photoURL || '';

      const profile = await getUserProfile(user.uid);
      if (profile) {
        if (profile.username) username = profile.username;
        else if (profile.displayName) username = profile.displayName;
        if (profile.photoURL) photoURL = profile.photoURL;
      }

      if (username) {
        updateProfileUI(username, photoURL);
      }
    } catch (err) {
      console.error('[Dashboard] Error syncing user profile:', err);
    }
  });
}

// ==========================================================================
// 4. STORAGE VIEW RENDERING
// ==========================================================================
const STORAGE_ITEMS = [];

function renderStorage() {
  const storageHtml = STORAGE_ITEMS.length
    ? STORAGE_ITEMS.map(p => `
        <article class="project-item">
          <div class="project-item__icon">${svgUse('icon-storage')}</div>
          <div class="project-item__body">
            <p class="project-item__title">${escapeHtml(p.name)}</p>
            <p class="project-item__meta">${escapeHtml(p.category)} · Updated ${p.updated}</p>
          </div>
          <span class="badge ${p.tagClass}">${escapeHtml(p.status)}</span>
        </article>
      `).join('')
    : `<p class="empty-state">No storage items available.</p>`;

  const allContainer = $('#all-storage-list');
  if (allContainer) allContainer.innerHTML = storageHtml;
}

// ==========================================================================
// 5. GLOBAL SEARCH & TAB VIEW ROUTING
// ==========================================================================
const SEARCH_INDEX = [
  { label: 'Home', icon: 'icon-home', group: 'Navigation', view: 'view-home' },
  { label: 'Storage', icon: 'icon-storage', group: 'Navigation', view: 'view-storage' },
  { label: 'Settings', icon: 'icon-settings', group: 'Navigation', view: 'view-settings' }
];

function highlight(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return (
    escapeHtml(text.slice(0, idx)) +
    '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>' +
    escapeHtml(text.slice(idx + query.length))
  );
}

function switchView(viewId) {
  const views = $$('.dashboard-view');
  views.forEach(v => {
    v.hidden = v.id !== viewId;
  });

  const links = $$('.sidebar__link');
  links.forEach(l => {
    const isTarget = l.getAttribute('data-target-view') === viewId;
    l.classList.toggle('is-active', isTarget);
  });
}

function initSearch() {
  const input = $('#global-search');
  const results = $('#search-results');
  if (!input || !results) return;

  function closeResults() { results.hidden = true; results.innerHTML = ''; }

  function renderResults(query) {
    const matches = SEARCH_INDEX.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
    if (!matches.length) {
      results.innerHTML = `<p class="search-results__empty">No results for "${escapeHtml(query)}"</p>`;
      results.hidden = false;
      return;
    }
    const groups = [...new Set(matches.map(m => m.group))];
    results.innerHTML = groups.map(group => `
      <p class="search-results__group-label">${escapeHtml(group)}</p>
      ${matches.filter(m => m.group === group).map(m => `
        <button type="button" class="search-results__item" data-view="${m.view}">
          ${svgUse(m.icon)}
          <span>${highlight(m.label, query)}</span>
        </button>
      `).join('')}
    `).join('');
    results.hidden = false;
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    q ? renderResults(q) : closeResults();
  });

  results.addEventListener('click', e => {
    const btn = e.target.closest('.search-results__item');
    if (btn && btn.dataset.view) {
      switchView(btn.dataset.view);
      closeResults();
      input.value = '';
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { input.blur(); closeResults(); }
  });

  document.addEventListener('click', e => {
    if (!results.contains(e.target) && e.target !== input) closeResults();
  });

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
      e.preventDefault();
      input.focus();
    }
  });
}

function initSidebar() {
  $$('.sidebar__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-target-view');
      if (targetView) switchView(targetView);
    });
  });
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initWelcome();
  initAuthSync();
  renderStorage();
  initSearch();
  initSidebar();
});
