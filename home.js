(function homePage() {
  "use strict";

  const STORAGE_KEY = "ecotrack:gamification";
  const DISPLAY_KEY = "ecotrack:userName";
  const XP_PER_LEVEL = 500;
  const TODAY = new Date().toISOString().slice(0, 10);
  /** Approx CO2 saved per XP point (rough heuristic for display only) */
  const KG_CO2_PER_XP = 0.018;

  const DAILY_TIPS = [
    { chip: "Transportation", text: "Consider walking for trips under 1 km." },
    { chip: "Food", text: "Try one meat-free meal — plant dishes have a lighter footprint." },
    { chip: "Energy", text: "Unplug idle chargers tonight; phantom draw adds up." },
    { chip: "Water", text: "A shorter shower saves liters compared to lingering under the spray." },
    { chip: "Recycling", text: "Rinse jars and cans before tossing — clean recyclables actually get recycled." },
    { chip: "Mindset", text: "Stack one new eco-habit on top of an existing routine to make it stick." },
    { chip: "Transportation", text: "Carpool or take transit once this week to shrink your transport footprint." },
  ];

  /** Curated headliner badges to spotlight on the homepage when defs aren't loaded */
  const FALLBACK_BADGES = [
    { id: "first-step", icon: "🌱", name: "First Step" },
    { id: "cyclist", icon: "🚲", name: "Cyclist" },
    { id: "plant-power", icon: "🥗", name: "Plant Power" },
    { id: "saver", icon: "💡", name: "Energy Saver" },
    { id: "drip-defender", icon: "💧", name: "Drip Defender" },
    { id: "full-deck", icon: "✨", name: "Full Deck" },
    { id: "streak-3", icon: "🔥", name: "3-Day Streak" },
    { id: "streak-7", icon: "⭐", name: "Week Hero" },
    { id: "lvl-5", icon: "🏆", name: "Level 5" },
  ];

  /** Default quests fallback that matches gamification.js DEFAULT_QUESTS */
  const FALLBACK_QUESTS = [
    { id: "log-meal", text: "Log a plant-based meal today", xp: 40 },
    { id: "walk-bike", text: "Walk or bike instead of driving", xp: 60 },
    { id: "track-energy", text: "Track today's energy usage", xp: 30 },
    { id: "save-water", text: "Take a shorter shower", xp: 25 },
  ];

  function xpLevel(xp) {
    return Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
  }

  function xpIntoLevel(xp) {
    return (xp || 0) % XP_PER_LEVEL;
  }

  function readState() {
    if (window.__ecoState && typeof window.__ecoState === "object") return window.__ecoState;
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function quests() {
    return Array.isArray(window.__ecoDefaultQuests) ? window.__ecoDefaultQuests : FALLBACK_QUESTS;
  }

  function badgeDefs() {
    return Array.isArray(window.__ecoBadgeDefs) ? window.__ecoBadgeDefs : FALLBACK_BADGES;
  }

  function streakMultiplier(streak) {
    if (typeof window.__ecoStreakMultiplier === "function") {
      return window.__ecoStreakMultiplier(streak);
    }
    if (streak >= 14) return 2.5;
    if (streak >= 7) return 2;
    if (streak >= 3) return 1.5;
    return 1;
  }

  function todayDoneIds(state) {
    const bucket = state.quests && state.quests[TODAY] ? state.quests[TODAY] : {};
    return new Set(Object.keys(bucket).filter((id) => bucket[id]));
  }

  function ecoTier(levelNum) {
    if (levelNum <= 1) return { icon: "🌱", title: "Seedling" };
    if (levelNum <= 3) return { icon: "🌿", title: "Sprout" };
    if (levelNum <= 5) return { icon: "🪴", title: "Sapling" };
    if (levelNum <= 8) return { icon: "🌳", title: "Canopy" };
    if (levelNum <= 14) return { icon: "🌲", title: "Grove Keeper" };
    return { icon: "🏞️", title: "Guardian" };
  }

  function formatDisplayName(raw) {
    const s = (raw || "").trim();
    if (!s) return "Eco Champion";
    return s
      .split(/\s+/)
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ")
      .trim();
  }

  function tipOfDayIndex() {
    const d = new Date();
    return (d.getFullYear() * 367 + (d.getMonth() + 1) * 31 + d.getDate()) % DAILY_TIPS.length;
  }

  function weeklyStatusCopy(streak, completedToday) {
    if (streak >= 4 || completedToday >= 3) return "You are on track with your weekly goal!";
    if (streak >= 2 || completedToday >= 1) return "You're building momentum toward your weekly goal.";
    return "Log today's eco-actions to stay on pace with your weekly goal.";
  }

  function todayWeekIndex() {
    // 0 = Mon ... 6 = Sun, matching the markup labels
    const d = new Date().getDay();
    return (d + 6) % 7;
  }

  /** Animate a number from current value to target */
  function animateNumber(el, target, opts = {}) {
    if (!el) return;
    const duration = opts.duration || 900;
    const formatter = opts.format || ((n) => Math.round(n).toLocaleString());
    const start = performance.now();
    const from = Number(el.dataset.value || 0);
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      el.textContent = formatter(value);
      if (t < 1) requestAnimationFrame(tick);
      else el.dataset.value = String(target);
    }
    requestAnimationFrame(tick);
  }

  /** Build the today's-missions list */
  function renderMissions(state) {
    const list = document.getElementById("missionsList");
    const badge = document.getElementById("missionsBadge");
    const fill = document.getElementById("missionsProgressFill");
    if (!list) return;

    const done = todayDoneIds(state);
    const all = quests();
    const total = all.length;
    const doneCount = all.filter((q) => done.has(q.id)).length;

    list.innerHTML = "";
    all.forEach((q) => {
      const li = document.createElement("li");
      li.className = "mission-item" + (done.has(q.id) ? " is-done" : "");
      li.innerHTML = `
        <span class="mission-check" aria-hidden="true">${done.has(q.id) ? "✓" : ""}</span>
        <p class="mission-text">${q.text}</p>
        <span class="mission-reward">+${q.xp} XP</span>
      `;
      list.appendChild(li);
    });

    if (badge) badge.textContent = `${doneCount}/${total}`;
    if (fill) fill.style.width = `${total ? (doneCount / total) * 100 : 0}%`;
  }

  /** Render this week's 7-day streak strip */
  function renderWeekStrip(state) {
    const days = document.querySelectorAll(".streak-day");
    if (!days.length) return;
    const todayIdx = todayWeekIndex();
    const streak = Math.max(0, Math.min(7, Number(state.streak || 0)));

    days.forEach((el) => {
      el.classList.remove("is-lit", "is-today");
    });

    // Light current day + previous (streak - 1) days
    for (let i = 0; i < streak; i++) {
      const idx = (todayIdx - i + 7) % 7;
      const el = days[idx];
      if (el) el.classList.add("is-lit");
    }
    const todayEl = days[todayIdx];
    if (todayEl) todayEl.classList.add("is-today");
  }

  /** Render the XP ring progress */
  function renderXpRing(state) {
    const fill = document.getElementById("xpRingFill");
    if (!fill) return;
    const r = 52;
    const circumference = 2 * Math.PI * r;
    fill.setAttribute("stroke-dasharray", String(circumference));

    const prog = xpIntoLevel(state.xp || 0);
    const pct = Math.min(1, prog / XP_PER_LEVEL);
    requestAnimationFrame(() => {
      fill.style.strokeDashoffset = String(circumference * (1 - pct));
    });
  }

  /** Render the badge showcase strip */
  function renderBadges(state) {
    const strip = document.getElementById("homeBadgeStrip");
    const meta = document.getElementById("statBadges");
    if (!strip) return;

    const defs = badgeDefs();
    const earned = state.earnedBadges || {};
    const earnedCount = defs.filter((d) => earned[d.id]).length;

    // Spotlight: earned first, then a few locked teasers (max 12)
    const earnedList = defs.filter((d) => earned[d.id]).slice(0, 6);
    const lockedList = defs.filter((d) => !earned[d.id]).slice(0, 12 - earnedList.length);
    const spotlight = [...earnedList, ...lockedList];

    strip.innerHTML = "";
    spotlight.forEach((b) => {
      const isEarned = !!earned[b.id];
      const tile = document.createElement("div");
      tile.className = "badge-tile" + (isEarned ? " is-earned" : "");
      tile.tabIndex = 0;
      tile.setAttribute(
        "aria-label",
        `${b.name} — ${isEarned ? "Earned" : "Locked"}`
      );
      tile.innerHTML = `
        <span class="badge-tile-icon" aria-hidden="true">${b.icon}</span>
        <p class="badge-tile-name">${b.name}</p>
      `;

      const show = () => {
        if (typeof window.__ecoShowBadgePop === "function") {
          window.__ecoShowBadgePop(tile, b, isEarned);
        }
      };
      const hide = () => {
        if (typeof window.__ecoHideBadgePop === "function") {
          window.__ecoHideBadgePop();
        }
      };
      tile.addEventListener("mouseenter", show);
      tile.addEventListener("focus", show);
      tile.addEventListener("mouseleave", hide);
      tile.addEventListener("blur", hide);

      strip.appendChild(tile);
    });

    if (meta) meta.textContent = `${earnedCount}/${defs.length}`;
  }

  function hydrate() {
    const stored = formatDisplayName(localStorage.getItem(DISPLAY_KEY));
    const state = readState();

    const xpTotal = Math.max(0, Number(state.xp || 0));
    const streak = Math.max(0, Number(state.streak || 0));
    const lvl = xpLevel(xpTotal);
    const tier = ecoTier(lvl);
    const completedToday = todayDoneIds(state).size;
    const mult = streakMultiplier(streak);

    /* --- HERO --- */
    const nameEl = document.getElementById("homeUserName");
    if (nameEl) nameEl.textContent = stored;

    const heroXp = document.getElementById("heroXpToday");
    if (heroXp) {
      const all = quests();
      const earnedToday = all
        .filter((q) => (state.quests && state.quests[TODAY] && state.quests[TODAY][q.id]))
        .reduce((sum, q) => sum + Math.round((q.xp || 0) * mult), 0);
      heroXp.textContent = `+${earnedToday}`;
    }

    const heroStreak = document.getElementById("heroStreakChip");
    if (heroStreak) heroStreak.textContent = streak === 1 ? "1 day" : `${streak} days`;

    const heroSaved = document.getElementById("heroSavedChip");
    if (heroSaved) {
      const kg = (xpTotal * KG_CO2_PER_XP).toFixed(1);
      heroSaved.textContent = `${kg} kg CO₂`;
    }

    /* --- STAT TILES --- */
    animateNumber(document.getElementById("statLevel"), lvl);
    animateNumber(document.getElementById("statXp"), xpTotal);
    const statQuests = document.getElementById("statQuests");
    if (statQuests) statQuests.textContent = `${completedToday}/${quests().length}`;

    /* --- LEVEL / XP RING CARD --- */
    const levelIconEl = document.getElementById("homeLevelIcon");
    const levelTierEl = document.getElementById("homeLevelTier");
    const levelBadgeEl = document.getElementById("homeLevelBadge");
    const xpProgEl = document.getElementById("homeXpProgress");
    const xpMaxEl = document.getElementById("homeXpMax");
    if (levelIconEl) levelIconEl.textContent = tier.icon;
    if (levelTierEl) levelTierEl.textContent = `${tier.title} — Level ${lvl}`;
    if (levelBadgeEl) levelBadgeEl.textContent = `Lv ${lvl}`;
    if (xpProgEl) xpProgEl.textContent = String(xpIntoLevel(xpTotal));
    if (xpMaxEl) xpMaxEl.textContent = String(XP_PER_LEVEL);
    renderXpRing(state);

    const caption = document.getElementById("homeLevelCaption");
    if (caption) {
      const remain = XP_PER_LEVEL - xpIntoLevel(xpTotal);
      caption.textContent =
        lvl > 99
          ? "Legendary devotion to your eco journey."
          : `${remain} XP to reach Level ${lvl + 1}.`;
    }

    /* --- MISSIONS --- */
    renderMissions(state);

    /* --- STREAK CARD --- */
    const streakDays = document.getElementById("homeStreakDays");
    if (streakDays) {
      if (streak <= 0) streakDays.textContent = "Day 0";
      else if (streak === 1) streakDays.textContent = "1 Day";
      else streakDays.textContent = `${streak} Days`;
    }

    const streakSub = document.getElementById("homeStreakSubtitle");
    if (streakSub) {
      streakSub.textContent =
        streak >= 7
          ? "🔥 A week strong! Keep the lantern burning."
          : streak >= 3
            ? "Nice momentum — aim for 7 days to light your lantern bright."
            : streak >= 1
              ? "Every day you log strengthens the chain — don't break it!"
              : "Open your dashboard and complete a quest to spark your streak.";
    }

    const multBadge = document.getElementById("streakMultBadge");
    if (multBadge) {
      if (mult > 1) {
        multBadge.textContent = `x${mult} XP`;
        multBadge.hidden = false;
      } else {
        multBadge.hidden = true;
      }
    }

    renderWeekStrip(state);

    /* --- TIP --- */
    const tip = DAILY_TIPS[tipOfDayIndex()];
    const chip = document.getElementById("homeTipChip");
    const body = document.getElementById("homeTipBody");
    if (chip) chip.textContent = `${tip.chip} tip`;
    if (body) body.textContent = tip.text;

    /* --- BADGES --- */
    renderBadges(state);

    /* --- QUICK ACTIONS POPUPS --- */
    attachQuickActionPopups();

    /* --- STATUS LINE --- */
    const statusParagraph = document.getElementById("homeWeeklyStatusText");
    if (statusParagraph)
      statusParagraph.textContent = weeklyStatusCopy(streak, completedToday);
  }

  const QUICK_ACTION_INFO = {
    "Log Activity": {
      icon: "📝",
      name: "Log Activity",
      desc: "Open today's eco-quests and tick off the habits you've completed.",
      statusLabel: "Quick action",
    },
    "Quick Log": {
      icon: "⚡",
      name: "Quick Log",
      desc: "Jump straight to your personalised eco-suggestions.",
      statusLabel: "Quick action",
    },
    Analytics: {
      icon: "📊",
      name: "Analytics",
      desc: "See your week-over-week emissions trends and detailed insights.",
      statusLabel: "Quick action",
    },
  };

  function attachQuickActionPopups() {
    const buttons = document.querySelectorAll(".home-qbtn");
    buttons.forEach((btn) => {
      if (btn.dataset.popupWired === "1") return;
      const labelEl = btn.querySelector("span:not(.home-qbtn-icon)");
      const label = (labelEl ? labelEl.textContent : btn.textContent || "").trim();
      const def = QUICK_ACTION_INFO[label];
      if (!def) return;

      const show = () => {
        if (typeof window.__ecoShowBadgePop === "function") {
          window.__ecoShowBadgePop(btn, def, true);
        }
      };
      const hide = () => {
        if (typeof window.__ecoHideBadgePop === "function") {
          window.__ecoHideBadgePop();
        }
      };
      btn.addEventListener("mouseenter", show);
      btn.addEventListener("focus", show);
      btn.addEventListener("mouseleave", hide);
      btn.addEventListener("blur", hide);
      btn.dataset.popupWired = "1";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrate);
  } else {
    hydrate();
  }
})();
