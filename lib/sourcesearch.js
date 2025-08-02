// sourceSearch.js
// Unified URL lookup for ESPN only (Sherdog removed)

const { getESPNFighterUrl } = require("./ESPNsearch");

/**
 * Return the ESPN profile URL for a given fighter name.
 * @param {string} fighterName
 * @returns {Promise<string>} URL to ESPN fighter page
 */
async function getFighterUrl(fighterName) {
  return getESPNFighterUrl(fighterName);
}

module.exports = { getFighterUrl };
