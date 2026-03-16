const fs = require("fs");
const path = require("path");

const registryFilePath = path.join(__dirname, "..", "data", "sites.json");

function ensureRegistryFile() {
  if (!fs.existsSync(registryFilePath)) {
    fs.writeFileSync(registryFilePath, "[]\n", "utf8");
  }
}

function normalizeSiteUrl(siteUrl) {
  if (typeof siteUrl !== "string" || !siteUrl.trim()) {
    const error = new Error("siteUrl is required");
    error.statusCode = 400;
    throw error;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(siteUrl.trim());
  } catch (error) {
    const invalidUrlError = new Error("siteUrl must be a valid URL");
    invalidUrlError.statusCode = 400;
    throw invalidUrlError;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    const protocolError = new Error("siteUrl must start with http:// or https://");
    protocolError.statusCode = 400;
    throw protocolError;
  }

  parsedUrl.hash = "";
  parsedUrl.search = "";

  const normalizedPath = parsedUrl.pathname.replace(/\/+$/, "");
  parsedUrl.pathname = normalizedPath || "/";

  return parsedUrl.toString().replace(/\/$/, "");
}

function loadSites() {
  ensureRegistryFile();
  const raw = fs.readFileSync(registryFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error("backend/data/sites.json contains invalid JSON");
  }
}

function saveSites(sites) {
  ensureRegistryFile();
  fs.writeFileSync(registryFilePath, `${JSON.stringify(sites, null, 2)}\n`, "utf8");
}

function listSites() {
  return loadSites();
}

function findSiteBySiteId(siteId) {
  return loadSites().find((site) => site.siteId === siteId) || null;
}

function findSiteByUrl(siteUrl) {
  const normalizedUrl = normalizeSiteUrl(siteUrl);
  return loadSites().find((site) => site.siteUrl === normalizedUrl) || null;
}

function generateNextSiteId(existingSites = loadSites()) {
  const maxId = existingSites.reduce((currentMax, site) => {
    const match = /^client-(\d+)$/.exec(site.siteId || "");
    if (!match) {
      return currentMax;
    }

    return Math.max(currentMax, Number(match[1]));
  }, 0);

  return `client-${String(maxId + 1).padStart(3, "0")}`;
}

function normalizeOptionalEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    return null;
  }

  const normalizedEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const error = new Error("supportEmail must be valid");
    error.statusCode = 400;
    throw error;
  }

  return normalizedEmail;
}

function normalizeRequiredEmail(email, fieldName) {
  const normalizedEmail = normalizeOptionalEmail(email);

  if (!normalizedEmail) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  return normalizedEmail;
}

function createSiteEntry({ siteUrl, siteName, supportEmail }) {
  if (typeof siteName !== "string" || !siteName.trim()) {
    const error = new Error("siteName is required");
    error.statusCode = 400;
    throw error;
  }

  const sites = loadSites();
  const normalizedUrl = normalizeSiteUrl(siteUrl);
  const existingSite = sites.find((site) => site.siteUrl === normalizedUrl);

  if (existingSite) {
    return {
      site: existingSite,
      created: false
    };
  }

  const site = {
    siteId: generateNextSiteId(sites),
    siteName: siteName.trim(),
    siteUrl: normalizedUrl,
    supportEmail: normalizeRequiredEmail(supportEmail, "supportEmail"),
    createdAt: new Date().toISOString()
  };

  sites.push(site);
  saveSites(sites);

  return {
    site,
    created: true
  };
}

module.exports = {
  createSiteEntry,
  findSiteBySiteId,
  findSiteByUrl,
  generateNextSiteId,
  listSites,
  loadSites,
  normalizeRequiredEmail,
  normalizeSiteUrl,
  normalizeOptionalEmail,
  saveSites
};
