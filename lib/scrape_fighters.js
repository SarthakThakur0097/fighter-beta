// Updated processFighters function with opponent scraping
const { fightersByDivision } = require("./fighters_list");
// Import the necessary functions
const { scrapeFighterData } = require("mma"); // Scraper
const { saveFighterToDB, saveFightHistoryToDB, dropAndRecreateTables } = require("./db_saver");
const { resetDatabase } = require("./database");
resetDatabase(); // Call before starting scrapecl
// scrape_fighters.j

const scraped = new Set();
const MAX_DEPTH = 3; // Modify as needed

async function scrapeAndSaveFighter(name, depth = 0) {
  if (scraped.has(name) || depth > MAX_DEPTH) return;
  scraped.add(name);

  console.log(`\n🔍 [Depth ${depth}] Scraping data for ${name}...`);
  const data = await scrapeFighterData(name);
  if (!data) {
    console.warn(`⚠️ No data found for ${name}`);
    return;
  }

  await saveFighterToDB(data);
  await saveFightHistoryToDB(data.name, data.fights);

  for (const fight of data.fights) {
    if (!scraped.has(fight.opponent)) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // delay to avoid rate limits
      await scrapeAndSaveFighter(fight.opponent, depth + 1);
    }
  }
}

async function main() {
  await dropAndRecreateTables();

  for (const [division, fighters] of Object.entries(fightersByDivision)) {
    console.log(`\n📂 Starting division: ${division}`);
    for (const fighter of fighters) {
      try {
        await scrapeAndSaveFighter(fighter);
      } catch (err) {
        console.error(`❌ Error scraping ${fighter}:`, err.message);
      }
    }
  }

  console.log("\n✅ Scraping complete.");
}

main();
