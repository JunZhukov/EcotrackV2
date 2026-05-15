const express = require("express");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");
const { isDbReady } = require("../db/connect");

const router = express.Router();

function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    username: user.username,
    displayName: user.displayName || user.username,
    theme: user.theme,
    notifPrefs: user.notifPrefs,
  };
}

const DEFAULT_GAMIFICATION = {
  xp: 0,
  streak: 1,
  lastActive: null,
  quests: {},
  earnedBadges: {},
  questsCompleted: 0,
  questDone: {},
};

router.use(requireAuth);

router.get("/", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }
  return res.json({ user: publicUser(req.user) });
});

router.patch("/", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  const { theme, notifPrefs, displayName } = req.body || {};
  const update = {};

  if (theme === "light" || theme === "dark") update.theme = theme;
  if (displayName != null) update.displayName = String(displayName).trim().slice(0, 80);
  if (notifPrefs && typeof notifPrefs === "object") {
    const current = req.user.notifPrefs
      ? typeof req.user.notifPrefs.toObject === "function"
        ? req.user.notifPrefs.toObject()
        : { ...req.user.notifPrefs }
      : {};
    update.notifPrefs = { ...current, ...notifPrefs };
  }

  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select(
      "-passwordHash"
    );
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/reset-progress", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  try {
    await ActivityLog.deleteMany({ userId: req.user._id });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { gamification: DEFAULT_GAMIFICATION } },
      { new: true }
    ).select("-passwordHash");

    return res.json({
      ok: true,
      gamification: user.gamification,
      user: publicUser(user),
    });
  } catch (err) {
    console.error("Reset progress error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
