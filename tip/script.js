/**
 * ═══════════════════════════════════════════════════════════════════
 * PREMIUM CUSTOM CURSOR · script.js
 *
 * Architecture overview
 * ─────────────────────
 *  • Mouse position is captured instantly on every mousemove event.
 *  • The DOT teleports to the exact mouse position each rAF frame.
 *  • The OUTLINE lerps (linear interpolates) toward the mouse position,
 *    creating the characteristic trailing lag that feels premium.
 *  • Hover / text / click states are applied via CSS class names so
 *    that all size & colour transitions live entirely in style.css.
 *  • Click ripples are lightweight DOM elements created on mousedown
 *    and self-removed after their CSS animation finishes.
 *
 * To integrate into any existing site:
 *  1. Drop the two cursor <div> elements into your <body>.
 *  2. Add `cursor: none` to your global stylesheet.
 *  3. Link style.css and this file.
 *  Done — no other changes needed.
 * ═══════════════════════════════════════════════════════════════════
 */

/* ── Configuration ────────────────────────────────────────────────
   Centralised settings.  Adjust these without touching anything else.
──────────────────────────────────────────────────────────────── */
const CONFIG = {
  /**
   * Lerp (smoothing) factor for the outline ring.
   * Range : 0.01 (very slow, dreamy) → 1.0 (instant, snaps to cursor)
   * Sweet spot: 0.08 – 0.15
   */
  lerpFactor: 0.11,

  /**
   * CSS selectors whose elements trigger the "hover" cursor state.
   * Add your own selectors to extend hover detection.
   */
  hoverSelectors: [
    'a',
    'button',
    '[role="button"]',
    '.card',
    '.btn',
    'label',
    'select',
    '[data-cursor="hover"]',   // custom attribute hook for your elements
  ],

  /**
   * CSS selectors that trigger the "text / I-beam" cursor state.
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

  /** Maximum number of ripple elements that can exist simultaneously. */
  maxRipples: 6,
};


/* ── DOM References ───────────────────────────────────────────────*/
const dot     = document.getElementById('cursorDot');
const outline = document.getElementById('cursorOutline');

if (!dot || !outline) {
  console.warn('[cursor] #cursorDot or #cursorOutline not found in the DOM.');
}


/* ── Runtime State ────────────────────────────────────────────────*/
const state = {
  /** Raw mouse position — updated instantly on every mousemove. */
  mouse: { x: -200, y: -200 },

  /** Smoothed position of the outline ring — updated by lerp each frame. */
  ring: { x: -200, y: -200 },

  /** Flags */
  isHovering: false,
  isClicking: false,
  isText:     false,
  isVisible:  false,

  /** Pool of live ripple elements. */
  ripples: [],

  /** requestAnimationFrame handle (kept for potential cleanup). */
  rafId: null,
};


/* ── Utility Helpers ──────────────────────────────────────────────*/

/**
 * Linear interpolation between `a` and `b` at factor `t`.
 * @param {number} a  - Current value
 * @param {number} b  - Target value
 * @param {number} t  - Factor in range [0, 1]
 * @returns {number}
 */
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Position a cursor element via GPU-accelerated translate3d.
 * The element's CSS uses `transform: translate(-50%, -50%)` as a base,
 * so we keep it in the transform and offset by the mouse coordinates.
 * @param {HTMLElement} el
 * @param {number}      x  - Horizontal coordinate (px from left of viewport)
 * @param {number}      y  - Vertical coordinate   (px from top  of viewport)
 */
