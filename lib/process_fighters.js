// process_fighters.js
const { fightersByDivision } = require("./fighters_list");
const { scrapeFighterData } = require("./scrapeFighterData");
const {
  saveFighterToDB,
  saveFightHistoryToDB,
  initializeTables,
} = require("./db_saver");
const { resetDatabase } = require("./database");

const scraped = new Set();
const MAX_DEPTH = 3;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      await delay(2000);
      await scrapeAndSaveFighter(fight.opponent, depth + 1);
    }
  }
}

async function main() {
  console.log("🚨 Resetting database...");
  resetDatabase();
  await initializeTables();

  for (const [division, fighters] of Object.entries(fightersByDivision)) {
    console.log(`\n📂 Starting division: ${division}`);
    for (const fighter of fighters) {
      try {
        
        await scrapeAndSaveFighter(fighter);
      } catch (err) {
        console.log(`THE ERROR MESSAGE ${err}`)
        console.error(`❌ Error scraping ${fighter}:`, err.message);
      }
    }
  }

  console.log("\n✅ Scraping complete.");
}

main();
