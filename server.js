const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const { createClient } = require("redis");

const app = express();
const PORT = 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

// Redis client
const redisClient = createClient({ url: REDIS_URL });
redisClient.on("error", (err) => console.error("Redis Client Error", err));

async function ensureRedisConnected() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

// Middleware
app.use(bodyParser.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));
app.use("/input", express.static(path.join(__dirname, "input")));
app.use("/output", express.static(path.join(__dirname, "output")));

// Ensure root serves the homepage explicitly
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve history from Redis for the frontend (fallback to file)
app.get("/output/history.json", async (_req, res) => {
  try {
    await ensureRedisConnected();
    const raw = await redisClient.get("history");
    if (raw) {
      res.status(200).type("application/json").send(raw);
      return;
    }
    const fp = path.join(__dirname, "output", "history.json");
    if (fs.existsSync(fp)) {
      res.status(200).type("application/json").send(fs.readFileSync(fp, "utf8"));
      return;
    }
    res.status(200).json({});
  } catch (e) {
    console.error(e);
    res.status(500).json({});
  }
});

// ============================
// Functions for Unit Testing
// ============================

/**
 * Save history object to file
 * @param {string} filePath
 * @param {Object} data
 */
function saveHistoryToFile(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, json, "utf8");
  return true;
}

/**
 * Read history object from file
 * @param {string} filePath
 * @returns {Object}
 */
function readHistoryFromFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

// ============================
// Routes
// ============================

app.post("/save-history", async (req, res) => {
  try {
    // Save directly to Redis as the source of truth
    await ensureRedisConnected();
    await redisClient.set("history", JSON.stringify(req.body, null, 2));
    // Best-effort write to file for compatibility/visibility
    const historyPath = path.join(__dirname, "output", "history.json");
    try { saveHistoryToFile(historyPath, req.body); } catch (err) {  /*intentionally ignored - Redis is source of truth */}
    res.status(200).send("Saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to save history.json");
  }
});

// Start server only if running directly
if (require.main === module) {
  (async () => {
    try { await ensureRedisConnected(); } catch (e) { console.warn("Redis connect failed", e.message); }
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })();
}

// ============================
// Export for Testing
// ============================

module.exports = {
  app,                    // for integration tests
  saveHistoryToFile,      // for unit tests
  readHistoryFromFile,    // for unit tests
};

