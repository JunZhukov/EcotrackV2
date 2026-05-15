const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Missing auth token." });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "misconfigured", message: "JWT_SECRET is not set." });
  }

  try {
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ error: "unauthorized", message: "User not found." });
    }
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid or expired token." });
  }
}

module.exports = { requireAuth };
