// theme-toggle.js - Centralized Light/Dark theme toggler

document.addEventListener("DOMContentLoaded", () => {
  // Sync toggle buttons on load
  const syncToggleButtons = () => {
    const isDark = document.body.classList.contains("dark-theme");
    document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
      btn.setAttribute("aria-label", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
    });
  };

  // Run on initial load
  syncToggleButtons();

  // Delegation of click events for theme toggle button(s)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".theme-toggle-btn");
    if (!btn) return;

    const isDark = document.body.classList.contains("dark-theme");
    const newTheme = isDark ? "light" : "dark";

    if (newTheme === "dark") {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }

    // Sync all toggle buttons
    syncToggleButtons();

    // Dispatch event to sync other scripts (like Firebase Auth settings)
    const event = new CustomEvent("themeChanged", { detail: { theme: newTheme } });
    document.dispatchEvent(event);
  });

  // Listen for custom event from other scripts to keep toggles in sync
  document.addEventListener("themeChanged", (e) => {
    const isDark = e.detail.theme === "dark";
    const currentDark = document.body.classList.contains("dark-theme");
    if (isDark !== currentDark) {
      document.body.classList.toggle("dark-theme", isDark);
      localStorage.setItem("theme", isDark ? "dark" : "light");
      syncToggleButtons();
    }
  });
});
