const cheerio = require("cheerio");

function removeHeader($) {
  $("header").remove();
  return $;
}

function extractPageContent($, skipHeader) {
  if (skipHeader) {
    $ = removeHeader($);
  }
  return $("body").text().trim();
}

function minify(s) {
  return s
    ? s
        .replace(/\>[\r\n ]+\</g, "><") // Removes new lines and irrelevant spaces which might affect layout, and are better gone
        .replace(/(<.*?>)|\s+/g, (m, $1) => ($1 ? $1 : " "))
        .trim()
    : "";
}

module.exports = {
  removeHeader,
  extractPageContent,
  minify,
};
