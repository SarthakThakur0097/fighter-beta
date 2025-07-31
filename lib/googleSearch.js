const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function searchGoogleForFighter(query) {
  const browser = await puppeteer.launch({
    headless: "new", // fixes blank pages in newer Puppeteer versions
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const searchQuery = `${query} site:sherdog.com/fighter`;
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(
    searchQuery
  )}`;

  try {
    console.log(`🔍 Searching for: ${query}`);
    await page.goto(searchUrl, { waitUntil: "networkidle2" });

    await page.waitForSelector('a[data-testid="result-title-a"]', {
      timeout: 10000,
    });

    const sherdogUrl = await page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll('a[data-testid="result-title-a"]')
      );
      const match = links.find((link) =>
        /^https:\/\/www\.sherdog\.com\/fighter\/[^\/]+-\d+$/.test(link.href)
      );
      return match ? match.href : null;
    });

    if (sherdogUrl) {
      console.log(`✅ Sherdog URL found: ${sherdogUrl}`);
      return sherdogUrl;
    } else {
      console.warn(
        `⚠️ No valid Sherdog profile link found for query: "${query}"`
      );
      return null;
    }
  } catch (err) {
    console.error(`❌ Puppeteer error for query "${query}":`, err.message);
    return null;
  } finally {
    await browser.close();
  }
}

module.exports = { searchGoogleForFighter };

/* const axios = require("axios");
const cheerio = require("cheerio");

async function searchGoogleForFighter(query) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
    query + " site:sherdog.com/fighter"
  )}`;

  try {
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9', },
    });

    const $ = cheerio.load(response.data);
    let links = [];

    $("a.result__a").each((_, el) => {
      const href = $(el).attr("href");
      const match = href && href.match(/uddg=([^&]+)/);
      if (match && match[1]) {
        const decodedUrl = decodeURIComponent(match[1]);

        // ✅ Strict match for profile URLs only
        if (
          /^https:\/\/www\.sherdog\.com\/fighter\/[^\/]+-\d+$/.test(decodedUrl)
        ) {
          links.push(decodedUrl);
        }
      }
    });

    const finalUrl = links.length > 0 ? links[0] : null;
    if (!finalUrl) {
      console.warn(
        `⚠️ DuckDuckGo returned no valid Sherdog profile link for query: "${query}"`
      );
    }

    return finalUrl;
  } catch (err) {
    console.error("❌ Error during DuckDuckGo search:", err.message);
    return null;
  }
}

module.exports = { searchGoogleForFighter };
*/
