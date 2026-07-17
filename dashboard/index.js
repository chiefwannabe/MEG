/* =========================================================
   MEGOL — IGNOU Study Hub — Account Center Behaviour
   Integrated with Firebase Authentication and Firestore.
   ========================================================= */

import { app } from "../src/firebase.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { 
  createUserDocument, 
  getUserProfile, 
  updateUserProfile, 
  getPublishedResources, 
  toggleBookmark, 
  logDownload, 
  updateUserSettings 
} from "../src/firestore.js";

const auth = getAuth(app);

// Global State
let currentUser = null;
let currentProfile = null;
let cachedResources = [];

(async function () {
  "use strict";

  // DOM Elements
  const searchInput = document.getElementById("globalSearch");
  const adminSidebarLink = document.getElementById("adminSidebarLink");
  const adminDropdownLink = document.getElementById("adminDropdownLink");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const fieldName = document.getElementById("fieldName");
  const fieldUsername = document.getElementById("fieldUsername");
  const fieldEnrolment = document.getElementById("fieldEnrolment");
  const fieldProgramme = document.getElementById("fieldProgramme");
  const settingsNotif = document.getElementById("settingsNotif");
  const settingsDarkMode = document.getElementById("settingsDarkMode");
  const copyrightYear = document.getElementById("copyrightYear");

  if (copyrightYear) {
    copyrightYear.textContent = new Date().getFullYear();
  }

  // Protect dashboard page: listen to auth state changes
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.info("[Auth] No authenticated user found, redirecting to home...");
      window.location.replace("../index.html");
      return;
    }

    currentUser = user;

    try {
      // Ensure user profile exists in Firestore (creates with default fields if missing)
      await createUserDocument(user);

      // Load user profile from Firestore
      await refreshUserProfile();

      // Load and cache all resources
      await initializeResources();

      // Render Bookmarks & Downloads
      renderBookmarks();
      renderDownloads();

    } catch (error) {
      console.error("[Dashboard] Error initializing user data:", error);
    }
  });

  // Fetch or refresh the user profile document
  async function refreshUserProfile() {
    if (!currentUser) return;
    const profile = await getUserProfile(currentUser.uid);
    currentProfile = profile || {
      displayName: currentUser.displayName || "User",
      username: currentUser.email ? currentUser.email.split("@")[0] : "",
      photoURL: currentUser.photoURL || "",
      enrolment: "",
      programme: "",
      role: "student",
      bookmarks: [],
      downloads: [],
      settings: {}
    };

    updateUIWithProfile();
  }

  // Populate UI elements with profile data
  function updateUIWithProfile() {
    const displayName = currentProfile.displayName || currentUser.displayName || "User";
    const username = currentProfile.username || (currentUser.email ? currentUser.email.split("@")[0] : "");
    
    // Apply dynamic text mappings
    applyDynamicText("displayName", displayName);
    applyDynamicText("userUsername", username ? `@${username}` : "");
    applyDynamicText("unreadCount", currentProfile.unreadCount || 0);

    const greetingWord = getGreetingWord();
    applyDynamicText("greetingTime", greetingWord);

    const greetingHeading = document.getElementById("greetingHeading");
    if (greetingHeading) {
      greetingHeading.innerHTML = `${greetingWord}, <span data-dynamic="displayName">${displayName}</span> <span aria-hidden="true">👋</span>`;
    }

    // Set avatar images
    const fallbackAvatar = "/assets/images/default-avatar.svg";
    const avatarSrc = currentProfile.photoURL || currentUser.photoURL || fallbackAvatar;
    document.querySelectorAll(".avatar, .profile-avatar").forEach((img) => {
      img.src = avatarSrc;
    });

    // Populate My Profile fields
    if (fieldName) fieldName.value = displayName;
    if (fieldUsername) fieldUsername.value = username;
    if (fieldEnrolment) fieldEnrolment.value = currentProfile.enrolment || "";
    if (fieldProgramme) fieldProgramme.value = currentProfile.programme || "";

    // Show/hide admin panel links
    const showAdmin = currentProfile.role === "admin";
    if (adminSidebarLink) adminSidebarLink.style.display = showAdmin ? "block" : "none";
    if (adminDropdownLink) adminDropdownLink.style.display = showAdmin ? "block" : "none";

    // Set settings switches
    const settings = currentProfile.settings || {};
    if (settingsNotif) settingsNotif.checked = settings.notifications !== false;
    if (settingsDarkMode) settingsDarkMode.checked = settings.darkMode === true;

    // Apply dark mode theme
    document.body.classList.toggle("dark-theme", settings.darkMode === true);
  }

  // Load and cache all published resources from Firestore
  async function initializeResources() {
    try {
      cachedResources = await getPublishedResources();
      console.log(`[Dashboard] Cached ${cachedResources.length} published resources.`);
    } catch (error) {
      console.error("[Dashboard] Error caching resources:", error);
    }
  }

  // Render Bookmarks
  function renderBookmarks() {
    const container = document.querySelector('[data-view="bookmarks"] .resource-list');
    if (!container) return;

    container.innerHTML = "";
    const bookmarkIds = currentProfile.bookmarks || [];

    if (bookmarkIds.length === 0) {
      container.innerHTML = `
        <li class="empty-state" style="padding: 32px; text-align: center; color: var(--color-text-soft);">
          <i class="fa-regular fa-star" style="font-size: 32px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
          <p>You haven't bookmarked any resources yet.</p>
        </li>
      `;
      return;
    }

    bookmarkIds.forEach((resId) => {
      const res = cachedResources.find((r) => r.id === resId);
      if (res) {
        const li = document.createElement("li");
        li.className = "resource-row";
        li.innerHTML = `
          <i class="fa-regular fa-star" aria-hidden="true" style="color: #f59e0b;"></i>
          <div class="resource-info">
            <a href="../#resources" target="_blank">${escapeHtml(res.title)}</a>
            <span class="text-faint">${escapeHtml(res.course)} · ${escapeHtml(res.type)}</span>
          </div>
          <button class="icon-btn remove-bookmark-btn" data-id="${res.id}" aria-label="Remove bookmark">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        `;

        li.querySelector(".remove-bookmark-btn").addEventListener("click", async (e) => {
          e.preventDefault();
          try {
            await toggleBookmark(currentUser.uid, res.id);
            await refreshUserProfile();
            renderBookmarks();
          } catch (error) {
            console.error("[Dashboard] Error removing bookmark:", error);
          }
        });

        container.appendChild(li);
      }
    });
  }

  // Render Downloads
  function renderDownloads() {
    const container = document.querySelector('[data-view="downloads"] .resource-list');
    if (!container) return;

    container.innerHTML = "";
    const downloadIds = currentProfile.downloads || [];

    if (downloadIds.length === 0) {
      container.innerHTML = `
        <li class="empty-state" style="padding: 32px; text-align: center; color: var(--color-text-soft);">
          <i class="fa-solid fa-download" style="font-size: 32px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
          <p>No downloads recorded yet.</p>
        </li>
      `;
      return;
    }

    downloadIds.forEach((resId) => {
      const res = cachedResources.find((r) => r.id === resId);
      if (res) {
        const li = document.createElement("li");
        li.className = "resource-row";
        
        let fileIcon = "fa-solid fa-file-pdf";
        if (res.type && res.type.toLowerCase().includes("book")) fileIcon = "fa-solid fa-book";

        li.innerHTML = `
          <i class="${fileIcon}" aria-hidden="true"></i>
          <div class="resource-info">
            <a href="${res.fileUrl}" target="_blank" download>${escapeHtml(res.title)}</a>
            <span class="text-faint">${escapeHtml(res.course)} · ${escapeHtml(res.type)}</span>
          </div>
          <button class="icon-btn download-btn" data-url="${res.fileUrl}" data-id="${res.id}" aria-label="Download">
            <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
          </button>
        `;

        const downloadAction = async (e) => {
          e.preventDefault();
          window.open(res.fileUrl, "_blank");
          try {
            await logDownload(currentUser.uid, res.id);
          } catch (error) {
            console.error("[Dashboard] Error logging download:", error);
          }
        };

        li.querySelector("a").addEventListener("click", downloadAction);
        li.querySelector(".download-btn").addEventListener("click", downloadAction);

        container.appendChild(li);
      }
    });
  }

  // Profile Form Edit Logic
  let isEditingProfile = false;
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", async () => {
      if (!currentUser || !currentProfile) return;

      if (!isEditingProfile) {
        // Toggle to edit mode
        isEditingProfile = true;
        fieldName.readOnly = false;
        fieldEnrolment.readOnly = false;
        fieldProgramme.readOnly = false;

        fieldName.focus();
        editProfileBtn.textContent = "Save changes";
        editProfileBtn.classList.remove("btn-primary");
        editProfileBtn.classList.add("btn-success");
      } else {
        // Save changes
        const newName = fieldName.value.trim();
        const newEnrolment = fieldEnrolment.value.trim();
        const newProgramme = fieldProgramme.value.trim();

        if (!newName) {
          alert("Full name is required.");
          return;
        }

        try {
          editProfileBtn.textContent = "Saving...";
          editProfileBtn.disabled = true;

          // Update Firebase Auth display name
          await updateProfile(currentUser, { displayName: newName });

          // Update Firestore profile
          await updateUserProfile(currentUser.uid, {
            displayName: newName,
            enrolment: newEnrolment,
            programme: newProgramme,
            profileCompleted: true
          });

          // Refresh and toggle mode back
          await refreshUserProfile();

          fieldName.readOnly = true;
          fieldEnrolment.readOnly = true;
          fieldProgramme.readOnly = true;

          isEditingProfile = false;
          editProfileBtn.textContent = "Edit profile";
          editProfileBtn.classList.remove("btn-success");
          editProfileBtn.classList.add("btn-primary");
        } catch (error) {
          console.error("[Dashboard] Error updating profile:", error);
          alert("Failed to update profile. Please try again.");
        } finally {
          editProfileBtn.disabled = false;
        }
      }
    });
  }

  // Settings switches
  if (settingsNotif) {
    settingsNotif.addEventListener("change", async () => {
      if (!currentUser || !currentProfile) return;
      const settings = currentProfile.settings || {};
      settings.notifications = settingsNotif.checked;
      try {
        await updateUserSettings(currentUser.uid, settings);
        currentProfile.settings = settings;
      } catch (error) {
        console.error("[Dashboard] Error saving settings:", error);
      }
    });
  }

  if (settingsDarkMode) {
    settingsDarkMode.addEventListener("change", async () => {
      if (!currentUser || !currentProfile) return;
      const settings = currentProfile.settings || {};
      settings.darkMode = settingsDarkMode.checked;
      try {
        await updateUserSettings(currentUser.uid, settings);
        currentProfile.settings = settings;
        const isDark = settings.darkMode;
        document.body.classList.toggle("dark-theme", isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
        document.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: isDark ? "dark" : "light" } }));
      } catch (error) {
        console.error("[Dashboard] Error saving settings:", error);
      }
    });
  }

  // Sync settings checkbox when theme changes globally
  document.addEventListener("themeChanged", (e) => {
    const isDark = e.detail.theme === "dark";
    if (settingsDarkMode) {
      settingsDarkMode.checked = isDark;
    }
  });


  // Sidebar (mobile drawer) open / close
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("sidebarScrim");
  const menuToggle = document.getElementById("menuToggle");
  const sidebarClose = document.getElementById("sidebarClose");

  function openSidebar() {
    if (!sidebar || !scrim || !menuToggle) return;
    sidebar.classList.add("open");
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add("show"));
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (!sidebar || !scrim || !menuToggle) return;
    sidebar.classList.remove("open");
    scrim.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { scrim.hidden = true; }, 200);
  }

  menuToggle?.addEventListener("click", openSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  scrim?.addEventListener("click", closeSidebar);

  // SPA ROUTER
  const views = document.querySelectorAll(".view[data-view]");
  const validViewKeys = Array.from(views).map((v) => v.dataset.view);

  function showView(key) {
    views.forEach((view) => {
      view.classList.toggle("is-active", view.dataset.view === key);
    });
    setActiveNav(key);
    document.getElementById("main-content")?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0 });
  }

  function setActiveNav(key) {
    document.querySelectorAll(".nav-link[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === key);
    });
    document.getElementById("brandHome")?.classList.toggle("is-home-active", key === "home");
  }

  function keyFromHash(hash) {
    const clean = (hash || "").replace(/^#/, "");
    return validViewKeys.includes(clean) ? clean : "home";
  }

  function navigateTo(key, { replace = false } = {}) {
    const targetKey = validViewKeys.includes(key) ? key : "home";
    showView(targetKey);

    const hash = targetKey === "home" ? "" : `#${targetKey}`;
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    const state = { view: targetKey };

    if (replace) {
      history.replaceState(state, "", url);
    } else {
      history.pushState(state, "", url);
    }
  }

  window.addEventListener("popstate", (e) => {
    const key = e.state?.view || keyFromHash(window.location.hash);
    showView(key);
  });

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.replace("../index.html");
    } catch (error) {
      console.error("[Dashboard] Error logging out:", error);
    }
  }

  function handleNavigation(key) {
    if (key === "logout") {
      handleLogout();
    } else {
      navigateTo(key);
    }
    closeAllPanels();
    if (window.innerWidth <= 900) closeSidebar();
  }

  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      handleNavigation(el.dataset.nav);
    });
  });

  document.getElementById("backToHomeBtn")?.addEventListener("click", () => {
    navigateTo("home");
  });

  navigateTo(keyFromHash(window.location.hash), { replace: true });

  // Generic dropdown/panel toggler
  function setupToggle(btn, panel) {
    if (!btn || !panel) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = panel.hidden;
      closeAllPanels();
      if (isHidden) {
        panel.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      }
    });
  }

  function closeAllPanels() {
    [notifPanel, userDropdown].forEach((p) => { if (p) p.hidden = true; });
    [notifBtn, userMenuBtn].forEach((b) => { if (b) b.setAttribute("aria-expanded", "false"); });
  }

  const notifBtn = document.getElementById("notifBtn");
  const notifPanel = document.getElementById("notifPanel");
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userDropdown = document.getElementById("userDropdown");

  setupToggle(notifBtn, notifPanel);
  setupToggle(userMenuBtn, userDropdown);

  document.addEventListener("click", closeAllPanels);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllPanels();
      closeSidebar();
    }
  });

  // "/" focuses global search
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // Helper Utilities
  function applyDynamicText(key, value) {
    document.querySelectorAll(`[data-dynamic="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  }

  function getGreetingWord() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
