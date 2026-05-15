const mongoose = require("mongoose");

const logEntrySchema = new mongoose.Schema(
  {
    id: String,
    key: String,
    label: String,
    icon: String,
    grams: Number,
    km: Number,
    kg: Number,
  },
  { _id: false }
);

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
    includeFood: Boolean,
    includeTransport: Boolean,
    includeElectricity: Boolean,
    foodEntries: [logEntrySchema],
    transportEntries: [logEntrySchema],
    foodLabel: { type: String, default: null },
    foodIcon: { type: String, default: null },
    transportLabel: { type: String, default: null },
    transportIcon: { type: String, default: null },
    distanceKm: { type: Number, default: 0 },
    electricKwh: { type: Number, default: 0 },
    foodKg: { type: Number, default: 0 },
    transportKg: { type: Number, default: 0 },
    electricKg: { type: Number, default: 0 },
    totalKg: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
