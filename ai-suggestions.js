/**
 * EcoTrack — AI-powered suggestions hydrator.
 *
 * Reads the user's recent activity logs from localStorage, asks the
 * local backend (POST /api/suggestions) for Gemini-generated tips, and
 * swaps the static suggestion cards on the dashboard with the result.
 *
 * If the backend isn't running, the API key is missing, or anything
 * else fails, the existing hardcoded fallback cards stay on screen.
 */
(function aiSuggestions() {
  "use strict";

  const STORAGE_KEY = "ecotrack:activityLogs";
  const CACHE_KEY = "ecotrack:aiSuggestions";
  const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

  const panel = document.getElementById("eco-suggestions");
  if (!panel) return;

  const cardsContainer = panel.querySelector(".suggestion-cards");
  const statusEl = panel.querySelector("[data-ai-status]");
  const refreshBtn = panel.querySelector("[data-ai-refresh]");
  if (!cardsContainer) return;

  const fallbackHtml = cardsContainer.innerHTML;

  const CATEGORY_CLASS = {
    food: "sugg-card--food",
    transport: "sugg-card--transport",
    energy: "sugg-card--energy",
    general: "sugg-card--bike",
  };

  /* ---------------- helpers ---------------- */

  function readLogs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function buildPayload(logs) {
    const recent = logs.slice(0, 8);
    const totals = recent.reduce(
      (acc, log) => {
        acc.foodKg += Number(log.foodKg) || 0;
        acc.transportKg += Number(log.transportKg) || 0;
        acc.electricKg += Number(log.electricKg) || 0;
        acc.totalKg += Number(log.totalKg) || 0;
        return acc;
      },
      { foodKg: 0, transportKg: 0, electricKg: 0, totalKg: 0 }
    );

    return {
      summary: {
        logCount: recent.length,
        ...totals,
      },
      logs: recent.map((log) => ({
        createdAt: log.createdAt,
        note: log.note || null,
        food: log.includeFood !== false
          ? {
              entries: Array.isArray(log.foodEntries) ? log.foodEntries : null,
              label: log.foodLabel || null,
              kg: log.foodKg || 0,
            }
          : null,
        transport: log.includeTransport !== false
          ? {
              entries: Array.isArray(log.transportEntries)
                ? log.transportEntries
                : null,
              label: log.transportLabel || null,
              distanceKm: log.distanceKm || 0,
              kg: log.transportKg || 0,
            }
          : null,
        electricity: log.includeElectricity !== false
          ? {
              kwh: log.electricKwh || 0,
              kg: log.electricKg || 0,
            }
          : null,
        totalKg: log.totalKg || 0,
      })),
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCards(suggestions) {
    const html = suggestions
      .map((s) => {
        const cls = CATEGORY_CLASS[s.category] || CATEGORY_CLASS.general;
        return `
          <article class="sugg-card ${cls}">
            <span class="sugg-icon" aria-hidden="true">${escapeHtml(s.icon)}</span>
            <div class="sugg-body">
              <h3 class="sugg-title">${escapeHtml(s.title)}</h3>
              <p class="sugg-text">${escapeHtml(s.text)}</p>
            </div>
            <span class="sugg-reward">+${Number(s.xp) || 0} XP</span>
          </article>
        `;
      })
      .join("");
    cardsContainer.innerHTML = html;
    panel.dataset.aiState = "ai";
    if (statusEl) {
      statusEl.textContent = "AI suggested";
      statusEl.hidden = false;
    }
  }

  function showFallback(message) {
    cardsContainer.innerHTML = fallbackHtml;
    panel.dataset.aiState = "fallback";
    if (statusEl) {
      statusEl.textContent = message || "Default tips";
      statusEl.hidden = false;
    }
  }

  function showLoading() {
    panel.dataset.aiState = "loading";
    if (statusEl) {
      statusEl.textContent = "Asking the EcoTrack AI…";
      statusEl.hidden = false;
    }
  }

  function showEmpty() {
    cardsContainer.innerHTML = `
      <div class="sugg-empty">
        <span class="sugg-empty-icon" aria-hidden="true">🌱</span>
        <p class="sugg-empty-title">No suggestions yet</p>
        <p class="sugg-empty-text">
          Log your first activity to unlock personalized AI tips.
        </p>
        <a class="sugg-empty-btn" href="./log-activity.html">+ Log activity</a>
      </div>
    `;
    panel.dataset.aiState = "empty";
    if (statusEl) {
      statusEl.hidden = true;
    }
    if (refreshBtn) refreshBtn.hidden = true;
  }

  /* ---------------- cache ---------------- */

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || !cached.suggestions || !cached.savedAt) return null;
      if (Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
      return cached;
    } catch (_) {
      return null;
    }
  }

  function writeCache(suggestions, signature) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          signature,
          suggestions,
        })
      );
    } catch (_) {
      /* storage full / unavailable — ignore */
    }
  }

  function logsSignature(logs) {
    return logs
      .slice(0, 8)
      .map((l) => `${l.id || l.createdAt || ""}:${(l.totalKg || 0).toFixed(2)}`)
      .join("|");
  }

  /* ---------------- main fetch ---------------- */

  async function fetchSuggestions({ force } = {}) {
    const logs = readLogs();

    if (!logs.length) {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (_) {
        /* ignore */
      }
      showEmpty();
      return;
    }

    if (refreshBtn) refreshBtn.hidden = false;

    const signature = logsSignature(logs);

    if (!force) {
      const cached = readCache();
      if (cached && cached.signature === signature) {
        renderCards(cached.suggestions);
        return;
      }
    }

    showLoading();

    let response;
    try {
      response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(logs)),
      });
    } catch (_) {
      showFallback("Offline — showing default tips");
      return;
    }

    if (!response.ok) {
      if (response.status === 503) {
        showFallback("AI key not set — showing default tips");
      } else {
        showFallback("AI unavailable — showing default tips");
      }
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      showFallback("AI response invalid — showing default tips");
      return;
    }

    if (!data || !Array.isArray(data.suggestions) || data.suggestions.length === 0) {
      showFallback("AI had no tips — showing defaults");
      return;
    }

    renderCards(data.suggestions);
    writeCache(data.suggestions, signature);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      fetchSuggestions({ force: true });
    });
  }

  // Kick off after the dashboard has settled.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => fetchSuggestions());
  } else {
    fetchSuggestions();
  }
})();
