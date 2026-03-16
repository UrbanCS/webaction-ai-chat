# Webaction AI Chat Architecture

## Goal

Deliver an embeddable AI chat system that Webaction can onboard onto client websites, especially Joomla first and WordPress later, without editing backend code for every new client.

This version adds automatic onboarding with a JSON-backed site registry.

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
sites.json registry
    |
    v
crawl + extract + chunk + cache
    |
    v
retrieve relevant chunks
    |
    v
OpenAI API
```

## Site Registry

The registry is stored in [backend/data/sites.json](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/data/sites.json).

The service layer lives in [backend/services/siteRegistryService.js](/mnt/c/Users/marca/OneDrive/Desktop/webaction-ai-chat/backend/services/siteRegistryService.js).

It is responsible for:

- loading sites from JSON
- saving sites to JSON
- finding a site by `siteId`
- finding a site by URL
- generating the next `client-XXX` id
- creating a new site entry

## Onboarding Flow

1. Webaction calls `POST /register-site`.
2. The backend validates `siteUrl` and `siteName`.
3. The URL is normalized.
4. The registry checks whether the site already exists.
5. A new `siteId` is created if needed.
6. The site is saved into `sites.json`.
7. The backend immediately indexes the site.
8. The response returns `siteId`, `widgetUrl`, `apiUrl`, and `embedCode`.

Each site can also store a `supportEmail` so human fallback requests go to the right client inbox.

## API Routes

- `POST /register-site`
- `GET /sites`
- `GET /sites/:siteId`
- `POST /index-site`
- `GET /site-index/:siteId`
- `POST /human-handoff`
- `POST /chat`
- `GET /health`

## Public Widget Serving

The backend serves the widget from:

```text
/widget/chat-widget.js
```

This allows Joomla or WordPress sites to embed it directly from the backend domain.

## RAG Flow

After a site is registered:

1. indexing fetches the site
2. HTML is cleaned into text
3. text is chunked
4. chunks are cached in memory
5. `/chat` retrieves relevant chunks
6. OpenAI answers from that retrieved context

## Human Fallback Flow

When the backend determines that the answer was not reliably found on the website, it can suggest a human fallback.

For this MVP:

- `/chat` can return `handoffSuggested`
- the widget can offer talking to a person or a request form
- `GET /human-support-status` exposes whether an agent is marked available
- `POST /human-handoff` stores the follow-up request in a local JSON file
- `POST /human-handoff` also sends an email to the configured support inbox for that site

This keeps the fallback simple and replaceable until a real email, CRM, or ticketing integration is added.

## PUBLIC_BASE_URL

If `PUBLIC_BASE_URL` is set, the backend uses it when generating:

- `widgetUrl`
- `apiUrl`
- `embedCode`

Example:

```env
PUBLIC_BASE_URL=https://ai.webaction.ca
```

## Joomla Embed Pattern

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
