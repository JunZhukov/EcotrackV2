const express = require("express");
const ActivityLog = require("../models/ActivityLog");
const { requireAuth } = require("../middleware/requireAuth");
const { isDbReady } = require("../db/connect");

const router = express.Router();
const MAX_LOGS = 30;

router.use(requireAuth);

router.get("/", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  try {
    const logs = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(MAX_LOGS)
      .lean();

    const payload = logs.map((doc) => ({
      id: doc.clientId,
      createdAt: doc.createdAt.toISOString(),
      includeFood: doc.includeFood,
      includeTransport: doc.includeTransport,
      includeElectricity: doc.includeElectricity,
      foodEntries: doc.foodEntries,
      transportEntries: doc.transportEntries,
      foodLabel: doc.foodLabel,
      foodIcon: doc.foodIcon,
      transportLabel: doc.transportLabel,
      transportIcon: doc.transportIcon,
      distanceKm: doc.distanceKm,
      electricKwh: doc.electricKwh,
      foodKg: doc.foodKg,
      transportKg: doc.transportKg,
      electricKg: doc.electricKg,
      totalKg: doc.totalKg,
      note: doc.note,
    }));

    return res.json({ logs: payload });
  } catch (err) {
    console.error("List activity logs error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  const body = req.body || {};
  const clientId = body.id || `log-${Date.now()}`;

  try {
    const doc = await ActivityLog.create({
      userId: req.user._id,
      clientId,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      includeFood: Boolean(body.includeFood),
      includeTransport: Boolean(body.includeTransport),
      includeElectricity: Boolean(body.includeElectricity),
      foodEntries: Array.isArray(body.foodEntries) ? body.foodEntries : [],
      transportEntries: Array.isArray(body.transportEntries) ? body.transportEntries : [],
      foodLabel: body.foodLabel ?? null,
      foodIcon: body.foodIcon ?? null,
      transportLabel: body.transportLabel ?? null,
      transportIcon: body.transportIcon ?? null,
      distanceKm: Number(body.distanceKm) || 0,
      electricKwh: Number(body.electricKwh) || 0,
      foodKg: Number(body.foodKg) || 0,
      transportKg: Number(body.transportKg) || 0,
      electricKg: Number(body.electricKg) || 0,
      totalKg: Number(body.totalKg) || 0,
      note: String(body.note || ""),
    });

    const count = await ActivityLog.countDocuments({ userId: req.user._id });
    if (count > MAX_LOGS) {
      const overflow = await ActivityLog.find({ userId: req.user._id })
        .sort({ createdAt: 1 })
        .limit(count - MAX_LOGS)
        .select("_id");
      await ActivityLog.deleteMany({ _id: { $in: overflow.map((d) => d._id) } });
    }

    return res.status(201).json({
      log: {
        id: doc.clientId,
        createdAt: doc.createdAt.toISOString(),
        totalKg: doc.totalKg,
      },
    });
  } catch (err) {
    console.error("Create activity log error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:clientId", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  try {
    const result = await ActivityLog.findOneAndDelete({
      userId: req.user._id,
      clientId: req.params.clientId,
    });
    if (!result) {
      return res.status(404).json({ error: "not_found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete activity log error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
