const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./job_applications.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database.');
});

// Run migrations in a transaction
db.serialize(() => {
  // Add the new column
  db.run(`ALTER TABLE job_applications ADD COLUMN upcoming_interview_time TEXT;`, (err) => {
    if (err) {
      console.error('Error adding column:', err.message);
      return;
    }
    console.log('Added upcoming_interview_time column');
    
    // Set default value of "09:00" for existing records with upcoming_interview_date
    db.run(`
      UPDATE job_applications 
      SET upcoming_interview_time = "09:00" 
      WHERE upcoming_interview_date IS NOT NULL;
    `, (err) => {
      if (err) {
        console.error('Error setting default times:', err.message);
        return;
      }
      console.log('Set default times for existing interviews');
    });
  });
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
    return;
  }
  console.log('Database connection closed.');
});
