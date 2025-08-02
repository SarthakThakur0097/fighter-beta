// ESPNSearch.js
// Module to fetch an ESPN fighter's profile URL via ESPN's public API

const fetch = require('node-fetch');

/**
 * Given a fighter name, return the first matching ESPN athlete profile URL.
 * @param {string} fighterName
 * @returns {Promise<string>} URL to ESPN fighter page
 */
async function getESPNFighterUrl(fighterName) {
  const query = encodeURIComponent(fighterName.trim());
  const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/mma/athletes?search=${query}`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`ESPN API request failed (${res.status})`);

  const data = await res.json();
  const athletes = data.athletes || data.items || [];
  if (athletes.length === 0) {
    throw new Error(`No ESPN fighter found for "${fighterName}"`);
  }

  // Each athlete has a 'links' array; find the athlete page link
  const athlete = athletes[0];
  const profileLink = (athlete.links || []).find(l => l.rel && l.rel.includes('athlete'));

  if (!profileLink || !profileLink.href) {
    throw new Error(`No profile link in ESPN data for "${fighterName}"`);
  }
  return profileLink.href;
}

module.exports = { getESPNFighterUrl };
