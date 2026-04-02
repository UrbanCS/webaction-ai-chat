const fs = require("fs");
const path = require("path");

const conversationsFilePath = path.join(__dirname, "..", "data", "live-chat-conversations.json");
const agentStatusFilePath = path.join(__dirname, "..", "data", "agent-status.json");
const defaultAgentAvailability = String(process.env.HUMAN_AGENT_AVAILABLE || "false").toLowerCase() === "true";

function ensureJsonFile(filePath, defaultContents) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${JSON.stringify(defaultContents, null, 2)}\n`, "utf8");
  }
}

function readJson(filePath, defaultContents) {
  ensureJsonFile(filePath, defaultContents);
  const raw = fs.readFileSync(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${path.basename(filePath)} contains invalid JSON`);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listConversations() {
  const conversations = readJson(conversationsFilePath, []);
  return Array.isArray(conversations) ? conversations : [];
}

function saveConversations(conversations) {
  writeJson(conversationsFilePath, conversations);
}

function getAgentStatus() {
  const status = readJson(agentStatusFilePath, {
    available: defaultAgentAvailability,
    updatedAt: null,
    sites: {}
  });

  if (!status.sites || typeof status.sites !== "object") {
    status.sites = {};
  }

  return {
    available: Boolean(status.available),
    updatedAt: status.updatedAt || null,
    sites: status.sites
  };
}

function getSiteAgentStatus(siteId) {
  const status = getAgentStatus();

  if (siteId && status.sites[siteId]) {
    return {
      available: Boolean(status.sites[siteId].available),
      updatedAt: status.sites[siteId].updatedAt || null
    };
  }

  return {
    available: Boolean(status.available),
    updatedAt: status.updatedAt || null
  };
}

function setAgentStatus(available, siteId) {
  const status = getAgentStatus();
  const timestamp = new Date().toISOString();

  if (siteId) {
    status.sites[siteId] = {
      available: Boolean(available),
      updatedAt: timestamp
    };
  } else {
    status.available = Boolean(available);
    status.updatedAt = timestamp;
  }

  writeJson(agentStatusFilePath, status);

  return siteId
    ? status.sites[siteId]
    : {
        available: status.available,
        updatedAt: status.updatedAt
      };
}

function findConversationById(conversationId) {
  return listConversations().find((conversation) => conversation.id === conversationId) || null;
}

function createConversation({ siteId, siteName, siteUrl, visitorName, visitorEmail, pageUrl, initialMessage, attachment }) {
  if (!siteId) {
    const error = new Error("siteId is required");
    error.statusCode = 400;
    throw error;
  }

  if (!visitorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail.trim())) {
    const error = new Error("visitorEmail must be valid");
    error.statusCode = 400;
    throw error;
  }

  if ((!initialMessage || !initialMessage.trim()) && !attachment) {
    const error = new Error("initialMessage or attachment is required");
    error.statusCode = 400;
    throw error;
  }

  const conversations = listConversations();
  const conversation = {
    id: `conversation-${Date.now()}`,
    siteId,
    siteName: siteName || null,
    siteUrl: siteUrl || null,
    visitorName: visitorName && visitorName.trim() ? visitorName.trim() : null,
    visitorEmail: visitorEmail.trim(),
    pageUrl: pageUrl && pageUrl.trim() ? pageUrl.trim() : null,
    status: "open",
    typing: {
      agent: false,
      visitor: false,
      updatedAt: null
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `message-${Date.now()}`,
        senderType: "visitor",
        text: initialMessage && initialMessage.trim() ? initialMessage.trim() : "",
        createdAt: new Date().toISOString()
      }
    ]
  };

  if (attachment) {
    conversation.messages[0].attachment = attachment;
  }

  conversations.push(conversation);
  saveConversations(conversations);

  return conversation;
}

function addMessageToConversation(conversationId, { senderType, text, senderName, attachment }) {
  if ((!text || !text.trim()) && !attachment) {
    const error = new Error("text or attachment is required");
    error.statusCode = 400;
    throw error;
  }

  if (!["visitor", "agent", "system"].includes(senderType)) {
    const error = new Error("senderType is invalid");
    error.statusCode = 400;
    throw error;
  }

  const conversations = listConversations();
  const conversation = conversations.find((item) => item.id === conversationId);

  if (!conversation) {
    const error = new Error(`Unknown conversationId: ${conversationId}`);
    error.statusCode = 404;
    throw error;
  }

  const message = {
    id: `message-${Date.now()}-${conversation.messages.length + 1}`,
    senderType,
    text: text && text.trim() ? text.trim() : "",
    createdAt: new Date().toISOString()
  };

  if (senderName && typeof senderName === "string" && senderName.trim()) {
    message.senderName = senderName.trim();
  }

  if (attachment) {
    message.attachment = attachment;
  }

  if (!conversation.typing || typeof conversation.typing !== "object") {
    conversation.typing = {
      agent: false,
      visitor: false,
      updatedAt: null
    };
  }

  if (senderType === "agent") {
    conversation.typing.agent = false;
  }

  if (senderType === "visitor") {
    conversation.typing.visitor = false;
  }

  conversation.typing.updatedAt = new Date().toISOString();
  conversation.messages.push(message);
  conversation.updatedAt = new Date().toISOString();
  saveConversations(conversations);

  return {
    conversation,
    message
  };
}

function closeConversation(conversationId) {
  const conversations = listConversations();
  const conversation = conversations.find((item) => item.id === conversationId);

  if (!conversation) {
    const error = new Error(`Unknown conversationId: ${conversationId}`);
    error.statusCode = 404;
    throw error;
  }

  conversation.status = "closed";
  conversation.updatedAt = new Date().toISOString();
  saveConversations(conversations);

  return conversation;
}

function deleteConversation(conversationId) {
  const conversations = listConversations();
  const conversationIndex = conversations.findIndex((item) => item.id === conversationId);

  if (conversationIndex === -1) {
    const error = new Error(`Unknown conversationId: ${conversationId}`);
    error.statusCode = 404;
    throw error;
  }

  const deletedConversation = conversations[conversationIndex];
  conversations.splice(conversationIndex, 1);
  saveConversations(conversations);

  return deletedConversation;
}

function getConversationMessages(conversationId, since) {
  const conversation = findConversationById(conversationId);

  if (!conversation) {
    const error = new Error(`Unknown conversationId: ${conversationId}`);
    error.statusCode = 404;
    throw error;
  }

  const sinceTimestamp = since ? new Date(since).getTime() : 0;
  const messages = Number.isNaN(sinceTimestamp)
    ? conversation.messages
    : conversation.messages.filter((message) => new Date(message.createdAt).getTime() > sinceTimestamp);

  return {
    conversation,
    messages
  };
}

function setConversationTypingStatus(conversationId, senderType, isTyping) {
  if (!["agent", "visitor"].includes(senderType)) {
    const error = new Error("senderType is invalid");
    error.statusCode = 400;
    throw error;
  }

  const conversations = listConversations();
  const conversation = conversations.find((item) => item.id === conversationId);

  if (!conversation) {
    const error = new Error(`Unknown conversationId: ${conversationId}`);
    error.statusCode = 404;
    throw error;
  }

  if (!conversation.typing || typeof conversation.typing !== "object") {
    conversation.typing = {
      agent: false,
      visitor: false,
      updatedAt: null
    };
  }

  conversation.typing[senderType] = Boolean(isTyping);
  conversation.typing.updatedAt = new Date().toISOString();
  conversation.updatedAt = new Date().toISOString();
  saveConversations(conversations);

  return {
    conversation,
    typing: conversation.typing
  };
}

module.exports = {
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
};
