const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isDbReady } = require("../db/connect");

const router = express.Router();

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.sign({ sub: String(user._id), email: user.email }, secret, {
    expiresIn: "30d",
  });
}

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

router.post("/register", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  const { email, username, password, displayName } = req.body || {};
  if (!email || !username || !password) {
    return res.status(400).json({
      error: "validation",
      message: "email, username, and password are required.",
    });
  }

  if (String(password).length < 8) {
    return res.status(400).json({
      error: "validation",
      message: "Password must be at least 8 characters.",
    });
  }

  try {
    const exists = await User.findOne({
      $or: [{ email: String(email).toLowerCase() }, { username: String(username).trim() }],
    });
    if (exists) {
      return res.status(409).json({ error: "conflict", message: "Email or username already in use." });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await User.create({
      email: String(email).toLowerCase().trim(),
      username: String(username).trim(),
      passwordHash,
      displayName: displayName ? String(displayName).trim() : String(username).trim(),
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/login", async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ error: "db_unavailable" });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({
      error: "validation",
      message: "email and password are required.",
    });
  }

  try {
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
