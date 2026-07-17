/**
 * auth.js — Firebase Authentication Module
 * IGNOU Study Hub
 *
 * Features:
 *   - Email/Password Sign Up (with displayName profile update)
 *   - Email/Password Login
 *   - Google Sign-In (popup)
 *   - Password Reset via email
 *   - Logout
 *   - Persistent Login (Firebase handles this via IndexedDB by default)
 *   - Auth State Listener (onAuthStateChanged)
 *
 * UI Integration:
 *   - Replaces Sign In button with user avatar/menu on login
 *   - Restores Sign In button on logout
 *   - Fully functional for guests (no auth required to browse)
 */

import { app } from "../src/firebase.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import { createUserDocument, getUserProfile, isUsernameUnique, updateUserSettings } from "../src/firestore.js";

/* ================================================================
   AUTH INSTANCE
   ================================================================ */

const auth = getAuth(app);

/* ================================================================
   STATE
   ================================================================ */

const AuthState = {
  currentUser: null, // Firebase User object or null
  isLoading:   false, // Prevent double-submits
};

/* ================================================================
   UI HELPERS
   ================================================================ */

/** Show a status message inside a panel */
function showMessage(panelId, type, text) {
  const el = document.querySelector(`#${panelId} .auth-message`);
  if (!el) return;
  el.className  = `auth-message ${type}`;
  el.textContent = text;
}

/** Clear all messages in a panel */
function clearMessages(panelId) {
  const el = document.querySelector(`#${panelId} .auth-message`);
  if (el) el.className = "auth-message";
}

/** Mark a field as errored */
function fieldError(input, message) {
  const field = input.closest(".auth-field");
  if (!field) return;
  field.classList.add("has-error");
  input.classList.add("error");
  const errEl = field.querySelector(".field-error");
  if (errEl) errEl.textContent = message;
}

/** Clear all field errors in a form */
function clearFieldErrors(form) {
  form.querySelectorAll(".auth-field").forEach((f) => {
    f.classList.remove("has-error");
    f.querySelectorAll("input").forEach((i) => i.classList.remove("error"));
  });
}

/** Update submit button loading state */
function setLoading(btn, loading, defaultText) {
  if (loading) {
    btn.classList.add("loading");
    btn.textContent = "Please wait…";
  } else {
    btn.classList.remove("loading");
    btn.textContent = defaultText;
  }
}

/** Get initials from a display name or email */
function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/[\s@]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail[0].toUpperCase();
}

/** Map Firebase error codes → human-friendly strings */
function friendlyError(err) {
  if (!err) return "An unexpected error occurred.";
  const code = err.code || "";
  const map = {
    "auth/user-not-found":          "No account found with this username.",
    "auth/wrong-password":          "Incorrect password. Please try again.",
    "auth/invalid-credential":      "Incorrect username or password. Please try again.",
    "auth/email-already-in-use":    "This username is already registered. Try signing in.",
    "auth/weak-password":           "Password is too weak. Use at least 6 characters.",
    "auth/invalid-email":           "Invalid username format.",
    "auth/too-many-requests":       "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed":  "Network error. Check your connection.",
    "auth/popup-closed-by-user":    "Sign-in cancelled.",
    "auth/cancelled-popup-request": "Sign-in cancelled.",
    "auth/popup-blocked":           "Popup blocked. Please allow popups for this site.",
  };
  return map[code] || err.message || "Something went wrong. Please try again.";
}

/* ================================================================
   MODAL — open / close / tab switching
   ================================================================ */

function openModal(initialTab = "signin") {
  const overlay = document.getElementById("auth-overlay");
  if (!overlay) return;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  switchTab(initialTab);
}

