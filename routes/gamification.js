const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");
const { isDbReady } = require("../db/connect");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  return res.json({ gamification: req.user.gamification || {} });
});

router.put("/", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  const incoming = req.body && req.body.gamification;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({
      error: "validation",
      message: "Body must include a gamification object.",
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { gamification: incoming } },
      { new: true }
    ).select("-passwordHash");

    return res.json({ gamification: user.gamification });
  } catch (err) {
    console.error("Update gamification error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
