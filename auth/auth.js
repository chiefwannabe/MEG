/**
 * auth.js — Firebase-ready Authentication Module
 * IGNOU Study Hub
 *
 * Structure:
 *   1. CONFIG       — Firebase config placeholder (fill in later)
 *   2. STATE        — In-memory auth state
 *   3. FIREBASE     — Firebase init & SDK calls (all marked TODO)
 *   4. UI HELPERS   — DOM manipulation utilities
 *   5. MODAL        — Open/close/tab logic
 *   6. FORM ACTIONS — Sign In, Register, Forgot PW, Google, Logout
 *   7. AUTH STATE   — Handle user login/logout transitions
 *   8. INIT         — Wire up all event listeners on DOMContentLoaded
 */

/* ================================================================
   1. CONFIG — Firebase Project Configuration
   ================================================================
   When ready, paste your Firebase config object here and uncomment
   the import statements and initialization below.
   ================================================================ */

// TODO: Replace with your Firebase project config
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

/* ================================================================
   2. STATE — Current authentication state
   ================================================================ */

const AuthState = {
  currentUser: null,       // Firebase User object or null
  isLoading: false,        // Prevent double-submits
  initialized: false,      // Has onAuthStateChanged fired at least once?
};

/* ================================================================
   3. FIREBASE — SDK calls (all guarded by a feature flag)
   ================================================================
   Set USE_FIREBASE = true once you've added Firebase scripts and
   filled in FIREBASE_CONFIG above.
   ================================================================ */

const USE_FIREBASE = false; // ← flip to true when integrating Firebase

let firebaseApp  = null;
let firebaseAuth = null;

function initFirebase() {
  if (!USE_FIREBASE) return;

  // TODO: import { initializeApp } from 'firebase/app';
  // TODO: import { getAuth, ... } from 'firebase/auth';

  // firebaseApp  = initializeApp(FIREBASE_CONFIG);
  // firebaseAuth = getAuth(firebaseApp);

  // TODO: onAuthStateChanged(firebaseAuth, handleAuthStateChanged);
}

/* -- Firebase auth action wrappers -------------------------------- */

async function firebaseSignInWithEmail(email, password) {
  if (!USE_FIREBASE) return _mockSignIn(email);

  // TODO: const { signInWithEmailAndPassword } = await import('firebase/auth');
  // return signInWithEmailAndPassword(firebaseAuth, email, password);
}

async function firebaseRegister(email, password) {
  if (!USE_FIREBASE) return _mockSignIn(email);

  // TODO: const { createUserWithEmailAndPassword } = await import('firebase/auth');
  // return createUserWithEmailAndPassword(firebaseAuth, email, password);
}

async function firebaseSendPasswordReset(email) {
  if (!USE_FIREBASE) return _mockReset(email);

  // TODO: const { sendPasswordResetEmail } = await import('firebase/auth');
  // return sendPasswordResetEmail(firebaseAuth, email);
}

async function firebaseSignInWithGoogle() {
  if (!USE_FIREBASE) return _mockSignIn("google.user@gmail.com", "Google User");

  // TODO: const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  // const provider = new GoogleAuthProvider();
  // return signInWithPopup(firebaseAuth, provider);
}

async function firebaseSignOut() {
  if (!USE_FIREBASE) return _mockSignOut();

  // TODO: const { signOut } = await import('firebase/auth');
  // return signOut(firebaseAuth);
}

/* ================================================================
   MOCK helpers — simulate Firebase responses during development
   Remove these once Firebase is live.
   ================================================================ */

function _mockSignIn(email, displayName) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const name = displayName || email.split("@")[0];
      resolve({ user: { email, displayName: name, photoURL: null, uid: "mock-uid-001" } });
    }, 900);
  });
}

function _mockReset(email) {
  return new Promise((resolve) => setTimeout(resolve, 700));
}

