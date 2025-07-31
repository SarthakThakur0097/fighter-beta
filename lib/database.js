const sqlite3 = require("sqlite3").verbose();

// Create a new database connection
const db = new sqlite3.Database("./mma_fighters.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Function to create tables (used by both init and reset)
function createTables() {
  const createFightersTable = `
    CREATE TABLE IF NOT EXISTS fighters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      nickname TEXT,
      age TEXT,
      birthday TEXT,
      locality TEXT,
      nationality TEXT,
      association TEXT,
      height TEXT,
      weight TEXT,
      weight_class TEXT,
      image_url TEXT,
      wins_total INTEGER,
      wins_knockouts INTEGER,
      wins_submissions INTEGER,
      wins_decisions INTEGER,
      wins_others INTEGER,
      losses_total INTEGER,
      losses_knockouts INTEGER,
      losses_submissions INTEGER,
      losses_decisions INTEGER,
      losses_others INTEGER,
      no_contests INTEGER
    );
  `;

  const createFightsTable = `
    CREATE TABLE IF NOT EXISTS fights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fighter_id INTEGER,
      event_name TEXT,
      event_date TEXT,
      url TEXT,
      result TEXT,
      method TEXT,
      referee TEXT,
      round TEXT,
      time TEXT,
      opponent TEXT,
      FOREIGN KEY (fighter_id) REFERENCES fighters(id)
    );
  `;

  db.run(createFightersTable);
  db.run(createFightsTable);
  console.log("✅ Tables created successfully.");
}

// Optional: Reset DB completely
function resetDatabase() {
  db.serialize(() => {
    db.run("DROP TABLE IF EXISTS fights");
    db.run("DROP TABLE IF EXISTS fighters", (err) => {
      if (err) {
        console.error("❌ Error dropping tables:", err.message);
      } else {
        console.log("🧹 Existing tables dropped.");
        createTables();
      }
    });
  });
}

// Initialize tables by default (only if not calling reset externally)
createTables();

module.exports = db;
module.exports.resetDatabase = resetDatabase;
