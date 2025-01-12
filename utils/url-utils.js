const URLParse = require('url-parse');

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isSameDomain(url, domain) {
  try {
    const urlObj = new URLParse(url);
    return urlObj.hostname === domain;
  } catch {
    return false;
  }
}

function normalizeUrl(url, baseUrl) {
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  return url;
}

module.exports = {
  isValidUrl,
  isSameDomain,
  normalizeUrl
};