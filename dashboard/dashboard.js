/* =========================================================
   MEGOL — IGNOU Study Hub — Dashboard Behaviour
   Integrated with Firebase Auth and Firestore.
   ========================================================= */

import { app } from "../src/firebase.js";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { createUserDocument, getUserProfile } from "../src/firestore.js";

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
    } catch (error) {
      console.error("[Dashboard] Error loading user profile:", error);
    }
  });

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

    // Populate helper items for email, createdAt, and lastLogin
    // Since there are no layout placeholders for these in the original UI, we log them and safely bind them if elements exist.
    // We will append a user profile metadata panel dynamically inside the dropdown menu header for visual confirmation
    injectProfileMetadata(profile);
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

    // Format timestamps safely
    const formatTimestamp = (ts) => {
      if (!ts) return "N/A";
      if (ts.toDate) return ts.toDate().toLocaleString("en-IN");
      if (ts instanceof Date) return ts.toLocaleString("en-IN");
      return new Date(ts).toLocaleString("en-IN");
    };

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

  // Close drawer automatically when a nav link is chosen on mobile
  document.querySelectorAll(".nav-link:not(.logout)").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      
      const navTarget = link.dataset.nav;
      console.log(`[Navigation] Selected tab: ${navTarget}`);
      // TODO: Render dynamic content or route views corresponding to navigation link selected (bookmarks, notes, progress, quizzes, settings)

      if (window.innerWidth <= 900) closeSidebar();
    });
  });

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
