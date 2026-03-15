# Webaction AI Chat

First RAG MVP for an embeddable AI chat widget that Webaction can install on client websites.

## Project Structure

- `backend/` Express API, JSON site registry, crawler, extraction, chunking, retrieval, cache
- `widget/` embeddable vanilla JavaScript chat widget
- `docs/` architecture and flow notes

## What This Version Does

- serves the widget from the backend at `/widget/chat-widget.js`
- lets Webaction register new client sites without editing code
- stores client sites in `backend/data/sites.json`
- automatically indexes a newly registered site
- supports RAG-backed answers using crawled site content

This is still a simple MVP. It does not use a database, authentication, embeddings, or Supabase yet.

## Install

From `backend/`:

```bash
npm install
```

Then create `backend/.env` and set:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
```

`PUBLIC_BASE_URL` is optional. When set, it is used to generate:

- `widgetUrl`
- `apiUrl`
- `embedCode`

## Run

From `backend/`:

```bash
npm start
```

Default local API and widget URLs:

```text
http://localhost:3000
http://localhost:3000/widget/chat-widget.js
```

## Site Registry

Client sites are stored in [backend/data/sites.json](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/data/sites.json).

Each record looks like:

```json
[
  {
    "siteId": "client-001",
    "siteName": "Webaction",
    "siteUrl": "https://webaction.ca",
    "createdAt": "2026-03-15T00:00:00.000Z"
  }
]
```

The registry service lives in [backend/services/siteRegistryService.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/services/siteRegistryService.js).

## Register A New Site

Register a new client website:

```bash
curl -X POST http://localhost:3000/register-site \
  -H "Content-Type: application/json" \
  -d '{"siteUrl":"https://example.com","siteName":"Example Client"}'
```

The backend will:

1. normalize the URL
2. check if that site already exists
3. generate the next `siteId`
4. save the entry into `backend/data/sites.json`
5. automatically index the site
6. return the widget URL, API URL, and embed code

## List Sites

Return all registered sites:

```bash
curl http://localhost:3000/sites
```

Return one site:

```bash
curl http://localhost:3000/sites/client-001
```

## Index A Site

Re-index a registered site:

```bash
curl -X POST http://localhost:3000/index-site \
  -H "Content-Type: application/json" \
  -d '{"siteId":"client-001"}'
```

Check index status:

```bash
curl http://localhost:3000/site-index/client-001
```

## Test Chat

Ask a site-specific question:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What services do you offer?","siteId":"client-001"}'
```

## Get Embed Code

`POST /register-site` returns an `embedCode` field. Example:

```html
<script src="http://localhost:3000/widget/chat-widget.js"></script>
<script>
WebactionChat.init({
  apiUrl: "http://localhost:3000",
  siteId: "client-001",
  title: "Assistant"
});
</script>
```

If `PUBLIC_BASE_URL=https://ai.webaction.ca`, the generated embed code will use that public base URL instead.

## Joomla Installation

Use the generated embed code from `POST /register-site`, or this pattern:

```html
<script src="https://YOUR_BACKEND_DOMAIN/widget/chat-widget.js"></script>
<script>
WebactionChat.init({
  apiUrl: "https://YOUR_BACKEND_DOMAIN",
  siteId: "client-001",
  title: "Assistant"
});
</script>
```

Place the script in the Joomla template or a custom HTML/module area.

## Current MVP Limits

- site storage is JSON-file based
- cache is in-memory only and resets on restart
- no auth or admin dashboard
- retrieval uses simple keyword overlap, not embeddings
- crawling and extraction are intentionally lightweight

## Next Production Upgrades

- authentication and admin UI
- persistent database-backed site registry
- embeddings + vector search
- pgvector or Supabase storage
- scheduled reindexing
- better content extraction for Joomla and WordPress layouts
