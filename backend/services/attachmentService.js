const fs = require("fs");
const path = require("path");

const uploadsDirectory = path.join(__dirname, "..", "data", "uploads");
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json"
]);
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

function ensureUploadsDirectory() {
  if (!fs.existsSync(uploadsDirectory)) {
    fs.mkdirSync(uploadsDirectory, { recursive: true });
  }
}

function sanitizeFilename(filename) {
  return String(filename || "piece-jointe")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "piece-jointe";
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(String(dataUrl || ""));
  if (!match) {
    const error = new Error("attachment dataUrl is invalid");
    error.statusCode = 400;
    throw error;
  }

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    const error = new Error("attachment is empty");
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    const error = new Error("attachment is too large");
    error.statusCode = 400;
    throw error;
  }

  return {
    mimeType,
    buffer
  };
}

function getAttachmentKind(mimeType) {
  if (TEXT_MIME_TYPES.has(mimeType)) {
    return "text";
  }

  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return "image";
  }

  return "binary";
}

function saveAttachment(attachment, prefix) {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const { mimeType, buffer } = parseDataUrl(attachment.dataUrl);
  const safeName = sanitizeFilename(attachment.name);
  const storedName = `${prefix}-${Date.now()}-${safeName}`;

  ensureUploadsDirectory();
  fs.writeFileSync(path.join(uploadsDirectory, storedName), buffer);

  return {
    name: safeName,
    type: mimeType,
    size: buffer.length,
    kind: getAttachmentKind(mimeType),
    relativeUrl: `/uploads/${storedName}`
  };
}

function extractTextFromAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") {
    return "";
  }

  const { mimeType, buffer } = parseDataUrl(attachment.dataUrl);
  if (!TEXT_MIME_TYPES.has(mimeType)) {
    return "";
  }

  return buffer.toString("utf8").trim();
}

function isAiReadableAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") {
    return false;
  }

  try {
    const { mimeType } = parseDataUrl(attachment.dataUrl);
    return TEXT_MIME_TYPES.has(mimeType) || IMAGE_MIME_TYPES.has(mimeType);
  } catch (_error) {
    return false;
  }
}

module.exports = {
  ensureUploadsDirectory,
  extractTextFromAttachment,
  isAiReadableAttachment,
  saveAttachment
};
