const nodemailer = require("nodemailer");

let transporter;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`${name} is required for email sending`);
    error.statusCode = 500;
    throw error;
  }

  return value;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: getRequiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: getRequiredEnv("SMTP_USER"),
      pass: getRequiredEnv("SMTP_PASS")
    },
    tls: {
      rejectUnauthorized:
        String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
      ...(process.env.SMTP_TLS_SERVERNAME
        ? { servername: process.env.SMTP_TLS_SERVERNAME }
        : {})
    }
  });

  return transporter;
}

async function sendHumanHandoffEmail({ to, replyTo, subject, text }) {
  if (!to) {
    const error = new Error("A recipient email is required");
    error.statusCode = 500;
    throw error;
  }

  const from = process.env.SMTP_FROM || getRequiredEnv("SMTP_USER");
  const mailOptions = {
    from,
    to,
    subject,
    text
  };

  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  return getTransporter().sendMail(mailOptions);
}

module.exports = {
  sendHumanHandoffEmail
};
