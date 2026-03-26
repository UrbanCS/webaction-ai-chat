const { crawlSite } = require("./siteCrawler");
const { extractTextFromHtml } = require("./contentExtraction");
const { chunkPages } = require("./chunking");
const { findSiteBySiteId } = require("./siteRegistryService");

const siteIndexCache = new Map();
const DEFAULT_TOP_CHUNKS = 6;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "ce",
  "ces",
  "cette",
  "comment",
  "de",
  "des",
  "du",
  "en",
  "est",
  "et",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "la",
  "le",
  "les",
  "mais",
  "ou",
  "of",
  "on",
  "or",
  "pour",
  "que",
  "quel",
  "quelle",
  "quelles",
  "quels",
  "qui",
  "sur",
  "that",
  "the",
  "to",
  "un",
  "une",
  "vos",
  "votre",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your"
]);

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(text) {
  return (normalizeText(text).match(/[a-z0-9]{2,}/g) || []).filter((token) => !STOP_WORDS.has(token));
}

function scoreChunk(chunkText, queryText) {
  const chunkTokens = new Set(tokenize(chunkText));
  const queryTokens = tokenize(queryText);

  if (queryTokens.length === 0) {
    return 0;
  }

  let score = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) {
      score += 2;
    }
  }

  const normalizedChunk = normalizeText(chunkText);
  const normalizedQuery = normalizeText(queryText);
  if (normalizedChunk.includes(normalizedQuery)) {
    score += 4;
  }

  return score;
}

function buildSiteIndex(siteId, siteConfig, crawlResult) {
  const pages = crawlResult.pages
    .map((page) => ({
      url: page.url,
      text: extractTextFromHtml(page.html)
    }))
    .filter((page) => page.text.length >= 120);

  const chunks = chunkPages(pages);
  const index = {
    siteId,
    siteName: siteConfig.siteName,
    siteUrl: siteConfig.siteUrl,
    pages,
    chunks,
    indexedAt: new Date().toISOString()
  };

  siteIndexCache.set(siteId, index);

  return index;
}

async function indexSite(siteId, options = {}) {
  const siteConfig = findSiteBySiteId(siteId);
  if (!siteConfig) {
    const error = new Error(`Unknown siteId: ${siteId}`);
    error.statusCode = 404;
    throw error;
  }

  const crawlResult = await crawlSite(siteConfig.siteUrl, options);
  const index = buildSiteIndex(siteId, siteConfig, crawlResult);

  return {
    siteId,
    siteName: index.siteName,
    siteUrl: index.siteUrl,
    indexedAt: index.indexedAt,
    pageCount: index.pages.length,
    chunkCount: index.chunks.length
  };
}

function getSiteIndexStatus(siteId) {
  const siteConfig = findSiteBySiteId(siteId);
  const cachedIndex = siteIndexCache.get(siteId);

  return {
    siteId,
    configured: Boolean(siteConfig),
    siteName: siteConfig?.siteName || null,
    siteUrl: siteConfig?.siteUrl || null,
    indexed: Boolean(cachedIndex),
    indexedAt: cachedIndex?.indexedAt || null,
    pageCount: cachedIndex?.pages.length || 0,
    chunkCount: cachedIndex?.chunks.length || 0
  };
}

async function retrieveRelevantChunks(siteId, message, options = {}) {
  let cachedIndex = siteIndexCache.get(siteId);

  if (!cachedIndex) {
    await indexSite(siteId, options);
    cachedIndex = siteIndexCache.get(siteId);
  }

  if (!cachedIndex || cachedIndex.chunks.length === 0) {
    return {
      site: getSiteIndexStatus(siteId),
      chunks: []
    };
  }

  const rankedChunks = cachedIndex.chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk.text, message)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, options.topChunks || DEFAULT_TOP_CHUNKS);

  const fallbackChunks = rankedChunks.length > 0
    ? rankedChunks
    : cachedIndex.chunks.slice(0, options.topChunks || DEFAULT_TOP_CHUNKS).map((chunk) => ({
        ...chunk,
        score: 0
      }));

  return {
    site: getSiteIndexStatus(siteId),
    chunks: fallbackChunks
  };
}

module.exports = {
  getSiteIndexStatus,
  indexSite,
  retrieveRelevantChunks
};
