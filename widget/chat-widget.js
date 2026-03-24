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
      ".wa-chat-message-ai .wa-chat-bubble,.wa-chat-message-agent .wa-chat-bubble{background:#e2e8f0;color:#0f172a;border-bottom-left-radius:4px}" +
      ".wa-chat-message-system .wa-chat-bubble{background:#fef3c7;color:#78350f}" +
      ".wa-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e7eb;background:#fff}" +
      ".wa-chat-input,.wa-chat-support-input,.wa-chat-support-textarea{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;box-sizing:border-box}" +
      ".wa-chat-input{flex:1}" +
      ".wa-chat-send,.wa-chat-support-submit{border:none;background:#0f766e;color:#fff;border-radius:10px;padding:10px 14px;cursor:pointer}" +
      ".wa-chat-handoff-panel{margin:0 14px 12px;padding:12px;border:1px solid #cbd5e1;background:#f0fdf4;border-radius:12px}" +
      ".wa-chat-handoff-copy{margin:0 0 10px;font-size:13px;line-height:1.4;color:#14532d}" +
      ".wa-chat-support-form{display:flex;flex-direction:column;gap:8px}" +
      ".wa-chat-support-actions{display:flex;gap:8px}" +
      ".wa-chat-support-secondary{background:#e5e7eb;color:#0f172a}" +
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
    toggle.setAttribute("aria-label", "Ouvrir le chat");
    toggle.textContent = "C";

    var windowEl = document.createElement("div");
    windowEl.className = "wa-chat-window wa-chat-hidden";

    var header = document.createElement("div");
    header.className = "wa-chat-header";
    header.textContent = config.title;

    var messages = document.createElement("div");
    messages.className = "wa-chat-messages";
    messages.appendChild(createMessage("ai", "Bonjour. Comment puis-je vous aider aujourd'hui ?"));

    var handoffPanel = document.createElement("div");
    handoffPanel.className = "wa-chat-handoff-panel wa-chat-hidden";

    var handoffCopy = document.createElement("p");
    handoffCopy.className = "wa-chat-handoff-copy";
    handoffCopy.textContent = "";

    var supportForm = document.createElement("form");
    supportForm.className = "wa-chat-support-form";

    var supportName = document.createElement("input");
    supportName.className = "wa-chat-support-input";
    supportName.type = "text";
    supportName.placeholder = "Votre nom (optionnel)";

    var supportEmail = document.createElement("input");
    supportEmail.className = "wa-chat-support-input";
    supportEmail.type = "email";
    supportEmail.placeholder = "Votre courriel";

    var supportMessage = document.createElement("textarea");
    supportMessage.className = "wa-chat-support-textarea";
    supportMessage.rows = 3;
    supportMessage.placeholder = "Expliquez votre demande";

    var supportActions = document.createElement("div");
    supportActions.className = "wa-chat-support-actions";

    var supportSubmit = document.createElement("button");
    supportSubmit.className = "wa-chat-support-submit";
    supportSubmit.type = "submit";
    supportSubmit.textContent = "Envoyer la demande";

    var supportCancel = document.createElement("button");
    supportCancel.className = "wa-chat-support-submit wa-chat-support-secondary";
    supportCancel.type = "button";
    supportCancel.textContent = "Annuler";

    supportActions.appendChild(supportSubmit);
    supportActions.appendChild(supportCancel);

    supportForm.appendChild(supportName);
    supportForm.appendChild(supportEmail);
    supportForm.appendChild(supportMessage);
    supportForm.appendChild(supportActions);

    handoffPanel.appendChild(handoffCopy);
    handoffPanel.appendChild(supportForm);

    var form = document.createElement("form");
    form.className = "wa-chat-form";
    var lastUserMessage = "";
    var currentHandoff = null;
    var activeConversationId = null;
    var livePollTimer = null;
    var lastLiveMessageAt = "";
    var seenLiveMessageIds = {};

    var input = document.createElement("input");
    input.className = "wa-chat-input";
    input.type = "text";
    input.placeholder = "Écrivez votre message...";

    var send = document.createElement("button");
    send.className = "wa-chat-send";
    send.type = "submit";
    send.textContent = "Envoyer";

    form.appendChild(input);
    form.appendChild(send);

    windowEl.appendChild(header);
    windowEl.appendChild(messages);
    windowEl.appendChild(handoffPanel);
    windowEl.appendChild(form);

    root.appendChild(windowEl);
    root.appendChild(toggle);
    document.body.appendChild(root);

    function appendMessage(role, text) {
      messages.appendChild(createMessage(role, text));
      messages.scrollTop = messages.scrollHeight;
    }

    function appendLiveMessage(message, options) {
      var settings = options || {};
      if (!message || !message.id || seenLiveMessageIds[message.id]) {
        return;
      }

      seenLiveMessageIds[message.id] = true;
      lastLiveMessageAt = message.createdAt || lastLiveMessageAt;

      if (settings.skipVisitorMessages && message.senderType === "visitor") {
        return;
      }

      appendMessage(message.senderType === "visitor" ? "user" : message.senderType, message.text);
    }

    function stopLivePolling() {
      if (livePollTimer) {
        window.clearInterval(livePollTimer);
        livePollTimer = null;
      }
    }

    function hideSupportPanel() {
      currentHandoff = null;
      handoffPanel.classList.add("wa-chat-hidden");
      handoffCopy.textContent = "";
      supportMessage.value = "";
    }

    function pollLiveMessages() {
      if (!activeConversationId) {
        return;
      }

      var url = config.apiUrl.replace(/\/$/, "") + "/live-chat/" + activeConversationId + "/messages";
      if (lastLiveMessageAt) {
        url += "?since=" + encodeURIComponent(lastLiveMessageAt);
      }

      fetch(url)
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data.error || "Impossible d'actualiser le chat en direct.");
            }

            return data;
          });
        })
        .then(function (data) {
          (data.messages || []).forEach(function (message) {
            appendLiveMessage(message, { skipVisitorMessages: true });
          });

          if (data.status === "closed") {
            appendMessage("system", "Cette conversation en direct a été fermée.");
            activeConversationId = null;
            stopLivePolling();
          }
        })
        .catch(function () {
          stopLivePolling();
        });
    }

    function startLivePolling(conversationId, initialMessages) {
      activeConversationId = conversationId;
      lastLiveMessageAt = "";
      seenLiveMessageIds = {};

      (initialMessages || []).forEach(function (message) {
        appendLiveMessage(message);
      });

      stopLivePolling();
      livePollTimer = window.setInterval(pollLiveMessages, 3000);
    }

    function showSupportPanel(handoff) {
      currentHandoff = handoff;
      supportMessage.value = lastUserMessage;
      handoffCopy.textContent = handoff.agentAvailable
        ? "Une personne semble disponible. Démarrez une conversation en direct maintenant."
        : "Aucun agent ne semble disponible pour le moment. Envoyez votre demande et l'équipe pourra vous répondre plus tard.";
      supportSubmit.textContent = handoff.agentAvailable ? "Démarrer le chat en direct" : "Envoyer la demande";
      handoffPanel.classList.remove("wa-chat-hidden");
    }

    toggle.addEventListener("click", function () {
      windowEl.classList.toggle("wa-chat-hidden");
      if (!windowEl.classList.contains("wa-chat-hidden")) {
        input.focus();
      }
    });

    supportCancel.addEventListener("click", function () {
      hideSupportPanel();
    });

    supportForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!currentHandoff) {
        return;
      }

      var email = supportEmail.value.trim();
      if (!email) {
        appendMessage("ai", "Veuillez entrer votre courriel afin que l'équipe puisse faire un suivi.");
        return;
      }

      var payload = {
        siteId: config.siteId,
        name: supportName.value.trim(),
        email: email,
        message: supportMessage.value.trim() || lastUserMessage,
        pageUrl: window.location.href
      };

      if (currentHandoff.agentAvailable && currentHandoff.liveStartEndpoint) {
        fetch(config.apiUrl.replace(/\/$/, "") + currentHandoff.liveStartEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            siteId: config.siteId,
            visitorName: payload.name,
            visitorEmail: payload.email,
            message: payload.message,
            pageUrl: payload.pageUrl
          })
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) {
                throw new Error(data.error || "Impossible de démarrer le chat en direct.");
              }

              return data;
            });
          })
          .then(function (data) {
            appendMessage("system", "Le chat en direct a démarré. Une personne peut maintenant répondre ici.");
            hideSupportPanel();
            startLivePolling(data.conversationId, data.messages || []);
          })
          .catch(function (error) {
            appendMessage(
              "ai",
              error && error.message ? error.message : "Impossible de démarrer le chat en direct."
            );
          });

        return;
      }

      fetch(config.apiUrl.replace(/\/$/, "") + currentHandoff.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          siteId: config.siteId,
          name: payload.name,
          email: payload.email,
          message: payload.message,
          pageUrl: payload.pageUrl,
          mode: "request"
        })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data.error || "Human handoff request failed.");
            }

            return data;
          });
        })
        .then(function (data) {
          appendMessage("ai", data.reply || "Une demande de suivi humain a été envoyée.");
          hideSupportPanel();
        })
        .catch(function (error) {
          appendMessage(
            "ai",
            error && error.message ? error.message : "Impossible d'envoyer la demande de suivi humain."
          );
        });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var message = input.value.trim();
      if (!message) {
        return;
      }

      if (activeConversationId) {
        appendMessage("user", message);
        input.value = "";

        fetch(config.apiUrl.replace(/\/$/, "") + "/live-chat/" + activeConversationId + "/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: message
          })
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) {
                throw new Error(data.error || "Impossible d'envoyer le message du chat en direct.");
              }

              return data;
            });
          })
          .then(function (data) {
            if (data.message && data.message.id) {
              seenLiveMessageIds[data.message.id] = true;
              lastLiveMessageAt = data.message.createdAt || lastLiveMessageAt;
            }
          })
          .catch(function (error) {
            appendMessage(
              "system",
              error && error.message ? error.message : "Impossible d'envoyer le message du chat en direct."
            );
          });

        return;
      }

      lastUserMessage = message;
      hideSupportPanel();
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
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data.error || "La requête a échoué avec le statut " + response.status);
            }

            return data;
          });
        })
        .then(function (data) {
          appendMessage("ai", data.reply || "No reply returned.");
          if (data.handoffSuggested && data.humanHandoff) {
            showSupportPanel(data.humanHandoff);
          }
        })
        .catch(function (error) {
          appendMessage(
            "ai",
            error && error.message
              ? error.message
              : "Sorry, something went wrong. Please try again."
          );
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
