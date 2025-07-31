const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

module.exports.getFighter = async function (url, callback) {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);

    // Keep your existing parsing logic below ⬇️
    var fighter = {
      name: "",
      nickname: "",
      age: "",
      birthday: "",
      locality: "",
      nationality: "",
      association: "",
      height: "",
      weight: "",
      weight_class: "",
      image_url: "",
      wins: {
        total: 0,
        knockouts: 0,
        submissions: 0,
        decisions: 0,
        others: 0,
      },
      losses: {
        total: 0,
        knockouts: 0,
        submissions: 0,
        decisions: 0,
        others: 0,
      },
      no_contests: 0,
      fights: [],
    };

    fighter.name = $(".fighter-info h1 span.fn").text().trim();
    fighter.nickname = $(".fighter-info h1 span.nickname").text().replace(/['"]+/g, "").trim();
    fighter.image_url = $(".profile-image.photo").attr("src");

    const bioSection = $(".fighter-data .bio-holder");
    fighter.age = bioSection.find('tr:contains("AGE") td b').first().text().trim();
    fighter.birthday = bioSection.find('tr:contains("AGE") td span[itemprop="birthDate"]').text().trim();
    fighter.height = bioSection.find('tr:contains("HEIGHT") td b[itemprop="height"]').text().trim();
    fighter.weight = bioSection.find('tr:contains("WEIGHT") td b[itemprop="weight"]').text().trim();
    fighter.association = bioSection.find(".association-class span[itemprop='name']").text().trim();
    fighter.weight_class = bioSection.find(".association-class a[href*='weightclass']").text().trim();

    const winLossSection = $(".fighter-data .winsloses-holder");
    fighter.wins.total = parseInt(winLossSection.find(".wins .winloses.win span").eq(1).text().trim()) || 0;
    fighter.losses.total = parseInt(winLossSection.find(".loses .winloses.lose span").eq(1).text().trim()) || 0;
    fighter.no_contests = parseInt(winLossSection.find(".loses .winloses.nc span").eq(1).text().trim()) || 0;

    fighter.wins.knockouts = parseInt(winLossSection.find('.wins .meter-title:contains("KO")').next().find('.pl').text().trim()) || 0;
    fighter.wins.submissions = parseInt(winLossSection.find('.wins .meter-title:contains("SUBMISSIONS")').next().find('.pl').text().trim()) || 0;
    fighter.wins.decisions = parseInt(winLossSection.find('.wins .meter-title:contains("DECISIONS")').next().find('.pl').text().trim()) || 0;
    fighter.wins.others = parseInt(winLossSection.find('.wins .meter-title:contains("OTHERS")').next().find('.pl').text().trim()) || 0;

    fighter.losses.knockouts = parseInt(winLossSection.find('.loses .meter-title:contains("KO")').next().find('.pl').text().trim()) || 0;
    fighter.losses.submissions = parseInt(winLossSection.find('.loses .meter-title:contains("SUBMISSIONS")').next().find('.pl').text().trim()) || 0;
    fighter.losses.decisions = parseInt(winLossSection.find('.loses .meter-title:contains("DECISIONS")').next().find('.pl').text().trim()) || 0;
    fighter.losses.others = parseInt(winLossSection.find('.loses .meter-title:contains("OTHERS")').next().find('.pl').text().trim()) || 0;

    $('.module.fight_history tr:not(.table_head)').each(function () {
      var el = $(this);
      result = el.find("td:nth-child(1) .final_result").text();
      opponent_name = el.find("td:nth-child(2) a").text();
      opponent_url = el.find("td:nth-child(2) a").attr("href");
      event_name = el.find("td:nth-child(3) a").text();
      event_url = el.find("td:nth-child(3) a").attr("href");
      event_date = el.find("td:nth-child(3) .sub_line").text();
      method = el.find("td:nth-child(4)").text().split(/\)(.*)/)[0] + ")";
      referee = el.find("td:nth-child(4) .sub_line").text();
      round = el.find("td:nth-child(5)").text();
      time = el.find("td:nth-child(6)").text();

      var fight = {
        name: event_name,
        date: event_date,
        url: event_url,
        result: result,
        method: method,
        referee: referee,
        round: round,
        time: time,
        opponent: opponent_name,
      };

      if (result !== "") {
        fighter.fights.push(fight);
      }
    });

    callback(fighter);
  } catch (error) {
    console.error("Puppeteer error:", error.message);
    callback(null);
  }
};
