(function () {
  var defaultConfig = {
    apiUrl: "http://localhost:3000",
    siteId: "",
    title: "Assistant IA"
  };

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) {
      return;
    }

    var style = document.createElement("style");
    style.textContent =
      ".wa-chat-root{position:fixed;right:20px;bottom:20px;z-index:999999;font-family:Arial,sans-serif;color:#1f2937}" +
      ".wa-chat-root.wa-chat-root-popout{inset:0;right:auto;bottom:auto}" +
      ".wa-chat-toggle{min-width:148px;height:60px;padding:0 22px;border:none;border-radius:999px;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;font-size:16px;font-weight:800;letter-spacing:.01em;cursor:pointer;box-shadow:0 20px 44px rgba(15,118,110,.34);line-height:1.1}" +
      ".wa-chat-window{position:absolute;right:0;bottom:80px;width:360px;height:500px;display:flex;flex-direction:column;background:#fff;border:1px solid #cbd5e1;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,.2);overflow:hidden}" +
      ".wa-chat-root.wa-chat-root-popout .wa-chat-toggle{display:none}" +
      ".wa-chat-root.wa-chat-root-popout .wa-chat-window{right:0;bottom:0;inset:0;width:100%;height:100%;border:none;border-radius:0;box-shadow:none}" +
      ".wa-chat-hidden{display:none}" +
      ".wa-chat-header{padding:16px 18px;background:linear-gradient(135deg,#0f766e,#134e4a);color:#fff;font-weight:700;font-size:16px;letter-spacing:.01em;display:flex;align-items:center;justify-content:space-between;gap:10px}" +
      ".wa-chat-header-title{display:flex;align-items:center;gap:10px}" +
      ".wa-chat-header-badge{width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.16);display:inline-flex;align-items:center;justify-content:center;font-size:15px}" +
      ".wa-chat-header-actions{display:flex;align-items:center;gap:8px}" +
      ".wa-chat-icon-button{width:34px;height:34px;border:none;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;font-size:16px;cursor:pointer}" +
      ".wa-chat-messages{flex:1;padding:16px;overflow-y:auto;background:linear-gradient(180deg,#f8fafc 0%,#eef6f5 100%)}" +
      ".wa-chat-message{margin-bottom:14px;display:flex}" +
      ".wa-chat-message-user{justify-content:flex-end}" +
      ".wa-chat-bubble{max-width:85%;padding:11px 14px;border-radius:16px;line-height:1.45;font-size:14px;white-space:pre-wrap;box-shadow:0 6px 18px rgba(15,23,42,.06)}" +
      ".wa-chat-message-user .wa-chat-bubble{background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;border-bottom-right-radius:5px}" +
      ".wa-chat-message-ai .wa-chat-bubble,.wa-chat-message-agent .wa-chat-bubble{background:#ffffff;color:#0f172a;border:1px solid #dbe4ea;border-bottom-left-radius:5px}" +
      ".wa-chat-message-system .wa-chat-bubble{background:#fef3c7;color:#78350f;border:1px solid #fcd34d}" +
      ".wa-chat-form{display:flex;gap:10px;padding:14px;border-top:1px solid #e5e7eb;background:#fff}" +
      ".wa-chat-input,.wa-chat-support-input,.wa-chat-support-textarea{width:100%;padding:11px 13px;border:1px solid #cbd5e1;border-radius:12px;font-size:14px;box-sizing:border-box;background:#fff}" +
      ".wa-chat-input:focus,.wa-chat-support-input:focus,.wa-chat-support-textarea:focus{outline:none;border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.12)}" +
      ".wa-chat-input{flex:1}" +
      ".wa-chat-send,.wa-chat-support-submit{border:none;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;border-radius:12px;padding:11px 16px;cursor:pointer;font-weight:700}" +
      ".wa-chat-send:hover,.wa-chat-support-submit:hover{filter:brightness(1.03)}" +
      ".wa-chat-handoff-panel{margin:0 16px 14px;padding:14px;border:1px solid #a7f3d0;background:linear-gradient(180deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:14px}" +
      ".wa-chat-handoff-copy{margin:0 0 10px;font-size:13px;line-height:1.45;color:#14532d}" +
      ".wa-chat-support-form{display:flex;flex-direction:column;gap:8px}" +
      ".wa-chat-support-actions{display:flex;gap:8px}" +
      ".wa-chat-support-secondary{background:#e5e7eb;color:#0f172a}" +
      ".wa-chat-settings{display:none;margin:0 16px 14px;border:1px solid #cbd5e1;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.08)}" +
      ".wa-chat-settings.wa-chat-settings-open{display:block}" +
      ".wa-chat-settings-item{width:100%;border:none;background:#fff;color:#0f172a;padding:12px 14px;text-align:left;display:flex;justify-content:space-between;align-items:center;font-size:14px}" +
      ".wa-chat-settings-label{display:flex;align-items:center;gap:10px}" +
      ".wa-chat-settings-icon{width:18px;text-align:center;color:#94a3b8;font-size:16px}" +
      ".wa-chat-settings-state{display:flex;align-items:center;gap:8px;color:#475569}" +
      ".wa-chat-settings-item.wa-chat-settings-item-disabled .wa-chat-settings-label-text{color:#94a3b8;text-decoration:line-through}" +
      ".wa-chat-settings-item.wa-chat-settings-item-disabled .wa-chat-settings-state{color:#94a3b8}" +
      ".wa-chat-settings-item + .wa-chat-settings-item{border-top:1px solid #e2e8f0}" +
      "@media (max-width:480px){.wa-chat-root{right:12px;left:12px;bottom:12px}.wa-chat-window{width:100%;height:72vh;right:0;bottom:76px}.wa-chat-toggle{min-width:132px;width:auto;height:54px;padding:0 18px;font-size:15px}.wa-chat-root.wa-chat-root-popout{left:0;bottom:0}}";
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

  function getLiveMessageText(message) {
    if (!message) {
      return "";
    }

    if (message.senderType === "agent" && message.senderName) {
      return message.senderName + " : " + message.text;
    }

    return message.text;
  }

  function playNotificationSound() {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    var audioContext = new AudioContextClass();
    var oscillator = audioContext.createOscillator();
    var gainNode = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.12);
  }

  function isDirectHumanRequest(message) {
    if (!message) {
      return false;
    }

    return /(parler|joindre|contacter|discuter|echanger|échanger).*(agent|humain|personne|support)|agent humain|support humain|parler a un agent|parler à un agent/i.test(
      message
    );
  }

  function init(userConfig) {
    var config = Object.assign({}, defaultConfig, userConfig || {});
    var pageParams = new URLSearchParams(window.location.search);
    var isPopoutMode = pageParams.get("waChatPopout") === "1";

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
    if (isPopoutMode) {
      root.classList.add("wa-chat-root-popout");
    }

    var toggle = document.createElement("button");
    toggle.className = "wa-chat-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Ouvrir le clavardage IA");
    toggle.textContent = config.title;

    var windowEl = document.createElement("div");
    windowEl.className = "wa-chat-window wa-chat-hidden";

    var preferencesKey = "webactionVisitorPreferences";
    var preferences = loadPreferences();

    var header = document.createElement("div");
    header.className = "wa-chat-header";
    header.innerHTML =
      '<div class="wa-chat-header-title"><span class="wa-chat-header-badge">✦</span><span>' +
      config.title +
      '</span></div><div class="wa-chat-header-actions">' +
      '<button type="button" class="wa-chat-icon-button" id="wa-chat-popout-toggle" aria-label="Ouvrir dans une nouvelle fenêtre">↗</button>' +
      '<button type="button" class="wa-chat-icon-button" id="wa-chat-close-toggle" aria-label="Fermer">×</button>' +
      '<button type="button" class="wa-chat-icon-button" id="wa-chat-settings-toggle" aria-label="Préférences">⚙</button>' +
      '</div>';

    var messages = document.createElement("div");
    messages.className = "wa-chat-messages";
    messages.appendChild(createMessage("ai", "Bonjour. Je peux vous aider à trouver rapidement l'information dont vous avez besoin."));

    var settingsPanel = document.createElement("div");
    settingsPanel.className = "wa-chat-settings";
      settingsPanel.innerHTML =
      '<button type="button" class="wa-chat-settings-item" id="wa-chat-change-name"><span class="wa-chat-settings-label"><span class="wa-chat-settings-label-text">Changer le nom d\'usager</span></span><span class="wa-chat-settings-state"><span class="wa-chat-settings-icon">✎</span></span></button>' +
      '<button type="button" class="wa-chat-settings-item" id="wa-chat-toggle-popup"><span class="wa-chat-settings-label"><span class="wa-chat-settings-label-text">Message pop-up</span></span><span class="wa-chat-settings-state"><span id="wa-chat-popup-status">Désactivé</span><span class="wa-chat-settings-icon" id="wa-chat-popup-icon">🗔</span></span></button>' +
      '<button type="button" class="wa-chat-settings-item" id="wa-chat-toggle-sound"><span class="wa-chat-settings-label"><span class="wa-chat-settings-label-text">Son</span></span><span class="wa-chat-settings-state"><span id="wa-chat-sound-status">Activé</span><span class="wa-chat-settings-icon" id="wa-chat-sound-icon">🔊</span></span></button>';

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
    var hasLivePollingStarted = false;

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
    windowEl.appendChild(settingsPanel);
    windowEl.appendChild(handoffPanel);
    windowEl.appendChild(form);

    root.appendChild(windowEl);
    root.appendChild(toggle);
    document.body.appendChild(root);

    if (isPopoutMode) {
      document.title = config.title;
      toggle.style.display = "none";
      document.getElementById("wa-chat-popout-toggle").style.display = "none";
      windowEl.classList.remove("wa-chat-hidden");
    }

    function toggleWindow(forceOpen) {
      if (typeof forceOpen === "boolean") {
        windowEl.classList.toggle("wa-chat-hidden", !forceOpen);
      } else {
        windowEl.classList.toggle("wa-chat-hidden");
      }

      if (!windowEl.classList.contains("wa-chat-hidden")) {
        input.focus();
      }
    }

    function buildPopoutUrl() {
      var popoutUrl = new URL(window.location.href);
      popoutUrl.searchParams.set("waChatPopout", "1");
      return popoutUrl.toString();
    }

    function loadPreferences() {
      try {
        var stored = JSON.parse(window.localStorage.getItem(preferencesKey) || "{}");
        return {
          visitorName: stored.visitorName || "",
          popupEnabled: stored.popupEnabled === true,
          soundEnabled: stored.soundEnabled !== false
        };
      } catch (_error) {
        return {
          visitorName: "",
          popupEnabled: false,
          soundEnabled: true
        };
      }
    }

    function savePreferences() {
      window.localStorage.setItem(preferencesKey, JSON.stringify(preferences));
    }

    function renderPreferences() {
      var popupButton = document.getElementById("wa-chat-toggle-popup");
      var soundButton = document.getElementById("wa-chat-toggle-sound");
      document.getElementById("wa-chat-popup-status").textContent = preferences.popupEnabled ? "Activé" : "Désactivé";
      document.getElementById("wa-chat-sound-status").textContent = preferences.soundEnabled ? "Activé" : "Désactivé";
      document.getElementById("wa-chat-popup-icon").textContent = preferences.popupEnabled ? "🗔" : "🗕";
      document.getElementById("wa-chat-sound-icon").textContent = preferences.soundEnabled ? "🔊" : "🔇";
      popupButton.classList.toggle("wa-chat-settings-item-disabled", !preferences.popupEnabled);
      soundButton.classList.toggle("wa-chat-settings-item-disabled", !preferences.soundEnabled);
      supportName.value = preferences.visitorName;
    }

    function notifyIncomingMessage(text) {
      if (preferences.soundEnabled) {
        playNotificationSound();
      }

      if (!preferences.popupEnabled || !("Notification" in window)) {
        return;
      }

      if (Notification.permission === "granted") {
        new Notification(config.title, { body: text });
      }
    }

    function appendMessage(role, text, options) {
      var settings = options || {};
      messages.appendChild(createMessage(role, text));
      messages.scrollTop = messages.scrollHeight;

      if (settings.notify) {
        notifyIncomingMessage(text);
      }
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

      appendMessage(message.senderType === "visitor" ? "user" : message.senderType, getLiveMessageText(message), {
        notify: hasLivePollingStarted && message.senderType !== "visitor"
      });
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
              throw new Error(data.error || "Impossible d'actualiser le clavardage en direct.");
            }

            return data;
          });
        })
        .then(function (data) {
          (data.messages || []).forEach(function (message) {
            appendLiveMessage(message, { skipVisitorMessages: true });
          });

          if (data.status === "closed") {
            appendMessage("system", "Cette conversation de clavardage en direct a été fermée.");
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
      hasLivePollingStarted = false;

      (initialMessages || []).forEach(function (message) {
        appendLiveMessage(message);
      });

      stopLivePolling();
      hasLivePollingStarted = true;
      livePollTimer = window.setInterval(pollLiveMessages, 3000);
    }

    function showSupportPanel(handoff) {
      currentHandoff = handoff;
      supportMessage.value = lastUserMessage;
      handoffCopy.textContent = handoff.agentAvailable
        ? "Une personne semble disponible. Démarrez une conversation en direct maintenant."
        : "Aucun agent ne semble disponible pour le moment. Envoyez votre demande et l'équipe pourra vous répondre plus tard.";
      supportSubmit.textContent = handoff.agentAvailable ? "Démarrer le clavardage en direct" : "Envoyer la demande";
      handoffPanel.classList.remove("wa-chat-hidden");
    }

    function openHumanSupportFlow() {
      fetch(config.apiUrl.replace(/\/$/, "") + "/human-support-status")
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data.error || "Impossible de vérifier la disponibilité de l'équipe.");
            }

            return data;
          });
        })
        .then(function (data) {
          appendMessage(
            "system",
            data.available
              ? "Je peux vous mettre en relation avec une personne maintenant."
              : "Aucun agent ne semble disponible pour le moment. Vous pouvez laisser une demande de suivi."
          );

          showSupportPanel({
            agentAvailable: Boolean(data.available),
            liveStartEndpoint: "/live-chat/start",
            endpoint: "/human-handoff"
          });
        })
        .catch(function (error) {
          appendMessage(
            "ai",
            error && error.message
              ? error.message
              : "Impossible d'ouvrir le formulaire de soutien humain pour le moment."
          );
        })
        .finally(function () {
          input.disabled = false;
          send.disabled = false;
          input.focus();
        });
    }

    toggle.addEventListener("click", function () {
      toggleWindow();
    });

    document.getElementById("wa-chat-close-toggle").addEventListener("click", function () {
      if (isPopoutMode) {
        window.close();
        return;
      }

      toggleWindow(false);
    });

    document.getElementById("wa-chat-popout-toggle").addEventListener("click", function () {
      window.open(buildPopoutUrl(), "webaction_chat_popout", "width=430,height=760,resizable=yes,scrollbars=no");
    });

    document.getElementById("wa-chat-settings-toggle").addEventListener("click", function () {
      settingsPanel.classList.toggle("wa-chat-settings-open");
    });

    document.getElementById("wa-chat-change-name").addEventListener("click", function () {
      var nextName = window.prompt("Entrez le nom à afficher :", preferences.visitorName || "");
      if (nextName === null) {
        return;
      }

      preferences.visitorName = nextName.trim();
      savePreferences();
      renderPreferences();
    });

    document.getElementById("wa-chat-toggle-sound").addEventListener("click", function () {
      preferences.soundEnabled = !preferences.soundEnabled;
      savePreferences();
      renderPreferences();
    });

    document.getElementById("wa-chat-toggle-popup").addEventListener("click", function () {
      if (!("Notification" in window)) {
        window.alert("Les notifications navigateur ne sont pas supportées ici.");
        return;
      }

      if (!preferences.popupEnabled && Notification.permission !== "granted") {
        Notification.requestPermission().then(function (permission) {
          if (permission === "granted") {
            preferences.popupEnabled = true;
            savePreferences();
            renderPreferences();
          }
        });
        return;
      }

      preferences.popupEnabled = !preferences.popupEnabled;
      savePreferences();
      renderPreferences();
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

      preferences.visitorName = payload.name;
      savePreferences();
      renderPreferences();

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
                throw new Error(data.error || "Impossible de démarrer le clavardage en direct.");
              }

              return data;
            });
          })
          .then(function (data) {
            appendMessage("system", "Le clavardage en direct a démarré. Une personne peut maintenant répondre ici.");
            hideSupportPanel();
            startLivePolling(data.conversationId, data.messages || []);
          })
          .catch(function (error) {
            appendMessage(
              "ai",
              error && error.message ? error.message : "Impossible de démarrer le clavardage en direct."
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
              throw new Error(data.error || "La demande de transfert humain a échoué.");
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
            text: message,
            senderName: preferences.visitorName
          })
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) {
                throw new Error(data.error || "Impossible d'envoyer le message du clavardage en direct.");
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
              error && error.message ? error.message : "Impossible d'envoyer le message du clavardage en direct."
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

      if (isDirectHumanRequest(message)) {
        openHumanSupportFlow();
        return;
      }

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
          appendMessage("ai", data.reply || "Aucune réponse n'a été retournée.", { notify: true });
          if (data.handoffSuggested && data.humanHandoff) {
            showSupportPanel(data.humanHandoff);
          }
        })
        .catch(function (error) {
          appendMessage(
            "ai",
            error && error.message
              ? error.message
              : "Désolé, une erreur est survenue. Veuillez réessayer."
          );
        })
        .finally(function () {
          input.disabled = false;
          send.disabled = false;
          input.focus();
        });
    });

    renderPreferences();
  }

  window.WebactionChat = {
    init: init
  };
})();
