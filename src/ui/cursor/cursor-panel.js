/**
 * ═══════════════════════════════════════════════════════════════════
 * MEG WEBSITE · cursor-panel.js
 * Controls the ESC Cursor Panel. Communicates with window.__MEG_CURSOR__.
 *
 * Architecture
 * ────────────
 *  • Dynamically creates the settings panel HTML & overlay on demand.
 *  • Listens to window keydown (ESC key) to toggle panel visibility.
 *  • Manages and saves user settings to localStorage.
 *  • Communicates with window.__MEG_CURSOR__ to apply speed, size, theme, etc.
 * ═══════════════════════════════════════════════════════════════════
 */

(function MegCursorPanelModule() {
  'use strict';

  // Wait for the cursor engine to be available
  const getEngine = () => window.__MEG_CURSOR__;

  // LocalStorage keys
  const KEYS = {
    disabled: 'meg-cursor-disabled',
    theme: 'meg-cursor-theme',
    size: 'meg-cursor-size-val',
    speed: 'meg-cursor-speed-val',
    opacity: 'meg-cursor-opacity-val',
    trail: 'meg-cursor-trail-val',
    clickAnim: 'meg-cursor-click-anim-val'
  };

  // State Management
  const settings = {
    disabled: false,
    theme: 'default',
    size: 100,      // percentage: 50% to 200%
    speed: 100,     // percentage: 20% to 300%
    opacity: 100,   // percentage: 0% to 100%
    trail: true,
    clickAnim: true
  };

  // List of Themes
  const themesList = [
    { id: 'default', name: 'Premium (Default)', desc: 'Elegant trailing outline' },
    { id: 'glass', name: 'Glass', desc: 'Frosted blur-fill ring' },
    { id: 'neon', name: 'Neon Glow', desc: 'Futuristic cyan & pink glow' },
    { id: 'minimal', name: 'Minimalist', desc: 'Ultra-thin subtle design' },
    { id: 'dot', name: 'Only Dot', desc: 'No trailing ring' },
    { id: 'arrow', name: 'Sleek Arrow', desc: 'Precision classic pointer' },
    { id: 'pixel', name: 'Retro Pixel', desc: 'Phosphor green square cursor' }
  ];

  let overlayEl = null;

  // CSS rule helper for custom settings (applied inline to document root)
  const applySettingsToDOM = () => {
    const engine = getEngine();
    const doc = document.documentElement;

    // 1. Handle Disabled Master Switch
    if (settings.disabled) {
      doc.setAttribute('data-cursor-disabled', 'true');
      doc.removeAttribute('data-cursor-ready');
    } else {
      doc.removeAttribute('data-cursor-disabled');
      // Only set ready if the engine itself says it's visible / initialized
      if (engine && engine.state) {
        doc.setAttribute('data-cursor-ready', '');
      }
    }

    // 2. Handle Theme
    doc.setAttribute('data-cursor-theme', settings.theme);
    if (engine && typeof engine.setTheme === 'function') {
      // Map custom themes not present in default engine config
      const customThemeVars = {
        default: {
          '--cur-dot-color': '#ffffff',
          '--cur-ring-color': 'rgba(255, 255, 255, 0.42)',
          '--cur-hover-color': '#7c6df5',
          '--cur-hover-fill': 'rgba(124, 109, 245, 0.08)',
          '--cur-click-color': '#f06292',
          '--cur-click-fill': 'rgba(240, 98, 146, 0.10)'
        },
        glass: {
          '--cur-dot-color': '#ffffff',
          '--cur-ring-color': 'rgba(255, 255, 255, 0.25)',
          '--cur-hover-color': '#ffffff',
          '--cur-hover-fill': 'rgba(255, 255, 255, 0.20)',
          '--cur-click-color': '#ffffff',
          '--cur-click-fill': 'rgba(255, 255, 255, 0.30)'
        },
        neon: {
          '--cur-dot-color': '#00f0ff',
          '--cur-ring-color': 'rgba(0, 240, 255, 0.4)',
          '--cur-hover-color': '#ff3ec9',
          '--cur-hover-fill': 'rgba(255, 62, 201, 0.12)',
          '--cur-click-color': '#8b5cf6',
          '--cur-click-fill': 'rgba(139, 92, 246, 0.15)'
        },
        minimal: {
          '--cur-dot-color': '#a0a0a0',
          '--cur-ring-color': 'rgba(160, 160, 160, 0.2)',
          '--cur-hover-color': '#eeeeff',
          '--cur-hover-fill': 'rgba(255, 255, 255, 0.04)',
          '--cur-click-color': '#ffffff',
          '--cur-click-fill': 'rgba(255, 255, 255, 0.08)'
        },
        dot: {
          '--cur-dot-color': '#ffffff',
          '--cur-ring-color': 'rgba(255, 255, 255, 0)',
          '--cur-hover-color': '#7c6df5',
          '--cur-hover-fill': 'rgba(124, 109, 245, 0.08)',
          '--cur-click-color': '#f06292',
          '--cur-click-fill': 'rgba(240, 98, 146, 0.1)'
        },
        arrow: {
          '--cur-dot-color': '#ffffff',
          '--cur-ring-color': 'rgba(255, 255, 255, 0)',
          '--cur-hover-color': '#7c6df5',
          '--cur-hover-fill': 'rgba(255, 255, 255, 0)',
          '--cur-click-color': '#f06292',
          '--cur-click-fill': 'rgba(255, 255, 255, 0)'
        },
        pixel: {
          '--cur-dot-color': '#39ff14',
          '--cur-ring-color': 'rgba(57, 255, 20, 0.4)',
          '--cur-hover-color': '#39ff14',
          '--cur-hover-fill': 'rgba(57, 255, 20, 0.12)',
          '--cur-click-color': '#ff3ec9',
          '--cur-click-fill': 'rgba(255, 62, 201, 0.15)'
        }
      };

      const selectedTheme = customThemeVars[settings.theme] || customThemeVars.default;
      
      // Inject variables dynamically using standard engine theme injection
      if (engine.CONFIG && engine.CONFIG.themes) {
        engine.CONFIG.themes[settings.theme] = selectedTheme;
      }
      engine.setTheme(settings.theme, false);
    }

    // 3. Size calculations (Base sizes scaled proportionally)
    const baseDot = settings.theme === 'minimal' ? 4 : (settings.theme === 'dot' ? 10 : (settings.theme === 'arrow' ? 18 : 8));
    const baseRing = settings.theme === 'minimal' ? 24 : (settings.theme === 'dot' ? 0 : (settings.theme === 'arrow' ? 0 : 36));
    const sizeMultiplier = settings.size / 100;
    doc.style.setProperty('--cur-dot-size', `${baseDot * sizeMultiplier}px`);
    doc.style.setProperty('--cur-ring-size', `${baseRing * sizeMultiplier}px`);

    // Extra theme custom properties for special designs
    if (settings.theme === 'glass') {
      doc.style.setProperty('--cur-ring-fill', 'rgba(255, 255, 255, 0.12)');
    } else {
      doc.style.setProperty('--cur-ring-fill', 'transparent');
    }

    // 4. Speed calculations
    if (engine && engine.CONFIG) {
      if (!settings.trail) {
        engine.CONFIG.lerpFactor = 1.0; // instant snapping
      } else {
        // Map 20%-300% to actual lerp factor: 0.02 to 0.35
        const pct = settings.speed / 100;
        engine.CONFIG.lerpFactor = 0.11 * pct;
      }
    }

    // 5. Opacity calculations
    const op = settings.opacity / 100;
    doc.style.setProperty('--cur-ring-opacity', op);

    // 6. Click animation state
    doc.setAttribute('data-cursor-click-anim', settings.clickAnim ? 'true' : 'false');
  };

  // Load configuration settings from localStorage
  const loadSavedSettings = () => {
    try {
      const getBool = (key, fallback) => {
        const val = localStorage.getItem(key);
        return val !== null ? val === 'true' : fallback;
      };
      const getNum = (key, fallback) => {
        const val = localStorage.getItem(key);
        return val !== null ? Number(val) : fallback;
      };
      const getString = (key, fallback) => {
        const val = localStorage.getItem(key);
        return val !== null ? val : fallback;
      };

      settings.disabled = getBool(KEYS.disabled, false);
      settings.theme = getString(KEYS.theme, 'default');
      settings.size = getNum(KEYS.size, 100);
      settings.speed = getNum(KEYS.speed, 100);
      settings.opacity = getNum(KEYS.opacity, 100);
      settings.trail = getBool(KEYS.trail, true);
      settings.clickAnim = getBool(KEYS.clickAnim, true);
    } catch (_) {}
  };

  // Save current configuration to localStorage
  const saveSetting = (key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch (_) {}
  };

  // Toggle settings panel UI visibility
  const togglePanel = () => {
    if (!overlayEl) {
      createPanelDOM();
    }

    const isActive = overlayEl.classList.contains('is-active');
    if (isActive) {
      overlayEl.classList.remove('is-active');
    } else {
      // Re-populate settings inputs to match active state before displaying
      updatePanelInputs();
      overlayEl.classList.add('is-active');
      // Focus the search input for ease of use
      setTimeout(() => {
        const searchInput = overlayEl.querySelector('#megSearchThemes');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  };

  // Render/Update Theme Cards list based on search term
  const renderThemes = (filterText = '') => {
    const listContainer = overlayEl.querySelector('#megThemesGrid');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const normFilter = filterText.toLowerCase().trim();

    const filtered = themesList.filter(t => 
      t.name.toLowerCase().includes(normFilter) || 
      t.desc.toLowerCase().includes(normFilter)
    );

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #65657a; font-size: 13px; padding: 20px 0;">No matching themes found</div>';
      return;
    }

    filtered.forEach(theme => {
      const card = document.createElement('div');
      card.className = `meg-theme-card ${settings.theme === theme.id ? 'is-active' : ''}`;
      card.setAttribute('data-theme', theme.id);
      
      card.innerHTML = `
        <div class="meg-theme-preview">
          <div class="meg-theme-preview-ring">
            <div class="meg-theme-preview-dot"></div>
          </div>
        </div>
        <div class="meg-theme-info">
          <div class="meg-theme-name">${theme.name}</div>
          <div style="font-size: 11px; color: #85859e;">${theme.desc}</div>
        </div>
        <div class="meg-theme-check"></div>
      `;

      card.addEventListener('click', () => {
        settings.theme = theme.id;
        saveSetting(KEYS.theme, theme.id);
        
        // Highlight active card
        overlayEl.querySelectorAll('.meg-theme-card').forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');

        applySettingsToDOM();
      });

      listContainer.appendChild(card);
    });
  };

  // Re-sync UI inputs with the current state of settings object
  const updatePanelInputs = () => {
    if (!overlayEl) return;

    // Master Switch
    const masterCheckbox = overlayEl.querySelector('#megMasterToggle');
    if (masterCheckbox) masterCheckbox.checked = !settings.disabled;

    // Sliders
    const sizeSlider = overlayEl.querySelector('#megSliderSize');
    if (sizeSlider) {
      sizeSlider.value = settings.size;
      overlayEl.querySelector('#megValSize').textContent = `${settings.size}%`;
    }

    const speedSlider = overlayEl.querySelector('#megSliderSpeed');
    if (speedSlider) {
      speedSlider.value = settings.speed;
      overlayEl.querySelector('#megValSpeed').textContent = `${settings.speed}%`;
    }

    const opacitySlider = overlayEl.querySelector('#megSliderOpacity');
    if (opacitySlider) {
      opacitySlider.value = settings.opacity;
      overlayEl.querySelector('#megValOpacity').textContent = `${settings.opacity}%`;
    }

    // Toggles
    const trailToggle = overlayEl.querySelector('#megToggleTrail');
    if (trailToggle) trailToggle.checked = settings.trail;

    const clickToggle = overlayEl.querySelector('#megToggleClick');
    if (clickToggle) clickToggle.checked = settings.clickAnim;

    // Search input clear
    const searchInput = overlayEl.querySelector('#megSearchThemes');
    if (searchInput) searchInput.value = '';

    renderThemes();
  };

  // Build the entire DOM structure of the panel
  const createPanelDOM = () => {
    // Add glassmorphic overlay helper rule to head
    const styleHelper = document.createElement('style');
    styleHelper.textContent = `
      .meg-cursor-ring {
        background: var(--cur-ring-fill, transparent);
      }
      .meg-cursor-ring:not(.is-hidden):not(.is-text) {
        opacity: var(--cur-ring-opacity, 1) !important;
      }
    `;
    document.head.appendChild(styleHelper);

    overlayEl = document.createElement('div');
    overlayEl.className = 'meg-panel-overlay';
    overlayEl.id = 'megCursorPanelOverlay';

    overlayEl.innerHTML = `
      <div class="meg-panel-container" role="dialog" aria-modal="true" aria-labelledby="megPanelHeaderTitle">
        
        <!-- Header -->
        <div class="meg-panel-header">
          <div class="meg-panel-title-group">
            <h2 id="megPanelHeaderTitle">Cursor Preferences</h2>
            <p>Press <span style="background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 4px;">ESC</span> to open/close settings panel</p>
          </div>
          <button class="meg-panel-close" id="megPanelCloseBtn" aria-label="Close panel">&times;</button>
        </div>

        <!-- Content -->
        <div class="meg-panel-content">
          
          <!-- Master Switch -->
          <div class="meg-panel-master-row">
            <div class="meg-panel-master-info">
              <h3>Enable Custom Cursor</h3>
              <p>Toggle between custom cursor and default OS pointer</p>
            </div>
            <label class="meg-switch">
              <input type="checkbox" id="megMasterToggle">
              <span class="meg-slider"></span>
            </label>
          </div>

          <!-- Themes Section -->
          <div>
            <div class="meg-section-title">Cursor Themes</div>
            <div class="meg-panel-search-wrapper" style="margin-bottom: 14px;">
              <span class="meg-panel-search-icon">&#x1F50D;</span>
              <input type="text" id="megSearchThemes" class="meg-panel-search" placeholder="Search cursor themes..." autocomplete="off">
            </div>
            <div class="meg-themes-grid" id="megThemesGrid"></div>
          </div>

          <!-- Settings Section -->
          <div>
            <div class="meg-section-title">Custom Adjustments</div>
            <div class="meg-settings-group">
              
              <!-- Size Slider -->
              <div class="meg-setting-row">
                <div class="meg-setting-label-row">
                  <span class="meg-setting-label">Cursor Size</span>
                  <span class="meg-setting-value" id="megValSize">100%</span>
                </div>
                <input type="range" id="megSliderSize" class="meg-range" min="50" max="200" step="5">
              </div>

              <!-- Speed Slider -->
              <div class="meg-setting-row">
                <div class="meg-setting-label-row">
                  <span class="meg-setting-label">Cursor Speed</span>
                  <span class="meg-setting-value" id="megValSpeed">100%</span>
                </div>
                <input type="range" id="megSliderSpeed" class="meg-range" min="20" max="300" step="5">
              </div>

              <!-- Ring Opacity Slider -->
              <div class="meg-setting-row">
                <div class="meg-setting-label-row">
                  <span class="meg-setting-label">Ring Opacity</span>
                  <span class="meg-setting-value" id="megValOpacity">100%</span>
                </div>
                <input type="range" id="megSliderOpacity" class="meg-range" min="0" max="100" step="5">
              </div>

              <!-- Inline toggles -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="meg-setting-row meg-setting-row-inline">
                  <span class="meg-setting-label">Lagging Trail</span>
                  <label class="meg-switch">
                    <input type="checkbox" id="megToggleTrail">
                    <span class="meg-slider"></span>
                  </label>
                </div>
                
                <div class="meg-setting-row meg-setting-row-inline">
                  <span class="meg-setting-label">Click Effect</span>
                  <label class="meg-switch">
                    <input type="checkbox" id="megToggleClick">
                    <span class="meg-slider"></span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          <!-- Actions Row -->
          <div class="meg-actions-row">
            <button class="meg-btn-action" id="megBtnImport" style="opacity: 0.55; cursor: not-allowed;">
              <span>&#x1F4E5;</span> Import
            </button>
            <button class="meg-btn-action" id="megBtnExport" style="opacity: 0.55; cursor: not-allowed;">
              <span>&#x1F4E4;</span> Export
            </button>
            <button class="meg-btn-action btn-reset" id="megBtnReset">
              <span>&#x21BB;</span> Reset Defaults
            </button>
          </div>

          <!-- Future Ready Placeholders -->
          <div>
            <div class="meg-section-title">Reserved Features</div>
            <div class="meg-future-grid">
              <div class="meg-future-item">
                <span class="meg-future-name">Magnetic Buttons</span>
                <span class="meg-future-badge">Soon</span>
              </div>
              <div class="meg-future-item">
                <span class="meg-future-name">Spotlight Mode</span>
                <span class="meg-future-badge">Soon</span>
              </div>
              <div class="meg-future-item">
                <span class="meg-future-name">Context Cursor</span>
                <span class="meg-future-badge">Soon</span>
              </div>
              <div class="meg-future-item">
                <span class="meg-future-name">Seasonal Themes</span>
                <span class="meg-future-badge">Lock</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="meg-panel-footer">
          <div>MEG Custom Cursor Panel v1.0</div>
          <div>Shortcut: <span>ESC</span></div>
        </div>

      </div>
    `;

    document.body.appendChild(overlayEl);

    // ── Bind Event Listeners ──

    // Close button click
    overlayEl.querySelector('#megPanelCloseBtn').addEventListener('click', togglePanel);

    // Clicking outside modal closes panel
    overlayEl.addEventListener('mousedown', (e) => {
      if (e.target === overlayEl) {
        togglePanel();
      }
    });

    // Master Toggle
    overlayEl.querySelector('#megMasterToggle').addEventListener('change', (e) => {
      settings.disabled = !e.target.checked;
      saveSetting(KEYS.disabled, settings.disabled);
      applySettingsToDOM();
    });

    // Search themes input
    overlayEl.querySelector('#megSearchThemes').addEventListener('input', (e) => {
      renderThemes(e.target.value);
    });

    // Size Slider
    overlayEl.querySelector('#megSliderSize').addEventListener('input', (e) => {
      settings.size = Number(e.target.value);
      overlayEl.querySelector('#megValSize').textContent = `${settings.size}%`;
      saveSetting(KEYS.size, settings.size);
      applySettingsToDOM();
    });

    // Speed Slider
    overlayEl.querySelector('#megSliderSpeed').addEventListener('input', (e) => {
      settings.speed = Number(e.target.value);
      overlayEl.querySelector('#megValSpeed').textContent = `${settings.speed}%`;
      saveSetting(KEYS.speed, settings.speed);
      applySettingsToDOM();
    });

    // Opacity Slider
    overlayEl.querySelector('#megSliderOpacity').addEventListener('input', (e) => {
      settings.opacity = Number(e.target.value);
      overlayEl.querySelector('#megValOpacity').textContent = `${settings.opacity}%`;
      saveSetting(KEYS.opacity, settings.opacity);
      applySettingsToDOM();
    });

    // Trail Switch
    overlayEl.querySelector('#megToggleTrail').addEventListener('change', (e) => {
      settings.trail = e.target.checked;
      saveSetting(KEYS.trail, settings.trail);
      applySettingsToDOM();
    });

    // Click Effect Switch
    overlayEl.querySelector('#megToggleClick').addEventListener('change', (e) => {
      settings.clickAnim = e.target.checked;
      saveSetting(KEYS.clickAnim, settings.clickAnim);
      applySettingsToDOM();
    });

    // Reset Defaults Action
    overlayEl.querySelector('#megBtnReset').addEventListener('click', () => {
      settings.disabled = false;
      settings.theme = 'default';
      settings.size = 100;
      settings.speed = 100;
      settings.opacity = 100;
      settings.trail = true;
      settings.clickAnim = true;

      // Save all keys
      saveSetting(KEYS.disabled, false);
      saveSetting(KEYS.theme, 'default');
      saveSetting(KEYS.size, 100);
      saveSetting(KEYS.speed, 100);
      saveSetting(KEYS.opacity, 100);
      saveSetting(KEYS.trail, true);
      saveSetting(KEYS.clickAnim, true);

      // Re-sync UI & engine
      updatePanelInputs();
      applySettingsToDOM();
    });

    // Render themes list initially
    renderThemes();
  };

  // Document Keydown event to detect ESC key press
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      const isActive = overlayEl && overlayEl.classList.contains('is-active');
      const active = document.activeElement;
      
      // If panel is NOT active, ignore ESC if typing on the page
      if (!isActive && active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.isContentEditable || 
        active.getAttribute('contenteditable') !== null
      )) {
        return;
      }

      e.preventDefault();
      togglePanel();
    }
  };

  // Initialization function
  const initPanel = () => {
    loadSavedSettings();
    applySettingsToDOM();

    // Bind Esc key global shortcut
    window.addEventListener('keydown', onKeyDown);
  };

  // Expose control hook to window for advanced operations
  window.__MEG_CURSOR_PANEL__ = {
    settings,
    toggle: togglePanel,
    apply: applySettingsToDOM
  };

  // Initialize as soon as DOM is parsed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPanel, { once: true });
  } else {
    initPanel();
  }

})();
