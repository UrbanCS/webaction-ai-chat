function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]).trim() : "";
}

function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);
  return match ? decodeHtmlEntities(match[1]).trim() : "";
}

function removeNoise(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ");
}

function exposeContactLinks(html) {
  return html
    .replace(/<a[^>]*href=["']mailto:([^"'?#]+)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, " Courriel: $1 ")
    .replace(/<a[^>]*href=["']tel:([^"'?#]+)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, " Téléphone: $1 ");
}

function exposeImageAltText(html) {
  return html.replace(/<img[^>]+alt=["']([^"']+)["'][^>]*>/gi, " $1 ");
}

function extractTextFromHtml(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  const title = extractTitle(html);
  const metaDescription = extractMetaDescription(html);
  const cleanedHtml = exposeImageAltText(exposeContactLinks(removeNoise(html)))
    .replace(/<\/(p|div|section|article|main|li|h1|h2|h3|h4|h5|h6|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const bodyText = decodeHtmlEntities(cleanedHtml)
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();

  return [title ? `Titre: ${title}` : "", metaDescription ? `Description: ${metaDescription}` : "", bodyText]
    .filter(Boolean)
    .join("\n")
    .trim();
}

module.exports = {
  extractTextFromHtml
};
