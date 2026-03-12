(function () {
  var defaultConfig = {
    apiUrl: "http://localhost:3000",
    siteId: "",
    title: "Assistant"
  };

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) {
      return;
    }

    var style = document.createElement("style");
    style.textContent =
      ".wa-chat-root{position:fixed;right:20px;bottom:20px;z-index:999999;font-family:Arial,sans-serif;color:#1f2937}" +
      ".wa-chat-toggle{width:60px;height:60px;border:none;border-radius:999px;background:#0f766e;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 12px 30px rgba(15,118,110,.28)}" +
      ".wa-chat-window{position:absolute;right:0;bottom:76px;width:320px;height:420px;display:flex;flex-direction:column;background:#fff;border:1px solid #d1d5db;border-radius:16px;box-shadow:0 20px 45px rgba(15,23,42,.18);overflow:hidden}" +
      ".wa-chat-hidden{display:none}" +
      ".wa-chat-header{padding:14px 16px;background:#0f766e;color:#fff;font-weight:700}" +
      ".wa-chat-messages{flex:1;padding:14px;overflow-y:auto;background:#f8fafc}" +
      ".wa-chat-message{margin-bottom:12px;display:flex}" +
      ".wa-chat-message-user{justify-content:flex-end}" +
      ".wa-chat-bubble{max-width:85%;padding:10px 12px;border-radius:14px;line-height:1.4;font-size:14px;white-space:pre-wrap}" +
      ".wa-chat-message-user .wa-chat-bubble{background:#0f766e;color:#fff;border-bottom-right-radius:4px}" +
      ".wa-chat-message-ai .wa-chat-bubble{background:#e2e8f0;color:#0f172a;border-bottom-left-radius:4px}" +
      ".wa-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e7eb;background:#fff}" +
      ".wa-chat-input{flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px}" +
      ".wa-chat-send{border:none;background:#0f766e;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer}" +
      "@media (max-width:480px){.wa-chat-root{right:12px;left:12px;bottom:12px}.wa-chat-window{width:100%;height:70vh;right:0}}";
    document.head.appendChild(style);
    stylesInjected = true;
  }

  function createMessage(role, text) {
    var message = document.createElement("div");
    message.className = "wa-chat-message wa-chat-message-" + role;

    var bubble = document.createElement("div");
    bubble.className = "wa-chat-bubble";
    bubble.textContent = text;

    message.appendChild(bubble);

    return message;
  }

  function init(userConfig) {
    var config = Object.assign({}, defaultConfig, userConfig || {});

    if (!config.siteId) {
      throw new Error("WebactionChat.init requires a siteId");
    }

    injectStyles();

    var existing = document.getElementById("wa-chat-root");
    if (existing) {
      existing.remove();
    }

    var root = document.createElement("div");
    root.id = "wa-chat-root";
    root.className = "wa-chat-root";

    var toggle = document.createElement("button");
    toggle.className = "wa-chat-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Open chat");
    toggle.textContent = "C";

    var windowEl = document.createElement("div");
    windowEl.className = "wa-chat-window wa-chat-hidden";

    var header = document.createElement("div");
    header.className = "wa-chat-header";
    header.textContent = config.title;

    var messages = document.createElement("div");
    messages.className = "wa-chat-messages";
    messages.appendChild(createMessage("ai", "Hello. How can I help you today?"));

    var form = document.createElement("form");
    form.className = "wa-chat-form";

    var input = document.createElement("input");
    input.className = "wa-chat-input";
    input.type = "text";
    input.placeholder = "Type your message...";

    var send = document.createElement("button");
    send.className = "wa-chat-send";
    send.type = "submit";
    send.textContent = "Send";

    form.appendChild(input);
    form.appendChild(send);

    windowEl.appendChild(header);
    windowEl.appendChild(messages);
    windowEl.appendChild(form);

    root.appendChild(windowEl);
    root.appendChild(toggle);
    document.body.appendChild(root);

    function appendMessage(role, text) {
      messages.appendChild(createMessage(role, text));
      messages.scrollTop = messages.scrollHeight;
    }

    toggle.addEventListener("click", function () {
      windowEl.classList.toggle("wa-chat-hidden");
      if (!windowEl.classList.contains("wa-chat-hidden")) {
        input.focus();
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var message = input.value.trim();
      if (!message) {
        return;
      }

      appendMessage("user", message);
      input.value = "";
      input.disabled = true;
      send.disabled = true;

      fetch(config.apiUrl.replace(/\/$/, "") + "/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message,
          siteId: config.siteId
        })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Request failed with status " + response.status);
          }

          return response.json();
        })
        .then(function (data) {
          appendMessage("ai", data.reply || "No reply returned.");
        })
        .catch(function () {
          appendMessage("ai", "Sorry, something went wrong. Please try again.");
        })
        .finally(function () {
          input.disabled = false;
          send.disabled = false;
          input.focus();
        });
    });
  }

  window.WebactionChat = {
    init: init
  };
})();
