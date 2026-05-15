(function bootstrapTheme() {
  "use strict";
  const KEY = "ecotrack:theme";
  let theme = "dark";
  try {
    theme = localStorage.getItem(KEY) || "dark";
  } catch (_) {}
  if (theme !== "dark") theme = "light";
  document.documentElement.setAttribute("data-theme", theme);

  window.EcoTheme = {
    get current() {
      return document.documentElement.getAttribute("data-theme") || "dark";
    },
    set(next) {
      const value = next === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", value);
      try {
        localStorage.setItem(KEY, value);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("ecotheme:change", { detail: value }));
    },
  };
})();
