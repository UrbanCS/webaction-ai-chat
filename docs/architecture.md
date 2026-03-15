# Webaction AI Chat Architecture

## Goal

Deliver an embeddable AI chat system that Webaction can place on client websites, especially Joomla sites first, while keeping the backend architecture simple enough to upgrade later.

This version is a first practical RAG MVP:

- no external chatbot SaaS
- no database yet
- no Supabase yet
- no embeddings yet
- no vector database yet

## Architecture

```text
Client website
    |
    v
chat-widget.js
    |
    v
Webaction backend API
    |
    v
siteId -> site URL
    |
    v
crawl + extract + chunk + cache
    |
    v
retrieve relevant chunks
    |
    v
OpenAI API
    |
    v
response returned to user
```

## Main Flow

1. A client website embeds `chat-widget.js`.
2. The widget sends `message` and `siteId` to `POST /chat`.
3. The backend maps `siteId` to a configured site URL.
4. The retrieval layer loads a cached site index or crawls the site if needed.
5. The crawler fetches the homepage and tries `sitemap.xml`.
6. The extraction layer removes noisy HTML and returns readable text.
7. The chunking layer splits page text into prompt-sized chunks.
8. The retrieval layer scores chunks against the visitor question.
9. The backend sends the best chunks to OpenAI with grounding instructions.
10. The backend returns the final answer to the widget.

## Site Registry

The site registry lives in [backend/data/sites.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/data/sites.js).

It maps:

- `siteId`
- site name
- site URL

Example:

```js
module.exports = {
  "client-001": {
    url: "https://example.com",
    name: "Example Client"
  }
};
```

This is the first multi-site control point. Later it can store richer per-client settings.

## Crawling Flow

The crawler lives in [backend/services/siteCrawler.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/services/siteCrawler.js).

For the MVP it:

- fetches the homepage
- tries `sitemap.xml` and `sitemap_index.xml`
- reads a limited number of URLs from the sitemap when available
- falls back to internal homepage links when no sitemap is usable
- keeps crawling on the same domain only
- ignores obvious non-content or non-HTML targets
- keeps the crawl small for speed and safety

This is intentionally conservative because the goal is a practical first implementation, not a full crawler.

## Extraction Flow

The extraction layer lives in [backend/services/contentExtraction.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/services/contentExtraction.js).

It:

- removes scripts, styles, nav, footer, forms, and similar noise
- strips remaining tags
- decodes basic HTML entities
- normalizes whitespace
- returns plain readable text

## Chunking Flow

The chunking layer lives in [backend/services/chunking.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/services/chunking.js).

It:

- processes extracted page text
- splits text into moderate chunks
- preserves the source URL
- returns chunk objects ready for retrieval and prompt injection

## Retrieval Flow

The retrieval layer lives in [backend/services/retrievalService.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/services/retrievalService.js).

It:

- indexes a site on demand if not already cached
- stores pages and chunks in memory by `siteId`
- scores chunks using a simple keyword overlap method
- returns the top matching chunks and their source URLs

This is the replaceable part of the MVP. Later it can be swapped for embeddings and vector search without changing the widget contract.

## In-Memory Cache Behavior

The cache is process-local and development-friendly:

- keyed by `siteId`
- stores extracted pages and chunks
- avoids recrawling the same site for every request
- is cleared whenever the backend restarts

No persistence is implemented yet.

## OpenAI Prompt Flow

`POST /chat` now builds a prompt with:

- grounding instructions
- site identity from the registry
- top retrieved chunks
- source URLs
- the user question

The assistant is instructed to:

- answer from the provided site content
- answer in the same language as the user when possible
- stay concise
- avoid inventing missing facts
- clearly say when the information was not found on the site

## API Routes

Core routes:

- `GET /health`
- `POST /chat`

RAG development routes:

- `GET /sites`
- `POST /index-site`
- `GET /site-index/:siteId`

### `POST /index-site`

Request:

```json
{
  "siteId": "client-001"
}
```

Response includes summary fields such as:

- indexed site
- page count
- chunk count
- indexed timestamp

### `GET /site-index/:siteId`

Returns:

- whether the `siteId` is configured
- whether it is currently indexed
- page count
- chunk count
- timestamp

## Widget Behavior

The widget remains mostly unchanged.

It still:

- takes `apiUrl`
- takes `siteId`
- opens a floating chat panel
- sends messages to `POST /chat`

It now surfaces backend error messages more clearly, which helps when:

- `siteId` is invalid
- the site has not been indexed successfully
- crawling/extraction found no usable content

## Joomla Embedding

Basic Joomla installation path for this MVP:

1. host `chat-widget.js` on a Webaction-controlled URL
2. place the script tags in the Joomla template or a custom HTML/module area
3. use the correct `siteId` for that client
4. point `apiUrl` to the Webaction backend

Example:

```html
<script src="https://your-domain.example/chat-widget.js"></script>
<script>
  WebactionChat.init({
    apiUrl: "https://chat-api.your-domain.example",
    siteId: "client-001",
    title: "Assistant"
  });
</script>
```

## Local Development

Install dependencies:

```bash
cd backend
npm install
```

Run the backend:

```bash
cd backend
npm start
```

Index a site:

```bash
curl -X POST http://localhost:3000/index-site \
  -H "Content-Type: application/json" \
  -d '{"siteId":"client-001"}'
```

Ask a site-specific question:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What services do you offer?","siteId":"client-001"}'
```

## Future Production Improvements

Likely next steps after this MVP:

- embeddings-based retrieval
- pgvector or Supabase-backed storage
- persistent crawl/index jobs
- better sitemap handling
- richer extraction for Joomla and WordPress layouts
- source citations in the widget UI
- conversation persistence and analytics
