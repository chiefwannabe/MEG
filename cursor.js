/**
 * ═══════════════════════════════════════════════════════════════════
 * MEG WEBSITE · cursor.js
 * Global custom cursor engine — loaded on every page via a single
 * <script src="/cursor.js" defer> tag.
 *
 * Architecture
 * ────────────
 *  • Detects touch/hover capability on load.  Touch devices → bail
 *    out immediately, native cursor preserved.
 *  • Injects the two cursor DOM elements (<div>) into <body>.
 *  • Sets [data-cursor-ready] on <html> to activate CSS suppression.
 *  • Dot  → teleports to exact mouse position every rAF frame.
 *  • Ring → lerps toward mouse, creating the trailing lag effect.
 *  • States (hover / text / click / hidden) are CSS classes on both
 *    elements so all transitions live in cursor.css.
 *  • Click ripples are lightweight DOM elements, self-removing.
 *
 * Future extension points
 * ───────────────────────
 *  • MegCursor.setTheme(name)   — swap CSS custom properties
 *  • MegCursor.destroy()        — clean teardown (SPA route changes)
 *  • MegCursor.CONFIG           — publicly readable/writable config
 *  • window.__MEG_CURSOR__      — global reference for DevTools
 *
 * Inclusion
 * ─────────
 *   <script src="/cursor.js" defer></script>   (root pages)
 *   <script src="../cursor.js" defer></script> (sub-directory pages)
 *
 * No build step required.  Works in any modern browser.
 * ═══════════════════════════════════════════════════════════════════
 */

