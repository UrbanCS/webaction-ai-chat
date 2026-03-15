const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const sites = require("./data/sites");
const {
  getSiteIndexStatus,
  indexSite,
  retrieveRelevantChunks
} = require("./services/retrievalService");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required in backend/.env");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "webaction-ai-chat-backend"
  });
});

app.get("/sites", (_req, res) => {
  res.json({ sites });
});

app.post("/index-site", async (req, res) => {
  const siteId = typeof req.body.siteId === "string" ? req.body.siteId.trim() : "";

  if (!siteId) {
    return res.status(400).json({ error: "siteId is required" });
  }

  try {
    const summary = await indexSite(siteId);
    return res.json(summary);
  } catch (error) {
    console.error("Site indexing failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to index site"
    });
  }
});

app.get("/site-index/:siteId", (req, res) => {
  const siteId = typeof req.params.siteId === "string" ? req.params.siteId.trim() : "";
  const summary = getSiteIndexStatus(siteId);

  if (!summary.configured) {
    return res.status(404).json({
      error: `Unknown siteId: ${siteId}`
    });
  }

  return res.json(summary);
});

app.post("/chat", async (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  const siteId = typeof req.body.siteId === "string" ? req.body.siteId.trim() : "";

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  if (!siteId) {
    return res.status(400).json({ error: "siteId is required" });
  }

  if (!sites[siteId]) {
    return res.status(404).json({ error: `Unknown siteId: ${siteId}` });
  }

  try {
    const retrievalResult = await retrieveRelevantChunks(siteId, message);
    const contextBlocks = retrievalResult.chunks
      .map((chunk, index) => {
        return `Source ${index + 1}: ${chunk.url}\n${chunk.text}`;
      })
      .join("\n\n");

    if (retrievalResult.site.chunkCount === 0) {
      return res.json({
        reply:
          "I could not find enough website content for this site yet. Please run indexing or check the site crawl target.",
        sources: []
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful website assistant for a Webaction client website. " +
            "Prefer the retrieved website content over general knowledge. " +
            "Always answer in the same language as the user when possible. " +
            "Be concise and practical. " +
            "Never invent services, pricing, hours, contact details, policies, or any other site details that are not supported by the retrieved content. " +
            "If relevant information is missing from the retrieved content, explicitly say it was not found on the website."
        },
        {
          role: "system",
          content:
            `Site ID: ${siteId}\n` +
            `Site name: ${retrievalResult.site.siteName}\n` +
            `Site URL: ${retrievalResult.site.siteUrl}\n\n` +
            "Relevant site content:\n" +
            contextBlocks
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: "No reply returned from OpenAI" });
    }

    return res.json({
      reply,
      sources: retrievalResult.chunks.map((chunk) => chunk.url)
    });
  } catch (error) {
    console.error("Chat request failed:", error);

    return res.status(500).json({
      error: "Failed to generate chat response"
    });
  }
});

app.listen(port, () => {
  console.log(`Webaction AI Chat backend listening on port ${port}`);
});
