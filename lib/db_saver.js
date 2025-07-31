const db = require("./database");
function saveFighterToDB(fighter) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT OR IGNORE INTO fighters (
        name, nickname, age, birthday, locality, nationality,
        association, height, weight, weight_class, image_url,
        wins_total, wins_knockouts, wins_submissions, wins_decisions, wins_others,
        losses_total, losses_knockouts, losses_submissions, losses_decisions, losses_others,
        no_contests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      fighter.name,
      fighter.nickname,
      parseInt(fighter.age) || null,
      fighter.birthday,
      fighter.locality || null,
      fighter.nationality || null,
      fighter.association || null,
      fighter.height,
      fighter.weight,
      fighter.weight_class,
      fighter.image_url,
      fighter.wins.total,
      fighter.wins.knockouts,
      fighter.wins.submissions,
      fighter.wins.decisions,
      fighter.wins.others,
      fighter.losses.total,
      fighter.losses.knockouts,
      fighter.losses.submissions,
      fighter.losses.decisions,
      fighter.losses.others,
      fighter.no_contests,
    ];

    db.run(query, values, function (err) {
      if (err) {
        console.error("❌ Error inserting fighter:", err.message);
        reject(err);
      } else {
        console.log(`✅ Fighter ${fighter.name} saved with ID ${this.lastID}`);
        // Get the ID (could be undefined if already existed)
        if (this.lastID) {
          resolve(this.lastID);
        } else {
          // Get existing fighter ID
          db.get(
            "SELECT id FROM fighters WHERE name = ?",
            [fighter.name],
            (err, row) => {
              if (err) return reject(err);
              resolve(row?.id);
            }
          );
        }
      }
    });
  });
}
function saveFightHistoryToDB(fighterId, fights) {
  return new Promise((resolve, reject) => {
    if (!fights || !Array.isArray(fights)) return resolve();

    const stmt = db.prepare(`
      INSERT INTO fights (
        fighter_id, event_name, event_date, url,
        result, method, referee, round, time, opponent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.serialize(() => {
      fights.forEach((fight) => {
        stmt.run([
          fighterId,
          fight.name,
          fight.date,
          fight.url,
          fight.result,
          fight.method,
          fight.referee,
          fight.round,
          fight.time,
          fight.opponent,
        ]);
      });

      stmt.finalize((err) => {
        if (err) {
          console.error(
            `❌ Failed to save fight history for fighter ID ${fighterId}:`,
            err.message
          );
          reject(err);
        } else {
          console.log(
            `✅ Saved ${fights.length} fights for fighter ID ${fighterId}`
          );
          resolve();
        }
      });
    });
  });
}

// Function to ensure tables exist
function initializeTables() {
  db.serialize(() => {
    db.run(`
            CREATE TABLE IF NOT EXISTS fighters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                nickname TEXT,
                age INTEGER,
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
            )
        `);

    db.run(`
            CREATE TABLE IF NOT EXISTS fights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fighter_id INTEGER,
                event_name TEXT,
                event_date TEXT,
                url TEXT,
                result TEXT,
                method TEXT,
                referee TEXT,
                round INTEGER,
                time TEXT,
                opponent TEXT,
                FOREIGN KEY(fighter_id) REFERENCES fighters(id)
            )
        `);

    console.log("Tables initialized successfully.");
  });
}


function dropAndRecreateTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("DROP TABLE IF EXISTS fights;", (err) => {
        if (err) return reject(err);
        db.run("DROP TABLE IF EXISTS fighters;", (err) => {
          if (err) return reject(err);

          const createFightersTable = `
            CREATE TABLE IF NOT EXISTS fighters (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT,
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

          db.run(createFightersTable, (err) => {
            if (err) return reject(err);
            db.run(createFightsTable, (err) => {
              if (err) return reject(err);
              console.log("✅ Tables dropped and recreated.");
              resolve();
            });
          });
        });
      });
    });
  });
}

module.exports = {
  saveFighterToDB,
  saveFightHistoryToDB,
  dropAndRecreateTables
};
