const db = require('./database');
const { saveFighterToDB, saveFightHistoryToDB } = require('./db_saver');
const { searchGoogleForFighter } = require('./googleSearch');

async function scrapeFighterData(query) {
  const sherdogUrl = await searchGoogleForFighter(query);
  if (!sherdogUrl) {
    console.error('Sherdog URL not found for fighter:', query);
    return null;  // Return null to indicate failure
  }

  return new Promise((resolve, reject) => {
    getFighter(sherdogUrl, (fighterData) => {
      if (fighterData) {
        console.log("Fighter Data:", fighterData);
        resolve(fighterData);
      } else {
        reject(new Error('Failed to scrape fighter data'));
      }
    });
  });
}

async function getOpponentData(opponentName) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM fighters WHERE name = ?';
    db.get(query, [opponentName], async (err, row) => {
      if (err) {
        console.error(`Database error: ${err.message}`);
        reject(err);
      } else if (row) {
        resolve(row); // Opponent already in the database
      } else {
        console.log(`Opponent ${opponentName} not found in DB. Scraping data...`);
        try {
          const opponentData = await scrapeFighterData(opponentName);
          if (opponentData) {
            // Save opponent's data to the database
            const opponentId = await saveFighterToDB(opponentData);
            await saveFightHistoryToDB(opponentId, opponentData.fights);

            console.log(`Opponent ${opponentName} added to DB.`);
            resolve(opponentData);
          } else {
            console.error(`Failed to scrape data for opponent: ${opponentName}`);
            reject(new Error('Scraping failed'));
          }
        } catch (error) {
          console.error(`Error during scraping: ${error.message}`);
          reject(error);
        }
      }
    });
  });
}

// Example usage
async function updateMissingOpponents() {
  const fighters = await db.all('SELECT DISTINCT name FROM fighters');

  for (const fighter of fighters) {
    const opponentsQuery = `SELECT opponent FROM fights WHERE fighter_id = ?`;
    const opponents = await db.all(opponentsQuery, [fighter.id]);

    for (const { opponent } of opponents) {
      if (opponent) {
        await getOpponentData(opponent);
      }
    }
  }
}

updateMissingOpponents().catch(console.error);
