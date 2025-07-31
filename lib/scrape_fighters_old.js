// Import the necessary functions
const { scrapeFighterData } = require('mma'); // Scraper
const { saveFighterToDB, saveFightHistoryToDB } = require('./db_saver');

// List of fighters by division
const fightersByDivision = {
    "Heavyweight": ['Jon Jones', 'Ciryl Gane', 'Stipe Miocic'],
    "Light Heavyweight": ['Jiri Prochazka', 'Jan Blachowicz'],
    "Middleweight": ['Israel Adesanya', 'Robert Whittaker'],
    "Welterweight": ['Leon Edwards', 'Kamaru Usman'],
    "Lightweight": ['Islam Makhachev', 'Charles Oliveira'],
    // Add more divisions and fighters here
  };
  
  // Main function to loop through fighters and save data
  async function processFighters() {
    for (const division in fightersByDivision) {
      const fighters = fightersByDivision[division];
  
      for (const fighterName of fighters) {
        console.log(`Scraping data for ${fighterName}...`);
  
        try {
          // Scrape the fighter data
          const fighterData = await scrapeFighterData(fighterName);
  
          if (fighterData) {
            // Save fighter data to the database
            const fighterId = await saveFighterToDB(fighterData);
            await saveFightHistoryToDB(fighterId, fighterData.fights);
  
            console.log(`${fighterName} saved successfully!`);
          } else {
            console.log(`No data found for ${fighterName}`);
          }
        } catch (error) {
          console.error(`Error processing ${fighterName}:`, error);
        }
      }
    }
  }
  
  // Call the main function to start the process
  processFighters();