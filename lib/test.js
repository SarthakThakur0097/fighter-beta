const {
  searchGoogleForFighter,
} = require("./googleSearch");

(async () => {
  const url = await searchGoogleForFighter("Jon Jones");
  console.log("Found URL:", url);
})();
