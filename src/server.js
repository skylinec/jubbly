const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { spawn } = require("child_process");
const http = require('http');
const WebSocket = require('ws');

dotenv.config();

const app = express();
const PORT = 5000;

function camelToSnakeMiddleware(req, res, next) {
  const transformKeys = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(transformKeys);
    } else if (obj && typeof obj === "object") {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        acc[snakeKey] = transformKeys(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  };

  req.body = transformKeys(req.body);
  next();
}

// Middleware
app.use(helmet()); // Adds basic security headers
app.use(
  cors({
    origin: ["http://10.0.0.101:3000", "http://localhost:3000"], // Known origins
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json()); // Body parser middleware
app.use(camelToSnakeMiddleware);

// SQLite Database Setup
const db = new sqlite3.Database("./job_applications.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.run(
      `CREATE TABLE IF NOT EXISTS job_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employer TEXT,
        job_title TEXT,
        city_town TEXT,
        year INTEGER,
        general_role TEXT,
        job_level TEXT,
        date_app_notif TEXT DEFAULT CURRENT_DATE,
        last_update TEXT DEFAULT CURRENT_DATE,
        da_now INTEGER DEFAULT 0,
        da_lu INTEGER DEFAULT 0,
        lu_now INTEGER DEFAULT 0,
        upcoming_interview_date TEXT,
        upcoming_interview_time TEXT,
        last_completed_stage TEXT DEFAULT 'Applied',
        notes TEXT,
        external TEXT DEFAULT 'No',
        job_description TEXT,
        company_website TEXT,
        role_link TEXT,
        sector TEXT
      )`,
      (err) => {
        if (err) {
          console.error("Error creating table:", err.message);
        } else {
          console.log("Database table ensured.");
        }
      }
    );

    db.run(`
      CREATE TABLE IF NOT EXISTS filter_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error("Error creating filter_configs table:", err.message);
      } else {
        console.log("Filter configs table ensured.");
      }
    });
  }
});

// Routes

// Get all job applications
app.get("/applications", (req, res) => {
  db.all("SELECT * FROM job_applications", [], (err, rows) => {
    if (err) {
      console.error("Error fetching applications:", err.message);
      return res.status(500).json({ error: "Failed to fetch applications." });
    }
    // console.log("get res", res)
    res.json(rows);
  });
});


// Add a new job application
app.post("/applications", camelToSnakeMiddleware, (req, res) => {
  console.log("post req", req.body);

  const {
    employer,
    job_title,
    city_town,
    year,
    general_role,
    job_level,
    date_app_notif,
    last_update,
    da_now,
    da_lu,
    lu_now,
    upcoming_interview_date,
    upcoming_interview_time,
    last_completed_stage,
    notes,
    external,
    job_description,
    company_website,
    role_link,
    sector,
  } = req.body;

  const query = `
    INSERT INTO job_applications (
      employer, job_title, city_town, year, general_role, job_level, date_app_notif,
      last_update, da_now, da_lu, lu_now, upcoming_interview_date, upcoming_interview_time,
      last_completed_stage, notes, external, job_description, company_website, role_link, sector
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(
    query,
    [
      employer || null,
      job_title || null,
      city_town || null,
      year || null,
      general_role || null,
      job_level || null,
      date_app_notif || null,
      last_update || null,
      da_now || null,
      da_lu || null,
      lu_now || null,
      upcoming_interview_date || null,
      upcoming_interview_time || null,
      last_completed_stage || null,
      notes || null,
      external || null,
      job_description || null,
      company_website || null,
      role_link || null,
      sector || null,
    ],
    function (err) {
      if (err) {
        console.error("Error inserting application:", err.message);
        return res.status(500).json({ error: "Failed to add application." });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update an existing job application
app.put("/applications/:id", camelToSnakeMiddleware, (req, res) => {
  console.log("put req", req.body);

  const { id } = req.params;
  const {
    employer,
    job_title,
    city_town,
    year,
    general_role,
    job_level,
    date_app_notif,
    last_update,
    da_now,
    da_lu,
    lu_now,
    upcoming_interview_date,
    upcoming_interview_time,
    last_completed_stage,
    notes,
    external,
    job_description,
    company_website,
    role_link,
    sector,
  } = req.body;

  console.log("post job title",job_title)

  const query = `
    UPDATE job_applications
    SET employer = ?, job_title = ?, city_town = ?, year = ?, general_role = ?, job_level = ?, 
        date_app_notif = ?, last_update = ?, da_now = ?, da_lu = ?, lu_now = ?, 
        upcoming_interview_date = ?, upcoming_interview_time = ?, 
        last_completed_stage = ?, notes = ?, external = ?,
        job_description = ?, company_website = ?, role_link = ?, sector = ?
    WHERE id = ?`;

  db.run(
    query,
    [
      employer || null,
      job_title || null,
      city_town || null,
      year || null,
      general_role || null,
      job_level || null,
      date_app_notif || null,
      last_update || null,
      da_now || null,
      da_lu || null,
      lu_now || null,
      upcoming_interview_date || null,
      upcoming_interview_time || null,
      last_completed_stage || null,
      notes || null,
      external || null,
      job_description || null,
      company_website || null,
      role_link || null,
      sector || null,
      id,
    ],
    function (err) {
      if (err) {
        console.error("Error updating application:", err.message);
        return res.status(500).json({ error: "Failed to update application." });
      }
      res.json({ message: "Application updated successfully" });
    }
  );
});


// Delete a job application
app.delete("/applications/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM job_applications WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting application:", err.message);
      return res.status(500).json({ error: "Failed to delete application." });
    }
    res.json({ message: "Application deleted successfully" });
  });
});

// Add health check endpoint
app.get('/health', (req, res) => {
  try {
    db.get('SELECT 1', (err) => {
      if (err) {
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
        return;
      }
      res.json({ status: 'healthy' });
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Save filter configuration
app.post("/filter-configs", (req, res) => {
  const { name, config } = req.body;
  if (!name || !config) {
    return res.status(400).json({ error: "Name and config are required." });
  }

  const query = `INSERT INTO filter_configs (name, config) VALUES (?, ?)`;
  db.run(query, [name, JSON.stringify(config)], function(err) {
    if (err) {
      console.error("Error saving filter config:", err);
      return res.status(500).json({ error: "Failed to save filter configuration." });
    }
    res.status(201).json({ 
      id: this.lastID, 
      message: "Filter configuration saved successfully." 
    });
  });
});

app.get("/filter-configs", (req, res) => {
  db.all("SELECT * FROM filter_configs ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      console.error("Error fetching filter configs:", err);
      return res.status(500).json({ error: "Failed to retrieve filter configurations." });
    }
    // Parse the config field before sending
    const parsedRows = rows.map(row => ({
      ...row,
      config: JSON.parse(row.config)
    }));
    res.json(parsedRows);
  });
});

app.delete("/filter-configs/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM filter_configs WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Error deleting filter config:", err);
      return res.status(500).json({ error: "Failed to delete filter configuration." });
    }
    res.json({ message: "Filter configuration deleted successfully." });
  });
});

// WebSocket setup
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    console.log('Received:', message);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  wss.close(() => {
    console.log('WebSocket server closed');
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      }
      console.log("Closed SQLite database connection.");
      process.exit(0);
    });
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
