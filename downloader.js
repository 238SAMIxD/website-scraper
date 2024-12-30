const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const URLParse = require('url-parse');

class ContentDownloader {
  constructor() {
    this.pdfDir = './pdf';
    this.contentDir = './content';
  }

  async init() {
    await fs.mkdir(this.pdfDir, { recursive: true });
    await fs.mkdir(this.contentDir, { recursive: true });
  }

  getFilename(url) {
    const parsed = new URLParse(url);
    const basename = path.basename(parsed.pathname) || 'index';
    return basename.replace(/[^a-z0-9.-]/gi, '_');
  }

  async downloadPdf(url) {
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer'
      });
      
      const filename = this.getFilename(url);
      const filepath = path.join(this.pdfDir, filename);
      await fs.writeFile(filepath, response.data);
      console.log(`Downloaded PDF: ${filename}`);
    } catch (error) {
      console.error(`Failed to download PDF ${url}:`, error.message);
    }
  }

  async saveContent(content, url) {
    try {
      const filename = `${this.getFilename(url)}.txt`;
      const filepath = path.join(this.contentDir, filename);
      await fs.writeFile(filepath, content);
      console.log(`Saved content: ${filename}`);
    } catch (error) {
      console.error(`Failed to save content for ${url}:`, error.message);
    }
  }

  async processResults() {
    try {
      const data = JSON.parse(await fs.readFile('scraping-results.json', 'utf8'));
      
      // Download PDFs
      for (const pdfUrl of data.pdfs) {
        await this.downloadPdf(pdfUrl);
      }

      // Save page contents
      for (const page of data.extractedContent) {
        await this.saveContent(page.content, page.url);
      }

      console.log('Download completed successfully');
    } catch (error) {
      console.error('Error processing results:', error.message);
    }
  }
}

if (require.main === module) {
  const downloader = new ContentDownloader();
  downloader.init()
    .then(() => downloader.processResults())
    .catch(console.error);
}

module.exports = ContentDownloader;