function closeModal() {
  const overlay = document.getElementById("auth-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  // Reset all forms and clear messages/errors
  document.querySelectorAll(".auth-panel form").forEach((f) => f.reset());
  ["panel-signin", "panel-register", "panel-forgot"].forEach(clearMessages);
  document.querySelectorAll(".auth-field").forEach((f) => {
    f.classList.remove("has-error");
    f.querySelectorAll("input").forEach((i) => i.classList.remove("error"));
  });
}

function switchTab(tab) {
  // Tab buttons
  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
    btn.setAttribute("aria-selected", btn.dataset.tab === tab ? "true" : "false");
  });

  // Panels
  ["panel-signin", "panel-register", "panel-forgot"].forEach((panelId) => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const show = panelId === `panel-${tab}`;
    panel.classList.toggle("active", show);
  });

  // Modal header text
  const titleMap = {
    signin:   ["Welcome Back",      "Sign in to your account"],
    register: ["Create Account",    "Join thousands of IGNOU students"],
    forgot:   ["Reset Password",    "We'll email you a reset link"],
  };
  const [title, sub] = titleMap[tab] || ["Sign In", ""];
  const h2 = document.querySelector(".auth-card-header h2");
  const p  = document.querySelector(".auth-card-header p");
  if (h2) h2.textContent = title;
  if (p)  p.textContent  = sub;
}

/* ================================================================
   AUTH STATE — update UI when user logs in or out
   ================================================================ */

async function handleAuthStateChanged(user) {
  AuthState.currentUser = user;

  const signinBtn = document.getElementById("btn-signin");
  const userMenu  = document.getElementById("user-menu");

  const mDashboard = document.querySelector(".mobile-nav-item-dashboard");
  const mAdmin = document.querySelector(".mobile-nav-item-admin");
  const mLogout = document.querySelector(".mobile-nav-item-logout");
  const dAdmin = document.querySelector(".ud-admin-link");

  if (user) {
    // --- Logged in ---
    if (signinBtn) signinBtn.style.display = "none";

    // Show mobile items
    if (mDashboard) mDashboard.style.display = "block";
    if (mLogout) mLogout.style.display = "block";

    // Fetch user profile to check for admin role
    try {
      const profile = await getUserProfile(user.uid);
      if (profile && profile.role === "admin") {
        if (mAdmin) mAdmin.style.display = "block";
        if (dAdmin) dAdmin.style.display = "block";
      } else {
        if (mAdmin) mAdmin.style.display = "none";
        if (dAdmin) dAdmin.style.display = "none";
      }

      // Also apply theme from profile settings if available
      if (profile && profile.settings && typeof profile.settings.darkMode !== "undefined") {
        const isDark = profile.settings.darkMode;
        const currentLocalDark = document.body.classList.contains("dark-theme");
        if (isDark !== currentLocalDark) {
          const newTheme = isDark ? "dark" : "light";
          document.body.classList.toggle("dark-theme", isDark);
          localStorage.setItem("theme", newTheme);
          // Dispatch event to sync toggle icons globally
          document.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: newTheme } }));
        }
      }
    } catch (e) {
      console.error("[Auth] Error fetching user role:", e);
    }

    if (userMenu) {
      userMenu.classList.add("active");

      const username    = user.email ? user.email.split("@")[0] : "";
      const displayName = user.displayName || username || "User";
      const initials    = getInitials(displayName);

      // Avatar: photo or initials
      const avatarEl = userMenu.querySelector(".user-avatar");
      if (avatarEl) {
        if (user.photoURL) {
          avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" referrerpolicy="no-referrer" />`;
        } else {
          avatarEl.innerHTML = `<img src="/assets/images/default-avatar.svg" alt="${displayName}" referrerpolicy="no-referrer" />`;
        }
      }

      // Short name in nav button
      const nameEl = userMenu.querySelector(".user-display-name");
      if (nameEl) nameEl.textContent = displayName.split(" ")[0];

      // Dropdown header (full name + username)
      const udName  = userMenu.querySelector(".ud-name");
      const udEmail = userMenu.querySelector(".ud-email");
      if (udName)  udName.textContent  = displayName;
      if (udEmail) udEmail.textContent = username ? `@${username}` : "";
    }
  } else {
    // --- Logged out ---
    if (signinBtn) signinBtn.style.display = "";

    // Hide mobile items
    if (mDashboard) mDashboard.style.display = "none";
    if (mAdmin) mAdmin.style.display = "none";
    if (mLogout) mLogout.style.display = "none";
    if (dAdmin) dAdmin.style.display = "none";

    if (userMenu) {
      userMenu.classList.remove("active", "open");
      const avatarEl = userMenu.querySelector(".user-avatar");
      if (avatarEl) {
        avatarEl.innerHTML  = "";
        avatarEl.textContent = "?";
      }
      const nameEl = userMenu.querySelector(".user-display-name");
      if (nameEl) nameEl.textContent = "";
    }
  }
}

