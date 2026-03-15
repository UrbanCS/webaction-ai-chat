const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_CHUNK_OVERLAP = 150;

function splitIntoUnits(text) {
  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function chunkText(text, url, options = {}) {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;
  const units = splitIntoUnits(text);
  const chunks = [];
  let currentChunk = "";

  for (const unit of units) {
    const nextChunk = currentChunk ? `${currentChunk}\n${unit}` : unit;

    if (nextChunk.length <= chunkSize) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    if (unit.length <= chunkSize) {
      currentChunk = unit;
      continue;
    }

    let start = 0;
    while (start < unit.length) {
      const end = Math.min(start + chunkSize, unit.length);
      chunks.push(unit.slice(start, end).trim());
      if (end >= unit.length) {
        break;
      }

      start = Math.max(end - chunkOverlap, start + 1);
    }

    currentChunk = "";
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks
    .map((chunk, index) => ({
      url,
      chunkId: `${url}#chunk-${index + 1}`,
      text: chunk
    }))
    .filter((chunk) => chunk.text.length >= 80);
}

function chunkPages(pages, options = {}) {
  return pages.flatMap((page) => chunkText(page.text, page.url, options));
}

module.exports = {
  chunkPages
};
