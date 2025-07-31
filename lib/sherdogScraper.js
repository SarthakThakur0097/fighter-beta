const googleSearch = require('../googleSearch');
const puppeteer = require('puppeteer');

async function searchFighterUrl(name) {
  return await googleSearch(name); // already returns Sherdog URL
}

async function getFighterProfile(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Replace this with your actual scraping logic
  const profile = await page.evaluate(() => {
    const name = document.querySelector('h1.fn').innerText.trim();
    const record = document.querySelector('.record').innerText.trim();
    return { name, record };
  });

  await browser.close();
  return profile;
}

async function getFighterOpponents(url) {
  // You can use the same scraping logic as your current recursive Sherdog scraper
  return [];
}

module.exports = {
  searchFighterUrl,
  getFighterProfile,
  getFighterOpponents
};
