# Webaction AI Chat Architecture

## Goal

Build a minimal embeddable AI chat system that Webaction can place on client websites, including Joomla and WordPress sites. Visitors can open the widget, ask questions, and receive responses generated through the Webaction backend and OpenAI.

This MVP focuses on:

- embeddable widget script
- backend API
- OpenAI integration
- multi-site support through `siteId`

This MVP does not include:

- database storage
- retrieval augmented generation (RAG)
- human handoff

## High-Level Flow

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
OpenAI API
```

## How The Widget Works

`widget/chat-widget.js` is a standalone vanilla JavaScript file that can be hosted by Webaction and embedded with a `<script>` tag.

When `WebactionChat.init()` is called, the widget:

1. loads configuration such as `apiUrl`, `siteId`, and `title`
2. injects its own CSS styles
3. renders a floating chat button in the bottom-right corner
4. opens a chat panel when clicked
5. sends visitor messages to `POST /chat`
6. displays both visitor and AI messages in the chat history

Example embed:

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

## How The Backend Works

`backend/server.js` provides a small Express API.

Routes:

- `GET /health` returns a JSON health response
- `POST /chat` accepts:

```json
{
  "message": "user question",
  "siteId": "client-001"
}
```

The backend then:

1. validates `message` and `siteId`
2. builds a system prompt for a helpful website assistant
3. includes the incoming `siteId` in the prompt for multi-client awareness
4. calls OpenAI with model `gpt-4o-mini`
5. returns:

```json
{
  "reply": "AI response"
}
```

## Multi-Site Support

Each widget instance passes a `siteId`. This allows the same backend to support multiple client websites.

For the MVP, `siteId` is only passed into the prompt. In future versions it can be used to:

- load client-specific system prompts
- load client-specific content sources
- apply client-specific branding or behavior

## Joomla Embedding

For Joomla, the simplest installation path is:

1. host `chat-widget.js` on a Webaction-controlled URL
2. add the widget `<script>` tags to the Joomla template, custom HTML module, or site-wide custom code area
3. set the correct `siteId` for that client site
4. ensure the backend API URL is reachable from the public site

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

## Install Dependencies

From `backend/`:

```bash
npm install
```

Dependencies used:

- `express`
- `cors`
- `dotenv`
- `openai`

## Run The Backend

1. create `backend/.env`
2. set `OPENAI_API_KEY`
3. optionally set `PORT`
4. start the server:

```bash
cd backend
npm start
```

Default local URL:

```text
http://localhost:3000
```

## Test The API

Health:

```bash
curl http://localhost:3000/health
```

Chat:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What services do you offer?","siteId":"client-001"}'
```

## Future Extensions

Possible next steps, not part of this MVP:

- knowledge base using site content (RAG)
- database for conversations
- human support fallback
- WordPress plugin
- Joomla module
