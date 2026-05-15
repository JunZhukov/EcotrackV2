(function ecoTrendCharts() {
  if (typeof Chart === "undefined") return;

  const canvasesSelector = "[data-chart='eco-trend']";
  const charts = [];

  function getThemeColors() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    return {
      ink: isDark ? "#e6efe2" : "#1f2a23",
      grid: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(31, 42, 35, 0.18)",
      tooltipBg: isDark ? "rgba(0, 0, 0, 0.85)" : "rgba(31, 42, 35, 0.9)",
    };
  }

  function buildConfig() {
    const c = getThemeColors();
    return {
      type: "line",
      data: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          {
            label: "Last Month",
            data: [10, 30, 30, 36],
            borderColor: "#4d9cff",
            backgroundColor: "rgba(77, 156, 255, 0.12)",
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#4d9cff",
            borderWidth: 2.5,
          },
          {
            label: "This Month",
            data: [10, 22, 32, 42],
            borderColor: "#b07bd9",
            backgroundColor: "rgba(176, 123, 217, 0.12)",
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#b07bd9",
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            align: "center",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: "circle",
              color: c.ink,
              font: { size: 11, family: "Poppins, sans-serif" },
            },
          },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            titleFont: { family: "Poppins, sans-serif" },
            bodyFont: { family: "Poppins, sans-serif" },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Week",
              color: c.ink,
              font: { size: 11, family: "Poppins, sans-serif" },
            },
            ticks: {
              color: c.ink,
              font: { size: 11, family: "Poppins, sans-serif" },
            },
            grid: { color: c.grid, drawBorder: false },
          },
          y: {
            title: {
              display: true,
              text: "kg",
              color: c.ink,
              font: { size: 11, family: "Poppins, sans-serif" },
            },
            beginAtZero: true,
            suggestedMax: 50,
            ticks: {
              stepSize: 10,
              color: c.ink,
              font: { size: 11, family: "Poppins, sans-serif" },
            },
            grid: { color: c.grid, drawBorder: false },
          },
        },
      },
    };
  }

  function destroyAll() {
    charts.forEach((chart) => chart.destroy());
    charts.length = 0;
  }

  function renderAll() {
    destroyAll();
    document.querySelectorAll(canvasesSelector).forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      charts.push(new Chart(ctx, buildConfig()));
    });
  }

  renderAll();
  window.addEventListener("ecotheme:change", renderAll);
})();

