const cheerio = require('cheerio');
const path = require('path');
const { isValidUrl, isSameDomain, normalizeUrl } = require('./url-utils');

class LinkCollector {
  constructor(baseUrl, domain) {
    this.baseUrl = baseUrl;
    this.domain = domain;
    this.links = new Set();
    this.pdfs = new Set();
    this.texts = new Set();
  }

  collect($) {
    $('a').each((_, element) => {
      let href = $(element).attr('href');
      if (!href) return;

      href = normalizeUrl(href, this.baseUrl);
      if (!isValidUrl(href)) return;

      const ext = path.extname(href).toLowerCase();
      if (ext === '.pdf') {
        this.pdfs.add(href);
      } else if (ext === '.txt') {
        this.texts.add(href);
      } else if (isSameDomain(href, this.domain)) {
        this.links.add(href);
      }
    });

    return {
      links: Array.from(this.links),
      pdfs: Array.from(this.pdfs),
      texts: Array.from(this.texts)
    };
  }
}

module.exports = LinkCollector;