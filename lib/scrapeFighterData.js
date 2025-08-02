// scrapeFighterData.js
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { searchFighterUrl, getFighterProfile } = require("./espnScraper");

async function scrapeFighterData(fighterName) {
  console.log(`Searching for fighter: ${fighterName}`);

  await delay(10000 + Math.random() * 5000); // Anti-bot delay
  const url = await searchFighterUrl(fighterName);
  console.log(`URL found: ${url}`);

  if (!url) {
    console.error(`No URL found for fighter: ${fighterName}`);
    return null;
  }

  try {
    const data = await getFighterProfile(url);

    return data;
  } catch (err) {
    console.error(`Error scraping fighter data:`, err.message);
    return null;
  }
}

module.exports = { scrapeFighterData };
