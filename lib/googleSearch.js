const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

/**
 * Searches DuckDuckGo for a fighter profile on Sherdog or ESPN
 * @param {string} query - Fighter name
 * @param {string} source - 'sherdog' or 'espn'
 * @returns {Promise<string|null>} - Fighter profile URL
 */
async function searchFighterUrl(query, source = "espn") {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const siteFilter = source === "sherdog"
    ? "site:sherdog.com/fighter"
    : "site:espn.com/mma/fighter";

  const searchQuery = `${query} ${siteFilter}`;
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;

  try {
    console.log(`🔍 Searching for ${source.toUpperCase()} profile: ${query}`);
    await page.goto(searchUrl, { waitUntil: "networkidle2" });

    await page.waitForSelector('a[data-testid="result-title-a"]', {
      timeout: 10000,
    });

    const url = await page.evaluate((source) => {
      const links = Array.from(
        document.querySelectorAll('a[data-testid="result-title-a"]')
      );

      const regex = source === "sherdog"
        ? /^https:\/\/www\.sherdog\.com\/fighter\/[^\/]+-\d+$/
        : /^https:\/\/www\.espn\.com\/mma\/fighter\/_\/id\/\d+\/[^\/]+$/;

      const match = links.find(link => regex.test(link.href));
      return match ? match.href : null;
    }, source);

    if (url) {
      console.log(`✅ ${source.toUpperCase()} URL found: ${url}`);
      return url;
    } else {
      console.warn(`⚠️ No valid ${source.toUpperCase()} profile found for: "${query}"`);
      return null;
    }
  } catch (err) {
    console.error(`❌ DuckDuckGo search error for "${query}":`, err.message);
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = { searchFighterUrl };
