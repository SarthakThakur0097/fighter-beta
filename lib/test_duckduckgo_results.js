const { searchGoogleForFighter } = require("../lib/googleSearch"); // adjust if file is elsewhere
const { scrapeFighterData } = require("mma"); // Scraper

(async () => {
  const url = await searchGoogleForFighter("Max Holloway");
  console.log("Final URL:", url);
})();
