(function () {
  var defaultConfig = {
    apiUrl: "http://localhost:3000",
    siteId: "",
    title: "Assistant IA",
    buttonText: "",
    welcomeMessage: "Bonjour. Je peux vous aider à trouver rapidement l'information dont vous avez besoin.",
    inputPlaceholder: "Écrivez votre message...",
    sendButtonText: "Envoyer",
    primaryColor: "#0f766e",
    primaryDarkColor: "#115e59",
    headerDarkColor: "#134e4a"
  };

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) {
      return;
    }

    var style = document.createElement("style");
    style.textContent =
      ".wa-chat-root{position:fixed;right:20px;bottom:20px;z-index:999999;font-family:Arial,sans-serif;color:#1f2937}" +
      ".wa-chat-toggle{min-width:148px;height:60px;padding:0 22px;border:none;border-radius:999px;background:linear-gradient(135deg,var(--wa-chat-primary,#0f766e),var(--wa-chat-primary-dark,#115e59));color:#fff;font-size:16px;font-weight:800;letter-spacing:.01em;cursor:pointer;box-shadow:0 20px 44px var(--wa-chat-primary-shadow,rgba(15,118,110,.34));line-height:1.1}" +
      ".wa-chat-window{position:absolute;right:0;bottom:80px;width:360px;height:500px;display:flex;flex-direction:column;background:#fff;border:1px solid #cbd5e1;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,.2);overflow:hidden}" +
      ".wa-chat-hidden{display:none}" +
      ".wa-chat-header{padding:16px 18px;background:linear-gradient(135deg,var(--wa-chat-primary,#0f766e),var(--wa-chat-header-dark,#134e4a));color:#fff;font-weight:700;font-size:16px;letter-spacing:.01em;display:flex;align-items:center;justify-content:space-between;gap:10px}" +
      ".wa-chat-header-title{display:flex;align-items:center;gap:10px}" +
      ".wa-chat-header-badge{width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.16);display:inline-flex;align-items:center;justify-content:center;font-size:15px}" +
      ".wa-chat-header-actions{display:flex;align-items:center;gap:8px}" +
      ".wa-chat-icon-button{width:34px;height:34px;border:none;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;font-size:16px;cursor:pointer}" +
      ".wa-chat-messages{flex:1;padding:16px;overflow-y:auto;background:linear-gradient(180deg,#f8fafc 0%,#eef6f5 100%)}" +
      ".wa-chat-message{margin-bottom:14px;display:flex}" +
      ".wa-chat-message-user{justify-content:flex-end}" +
      ".wa-chat-bubble{max-width:85%;padding:11px 14px;border-radius:16px;line-height:1.45;font-size:14px;white-space:pre-wrap;box-shadow:0 6px 18px rgba(15,23,42,.06)}" +
      ".wa-chat-message-user .wa-chat-bubble{background:linear-gradient(135deg,var(--wa-chat-primary,#0f766e),var(--wa-chat-primary-dark,#115e59));color:#fff;border-bottom-right-radius:5px}" +
      ".wa-chat-message-ai .wa-chat-bubble,.wa-chat-message-agent .wa-chat-bubble{background:#ffffff;color:#0f172a;border:1px solid #dbe4ea;border-bottom-left-radius:5px}" +
      ".wa-chat-message-system .wa-chat-bubble{background:#fef3c7;color:#78350f;border:1px solid #fcd34d}" +
      ".wa-chat-message-typing .wa-chat-bubble{display:flex;align-items:center;gap:5px;min-width:54px}" +
      ".wa-chat-typing-dot{width:7px;height:7px;border-radius:999px;background:#94a3b8;display:inline-block;animation:wa-chat-typing-bounce 1s infinite ease-in-out}" +
      ".wa-chat-typing-dot:nth-child(2){animation-delay:.15s}" +
      ".wa-chat-typing-dot:nth-child(3){animation-delay:.3s}" +
      ".wa-chat-composer-stack{display:flex;flex-direction:column;gap:6px;padding:14px;border-top:1px solid #e5e7eb;background:#fff}" +
      ".wa-chat-attachment-row{display:none;align-items:center;gap:8px}" +
      ".wa-chat-attachment-row.wa-chat-attachment-row-active{display:flex}" +
      ".wa-chat-attach{width:28px;height:34px;border:none;background:transparent;color:#64748b;border-radius:8px;padding:4px 0 0;cursor:pointer;line-height:1;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}" +
      ".wa-chat-attach:hover{background:rgba(148,163,184,.14);color:#0f172a}" +
      ".wa-chat-attach svg{width:22px;height:22px;display:block}" +
      ".wa-chat-attachment-name{font-size:12px;color:#475569;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".wa-chat-form{display:flex;gap:6px}" +
      ".wa-chat-input,.wa-chat-support-input,.wa-chat-support-textarea{width:100%;padding:11px 13px;border:1px solid #cbd5e1;border-radius:12px;font-size:14px;box-sizing:border-box;background:#fff}" +
      ".wa-chat-input:focus,.wa-chat-support-input:focus,.wa-chat-support-textarea:focus{outline:none;border-color:var(--wa-chat-primary,#0f766e);box-shadow:0 0 0 3px var(--wa-chat-focus-shadow,rgba(15,118,110,.12))}" +
      ".wa-chat-input{flex:1;min-width:0}" +
      ".wa-chat-send,.wa-chat-support-submit{border:none;background:linear-gradient(135deg,var(--wa-chat-primary,#0f766e),var(--wa-chat-primary-dark,#115e59));color:#fff;border-radius:12px;padding:11px 12px;cursor:pointer;font-weight:700;flex:0 0 auto}" +
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
      "@keyframes wa-chat-typing-bounce{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-3px);opacity:1}}" +
      "@media (max-width:480px){.wa-chat-root{right:12px;left:12px;bottom:12px}.wa-chat-window{width:100%;height:72vh;right:0;bottom:76px}.wa-chat-toggle{min-width:132px;width:auto;height:54px;padding:0 18px;font-size:15px}}";
    document.head.appendChild(style);
    stylesInjected = true;
  }

  function createMessage(role, text, options) {
    var settings = options || {};
    var message = document.createElement("div");
    message.className = "wa-chat-message wa-chat-message-" + role;

    var bubble = document.createElement("div");
    bubble.className = "wa-chat-bubble";
    bubble.textContent = text || "";

    message.appendChild(bubble);

    if (settings.attachment && settings.attachment.name) {
      var attachmentLink = document.createElement("a");
      attachmentLink.style.display = "block";
      attachmentLink.style.marginTop = "8px";
      attachmentLink.style.fontSize = "13px";
      attachmentLink.style.wordBreak = "break-word";
      attachmentLink.textContent = "Pièce jointe : " + settings.attachment.name;

      if (settings.attachment.url) {
        attachmentLink.href = settings.attachment.url;
        attachmentLink.target = "_blank";
        attachmentLink.rel = "noopener noreferrer";
      } else {
        attachmentLink.href = "#";
      }

      bubble.appendChild(attachmentLink);
    }

    return message;
  }

  function createTypingMessage(role) {
    var message = document.createElement("div");
    message.className = "wa-chat-message wa-chat-message-" + role + " wa-chat-message-typing";

    var bubble = document.createElement("div");
    bubble.className = "wa-chat-bubble";
    bubble.innerHTML =
      '<span class="wa-chat-typing-dot"></span>' +
      '<span class="wa-chat-typing-dot"></span>' +
      '<span class="wa-chat-typing-dot"></span>';

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

  function getAttachmentOnlyText(role) {
    if (role === "agent") {
      return "Pièce jointe envoyée.";
    }

    if (role === "user" || role === "visitor") {
      return "Pièce jointe envoyée.";
    }

    return "Pièce jointe.";
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

    return /(parler|joindre|contacter|discuter|echanger|échanger).*(agent|humain|personne|support)|agent humain|support humain|parler a un agent|parler à un agent|agent en ligne|agent disponible|parler a une personne|parler à une personne|personne en ligne|support en ligne/i.test(
      message
    );
  }

  function isFallbackReply(text) {
    if (!text) {
      return false;
    }

    return /not found on the website|not found on the site|could not find|couldn't find|pas d['’]information|n['’]y a pas d['’]information|n['’]a pas été trouvée sur le site|n['’]a pas ete trouvee sur le site|je n['’]ai pas trouvé de réponse fiable|je n['’]ai pas trouve de reponse fiable|veuillez contacter|contactez le support|adresse email fournie|communiquer avec un agent humain/i.test(
      text
    );
  }

  function hexToRgba(hexColor, opacity) {
    var normalized = String(hexColor || "").trim();
    var match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(normalized);
    if (!match) {
      return "";
    }

    var value = match[1];
    if (value.length === 3) {
      value = value.split("").map(function (char) {
        return char + char;
      }).join("");
    }

    var red = parseInt(value.slice(0, 2), 16);
    var green = parseInt(value.slice(2, 4), 16);
    var blue = parseInt(value.slice(4, 6), 16);

    return "rgba(" + red + "," + green + "," + blue + "," + opacity + ")";
  }

  function hasOwnConfig(config, key) {
    return Object.prototype.hasOwnProperty.call(config || {}, key);
  }

  function applyTheme(root, config, userConfig) {
    var suppliedConfig = userConfig || {};
    var primaryColor = config.primaryColor || defaultConfig.primaryColor;
    var primaryDarkColor = hasOwnConfig(suppliedConfig, "primaryDarkColor")
      ? config.primaryDarkColor
      : hasOwnConfig(suppliedConfig, "primaryColor")
        ? primaryColor
        : defaultConfig.primaryDarkColor;
    var headerDarkColor = hasOwnConfig(suppliedConfig, "headerDarkColor")
      ? config.headerDarkColor
      : hasOwnConfig(suppliedConfig, "primaryColor")
        ? primaryDarkColor
        : defaultConfig.headerDarkColor;

    root.style.setProperty("--wa-chat-primary", primaryColor);
    root.style.setProperty("--wa-chat-primary-dark", primaryDarkColor);
    root.style.setProperty("--wa-chat-header-dark", headerDarkColor);
    root.style.setProperty("--wa-chat-primary-shadow", hexToRgba(primaryColor, 0.34) || "rgba(15,118,110,.34)");
    root.style.setProperty("--wa-chat-focus-shadow", hexToRgba(primaryColor, 0.12) || "rgba(15,118,110,.12)");
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
    applyTheme(root, config, userConfig);

    var toggle = document.createElement("button");
    toggle.className = "wa-chat-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Ouvrir le clavardage IA");
    toggle.textContent = config.buttonText || config.title;

    var windowEl = document.createElement("div");
    windowEl.className = "wa-chat-window wa-chat-hidden";

    var preferencesKey = "webactionVisitorPreferences";
    var chatStateKey = "webactionChatState:" + config.siteId;
    var preferences = loadPreferences();

    var header = document.createElement("div");
    header.className = "wa-chat-header";
    header.innerHTML =
      '<div class="wa-chat-header-title"><span class="wa-chat-header-badge">✦</span><span>' +
      config.title +
      '</span></div><div class="wa-chat-header-actions">' +
      '<button type="button" class="wa-chat-icon-button" id="wa-chat-settings-toggle" aria-label="Préférences">⚙</button>' +
      '<button type="button" class="wa-chat-icon-button" id="wa-chat-close-toggle" aria-label="Fermer">×</button>' +
      '</div>';

    var messages = document.createElement("div");
    messages.className = "wa-chat-messages";

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

    var composer = document.createElement("div");
    composer.className = "wa-chat-composer-stack";

    var attachmentRow = document.createElement("div");
    attachmentRow.className = "wa-chat-attachment-row";

    var attachButton = document.createElement("button");
    attachButton.className = "wa-chat-attach";
    attachButton.type = "button";
    attachButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm6 2v4h4z"/>' +
      '<path fill="#f8fafc" d="M8 12h8v1.6H8zm0 3.2h8v1.6H8zm0-6.4h4.5v1.6H8z"/>' +
      '</svg>';
    attachButton.title = "Joindre un fichier";
    attachButton.setAttribute("aria-label", "Joindre un fichier");

    var attachmentName = document.createElement("div");
    attachmentName.className = "wa-chat-attachment-name";
    attachmentName.textContent = "";

    var attachmentInput = document.createElement("input");
    attachmentInput.type = "file";
    attachmentInput.accept = "image/*,.txt,.md,.csv,.json";
    attachmentInput.style.display = "none";

    attachmentRow.appendChild(attachmentName);
    attachmentRow.appendChild(attachmentInput);

    var form = document.createElement("form");
    form.className = "wa-chat-form";
    var lastUserMessage = "";
    var currentHandoff = null;
    var activeConversationId = null;
    var livePollTimer = null;
    var lastLiveMessageAt = "";
    var seenLiveMessageIds = {};
    var hasLivePollingStarted = false;
    var aiTypingEl = null;
    var agentTypingEl = null;
    var visitorTypingTimer = null;
    var lastVisitorTypingState = false;
    var displayedMessages = [];
    var pendingAttachment = null;

    var input = document.createElement("input");
    input.className = "wa-chat-input";
    input.type = "text";
    input.placeholder = config.inputPlaceholder;

    var send = document.createElement("button");
    send.className = "wa-chat-send";
    send.type = "submit";
    send.textContent = config.sendButtonText;

    form.appendChild(attachButton);
    form.appendChild(input);
    form.appendChild(send);

    windowEl.appendChild(header);
    windowEl.appendChild(messages);
    windowEl.appendChild(settingsPanel);
    windowEl.appendChild(handoffPanel);
    composer.appendChild(attachmentRow);
    composer.appendChild(form);
    windowEl.appendChild(composer);

    root.appendChild(windowEl);
    root.appendChild(toggle);
    document.body.appendChild(root);

    function loadChatState() {
      try {
        var stored = JSON.parse(window.sessionStorage.getItem(chatStateKey) || "{}");
        return {
          isOpen: stored.isOpen === true,
          activeConversationId: stored.activeConversationId || null,
          lastLiveMessageAt: stored.lastLiveMessageAt || "",
          seenLiveMessageIds: stored.seenLiveMessageIds || {},
          lastUserMessage: stored.lastUserMessage || "",
          currentHandoff: stored.currentHandoff || null,
          messages: Array.isArray(stored.messages) ? stored.messages : []
        };
      } catch (_error) {
        return {
          isOpen: false,
          activeConversationId: null,
          lastLiveMessageAt: "",
          seenLiveMessageIds: {},
          lastUserMessage: "",
          currentHandoff: null,
          messages: []
        };
      }
    }

    function saveChatState() {
      window.sessionStorage.setItem(chatStateKey, JSON.stringify({
        isOpen: !windowEl.classList.contains("wa-chat-hidden"),
        activeConversationId: activeConversationId,
        lastLiveMessageAt: lastLiveMessageAt,
        seenLiveMessageIds: seenLiveMessageIds,
        lastUserMessage: lastUserMessage,
        currentHandoff: currentHandoff,
        messages: displayedMessages
      }));
    }

    function renderStoredMessages() {
      messages.innerHTML = "";
      displayedMessages.forEach(function (item) {
        messages.appendChild(createMessage(item.role, item.text, {
          attachment: item.attachment || null
        }));
      });
      messages.scrollTop = messages.scrollHeight;
    }

    function resolveAttachmentUrl(attachment) {
      if (!attachment || !attachment.relativeUrl) {
        return "";
      }

      return config.apiUrl.replace(/\/$/, "") + attachment.relativeUrl;
    }

    function setPendingAttachment(attachment) {
      pendingAttachment = attachment;
      attachmentName.textContent = attachment ? attachment.name : "";
      attachmentRow.classList.toggle("wa-chat-attachment-row-active", Boolean(attachment));
      saveChatState();
    }

    function toggleWindow(forceOpen) {
      if (typeof forceOpen === "boolean") {
        windowEl.classList.toggle("wa-chat-hidden", !forceOpen);
      } else {
        windowEl.classList.toggle("wa-chat-hidden");
      }

      saveChatState();

      if (!windowEl.classList.contains("wa-chat-hidden")) {
        input.focus();
      }
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
      displayedMessages.push({
        role: role,
        text: text,
        attachment: settings.attachment || null
      });
      messages.appendChild(createMessage(role, text, {
        attachment: settings.attachment || null
      }));
      messages.scrollTop = messages.scrollHeight;
      saveChatState();

      if (settings.notify) {
        notifyIncomingMessage(text);
      }
    }

    function showTypingIndicator(role) {
      var currentEl = role === "agent" ? agentTypingEl : aiTypingEl;
      if (currentEl) {
        return;
      }

      currentEl = createTypingMessage(role);
      messages.appendChild(currentEl);
      messages.scrollTop = messages.scrollHeight;

      if (role === "agent") {
        agentTypingEl = currentEl;
      } else {
        aiTypingEl = currentEl;
      }
    }

    function hideTypingIndicator(role) {
      var currentEl = role === "agent" ? agentTypingEl : aiTypingEl;
      if (!currentEl) {
        return;
      }

      currentEl.remove();

      if (role === "agent") {
        agentTypingEl = null;
      } else {
        aiTypingEl = null;
      }

      saveChatState();
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

      if (message.senderType === "agent") {
        hideTypingIndicator("agent");
      }

      var attachment = message.attachment
        ? {
            name: message.attachment.name,
            url: resolveAttachmentUrl(message.attachment)
          }
        : null;

      var visibleText = getLiveMessageText(message);
      if (!visibleText && attachment) {
        visibleText = getAttachmentOnlyText(message.senderType === "visitor" ? "user" : message.senderType);
      }

      appendMessage(message.senderType === "visitor" ? "user" : message.senderType, visibleText, {
        notify: hasLivePollingStarted && message.senderType !== "visitor",
        attachment: attachment
      });
    }

    function stopLivePolling() {
      if (livePollTimer) {
        window.clearInterval(livePollTimer);
        livePollTimer = null;
      }

      saveChatState();
    }

    function hideSupportPanel() {
      currentHandoff = null;
      handoffPanel.classList.add("wa-chat-hidden");
      handoffCopy.textContent = "";
      supportMessage.value = "";
      saveChatState();
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
          if (data.agentTyping) {
            showTypingIndicator("agent");
          } else {
            hideTypingIndicator("agent");
          }

          (data.messages || []).forEach(function (message) {
            appendLiveMessage(message, { skipVisitorMessages: true });
          });

          if (data.status === "closed") {
            appendMessage("system", "Cette conversation de clavardage en direct a été fermée.");
            activeConversationId = null;
            stopLivePolling();
            saveChatState();
          }
        })
        .catch(function (error) {
          var normalizedError = error && error.message ? error.message.toLowerCase() : "";

          if (normalizedError.indexOf("unknown conversationid") !== -1) {
            hideTypingIndicator("agent");
            appendMessage("system", "Cette conversation de clavardage en direct a été fermée.");
            activeConversationId = null;
            stopLivePolling();
            saveChatState();
            return;
          }

          stopLivePolling();
        });
    }

    function updateVisitorTypingState(isTyping) {
      if (!activeConversationId || lastVisitorTypingState === Boolean(isTyping)) {
        return;
      }

      lastVisitorTypingState = Boolean(isTyping);

      fetch(config.apiUrl.replace(/\/$/, "") + "/live-chat/" + activeConversationId + "/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isTyping: lastVisitorTypingState
        })
      }).catch(function () {
        return null;
      });
    }

    function startLivePolling(conversationId, initialMessages) {
      activeConversationId = conversationId;
      lastLiveMessageAt = "";
      seenLiveMessageIds = {};
      hasLivePollingStarted = false;
      lastVisitorTypingState = false;

      (initialMessages || []).forEach(function (message) {
        appendLiveMessage(message);
      });

      stopLivePolling();
      hasLivePollingStarted = true;
      livePollTimer = window.setInterval(pollLiveMessages, 3000);
      saveChatState();
    }

    function showSupportPanel(handoff) {
      currentHandoff = handoff;
      supportMessage.value = lastUserMessage;
      handoffCopy.textContent = handoff.agentAvailable
        ? "Une personne semble disponible. Démarrez une conversation en direct maintenant."
        : "Aucun agent ne semble disponible pour le moment. Envoyez votre demande et l'équipe pourra vous répondre plus tard.";
      supportSubmit.textContent = handoff.agentAvailable ? "Démarrer le clavardage en direct" : "Envoyer la demande";
      handoffPanel.classList.remove("wa-chat-hidden");
      saveChatState();
    }

    function openHumanSupportFlow() {
      var statusUrl = config.apiUrl.replace(/\/$/, "") + "/human-support-status?siteId=" + encodeURIComponent(config.siteId);
      fetch(statusUrl)
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
      toggleWindow(false);
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

    attachButton.addEventListener("click", function () {
      attachmentInput.click();
    });

    attachmentInput.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) {
        setPendingAttachment(null);
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        setPendingAttachment({
          name: file.name,
          type: file.type || "application/octet-stream",
          dataUrl: String(reader.result || "")
        });
      };
      reader.readAsDataURL(file);
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
        message: supportMessage.value.trim() || lastUserMessage || (pendingAttachment ? getAttachmentOnlyText("user") : ""),
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
            pageUrl: payload.pageUrl,
            attachment: pendingAttachment
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
            setPendingAttachment(null);
            attachmentInput.value = "";
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
          mode: "request",
          attachment: pendingAttachment
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
          setPendingAttachment(null);
          attachmentInput.value = "";
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
      if (!message && !pendingAttachment) {
        return;
      }

      if (activeConversationId) {
        appendMessage("user", message || (pendingAttachment ? getAttachmentOnlyText("user") : ""), {
          attachment: pendingAttachment
            ? { name: pendingAttachment.name }
            : null
        });
        updateVisitorTypingState(false);
        input.value = "";

        fetch(config.apiUrl.replace(/\/$/, "") + "/live-chat/" + activeConversationId + "/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: message,
            senderName: preferences.visitorName,
            attachment: pendingAttachment
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
              saveChatState();
            }
            setPendingAttachment(null);
            attachmentInput.value = "";
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
      appendMessage("user", message || (pendingAttachment ? getAttachmentOnlyText("user") : ""), {
        attachment: pendingAttachment
          ? { name: pendingAttachment.name }
          : null
      });
      input.value = "";
      input.disabled = true;
      send.disabled = true;

      if (isDirectHumanRequest(message)) {
        openHumanSupportFlow();
        return;
      }

      showTypingIndicator("ai");

      fetch(config.apiUrl.replace(/\/$/, "") + "/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message,
          siteId: config.siteId,
          attachment: pendingAttachment
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
          hideTypingIndicator("ai");
          var shouldOpenHumanFlow = Boolean(data.handoffSuggested) || isFallbackReply(data.reply);

          if (shouldOpenHumanFlow && data.humanHandoff) {
            appendMessage(
              "system",
              data.humanHandoff.agentAvailable
                ? "Je n'ai pas trouvé de réponse fiable sur le site. Je vous mets en relation avec une personne."
                : "Je n'ai pas trouvé de réponse fiable sur le site. Vous pouvez envoyer une demande à une personne."
            );
            showSupportPanel(data.humanHandoff);
            setPendingAttachment(null);
            attachmentInput.value = "";
            return;
          }

          if (shouldOpenHumanFlow) {
            openHumanSupportFlow();
            setPendingAttachment(null);
            attachmentInput.value = "";
            return;
          }

          appendMessage("ai", data.reply || "Aucune réponse n'a été retournée.", { notify: true });
          setPendingAttachment(null);
          attachmentInput.value = "";
        })
        .catch(function (error) {
          hideTypingIndicator("ai");
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

    input.addEventListener("input", function (event) {
      if (!activeConversationId) {
        return;
      }

      var hasText = Boolean(event.target.value.trim());
      updateVisitorTypingState(hasText);

      if (visitorTypingTimer) {
        window.clearTimeout(visitorTypingTimer);
      }

      if (hasText) {
        visitorTypingTimer = window.setTimeout(function () {
          updateVisitorTypingState(false);
        }, 2500);
      }
    });

    var restoredState = loadChatState();
    displayedMessages = restoredState.messages.slice();
    lastUserMessage = restoredState.lastUserMessage || "";
    currentHandoff = restoredState.currentHandoff || null;
    activeConversationId = restoredState.activeConversationId || null;
    lastLiveMessageAt = restoredState.lastLiveMessageAt || "";
    seenLiveMessageIds = restoredState.seenLiveMessageIds || {};

    if (displayedMessages.length === 0) {
      appendMessage("ai", config.welcomeMessage);
    } else {
      renderStoredMessages();
      if (currentHandoff) {
        showSupportPanel(currentHandoff);
      }
    }

    if (restoredState.isOpen) {
      toggleWindow(true);
    }

    if (activeConversationId) {
      hasLivePollingStarted = true;
      livePollTimer = window.setInterval(pollLiveMessages, 3000);
      pollLiveMessages();
    }

    renderPreferences();
  }

  window.WebactionChat = {
    init: init
  };
})();
