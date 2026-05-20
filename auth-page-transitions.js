/**
 * Smoother navigation between login/signup pages using the View Transitions API
 * when the browser supports it (Chromium). Falls back to normal navigation elsewhere.
 */
(function authPageTransitions() {
  "use strict";

  if (typeof document.startViewTransition !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function authFileName(pathname) {
    const seg = pathname.split("/").filter(Boolean);
    return (seg[seg.length - 1] || "").toLowerCase();
  }

  function isAuthDestination(url) {
    const f = authFileName(url.pathname);
    return (
      f === "login.html" ||
      f === "signup.html" ||
      f.startsWith("signup-step") ||
      f === "signup-final.html"
    );
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[href]");
    if (!anchor || anchor.target === "_blank") return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    let next;
    try {
      next = new URL(href, location.href);
    } catch (_) {
      return;
    }

    if (next.origin !== location.origin) return;
    if (!isAuthDestination(next)) return;

    event.preventDefault();
    document.startViewTransition(() => {
      location.assign(next.href);
    });
  });
})();
