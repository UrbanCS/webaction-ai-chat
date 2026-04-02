const fs = require("fs");
const path = require("path");

const handoffFilePath = path.join(__dirname, "..", "data", "handoff-requests.json");

function ensureHandoffFile() {
  if (!fs.existsSync(handoffFilePath)) {
    fs.writeFileSync(handoffFilePath, "[]\n", "utf8");
  }
}

function loadHandoffRequests() {
  ensureHandoffFile();
  const raw = fs.readFileSync(handoffFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error("backend/data/handoff-requests.json contains invalid JSON");
  }
}

function saveHandoffRequests(requests) {
  ensureHandoffFile();
  fs.writeFileSync(handoffFilePath, `${JSON.stringify(requests, null, 2)}\n`, "utf8");
}

function createHandoffRequest({ siteId, siteName, siteUrl, message, email, name, pageUrl, mode, attachment }) {
  if (!siteId) {
    const error = new Error("siteId is required");
    error.statusCode = 400;
    throw error;
  }

  if ((!message || typeof message !== "string" || !message.trim()) && !attachment) {
    const error = new Error("message is required");
    error.statusCode = 400;
    throw error;
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    const error = new Error("email is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const error = new Error("email must be valid");
    error.statusCode = 400;
    throw error;
  }

  const requests = loadHandoffRequests();
  const request = {
    id: `handoff-${Date.now()}`,
    siteId,
    siteName: siteName || null,
    siteUrl: siteUrl || null,
    mode: mode === "live" ? "live" : "request",
    message: typeof message === "string" && message.trim() ? message.trim() : "Pièce jointe envoyée.",
    email: normalizedEmail,
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    pageUrl: typeof pageUrl === "string" && pageUrl.trim() ? pageUrl.trim() : null,
    createdAt: new Date().toISOString(),
    status: "new"
  };

  if (attachment && typeof attachment === "object") {
    request.attachment = attachment;
  }

  requests.push(request);
  saveHandoffRequests(requests);

  return request;
}

module.exports = {
  createHandoffRequest,
  loadHandoffRequests
};
