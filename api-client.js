(function ecoApi() {
  "use strict";

  const TOKEN_KEY = "ecotrack:authToken";
  const USER_KEY = "ecotrack:user";
  const LOGS_KEY = "ecotrack:activityLogs";
  const GAMIFICATION_KEY = "ecotrack:gamification";
  const DISPLAY_KEY = "ecotrack:userName";
  const NOTIF_KEY = "ecotrack:notifPrefs";
  const THEME_KEY = "ecotrack:theme";

  const PROTECTED_PAGES = new Set([
    "home.html",
    "overview.html",
    "analytics.html",
    "log-activity.html",
    "settings.html",
  ]);

  const AUTH_PAGES = new Set(["login.html", "signup-final.html"]);

  function pageName() {
    const path = window.location.pathname || "";
    const parts = path.split("/");
    return parts[parts.length - 1] || "";
  }

  function isLoggedIn() {
    try {
      return Boolean(localStorage.getItem(TOKEN_KEY));
    } catch (_) {
      return false;
    }
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    applyUserPrefs(user);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function applyUserPrefs(user) {
    if (!user) return;
    if (user.displayName) {
      localStorage.setItem(DISPLAY_KEY, user.displayName);
    }
    if (user.theme && window.EcoTheme) {
      window.EcoTheme.set(user.theme);
    } else if (user.theme) {
      localStorage.setItem(THEME_KEY, user.theme);
      document.documentElement.setAttribute("data-theme", user.theme);
    }
    if (user.notifPrefs && typeof user.notifPrefs === "object") {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(user.notifPrefs));
    }
  }

  async function apiFetch(path, options) {
    const headers = { ...(options && options.headers) };
    if (!(options && options.body instanceof FormData)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(path, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.message) || res.statusText || "Request failed");
      err.status = res.status;
      err.code = data && data.error;
      throw err;
    }
    return data;
  }

  async function login(email, password) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession(data.token, data.user);
    await migrateLocalData();
    return data;
  }

  async function register(email, username, password, displayName) {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password, displayName }),
    });
    setSession(data.token, data.user);
    await migrateLocalData();
    return data;
  }

  async function hydrate() {
    if (!isLoggedIn()) return;
    const [logsData, gamData, meData] = await Promise.all([
      apiFetch("/api/activity-logs"),
      apiFetch("/api/gamification"),
      apiFetch("/api/me"),
    ]);

    if (logsData && Array.isArray(logsData.logs)) {
      localStorage.setItem(LOGS_KEY, JSON.stringify(logsData.logs));
    }
    if (gamData && gamData.gamification) {
      localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(gamData.gamification));
    }
    if (meData && meData.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(meData.user));
      applyUserPrefs(meData.user);
    }
  }

  async function migrateLocalData() {
    if (!isLoggedIn()) return;

    let localLogs = [];
    try {
      localLogs = JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
    } catch (_) {
      localLogs = [];
    }

    const remote = await apiFetch("/api/activity-logs");
    const remoteLogs = (remote && remote.logs) || [];

    if (remoteLogs.length === 0 && localLogs.length > 0) {
      for (const log of localLogs.slice(0, 30)) {
        await apiFetch("/api/activity-logs", {
          method: "POST",
          body: JSON.stringify(log),
        });
      }
    }

    let localGam = null;
    try {
      const raw = localStorage.getItem(GAMIFICATION_KEY);
      if (raw) localGam = JSON.parse(raw);
    } catch (_) {}

    const remoteGam = await apiFetch("/api/gamification");
    const hasRemoteGam =
      remoteGam &&
      remoteGam.gamification &&
      Object.keys(remoteGam.gamification).length > 0;

    if (!hasRemoteGam && localGam && Object.keys(localGam).length > 0) {
      await apiFetch("/api/gamification", {
        method: "PUT",
        body: JSON.stringify({ gamification: localGam }),
      });
    }

    await hydrate();
  }

  async function saveActivityLog(log) {
    if (!isLoggedIn()) return null;
    return apiFetch("/api/activity-logs", {
      method: "POST",
      body: JSON.stringify(log),
    });
  }

  async function deleteActivityLog(clientId) {
    if (!isLoggedIn()) return null;
    return apiFetch(`/api/activity-logs/${encodeURIComponent(clientId)}`, {
      method: "DELETE",
    });
  }

  async function pushGamification(state) {
    if (!isLoggedIn()) return null;
    return apiFetch("/api/gamification", {
      method: "PUT",
      body: JSON.stringify({ gamification: state }),
    });
  }

  async function updateProfile(patch) {
    if (!isLoggedIn()) return null;
    const data = await apiFetch("/api/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (data && data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      applyUserPrefs(data.user);
    }
    return data;
  }

  async function resetProgress() {
    if (!isLoggedIn()) return null;
    return apiFetch("/api/me/reset-progress", { method: "POST" });
  }

  function guardRoutes() {
    const name = pageName();
    if (PROTECTED_PAGES.has(name) && !isLoggedIn()) {
      window.location.replace("./login.html");
      return false;
    }
    if (AUTH_PAGES.has(name) && isLoggedIn()) {
      window.location.replace("./home.html");
      return false;
    }
    return true;
  }

  async function init() {
    if (!guardRoutes()) return;
    if (isLoggedIn()) {
      try {
        await hydrate();
      } catch (err) {
        console.warn("[EcoApi] hydrate failed:", err.message);
        if (err.status === 401) {
          clearSession();
          if (PROTECTED_PAGES.has(pageName())) {
            window.location.replace("./login.html");
          }
        }
      }
    }
    window.dispatchEvent(new CustomEvent("ecotrack:api-ready"));
  }

  window.EcoApi = {
    login,
    register,
    hydrate,
    migrateLocalData,
    saveActivityLog,
    deleteActivityLog,
    pushGamification,
    updateProfile,
    resetProgress,
    isLoggedIn,
    getToken,
    getUser,
    setSession,
    clearSession,
    init,
  };

  window.__ecoApiReady = init();
})();
