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

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractContactFactsFromText(text) {
  const bodyText = String(text || "");
  const emails = uniqueValues(bodyText.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>.,;:!?]+/g) || []);
  const phoneMatches = bodyText.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) || [];
  const phones = uniqueValues(
    phoneMatches
      .map((phone) => phone.replace(/\s+/g, " ").trim())
      .filter((phone) => {
        const digits = phone.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      })
  );

  return {
    emails,
    phones
  };
}

function extractContactFactsFromPages(pages) {
  const facts = pages.reduce(
    (currentFacts, page) => {
      const pageFacts = extractContactFactsFromText(page.text);
      currentFacts.emails.push(...pageFacts.emails);
      currentFacts.phones.push(...pageFacts.phones);
      return currentFacts;
    },
    {
      emails: [],
      phones: []
    }
  );

  return {
    emails: uniqueValues(facts.emails),
    phones: uniqueValues(facts.phones)
  };
}

function scoreChunk(chunkText, queryText) {
  const chunkTokens = new Set(tokenize(chunkText));
  const queryTokens = tokenize(expandQueryText(queryText));

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

function expandQueryText(queryText) {
  const normalizedQuery = normalizeText(queryText);
  const expansions = [];

  if (/\b(tel|telephone|phone|numero|appeler|appel)\b/.test(normalizedQuery)) {
    expansions.push("telephone téléphone tel phone numero numéro appeler appel");
  }

  if (/\b(courriel|email|e-mail|mail|contacter|contact|joindre|rejoindre)\b/.test(normalizedQuery)) {
    expansions.push("courriel email mail contact contacter joindre rejoindre telephone téléphone adresse");
  }

  if (/\b(adresse|bureau|office|location|situe|situé)\b/.test(normalizedQuery)) {
    expansions.push("adresse bureau principal head office location situé situe");
  }

  return [queryText, ...expansions].join(" ");
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
    contactFacts: extractContactFactsFromPages(pages),
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
    chunkCount: index.chunks.length,
    contactFacts: index.contactFacts
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
    chunkCount: cachedIndex?.chunks.length || 0,
    contactFacts: cachedIndex?.contactFacts || {
      emails: [],
      phones: []
    }
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
      chunks: [],
      contactFacts: {
        emails: [],
        phones: []
      }
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
    chunks: fallbackChunks,
    contactFacts: cachedIndex.contactFacts || {
      emails: [],
      phones: []
    }
  };
}

module.exports = {
  getSiteIndexStatus,
  indexSite,
  retrieveRelevantChunks
};
