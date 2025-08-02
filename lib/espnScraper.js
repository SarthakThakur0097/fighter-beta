const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// DuckDuckGo Search + Bot Evasion
async function searchFighterUrl(fighterName) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
  });

  const query = `${fighterName} site:espn.com/mma/fighter`;
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_`;
  console.log(`🔍 Searching DuckDuckGo for: ${query}`);

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('a[data-testid="result-title-a"]', { timeout: 10000 });
    const url = await page.$eval('a[data-testid="result-title-a"]', el => el.href);
    console.log(`✅ URL found: ${url}`);
    await browser.close();
    return url;
  } catch (err) {
    console.error(`❌ Failed to find ESPN link: ${err.message}`);
    await browser.close();
    return null;
  }
}

// Extract profile + fight history
async function getFighterProfile(url) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Click the Stats tab
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

    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'espn_fighter_dump.html'), html);

    const $ = cheerio.load(html);

    // ✅ UPDATED SELECTORS BELOW ONLY
    const name = $('h1.PlayerHeader__Name span')
      .map((i, el) => $(el).text())
      .get()
      .join(' ')
      .trim();

    const nickname = $('div.ttu:contains("Nickname")').next().text().trim();

    const htwt = $('div.ttu:contains("HT/WT")').next().text().trim();
    let height = '', weight = '';
    if (htwt.includes(',')) {
      [height, weight] = htwt.split(',').map(s => s.trim());
    }

    const birthInfo = $('div.ttu:contains("Birthdate")').next().text().trim();
    let age = '';
    const ageMatch = birthInfo.match(/\((\d+)\)/);
    if (ageMatch) age = ageMatch[1];

    const record = $('div.StatBlockInner__Label[aria-label="Wins-Losses-Draws"]')
      .closest('.StatBlockInner')
      .find('.StatBlockInner__Value')
      .text()
      .trim();

    let wins = 0, losses = 0, draws = 0;
    if (record && record.includes('-')) {
      [wins, losses, draws] = record.split('-').map(n => parseInt(n) || 0);
    }

    const tkoStat = $('div.StatBlockInner__Label[aria-label="Technical Knockout-Technical Knockout Losses"]')
      .closest('.StatBlockInner')
      .find('.StatBlockInner__Value')
      .text()
      .trim();
    let wins_tko = null, losses_tko = null;
    if (tkoStat && tkoStat.includes('-')) {
      [wins_tko, losses_tko] = tkoStat.split('-').map(n => parseInt(n) || 0);
    }

    const subStat = $('div.StatBlockInner__Label[aria-label="Submissions-Submission Losses"]')
      .closest('.StatBlockInner')
      .find('.StatBlockInner__Value')
      .text()
      .trim();
    let wins_sub = null, losses_sub = null;
    if (subStat && subStat.includes('-')) {
      [wins_sub, losses_sub] = subStat.split('-').map(n => parseInt(n) || 0);
    }

    const image_url = $('figure.PlayerHeader__HeadShot img').attr('src') || null;

    // Fight History Logic (unchanged)
    const sections = $('table');
    const sectionHeaders = ['striking', 'clinch', 'ground'];

    const parsedFights = {};
    sections.each((index, table) => {
      const section = sectionHeaders[index] || `section${index}`;
      const rows = $(table).find('tbody tr');

      rows.each((i, row) => {
        const cols = $(row).find('td').map((i, el) => $(el).text().trim()).get();
        if (cols.length < 4) return;

        const key = `${cols[0]}|${cols[1]}`;
        if (!parsedFights[key]) parsedFights[key] = {
          date: cols[0],
          opponent: cols[1],
          event: cols[2],
          result: cols[3]
        };

        if (section === 'striking') {
          Object.assign(parsedFights[key], {
            sdbl_a: cols[4], sdhl_a: cols[5], sdll_a: cols[6],
            tsl: cols[7], tsa: cols[8], ssl: cols[9], ssa: cols[10],
            tsl_tsa: cols[11], kd: cols[12],
            body_pct: cols[13], head_pct: cols[14], leg_pct: cols[15]
          });
        } else if (section === 'clinch') {
          Object.assign(parsedFights[key], {
            scbl: cols[4], scba: cols[5], schl: cols[6], scha: cols[7],
            scll: cols[8], scla: cols[9], rv: cols[10], sr: cols[11],
            tdl: cols[12], tda: cols[13], tds: cols[14], tkacc: cols[15]
          });
        } else if (section === 'ground') {
          Object.assign(parsedFights[key], {
            sgbl: cols[4], sgba: cols[5], sghl: cols[6], sgha: cols[7],
            sgll: cols[8], sgla: cols[9], ad: cols[10], adtb: cols[11],
            adhg: cols[12], adtm: cols[13], adts: cols[14], sm: cols[15]
          });
        }
      });
    });

    await browser.close();

    return {
      name,
      nickname,
      record,
      image_url,
      height,
      weight,
      reach: null,
      age,
      wins_total: wins,
      losses_total: losses,
      draws_total: draws,
      wins_tko,
      wins_sub,
      losses_tko,
      losses_sub,
      fights: Object.values(parsedFights)
    };
  } catch (err) {
    console.error('❌ Error in getFighterProfile:', err.message);
    await browser.close();
    return null;
  }
}

module.exports = {
  searchFighterUrl,
  getFighterProfile,
};