/* ================================================================
   USER MENU DROPDOWN
   ================================================================ */

function toggleUserMenu() {
  const menu = document.getElementById("user-menu");
  if (!menu) return;
  const isOpen = menu.classList.toggle("open");
  const btn    = document.getElementById("user-avatar-btn");
  if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeUserMenu() {
  const menu = document.getElementById("user-menu");
  if (!menu) return;
  menu.classList.remove("open");
  const btn = document.getElementById("user-avatar-btn");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

/* ================================================================
   USERNAME RULES
   ================================================================ */

/** Usernames that cannot be registered by ordinary users */
const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "owner", "support",
  "system", "firebase", "api", "meg", "mod", "moderator",
  "staff", "help", "info", "contact", "megol",
]);

/**
 * Validates a username against all rules.
 * Returns null if valid, or an error string if invalid.
 *
 * Rules:
 *  - Lowercase letters, digits, underscores, hyphens only
 *  - 3–20 characters
 *  - Cannot be a reserved word
 */
function validateUsername(raw) {
  if (!raw || raw.trim().length === 0) {
    return "Username is required.";
  }
  const username = raw.trim().toLowerCase();
  if (username.length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (username.length > 20) {
    return "Username cannot exceed 20 characters.";
  }
  // Only allow: a-z, 0-9, underscore, hyphen
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return "Username may only contain letters, numbers, underscores (_), and hyphens (-).";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "This username is reserved and cannot be used. Please choose a different one.";
  }
  return null; // valid
}

/* ================================================================
   FORM ACTIONS
   ================================================================ */

/* ── Username/Password Sign In ──────────────────────────────────── */
async function handleSignIn(e) {
  e.preventDefault();
  if (AuthState.isLoading) return;

  const form    = e.target;
  const usernameEl = form.querySelector("#signin-username");
  const passEl  = form.querySelector("#signin-password");
  const btn     = form.querySelector(".auth-submit-btn");

  clearFieldErrors(form);
  clearMessages("panel-signin");

  // Normalise to lowercase immediately — usernames are case-insensitive
  const username = usernameEl.value.trim().toLowerCase();
  usernameEl.value = username; // reflect normalised value in field

  let valid = true;
  const usernameError = validateUsername(username);
  if (usernameError) {
    fieldError(usernameEl, usernameError);
    valid = false;
  }
  if (!passEl.value || passEl.value.length < 6) {
    fieldError(passEl, "Password must be at least 6 characters.");
    valid = false;
  }
  if (!valid) return;

  AuthState.isLoading = true;
  setLoading(btn, true, "Sign In");

  try {
    // Firebase Auth email is derived from the lowercase username
    const email = `${username}@meg.local`;
    await signInWithEmailAndPassword(auth, email, passEl.value);
    closeModal();
  } catch (err) {
    showMessage("panel-signin", "error", friendlyError(err));
  } finally {
    AuthState.isLoading = false;
    setLoading(btn, false, "Sign In");
  }
}

