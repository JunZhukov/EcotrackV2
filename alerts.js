const TOAST_TYPES = new Set(["success", "info", "warning", "error"]);
const DEFAULT_DURATION_MS = 3600;

const TOAST_ICONS = {
  success:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="2.2" /><path d="M12 11v5" stroke-width="2.4" stroke-linecap="round" /><circle cx="12" cy="7.6" r="1.25" fill="currentColor" stroke="none" /></svg>',
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 3.5 21 19H3z" stroke-width="2.2" stroke-linejoin="round" /><path d="M12 10v4.5" stroke-width="2.4" stroke-linecap="round" /><circle cx="12" cy="17.4" r="1.25" fill="currentColor" stroke="none" /></svg>',
  error:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="2.2" /><path d="m9 9 6 6M15 9l-6 6" stroke-width="2.4" stroke-linecap="round" /></svg>',
};

const TOAST_TITLES = {
  success: "Success",
  info: "Heads up",
  warning: "Warning",
  error: "Oops!",
};

function ensureToastContainer() {
  let container = document.querySelector(".toast-container");
  if (container) return container;

  container = document.createElement("div");
  container.className = "toast-container";
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-atomic", "true");
  document.body.appendChild(container);
  return container;
}

function updateContainerState(container) {
  if (!container) return;
  const hasActive = container.querySelector(".toast.is-visible") !== null;
  container.classList.toggle("has-active", hasActive);
}

function buildToastElement(type, title, message) {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");

  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type]}</span>
    <div class="toast-body">
      <p class="toast-title"></p>
      <p class="toast-message"></p>
    </div>
    <button type="button" class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  el.querySelector(".toast-title").textContent = title;
  el.querySelector(".toast-message").textContent = message;
  return el;
}

function dismissToast(toast) {
  if (!toast || toast.dataset.dismissing === "true") return;
  toast.dataset.dismissing = "true";
  const container = toast.parentElement;
  toast.classList.remove("is-visible");
  toast.classList.add("is-leaving");

  const cleanup = () => {
    toast.remove();
    updateContainerState(container);
  };

  toast.addEventListener("transitionend", cleanup, { once: true });
  window.setTimeout(() => {
    if (toast.isConnected) cleanup();
  }, 600);
}

window.showToast = function showToast(type, message, options = {}) {
  const safeType = TOAST_TYPES.has(type) ? type : "info";
  const duration = Number.isFinite(options.duration)
    ? options.duration
    : DEFAULT_DURATION_MS;
  const title = options.title || TOAST_TITLES[safeType];

  const container = ensureToastContainer();
  const toast = buildToastElement(safeType, title, String(message ?? ""));
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
    updateContainerState(container);
  });

  toast.addEventListener("click", (event) => {
    if (event.target.closest(".toast-close")) {
      dismissToast(toast);
      return;
    }
    dismissToast(toast);
  });

  if (duration > 0) {
    window.setTimeout(() => dismissToast(toast), duration);
  }

  return toast;
};
