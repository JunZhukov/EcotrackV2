(function gamification() {
  "use strict";

  const STORAGE_KEY = "ecotrack:gamification";
  const TODAY = new Date().toISOString().slice(0, 10);
  const XP_PER_LEVEL = 500;

  const DEFAULT_QUESTS = [
    { id: "log-meal", text: "Log a plant-based meal today", xp: 40 },
    { id: "walk-bike", text: "Walk or bike instead of driving", xp: 60 },
    { id: "track-energy", text: "Track today's energy usage", xp: 30 },
    { id: "save-water", text: "Take a shorter shower", xp: 25 },
  ];

  /** Long-running goals — progress only (no clicks); totals come from saved state */
  const MAIN_QUEST_DEFS = [
    {
      id: "mq-roots",
      icon: "🌳",
      title: "Deep roots",
      blurb: "Reach 100 lifetime eco-quest completions.",
      pct: (s) => pctCap((s.questsCompleted || 0) / 100),
      label: (s) =>
        pctLabel(Math.min(s.questsCompleted || 0, 999), 100, "completions"),
      isDone: (s) => (s.questsCompleted || 0) >= 100,
    },
    {
      id: "mq-blaze",
      icon: "🔥",
      title: "Blazing trail",
      blurb: "Hit a 14-day streak.",
      pct: (s) => pctCap((s.streak || 0) / 14),
      label: (s) => pctLabel(Math.min(s.streak || 0, 99), 14, "days"),
      isDone: (s) => (s.streak || 0) >= 14,
    },
    {
      id: "mq-rise",
      icon: "⛰️",
      title: "High climb",
      blurb: "Reach Level 10.",
      pct: (s) => pctCap((levelSafe(s.xp) - 1) / 9),
      label: (s) => pctLabel(levelSafe(s.xp), 10, "level"),
      isDone: (s) => levelSafe(s.xp) >= 10,
    },
    {
      id: "mq-vault",
      icon: "💚",
      title: "Emerald vault",
      blurb: "Bank 5,000 lifetime XP.",
      pct: (s) => pctCap((s.xp || 0) / 5000),
      label: (s) =>
        pctLabel(Math.min(Math.round(s.xp || 0), 99999), 5000, "XP"),
      isDone: (s) => (s.xp || 0) >= 5000,
    },
    {
      id: "mq-collector",
      icon: "🏅",
      title: "Badge collector",
      blurb: "Unlock 25 achievements.",
      pct: (s) => pctCap(pctCountEarnedBadges(s) / 25),
      label: (s) =>
        pctLabel(pctCountEarnedBadges(s), 25, "badges"),
      isDone: (s) => pctCountEarnedBadges(s) >= 25,
    },
  ];

  function pctCap(ratio) {
    return Math.min(100, Math.max(0, Math.round(ratio * 1000) / 10));
  }

  function levelSafe(xp) {
    return Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
  }

  function pctCountEarnedBadges(state) {
    const e = state.earnedBadges || {};
    return Object.keys(e).length;
  }

  function pctLabel(cur, max, unitWord) {
    return `${Math.min(cur, max)}/${max} ${unitWord}`;
  }

  const BADGE_DEFS = [
    {
      id: "first-step",
      icon: "🌱",
      name: "First Step",
      desc: "Complete any daily eco-quest for the very first time.",
      hint: "Tick off one quest in Today's Eco-Quests.",
      req: (s) => s.questsCompleted >= 1,
    },
    {
      id: "cyclist",
      icon: "🚲",
      name: "Cyclist",
      desc: "Choose walking or biking over driving today.",
      hint: "Complete the “Walk or bike instead of driving” quest.",
      req: (s) => s.questDone["walk-bike"],
    },
    {
      id: "plant-power",
      icon: "🥗",
      name: "Plant Power",
      desc: "Eat a plant-based meal and log it.",
      hint: "Complete the “Log a plant-based meal today” quest.",
      req: (s) => s.questDone["log-meal"],
    },
    {
      id: "saver",
      icon: "💡",
      name: "Energy Saver",
      desc: "Keep tabs on your daily home energy usage.",
      hint: "Complete the “Track today's energy usage” quest.",
      req: (s) => s.questDone["track-energy"],
    },
    {
      id: "drip-defender",
      icon: "💧",
      name: "Drip Defender",
      desc: "Log a mindful water-saving habit.",
      hint: "Complete the “Take a shorter shower” quest.",
      req: (s) => s.questDone["save-water"],
    },
    {
      id: "full-deck",
      icon: "✨",
      name: "Full Deck",
      desc: "Complete every eco-quest in a single day.",
      hint: "Check off all four quests in Today's Eco-Quests on the same day.",
      req: (s) => DEFAULT_QUESTS.every((q) => !!s.questDone[q.id]),
    },
    {
      id: "steady-ten",
      icon: "🪷",
      name: "Steady Routine",
      desc: "Reach 10 total quest completions (lifetime clicks).",
      hint: "Complete daily quests repeatedly — totals add up forever.",
      req: (s) => s.questsCompleted >= 10,
    },
    {
      id: "quest-veteran",
      icon: "📊",
      name: "Quest Veteran",
      desc: "25 lifetime quest completions.",
      hint: "Keep finishing daily quests to grow this tally.",
      req: (s) => s.questsCompleted >= 25,
    },
    {
      id: "green-machine",
      icon: "🌿",
      name: "Green Machine",
      desc: "50 lifetime quest completions.",
      hint: "High consistency — quests completed over multiple days.",
      req: (s) => s.questsCompleted >= 50,
    },
    {
      id: "century-club",
      icon: "💯",
      name: "Century Club",
      desc: "100 lifetime quest completions — serious dedication.",
      hint: "The ultimate grind badge for daily quests.",
      req: (s) => s.questsCompleted >= 100,
    },
    {
      id: "eco-riser",
      icon: "⬆️",
      name: "Eco Riser",
      desc: "Reach Level 3.",
      hint: "Earn ~1,000 total XP from quests.",
      req: (s) => s.level >= 3,
    },
    {
      id: "streak-3",
      icon: "🔥",
      name: "3-Day Streak",
      desc: "Stay consistent — log activity 3 days in a row.",
      hint: "Open the app and complete a quest 3 days running.",
      req: (s) => s.streak >= 3,
    },
    {
      id: "streak-7",
      icon: "⭐",
      name: "Week Hero",
      desc: "A full week of eco-friendly habits.",
      hint: "Maintain a 7-day streak without breaking it.",
      req: (s) => s.streak >= 7,
    },
    {
      id: "fortnight-force",
      icon: "⚡",
      name: "Fortnight Force",
      desc: "14-day streak unlocked.",
      hint: "Return every day for two straight weeks.",
      req: (s) => s.streak >= 14,
    },
    {
      id: "momentum-month",
      icon: "🗓️",
      name: "Momentum",
      desc: "21 consecutive days engaged.",
      hint: "Three-week streak.",
      req: (s) => s.streak >= 21,
    },
    {
      id: "unbroken",
      icon: "🏅",
      name: "Unbroken",
      desc: "30-day streak hero.",
      hint: "One full calendar month without missing.",
      req: (s) => s.streak >= 30,
    },
    {
      id: "lvl-5",
      icon: "🏆",
      name: "Level 5",
      desc: "Hit Level 5 by earning XP from quests.",
      hint: "Earn 2,000 total XP.",
      req: (s) => s.level >= 5,
    },
    {
      id: "summit-strider",
      icon: "🚀",
      name: "Summit Strider",
      desc: "Reach Level 15.",
      hint: "Earn 7,000 total XP.",
      req: (s) => s.level >= 15,
    },
    {
      id: "lvl-10",
      icon: "👑",
      name: "Level 10",
      desc: "Become an EcoTrack champion at Level 10.",
      hint: "Earn 4,500 total XP.",
      req: (s) => s.level >= 10,
    },
    {
      id: "glimmer",
      icon: "💎",
      name: "Glimmer Stone",
      desc: "1,500 total XP earned lifetime.",
      hint: "Farm XP via quests — streak boosts help.",
      req: (s) => s.xp >= 1500,
    },
    {
      id: "star-core",
      icon: "🌟",
      name: "Star Core",
      desc: "Hit 5,000 total XP lifetime.",
      hint: "Higher streak multipliers accelerate this milestone.",
      req: (s) => s.xp >= 5000,
    },
    /* —— Expanded set (milestones beyond the originals) —— */
    {
      id: "pathfinder-plus",
      icon: "📍",
      name: "Pathfinder Plus",
      desc: "35 lifetime quest completions — you're building a groove.",
      hint: "Chip away at daily quests; this total never resets downward.",
      req: (s) => s.questsCompleted >= 35,
    },
    {
      id: "bamboo-ridge",
      icon: "🎍",
      name: "Bamboo Ridge",
      desc: "65 quests finished — resilient like bamboo.",
      hint: "Stack completions across weeks.",
      req: (s) => s.questsCompleted >= 65,
    },
    {
      id: "night-eco",
      icon: "🦉",
      name: "Night Owl Eco",
      desc: "115 lifetime quest completions.",
      hint: "Consistency beats intensity — keep checking quests in.",
      req: (s) => s.questsCompleted >= 115,
    },
    {
      id: "current-rider",
      icon: "🌀",
      name: "Current Rider",
      desc: "175 quests surfed.",
      hint: "Grow your lifetime completion tally.",
      req: (s) => s.questsCompleted >= 175,
    },
    {
      id: "wind-chaser",
      icon: "🎐",
      name: "Wind Chaser",
      desc: "250 eco-quests logged lifetime.",
      hint: "Rare air — fewer than Legend, more than Casual.",
      req: (s) => s.questsCompleted >= 250,
    },
    {
      id: "catalyst-day",
      icon: "🧪",
      name: "Catalyst Core",
      desc: "350 lifetime quest completions — you're speeding reactions everywhere.",
      hint: "Heavy daily grind unlocks this one.",
      req: (s) => s.questsCompleted >= 350,
    },
    {
      id: "silver-moon",
      icon: "🌔",
      name: "Silver Moon",
      desc: "45-day streak — nearly seven weeks anchored.",
      hint: "Miss a day and you reset — plan around your rhythm.",
      req: (s) => s.streak >= 45,
    },
    {
      id: "comet-dash",
      icon: "☄️",
      name: "Comet Dash",
      desc: "55-day streak — blazing orbit.",
      hint: "Maintain daily engagement without skipping.",
      req: (s) => s.streak >= 55,
    },
    {
      id: "earth-bond",
      icon: "🌍",
      name: "Earth Bond",
      desc: "70 consecutive days grounded in habit.",
      hint: "Past Momentum — keep the streak chain unbroken.",
      req: (s) => s.streak >= 70,
    },
    {
      id: "orbit-pace",
      icon: "🛸",
      name: "Orbit Pace",
      desc: "85-day streak — circling greatness.",
      hint: "Ultra consistency in daily check-ins.",
      req: (s) => s.streak >= 85,
    },
    {
      id: "signal-keeper",
      icon: "📡",
      name: "Signal Keeper",
      desc: "100-day streak — rare discipline.",
      hint: "Nearly a third of a year showing up.",
      req: (s) => s.streak >= 100,
    },
    {
      id: "epoch-trail",
      icon: "⏳",
      name: "Epoch Trail",
      desc: "200-day streak legendary patience.",
      hint: "Months of uninterrupted momentum.",
      req: (s) => s.streak >= 200,
    },
    {
      id: "dew-drop",
      icon: "💧",
      name: "Dew Drop",
      desc: "Reach Level 2.",
      hint: "Earn XP from quests to level up.",
      req: (s) => s.level >= 2,
    },
    {
      id: "wild-mint",
      icon: "🌿",
      name: "Wild Mint",
      desc: "Level 4 clears the canopy floor.",
      hint: "Roughly 1,500 total XP unlocks.",
      req: (s) => s.level >= 4,
    },
    {
      id: "shell-sail",
      icon: "🐚",
      name: "Shell Sail",
      desc: "Level 6 sailor of sustainable habits.",
      hint: "~2,500 XP lifetime.",
      req: (s) => s.level >= 6,
    },
    {
      id: "trail-paw",
      icon: "🐾",
      name: "Trail Paw",
      desc: "Level 8 explorer.",
      hint: "~3,500 XP pushes you here.",
      req: (s) => s.level >= 8,
    },
    {
      id: "alpine-air",
      icon: "⛰️",
      name: "Alpine Air",
      desc: "Level 12 — crisp focus at altitude.",
      hint: "~5,500 XP trajectory.",
      req: (s) => s.level >= 12,
    },
    {
      id: "monarch-move",
      icon: "🦋",
      name: "Monarch Move",
      desc: "Level 14 transformation moment.",
      hint: "~6,500 XP earns this badge.",
      req: (s) => s.level >= 14,
    },
    {
      id: "vortex-vale",
      icon: "🔄",
      name: "Vortex Vale",
      desc: "Level 18 swirling champion.",
      hint: "~8,500 XP grind.",
      req: (s) => s.level >= 18,
    },
    {
      id: "myth-hoof",
      icon: "🦄",
      name: "Myth Hoof",
      desc: "Level 24 mythical momentum.",
      hint: "~11,500 XP clears the gate.",
      req: (s) => s.level >= 24,
    },
    {
      id: "drake-dust",
      icon: "🐲",
      name: "Drake Dust",
      desc: "Level 28 — ancient heat.",
      hint: "~13,500 XP earns the fire.",
      req: (s) => s.level >= 28,
    },
    {
      id: "ember-wick",
      icon: "✨",
      name: "Ember Wick",
      desc: "275 total XP sparks this glow.",
      hint: "Farm small quest rewards repeatedly.",
      req: (s) => s.xp >= 275,
    },
    {
      id: "beacon-sheen",
      icon: "🏮",
      name: "Beacon Sheen",
      desc: "950 XP lighthouse moment.",
      hint: "Higher streak multiplier accelerates totals.",
      req: (s) => s.xp >= 950,
    },
    {
      id: "disc-dawn",
      icon: "🔮",
      name: "Disc Dawn",
      desc: "2,750 XP constellation forming.",
      hint: "Sit between Spark and mega milestones.",
      req: (s) => s.xp >= 2750,
    },
    {
      id: "core-flare",
      icon: "🌠",
      name: "Core Flare",
      desc: "4,000 XP ignited lifetime.",
      hint: "Stacks with level badges near Level 10.",
      req: (s) => s.xp >= 4000,
    },
    {
      id: "focus-ring",
      icon: "🔆",
      name: "Focus Ring",
      desc: "6,000 XP steady beam.",
      hint: "Long quest sessions with multiplier help.",
      req: (s) => s.xp >= 6000,
    },
    {
      id: "pulse-apex",
      icon: "💠",
      name: "Pulse Apex",
      desc: "8,250 XP heartbeat peak.",
      hint: "Chains with Summit Strider progress.",
      req: (s) => s.xp >= 8250,
    },
    {
      id: "solar-mass",
      icon: "☀️",
      name: "Solar Mass",
      desc: "11,000 XP — you're basically a fusion reactor.",
      hint: "Ultra long-haul grinder badge.",
      req: (s) => s.xp >= 11000,
    },
    {
      id: "twin-creek",
      icon: "🫧",
      name: "Twin Creek",
      desc: "Same day — log a plant meal and a shorter shower together.",
      hint: 'Complete both "Log a plant-based meal" and "Take a shorter shower".',
      req: (s) => !!s.questDone["log-meal"] && !!s.questDone["save-water"],
    },
  ];

  function loadState() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {
      saved = {};
    }

    const state = {
      xp: 0,
      streak: 1,
      lastActive: null,
      quests: {}, // { date: { id: true } }
      earnedBadges: {},
      questsCompleted: 0,
      ...saved,
    };

    if (!state.quests[TODAY]) state.quests[TODAY] = {};

    // streak handling
    if (state.lastActive && state.lastActive !== TODAY) {
      const last = new Date(state.lastActive);
      const today = new Date(TODAY);
      const diffDays = Math.round((today - last) / 86400000);
      if (diffDays === 1) {
        state.streak = (state.streak || 0) + 1;
      } else if (diffDays > 1) {
        state.streak = 1;
      }
    }
    state.lastActive = TODAY;

    return state;
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function level(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
  }

  /** Competitive rank tiers — level gates + XP fills the intra-tier bar */
  const RANK_TIERS = [
    {
      id: "seedling",
      roman: "I",
      title: "Seedling",
      tagline: "Your journey into greener habits begins here.",
      minLevel: 1,
      exclusiveMaxLevel: 2,
    },
    {
      id: "sprout",
      roman: "II",
      title: "Sprout",
      tagline: "Small actions are taking root every day.",
      minLevel: 2,
      exclusiveMaxLevel: 4,
    },
    {
      id: "steward",
      roman: "III",
      title: "Eco Steward",
      tagline: "You reliably protect resources and rhythm.",
      minLevel: 4,
      exclusiveMaxLevel: 7,
    },
    {
      id: "champion",
      roman: "IV",
      title: "Planet Champion",
      tagline: "Your footprint story inspires others.",
      minLevel: 7,
      exclusiveMaxLevel: 11,
    },
    {
      id: "legend",
      roman: "V",
      title: "Planet Legend",
      tagline: "Elite defender of the biosphere.",
      minLevel: 11,
      exclusiveMaxLevel: Infinity,
    },
  ];

  function tierForLevel(lv) {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
      if (lv >= RANK_TIERS[i].minLevel) return RANK_TIERS[i];
    }
    return RANK_TIERS[0];
  }

  function nextTierAfter(tier) {
    const i = RANK_TIERS.indexOf(tier);
    return i >= 0 && i < RANK_TIERS.length - 1 ? RANK_TIERS[i + 1] : null;
  }

  function rankProgressPct(xpTotal, tier) {
    if (!tier || tier.exclusiveMaxLevel === Infinity) return { pct: 100, capped: true };
    const xpLow = (tier.minLevel - 1) * XP_PER_LEVEL;
    /** First XP outside this tier (= XP needed to unlock `exclusiveMaxLevel`) */
    const xpHighExclusive = (tier.exclusiveMaxLevel - 1) * XP_PER_LEVEL;
    const span = xpHighExclusive - xpLow;
    if (span <= 0) return { pct: 0, capped: false };
    const pct = Math.min(
      100,
      Math.max(0, Math.round(((xpTotal - xpLow) / span) * 1000) / 10)
    );
    return { pct, capped: false };
  }

  function xpProgress(xp) {
    return xp % XP_PER_LEVEL;
  }

  function streakMultiplier(streak) {
    if (streak >= 14) return 2.5;
    if (streak >= 7) return 2;
    if (streak >= 3) return 1.5;
    return 1;
  }

  function questDoneMap(state) {
    return state.quests[TODAY] || {};
  }

  function compositeStateForBadges(state) {
    return {
      streak: state.streak,
      level: level(state.xp),
      xp: state.xp,
      questsCompleted: state.questsCompleted,
      questDone: questDoneMap(state),
    };
  }

  function evaluateBadges(state) {
    const earned = state.earnedBadges || {};
    const newlyEarned = [];
    const composite = compositeStateForBadges(state);
    for (const def of BADGE_DEFS) {
      if (!earned[def.id] && def.req(composite)) {
        earned[def.id] = TODAY;
        newlyEarned.push(def);
      }
    }
    state.earnedBadges = earned;
    return newlyEarned;
  }

  function toast(type, message) {
    if (typeof window.showToast === "function") {
      try {
        window.showToast(type, message);
      } catch (_) {}
    }
  }

  function celebrate(message) {
    toast("success", message);
  }

  function renderLevel(state) {
    const badge = document.querySelector("#levelBadge");
    const title = document.querySelector("#levelTitle");
    const xpLabel = document.querySelector("#levelXpLabel");
    const fill = document.querySelector("#xpBarFill");
    const xpCur = document.querySelector("#xpCurrent");
    const xpMax = document.querySelector("#xpMax");

    const lvl = level(state.xp);
    const prog = xpProgress(state.xp);

    if (badge) badge.textContent = lvl;
    if (title) title.textContent = `Level ${lvl}`;
    if (xpLabel) xpLabel.textContent = `${XP_PER_LEVEL - prog} XP to Level ${lvl + 1}`;
    if (fill) fill.style.width = `${(prog / XP_PER_LEVEL) * 100}%`;
    if (xpCur) xpCur.textContent = `${prog} XP`;
    if (xpMax) xpMax.textContent = `${XP_PER_LEVEL} XP`;
  }

  function renderRank(state) {
    const wrap = document.querySelector("#rankTier");
    const roman = document.querySelector("#rankRoman");
    const titleEl = document.querySelector("#rankTitle");
    const subEl = document.querySelector("#rankSub");
    const nextLbl = document.querySelector("#rankNextLabel");
    const pctEl = document.querySelector("#rankPercent");
    const fill = document.querySelector("#rankBarFill");
    const bar = document.querySelector(".rank-bar");

    if (!wrap) return;

    const lv = level(state.xp);
    const tier = tierForLevel(lv);
    const next = nextTierAfter(tier);
    const { pct, capped } = rankProgressPct(state.xp || 0, tier);

    wrap.dataset.rank = tier.id;
    wrap.setAttribute("aria-label", `Rank ${tier.roman}: ${tier.title}`);

    if (roman) roman.textContent = tier.roman;
    if (titleEl) titleEl.textContent = tier.title;
    if (subEl) subEl.textContent = tier.tagline;

    if (capped || !next) {
      if (nextLbl) nextLbl.textContent = "Max tier";
      if (pctEl) pctEl.textContent = "";
      if (fill) fill.style.width = "100%";
      if (bar) {
        bar.setAttribute("aria-valuenow", "100");
        bar.setAttribute("aria-valuetext", capped ? "Maximum rank achieved" : "Highest tier");
      }
      return;
    }

    const needLv = next.minLevel;
    if (nextLbl)
      nextLbl.textContent = `Next: ${next.title} (${needLv})`;

    if (pctEl) pctEl.textContent = `${pct}%`;
    if (fill) fill.style.width = `${pct}%`;
    if (bar) {
      bar.setAttribute("aria-valuenow", String(Math.round(pct)));
      bar.setAttribute("aria-valuetext", `${pct}% to ${next.title}`);
    }
  }

  function renderQuests(state) {
    const list = document.querySelector("#questList");
    const meta = document.querySelector("#questsMeta");
    if (!list) return;
    list.innerHTML = "";

    const done = questDoneMap(state);
    let completed = 0;
    DEFAULT_QUESTS.forEach((q) => {
      if (done[q.id]) completed += 1;
      const li = document.createElement("li");
      li.className = "quest-item" + (done[q.id] ? " is-done" : "");
      li.dataset.questId = q.id;
      li.innerHTML = `
        <span class="quest-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12.5 10 19l10-13" />
          </svg>
        </span>
        <p class="quest-text"></p>
        <span class="quest-xp">+${q.xp} XP</span>
      `;
      li.querySelector(".quest-text").textContent = q.text;
      li.addEventListener("click", () => toggleQuest(q.id));
      list.appendChild(li);
    });

    if (meta) meta.textContent = `${completed}/${DEFAULT_QUESTS.length} completed today`;
  }

  function renderMainQuests(state) {
    const list = document.querySelector("#mainQuestList");
    const meta = document.querySelector("#mainQuestsMeta");
    if (!list) return;

    let done = 0;
    list.innerHTML = "";

    MAIN_QUEST_DEFS.forEach((mq) => {
      const finished = mq.isDone(state);
      if (finished) done += 1;
      const pct = mq.pct(state);
      const li = document.createElement("li");
      li.className = "main-quest-item" + (finished ? " is-done" : "");
      li.dataset.mqId = mq.id;
      li.innerHTML = `
        <span class="main-quest-icon" aria-hidden="true">${mq.icon}</span>
        <div class="main-quest-body">
          <div class="main-quest-top">
            <p class="main-quest-title"></p>
            <span class="main-quest-pill"></span>
          </div>
          <p class="main-quest-blurb"></p>
          <div class="main-quest-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="main-quest-fill"></div>
          </div>
        </div>
      `;
      li.querySelector(".main-quest-title").textContent = mq.title;
      li.querySelector(".main-quest-blurb").textContent = mq.blurb;
      const pill = li.querySelector(".main-quest-pill");
      pill.textContent = finished ? "Done ✓" : mq.label(state);
      const track = li.querySelector(".main-quest-track");
      track.setAttribute(
        "aria-label",
        `${mq.title} — ${pct}%`,
      );
      track.setAttribute("aria-valuenow", String(Math.round(pct)));
      li.querySelector(".main-quest-fill").style.width = `${pct}%`;
      list.appendChild(li);
    });

    if (meta) {
      meta.textContent = `${done}/${MAIN_QUEST_DEFS.length}`;
    }
  }

  let badgePopEl = null;
  let badgePopHideTimer = null;

  function ensureBadgePop() {
    if (badgePopEl) return badgePopEl;
    badgePopEl = document.createElement("div");
    badgePopEl.className = "badge-pop";
    badgePopEl.setAttribute("role", "tooltip");
    badgePopEl.innerHTML = `
      <div class="badge-pop-head">
        <span class="badge-pop-icon" aria-hidden="true"></span>
        <span class="badge-pop-name"></span>
      </div>
      <div class="badge-pop-body">
        <p class="badge-pop-desc"></p>
        <p class="badge-pop-hint"></p>
        <span class="badge-pop-status"></span>
      </div>
    `;
    document.body.appendChild(badgePopEl);
    return badgePopEl;
  }

  function positionBadgePop(anchor) {
    const pop = ensureBadgePop();
    pop.style.visibility = "hidden";
    pop.classList.add("is-visible");

    const anchorRect = anchor.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = anchorRect.top - popRect.height - margin;
    let placement = "top";
    if (top < margin) {
      top = anchorRect.bottom + margin;
      placement = "bottom";
    }

    let left = anchorRect.left + anchorRect.width / 2 - popRect.width / 2;
    if (left < margin) left = margin;
    if (left + popRect.width > vw - margin) left = vw - margin - popRect.width;

    if (top + popRect.height > vh - margin) top = vh - margin - popRect.height;

    pop.style.top = `${Math.max(margin, top)}px`;
    pop.style.left = `${left}px`;
    pop.dataset.placement = placement;
    pop.style.visibility = "";
  }

  function showBadgePop(anchor, def, isEarned) {
    if (badgePopHideTimer) {
      clearTimeout(badgePopHideTimer);
      badgePopHideTimer = null;
    }
    const pop = ensureBadgePop();
    pop.querySelector(".badge-pop-icon").textContent = def.icon;
    pop.querySelector(".badge-pop-name").textContent = def.name;
    pop.querySelector(".badge-pop-desc").textContent = def.desc || "";

    const hintEl = pop.querySelector(".badge-pop-hint");
    const hintPrefix = def.hintLabel || "How to earn:";
    hintEl.textContent = def.hint ? `${hintPrefix} ${def.hint}` : "";
    hintEl.hidden = !def.hint || (isEarned && !def.alwaysShowHint);

    const status = pop.querySelector(".badge-pop-status");
    status.textContent = def.statusLabel || (isEarned ? "Earned" : "Locked");
    status.classList.toggle("is-earned", !!isEarned);

    positionBadgePop(anchor);
    requestAnimationFrame(() => pop.classList.add("is-visible"));
  }

  function hideBadgePop() {
    if (!badgePopEl) return;
    if (badgePopHideTimer) clearTimeout(badgePopHideTimer);
    badgePopHideTimer = window.setTimeout(() => {
      badgePopEl.classList.remove("is-visible");
    }, 60);
  }

  function renderBadges(state) {
    const grid = document.querySelector("#badgeGrid");
    const meta = document.querySelector("#badgesMeta");
    if (!grid) return;
    grid.innerHTML = "";

    const earned = state.earnedBadges || {};
    BADGE_DEFS.forEach((def) => {
      const isEarned = !!earned[def.id];
      const div = document.createElement("div");
      div.className = "badge" + (isEarned ? " is-earned" : "");
      div.tabIndex = 0;
      div.setAttribute("aria-label", `${def.name} — ${isEarned ? "Earned" : "Locked"}`);
      div.innerHTML = `
        <span class="badge-icon" aria-hidden="true">${def.icon}</span>
        <span class="badge-name"></span>
      `;
      div.querySelector(".badge-name").textContent = def.name;

      div.addEventListener("mouseenter", () => showBadgePop(div, def, isEarned));
      div.addEventListener("focus", () => showBadgePop(div, def, isEarned));
      div.addEventListener("mouseleave", hideBadgePop);
      div.addEventListener("blur", hideBadgePop);

      grid.appendChild(div);
    });

    const earnedCount = BADGE_DEFS.filter((d) => earned[d.id]).length;
    if (meta) meta.textContent = `${earnedCount}/${BADGE_DEFS.length} earned`;
  }

  function renderStreak(state) {
    const count = document.querySelector("#streakCount");
    const mult = document.querySelector("#streakMult");
    if (count) count.textContent = state.streak;
    if (mult) {
      const m = streakMultiplier(state.streak);
      mult.textContent = `x${m}`;
      mult.hidden = m === 1;
    }
  }

  function renderAll(state) {
    renderLevel(state);
    renderRank(state);
    renderQuests(state);
    renderMainQuests(state);
    renderBadges(state);
    renderStreak(state);
  }

  function toggleQuest(id) {
    const state = window.__ecoState;
    if (!state) return;

    if (!state.quests[TODAY]) state.quests[TODAY] = {};
    const wasDone = !!state.quests[TODAY][id];

    if (wasDone) {
      delete state.quests[TODAY][id];
      const q = DEFAULT_QUESTS.find((x) => x.id === id);
      const reward = Math.round((q?.xp || 0) * streakMultiplier(state.streak));
      state.xp = Math.max(0, (state.xp || 0) - reward);
      state.questsCompleted = Math.max(0, (state.questsCompleted || 0) - 1);
      save(state);
      renderAll(state);
      return;
    }

    state.quests[TODAY][id] = true;
    state.questsCompleted = (state.questsCompleted || 0) + 1;

    const q = DEFAULT_QUESTS.find((x) => x.id === id);
    if (q) {
      const prevLevel = level(state.xp);
      const reward = Math.round(q.xp * streakMultiplier(state.streak));
      state.xp = (state.xp || 0) + reward;
      const newLevel = level(state.xp);
      toast("success", `+${reward} XP — ${q.text}`);
      if (newLevel > prevLevel) {
        celebrate(`Level Up! Welcome to Level ${newLevel}`);
      }
    }

    const newlyEarned = evaluateBadges(state);
    newlyEarned.forEach((b) =>
      toast("info", `Badge unlocked: ${b.icon} ${b.name}`)
    );

    save(state);
    renderAll(state);
  }

  function init() {
    const state = loadState();
    evaluateBadges(state);
    save(state);
    window.__ecoState = state;
    window.__ecoBadgeDefs = BADGE_DEFS;
    window.__ecoDefaultQuests = DEFAULT_QUESTS;
    window.__ecoStreakMultiplier = streakMultiplier;
    window.__ecoShowBadgePop = showBadgePop;
    window.__ecoHideBadgePop = hideBadgePop;
    renderAll(state);

    const streakEl = document.querySelector(".topbar-streak");
    if (streakEl) {
      streakEl.addEventListener("click", () => {
        const mult = streakMultiplier(state.streak);
        toast(
          "info",
          `🔥 ${state.streak} day streak — earning ${mult}x XP! Keep it up.`
        );
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
