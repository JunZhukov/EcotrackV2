/**
 * EcoTrack local backend.
 *
 * Responsibilities:
 *   - Serve the existing static frontend (index.html, css, js, images).
 *   - Provide POST /api/suggestions which proxies the Gemini API so the
 *     API key never leaks to browser code.
 *
 * Usage:
 *   1. cp .env.example .env  (then fill in GEMINI_API_KEY)
 *   2. npm install
 *   3. npm start
 *   4. Open http://localhost:3000
 *
 * If the backend is offline or the API call fails, the dashboard falls
 * back to the existing static suggestion cards — nothing breaks.
 */

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { connectDb, isDbReady } = require("./db/connect");
const authRoutes = require("./routes/auth");
const activityLogRoutes = require("./routes/activityLogs");
const gamificationRoutes = require("./routes/gamification");
const userRoutes = require("./routes/user");

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const app = express();

app.use(cors());
app.use(express.json({ limit: "256kb" }));

// Static files served straight from the project root.
app.use(
  express.static(__dirname, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      // Service worker should always revalidate so cache version bumps land.
      if (filePath.endsWith("service-worker.js")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

/* ------------------------------------------------------------------ */
/* Gemini proxy                                                        */
/* ------------------------------------------------------------------ */

const SUGGESTION_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["food", "transport", "energy", "general"],
          },
          icon: { type: "string" },
          title: { type: "string" },
          text: { type: "string" },
          xp: { type: "integer" },
        },
        required: ["category", "icon", "title", "text", "xp"],
      },
    },
  },
  required: ["suggestions"],
};

function buildPrompt(payload) {
  const safePayload = JSON.stringify(payload, null, 2);
  return [
    "You are EcoTrack, a friendly sustainability coach.",
    "Given a user's recent activity logs (food in grams, transport trips in km, electricity in kWh per month),",
    "produce 4 short personalized suggestions that help reduce their carbon footprint.",
    "",
    "USER DATA:",
    safePayload,
    "",
    "RESPONSE RULES:",
    "- Return EXACTLY 4 suggestions inside the JSON schema you were given.",
    "- Each suggestion must reference something from the user's actual data when possible",
    "  (e.g. a high-CO2 food they ate or a long car trip).",
    "- Keep titles to <= 6 words, imperative voice, e.g. 'Swap beef for chicken twice a week'.",
    "- Keep text to a single motivating sentence, <= 20 words.",
    "- Use one matching emoji for icon (e.g. 🥗 for food, 🚲 for transport, 💡 for energy).",
    "- xp must be an integer 20-80 reflecting effort/impact.",
    "- Category must be one of: food, transport, energy, general.",
    "- Tone: warm, encouraging, practical. No moralizing.",
  ].join("\n");
}

function extractJson(text) {
  if (!text) return null;
  // The model is told to use responseMimeType=application/json so this is
  // already valid JSON in the happy path. We still strip markdown fences
  // defensively in case the model ignores the directive.
  const trimmed = String(text).trim();
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {
    return null;
  }
}

function validateSuggestions(data) {
  if (!data || !Array.isArray(data.suggestions)) return null;
  const allowed = new Set(["food", "transport", "energy", "general"]);
  const cleaned = data.suggestions
    .filter(
      (s) =>
        s &&
        typeof s.title === "string" &&
        typeof s.text === "string" &&
        typeof s.icon === "string"
    )
    .slice(0, 4)
    .map((s) => ({
      category: allowed.has(s.category) ? s.category : "general",
      icon: s.icon.slice(0, 4),
      title: s.title.slice(0, 80),
      text: s.text.slice(0, 240),
      xp: clampXp(s.xp),
    }));
  if (cleaned.length < 3) return null;
  return cleaned;
}

function clampXp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.max(10, Math.min(120, Math.round(n)));
}

app.post("/api/suggestions", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      error: "missing_api_key",
      message:
        "GEMINI_API_KEY is not set on the server. Copy .env.example to .env and add your key.",
    });
  }

  const payload = req.body || {};
  const prompt = buildPrompt(payload);

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(GEMINI_MODEL) +
    ":generateContent?key=" +
    encodeURIComponent(GEMINI_API_KEY);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          // Gemini 2.5 with a JSON response schema spends extra tokens on
          // structural overhead, so give it generous headroom to avoid
          // truncated JSON. 4 short tips comfortably fit under 2048.
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: SUGGESTION_SCHEMA,
        },
        safetySettings: [],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Gemini call failed:", upstream.status, detail);
      return res.status(502).json({
        error: "gemini_failed",
        status: upstream.status,
      });
    }

    const body = await upstream.json();
    const text =
      body &&
      body.candidates &&
      body.candidates[0] &&
      body.candidates[0].content &&
      body.candidates[0].content.parts &&
      body.candidates[0].content.parts[0] &&
      body.candidates[0].content.parts[0].text;

    const parsed = extractJson(text);
    const suggestions = validateSuggestions(parsed);

    if (!suggestions) {
      console.error("Gemini returned unparseable response:", text);
      return res.status(502).json({ error: "gemini_unparseable" });
    }

    res.set("Cache-Control", "no-store");
    return res.json({
      source: "gemini",
      model: GEMINI_MODEL,
      suggestions,
    });
  } catch (err) {
    console.error("Gemini proxy error:", err);
    return res.status(500).json({ error: "proxy_error" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/me", userRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/gamification", gamificationRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiReady: Boolean(GEMINI_API_KEY),
    model: GEMINI_MODEL,
    dbReady: isDbReady(),
  });
});

connectDb()
  .catch(() => false)
  .finally(() => {
    const server = app.listen(PORT, () => {
      console.log(`EcoTrack server running on http://localhost:${PORT}`);
      if (!isDbReady()) {
        console.warn("[warn] MongoDB not connected — auth and data APIs will return 503.");
      }
      if (!GEMINI_API_KEY) {
        console.warn(
          "[warn] GEMINI_API_KEY not set — /api/suggestions will respond with 503 until you add it to .env."
        );
      }
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[error] Port ${PORT} is already in use. Stop the other server or change PORT in .env.`);
      } else {
        console.error("[error] Server failed to start:", err.message);
      }
      process.exit(1);
    });
  });
