// espnScraper.js
const puppeteer = require("puppeteer");
const cheerio   = require("cheerio");
const fs        = require("fs");
const path      = require("path");

// -------------------------------------------------
// helper ▶ converts “Nov 16, 2024” → “2024-11-16”
function normaliseDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toISOString().split("T")[0];
}

// ------------- SEARCH -------------------------------------------------------
async function searchFighterUrl(fighterName) {
  const browser = await puppeteer.launch({
    headless : false,
    args : [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled"
    ],
    defaultViewport : null
  });

  const page = await browser.newPage();

  // evade webdriver detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const query     = `${fighterName} site:espn.com/mma/fighter`;
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_`;
  console.log(`🔍 Searching DuckDuckGo for: ${query}`);

  try {
    await page.goto(searchUrl, { waitUntil: "networkidle2" });
    await page.waitForSelector("a[data-testid='result-title-a']", { timeout: 10_000 });
    const url = await page.$eval("a[data-testid='result-title-a']", el => el.href);
    console.log(`✅ URL found: ${url}`);
    await browser.close();
    return url;
  } catch (err) {
    console.error(`❌ Failed to find ESPN link: ${err.message}`);
    await browser.close();
    return null;
  }
}

// ------------- SCRAPE -------------------------------------------------------
async function getFighterProfile(url) {
  const browser = await puppeteer.launch({ headless: false });
  const page    = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // switch to “Stats” tab if present
    try {
      await page.waitForSelector("a.AnchorLink", { timeout: 10_000 });
      for (const anchor of await page.$$("a.AnchorLink")) {
        const txt = await page.evaluate(el => el.textContent.trim(), anchor);
        if (txt.toLowerCase().includes("stats")) {
          await anchor.click();
          console.log("📊 Clicked Stats tab");
          break;
        }
      }
    } catch {/* ignore */ }

    await page.waitForSelector("table tbody tr", { timeout: 15_000 });
    await new Promise(res => setTimeout(res, 2_000));

    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, "espn_fighter_dump.html"), html);

    const $ = cheerio.load(html);

    // --- header (name, nick, etc.) -----------------------------------------
    const name = $("h1.PlayerHeader__Name span")
      .map((_, el) => $(el).text())
      .get()
      .join(" ")
      .trim();

    const nickname = $("div.ttu:contains('Nickname')").next().text().trim();

    const htwt = $("div.ttu:contains('HT/WT')").next().text().trim();
    let height = "", weight = "";
    if (htwt.includes(",")) [height, weight] = htwt.split(",").map(s => s.trim());

    const birthInfo = $("div.ttu:contains('Birthdate')").next().text().trim();
    const ageMatch  = birthInfo.match(/\((\d+)\)/);
    const age       = ageMatch ? ageMatch[1] : "";

    const recordStr = $("div.StatBlockInner__Label[aria-label='Wins-Losses-Draws']")
      .closest(".StatBlockInner")
      .find(".StatBlockInner__Value")
      .text()
      .trim();
    let wins = 0, losses = 0, draws = 0;
    if (recordStr.includes("-")) [wins, losses, draws] = recordStr.split("-").map(n => +n || 0);

    // KO/TKO + submissions
    const parseDashPair = (ariaLabel) => {
      const txt = $(`div.StatBlockInner__Label[aria-label='${ariaLabel}']`)
        .closest(".StatBlockInner")
        .find(".StatBlockInner__Value")
        .text()
        .trim();
      return txt.includes("-") ? txt.split("-").map(n => +n || 0) : [null, null];
    };
    const [wins_tko,   losses_tko] = parseDashPair("Technical Knockout-Technical Knockout Losses");
    const [wins_sub,   losses_sub] = parseDashPair("Submissions-Submission Losses");
    const image_url                 = $("figure.PlayerHeader__HeadShot img").attr("src") || null;

    // --- tables ------------------------------------------------------------
    const sectionHeaders = ["striking", "clinch", "ground"];
    const parsedFights   = {};

    $("table").each((tableIdx, table) => {
      const section = sectionHeaders[tableIdx] || `section${tableIdx}`;
        
      $(table).find("tbody tr").each((_, row) => {
        const tds = $(row).find("td");
        if (tds.length < 4) return;   // skip malformed rows

        // base columns (shared across all tables)
        const rawDate  = tds.eq(0).text().trim();
        const date     = normaliseDate(rawDate);          // normalised date

        // 🪵 DEBUG – show what we just scraped
        //console.log(`🗓  Raw date: "${rawDate}" → normalised: "${date}"`);

        const opponent = tds.eq(1).clone().find("img").remove().end().text().trim();
        const event    = tds.eq(2).text().trim();
        const result   = tds.eq(3).text().trim();

        // guard against blank rows
        if (!rawDate || !opponent) return;

        const key = `${date}|${opponent}`;
        if (!parsedFights[key]) {
          parsedFights[key] = { date, opponent, event, result };
        }

        // collect numeric / percentage stats
        const cols = tds.map((_, el) => $(el).text().trim()).get();

        if (section === "striking") {
          Object.assign(parsedFights[key], {
            sdbl_a   : cols[4],
            sdhl_a   : cols[5],
            sdll_a   : cols[6],
            tsl      : cols[7],
            tsa      : cols[8],
            ssl      : cols[9],
            ssa      : cols[10],
            tsl_tsa  : cols[11],
            kd       : cols[12],
            body_pct : cols[13],
            head_pct : cols[14],
            leg_pct  : cols[15]
          });
        } else if (section === "clinch") {
          Object.assign(parsedFights[key], {
            scbl   : cols[4],
            scba   : cols[5],
            schl   : cols[6],
            scha   : cols[7],
            scll   : cols[8],
            scla   : cols[9],
            rv     : cols[10],
            sr     : cols[11],
            tdl    : cols[12],
            tda    : cols[13],
            tds    : cols[14],
            tk_acc : cols[15]
          });
        } else if (section === "ground") {
          Object.assign(parsedFights[key], {
            sgbl : cols[4],
            sgba : cols[5],
            sghl : cols[6],
            sgha : cols[7],
            sgll : cols[8],
            sgla : cols[9],
            ad   : cols[10],
            adtb : cols[11],
            adhg : cols[12],
            adtm : cols[13],
            adts : cols[14],
            sm   : cols[15]
          });
        }
      });
    });

    await browser.close();

    return {
      name,
      nickname,
      record        : recordStr,
      image_url,
      height,
      weight,
      reach         : null,
      age,
      wins_total    : wins,
      losses_total  : losses,
      draws_total   : draws,
      wins_tko,
      wins_sub,
      losses_tko,
      losses_sub,
      fights: Object.values(parsedFights)
    };
  } catch (err) {
    console.error("❌ Error in getFighterProfile:", err.message);
    await browser.close();
    return null;
  }
}

module.exports = { searchFighterUrl, getFighterProfile };
