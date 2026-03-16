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
HUMAN_FALLBACK_EMAIL=support@example.com
HUMAN_AGENT_AVAILABLE=false
HUMAN_AGENT_LABEL=Webaction support
AGENT_DASHBOARD_KEY=change_me
DEFAULT_SUPPORT_EMAIL=support@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smtp-user@example.com
SMTP_PASS=your_smtp_password
SMTP_FROM=support@example.com
```

`PUBLIC_BASE_URL` is optional. When set, it is used to generate:

- `widgetUrl`
- `apiUrl`
- `embedCode`

`HUMAN_FALLBACK_EMAIL` is optional. When set, the app can offer a human follow-up path when the AI does not find a reliable site-based answer.

`HUMAN_AGENT_AVAILABLE` controls whether the widget should present the fallback as "talk to a person now" or as a request form for later follow-up.

`DEFAULT_SUPPORT_EMAIL` is used if a client site does not have its own `supportEmail`.

`AGENT_DASHBOARD_KEY` protects the simple live-chat agent dashboard.

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
  -d '{"siteUrl":"https://example.com","siteName":"Example Client","supportEmail":"help@example.com"}'
```

The backend will:

1. normalize the URL
2. check if that site already exists
3. generate the next `siteId`
4. save the entry into `backend/data/sites.json`
5. automatically index the site
6. return the widget URL, API URL, and embed code

`supportEmail` is now required for each client registration.

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

If the AI cannot find a reliable answer from the site content, the response can include a human fallback suggestion.

The widget flow is:

1. AI answers instantly when it can
2. if no reliable answer is found, the widget offers human help
3. if `HUMAN_AGENT_AVAILABLE=true`, the visitor can request a person now
4. if no agent is available, the widget shows a request form

The agent dashboard is available at:

```text
/agent/live-chat.html
```

It lets an authorized agent:

- mark themselves online or offline
- see open conversations
- reply in the same chat flow
- close conversations

Create a human follow-up request directly:

```bash
curl -X POST http://localhost:3000/human-handoff \
  -H "Content-Type: application/json" \
  -d '{"siteId":"client-001","message":"I need help with pricing","email":"visitor@example.com"}'
```

When a human handoff request is submitted:

- the backend stores the request locally in JSON
- the backend sends an email to the client `supportEmail`
- if no client `supportEmail` is configured, it sends to `DEFAULT_SUPPORT_EMAIL`

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
- human handoff requests are stored locally in JSON
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
