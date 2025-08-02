const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs').promises;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchFighterUrl(fighterName) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const query = `${fighterName} site:espn.com/mma/fighter`;
  console.log(`🔍 Searching DuckDuckGo for: ${query}`);

  try {
    await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('a[data-testid="result-title-a"]', { timeout: 10000 });
    const espnUrl = await page.$eval('a[data-testid="result-title-a"]', el => el.href);
    console.log(`✅ URL found: ${espnUrl}`);
    await browser.close();
    return espnUrl;
  } catch (err) {
    console.error(`❌ No ESPN fighter link found: ${err.message}`);
    await page.screenshot({ path: 'ddg_debug.png', fullPage: true });
    await fs.writeFile('ddg_dump.html', await page.content());
    await browser.close();
    return null;
  }
}

async function saveAndParseStats(url, filePath) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForSelector('a.AnchorLink', { timeout: 10000 });
    const anchors = await page.$$('a.AnchorLink');
    for (const anchor of anchors) {
      const text = await page.evaluate(el => el.textContent.trim(), anchor);
      if (text.toLowerCase().includes('stats')) {
        await anchor.click();
        console.log('📊 Clicked Stats tab');
        break;
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not find or click Stats tab:', err.message);
  }

  try {
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    await delay(2000);
  } catch (err) {
    console.warn('⚠️ Stats table did not load in time:', err.message);
  }

  const html = await page.content();
  await fs.writeFile(filePath, html);
  console.log(`💾 Saved ESPN page to: ${filePath}`);
  await browser.close();

  const $ = cheerio.load(html);
  const tables = $('table');

  const parseSection = (sectionHeaders) => {
    return tables.toArray().map(table => {
      const headers = $(table).find('thead tr th').map((i, el) => $(el).text().trim()).get();
      const match = sectionHeaders.every(h => headers.includes(h));
      if (!match) return [];

      return $(table).find('tbody tr').toArray().map(row => {
        return $(row).find('td').map((i, el) => $(el).text().trim()).get();
      });
    }).flat();
  };

  const strikingHeaders = ['SDBL/A', 'TSL', 'KD'];
  const clinchHeaders = ['SCBL', 'TDL', 'TK ACC'];
  const groundHeaders = ['SGBL', 'AD', 'SM'];

  const striking = parseSection(strikingHeaders);
  const clinch = parseSection(clinchHeaders);
  const ground = parseSection(groundHeaders);

  const fights = striking.map((row, i) => ({
    date: row[0], opponent: row[1], event: row[2], result: row[3],
    striking: row.slice(4),
    clinch: clinch[i]?.slice(4) || [],
    ground: ground[i]?.slice(4) || []
  }));

  console.log(`\n🥊 Parsed ${fights.length} fights with 3-section stats:\n`);
  fights.forEach(f => {
    console.log(`📅 ${f.date} vs ${f.opponent}`);
    console.log(`   Result: ${f.result} @ ${f.event}`);
    console.log(`   Striking: ${f.striking.join(', ')}`);
    console.log(`   Clinch: ${f.clinch.join(', ')}`);
    console.log(`   Ground: ${f.ground.join(', ')}`);
    console.log('---');
  });
}

(async () => {
  const fighterName = 'Jon Jones';
  const url = await searchFighterUrl(fighterName);
  if (url) {
    await saveAndParseStats(url, 'jon_jones_espn.html');
  }
})();
