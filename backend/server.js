const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const path = require("path");
const {
  getSiteIndexStatus,
  indexSite,
  retrieveRelevantChunks
} = require("./services/retrievalService");
const {
  createSiteEntry,
  findSiteBySiteId,
  listSites,
  normalizeRequiredEmail,
  normalizeOptionalEmail,
  normalizeSiteUrl
} = require("./services/siteRegistryService");
const { createHandoffRequest } = require("./services/humanHandoffService");
const { sendHumanHandoffEmail } = require("./services/emailService");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const widgetDirectory = path.join(__dirname, "..", "widget");
const humanFallbackEmail = process.env.HUMAN_FALLBACK_EMAIL || "";
const defaultSupportEmail = process.env.DEFAULT_SUPPORT_EMAIL || humanFallbackEmail || "";
const humanAgentAvailable = String(process.env.HUMAN_AGENT_AVAILABLE || "false").toLowerCase() === "true";
const humanAgentLabel = process.env.HUMAN_AGENT_LABEL || "Webaction support";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required in backend/.env");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use("/widget", express.static(widgetDirectory));

app.set("trust proxy", true);

function getBaseUrl(req) {
  return (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function buildEmbedCode(baseUrl, siteId) {
  return `<script src="${baseUrl}/widget/chat-widget.js"></script>
<script>
WebactionChat.init({
  apiUrl: "${baseUrl}",
  siteId: "${siteId}",
  title: "Assistant"
});
</script>`;
}

function getHumanFallbackPayload(site) {
  return {
    enabled: true,
    agentAvailable: humanAgentAvailable,
    agentLabel: humanAgentLabel,
    contactEmail: humanFallbackEmail || null,
    message: humanAgentAvailable
      ? "A person appears to be available. You can ask for human help now."
      : "If you want, I can send your request to a human team member for follow-up.",
    endpoint: "/human-handoff",
    statusEndpoint: "/human-support-status",
    siteId: site.siteId
  };
}

function shouldSuggestHumanFallback(reply, retrievalResult) {
  if (!retrievalResult || retrievalResult.site.chunkCount === 0) {
    return true;
  }

  return /not found on the website|not found on the site|could not find|couldn't find|information .* not found/i.test(
    reply || ""
  );
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "webaction-ai-chat-backend"
  });
});

app.get("/sites", (_req, res) => {
  res.json(listSites());
});

app.get("/sites/:siteId", (req, res) => {
  const siteId = typeof req.params.siteId === "string" ? req.params.siteId.trim() : "";
  const site = findSiteBySiteId(siteId);

  if (!site) {
    return res.status(404).json({
      error: `Unknown siteId: ${siteId}`
    });
  }

  return res.json(site);
});

app.post("/register-site", async (req, res) => {
  const siteName = typeof req.body.siteName === "string" ? req.body.siteName.trim() : "";
  const siteUrlInput = typeof req.body.siteUrl === "string" ? req.body.siteUrl.trim() : "";
  const supportEmailInput = typeof req.body.supportEmail === "string" ? req.body.supportEmail.trim() : "";

  if (!siteName) {
    return res.status(400).json({ error: "siteName is required" });
  }

  if (!siteUrlInput) {
    return res.status(400).json({ error: "siteUrl is required" });
  }

  if (!supportEmailInput) {
    return res.status(400).json({ error: "supportEmail is required" });
  }

  try {
    const normalizedSiteUrl = normalizeSiteUrl(siteUrlInput);
    const normalizedSupportEmail = normalizeRequiredEmail(supportEmailInput, "supportEmail");
    const { site } = createSiteEntry({
      siteName,
      siteUrl: normalizedSiteUrl,
      supportEmail: normalizedSupportEmail
    });

    const indexSummary = await indexSite(site.siteId);
    const baseUrl = getBaseUrl(req);

    return res.json({
      siteId: site.siteId,
      siteName: site.siteName,
      siteUrl: site.siteUrl,
      supportEmail: site.supportEmail,
      widgetUrl: `${baseUrl}/widget/chat-widget.js`,
      apiUrl: baseUrl,
      embedCode: buildEmbedCode(baseUrl, site.siteId),
      indexSummary
    });
  } catch (error) {
    console.error("Site registration failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to register site"
    });
  }
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

app.get("/human-support-status", (_req, res) => {
  return res.json({
    available: humanAgentAvailable,
    agentLabel: humanAgentLabel,
    contactEmail: humanFallbackEmail || null
  });
});

app.post("/human-handoff", async (req, res) => {
  const siteId = typeof req.body.siteId === "string" ? req.body.siteId.trim() : "";
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const pageUrl = typeof req.body.pageUrl === "string" ? req.body.pageUrl.trim() : "";
  const mode = typeof req.body.mode === "string" ? req.body.mode.trim() : "";
  const site = findSiteBySiteId(siteId);

  if (!site) {
    return res.status(404).json({ error: `Unknown siteId: ${siteId}` });
  }

  try {
    const request = createHandoffRequest({
      siteId,
      siteName: site.siteName,
      siteUrl: site.siteUrl,
      message,
      email,
      name,
      pageUrl,
      mode
    });

    const recipientEmail = site.supportEmail || defaultSupportEmail;
    if (!recipientEmail) {
      return res.status(500).json({
        error: "No support email is configured for this site"
      });
    }

    const subjectPrefix = request.mode === "live" ? "Live support request" : "Website chat follow-up request";
    const emailBody = [
      `${subjectPrefix} for ${site.siteName}`,
      "",
      `Site ID: ${site.siteId}`,
      `Site URL: ${site.siteUrl}`,
      `Visitor email: ${request.email}`,
      `Visitor name: ${request.name || "Not provided"}`,
      `Page URL: ${request.pageUrl || "Not provided"}`,
      `Request mode: ${request.mode}`,
      "",
      "Message:",
      request.message
    ].join("\n");

    await sendHumanHandoffEmail({
      to: recipientEmail,
      replyTo: request.email,
      subject: `[Webaction AI Chat] ${subjectPrefix} - ${site.siteName}`,
      text: emailBody
    });

    return res.json({
      ok: true,
      requestId: request.id,
      reply: request.mode === "live"
        ? "Your request to speak with a person has been sent. A team member can follow up using the email you provided."
        : "Your request has been sent for human follow-up. Someone from the team can contact you using the email you provided."
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to create human handoff request"
    });
  }
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

  const site = findSiteBySiteId(siteId);

  if (!site) {
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
        sources: [],
        handoffSuggested: true,
        humanHandoff: getHumanFallbackPayload(site)
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

    const handoffSuggested = shouldSuggestHumanFallback(reply, retrievalResult);

    return res.json({
      reply,
      sources: retrievalResult.chunks.map((chunk) => chunk.url),
      handoffSuggested,
      humanHandoff: handoffSuggested ? getHumanFallbackPayload(site) : null
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
