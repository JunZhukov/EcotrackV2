/**
 * EcoTrack — Analytics page hydrator.
 *
 * Drives every number, bar, and chart on analytics.html from the user's
 * actual activity logs in localStorage. No more hardcoded mock values.
 *
 * Surfaces:
 *   - Hero "saved vs previous period" + footprint % + range chip
 *   - Range tabs (7 / 30 / 90 days)
 *   - Daily emissions bar chart for the selected window
 *   - Quick stats (avg / best / worst / log count)
 *   - Period comparison (this period vs equal previous period)
 *   - Share by category (transport / energy / food)
 */
(function analyticsHydrate() {
  "use strict";

  const canvas = document.getElementById("analyticsDailyChart");
  if (!canvas) return;
  if (typeof Chart === "undefined") return;

  const STORAGE_KEY = "ecotrack:activityLogs";

  let currentRange = 7;
  let chart = null;

  /* ----------------- helpers ----------------- */

  function readLogs() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }

  function fmtKg(value) {
    return `${Number(value || 0).toFixed(1)} kg`;
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  function bucketByDay(logs, rangeDays) {
    const today = startOfDay(new Date());
    const days = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ date: d, kg: 0, count: 0 });
    }

    const firstStart = days[0].date.getTime();
    const lastEnd = endOfDay(days[days.length - 1].date).getTime();

    logs.forEach((log) => {
      const t = new Date(log.createdAt).getTime();
      if (!Number.isFinite(t) || t < firstStart || t > lastEnd) return;
      const dayIdx = Math.floor((startOfDay(new Date(t)).getTime() - firstStart) / 86400000);
      if (dayIdx < 0 || dayIdx >= days.length) return;
      days[dayIdx].kg += Number(log.totalKg) || 0;
      days[dayIdx].count += 1;
    });

    return days;
  }

  function sumLogsBetween(logs, start, end) {
    const s = start.getTime();
    const e = end.getTime();
    return logs.reduce((acc, log) => {
      const t = new Date(log.createdAt).getTime();
      if (!Number.isFinite(t) || t < s || t > e) return acc;
      acc.total += Number(log.totalKg) || 0;
      acc.count += 1;
      if (log.includeTransport !== false) acc.transport += Number(log.transportKg) || 0;
      if (log.includeFood !== false) acc.food += Number(log.foodKg) || 0;
      if (log.includeElectricity !== false) acc.energy += Number(log.electricKg) || 0;
      return acc;
    }, { total: 0, count: 0, transport: 0, food: 0, energy: 0 });
  }

  function themeColors() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    return {
      ink: isDark ? "#e6efe2" : "#1f2a23",
      grid: isDark ? "rgba(255,255,255,0.08)" : "rgba(31,42,35,0.12)",
      bar: isDark ? "rgba(127,183,143,0.85)" : "rgba(95,119,88,0.85)",
      barHi: isDark ? "rgba(248,180,90,0.9)" : "rgba(217,119,6,0.85)",
      barEmpty: isDark ? "rgba(255,255,255,0.05)" : "rgba(31,42,35,0.07)",
      tooltipBg: isDark ? "rgba(0,0,0,0.85)" : "rgba(31,42,35,0.9)",
    };
  }

  /* ----------------- chart ----------------- */

  function renderChart(days) {
    const c = themeColors();
    const data = days.map((d) => d.kg);
    const maxKg = Math.max(...data, 0);
    const tooltipFmt = (ctx) =>
      ` ${Number(ctx.parsed.y).toFixed(2)} kg CO\u2082`;

    const labels = days.map((d, i) => {
      if (currentRange <= 7) {
        return d.date.toLocaleDateString(undefined, { weekday: "short" });
      }
      if (currentRange <= 30) {
        return d.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      }
      return i % 7 === 0
        ? d.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "";
    });

    const colors = data.map((v) => {
      if (v <= 0) return c.barEmpty;
      if (maxKg > 0 && v === maxKg) return c.barHi;
      return c.bar;
    });

    if (chart) chart.destroy();
    chart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "kg CO\u2082",
            data,
            backgroundColor: colors,
            borderRadius: 6,
            maxBarThickness: currentRange <= 7 ? 28 : currentRange <= 30 ? 14 : 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 450 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: "#fff",
            bodyColor: "#fff",
            titleFont: { family: "Poppins, sans-serif", size: 11 },
            bodyFont: { family: "Poppins, sans-serif", size: 12 },
            callbacks: {
              title: (items) => {
                if (!items.length) return "";
                const day = days[items[0].dataIndex];
                if (!day) return "";
                return day.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
              },
              label: tooltipFmt,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: c.ink,
              font: { size: 10, family: "Poppins, sans-serif" },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: currentRange <= 7 ? 7 : 12,
            },
            grid: { display: false, drawBorder: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: maxKg > 0 ? maxKg * 1.1 : 5,
            ticks: {
              color: c.ink,
              font: { size: 10, family: "Poppins, sans-serif" },
              precision: 0,
            },
            grid: { color: c.grid, drawBorder: false },
          },
        },
      },
    });
  }

  /* ----------------- refresh everything ----------------- */

  function refresh() {
    const logs = readLogs();
    const days = bucketByDay(logs, currentRange);

    const startOfRange = days[0].date;
    const endOfRange = endOfDay(days[days.length - 1].date);
    const current = sumLogsBetween(logs, startOfRange, endOfRange);

    const prevEnd = new Date(startOfRange);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(startOfRange);
    prevStart.setDate(prevStart.getDate() - currentRange);
    const previous = sumLogsBetween(logs, prevStart, prevEnd);

    const avgKg = current.total / currentRange;
    const nonEmpty = days.filter((d) => d.count > 0);
    const bestKg = nonEmpty.length ? Math.min(...nonEmpty.map((d) => d.kg)) : null;
    const worstKg = nonEmpty.length ? Math.max(...nonEmpty.map((d) => d.kg)) : null;

    /* ---- top stats ---- */
    setText("analyticsTotal", fmtKg(current.total));
    setText("analyticsAvg", fmtKg(avgKg));
    setText("analyticsBest", bestKg != null ? fmtKg(bestKg) : "— kg");
    setText("analyticsWorst", worstKg != null ? fmtKg(worstKg) : "— kg");
    setText("analyticsCount", String(current.count));

    /* ---- caption ---- */
    const caption = document.getElementById("analyticsCaption");
    if (caption) {
      caption.textContent = current.count
        ? `${current.count} ${current.count === 1 ? "log" : "logs"} across the last ${currentRange} days, totaling ${fmtKg(current.total)} CO\u2082.`
        : `No activity logged in the last ${currentRange} days. Hit Log to start tracking.`;
    }

    /* ---- chart ---- */
    renderChart(days);

    /* ---- period comparison ---- */
    setText("analyticsPrevLabel", `Previous ${currentRange} days`);
    setText("analyticsCurLabel", `This ${currentRange} days`);
    setText("analyticsPrevTotal", fmtKg(previous.total));
    setText("analyticsCurTotal", fmtKg(current.total));

    const compareSub = document.getElementById("analyticsCompareSub");
    if (compareSub) {
      if (previous.total === 0 && current.total === 0) {
        compareSub.className = "sub";
        compareSub.textContent = "No data yet";
      } else if (previous.total === 0) {
        compareSub.className = "sub";
        compareSub.textContent = "First period — baseline";
      } else {
        const diff = current.total - previous.total;
        const pct = (diff / previous.total) * 100;
        const arrow = diff <= 0 ? "▼" : "▲";
        const cls = diff <= 0 ? "sub sentiment-good" : "sub sentiment-bad";
        compareSub.className = cls;
        compareSub.innerHTML =
          `<span class="trend-arrow" aria-hidden="true">${arrow}</span> ` +
          `${Math.abs(pct).toFixed(1)}% vs baseline`;
      }
    }

    /* ---- category share ---- */
    const grand = current.transport + current.food + current.energy;
    ["transport", "food", "energy"].forEach((cat) => {
      const fill = document.querySelector(`[data-cat-fill="${cat}"]`);
      const pctEl = document.querySelector(`[data-cat-pct="${cat}"]`);
      const pct = grand > 0 ? (current[cat] / grand) * 100 : 0;
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    });
    const catCaption = document.getElementById("analyticsCategoryCaption");
    if (catCaption) {
      catCaption.textContent = grand > 0
        ? `Out of ${fmtKg(grand)} CO\u2082 in this window.`
        : "Log a few activities to see how your footprint splits.";
    }

    /* ---- hero block ---- */
    const heroStat = document.getElementById("dbHeroStat");
    const heroLabel = document.getElementById("analyticsHeroLabel");
    const heroPct = document.getElementById("analyticsHeroPct");
    const heroChip = document.getElementById("analyticsHeroChip");
    const heroRange = document.getElementById("analyticsHeroRange");
    const heroSub = document.getElementById("analyticsHeroSub");

    if (heroRange) heroRange.textContent = `${currentRange} days`;

    if (previous.total === 0 && current.total === 0) {
      setHero(heroStat, "0", "kg CO\u2082");
      if (heroLabel) heroLabel.textContent = "Nothing logged yet";
      if (heroPct) heroPct.textContent = "0%";
      if (heroChip) heroChip.className = "db-chip db-chip--neutral";
      if (heroSub) heroSub.textContent = "Start logging to see how your footprint changes day over day.";
    } else if (previous.total === 0) {
      setHero(heroStat, current.total.toFixed(1), "kg CO\u2082");
      if (heroLabel) heroLabel.textContent = "This period's footprint";
      if (heroPct) heroPct.textContent = "new";
      if (heroChip) heroChip.className = "db-chip db-chip--neutral";
      if (heroSub) heroSub.textContent = "First period of data — log more to start comparing.";
    } else {
      const saved = previous.total - current.total;
      const pct = previous.total > 0 ? (saved / previous.total) * 100 : 0;
      const good = saved >= 0;
      setHero(heroStat, Math.abs(saved).toFixed(1), "kg CO\u2082");
      if (heroLabel) {
        heroLabel.textContent = good
          ? "Saved vs previous period"
          : "More than previous period";
      }
      if (heroPct) heroPct.textContent = `${Math.abs(pct).toFixed(1)}%`;
      if (heroChip) {
        heroChip.className = good ? "db-chip db-chip--good" : "db-chip db-chip--bad";
        const arrow = heroChip.querySelector(".db-chip-arrow");
        if (arrow) arrow.textContent = good ? "▼" : "▲";
      }
      if (heroSub) {
        heroSub.textContent = good
          ? "Your eco-actions are bending the curve — keep it up."
          : "Footprint trending up this period — check the daily chart for spikes.";
      }
    }
  }

  function setHero(el, value, unit) {
    if (!el) return;
    el.innerHTML = `${value}<span class="db-hero-stat-unit">${unit}</span>`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ----------------- range tabs ----------------- */

  document.querySelectorAll(".analytics-range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const range = Number(btn.dataset.range) || 7;
      if (range === currentRange) return;
      currentRange = range;
      document.querySelectorAll(".analytics-range-btn").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      refresh();
    });
  });

  /* ----------------- listeners ----------------- */

  function start() {
    refresh();
    window.addEventListener("ecotrack:api-ready", refresh);
  }

  if (window.__ecoApiReady && typeof window.__ecoApiReady.then === "function") {
    window.__ecoApiReady.then(start);
  } else {
    start();
  }

  window.addEventListener("ecotrack:logs-changed", refresh);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) refresh();
  });
  window.addEventListener("ecotheme:change", refresh);
})();
