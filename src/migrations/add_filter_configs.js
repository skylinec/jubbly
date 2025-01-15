const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./job_applications.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS filter_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      config TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error("Failed to create filter_configs table:", err.message);
    } else {
      console.log("filter_configs table created successfully.");
    }
  });
});

db.close();
