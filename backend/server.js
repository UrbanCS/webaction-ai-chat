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
  isSiteDashboardAuthorized,
  listSites,
  normalizeRequiredEmail,
  normalizeOptionalEmail,
  normalizeSiteUrl
} = require("./services/siteRegistryService");
const { createHandoffRequest } = require("./services/humanHandoffService");
const { sendHumanHandoffEmail } = require("./services/emailService");
const {
  addMessageToConversation,
  closeConversation,
  createConversation,
  deleteConversation,
  findConversationById,
  getAgentStatus,
  getSiteAgentStatus,
  getConversationMessages,
  listConversations,
  setConversationTypingStatus,
  setAgentStatus
} = require("./services/liveChatService");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const widgetDirectory = path.join(__dirname, "..", "widget");
const agentUiDirectory = path.join(__dirname, "public", "agent");
const apiRouter = express.Router();
const humanFallbackEmail = process.env.HUMAN_FALLBACK_EMAIL || "";
const defaultSupportEmail = process.env.DEFAULT_SUPPORT_EMAIL || humanFallbackEmail || "";
const humanAgentAvailableDefault = String(process.env.HUMAN_AGENT_AVAILABLE || "false").toLowerCase() === "true";
const humanAgentLabel = process.env.HUMAN_AGENT_LABEL || "Webaction support";
const agentDashboardKey = process.env.AGENT_DASHBOARD_KEY || "";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required in backend/.env");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

app.set("trust proxy", true);

function getBaseUrl(req) {
  return (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function getBasePath() {
  const configuredBaseUrl = process.env.PUBLIC_BASE_URL || "";

  if (!configuredBaseUrl) {
    return "";
  }

  try {
    const pathname = new URL(configuredBaseUrl).pathname.replace(/\/$/, "");
    return pathname === "/" ? "" : pathname;
  } catch (_error) {
    return "";
  }
}

function buildEmbedCode(baseUrl, siteId) {
  return `<script src="${baseUrl}/widget/chat-widget.js"></script>
<script>
WebactionChat.init({
  apiUrl: "${baseUrl}",
  siteId: "${siteId}",
  title: "Assistant IA"
});
</script>`;
}

function sanitizeSite(site) {
  if (!site) {
    return null;
  }

  return {
    siteId: site.siteId,
    siteName: site.siteName,
    siteUrl: site.siteUrl,
    supportEmail: site.supportEmail,
    createdAt: site.createdAt || null
  };
}

function buildDashboardUrl(baseUrl, siteId, dashboardKey) {
  return `${baseUrl}/agent/live-chat.html?siteId=${encodeURIComponent(siteId)}&key=${encodeURIComponent(dashboardKey)}`;
}

function getAgentAccessContext(req) {
  const providedKey = req.get("x-agent-key") || req.query.key || "";
  const requestedSiteId = req.get("x-site-id") || req.query.siteId || (req.body && req.body.siteId) || "";
  const siteId = typeof requestedSiteId === "string"
    ? requestedSiteId.trim()
    : "";

  if (agentDashboardKey && providedKey === agentDashboardKey) {
    return {
      type: "global",
      siteId: siteId || null
    };
  }

  if (siteId && isSiteDashboardAuthorized(siteId, providedKey)) {
    return {
      type: "site",
      siteId
    };
  }

  return null;
}

function requireAgentAuth(req, res, next) {
  const access = getAgentAccessContext(req);
  if (!access) {
    return res.status(401).json({ error: "Agent authorization required" });
  }

  req.agentAccess = access;
  return next();
}

function ensureConversationAccess(req, conversation) {
  if (!req.agentAccess || req.agentAccess.type === "global") {
    return true;
  }

  return conversation && conversation.siteId === req.agentAccess.siteId;
}

function getHumanFallbackPayload(site) {
  const agentStatus = getSiteAgentStatus(site.siteId);

  return {
    enabled: true,
    agentAvailable: agentStatus.available,
    agentLabel: humanAgentLabel,
    contactEmail: humanFallbackEmail || null,
    message: agentStatus.available
      ? "Une personne semble disponible. Vous pouvez demander de l'aide humaine maintenant."
      : "Si vous le souhaitez, je peux envoyer votre demande à un membre de l'équipe pour un suivi.",
    endpoint: "/human-handoff",
    liveStartEndpoint: "/live-chat/start",
    statusEndpoint: "/human-support-status",
    siteId: site.siteId
  };
}

function shouldSuggestHumanFallback(reply, retrievalResult) {
  if (!retrievalResult || retrievalResult.site.chunkCount === 0) {
    return true;
  }

  return /not found on the website|not found on the site|could not find|couldn't find|information .* not found|pas d['’]information|n['’]y a pas d['’]information|ne sont pas disponibles sur le site|je vous recommande de contacter|adresse email fournie|contacter le support|communiquer avec un agent humain/i.test(
    reply || ""
  );
}

apiRouter.use("/widget", express.static(widgetDirectory));
apiRouter.use("/agent", express.static(agentUiDirectory));

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "webaction-ai-chat-backend"
  });
});

