(function dashboardGamified() {
  "use strict";

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animateNumber(el, target, opts) {
    if (!el) return;
    const options = opts || {};
    const duration = options.duration || 1000;
    const decimals = options.decimals != null ? options.decimals : 0;
    const suffix = options.suffix || "";

    if (reduceMotion) {
      el.firstChild
        ? (el.firstChild.nodeValue = target.toFixed(decimals) + suffix)
        : (el.textContent = target.toFixed(decimals) + suffix);
      return;
    }

    const start = 0;
    const startTime = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = start + (target - start) * eased;
      const formatted = val.toFixed(decimals) + suffix;
      if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
        el.firstChild.nodeValue = formatted;
      } else {
        el.textContent = formatted;
      }
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function init() {
    const heroStat = document.getElementById("dbHeroStat");
    if (heroStat) {
      const raw = (heroStat.firstChild && heroStat.firstChild.nodeValue) || "";
      const target = parseFloat(raw.trim());
      if (!isNaN(target)) {
        animateNumber(heroStat, target, { decimals: 1, duration: 1200 });
      }
    }

    const tileValues = document.querySelectorAll(".db-stat-tile-value");
    tileValues.forEach((el, idx) => {
      const raw = (el.firstChild && el.firstChild.nodeValue) || "";
      const target = parseFloat(raw.trim());
      if (!isNaN(target)) {
        setTimeout(() => {
          animateNumber(el, target, { decimals: 1, duration: 1000 });
        }, 120 * idx);
      }
    });

    const improvementBig = document.querySelector(
      ".improvement-stat--gamified .big-stat"
    );
    if (improvementBig) {
      const raw = improvementBig.textContent || "";
      const target = parseFloat(raw);
      if (!isNaN(target)) {
        animateNumber(improvementBig, target, {
          decimals: 1,
          duration: 1300,
          suffix: "%",
        });
      }
    }

    const comparisonValues = document.querySelectorAll(
      ".comparison-card .value"
    );
    comparisonValues.forEach((el, idx) => {
      const raw = el.textContent || "";
      const match = raw.match(/([\d.]+)/);
      const unitMatch = raw.match(/[a-zA-Z]+/);
      if (match) {
        const target = parseFloat(match[1]);
        const suffix = unitMatch ? " " + unitMatch[0] : "";
        setTimeout(() => {
          animateNumber(el, target, {
            decimals: 1,
            duration: 1100,
            suffix: suffix,
          });
        }, 150 * idx);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
