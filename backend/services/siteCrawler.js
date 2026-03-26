const { URL } = require("url");

const DEFAULT_MAX_PAGES = 20;
const REQUEST_TIMEOUT_MS = 10000;
const SITEMAP_CANDIDATES = ["/sitemap.xml", "/sitemap_index.xml"];
const BLOCKED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".pdf",
  ".zip",
  ".xml",
  ".mp4",
  ".mp3"
];
const BLOCKED_PATH_PATTERNS = [
  "/wp-admin",
  "/wp-login",
  "/cart",
  "/checkout",
  "/account",
  "/login",
  "/search",
  "/feed",
  "/tag/",
  "/category/"
];

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "WebactionAIChatBot/1.0 (+https://webaction.ca)"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("xml")) {
      return null;
    }

    return response.text();
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrl(rawUrl, baseUrl) {
  try {
    const resolvedUrl = new URL(rawUrl, baseUrl);
    resolvedUrl.hash = "";
    const normalized = resolvedUrl.toString().replace(/\/$/, "");

    return normalized;
  } catch (error) {
    return null;
  }
}

function isAllowedUrl(rawUrl, siteOrigin) {
  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.origin !== siteOrigin) {
      return false;
    }

    const pathname = parsedUrl.pathname.toLowerCase();
    if (BLOCKED_EXTENSIONS.some((extension) => pathname.endsWith(extension))) {
      return false;
    }

    if (BLOCKED_PATH_PATTERNS.some((pattern) => pathname.includes(pattern))) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

function extractInternalLinks(html, pageUrl, siteOrigin) {
  const links = new Set();
  const matches = html.match(/href\s*=\s*["']([^"'#]+)["']/gi) || [];

  for (const match of matches) {
    const hrefMatch = match.match(/href\s*=\s*["']([^"']+)["']/i);
    const href = hrefMatch?.[1];
    const normalized = href ? normalizeUrl(href, pageUrl) : null;

    if (normalized && isAllowedUrl(normalized, siteOrigin)) {
      links.add(normalized);
    }
  }

  return Array.from(links);
}

function parseSitemapUrls(xml, siteOrigin, maxPages) {
  const locMatches = xml.match(/<loc>([\s\S]*?)<\/loc>/gi) || [];
  const urls = [];

  for (const match of locMatches) {
    const loc = match.replace(/<\/?loc>/gi, "").trim();
    if (!loc) {
      continue;
    }

    const normalized = normalizeUrl(loc, siteOrigin);
    if (normalized && isAllowedUrl(normalized, siteOrigin)) {
      urls.push(normalized);
    }

    if (urls.length >= maxPages) {
      break;
    }
  }

  return urls;
}

async function discoverUrls(siteUrl, maxPages) {
  const homepageHtml = await fetchText(siteUrl);
  if (!homepageHtml) {
    return {
      homepageHtml: null,
      urls: []
    };
  }

  const siteOrigin = new URL(siteUrl).origin;

  for (const sitemapPath of SITEMAP_CANDIDATES) {
    const sitemapUrl = `${siteOrigin}${sitemapPath}`;
    const sitemapXml = await fetchText(sitemapUrl);

    if (!sitemapXml) {
      continue;
    }

    const sitemapUrls = parseSitemapUrls(sitemapXml, siteOrigin, maxPages);
    if (sitemapUrls.length > 0) {
      return {
        homepageHtml,
        urls: [normalizeUrl(siteUrl, siteUrl), ...sitemapUrls].filter(Boolean)
      };
    }
  }

  const homepageLinks = extractInternalLinks(homepageHtml, siteUrl, siteOrigin);

  return {
    homepageHtml,
    urls: [normalizeUrl(siteUrl, siteUrl), ...homepageLinks].filter(Boolean).slice(0, maxPages)
  };
}

async function crawlSite(siteUrl, options = {}) {
  const maxPages = options.maxPages || DEFAULT_MAX_PAGES;
  const { homepageHtml, urls } = await discoverUrls(siteUrl, maxPages);
  const normalizedSiteUrl = normalizeUrl(siteUrl, siteUrl);
  const siteOrigin = new URL(siteUrl).origin;
  const queue = Array.from(new Set(urls)).slice(0, maxPages);
  const visited = new Set();
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();

    if (!url || visited.has(url)) {
      continue;
    }

    visited.add(url);

    const html = url === normalizedSiteUrl && homepageHtml
      ? homepageHtml
      : await fetchText(url);

    if (!html) {
      continue;
    }

    pages.push({ url, html });

    const internalLinks = extractInternalLinks(html, url, siteOrigin);
    for (const link of internalLinks) {
      if (!visited.has(link) && !queue.includes(link) && queue.length + pages.length < maxPages * 3) {
        queue.push(link);
      }
    }
  }

  return {
    pages,
    discoveredUrls: Array.from(visited)
  };
}

module.exports = {
  crawlSite
};
