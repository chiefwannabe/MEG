/* =========================================================
   MEGOL — IGNOU Study Hub — Admin Dashboard Logic
   Access control, Resource Management, User Permissions, and Analytics.
   ========================================================= */

import { app } from "../../firebase.js";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { 
  getUserProfile, 
  addResource, 
  updateResource, 
  deleteResource, 
  getAllResources, 
  getAllUsers, 
  updateUserRole, 
  getGames,
  createGame,
  updateGame,
  archiveGame,
} from "../../firestore.js";

(async function () {
  "use strict";

  const auth = getAuth(app);
  let currentUserProfile = null;
  let allResources = [];
  let allUsers = [];
  let allGames = [];
  let resourceUIReady = false;

  // Protect Admin Dashboard: Strict Access Control Check
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.warn("[Admin Auth] Unauthenticated access attempt. Redirecting...");
      window.location.replace("../../../index.html");
      return;
    }

    try {
      const profile = await getUserProfile(user.uid);
      if (!profile || profile.role !== "admin") {
        console.error("[Admin Auth] Unauthorized access. User is not an admin. Redirecting to dashboard...");
        window.location.replace("../dashboard/index.html");
        return;
      }

      // Valid admin — Show page and initialize dashboard data
      currentUserProfile = profile;
      document.body.style.display = "block";
      initAdminPanel();
    } catch (error) {
      console.error("[Admin Panel] Error checking authorization:", error);
      window.location.replace("../dashboard/index.html");
    }
  });

  // Main Initializer
  async function initAdminPanel() {
    setupUI();
    setupNavigation();
    setupDropdowns();
    setupCommandPalette();
    setupGames();
    await Promise.all([loadResources(), loadUsers(), loadGames()]);
    refreshAnalytics();
  }

  // Set topbar and greeting metadata
  function setupUI() {
    const today = new Date();
    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const dateEl = document.getElementById("currentDate");
    if (dateEl) dateEl.textContent = dateFormatter.format(today);

    // Welcome message
    const welcomeNameEl = document.getElementById("admin-welcome-name");
    if (welcomeNameEl) welcomeNameEl.textContent = currentUserProfile.displayName || "Admin";

    // Topbar profile
    const avatarEl = document.getElementById("topbar-admin-avatar");
    if (avatarEl) {
      avatarEl.src = currentUserProfile.photoURL || "/assets/images/default-avatar.svg";
      avatarEl.alt = currentUserProfile.displayName || "Admin Avatar";
    }

    const nameEl = document.getElementById("topbar-admin-name");
    if (nameEl) nameEl.textContent = currentUserProfile.displayName || "Admin";
  }

  // Load and refresh stats
  async function refreshAnalytics() {
    const count = (type) => allResources.filter((resource) => resource.type === type).length;
    document.getElementById("stat-total-users").textContent = allUsers.length;
    document.getElementById("stat-total-resources").textContent = allResources.length;
    document.getElementById("stat-total-notes").textContent = count("Notes");
    document.getElementById("stat-total-pyqs").textContent = count("PYQs");
    document.getElementById("stat-total-books").textContent = count("Books");
    renderRecentActivity();
  }

  function asDate(value) {
    return value?.toDate ? value.toDate() : value ? new Date(value) : null;
  }

  function renderRecentActivity() {
    const list = document.getElementById("activity-list");
    const status = document.getElementById("dashboard-status");
    const lastLogin = document.getElementById("dashboard-last-login");
    if (!list || !status || !lastLogin) return;

    const changes = allResources
      .map((resource) => ({ resource, date: asDate(resource.updatedAt) || asDate(resource.createdAt), created: !resource.updatedAt || !resource.createdAt || asDate(resource.updatedAt)?.getTime() === asDate(resource.createdAt)?.getTime() }))
      .filter(({ date }) => date && !Number.isNaN(date.getTime()))
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
    list.innerHTML = changes.length ? changes.map(({ resource, date, created }) => `
      <li class="task-item"><span class="activity-avatar">${created ? "+" : "↗"}</span><span class="task-text"><strong>${created ? "Created" : "Updated"} content</strong><em>${escapeHtml(resource.title || "Untitled resource")}</em><small>${date.toLocaleString("en-IN")}</small></span><span class="task-due">${escapeHtml(resource.type || "Resource")}</span></li>`).join("") : '<li class="task-item activity-empty">No content changes have been recorded yet.</li>';

    const latestLogin = allUsers.map((user) => asDate(user.lastLogin)).filter(Boolean).sort((a, b) => b - a)[0];
    status.textContent = "Firestore content data is available.";
    lastLogin.textContent = latestLogin ? `Most recent login: ${latestLogin.toLocaleString("en-IN")}` : "No user login has been recorded yet.";
  }

  // View Switcher logic
  function setupNavigation() {
    const panels = document.querySelectorAll(".admin-panel");
    const navLinks = document.querySelectorAll(".side-nav .nav-link:not(.logout)");
    const viewTriggers = document.querySelectorAll("[data-nav]:not(.logout)");

    function switchView(target) {
      console.log(`[Admin Nav] Switching view to: ${target}`);
      
      // Update sidebar state
      navLinks.forEach((link) => {
        if (link.dataset.nav === target) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });

      // Hide all panels
      panels.forEach((panel) => panel.hidden = true);

      // Handle specific panels or fallback to placeholder view
      if (target === "dashboard") {
        document.getElementById("panel-dashboard").hidden = false;
        refreshAnalytics();
      } else if (target === "vault") {
        document.getElementById("panel-resources").hidden = false;
      } else if (target === "games") {
        document.getElementById("panel-games").hidden = false;
        loadGames();
      } else if (target === "users") {
        document.getElementById("panel-users").hidden = false;
        loadUsers(); // Reload user statuses
      } else {
        const placeholderPanel = document.getElementById("panel-placeholder");
        const placeholderTitle = document.getElementById("placeholder-title");
        if (placeholderPanel) {
          placeholderPanel.hidden = false;
          if (placeholderTitle) {
            // Capitalize title
            placeholderTitle.textContent = target.charAt(0).toUpperCase() + target.slice(1) + " Console";
          }
        }
      }
    }

    // Sidebar navigation clicks
    viewTriggers.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(link.dataset.nav);
        if (window.innerWidth <= 900) closeSidebar();
      });
    });
    document.addEventListener("admin:navigate", (event) => switchView(event.detail));

    // Logout
    document.querySelectorAll(".logout").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          window.location.replace("../../../index.html");
        } catch (error) {
          console.error("[Admin Auth] Logout failed:", error);
        }
      });
    });

    // Mobile Sidebar Drawer
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
  }

  // Menu Dropdowns / Scrim handler
  function setupDropdowns() {
    const userMenuBtn = document.getElementById("userMenuBtn");
    const userDropdown = document.getElementById("userDropdown");

    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = userDropdown.hidden;
        userDropdown.hidden = !isHidden;
        userMenuBtn.setAttribute("aria-expanded", isHidden ? "true" : "false");
      });
    }

    document.addEventListener("click", () => {
      if (userDropdown) {
        userDropdown.hidden = true;
        userMenuBtn?.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (userDropdown) userDropdown.hidden = true;
      }
    });

    // Global command/search shortcut
    const searchInput = document.getElementById("globalSearch");
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput?.focus();
      }
    });
  }

  function setupCommandPalette() {
    const palette = document.getElementById("commandPalette");
    const input = document.getElementById("commandSearch");
    const results = document.getElementById("commandResults");
    if (!palette || !input || !results) return;
    const pages = [["Dashboard", "dashboard"], ["Games", "games"], ["Vault", "vault"], ["Media Library", "media"], ["Posts & Announcements", "announcements"], ["Categories", "categories"], ["Users", "users"], ["Analytics", "analytics"], ["Activity Logs", "activity"], ["Settings", "settings"]];
    const open = () => { palette.hidden = false; input.value = ""; render(); requestAnimationFrame(() => input.focus()); };
    const close = () => { palette.hidden = true; };
    const render = () => {
      const term = input.value.trim().toLowerCase();
      const matches = [
        ...pages.map(([label, nav]) => ({ label, nav })),
        ...allResources.map((resource) => ({ label: resource.title || "Untitled resource", nav: "vault", detail: resource.type || "Resource" })),
        ...allGames.map((game) => ({ label: game.title || "Untitled game", nav: "games", detail: "Game" })),
        ...allUsers.map((user) => ({ label: user.displayName || user.username || "User", nav: "users", detail: "User" }))
      ].filter((item) => !term || `${item.label} ${item.detail || ""}`.toLowerCase().includes(term)).slice(0, 8);
      results.innerHTML = matches.length ? matches.map((item, index) => `<li role="option"><button type="button" data-nav="${item.nav}" ${index === 0 ? 'aria-selected="true"' : ""}>${escapeHtml(item.label)}<small>${escapeHtml(item.detail || "Page")}</small></button></li>`).join("") : '<li class="command-empty">No matching content or workspace pages.</li>';
      results.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { document.dispatchEvent(new CustomEvent("admin:navigate", { detail: button.dataset.nav })); close(); }));
    };
    document.addEventListener("keydown", (event) => {
      if (event.key === "k" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); palette.hidden ? open() : close(); }
      if (event.key === "Escape" && !palette.hidden) close();
    });
    input.addEventListener("input", render);
    input.addEventListener("keydown", (event) => {
      const buttons = [...results.querySelectorAll("button")];
      const selected = Math.max(0, buttons.findIndex((button) => button.getAttribute("aria-selected") === "true"));
      if (event.key === "Enter" && buttons[selected]) buttons[selected].click();
      if (["ArrowDown", "ArrowUp"].includes(event.key) && buttons.length) {
        event.preventDefault();
        const next = (selected + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length;
        buttons.forEach((button, index) => button.setAttribute("aria-selected", String(index === next)));
      }
    });
    palette.addEventListener("click", (event) => { if (event.target === palette) close(); });
  }

  /* =========================================================
     RESOURCE MANAGEMENT ACTIONS & FORM HOOKS
     ========================================================= */

  async function loadResources() {
    try {
      allResources = await getAllResources();
      renderResourcesTable(allResources);
      if (!resourceUIReady) {
        setupFilters();
        setupResourceModals();
        resourceUIReady = true;
      }
      refreshAnalytics();
    } catch (error) {
      console.error("[Admin Panel] Error loading resources:", error);
    }
  }

  function renderResourcesTable(list) {
    const tbody = document.getElementById("resources-list-tbody");
    const emptyEl = document.getElementById("resources-empty");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (list.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    list.forEach((res) => {
      const tr = document.createElement("tr");

      // Format updated timestamp
      let dateString = "N/A";
      if (res.updatedAt) {
        if (res.updatedAt.toDate) dateString = res.updatedAt.toDate().toLocaleDateString("en-IN");
        else dateString = new Date(res.updatedAt).toLocaleDateString("en-IN");
      }

      // Safe badges mapping
      const typeClass = `badge-${res.type?.toLowerCase().replace(/\s+/g, "") || "notes"}`;
      const publishedBadge = res.published 
        ? `<span class="badge badge-published">Published</span>`
        : `<span class="badge badge-draft">Draft</span>`;

      tr.innerHTML = `
        <td data-label="Title" style="font-weight: 600; color: var(--color-text);">${escapeHtml(res.title)}</td>
        <td data-label="Type"><span class="badge ${typeClass}">${escapeHtml(res.type)}</span></td>
        <td data-label="Course"><strong>${escapeHtml(res.course)}</strong></td>
        <td data-label="Subject">${escapeHtml(res.subject || "—")}</td>
        <td data-label="Semester">${escapeHtml(res.semester || "—")}</td>
        <td data-label="Status">${publishedBadge}</td>
        <td data-label="Updated">${dateString}</td>
        <td data-label="Actions">
          <div class="action-buttons">
            <button class="icon-action-btn edit" data-id="${res.id}" title="Edit Resource">
              <svg class="icon" aria-hidden="true"><use href="#icon-edit"></use></svg>
            </button>
            <button class="icon-action-btn delete" data-id="${res.id}" title="Delete Resource">
              <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Wire action buttons
    tbody.querySelectorAll(".icon-action-btn.edit").forEach((btn) => {
      btn.addEventListener("click", () => openEditResourceModal(btn.dataset.id));
    });

    tbody.querySelectorAll(".icon-action-btn.delete").forEach((btn) => {
      btn.addEventListener("click", () => handleDeleteResource(btn.dataset.id));
    });
  }

  // Filter Table Events
  function setupFilters() {
    const searchInp = document.getElementById("filter-search");
    const typeSel = document.getElementById("filter-type");
    const courseSel = document.getElementById("filter-course");
    const subjectInp = document.getElementById("filter-subject");

    function applyFilters() {
      const searchVal = searchInp.value.toLowerCase().trim();
      const typeVal = typeSel.value;
      const courseVal = courseSel.value;
      const subjectVal = subjectInp.value.toLowerCase().trim();

      const filtered = allResources.filter((res) => {
        const matchesSearch = !searchVal || 
          res.title.toLowerCase().includes(searchVal) || 
          (res.tags && res.tags.some(t => t.toLowerCase().includes(searchVal)));
        const matchesType = !typeVal || res.type === typeVal;
        const matchesCourse = !courseVal || res.course === courseVal;
        const matchesSubject = !subjectVal || (res.subject && res.subject.toLowerCase().includes(subjectVal));

        return matchesSearch && matchesType && matchesCourse && matchesSubject;
      });

      renderResourcesTable(filtered);
    }

    [searchInp, typeSel, courseSel, subjectInp].forEach((el) => {
      if (el) el.addEventListener("input", applyFilters);
    });
  }

  // Modals management
  function setupResourceModals() {
    const addModal = document.getElementById("addResourceModal");
    const openAddBtn = document.getElementById("openAddResourceModalBtn");
    const uploadButtons = [openAddBtn, document.getElementById("openAddResourceModalBtnTop"), document.getElementById("quickUpload"), document.getElementById("quickUploadAction")].filter(Boolean);
    const closeAddBtn = document.getElementById("closeAddResourceModalBtn");

    const openAddModal = () => {
      document.getElementById("addResourceForm").reset();
      document.getElementById("add-form-message").textContent = "";
      addModal.hidden = false;
    };
    uploadButtons.forEach((button) => button.addEventListener("click", openAddModal));

    closeAddBtn?.addEventListener("click", () => {
      addModal.hidden = true;
    });

    const editModal = document.getElementById("editResourceModal");
    const closeEditBtn = document.getElementById("closeEditResourceModalBtn");
    closeEditBtn?.addEventListener("click", () => {
      editModal.hidden = true;
    });

    // Form Submissions
    document.getElementById("addResourceForm")?.addEventListener("submit", handleAddResourceSubmit);
    document.getElementById("editResourceForm")?.addEventListener("submit", handleEditResourceSubmit);
  }

  async function handleAddResourceSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const msgEl = document.getElementById("add-form-message");
    const submitBtn = document.getElementById("addResourceSubmitBtn");

    if (submitBtn) submitBtn.disabled = true;
    if (msgEl) {
      msgEl.textContent = "Creating...";
      msgEl.className = "form-message";
    }

    const title = document.getElementById("add-title").value.trim();
    const description = document.getElementById("add-description").value.trim();
    const type = document.getElementById("add-type").value;
    const course = document.getElementById("add-course").value;
    const subject = document.getElementById("add-subject").value.trim();
    const semester = document.getElementById("add-semester").value.trim();
    const fileUrl = document.getElementById("add-fileUrl").value.trim();
    const thumbnail = document.getElementById("add-thumbnail").value.trim();
    const tagsString = document.getElementById("add-tags").value.trim();
    const published = document.getElementById("add-published").checked;

    if (!title || !subject || !fileUrl) {
      if (msgEl) {
        msgEl.textContent = "Please fill in all required fields.";
        msgEl.className = "form-message error";
      }
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const tags = tagsString ? tagsString.split(",").map((t) => t.trim()).filter(Boolean) : [];

    const resourceData = {
      title, description, type, course, subject, semester, fileUrl, thumbnail, tags, published
    };

    try {
      await addResource(resourceData, auth.currentUser.uid);
      if (msgEl) {
        msgEl.textContent = "Resource created successfully!";
        msgEl.className = "form-message success";
      }
      form.reset();
      setTimeout(async () => {
        document.getElementById("addResourceModal").hidden = true;
        await loadResources();
      }, 1000);
    } catch (error) {
      console.error(error);
      if (msgEl) {
        msgEl.textContent = "Error saving resource. Please try again.";
        msgEl.className = "form-message error";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // Populate Edit Modal
  function openEditResourceModal(id) {
    const res = allResources.find((r) => r.id === id);
    if (!res) return;

    document.getElementById("edit-id").value = res.id;
    document.getElementById("edit-title").value = res.title || "";
    document.getElementById("edit-description").value = res.description || "";
    document.getElementById("edit-type").value = res.type || "Notes";
    document.getElementById("edit-course").value = res.course || "MEG-01";
    document.getElementById("edit-subject").value = res.subject || "";
    document.getElementById("edit-semester").value = res.semester || "";
    document.getElementById("edit-fileUrl").value = res.fileUrl || "";
    document.getElementById("edit-thumbnail").value = res.thumbnail || "";
    document.getElementById("edit-tags").value = res.tags ? res.tags.join(", ") : "";
    document.getElementById("edit-published").checked = !!res.published;

    document.getElementById("edit-form-message").textContent = "";
    document.getElementById("editResourceModal").hidden = false;
  }

  async function handleEditResourceSubmit(e) {
    e.preventDefault();
    const msgEl = document.getElementById("edit-form-message");
    const submitBtn = document.getElementById("editResourceSubmitBtn");

    if (submitBtn) submitBtn.disabled = true;
    if (msgEl) {
      msgEl.textContent = "Saving changes...";
      msgEl.className = "form-message";
    }

    const id = document.getElementById("edit-id").value;
    const title = document.getElementById("edit-title").value.trim();
    const description = document.getElementById("edit-description").value.trim();
    const type = document.getElementById("edit-type").value;
    const course = document.getElementById("edit-course").value;
    const subject = document.getElementById("edit-subject").value.trim();
    const semester = document.getElementById("edit-semester").value.trim();
    const fileUrl = document.getElementById("edit-fileUrl").value.trim();
    const thumbnail = document.getElementById("edit-thumbnail").value.trim();
    const tagsString = document.getElementById("edit-tags").value.trim();
    const published = document.getElementById("edit-published").checked;

    if (!title || !subject || !fileUrl) {
      if (msgEl) {
        msgEl.textContent = "Please fill in all required fields.";
        msgEl.className = "form-message error";
      }
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const tags = tagsString ? tagsString.split(",").map((t) => t.trim()).filter(Boolean) : [];

    const resourceData = {
      title, description, type, course, subject, semester, fileUrl, thumbnail, tags, published
    };

    try {
      await updateResource(id, resourceData);
      if (msgEl) {
        msgEl.textContent = "Changes saved successfully!";
        msgEl.className = "form-message success";
      }
      setTimeout(async () => {
        document.getElementById("editResourceModal").hidden = true;
        await loadResources();
      }, 1000);
    } catch (error) {
      console.error(error);
      if (msgEl) {
        msgEl.textContent = "Failed to update resource. Try again.";
        msgEl.className = "form-message error";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function handleDeleteResource(id) {
    const res = allResources.find((r) => r.id === id);
    if (!res) return;

    if (confirm(`Are you sure you want to delete the resource "${res.title}"? This cannot be undone.`)) {
      try {
        await deleteResource(id);
        await loadResources();
      } catch (error) {
        console.error(error);
        alert("Failed to delete resource. Please try again.");
      }
    }
  }

  /* =========================================================
     USER MANAGEMENT SECTION
     ========================================================= */

  async function loadUsers() {
    try {
      allUsers = await getAllUsers();
      renderUsersTable(allUsers);
      refreshAnalytics();
    } catch (error) {
      console.error("[Admin Panel] Error loading users:", error);
    }
  }

  async function loadGames() {
    try {
      allGames = await getGames();
      renderGames(allGames);
    } catch (error) {
      console.error("[Admin Panel] Error loading games:", error);
      const empty = document.getElementById("games-empty");
      if (empty) { empty.hidden = false; empty.querySelector("p").textContent = "Games could not be loaded."; }
    }
  }

  function renderGames(list) {
    const body = document.getElementById("games-list-tbody");
    const empty = document.getElementById("games-empty");
    if (!body || !empty) return;
    body.innerHTML = "";
    empty.hidden = list.length > 0;
    list.forEach((game) => {
      const updated = asDate(game.updatedAt)?.toLocaleDateString("en-IN") || "—";
      const row = document.createElement("tr");
      row.innerHTML = `<td data-label="Name"><strong>${escapeHtml(game.title)}</strong><br><small>${escapeHtml(game.slug)}</small></td><td data-label="Status"><span class="badge badge-draft">${escapeHtml(game.status)}</span></td><td data-label="Visibility">${escapeHtml(game.visibility)}</td><td data-label="Featured">${game.featured ? "Yes" : "No"}</td><td data-label="Updated">${updated}</td><td data-label="Actions"><div class="action-buttons"><button class="icon-action-btn edit" data-game-edit="${game.id}" aria-label="Edit ${escapeHtml(game.title)}"><svg class="icon"><use href="#icon-edit"></use></svg></button><button class="icon-action-btn delete" data-game-archive="${game.id}" aria-label="Archive ${escapeHtml(game.title)}"><svg class="icon"><use href="#icon-trash"></use></svg></button></div></td>`;
      body.appendChild(row);
    });
    body.querySelectorAll("[data-game-edit]").forEach((button) => button.addEventListener("click", () => openGameModal(allGames.find((game) => game.id === button.dataset.gameEdit))));
    body.querySelectorAll("[data-game-archive]").forEach((button) => button.addEventListener("click", async () => {
      const game = allGames.find((item) => item.id === button.dataset.gameArchive);
      if (game && confirm(`Archive ${game.title}? It will no longer be public.`)) { await archiveGame(game.id, auth.currentUser.uid); await loadGames(); }
    }));
  }

  function setupGames() {
    const modal = document.getElementById("gameModal");
    const form = document.getElementById("gameForm");
    const message = document.getElementById("game-message");
    const filter = () => {
      const term = document.getElementById("game-search").value.toLowerCase();
      const status = document.getElementById("game-status").value;
      renderGames(allGames.filter((game) => (!term || `${game.title} ${game.slug}`.toLowerCase().includes(term)) && (!status || game.status === status)));
    };
    document.getElementById("game-search")?.addEventListener("input", filter);
    document.getElementById("game-status")?.addEventListener("change", filter);
    document.getElementById("openGameModalBtn")?.addEventListener("click", () => openGameModal());
    document.getElementById("closeGameModalBtn")?.addEventListener("click", () => { modal.hidden = true; });
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = { title: document.getElementById("game-title").value, slug: document.getElementById("game-slug").value, launchUrl: document.getElementById("game-launch-url").value, status: document.getElementById("game-status-input").value, visibility: document.getElementById("game-visibility").value, tags: document.getElementById("game-tags").value.split(",").map((tag) => tag.trim()).filter(Boolean), featured: document.getElementById("game-featured").checked, deleted: false };
      try {
        const id = document.getElementById("game-id").value;
        if (id) await updateGame(id, data, auth.currentUser.uid); else await createGame(data, auth.currentUser.uid);
        modal.hidden = true; await loadGames();
      } catch (error) { message.textContent = error.message || "Could not save game."; message.className = "form-message error"; }
    });
  }

  function openGameModal(game) {
    const modal = document.getElementById("gameModal");
    document.getElementById("gameForm").reset();
    document.getElementById("game-message").textContent = "";
    document.getElementById("gameModalTitle").textContent = game ? "Edit game" : "Add game";
    document.getElementById("game-id").value = game?.id || "";
    document.getElementById("game-title").value = game?.title || "";
    document.getElementById("game-slug").value = game?.slug || "";
    document.getElementById("game-launch-url").value = game?.launchUrl || "";
    document.getElementById("game-status-input").value = game?.status || "draft";
    document.getElementById("game-visibility").value = game?.visibility || "public";
    document.getElementById("game-tags").value = game?.tags?.join(", ") || "";
    document.getElementById("game-featured").checked = !!game?.featured;
    modal.hidden = false;
  }

  function renderUsersTable(list) {
    const tbody = document.getElementById("users-list-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    list.forEach((user) => {
      const tr = document.createElement("tr");

      // Format registration timestamp
      let regString = "N/A";
      if (user.createdAt) {
        if (user.createdAt.toDate) regString = user.createdAt.toDate().toLocaleDateString("en-IN");
        else regString = new Date(user.createdAt).toLocaleDateString("en-IN");
      }

      // Format last login timestamp
      let activeString = "N/A";
      if (user.lastLogin) {
        if (user.lastLogin.toDate) activeString = user.lastLogin.toDate().toLocaleString("en-IN");
        else activeString = new Date(user.lastLogin).toLocaleString("en-IN");
      }

      const roleBadgeClass = user.role === "admin" ? "badge-admin" : "badge-student";

      tr.innerHTML = `
        <td data-label="Name" style="font-weight: 600; color: var(--color-text);">${escapeHtml(user.displayName || "User")}</td>
        <td data-label="Username">${escapeHtml(user.username || "")}</td>
        <td data-label="Provider"><span class="badge badge-draft">${escapeHtml(user.provider || "password")}</span></td>
        <td data-label="Registered">${regString}</td>
        <td data-label="Last Active">${activeString}</td>
        <td data-label="Role">
          <select class="role-select" data-uid="${user.uid}">
            <option value="student" ${user.role === "student" ? "selected" : ""}>Student</option>
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Wire Role selectors change event
    tbody.querySelectorAll(".role-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const uid = select.dataset.uid;
        const newRole = select.value;

        // Prevent admin from removing their own admin role
        if (uid === auth.currentUser.uid && newRole !== "admin") {
          alert("Safety Check: You cannot demote yourself from the admin role.");
          select.value = "admin";
          return;
        }

        if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
          try {
            await updateUserRole(uid, newRole);
            await loadUsers();
          } catch (error) {
            console.error(error);
            alert("Failed to update user role. Please try again.");
          }
        } else {
          // Reset select option to database value
          select.value = newRole === "admin" ? "student" : "admin";
        }
      });
    });
  }

  // Helper utility to safely escape HTML
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