function _mockSignOut() {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

/* ================================================================
   4. UI HELPERS
   ================================================================ */

/** Show a status message inside a panel */
function showMessage(panelId, type, text) {
  const el = document.querySelector(`#${panelId} .auth-message`);
  if (!el) return;
  el.className = `auth-message ${type}`;
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

/* ================================================================
   5. MODAL — open / close / tab switching
   ================================================================ */

const PANELS = ["panel-signin", "panel-register", "panel-forgot"];
const TABS   = ["tab-signin",   "tab-register",   null]; // forgot has no tab button

function openModal(initialTab = "signin") {
  const overlay = document.getElementById("auth-overlay");
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  switchTab(initialTab);
}

function closeModal() {
  const overlay = document.getElementById("auth-overlay");
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  // Clear all forms
  document.querySelectorAll(".auth-panel form").forEach((f) => f.reset());
  PANELS.forEach((p) => clearMessages(p));
  document.querySelectorAll(".auth-field").forEach((f) => {
    f.classList.remove("has-error");
    f.querySelectorAll("input").forEach((i) => i.classList.remove("error"));
  });
}

function switchTab(tab) {
  // Update tab buttons
  const tabBtns = document.querySelectorAll(".auth-tab");
  tabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  // Update panels
  PANELS.forEach((panelId) => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const show = panelId === `panel-${tab}`;
    panel.classList.toggle("active", show);
  });

  // Update modal header text
  const titleMap = {
    signin:   ["Welcome Back", "Sign in to your account"],
    register: ["Create Account", "Join thousands of IGNOU students"],
    forgot:   ["Reset Password",  "We'll email you a reset link"],
  };
  const [title, sub] = titleMap[tab] || ["Sign In", ""];
  const h2 = document.querySelector(".auth-card-header h2");
  const p  = document.querySelector(".auth-card-header p");
  if (h2) h2.textContent = title;
  if (p)  p.textContent  = sub;
}

/* ================================================================
   6. FORM ACTIONS
   ================================================================ */

/* -- Sign In ---------------------------------------------------- */
async function handleSignIn(e) {
  e.preventDefault();
  if (AuthState.isLoading) return;

  const form     = e.target;
  const emailEl  = form.querySelector("#signin-email");
  const passEl   = form.querySelector("#signin-password");
  const btn      = form.querySelector(".auth-submit-btn");

  clearFieldErrors(form);
  clearMessages("panel-signin");

  // Basic validation
  let valid = true;
  if (!emailEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
    fieldError(emailEl, "Enter a valid email address."); valid = false;
  }
  if (!passEl.value || passEl.value.length < 6) {
    fieldError(passEl, "Password must be at least 6 characters."); valid = false;
  }
  if (!valid) return;

  AuthState.isLoading = true;
  setLoading(btn, true, "Sign In");

  try {
    const result = await firebaseSignInWithEmail(emailEl.value.trim(), passEl.value);
    handleAuthStateChanged(result.user);
    closeModal();
  } catch (err) {
    showMessage("panel-signin", "error", _friendlyError(err));
  } finally {
    AuthState.isLoading = false;
    setLoading(btn, false, "Sign In");
  }
}

/* -- Register --------------------------------------------------- */
async function handleRegister(e) {
  e.preventDefault();
  if (AuthState.isLoading) return;

  const form    = e.target;
  const nameEl  = form.querySelector("#reg-name");
  const emailEl = form.querySelector("#reg-email");
  const passEl  = form.querySelector("#reg-password");
  const pass2El = form.querySelector("#reg-password2");
  const btn     = form.querySelector(".auth-submit-btn");

  clearFieldErrors(form);
  clearMessages("panel-register");

  let valid = true;
  if (!nameEl.value.trim()) {
    fieldError(nameEl, "Please enter your name."); valid = false;
  }
  if (!emailEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
    fieldError(emailEl, "Enter a valid email address."); valid = false;
  }
  if (!passEl.value || passEl.value.length < 6) {
    fieldError(passEl, "Password must be at least 6 characters."); valid = false;
  }
  if (passEl.value !== pass2El.value) {
    fieldError(pass2El, "Passwords do not match."); valid = false;
  }
  if (!valid) return;

  AuthState.isLoading = true;
  setLoading(btn, true, "Create Account");

  try {
    const result = await firebaseRegister(emailEl.value.trim(), passEl.value);
    // TODO: update Firebase profile displayName
    // await updateProfile(result.user, { displayName: nameEl.value.trim() });
    result.user.displayName = nameEl.value.trim(); // mock override
    handleAuthStateChanged(result.user);
    closeModal();
  } catch (err) {
    showMessage("panel-register", "error", _friendlyError(err));
  } finally {
    AuthState.isLoading = false;
    setLoading(btn, false, "Create Account");
  }
}

/* -- Forgot Password -------------------------------------------- */
async function handleForgotPassword(e) {
  e.preventDefault();
  if (AuthState.isLoading) return;

  const form    = e.target;
  const emailEl = form.querySelector("#forgot-email");
  const btn     = form.querySelector(".auth-submit-btn");

  clearFieldErrors(form);
  clearMessages("panel-forgot");

  if (!emailEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
    fieldError(emailEl, "Enter a valid email address.");
    return;
  }

  AuthState.isLoading = true;
  setLoading(btn, true, "Send Reset Link");

  try {
    await firebaseSendPasswordReset(emailEl.value.trim());
    showMessage("panel-forgot", "success", "Reset link sent! Check your email inbox.");
    form.reset();
  } catch (err) {
    showMessage("panel-forgot", "error", _friendlyError(err));
  } finally {
    AuthState.isLoading = false;
    setLoading(btn, false, "Send Reset Link");
  }
}

/* -- Google Sign-In --------------------------------------------- */
async function handleGoogleSignIn() {
  if (AuthState.isLoading) return;
  AuthState.isLoading = true;

  try {
    const result = await firebaseSignInWithGoogle();
    handleAuthStateChanged(result.user);
    closeModal();
  } catch (err) {
    // Show error in whichever panel is active
    const activePanel = document.querySelector(".auth-panel.active");
    if (activePanel) showMessage(activePanel.id, "error", _friendlyError(err));
  } finally {
    AuthState.isLoading = false;
  }
}

/* -- Logout ----------------------------------------------------- */
async function handleLogout() {
  closeUserMenu();
  try {
    await firebaseSignOut();
    handleAuthStateChanged(null);
  } catch (err) {
    console.error("Logout error:", err);
  }
}

/* ================================================================
   7. AUTH STATE — update UI when user logs in or out
   ================================================================ */

function handleAuthStateChanged(user) {
  AuthState.currentUser = user;

  const signinBtn = document.getElementById("btn-signin");
  const userMenu  = document.getElementById("user-menu");

  if (user) {
    // Hide sign-in button
    if (signinBtn) signinBtn.style.display = "none";

    // Show user menu
    if (userMenu) {
      userMenu.classList.add("active");

      const displayName = user.displayName || user.email || "User";
      const email       = user.email || "";
      const initials    = getInitials(displayName);

      // Avatar
      const avatarEl = userMenu.querySelector(".user-avatar");
      if (avatarEl) {
        if (user.photoURL) {
          avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" />`;
        } else {
          avatarEl.textContent = initials;
        }
      }

      // Display name in button
      const nameEl = userMenu.querySelector(".user-display-name");
      if (nameEl) nameEl.textContent = displayName.split(" ")[0];

      // Dropdown header
      const udName  = userMenu.querySelector(".ud-name");
      const udEmail = userMenu.querySelector(".ud-email");
      if (udName)  udName.textContent  = displayName;
      if (udEmail) udEmail.textContent = email;
    }
  } else {
    // Show sign-in button
    if (signinBtn) signinBtn.style.display = "";

    // Hide + reset user menu
    if (userMenu) {
      userMenu.classList.remove("active", "open");
      const avatarEl = userMenu.querySelector(".user-avatar");
      if (avatarEl) avatarEl.textContent = "?";
    }
  }
}

/* ================================================================
   User menu dropdown toggle
   ================================================================ */

function toggleUserMenu() {
  const menu = document.getElementById("user-menu");
  if (menu) menu.classList.toggle("open");
}

function closeUserMenu() {
  const menu = document.getElementById("user-menu");
  if (menu) menu.classList.remove("open");
}

/* ================================================================
   Error messages → human-friendly strings
   ================================================================ */

function _friendlyError(err) {
  if (!err) return "An unexpected error occurred.";
  const code = err.code || "";
  const map = {
    "auth/user-not-found":          "No account found with this email.",
    "auth/wrong-password":          "Incorrect password. Please try again.",
    "auth/email-already-in-use":    "This email is already registered. Try signing in.",
    "auth/weak-password":           "Password is too weak. Use at least 6 characters.",
    "auth/invalid-email":           "Please enter a valid email address.",
    "auth/too-many-requests":       "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed":  "Network error. Check your connection.",
    "auth/popup-closed-by-user":    "Sign-in cancelled.",
    "auth/cancelled-popup-request": "Sign-in cancelled.",
  };
  return map[code] || err.message || "Something went wrong. Please try again.";
}

/* ================================================================
   8. INIT — Wire everything up on page load
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();

  /* -- Modal open/close ----------------------------------------- */
  const signinBtn = document.getElementById("btn-signin");
  const overlay   = document.getElementById("auth-overlay");
  const closeBtn  = document.getElementById("auth-close-btn");

  signinBtn?.addEventListener("click", () => openModal("signin"));
  closeBtn?.addEventListener("click", closeModal);

  // Click outside modal card to close
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // ESC key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* -- Tab switching -------------------------------------------- */
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  /* -- Forgot PW links ------------------------------------------ */
  document.getElementById("link-forgot-pw")?.addEventListener("click", () => switchTab("forgot"));

  /* -- Switch prompts ------------------------------------------- */
  document.getElementById("link-go-register")?.addEventListener("click", () => switchTab("register"));
  document.getElementById("link-go-signin")?.addEventListener("click",   () => switchTab("signin"));
  document.getElementById("link-back-signin")?.addEventListener("click", () => switchTab("signin"));
  document.getElementById("link-back-signin2")?.addEventListener("click",() => switchTab("signin"));

  /* -- Form submissions ----------------------------------------- */
  document.getElementById("form-signin")?.addEventListener("submit",   handleSignIn);
  document.getElementById("form-register")?.addEventListener("submit", handleRegister);
  document.getElementById("form-forgot")?.addEventListener("submit",   handleForgotPassword);

  /* -- Google buttons ------------------------------------------- */
  document.querySelectorAll(".btn-google").forEach((btn) => {
    btn.addEventListener("click", handleGoogleSignIn);
  });

  /* -- Password visibility toggles ------------------------------ */
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.textContent = isText ? "Show" : "Hide";
    });
  });

  /* -- User avatar dropdown ------------------------------------- */
  document.getElementById("user-avatar-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleUserMenu();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#user-menu")) closeUserMenu();
  });

  /* -- Logout --------------------------------------------------- */
  document.getElementById("btn-logout")?.addEventListener("click", handleLogout);

  /* -- Dropdown nav links (placeholders) ----------------------- */
  // These will route to real pages once Firebase is integrated
  document.querySelectorAll(".ud-nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      closeUserMenu();
      // TODO: route to appropriate page
      console.log("Navigate to:", link.dataset.page);
    });
  });
});