(function MegCursorModule() {
  'use strict';

  /* Guard against duplicate initialization if the script is loaded multiple times */
  if (window.__MEG_CURSOR__) {
    return;
  }

  /* ── 1. Touch / Pointer Detection ──────────────────────────────
     We use two checks:
     a) matchMedia('(any-hover: hover)') — true if any pointing device supports hover.
     b) matchMedia('(any-pointer: fine)') — true if any precise pointing device is available.
     This ensures hybrid/touchscreen laptops still get the custom cursor while mobile/tablets do not.
  ─────────────────────────────────────────────────────────────── */
  const canHover      = window.matchMedia('(any-hover: hover)').matches;
  const hasFinePtr    = window.matchMedia('(any-pointer: fine)').matches;
  const isDesktop     = canHover && hasFinePtr;

  if (!isDesktop) {
    // Touch device — do nothing.  Native cursor stays.
    return;
  }

  /* ── 2. Configuration ───────────────────────────────────────────
     Single source of truth for all behavioural values.
     Extend CONFIG to support themes: each theme is just a CSS-var
     override map applied via MegCursor.setTheme().
  ─────────────────────────────────────────────────────────────── */
  const CONFIG = {
    /**
     * Lerp factor for the ring trailing effect.
     * 0.01 = very dreamy / slow.  1.0 = instant (no trail).
     * Sweet spot: 0.08 – 0.15.
     */
    lerpFactor: 0.11,

    /**
     * Selectors whose elements trigger the "hover" cursor state.
     * Extend this list to cover custom interactive components.
     */
    hoverSelectors: [
      'a',
      'button',
      '[role="button"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '.card',
      '.btn',
      'label',
      'select',
      '[data-cursor="hover"]',   // ← custom attribute hook for any element
    ],

    /**
     * Selectors that trigger the "text / I-beam" state.
     */
    textSelectors: [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="search"]',
      'input[type="number"]',
      'input[type="tel"]',
      'input[type="url"]',
      'textarea',
      '[contenteditable="true"]',
      '[contenteditable=""]',
    ],

    /** Maximum simultaneous ripple elements in the DOM. */
    maxRipples: 6,

    /**
     * Available cursor themes.
     * Each theme is a map of CSS custom property → value that gets
     * applied to :root via a <style> tag by MegCursor.setTheme().
     * Add new themes here without touching cursor.css.
     *
     * (Theme switching UI / ESC selector to be wired up separately.)
     */
    themes: {
      default: {
        '--cur-dot-color':      '#ffffff',
        '--cur-ring-color':     'rgba(255, 255, 255, 0.42)',
        '--cur-hover-color':    '#7c6df5',
        '--cur-hover-fill':     'rgba(124, 109, 245, 0.08)',
        '--cur-click-color':    '#f06292',
        '--cur-click-fill':     'rgba(240, 98, 146, 0.10)',
      },
      neon: {
        '--cur-dot-color':      '#00f0ff',
        '--cur-ring-color':     'rgba(0, 240, 255, 0.35)',
        '--cur-hover-color':    '#ff3ec9',
        '--cur-hover-fill':     'rgba(255, 62, 201, 0.10)',
        '--cur-click-color':    '#8b5cf6',
        '--cur-click-fill':     'rgba(139, 92, 246, 0.12)',
      },
      minimal: {
        '--cur-dot-color':      '#222222',
        '--cur-ring-color':     'rgba(0, 0, 0, 0.30)',
        '--cur-hover-color':    '#111111',
        '--cur-hover-fill':     'rgba(0, 0, 0, 0.05)',
        '--cur-click-color':    '#444444',
        '--cur-click-fill':     'rgba(0, 0, 0, 0.08)',
      },
    },

    /**
     * LocalStorage key for saved theme preference.
     * When theme picker is built, persist choice here.
     */
    storageKey: 'meg-cursor-theme',
  };

  /* ── 3. Runtime State ───────────────────────────────────────────*/
  const state = {
    mouse:      { x: -200, y: -200 },   // raw mouse, updated instantly
    ring:       { x: -200, y: -200 },   // smoothed ring position
    isHovering: false,
    isClicking: false,
    isText:     false,
    isVisible:  false,
    ripples:    [],
    rafId:      null,
    themeEl:    null,                    // <style> injected for theme vars
  };

  /* ── 4. DOM Injection variables ── */
  let dot = null;
  let ring = null;

  /* ── 5. Utility Helpers ─────────────────────────────────────────*/

  /** Linear interpolation. */
  const lerp = (a, b, t) => a + (b - a) * t;

  /**
   * Apply GPU-composited position to a cursor element.
   * We subtract 50% to keep the element centred on the coordinate.
   */
  const setPos = (el, x, y) => {
    el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0)`;
  };

  /** Toggle a class on both cursor elements atomically. */
  const setState = (cls, active) => {
    dot[active  ? 'classList' : 'classList'][active ? 'add' : 'remove'](cls);
    ring[active ? 'classList' : 'classList'][active ? 'add' : 'remove'](cls);
  };

  const addClass    = (cls) => { dot.classList.add(cls);    ring.classList.add(cls);    };
  const removeClass = (cls) => { dot.classList.remove(cls); ring.classList.remove(cls); };

  /* ── 6. Animation Loop ──────────────────────────────────────────*/

  /**
   * Core rAF tick.
   * Dot  → snaps to state.mouse  (one DOM write, zero math)
   * Ring → lerps toward state.mouse  (two lerp ops + one DOM write)
   * Both writes are GPU-composited (transform only), layout-safe.
   */
  const tick = () => {
    setPos(dot, state.mouse.x, state.mouse.y);

    state.ring.x = lerp(state.ring.x, state.mouse.x, CONFIG.lerpFactor);
    state.ring.y = lerp(state.ring.y, state.mouse.y, CONFIG.lerpFactor);
    setPos(ring, state.ring.x, state.ring.y);

    state.rafId = requestAnimationFrame(tick);
  };

  /* ── 7. Hover Detection ─────────────────────────────────────────*/

  /**
   * Walk up the DOM from `el`, checking ancestors for matching
   * selectors OR a computed cursor:pointer style.
   * Walking the tree means a <span> inside a <button> still
   * triggers the hover state correctly.
   */
  const ancestorMatches = (selectors, el) => {
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      if (selectors.some(sel => {
        try { return node.matches(sel); } catch (_) { return false; }
      })) return true;
      if (getComputedStyle(node).cursor === 'pointer') return true;
      node = node.parentElement;
    }
    return false;
  };

  /**
   * Given the element currently under the mouse, resolve and apply
   * the correct cursor mode.  Checks text first (higher priority).
   */
  const applyHoverState = (target) => {
    const wantsText  = ancestorMatches(CONFIG.textSelectors,  target);
    const wantsHover = !wantsText && ancestorMatches(CONFIG.hoverSelectors, target);

    if (wantsText !== state.isText) {
      state.isText = wantsText;
      wantsText ? addClass('is-text') : removeClass('is-text');
    }

    if (wantsHover !== state.isHovering) {
      state.isHovering = wantsHover;
      wantsHover ? addClass('is-hovering') : removeClass('is-hovering');
    }
  };

  /* ── 8. Ripple Effect ───────────────────────────────────────────*/

  /**
   * Spawn a single expanding ripple at viewport coords (x, y).
   * The element removes itself when its animation ends.
   */
  const spawnRipple = (x, y) => {
    if (state.ripples.length >= CONFIG.maxRipples) {
      const evicted = state.ripples.shift();
      evicted.remove();
    }

    const el       = document.createElement('div');
    el.className   = 'meg-cursor-ripple';
    el.style.left  = `${x}px`;
    el.style.top   = `${y}px`;
    document.body.appendChild(el);
    state.ripples.push(el);

    el.addEventListener('animationend', () => {
      el.remove();
      const i = state.ripples.indexOf(el);
      if (i !== -1) state.ripples.splice(i, 1);
    }, { once: true });
  };

  /* ── 9. Event Handlers ──────────────────────────────────────────*/

  const onMouseMove = (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;

    if (!state.isVisible) {
      state.isVisible = true;
      removeClass('is-hidden');
    }

    applyHoverState(e.target);
  };

  const onMouseDown = (e) => {
    state.isClicking = true;
    addClass('is-clicking');
    spawnRipple(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    state.isClicking = false;
    removeClass('is-clicking');
  };

  const onMouseLeave = () => {
    addClass('is-hidden');
    state.isVisible = false;
  };

  const onMouseEnter = () => {
    removeClass('is-hidden');
    state.isVisible = true;
  };

  /**
   * Handle scrolling: re-evaluates the hover state of whatever element
   * is currently positioned under the mouse coordinates.
   */
  const onScroll = () => {
    if (!state.isVisible) return;
    const target = document.elementFromPoint(state.mouse.x, state.mouse.y);
    if (target) {
      applyHoverState(target);
    }
  };

  /**
   * Handle tab switching/visibility/blur changes: hides custom cursor to
   * avoid getting frozen/stuck on page when window loses focus.
   */
  const onWindowBlur = () => {
    addClass('is-hidden');
    state.isVisible = false;
  };

  /* ── 10. Theme System ───────────────────────────────────────────
     MegCursor.setTheme(name) applies a predefined set of CSS
     custom property overrides to :root.
     Theme name is persisted to localStorage so the user's
     preference survives page navigation.
  ─────────────────────────────────────────────────────────────── */

  /**
   * Apply a named theme from CONFIG.themes.
   * @param {string} name  - Key in CONFIG.themes
   * @param {boolean} save - Whether to persist to localStorage
   */
  const setTheme = (name, save = true) => {
    const theme = CONFIG.themes[name];
    if (!theme) {
      console.warn(`[MegCursor] Unknown theme: "${name}". Available:`, Object.keys(CONFIG.themes));
      return;
    }

    /* Build or reuse the injected <style> element */
    if (!state.themeEl) {
      state.themeEl = document.createElement('style');
      state.themeEl.id = 'meg-cursor-theme-vars';
      document.head.appendChild(state.themeEl);
    }

    const vars = Object.entries(theme)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    state.themeEl.textContent = `:root {\n${vars}\n}`;

    document.documentElement.setAttribute('data-cursor-theme', name);

    if (save) {
      try { localStorage.setItem(CONFIG.storageKey, name); } catch (_) {}
    }
  };

  /**
   * Load the saved theme from localStorage (if any).
   * Falls back to 'default' silently.
   */
  const loadSavedTheme = () => {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved && CONFIG.themes[saved]) {
        setTheme(saved, false);
      }
    } catch (_) {}
  };

  /* ── 11. Initialisation ─────────────────────────────────────────*/

  const init = () => {
    // Inject the cursor DOM elements safely now that body is ready
    if (!dot) {
      dot  = document.createElement('div');
      ring = document.createElement('div');
      dot.className  = 'meg-cursor-dot';
      ring.className = 'meg-cursor-ring';
      dot.id   = 'megCursorDot';
      ring.id  = 'megCursorRing';
      dot.setAttribute('aria-hidden', 'true');
      ring.setAttribute('aria-hidden', 'true');
      document.body.appendChild(dot);
      document.body.appendChild(ring);
    }

    /* Signal CSS to hide the native cursor */
    document.documentElement.setAttribute('data-cursor-ready', '');

    /* Hide cursor elements until first mouse movement */
    addClass('is-hidden');

    /* Restore saved theme preference */
    loadSavedTheme();

    /* Attach event listeners (all passive-safe except mousedown/up) */
    document.addEventListener('mousemove',  onMouseMove, { passive: true });
    document.addEventListener('mousedown',  onMouseDown);
    document.addEventListener('mouseup',    onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    window.addEventListener('scroll',       onScroll,       { passive: true });
    window.addEventListener('blur',         onWindowBlur,   { passive: true });

    /* Start the animation loop */
    if (!state.rafId) {
      state.rafId = requestAnimationFrame(tick);
    }
  };

  /**
   * Teardown — cleanly destroys the cursor system and resets all DOM changes.
   * Eliminates memory leaks and cleans up all active ripple elements.
   */
  const destroy = () => {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;

    /* Remove event listeners */
    document.removeEventListener('mousemove',  onMouseMove);
    document.removeEventListener('mousedown',  onMouseDown);
    document.removeEventListener('mouseup',    onMouseUp);
    document.removeEventListener('mouseleave', onMouseLeave);
    document.removeEventListener('mouseenter', onMouseEnter);
    window.removeEventListener('scroll',       onScroll);
    window.removeEventListener('blur',         onWindowBlur);

    /* Clean up DOM elements */
    dot.remove();
    ring.remove();

    if (state.themeEl) {
      state.themeEl.remove();
      state.themeEl = null;
    }

    state.ripples.forEach(el => el.remove());
    state.ripples = [];

    /* Reset global attributes and references */
    document.documentElement.removeAttribute('data-cursor-ready');
    document.documentElement.removeAttribute('data-cursor-theme');
    delete window.__MEG_CURSOR__;
  };

  /* ── 12. Public API ─────────────────────────────────────────────
     Exposed on window.__MEG_CURSOR__ for:
     - Future theme picker UI
     - ESC cursor selector
     - Saved preferences integration
     - DevTools inspection
  ─────────────────────────────────────────────────────────────── */
  window.__MEG_CURSOR__ = {
    CONFIG,
    state,
    setTheme,
    destroy,
    /**
     * Utility: get list of available theme names.
     * @returns {string[]}
     */
    getThemes: () => Object.keys(CONFIG.themes),
  };

  /* ── Run ────────────────────────────────────────────────────────*/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})(); // end MegCursorModule IIFE
