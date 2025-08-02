// process_fighters.js
const { fightersByDivision } = require("./fighters_list");
const { scrapeFighterData }   = require("./scrapeFighterData");
const {
  saveFighterToDB,
  saveFightHistoryToDB,
  initializeTables,
} = require("./db_saver");
const { resetDatabase } = require("./database");

const scraped     = new Set();
const MAX_DEPTH   = 2;          // depth 0 (root) → depth 2 (opponent-of-opponent)
const MAX_OPPS    = 3;          // first 3 unique opponents per level

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeAndSaveFighter(name, depth = 0) {
  if (scraped.has(name) || depth > MAX_DEPTH) return;
  scraped.add(name);

  console.log(`${"  ".repeat(depth)}🔍 [Depth ${depth}] ${name}`);
  const data = await scrapeFighterData(name);
  if (!data) {
    console.warn(`${"  ".repeat(depth)}⚠️ No data for ${name}`);
    return;
  }

  await saveFighterToDB(data);
  await saveFightHistoryToDB(data.name, data.fights);

  if (depth >= MAX_DEPTH) return;          // stop at depth 2

  /* --- gather up-to-3 new opponents --- */
  const nextOpponents = [];
  for (const fight of data.fights) {
    const opp = fight.opponent;
    if (opp && !scraped.has(opp) && !nextOpponents.includes(opp)) {
      nextOpponents.push(opp);
      if (nextOpponents.length === MAX_OPPS) break;
    }
  }

  /* --- recurse into each opponent --- */
  for (const opp of nextOpponents) {
    await delay(2000);                     // keep crawler polite
    await scrapeAndSaveFighter(opp, depth + 1);
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
        await scrapeAndSaveFighter(fighter, 0);
      } catch (err) {
        console.error(`❌ Error scraping ${fighter}:`, err.message);
      }
    }
  }

  console.log("\n✅ Scraping complete.");
}

main();
