const axios = require("axios");
const cheerio = require("cheerio");
const URLParse = require("url-parse");
const fs = require("fs").promises;
const { extractPageContent, minify } = require("./utils/dom-utils");
const LinkCollector = require("./utils/link-collector");

const BATCH_SIZE = 10;
const LIMIT = 50;

class WebScraper {
  constructor(startUrl, options = {}) {
    this.startUrl = startUrl;
    this.baseUrl = new URLParse(startUrl).origin;
    this.domain = new URLParse(startUrl).hostname;
    this.visitedUrls = new Set();
    this.foundFiles = {
      pdfs: new Set(),
      texts: new Set(),
    };
    this.results = [];
    this.options = options;
    this.linkCollector = new LinkCollector(this.baseUrl, this.domain);
  }

  async collectInitialLinks() {
    console.log("Zbieranie początkowych odnośników...");
    const response = await axios.get(this.startUrl);
    const $ = cheerio.load(response.data);

    const { links, pdfs, texts } = this.linkCollector.collect($);
    pdfs.forEach((pdf) => this.foundFiles.pdfs.add(pdf));
    texts.forEach((text) => this.foundFiles.texts.add(text));

    return links;
  }

  async processUrl(url) {
    if (this.visitedUrls.has(url)) return;

    console.log(`Processing: ${url}`);
    this.visitedUrls.add(url);

    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Extract content
      const pageText = extractPageContent($, this.options.skipHeader);
      this.results.push({ url, content: minify(pageText) });

      // Collect new files
      const { pdfs, texts } = this.linkCollector.collect($);
      pdfs.forEach((pdf) => this.foundFiles.pdfs.add(pdf));
      texts.forEach((text) => this.foundFiles.texts.add(text));
    } catch (error) {
      console.error(`Błąd przy przetwarzaniu ${url}:`, error.message);
    }
  }

  async processBatch(urls) {
    await Promise.all(urls.map((url) => this.processUrl(url)));
  }

  async saveResults() {
    const output = {
      pdfs: Array.from(this.foundFiles.pdfs),
      texts: Array.from(this.foundFiles.texts),
      visitedPages: Array.from(this.visitedUrls),
      extractedContent: this.results,
    };

    await fs.writeFile(
      "scraping-results.json",
      JSON.stringify(output, null, 2)
    );
    console.log("Wyniki zapisane");
  }

  async scrape() {
    try {
      // First collect all links from the initial page
      const initialLinks = await this.collectInitialLinks();

      // Process the initial page
      await this.processUrl(this.startUrl);

      // Process remaining links in batches
      for (
        let i = 0;
        i < initialLinks.length && this.visitedUrls.size < LIMIT;
        i += BATCH_SIZE
      ) {
        const batch = initialLinks.slice(i, i + BATCH_SIZE);
        await this.processBatch(batch);
        await this.saveResults();
      }

      console.log("Spcrapowanie zakończone");
    } catch (error) {
      console.error("Błąd przy scrapowaniu:", error.message);
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const startUrl = args[0];
  const options = {
    skipHeader: args.includes("--skip-header"),
  };

  if (!startUrl) {
    console.error("Podaj początkowy adres URL");
    process.exit(1);
  }

  const scraper = new WebScraper(startUrl, options);
  scraper.scrape().catch(console.error);
}

module.exports = WebScraper;
