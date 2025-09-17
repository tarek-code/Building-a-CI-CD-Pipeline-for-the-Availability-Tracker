const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));
app.use("/input", express.static(path.join(__dirname, "input")));
app.use("/output", express.static(path.join(__dirname, "output")));

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

app.post("/save-history", (req, res) => {
  try {
    const historyPath = path.join(__dirname, "output", "history.json");
    saveHistoryToFile(historyPath, req.body);
    res.status(200).send("Saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to save history.json");
  }
});

// Start server only if running directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// ============================
// Export for Testing
// ============================

module.exports = {
  app,                    // for integration tests
  saveHistoryToFile,      // for unit tests
  readHistoryFromFile,    // for unit tests
};

