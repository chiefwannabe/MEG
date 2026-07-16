/* =========================================================
   MEGOL — IGNOU Study Hub — Admin Dashboard Logic
   Access control, Resource Management, User Permissions, and Analytics.
   ========================================================= */

import { app } from "../src/firebase.js";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { 
  getUserProfile, 
  addResource, 
  updateResource, 
  deleteResource, 
  getAllResources, 
  getAllUsers, 
  updateUserRole, 
  getAnalyticsCounts 
} from "../src/firestore.js";

(async function () {
  "use strict";

  const auth = getAuth(app);
  let currentUserProfile = null;
  let allResources = [];
  let allUsers = [];

  // Protect Admin Dashboard: Strict Access Control Check
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.warn("[Admin Auth] Unauthenticated access attempt. Redirecting...");
      window.location.replace("../index.html");
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
    await refreshAnalytics();
    await loadResources();
    await loadUsers();
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
      avatarEl.src = currentUserProfile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserProfile.displayName || "Admin")}&backgroundColor=2563eb&textColor=ffffff`;
      avatarEl.alt = currentUserProfile.displayName || "Admin Avatar";
    }

    const nameEl = document.getElementById("topbar-admin-name");
    if (nameEl) nameEl.textContent = currentUserProfile.displayName || "Admin";
  }

  // Load and refresh stats
  async function refreshAnalytics() {
    try {
      const counts = await getAnalyticsCounts();
      document.getElementById("stat-total-users").textContent = counts.totalUsers;
      document.getElementById("stat-total-resources").textContent = counts.totalResources;
      document.getElementById("stat-total-notes").textContent = counts.totalNotes;
      document.getElementById("stat-total-pyqs").textContent = counts.totalPYQs;
      document.getElementById("stat-total-books").textContent = counts.totalBooks;
    } catch (error) {
      console.error("[Admin Panel] Error loading analytics counts:", error);
    }
  }

  // View Switcher logic
  function setupNavigation() {
    const panels = document.querySelectorAll(".admin-panel");
    const navLinks = document.querySelectorAll(".side-nav .nav-link:not(.logout)");

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
      } else if (target === "resources") {
        document.getElementById("panel-resources").hidden = false;
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
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(link.dataset.nav);
        if (window.innerWidth <= 900) closeSidebar();
      });
    });

    // Logout
    document.querySelectorAll(".logout").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          window.location.replace("../index.html");
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

    // Key shortcut "/" for search
    const searchInput = document.getElementById("globalSearch");
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput?.focus();
      }
    });
  }

  /* =========================================================
     RESOURCE MANAGEMENT ACTIONS & FORM HOOKS
     ========================================================= */

  async function loadResources() {
    try {
      allResources = await getAllResources();
      renderResourcesTable(allResources);
      setupFilters();
      setupResourceModals();
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
              <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
            </button>
            <button class="icon-action-btn delete" data-id="${res.id}" title="Delete Resource">
              <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
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
    const closeAddBtn = document.getElementById("closeAddResourceModalBtn");

    openAddBtn?.addEventListener("click", () => {
      document.getElementById("addResourceForm").reset();
      document.getElementById("add-form-message").textContent = "";
      addModal.hidden = false;
    });

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
    } catch (error) {
      console.error("[Admin Panel] Error loading users:", error);
    }
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
