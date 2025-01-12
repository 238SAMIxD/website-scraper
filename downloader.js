const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const URLParse = require("url-parse");
const html_to_pdf = require("html-pdf-node");

class ContentDownloader {
  constructor() {
    this.pdfDir = "./pdf";
    this.txtDir = "./txt";
    this.contentDir = "./content";
  }

  async init() {
    await fs.mkdir(this.pdfDir, { recursive: true });
    await fs.mkdir(this.txtDir, { recursive: true });
    await fs.mkdir(this.contentDir, { recursive: true });
  }

  getFilename(url) {
    const parsed = new URLParse(url);
    const basename = path.basename(parsed.pathname) || "index";
    return basename.replace(/[^a-z0-9.-]/gi, "_");
  }

  async downloadFile(url, type = "pdf") {
    try {
      const response = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer",
      });

      const filename = this.getFilename(url);
      const filepath = path.join(
        type === "pdf" ? this.pdfDir : this.txtDir,
        filename
      );
      await fs.writeFile(filepath, response.data);
      console.log(`Downloaded: ${filename}`);
    } catch (error) {
      console.error(`Failed to download ${url}:`, error.message);
    }
  }

  async saveContent(content, url) {
    try {
      const filename = `${this.getFilename(url)}.pdf`;
      const filepath = path.join(this.contentDir, filename);
      await html_to_pdf.generatePdf(
        { url },
        { format: "A4", landscape: true },
        async (err, buffer) => {
          if (err) {
            throw new Error(err);
          }
          await fs.writeFile(filepath, buffer);
          console.log(`Saved content: ${filename}`);
        }
      );
    } catch (error) {
      console.error(`Failed to save content for ${url}:`, error.message);
    }
  }

  async processResults() {
    try {
      const data = JSON.parse(
        await fs.readFile("scraping-results.json", "utf8")
      );

      // Download PDFs
      for (const pdfUrl of data.pdfs) {
        await this.downloadFile(pdfUrl);
      }

      // Download txts
      for (const txtUrl of data.texts) {
        await this.downloadFile(txtUrl, "txt");
      }

      // Save page contents
      for (const page of data.extractedContent) {
        await this.saveContent(page.content, page.url);
      }

      console.log("Download completed successfully");
    } catch (error) {
      console.error("Error processing results:", error.message);
    }
  }
}

if (require.main === module) {
  const downloader = new ContentDownloader();
  downloader
    .init()
    .then(() => downloader.processResults())
    .catch(console.error);
}

module.exports = ContentDownloader;
