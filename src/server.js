const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { spawn } = require("child_process");

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
      last_update, da_now, da_lu, lu_now, upcoming_interview_date, last_completed_stage,
      notes, external, job_description, company_website, role_link, sector
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
        upcoming_interview_date = ?, last_completed_stage = ?, notes = ?, external = ?,
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

app.post("/nlp-extract", (req, res) => {
  console.log("nlp req body",req.body)
  const { text, role_link } = req.body;

  let new_text = text
  .replace(/\n/g, " ")         // Replace all line breaks with a space
  .replace(/\s+/g, " ")        // Replace multiple spaces with a single space
  .trim();

  console.log("NLP request received:", { new_text, role_link });

  if (!text || !role_link) {
    return res
      .status(400)
      .json({ error: "Both text and role_link are required for NLP extraction." });
  }

  const pythonProcess = spawn("python3", ["src/py/nlp_parser.py", new_text, role_link]);

  let result = "";
  let errorOccurred = false;

  pythonProcess.stdout.on("data", (data) => {
    console.log("incoming:",data.toString())
    result += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error("Python error:", data.toString());
    if (!errorOccurred) {
      errorOccurred = true;
      res.status(500).json({ error: "NLP extraction failed or waiting", details: data.toString() });
    }
  });

  pythonProcess.on("close", (code) => {
    if (!errorOccurred) {
      try {
        console.log("json to parse",result)
        const parsedData = JSON.parse(result);
        console.log('parsedData',parsedData)

        // Ensure `role_link` is included in the data being saved
        const {
          employer,
          job_title,
          city_town,
          year,
          general_role,
          job_level,
          dates,
          last_completed_stage,
          notes,
          company_website,
          sector,
        } = parsedData;

        console.log("Parsed data to save:", { ...parsedData, role_link });

        // Extract specific dates for application and upcoming interview
        const date_app_notif = dates && dates[0] ? dates[0] : null;
        const upcoming_interview_date = dates && dates[1] ? dates[1] : null;

        const query = `
          INSERT INTO job_applications (
            employer, job_title, city_town, year, general_role, job_level, date_app_notif,
            last_update, da_now, da_lu, lu_now, upcoming_interview_date, last_completed_stage,
            notes, external, job_description, company_website, role_link, sector
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, 0, 0, 0, ?, ?, ?, 'No', NULL, ?, ?, ?)
        `;

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
            upcoming_interview_date || null,
            last_completed_stage || null,
            notes || null,
            company_website || null,
            role_link || null,
            sector || null,
          ],
          function (err) {
            if (err) {
              console.error("Error inserting into database:", err.message);
              return res
                .status(500)
                .json({ error: "Failed to save application to database." });
            }

            res
              .status(201)
              .json({ id: this.lastID, message: "Application saved successfully." });
          }
        );
      } catch (err) {
        console.error("JSON parse error:", err.message);
        res.status(500).json({ error: "Failed to parse NLP output." });
      }
    }
  });
});


// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    }
    console.log("Closed SQLite database connection.");
    process.exit(0);
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
