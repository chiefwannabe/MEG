// theme-toggle.js - Centralized Light/Dark theme manager

(() => {
  const isTheme = (theme) => theme === "dark" || theme === "light";
  const readTheme = () => {
    try {
      const saved = localStorage.getItem("theme");
      if (isTheme(saved)) return saved;
    } catch (_) {}
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  };

  const saveTheme = (theme) => {
    try { localStorage.setItem("theme", theme); } catch (_) {}
  };

  const syncToggleButtons = () => {
    const isDark = document.documentElement.classList.contains("dark-theme") || document.documentElement.dataset.theme === "dark";
    document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
      const labelText = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
      btn.setAttribute("aria-label", labelText);
      btn.setAttribute("title", labelText);

      const icon = btn.querySelector(".theme-icon");
      if (icon && !icon.querySelector("svg") && icon.tagName !== "SVG") {
        icon.textContent = isDark ? "☀️" : "🌙";
      }

      const label = btn.querySelector(".theme-label");
      if (label) {
        label.textContent = isDark ? "Light Theme" : "Dark Theme";
      }
    });
  };

  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark-theme", isDark);
    document.documentElement.dataset.theme = theme;
    if (document.body) {
      document.body.classList.toggle("dark-theme", isDark);
      document.body.dataset.theme = theme;
    }
    syncToggleButtons();
  };

  const setTheme = (theme, notify = false) => {
    if (!isTheme(theme)) return;
    applyTheme(theme);
    saveTheme(theme);
    if (notify) {
      document.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));
    }
  };

  // Initial immediate application
  applyTheme(readTheme());

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(readTheme());
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".theme-toggle-btn");
    if (button) {
      const currentDark = document.documentElement.classList.contains("dark-theme") || document.documentElement.dataset.theme === "dark";
      setTheme(currentDark ? "light" : "dark", true);
    }
  });

  document.addEventListener("themeChanged", (event) => {
    if (isTheme(event.detail?.theme)) {
      applyTheme(event.detail.theme);
      saveTheme(event.detail.theme);
    }
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "theme" && isTheme(e.newValue)) {
      applyTheme(e.newValue);
    }
  });

  try {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      try {
        if (!localStorage.getItem("theme")) {
          setTheme(e.matches ? "dark" : "light", false);
        }
      } catch (_) {}
    });
  } catch (_) {}
})();

