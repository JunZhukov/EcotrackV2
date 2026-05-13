(function settings() {
  "use strict";

  const NOTIF_KEY = "ecotrack:notifPrefs";
  const STATE_KEY = "ecotrack:gamification";

  const DEFAULT_NOTIFS = {
    dailyQuests: true,
    streakWarnings: true,
    achievements: true,
    weeklySummary: false,
    ecoTips: false,
  };

  const LEGAL_DOCS = {
    terms: {
      title: "Terms and Conditions",
      html: `
        <h3>1. Acceptance of Terms</h3>
        <p>By creating an EcoTrack account or using the app, you agree to these terms. If you don't agree, please don't use the service.</p>
        <h3>2. Your account</h3>
        <p>You're responsible for keeping your login credentials safe and for any activity that happens under your account.</p>
        <h3>3. Acceptable use</h3>
        <ul>
          <li>Don't try to break, exploit, or reverse-engineer the app.</li>
          <li>Don't use EcoTrack to spam, harass, or impersonate other people.</li>
          <li>Don't upload anything illegal or that you don't have the rights to share.</li>
        </ul>
        <h3>4. Eco data & estimates</h3>
        <p>Carbon-footprint numbers, suggestions, and XP rewards inside EcoTrack are estimates based on the info you provide. They are meant to motivate sustainable habits, not to serve as scientific or legal calculations.</p>
        <h3>5. Changes to the service</h3>
        <p>We may add, change, or remove features over time. We'll do our best to notify you about meaningful changes.</p>
        <h3>6. Termination</h3>
        <p>We may suspend or close accounts that violate these terms. You can stop using EcoTrack at any time and request that your data be deleted.</p>
        <h3>7. Contact</h3>
        <p>Questions about these terms? Reach the team at <strong>support@ecotrack.app</strong>.</p>
      `,
    },
    privacy: {
      title: "Privacy Policy",
      html: `
        <h3>What we collect</h3>
        <ul>
          <li><strong>Account info</strong> — email, username, and password (hashed).</li>
          <li><strong>Lifestyle info</strong> — answers you provide during signup (goals, energy use, diet, transport).</li>
          <li><strong>Activity data</strong> — quests you complete, streak history, and badges earned.</li>
        </ul>
        <h3>How we use it</h3>
        <p>Your data powers the personalized footprint estimate, daily quests, and progress tracking inside EcoTrack. We don't sell your personal information.</p>
        <h3>Where it lives</h3>
        <p>For this prototype, much of your gamification progress is stored locally on your device using your browser's storage. Server-stored data is encrypted in transit and at rest.</p>
        <h3>Your controls</h3>
        <ul>
          <li>Reset your in-app progress at any time from Settings → Account.</li>
          <li>Request a copy or deletion of your account data by emailing us.</li>
          <li>Toggle notifications on or off from Settings → Notifications.</li>
        </ul>
        <h3>Children</h3>
        <p>EcoTrack is meant for users 13 and older. We don't knowingly collect data from younger children.</p>
        <h3>Contact</h3>
        <p>For privacy questions, reach out at <strong>privacy@ecotrack.app</strong>.</p>
      `,
    },
  };

  function toast(type, msg) {
    if (typeof window.showToast === "function") {
      try {
        window.showToast(type, msg);
      } catch (_) {}
    }
  }

  /* ---------- THEME ---------- */

  function initTheme() {
    const options = document.querySelectorAll(".theme-option");
    const current = window.EcoTheme ? window.EcoTheme.current : "light";

    options.forEach((btn) => {
      const value = btn.dataset.themeValue;
      btn.setAttribute("aria-checked", value === current ? "true" : "false");
      btn.addEventListener("click", () => {
        const next = btn.dataset.themeValue;
        if (window.EcoTheme) window.EcoTheme.set(next);
        options.forEach((b) =>
          b.setAttribute("aria-checked", b.dataset.themeValue === next ? "true" : "false")
        );
        toast(
          "success",
          next === "dark" ? "Night Mode is on. Welcome to the dark side 🌙" : "Light Mode is on. ☀️"
        );
      });
    });
  }

  /* ---------- NOTIFICATIONS ---------- */

  function loadNotifs() {
    try {
      const saved = JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
      return { ...DEFAULT_NOTIFS, ...saved };
    } catch (_) {
      return { ...DEFAULT_NOTIFS };
    }
  }

  function saveNotifs(prefs) {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }

  function initNotifs() {
    const prefs = loadNotifs();
    const inputs = document.querySelectorAll("[data-notif]");
    inputs.forEach((input) => {
      const key = input.dataset.notif;
      if (typeof prefs[key] === "boolean") input.checked = prefs[key];
      input.addEventListener("change", () => {
        prefs[key] = input.checked;
        saveNotifs(prefs);
        const label = input
          .closest(".settings-row")
          ?.querySelector(".settings-row-title")?.textContent || "Preference";
        toast(
          input.checked ? "success" : "info",
          `${label} ${input.checked ? "turned on" : "turned off"}.`
        );
      });
    });
  }

  /* ---------- LEGAL MODAL ---------- */

  function initLegal() {
    const modal = document.querySelector("#legalModal");
    const titleEl = document.querySelector("#legalTitle");
    const bodyEl = document.querySelector("#legalBody");
    if (!modal || !titleEl || !bodyEl) return;

    let lastFocused = null;

    function openDoc(key) {
      const doc = LEGAL_DOCS[key];
      if (!doc) return;
      lastFocused = document.activeElement;
      titleEl.textContent = doc.title;
      bodyEl.innerHTML = doc.html;
      bodyEl.scrollTop = 0;
      modal.hidden = false;
      requestAnimationFrame(() => {
        modal.querySelector(".legal-close")?.focus();
      });
    }

    function closeDoc() {
      modal.hidden = true;
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    document.querySelectorAll("[data-open-doc]").forEach((row) => {
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      const trigger = () => openDoc(row.dataset.openDoc);
      row.addEventListener("click", trigger);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trigger();
        }
      });
    });

    modal.querySelectorAll("[data-close='modal']").forEach((el) => {
      el.addEventListener("click", closeDoc);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeDoc();
    });
  }

  /* ---------- ACCOUNT ACTIONS ---------- */

  function initAccount() {
    const resetBtn = document.querySelector("#resetProgress");
    const signOutBtn = document.querySelector("#signOut");

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const ok = window.confirm(
          "Reset all of your XP, quests, streaks, and badges? This can't be undone."
        );
        if (!ok) return;
        try {
          localStorage.removeItem(STATE_KEY);
        } catch (_) {}
        toast("info", "Progress reset. Starting fresh!");
        window.setTimeout(() => window.location.reload(), 900);
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener("click", () => {
        toast("info", "Signing you out...");
        window.setTimeout(() => {
          window.location.assign("./login.html");
        }, 700);
      });
    }
  }

  function init() {
    initTheme();
    initNotifs();
    initLegal();
    initAccount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