const setPos = (el, x, y) => {
  el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0)`;
};

/**
 * Add a class to both cursor elements atomically.
 * @param {string} cls
 */
const add = (cls) => {
  dot.classList.add(cls);
  outline.classList.add(cls);
};

/**
 * Remove a class from both cursor elements atomically.
 * @param {string} cls
 */
const remove = (cls) => {
  dot.classList.remove(cls);
  outline.classList.remove(cls);
};


/* ── Main Animation Loop ──────────────────────────────────────────*/

/**
 * Core rAF loop.  Runs every frame (~60 fps on most displays).
 *
 * Frame budget breakdown:
 *  - Dot  : one DOM write  (transform string)
 *  - Ring : two lerp ops + one DOM write
 *  - Total: essentially zero — all transitions are GPU-composited.
 */
const tick = () => {
  /* Dot follows the mouse exactly */
  setPos(dot, state.mouse.x, state.mouse.y);

  /* Outline lerps toward the mouse, creating the trail effect */
  state.ring.x = lerp(state.ring.x, state.mouse.x, CONFIG.lerpFactor);
  state.ring.y = lerp(state.ring.y, state.mouse.y, CONFIG.lerpFactor);
  setPos(outline, state.ring.x, state.ring.y);

  state.rafId = requestAnimationFrame(tick);
};


/* ── Hover Detection ──────────────────────────────────────────────*/

/**
 * Walk up the DOM from `el`, checking if any ancestor matches
 * the given list of CSS selectors OR has `cursor: pointer` computed.
 *
 * We climb the tree rather than just checking `e.target` so that
 * a <span> inside a <button> still triggers the hover state.
 *
 * @param  {string[]} selectors
 * @param  {Element}  el
 * @returns {boolean}
 */
const ancestorMatches = (selectors, el) => {
  let node = el;
  while (node && node !== document.documentElement) {
    if (node.nodeType === 1) {                              // element node
      if (selectors.some(sel => node.matches(sel))) return true;
      if (getComputedStyle(node).cursor === 'pointer')     return true;
    }
    node = node.parentElement;
  }
  return false;
};

/**
 * Given the element currently under the cursor, apply the
 * correct cursor mode class (hover / text / default).
 * @param {Element} target
 */
const applyHoverState = (target) => {
  const wantsText  = ancestorMatches(CONFIG.textSelectors,  target);
  const wantsHover = !wantsText && ancestorMatches(CONFIG.hoverSelectors, target);

  /* Hover state */
  if (wantsHover !== state.isHovering) {
    state.isHovering = wantsHover;
    wantsHover ? add('is-hovering') : remove('is-hovering');
  }

  /* Text/input state */
  if (wantsText !== state.isText) {
    state.isText = wantsText;
    wantsText ? add('is-text') : remove('is-text');
  }
};


/* ── Ripple Effect ────────────────────────────────────────────────*/

/**
 * Spawn a single expanding ripple circle at the given viewport coords.
 * The element removes itself once its CSS animation ends, keeping
 * the DOM lean even during rapid clicking.
 * @param {number} x
 * @param {number} y
 */
const spawnRipple = (x, y) => {
  /* Evict the oldest ripple if we're at the limit */
  if (state.ripples.length >= CONFIG.maxRipples) {
    const evicted = state.ripples.shift();
    evicted.remove();
  }

  const el = document.createElement('div');
  el.className  = 'cursor-ripple';
  el.style.left = `${x}px`;
  el.style.top  = `${y}px`;
  document.body.appendChild(el);
  state.ripples.push(el);

  /* Self-cleanup once the animation finishes */
  el.addEventListener('animationend', () => {
    el.remove();
    const i = state.ripples.indexOf(el);
    if (i !== -1) state.ripples.splice(i, 1);
  }, { once: true });
};


/* ── Event Handlers ───────────────────────────────────────────────*/

/**
 * mousemove — update raw position and detect what's under the cursor.
 */
const onMouseMove = (e) => {
  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;

  /* Reveal cursor on first movement */
  if (!state.isVisible) {
    state.isVisible = true;
    remove('is-hidden');
  }

  applyHoverState(e.target);
};

/**
 * mousedown — engage the click state and spawn a ripple.
 */
const onMouseDown = (e) => {
  state.isClicking = true;
  add('is-clicking');
  spawnRipple(e.clientX, e.clientY);
};

/**
 * mouseup — release the click state.
 */
const onMouseUp = () => {
  state.isClicking = false;
  remove('is-clicking');
};

/**
 * mouseleave (document) — hide cursor when pointer exits the viewport.
 */
const onMouseLeave = () => {
  add('is-hidden');
  state.isVisible = false;
};

/**
 * mouseenter (document) — show cursor when pointer re-enters.
 */
const onMouseEnter = () => {
  remove('is-hidden');
  state.isVisible = true;
};


/* ── Initialisation ───────────────────────────────────────────────*/

/**
 * Bootstrap everything.
 * Attaches event listeners and starts the animation loop.
 * Safe to call multiple times (idempotent guard via rafId check).
 */
const initCursor = () => {
  /* Start hidden until the mouse first moves into the window */
  add('is-hidden');

  /* Position listeners */
  document.addEventListener('mousemove',  onMouseMove, { passive: true });
  document.addEventListener('mousedown',  onMouseDown);
  document.addEventListener('mouseup',    onMouseUp);
  document.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('mouseenter', onMouseEnter);

  /* Kick off the animation loop */
  if (!state.rafId) {
    state.rafId = requestAnimationFrame(tick);
  }
};

/* Run as soon as the DOM is parsed */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCursor);
} else {
  initCursor();
}
