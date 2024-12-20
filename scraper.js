const axios = require('axios');
const cheerio = require('cheerio');
const URLParse = require('url-parse');
const path = require('path');
const fs = require('fs').promises;

const LIMIT = 100;

class WebScraper {
  constructor(startUrl) {
    this.startUrl = startUrl;
    this.baseUrl = new URLParse(startUrl).origin;
    this.domain = new URLParse(startUrl).hostname;
    this.visitedUrls = new Set();
    this.foundFiles = {
      pdfs: new Set(),
      texts: new Set()
    };
    this.results = [];
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isSameDomain(url) {
    try {
      const urlObj = new URLParse(url);
      return urlObj.hostname === this.domain;
    } catch {
      return false;
    }
  }

  async saveResults() {
    const output = {
      pdfs: Array.from(this.foundFiles.pdfs),
      texts: Array.from(this.foundFiles.texts),
      visitedPages: Array.from(this.visitedUrls),
      extractedContent: this.results
    };

    await fs.writeFile('scraping-results.json', JSON.stringify(output, null, 2));
  }

  async scrape(url = this.startUrl) {
    if (this.visitedUrls.has(url) || this.visitedUrls.size >= LIMIT) {
      return;
    }

    console.log(`Scraping: ${url}`);
    this.visitedUrls.add(url);
    

    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Extract text content
      const pageText = $('body').text().trim();
      this.results.push({
        url,
        content: pageText
      });

      // Find all links
      const links = new Set();
      $('a').each((_, element) => {
        let href = $(element).attr('href');
        if (!href) return;

        // Handle relative URLs
        if (href.startsWith('/')) {
          href = `${this.baseUrl}${href}`;
        }

        if (!this.isValidUrl(href)) return;
        
        const ext = path.extname(href).toLowerCase();
        
        // Collect PDF and text files
        if (ext === '.pdf') {
          this.foundFiles.pdfs.add(href);
        } else if (ext === '.txt') {
          this.foundFiles.texts.add(href);
        } else if (this.isSameDomain(href)) {
          links.add(href);
        }
      });

      // Recursively scrape found links
      for (const link of links) {
        if(this.visitedUrls.size >= LIMIT) {
          return;
        }
        if (!this.visitedUrls.has(link)) {
          await this.scrape(link);
        }
      }

      await this.saveResults();
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
    }
  }
}

// Example usage
if (require.main === module) {
  const startUrl = process.argv[2];
  if (!startUrl) {
    console.error('Please provide a starting URL');
    process.exit(1);
  }

  const scraper = new WebScraper(startUrl);
  scraper.scrape()
    .then(() => console.log('Scraping completed'))
    .catch(console.error);
}

module.exports = WebScraper;