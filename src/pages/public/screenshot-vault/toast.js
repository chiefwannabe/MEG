const host = () => document.getElementById("toastHost");

/**
 * Shows a small pill notification.
 * @param {string} message
 * @param {{ actionLabel?: string, onAction?: () => void, duration?: number }} [opts]
 */
export function showToast(message, opts = {}) {
  const { actionLabel, onAction, duration = 4000 } = opts;
  const toastHost = host();
  if (!toastHost) return () => {};

  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");

  const text = document.createElement("span");
  text.textContent = message;
  el.appendChild(text);

  let timer;
  if (actionLabel && onAction) {
    const btn = document.createElement("button");
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      clearTimeout(timer);
      onAction();
      el.remove();
    });
    el.appendChild(btn);
  }

  toastHost.appendChild(el);
  timer = setTimeout(() => el.remove(), duration);
  return () => { clearTimeout(timer); el.remove(); };
}
