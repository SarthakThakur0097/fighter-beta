const puppeteer = require("puppeteer");

(async () => {
  const fighterUrl =
    "https://www.espn.com/mma/fighter/_/id/2335639/jon-jones"; // sample

  const browser = await puppeteer.launch({ headless: false }); // visible for inspection
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  await page.goto(fighterUrl, { waitUntil: "domcontentloaded" });

  const html = await page.content();
  require("fs").writeFileSync("espn_fighter_sample.html", html);

  console.log("✅ Saved page content to espn_fighter_sample.html");
  await browser.close();
})();
