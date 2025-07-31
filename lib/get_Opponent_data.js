const db = require('./database'); // Database connection
const { searchGoogleForFighter, getFighter } = require('./googleSearch'); // Adjust if needed

async function getAndSaveOpponentData(opponentName) {
    try {
        // Check if opponent already exists
        const opponentExists = await db.get(
            'SELECT * FROM fighters WHERE name = ?',
            [opponentName]
        );

        if (!opponentExists) {
            const url = await searchGoogleForFighter(opponentName);
            if (url) {
                getFighter(url, async (opponentData) => {
                    // Save opponent data to the database
                    await db.run(
                        `INSERT INTO fighters (name, ... ) VALUES (?, ...)`, // Insert opponent data here
                        [opponentData.name, ...]
                    );
                    console.log(`Saved opponent ${opponentData.name} to database.`);
                });
            }
        }
    } catch (err) {
        console.error(`Error fetching or saving opponent data for ${opponentName}:`, err);
    }
}

async function updateDatabaseWithOpponents() {
    const fighters = await db.all('SELECT * FROM fighters');
    for (const fighter of fighters) {
        const fights = await db.all(
            'SELECT opponent FROM fights WHERE fighter_id = ?',
            [fighter.id]
        );

        for (const fight of fights) {
            await getAndSaveOpponentData(fight.opponent);
        }
    }
}

updateDatabaseWithOpponents();
