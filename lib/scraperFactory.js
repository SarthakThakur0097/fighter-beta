const espn = require("./espnScraper");

module.exports = function getScraper(source = "espn") {
  return espn;
};