/* ── Username/Password Sign Up ──────────────────────────────────── */
async function handleRegister(e) {
  e.preventDefault();
  if (AuthState.isLoading) return;

  const form    = e.target;
  const nameEl  = form.querySelector("#reg-name");
  const usernameEl = form.querySelector("#reg-username");
  const passEl  = form.querySelector("#reg-password");
  const pass2El = form.querySelector("#reg-password2");
  const btn     = form.querySelector(".auth-submit-btn");

  clearFieldErrors(form);
  clearMessages("panel-register");

  let valid = true;
  if (!nameEl.value.trim()) {
    fieldError(nameEl, "Please enter your name.");
    valid = false;
  }

  // Normalise to lowercase immediately — usernames are stored in lowercase only
  const username = usernameEl.value.trim().toLowerCase();
  usernameEl.value = username; // reflect normalised value in field

  console.log(`[handleRegister] Step 1: Starting validateUsername for "${username}"`);
  const usernameError = validateUsername(username);
  console.log(`[handleRegister] Step 1: validateUsername completed. Result:`, usernameError);

  if (usernameError) {
    fieldError(usernameEl, usernameError);
    valid = false;
  }
  if (!passEl.value || passEl.value.length < 6) {
    fieldError(passEl, "Password must be at least 6 characters.");
    valid = false;
  }
  if (passEl.value !== pass2El.value) {
    fieldError(pass2El, "Passwords do not match.");
    valid = false;
  }
  if (!valid) return;

  AuthState.isLoading = true;
  setLoading(btn, true, "Create Account");

  try {
    // Check uniqueness against Firestore (username stored in lowercase)
    console.log(`[handleRegister] Step 2: Starting isUsernameUnique check for "${username}"`);
    const isUnique = await isUsernameUnique(username);
    console.log(`[handleRegister] Step 2: isUsernameUnique check completed. Result: isUnique = ${isUnique}`);

    if (!isUnique) {
      fieldError(usernameEl, "This username is already taken. Please choose a different one.");
      AuthState.isLoading = false;
      setLoading(btn, false, "Create Account");
      return;
    }

    // Firebase Auth stores: username@meg.local + hashed password (handled by Firebase)
    // Firestore stores: uid, username, createdAt, role — NO password ever
    const email = `${username}@meg.local`;
    console.log(`[handleRegister] Step 3: Starting createUserWithEmailAndPassword for synthetic email "${email}"`);
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      passEl.value
    );
    console.log(`[handleRegister] Step 3: createUserWithEmailAndPassword completed successfully. user.uid = ${user?.uid}`);

    // Set the display name on the Firebase Auth profile
    await updateProfile(user, { displayName: nameEl.value.trim() });
    // onAuthStateChanged won't re-fire for profile updates — call manually
    handleAuthStateChanged(auth.currentUser);
    closeModal();
  } catch (err) {
    console.error(`[handleRegister] Error occurred during signup process!`, err);
    showMessage("panel-register", "error", friendlyError(err));
  } finally {
    AuthState.isLoading = false;
    setLoading(btn, false, "Create Account");
  }
}

/* ── Password Reset (Stubbed for username-only login UI) ────────── */
async function handleForgotPassword(e) {
  e.preventDefault();
  showMessage("panel-forgot", "error", "Password reset is not supported in a username-only system. Please contact the administrator.");
}

/* ── Google Sign-In ─────────────────────────────────────────────── */
async function handleGoogleSignIn() {
  if (AuthState.isLoading) return;
  AuthState.isLoading = true;

  try {
    const provider = new GoogleAuthProvider();
    // Request the user's profile scope so photoURL is available
    provider.addScope("profile");
    await signInWithPopup(auth, provider);
    // onAuthStateChanged fires automatically
    closeModal();
  } catch (err) {
    if (err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request") {
      // Silent — user dismissed the popup intentionally
      return;
    }
    const activePanel = document.querySelector(".auth-panel.active");
    if (activePanel) showMessage(activePanel.id, "error", friendlyError(err));
  } finally {
    AuthState.isLoading = false;
  }
}

/* ── Logout ─────────────────────────────────────────────────────── */
async function handleLogout() {
  closeUserMenu();
  try {
    await signOut(auth);
    // onAuthStateChanged fires automatically
  } catch (err) {
    console.error("Logout error:", err);
  }
}

