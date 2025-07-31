const { searchGoogleForFighter } = require('./googleSearch');

(async () => {
  const url = await searchGoogleForFighter('Jon Jones');
  console.log('🔗 Final URL:', url);
})();