(function recentActivities() {
  "use strict";

  const STORAGE_KEY = "ecotrack:activityLogs";
  const list = document.getElementById("recentActivityList");
  const count = document.getElementById("recentActivityCount");
  const total = document.getElementById("recentActivityTotal");

  if (!list) return;

  function readLogs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatKg(value) {
    return `${Number(value || 0).toFixed(1)} kg CO₂`;
  }

  function writeLogs(logs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (_) {
      /* storage unavailable — ignore */
    }
  }

  async function deleteLog(id) {
    const logs = readLogs();
    const next = logs.filter((log) => String(log.id) !== String(id));
    if (next.length === logs.length) return;
    writeLogs(next);
    if (window.EcoApi && window.EcoApi.isLoggedIn()) {
      try {
        await window.EcoApi.deleteActivityLog(String(id));
      } catch (_) {}
    }
    render();
    window.dispatchEvent(
      new CustomEvent("ecotrack:logs-changed", { detail: { reason: "delete" } })
    );
  }

  function render() {
    const logs = readLogs();
    const latest = logs.slice(0, 5);
    const totalKg = logs.reduce((sum, log) => sum + Number(log.totalKg || 0), 0);

    if (count) count.textContent = `${logs.length} ${logs.length === 1 ? "log" : "logs"}`;
    if (total) total.textContent = formatKg(totalKg);

    if (!latest.length) {
      list.innerHTML = `
        <li class="recent-activity-empty">
          No activities logged yet. Press the + button to calculate your first footprint.
        </li>
      `;
      return;
    }

    list.innerHTML = "";
    latest.forEach((log) => {
      const item = document.createElement("li");
      item.className = "recent-activity-item";
      if (log.id != null) item.dataset.logId = String(log.id);

      const cats = [];
      if (log.includeFood !== false && log.foodKg > 0) cats.push("🥗");
      if (log.includeTransport !== false && log.transportKg > 0) cats.push("🚗");
      if (log.includeElectricity !== false && log.electricKg > 0) cats.push("💡");
      const headIcon = cats.length ? cats.join(" ") : "🌱";

      item.innerHTML = `
        <span class="recent-activity-icon" aria-hidden="true">${headIcon}</span>
        <div class="recent-activity-body">
          <p class="recent-activity-name"></p>
          <p class="recent-activity-meta"></p>
          <span class="recent-activity-footprint"></span>
        </div>
        <button
          type="button"
          class="recent-activity-delete"
          aria-label="Delete log"
          title="Delete this log"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      `;

      const parts = [];
      if (log.includeFood !== false && log.foodLabel) parts.push(log.foodLabel);
      if (log.includeTransport !== false && log.transportLabel)
        parts.push(`${log.transportLabel}`);
      if (log.includeElectricity !== false && (log.electricKwh || log.electricBill))
        parts.push("Electricity");
      const title = log.note || parts.join(" + ") || "Activity";
      item.querySelector(".recent-activity-name").textContent = title;

      const metaParts = [formatDate(log.createdAt)];
      if (log.includeTransport !== false && log.distanceKm) {
        metaParts.push(`${log.distanceKm} km`);
      }
      if (log.includeElectricity !== false) {
        if (log.electricKwh != null) {
          metaParts.push(`${log.electricKwh} kWh / mo`);
        } else if (log.electricBill != null) {
          metaParts.push(`₱${Number(log.electricBill).toLocaleString()} bill`);
        }
      }
      item.querySelector(".recent-activity-meta").textContent = metaParts.join(" • ");
      item.querySelector(".recent-activity-footprint").textContent = formatKg(log.totalKg);

      const delBtn = item.querySelector(".recent-activity-delete");
      delBtn.addEventListener("click", () => {
        const confirmed = window.confirm(
          `Delete this log?\n\n${title}\n${formatKg(log.totalKg)}\n\nThis can't be undone.`
        );
        if (!confirmed) return;
        deleteLog(log.id != null ? log.id : log.createdAt);
      });

      list.appendChild(item);
    });
  }

  function start() {
    render();
    window.addEventListener("ecotrack:api-ready", render);
  }

  if (window.__ecoApiReady && typeof window.__ecoApiReady.then === "function") {
    window.__ecoApiReady.then(start);
  } else {
    start();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) render();
  });
})();

(function emissionBreakdown() {
  "use strict";

  const STORAGE_KEY = "ecotrack:activityLogs";
  const root = document.getElementById("dbStats");
  if (!root) return;

  const tiles = {
    transport: root.querySelector('[data-stat="transport"]'),
    food: root.querySelector('[data-stat="food"]'),
    energy: root.querySelector('[data-stat="energy"]'),
  };

  function readLogs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function setTile(tile, kg, percent) {
    if (!tile) return;
    const valueEl = tile.querySelector("[data-stat-value]");
    const barEl = tile.querySelector("[data-stat-bar]");
    const subEl = tile.querySelector("[data-stat-sub]");
    if (valueEl) valueEl.textContent = kg.toFixed(1);
    if (barEl) barEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (subEl) {
      subEl.textContent =
        kg === 0 ? "No data yet" : `${Math.round(percent)}% of total`;
    }
  }

  function render() {
    const logs = readLogs();
    const totals = logs.reduce(
      (acc, log) => {
        if (log.includeTransport !== false) acc.transport += Number(log.transportKg) || 0;
        if (log.includeFood !== false) acc.food += Number(log.foodKg) || 0;
        if (log.includeElectricity !== false) acc.energy += Number(log.electricKg) || 0;
        return acc;
      },
      { transport: 0, food: 0, energy: 0 }
    );
    const grand = totals.transport + totals.food + totals.energy;
    const pct = (n) => (grand > 0 ? (n / grand) * 100 : 0);

    setTile(tiles.transport, totals.transport, pct(totals.transport));
    setTile(tiles.food, totals.food, pct(totals.food));
    setTile(tiles.energy, totals.energy, pct(totals.energy));
  }

  function start() {
    render();
    window.addEventListener("ecotrack:api-ready", render);
  }

  if (window.__ecoApiReady && typeof window.__ecoApiReady.then === "function") {
    window.__ecoApiReady.then(start);
  } else {
    start();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) render();
  });
  window.addEventListener("ecotrack:logs-changed", render);
})();