/* ================================================================
   INIT — Register onAuthStateChanged & wire up all event listeners
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ── Persistent Auth State Listener ─────────────────────────── */
  onAuthStateChanged(auth, (user) => {
    handleAuthStateChanged(user);
    if (user) {
      console.log(`[onAuthStateChanged] Step 4: Starting createUserDocument for user.uid = ${user.uid}`);
      createUserDocument(user).then(() => {
        console.log(`[onAuthStateChanged] Step 4: createUserDocument completed successfully for user.uid = ${user.uid}`);
      }).catch((err) => {
        console.error(`[onAuthStateChanged] Step 4: createUserDocument failed! Error:`, err);
      });
    }
  });

  /* ── Modal open / close ─────────────────────────────────────── */
  document.getElementById("btn-signin")
    ?.addEventListener("click", () => openModal("signin"));

  document.getElementById("auth-close-btn")
    ?.addEventListener("click", closeModal);

  document.getElementById("auth-overlay")
    ?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("auth-overlay")) closeModal();
    });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* ── Tab switching ──────────────────────────────────────────── */
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  /* ── Forgot password / back links ──────────────────────────── */
  document.getElementById("link-forgot-pw")
    ?.addEventListener("click", () => switchTab("forgot"));
  document.getElementById("link-go-register")
    ?.addEventListener("click", () => switchTab("register"));
  document.getElementById("link-go-signin")
    ?.addEventListener("click",  () => switchTab("signin"));
  document.getElementById("link-back-signin")
    ?.addEventListener("click",  () => switchTab("signin"));
  document.getElementById("link-back-signin2")
    ?.addEventListener("click",  () => switchTab("signin"));

  /* ── Form submissions ───────────────────────────────────────── */
  document.getElementById("form-signin")
    ?.addEventListener("submit",   handleSignIn);
  document.getElementById("form-register")
    ?.addEventListener("submit",   handleRegister);
  document.getElementById("form-forgot")
    ?.addEventListener("submit",   handleForgotPassword);

  /* ── Google sign-in buttons ─────────────────────────────────── */
  document.querySelectorAll(".btn-google").forEach((btn) => {
    btn.addEventListener("click", handleGoogleSignIn);
  });

  /* ── Password visibility toggles ───────────────────────────── */
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const isText = input.type === "text";
      input.type    = isText ? "password" : "text";
      btn.textContent = isText ? "Show" : "Hide";
    });
  });

  /* ── User avatar dropdown ───────────────────────────────────── */
  document.getElementById("user-avatar-btn")
    ?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleUserMenu();
    });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#user-menu")) closeUserMenu();
  });

  /* ── Logout button ──────────────────────────────────────────── */
  document.getElementById("btn-logout")
    ?.addEventListener("click", handleLogout);
  document.getElementById("mobile-logout-btn")
    ?.addEventListener("click", handleLogout);

  /* ── Dropdown nav links ─────────────────────────────────────── */
  document.querySelectorAll(".ud-nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      closeUserMenu();
      if (!href || href === "#") {
        e.preventDefault();
        console.info("[Auth] Navigate to:", link.dataset.page);
      }
      // Real hrefs (e.g. dashboard/dashboard.html) fall through
      // to native <a> navigation — no preventDefault needed.
    });
  });

  /* ── Mobile Hamburger Drawer Actions ────────────────────────── */
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
  const mobileNavClose = document.getElementById("mobile-nav-close");
  const drawerLinks = document.querySelectorAll(".mobile-nav-links a");

  function openMobileNav() {
    if (!mobileNavOverlay) return;
    mobileNavOverlay.hidden = false;
    // Allow display update before adding class for smooth transition
    setTimeout(() => {
      mobileNavOverlay.classList.add("open");
      hamburgerBtn?.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden"; // Prevent background scroll
    }, 10);
  }

  function closeMobileNav() {
    if (!mobileNavOverlay) return;
    mobileNavOverlay.classList.remove("open");
    hamburgerBtn?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = ""; // Restore background scroll
    setTimeout(() => {
      if (!mobileNavOverlay.classList.contains("open")) {
        mobileNavOverlay.hidden = true;
      }
    }, 250); // Match transition duration (0.25s)
  }

  hamburgerBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openMobileNav();
  });

  mobileNavClose?.addEventListener("click", closeMobileNav);

  mobileNavOverlay?.addEventListener("click", (e) => {
    // If user clicked backdrop (outside the drawer content)
    if (e.target === mobileNavOverlay) {
      closeMobileNav();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNavOverlay && !mobileNavOverlay.hidden) {
      closeMobileNav();
    }
  });

  drawerLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileNav();
    });
  });

  // Sync theme with Firestore when changed by user
  document.addEventListener("themeChanged", async (e) => {
    const isDark = e.detail.theme === "dark";
    const user = auth.currentUser;
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        const currentSettings = (profile && profile.settings) || {};
        if (currentSettings.darkMode !== isDark) {
          currentSettings.darkMode = isDark;
          await updateUserSettings(user.uid, currentSettings);
          console.log("[Auth] Updated user theme settings in Firestore.");
        }
      } catch (err) {
        console.error("[Auth] Error updating theme setting in Firestore:", err);
      }
    }
  });

  // Auto-open auth modal if redirect query parameter exists
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("login") === "true" || urlParams.get("auth") === "true") {
    openModal("signin");
  }

});