apiRouter.get("/sites", (_req, res) => {
  res.json(listSites().map(sanitizeSite));
});

apiRouter.get("/sites/:siteId", (req, res) => {
  const siteId = typeof req.params.siteId === "string" ? req.params.siteId.trim() : "";
  const site = findSiteBySiteId(siteId);

  if (!site) {
    return res.status(404).json({
      error: `Unknown siteId: ${siteId}`
    });
  }

  return res.json(sanitizeSite(site));
});

apiRouter.post("/register-site", async (req, res) => {
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
    const { site, created, updated } = createSiteEntry({
      siteName,
      siteUrl: normalizedSiteUrl,
      supportEmail: normalizedSupportEmail
    });

    const indexSummary = await indexSite(site.siteId);
    const baseUrl = getBaseUrl(req);

    return res.json({
      siteId: site.siteId,
      created,
      updated,
      siteName: site.siteName,
      siteUrl: site.siteUrl,
      supportEmail: site.supportEmail,
      dashboardUrl: buildDashboardUrl(baseUrl, site.siteId, site.dashboardKey),
      dashboardKey: site.dashboardKey,
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

apiRouter.post("/index-site", async (req, res) => {
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

apiRouter.get("/site-index/:siteId", (req, res) => {
  const siteId = typeof req.params.siteId === "string" ? req.params.siteId.trim() : "";
  const summary = getSiteIndexStatus(siteId);

  if (!summary.configured) {
    return res.status(404).json({
      error: `Unknown siteId: ${siteId}`
    });
  }

  return res.json(summary);
});

apiRouter.get("/human-support-status", (_req, res) => {
  const siteId = typeof _req.query.siteId === "string" ? _req.query.siteId.trim() : "";
  const agentStatus = getSiteAgentStatus(siteId);

  return res.json({
    available: agentStatus.available,
    agentLabel: humanAgentLabel,
    contactEmail: humanFallbackEmail || null,
    updatedAt: agentStatus.updatedAt
  });
});

apiRouter.post("/live-chat/start", (req, res) => {
  const siteId = typeof req.body.siteId === "string" ? req.body.siteId.trim() : "";
  const visitorName = typeof req.body.visitorName === "string" ? req.body.visitorName.trim() : "";
  const visitorEmail = typeof req.body.visitorEmail === "string" ? req.body.visitorEmail.trim() : "";
  const initialMessage = typeof req.body.message === "string" ? req.body.message.trim() : "";
  const pageUrl = typeof req.body.pageUrl === "string" ? req.body.pageUrl.trim() : "";
  const site = findSiteBySiteId(siteId);
  const agentStatus = getSiteAgentStatus(siteId);

  if (!site) {
    return res.status(404).json({ error: `Unknown siteId: ${siteId}` });
  }

  if (!agentStatus.available) {
    return res.status(409).json({
      error: "No live agent is available right now"
    });
  }

  try {
    const conversation = createConversation({
      siteId,
      siteName: site.siteName,
      siteUrl: site.siteUrl,
      visitorName,
      visitorEmail,
      pageUrl,
      initialMessage
    });

    addMessageToConversation(conversation.id, {
      senderType: "system",
      text: `${humanAgentLabel} a rejoint la file d'attente. Un agent peut répondre ici sous peu.`
    });

    return res.json({
      ok: true,
      conversationId: conversation.id,
      status: conversation.status,
      messages: conversation.messages
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to start live chat"
    });
  }
});

apiRouter.get("/live-chat/:conversationId/messages", (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";
  const since = typeof req.query.since === "string" ? req.query.since.trim() : "";

  try {
    const result = getConversationMessages(conversationId, since);
    return res.json({
      conversationId,
      status: result.conversation.status,
      updatedAt: result.conversation.updatedAt,
      agentTyping: Boolean(result.conversation.typing && result.conversation.typing.agent),
      messages: result.messages
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to load live chat messages"
    });
  }
});

apiRouter.post("/live-chat/:conversationId/messages", (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  const senderName = typeof req.body.senderName === "string" ? req.body.senderName.trim() : "";

  try {
    const result = addMessageToConversation(conversationId, {
      senderType: "visitor",
      text,
      senderName
    });

    return res.json({
      ok: true,
      message: result.message,
      status: result.conversation.status
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to send visitor message"
    });
  }
});

apiRouter.post("/live-chat/:conversationId/typing", (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";
  const isTyping = Boolean(req.body.isTyping);

  try {
    const result = setConversationTypingStatus(conversationId, "visitor", isTyping);
    return res.json({
      ok: true,
      typing: result.typing
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to update visitor typing status"
    });
  }
});

apiRouter.get("/agent/live-chat/conversations", requireAgentAuth, (req, res) => {
  const conversations = listConversations().filter((conversation) => {
    if (req.agentAccess.type === "global" && req.agentAccess.siteId) {
      return conversation.siteId === req.agentAccess.siteId;
    }

    if (req.agentAccess.type === "site") {
      return conversation.siteId === req.agentAccess.siteId;
    }

    return true;
  });

  return res.json({
    available:
      req.agentAccess.type === "global" && !req.agentAccess.siteId
        ? getAgentStatus().available
        : getSiteAgentStatus(req.agentAccess.siteId).available,
    siteId: req.agentAccess.siteId || null,
    conversations
  });
});

apiRouter.post("/agent/live-chat/availability", requireAgentAuth, (req, res) => {
  const available = Boolean(req.body.available);
  const targetSiteId =
    req.agentAccess.type === "site"
      ? req.agentAccess.siteId
      : (typeof req.body.siteId === "string" ? req.body.siteId.trim() : req.agentAccess.siteId);
  const status = setAgentStatus(available, targetSiteId || null);

  return res.json(status);
});

apiRouter.get("/agent/live-chat/:conversationId/messages", requireAgentAuth, (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";

  try {
    const result = getConversationMessages(conversationId);
    if (!ensureConversationAccess(req, result.conversation)) {
      return res.status(403).json({ error: "Conversation access denied" });
    }
    return res.json({
      conversationId,
      conversation: result.conversation
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to load conversation"
    });
  }
});

apiRouter.post("/agent/live-chat/:conversationId/messages", requireAgentAuth, (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  const senderName = typeof req.body.senderName === "string" ? req.body.senderName.trim() : "";

  try {
    const existingConversation = findConversationById(conversationId);
    if (!ensureConversationAccess(req, existingConversation)) {
      return res.status(403).json({ error: "Conversation access denied" });
    }

    const result = addMessageToConversation(conversationId, {
      senderType: "agent",
      text,
      senderName
    });

    return res.json({
      ok: true,
      message: result.message
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to send agent message"
    });
  }
});

apiRouter.post("/agent/live-chat/:conversationId/typing", requireAgentAuth, (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";
  const isTyping = Boolean(req.body.isTyping);

  try {
    const existingConversation = findConversationById(conversationId);
    if (!ensureConversationAccess(req, existingConversation)) {
      return res.status(403).json({ error: "Conversation access denied" });
    }

    const result = setConversationTypingStatus(conversationId, "agent", isTyping);
    return res.json({
      ok: true,
      typing: result.typing
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to update typing status"
    });
  }
});

apiRouter.post("/agent/live-chat/:conversationId/close", requireAgentAuth, (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";

  try {
    const existingConversation = findConversationById(conversationId);
    if (!ensureConversationAccess(req, existingConversation)) {
      return res.status(403).json({ error: "Conversation access denied" });
    }

    const conversation = closeConversation(conversationId);
    return res.json({
      ok: true,
      conversation
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to close conversation"
    });
  }
});

apiRouter.delete("/agent/live-chat/:conversationId", requireAgentAuth, (req, res) => {
  const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId.trim() : "";

  try {
    const existingConversation = findConversationById(conversationId);
    if (!ensureConversationAccess(req, existingConversation)) {
      return res.status(403).json({ error: "Conversation access denied" });
    }

    const conversation = deleteConversation(conversationId);
    return res.json({
      ok: true,
      conversation
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to delete conversation"
    });
  }
});

apiRouter.post("/human-handoff", async (req, res) => {
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

    const subjectPrefix = request.mode === "live"
      ? "Demande de soutien en direct / Live support request"
      : "Demande de suivi du clavardage / Chat follow-up request";
    const emailBody = [
      `${subjectPrefix} - ${site.siteName}`,
      "",
      `Identifiant du site / Site ID: ${site.siteId}`,
      `URL du site / Site URL: ${site.siteUrl}`,
      `Courriel du visiteur / Visitor email: ${request.email}`,
      `Nom du visiteur / Visitor name: ${request.name || "Non fourni / Not provided"}`,
      `URL de la page / Page URL: ${request.pageUrl || "Non fournie / Not provided"}`,
      `Type de demande / Request type: ${request.mode === "live" ? "direct / live" : "suivi / follow-up"}`,
      "",
      "Message :",
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
        ? "Votre demande pour parler à une personne a bien été envoyée. Un membre de l'équipe pourra vous répondre à l'adresse fournie."
        : "Votre demande de suivi humain a bien été envoyée. Quelqu'un de l'équipe pourra vous contacter à l'adresse fournie."
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to create human handoff request"
    });
  }
});

apiRouter.post("/chat", async (req, res) => {
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
          "Je n'ai pas encore trouvé assez de contenu pour ce site. Veuillez lancer l'indexation ou vérifier la cible du crawl.",
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

const basePath = getBasePath();

if (basePath) {
  app.use(basePath, apiRouter);
}

app.use(apiRouter);

app.listen(port, () => {
  console.log(`Webaction AI Chat backend listening on port ${port}`);
});
