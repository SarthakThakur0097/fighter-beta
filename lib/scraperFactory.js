// scraperFactory.js
const sherdog = require("./scrapers/sherdogScraper");
const espn = require("./scrapers/espnScraper");

module.exports = function getScraper(source = "sherdog") {
  switch (source.toLowerCase()) {
    case "espn":
      return espn;
    case "sherdog":
    default:
      return sherdog;
  }
};
