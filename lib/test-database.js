// test-database.js
const db = require('./database');

// Verify table creation
db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
    if (err) {
      console.error('Error retrieving tables:', err.message);
    } else {
      console.log('Tables in the database:', tables);
    }
  });
});

// Close the database connection
db.close();
