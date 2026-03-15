# Webaction AI Chat

First RAG MVP for an embeddable AI chat widget that Webaction can install on client websites.

## Project Structure

- `backend/` Express API, site registry, crawler, extraction, chunking, retrieval, cache
- `widget/` embeddable vanilla JavaScript chat widget
- `docs/` architecture and flow notes

## What This Version Does

- keeps the existing widget -> backend -> OpenAI architecture
- supports multiple client sites through `siteId`
- maps `siteId` to a real site URL
- crawls a small set of site pages
- extracts readable text from HTML
- chunks content for prompt injection
- caches the indexed result in memory
- retrieves the most relevant chunks for each visitor question
- asks OpenAI to answer from site content only

This is a first RAG MVP. It does not use a database, embeddings, pgvector, or Supabase yet.

## Site Registry

Client sites are configured in [backend/data/sites.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/data/sites.js).

Example:

```js
module.exports = {
  "client-001": {
    url: "https://example.com",
    name: "Example Client"
  }
};
```

Update this file so each `siteId` points to the correct client website.

## Install

From `backend/`:

```bash
npm install
```

Then create `backend/.env` and set:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

## Run

From `backend/`:

```bash
npm start
```

Default API URL:

```text
http://localhost:3000
```

## Index A Site

Index a configured site into the in-memory cache:

```bash
curl -X POST http://localhost:3000/index-site \
  -H "Content-Type: application/json" \
  -d '{"siteId":"client-001"}'
```

Check cache status:

```bash
curl http://localhost:3000/site-index/client-001
```

List configured sites:

```bash
curl http://localhost:3000/sites
```

## Test Chat

Ask a site-specific question:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What services do you offer?","siteId":"client-001"}'
```

The backend will:

1. find the configured site URL for `siteId`
2. use a cached index or crawl the site on demand
3. extract text and split it into chunks
4. retrieve the most relevant chunks
5. build a grounded prompt for `gpt-4o-mini`
6. return the AI reply

## Embed The Widget

Host `widget/chat-widget.js` on a public URL, then embed it on a client website:

```html
<script src="https://your-domain.example/chat-widget.js"></script>
<script>
  WebactionChat.init({
    apiUrl: "http://localhost:3000",
    siteId: "client-001",
    title: "Assistant"
  });
</script>
```

## Current RAG Limits

- in-memory cache only, so indexes reset when the backend restarts
- simple keyword retrieval, not embeddings
- limited crawl depth and page count
- HTML extraction is heuristic and intentionally lightweight

## Next Production Upgrades

- embeddings + vector search
- pgvector or Supabase storage
- scheduled or webhook-based reindexing
- better HTML parsing and content cleanup
- per-site prompt configuration
- conversation storage and analytics
