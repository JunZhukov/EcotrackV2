const mongoose = require("mongoose");

const gamificationSchema = new mongoose.Schema(
  {
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 1 },
    lastActive: { type: String, default: null },
    quests: { type: mongoose.Schema.Types.Mixed, default: {} },
    earnedBadges: { type: mongoose.Schema.Types.Mixed, default: {} },
    questsCompleted: { type: Number, default: 0 },
    questDone: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const notifPrefsSchema = new mongoose.Schema(
  {
    dailyQuests: { type: Boolean, default: true },
    streakWarnings: { type: Boolean, default: true },
    achievements: { type: Boolean, default: true },
    weeklySummary: { type: Boolean, default: false },
    ecoTips: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true, default: "" },
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
    notifPrefs: { type: notifPrefsSchema, default: () => ({}) },
    gamification: { type: gamificationSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
