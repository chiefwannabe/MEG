/* =========================================================
   MEGOL — IGNOU Study Hub — Dashboard Behaviour
   Integrated with Firebase Auth and Firestore.
   ========================================================= */

import { app } from "../src/firebase.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { createUserDocument, getUserProfile, updateUserProfile, getPublishedResources, getRelatedResources } from "../src/firestore.js";

(async function () {
  "use strict";

  const auth = getAuth(app);

  // Protect dashboard.html: Redirect immediately if not logged in
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.info("[Auth] No authenticated user found, redirecting to home...");
      window.location.replace("../index.html");
      return;
    }

    try {
      // Ensure user profile exists in Firestore (creates with default fields if missing)
      await createUserDocument(user);

      // Load updated user profile from Firestore
      const profile = await getUserProfile(user.uid);
      if (profile) {
        updateProfileUI(profile);
      } else {
        // Fallback to auth details if profile fetch returns null
        updateProfileUI({
          displayName: user.displayName || "User",
          email: user.email || "",
          photoURL: user.photoURL || "",
          createdAt: null,
          lastLogin: null
        });
      }

      // Load and cache all resources
      await initializeResources();
    } catch (error) {
      console.error("[Dashboard] Error loading user profile:", error);
    }
  });

  // Shared timestamp formatter
  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    if (ts.toDate) return ts.toDate().toLocaleString("en-IN");
    if (ts instanceof Date) return ts.toLocaleString("en-IN");
    return new Date(ts).toLocaleString("en-IN");
  };

  // Handle updates to profile views/placeholders dynamically
  function updateProfileUI(profile) {
    // Populate display name
    const shortName = profile.displayName ? profile.displayName.split(" ")[0] : "User";
    applyDynamicText("displayName", profile.displayName || "User");
    
    // Custom handling for welcome greeting short name
    const welcomeHeader = document.querySelector("#welcomeHeading");
    if (welcomeHeader) {
      welcomeHeader.innerHTML = `Welcome back, <span>${shortName}</span> <span aria-hidden="true">👋</span>`;
    }

    // Populate user topbar avatar
    const avatars = document.querySelectorAll(".user-menu-btn .avatar");
    avatars.forEach((img) => {
      if (profile.photoURL) {
        img.src = profile.photoURL;
      } else {
        // Fallback DiceBear SVG avatar
        img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.displayName || "User")}&backgroundColor=2563eb&textColor=ffffff`;
      }
      img.alt = profile.displayName || "User Avatar";
    });

    // Populate helper items for email, createdAt, and lastLogin in user dropdown
    injectProfileMetadata(profile);

    // Populate My Profile View
    const previewAvatar = document.getElementById("profile-avatar-preview");
    if (previewAvatar) {
      if (profile.photoURL) {
        previewAvatar.src = profile.photoURL;
      } else {
        previewAvatar.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.displayName || "User")}&backgroundColor=2563eb&textColor=ffffff`;
      }
      previewAvatar.alt = profile.displayName || "User Avatar";
    }

    const uidMeta = document.getElementById("profile-meta-uid");
    if (uidMeta) uidMeta.textContent = profile.uid || "";

    const emailMeta = document.getElementById("profile-meta-email");
    if (emailMeta) emailMeta.textContent = profile.email || "";

    const createdMeta = document.getElementById("profile-meta-created");
    if (createdMeta) createdMeta.textContent = formatTimestamp(profile.createdAt);

    const lastLoginMeta = document.getElementById("profile-meta-lastlogin");
    if (lastLoginMeta) lastLoginMeta.textContent = formatTimestamp(profile.lastLogin);

    // Populate form inputs
    const nameInput = document.getElementById("profile-name");
    if (nameInput) nameInput.value = profile.displayName || "";

    const photoInput = document.getElementById("profile-photo");
    if (photoInput) photoInput.value = profile.photoURL || "";

    const bioInput = document.getElementById("profile-bio");
    if (bioInput) bioInput.value = profile.bio || "";

    const uniInput = document.getElementById("profile-university");
    if (uniInput) uniInput.value = profile.university || "";

    const courseInput = document.getElementById("profile-course");
    if (courseInput) courseInput.value = profile.course || "";

    const semInput = document.getElementById("profile-semester");
    if (semInput) semInput.value = profile.semester || "";

    const countryInput = document.getElementById("profile-country");
    if (countryInput) countryInput.value = profile.country || "";
  }

  function injectProfileMetadata(profile) {
    const userDropdown = document.getElementById("userDropdown");
    if (!userDropdown) return;

    // Check if metadata header is already injected
    let metaHeader = userDropdown.querySelector(".dropdown-profile-header");
    if (!metaHeader) {
      metaHeader = document.createElement("li");
      metaHeader.className = "dropdown-profile-header";
      metaHeader.style.padding = "12px 16px";
      metaHeader.style.borderBottom = "1px solid var(--color-border)";
      metaHeader.style.fontSize = "13px";
      metaHeader.style.color = "var(--color-text-soft)";
      metaHeader.style.backgroundColor = "var(--color-accent-soft)";
      metaHeader.style.borderTopLeftRadius = "var(--radius-md)";
      metaHeader.style.borderTopRightRadius = "var(--radius-md)";
      userDropdown.insertBefore(metaHeader, userDropdown.firstChild);
    }

    metaHeader.innerHTML = `
      <div style="font-weight: 700; color: var(--color-text); margin-bottom: 2px;">${profile.displayName || "User"}</div>
      <div style="font-size: 11.5px; opacity: 0.85; margin-bottom: 6px; word-break: break-all;">${profile.email || ""}</div>
      <div style="font-size: 10px; opacity: 0.7; margin-bottom: 2px;">Registered: ${formatTimestamp(profile.createdAt)}</div>
      <div style="font-size: 10px; opacity: 0.7;">Last Login: ${formatTimestamp(profile.lastLogin)}</div>
    `;
  }

  // Handle Logout Button clicks
  async function handleLogout(e) {
    e.preventDefault();
    try {
      console.info("[Auth] Logging user out...");
      await signOut(auth);
      // Auth state listener will auto-detect and handle redirection, but replace here just in case
      window.location.replace("../index.html");
    } catch (error) {
      console.error("[Auth] Error signing out:", error);
    }
  }

  // Connect Logout actions (both in sidebar bottom and top dropdown menu)
  document.querySelectorAll("[data-nav='logout'], .dropdown-menu a.danger").forEach((btn) => {
    btn.addEventListener("click", handleLogout);
  });

  /* ---------------------------------------------------------
     DYNAMIC DATA STORE (placeholder)
     TODO: Hook these values to dynamic stats inside Firestore later.
  --------------------------------------------------------- */
  const userData = {
    coursesEnrolled: 6,
    notesRead: 142,
    bookmarkCount: 28,
    quizAverage: "81%",
    studyStreak: 12,
    readingProgress: "68%",
    unreadCount: 3,
    motivationalQuotes: [
      "Success is the sum of small efforts, repeated day in and day out.",
      "The secret of getting ahead is getting started.",
      "Discipline is choosing between what you want now and what you want most.",
      "A little progress each day adds up to big results.",
    ],
    // STUDY LOG: dates (day-of-month) studied this month — feeds the mini calendar
    studyLogDays: [1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14],
  };

  /* ---------------------------------------------------------
     Utility: safely set text for every [data-dynamic] node
  --------------------------------------------------------- */
  function applyDynamicText(key, value) {
    document.querySelectorAll(`[data-dynamic="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  }

  // Populate other static fields (dynamic updates will be loaded from Firestore subcollections later)
  applyDynamicText("coursesEnrolled", userData.coursesEnrolled);
  applyDynamicText("notesRead", userData.notesRead);
  applyDynamicText("bookmarkCount", userData.bookmarkCount);
  applyDynamicText("quizAverage", userData.quizAverage);
  applyDynamicText("studyStreak", userData.studyStreak);
  applyDynamicText("studyStreakStat", userData.studyStreak);
  applyDynamicText("readingProgress", userData.readingProgress);
  applyDynamicText("unreadCount", userData.unreadCount);

  /* ---------------------------------------------------------
     Current date (Welcome Card)
  --------------------------------------------------------- */
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  applyDynamicText("currentDate", dateFormatter.format(today));
  
  const copyrightYearEl = document.getElementById("copyrightYear");
  if (copyrightYearEl) {
    copyrightYearEl.textContent = today.getFullYear();
  }

  /* ---------------------------------------------------------
     Rotating motivational quote (placeholder pool)
  --------------------------------------------------------- */
  const quoteEl = document.querySelector('[data-dynamic="motivationalQuote"]');
  if (quoteEl) {
    const pick =
      userData.motivationalQuotes[
        Math.floor(Math.random() * userData.motivationalQuotes.length)
      ];
    quoteEl.innerHTML = `<i class="fa-solid fa-quote-left" aria-hidden="true"></i> "${pick}"`;
  }

  /* ---------------------------------------------------------
     Sidebar (mobile drawer) open / close
  --------------------------------------------------------- */
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("sidebarScrim");
  const menuToggle = document.getElementById("menuToggle");
  const sidebarClose = document.getElementById("sidebarClose");

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (scrim) {
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add("show"));
    }
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (scrim) scrim.classList.remove("show");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { if (scrim) scrim.hidden = true; }, 200);
  }

  menuToggle?.addEventListener("click", openSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  scrim?.addEventListener("click", closeSidebar);

  // View Switcher Logic
  function switchView(viewName) {
    console.log(`[Navigation] Switching view to: ${viewName}`);

    // Update active classes on side-nav links
    document.querySelectorAll(".side-nav .nav-link").forEach((l) => {
      if (l.dataset.nav === viewName) {
        l.classList.add("active");
      } else {
        l.classList.remove("active");
      }
    });

    const dashboardView = document.getElementById("view-dashboard");
    const profileView = document.getElementById("view-profile");
    const resourcesView = document.getElementById("view-resources");

    if (viewName === "dashboard") {
      if (dashboardView) dashboardView.hidden = false;
      if (profileView) profileView.hidden = true;
      if (resourcesView) resourcesView.hidden = true;
      loadDashboardResources();
    } else if (viewName === "profile") {
      if (dashboardView) dashboardView.hidden = true;
      if (profileView) profileView.hidden = false;
      if (resourcesView) resourcesView.hidden = true;
    } else if (viewName === "resources") {
      if (dashboardView) dashboardView.hidden = true;
      if (profileView) profileView.hidden = true;
      if (resourcesView) resourcesView.hidden = false;
      renderResourcesCatalog();
    } else {
      // Requirements: Do not implement bookmarks, progress, quizzes, downloads, or notes yet.
      // So keep dashboard or simply do nothing, but print warning.
      console.info(`[Navigation] View ${viewName} not implemented yet.`);
    }
  }

  // Handle sidebar navigation clicks
  document.querySelectorAll(".side-nav .nav-link:not(.logout)").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const navTarget = link.dataset.nav;
      switchView(navTarget);
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // Handle dropdown profile/settings navigation clicks
  document.querySelectorAll("#userDropdown a[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const navTarget = link.dataset.nav;
      switchView(navTarget);
      closeAllPanels();
    });
  });

  // Handle brand click to go to dashboard
  document.querySelector(".brand")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchView("dashboard");
  });

  // Handle Profile Form submit
  async function handleProfileSave(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const saveBtn = document.getElementById("saveProfileBtn");
    const formMessage = document.getElementById("profile-form-message");

    if (saveBtn) saveBtn.disabled = true;
    if (formMessage) {
      formMessage.textContent = "Saving...";
      formMessage.className = "form-message";
    }

    const displayName = document.getElementById("profile-name").value.trim();
    const photoURL = document.getElementById("profile-photo").value.trim();
    const bio = document.getElementById("profile-bio").value.trim();
    const university = document.getElementById("profile-university").value.trim();
    const course = document.getElementById("profile-course").value.trim();
    const semester = document.getElementById("profile-semester").value.trim();
    const country = document.getElementById("profile-country").value.trim();

    try {
      // 1. Update Firebase Auth displayName and photoURL
      await updateProfile(user, { displayName, photoURL });

      // 2. Update Firestore profile details without overwriting untouched fields
      const updateData = {
        displayName,
        photoURL,
        bio,
        university,
        course,
        semester,
        country
      };

      await updateUserProfile(user.uid, updateData);

      // 3. Fetch latest profile and reload UI
      const updatedProfile = await getUserProfile(user.uid);
      if (updatedProfile) {
        updateProfileUI(updatedProfile);
      }

      if (formMessage) {
        formMessage.textContent = "Profile updated successfully!";
        formMessage.className = "form-message success";
      }
    } catch (error) {
      console.error("[Dashboard] Error saving profile:", error);
      if (formMessage) {
        formMessage.textContent = "Failed to update profile. Please try again.";
        formMessage.className = "form-message error";
      }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
      setTimeout(() => {
        if (formMessage) formMessage.textContent = "";
      }, 5000);
    }
  }

  // Hook up profile form submission
  document.getElementById("profileForm")?.addEventListener("submit", handleProfileSave);

  /* ---------------------------------------------------------
     STUDENT RESOURCE SYSTEM LOGIC (caching, catalog, modals)
     --------------------------------------------------------- */
  let cachedResources = [];

  async function initializeResources() {
    console.info("[Resources] Initializing catalog and dashboard lists...");
    const skeleton = document.getElementById("student-resources-skeleton");
    const grid = document.getElementById("student-resources-grid");

    if (skeleton) skeleton.style.display = "block";
    if (grid) grid.style.display = "none";

    try {
      cachedResources = await getPublishedResources();
      console.log(`[Resources] Loaded ${cachedResources.length} published resources.`);

      loadDashboardResources();
      setupCatalogListeners();
    } catch (error) {
      console.error("[Resources] Error loading resources catalog:", error);
    } finally {
      if (skeleton) skeleton.style.display = "none";
      if (grid) grid.style.display = "grid";
    }
  }

  // Populate Dashboard Widgets with dynamic Firestore data
  function loadDashboardResources() {
    if (!cachedResources || cachedResources.length === 0) return;

    // 1. Recently Added Resources (3 latest)
    const recent = [...cachedResources]
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      })
      .slice(0, 3);
    renderMiniList("recently-added-resources-list", recent, "fa-regular fa-file-lines");

    // 2. Recommended Resources (3 random or course matching)
    // For simplicity, take 3 elements
    const recommended = [...cachedResources]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    renderMiniList("recommended-resources-list", recommended, "fa-solid fa-star");

    // 3. Latest PYQs (3 latest)
    const pyqs = [...cachedResources]
      .filter((r) => r.type === "PYQs")
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      })
      .slice(0, 3);
    renderMiniList("latest-pyqs-list", pyqs, "fa-solid fa-clock-rotate-left");

    // 4. Latest Notes (3 latest)
    const notes = [...cachedResources]
      .filter((r) => r.type === "Notes")
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      })
      .slice(0, 3);
    renderMiniList("latest-notes-list", notes, "fa-regular fa-file-lines");
  }

  function renderMiniList(elementId, items, iconClass) {
    const listEl = document.getElementById(elementId);
    if (!listEl) return;

    listEl.innerHTML = "";
    if (items.length === 0) {
      listEl.innerHTML = `<li style="font-size: 13px; color: var(--color-text-faint); padding: 8px;">No resources found</li>`;
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.style.cursor = "pointer";
      li.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><a href="#" style="pointer-events: none;">${escapeHtml(item.title)}</a>`;
      li.addEventListener("click", (e) => {
        e.preventDefault();
        openResourceDetails(item);
      });
      listEl.appendChild(li);
    });
  }

  // Setup Listeners for filters and click actions
  function setupCatalogListeners() {
    const searchInp = document.getElementById("student-search-input");
    const typeSel = document.getElementById("student-type-select");
    const courseSel = document.getElementById("student-course-select");
    const semesterInp = document.getElementById("student-semester-input");
    const sortSel = document.getElementById("student-sort-select");

    const refreshCatalog = () => renderResourcesCatalog();

    [searchInp, typeSel, courseSel, semesterInp, sortSel].forEach((el) => {
      el?.addEventListener("input", refreshCatalog);
    });

    // Wire resource-tiles in footer to switch to resources catalog and filter
    document.querySelectorAll(".resource-tile[data-tile-nav]").forEach((tile) => {
      tile.addEventListener("click", (e) => {
        e.preventDefault();
        const type = tile.dataset.tileNav;
        if (typeSel) typeSel.value = type;
        switchView("resources");
      });
    });

    // Wire top view-all dashboard actions
    document.querySelectorAll("[data-action-nav='resources']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const filterType = btn.dataset.filterType;
        if (filterType && typeSel) {
          typeSel.value = filterType;
        } else if (typeSel) {
          typeSel.value = "";
        }
        switchView("resources");
      });
    });

    // Wire Close Details Modal button
    const closeBtn = document.getElementById("closeDetailsModalBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.getElementById("resourceDetailsModal").hidden = true;
      });
    }

    // Share button
    const shareBtn = document.getElementById("details-share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const openBtn = document.getElementById("details-open-btn");
        const link = openBtn ? openBtn.href : window.location.href;
        navigator.clipboard.writeText(link).then(() => {
          alert("Resource link copied to clipboard!");
        });
      });
    }

    // Bookmark button
    const bookmarkBtn = document.getElementById("details-bookmark-btn");
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Bookmarking is coming soon in the next update!");
      });
    }
  }

  // Filter, Sort, and Render Catalog Cards Grid
  function renderResourcesCatalog() {
    const searchVal = document.getElementById("student-search-input")?.value.toLowerCase().trim() || "";
    const typeVal = document.getElementById("student-type-select")?.value || "";
    const courseVal = document.getElementById("student-course-select")?.value || "";
    const semesterVal = document.getElementById("student-semester-input")?.value.toLowerCase().trim() || "";
    const sortVal = document.getElementById("student-sort-select")?.value || "newest";

    const filtered = cachedResources.filter((res) => {
      const matchesSearch = !searchVal || 
        res.title.toLowerCase().includes(searchVal) || 
        (res.description && res.description.toLowerCase().includes(searchVal)) || 
        (res.tags && res.tags.some(t => t.toLowerCase().includes(searchVal)));
      const matchesType = !typeVal || res.type === typeVal;
      const matchesCourse = !courseVal || res.course === courseVal;
      const matchesSemester = !semesterVal || (res.semester && res.semester.toLowerCase().includes(semesterVal));

      return matchesSearch && matchesType && matchesCourse && matchesSemester;
    });

    // Sort results
    filtered.sort((a, b) => {
      if (sortVal === "az") {
        return a.title.localeCompare(b.title);
      }
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return sortVal === "newest" ? dateB - dateA : dateA - dateB;
    });

    const grid = document.getElementById("student-resources-grid");
    const empty = document.getElementById("student-resources-empty");
    if (!grid) return;

    grid.innerHTML = "";

    if (filtered.length === 0) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    filtered.forEach((res) => {
      const card = document.createElement("article");
      card.className = "card student-resource-card";
      card.style.cursor = "pointer";

      const typeClass = `badge-${res.type?.toLowerCase().replace(/\s+/g, "") || "notes"}`;
      const fallbackThumb = `https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=400`;

      card.innerHTML = `
        <div class="card-thumbnail-wrapper">
          <img src="${res.thumbnail || fallbackThumb}" alt="${escapeHtml(res.title)}" loading="lazy">
          <span class="badge ${typeClass} card-badge">${escapeHtml(res.type)}</span>
        </div>
        <div class="card-body" style="padding: 16px; flex: 1; display: flex; flex-direction: column;">
          <span style="font-size: 11px; font-weight: 700; color: var(--color-accent); text-transform: uppercase;">${escapeHtml(res.course)} · ${escapeHtml(res.semester || "1st Year")}</span>
          <h3 style="font-size: 15px; font-weight: 700; margin: 6px 0 8px; color: var(--color-text); line-height: 1.4;">${escapeHtml(res.title)}</h3>
          <p style="font-size: 13px; color: var(--color-text-soft); line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 38px;">${escapeHtml(res.description || "No description available.")}</p>
          <div style="margin-top: auto; display: flex; flex-wrap: wrap; gap: 4px;">
            ${(res.tags || []).slice(0, 3).map(tag => `<span class="badge badge-draft" style="font-size: 9px; padding: 2px 6px;">#${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
      `;

      card.addEventListener("click", () => openResourceDetails(res));
      grid.appendChild(card);
    });
  }

  // Render Resource Details Modal
  async function openResourceDetails(res) {
    if (!res) return;
    const modal = document.getElementById("resourceDetailsModal");
    if (!modal) return;

    document.getElementById("detailsResourceTitle").textContent = res.title;
    document.getElementById("details-title").textContent = res.title;
    document.getElementById("details-description").textContent = res.description || "No description available.";
    document.getElementById("details-course").textContent = res.course;
    document.getElementById("details-subject").textContent = res.subject || "General";
    document.getElementById("details-semester").textContent = res.semester || "1st Year";

    let dateString = "N/A";
    if (res.createdAt) {
      const dateVal = res.createdAt.toDate ? res.createdAt.toDate() : new Date(res.createdAt);
      dateString = dateVal.toLocaleDateString("en-IN");
    }
    document.getElementById("details-date").textContent = dateString;

    const typeBadge = document.getElementById("details-type-badge");
    if (typeBadge) {
      typeBadge.textContent = res.type;
      typeBadge.className = `badge badge-${res.type?.toLowerCase().replace(/\s+/g, "") || "notes"}`;
    }

    const thumbImg = document.getElementById("details-thumbnail");
    if (thumbImg) {
      thumbImg.src = res.thumbnail || `https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=400`;
    }

    // Set Actions
    const openBtn = document.getElementById("details-open-btn");
    if (openBtn) {
      openBtn.href = res.fileUrl || "#";
      openBtn.style.display = res.fileUrl ? "inline-flex" : "none";
    }

    const downloadBtn = document.getElementById("details-download-btn");
    if (downloadBtn) {
      downloadBtn.href = res.fileUrl || "#";
      downloadBtn.style.display = res.fileUrl ? "inline-flex" : "none";
    }

    // Load Tags
    const tagsList = document.getElementById("details-tags-list");
    if (tagsList) {
      tagsList.innerHTML = "";
      if (res.tags && res.tags.length > 0) {
        res.tags.forEach((tag) => {
          const span = document.createElement("span");
          span.className = "badge badge-draft";
          span.textContent = `#${tag}`;
          tagsList.appendChild(span);
        });
      }
    }

    // Load Related Resources
    const relatedGrid = document.getElementById("details-related-grid");
    if (relatedGrid) {
      relatedGrid.innerHTML = `<div style="font-size: 13px; color: var(--color-text-faint);">Loading...</div>`;
      try {
        const related = await getRelatedResources(res);
        relatedGrid.innerHTML = "";
        if (related.length === 0) {
          relatedGrid.innerHTML = `<div style="font-size: 13px; color: var(--color-text-faint); grid-column: 1/-1;">No related resources found</div>`;
        } else {
          related.forEach((rel) => {
            const relDiv = document.createElement("div");
            relDiv.style.border = "1px solid var(--color-border)";
            relDiv.style.borderRadius = "var(--radius-sm)";
            relDiv.style.padding = "10px";
            relDiv.style.cursor = "pointer";
            relDiv.style.background = "var(--color-bg)";
            relDiv.innerHTML = `
              <span style="font-size: 9px; font-weight: 700; color: var(--color-accent); text-transform: uppercase;">${escapeHtml(rel.type)}</span>
              <h5 style="font-size: 12px; font-weight: 700; margin: 4px 0 0; color: var(--color-text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 32px;">${escapeHtml(rel.title)}</h5>
            `;
            relDiv.addEventListener("click", () => {
              openResourceDetails(rel);
            });
            relatedGrid.appendChild(relDiv);
          });
        }
      } catch (err) {
        console.error(err);
        relatedGrid.innerHTML = `<div style="font-size: 13px; color: var(--color-text-faint); grid-column: 1/-1;">Failed to load related items</div>`;
      }
    }

    modal.hidden = false;
  }

  // Safe HTML Escaping
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---------------------------------------------------------
     Generic dropdown/panel toggler
     Handles: notifications panel, user account dropdown
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     "/" focuses the global search box (common SaaS pattern)
  --------------------------------------------------------- */
  const searchInput = document.getElementById("globalSearch");
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  /* ---------------------------------------------------------
     Continue Learning button (placeholder action)
  --------------------------------------------------------- */
  document.getElementById("continueLearningBtn")?.addEventListener("click", () => {
    // TODO: route to the learner's most recently opened course/block
    document.querySelector(".course-list .course-item")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  /* ---------------------------------------------------------
     Mini Study Calendar — builds the current month grid
     Highlights days present in userData.studyLogDays
  --------------------------------------------------------- */
  function renderMiniCalendar() {
    const container = document.getElementById("miniCal");
    if (!container) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString("en-IN", { month: "long" });
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    const dowLabels = ["S", "M", "T", "W", "T", "F", "S"];

    let html = `
      <div class="mini-cal-head">
        <h3>${monthName} ${year}</h3>
      </div>
      <div class="mini-cal-grid">
        ${dowLabels.map((d) => `<span class="dow">${d}</span>`).join("")}
        ${Array.from({ length: firstDay }).map(() => `<span class="day empty"></span>`).join("")}
    `;

    for (let d = 1; d <= daysInMonth; d++) {
      const classes = ["day"];
      // STUDY LOG: mark days the learner studied (placeholder array)
      if (userData.studyLogDays.includes(d)) classes.push("studied");
      if (d === todayDate) classes.push("today");
      html += `<span class="${classes.join(" ")}">${d}</span>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  }
  renderMiniCalendar();

  /* ---------------------------------------------------------
     Task checklist — placeholder local toggle only.
     Wire this to a persistence layer (API/localStorage-free
     backend call) when available.
  --------------------------------------------------------- */
  document.querySelectorAll(".task-item input[type='checkbox']").forEach((box) => {
    box.addEventListener("change", () => {
      // TODO: persist task completion state to backend
      const dueEl = box.closest(".task-item").querySelector(".task-due");
      if (box.checked) {
        dueEl.textContent = "Completed";
        dueEl.classList.add("task-done");
      }
    });
  });
})();
