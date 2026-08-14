# Transfert Codex - Webaction AI Chat

Derniere mise a jour : 2026-08-13

## Instruction prioritaire pour le prochain Codex

Lire ce document au complet avant toute modification. Ensuite :

1. Executer `git status --short` et ne jamais annuler une modification existante sans autorisation.
2. Inspecter les fichiers concernes avant de proposer ou appliquer un changement.
3. Distinguer l'etat du depot local de l'etat du serveur de production.
4. Ne jamais afficher, recopier ou committer une cle de tableau de bord, une cle OpenAI, un mot de passe SMTP ou un acces FTP.
5. Verifier les routes de production avant de conclure qu'un probleme vient du code.

Le depot etait sur `main` au commit `16d0c38` lors de la creation de ce transfert. Le fichier `.gitignore` avait deja une modification locale qui n'a pas ete faite ni annulee pour ce transfert.

## Objectif du projet

Le projet fournit un clavardage IA multi-client que Webaction integre dans des sites Joomla ou autres sites web. Un seul backend central gere :

- l'enregistrement des clients;
- l'indexation et le crawl de leur site;
- les reponses IA basees sur le contenu du site;
- le transfert vers un humain;
- le clavardage en direct avec un agent;
- l'envoi de demandes de suivi par courriel;
- les tableaux de bord d'agents proteges par une cle propre a chaque client.

Le backend de production est centralise ici :

```text
https://life.webactiondemo.ca/ai
```

Le widget public principal est servi ici :

```text
https://life.webactiondemo.ca/ai/widget/chat-widget.js
```

Il n'est normalement pas necessaire de redeployer le backend complet sur le FTP de chaque client. Le site client charge le widget distant et communique avec l'API centrale.

## Architecture locale

- `backend/server.js` : API Express, routes publiques, authentification du tableau de bord et appels OpenAI.
- `backend/services/siteRegistryService.js` : registre multi-client JSON, creation des `client-XXX` et des cles de tableau de bord.
- `backend/services/retrievalService.js` : index en memoire, recherche par mots-cles et extraction des courriels/telephones.
- `backend/services/siteCrawler.js` : crawl des pages du site.
- `backend/services/contentExtraction.js` : extraction du texte HTML.
- `backend/services/emailService.js` : envoi SMTP avec Nodemailer.
- `backend/services/liveChatService.js` : conversations, disponibilite des agents et messages en JSON.
- `backend/services/humanHandoffService.js` : demandes de suivi humain.
- `backend/services/attachmentService.js` : pieces jointes.
- `backend/public/agent/live-chat.html` : interface du tableau de bord agent.
- `widget/chat-widget.js` : widget JavaScript autonome integre chez les clients.
- `backend/data/sites.json` : registre local des clients.

Le registre et l'index ne sont pas une base de donnees :

- les clients sont stockes dans un fichier JSON;
- les conversations et demandes sont aussi stockees en JSON;
- l'index RAG est en memoire et disparait au redemarrage du processus Node;
- apres un redemarrage, la premiere question peut provoquer une reindexation automatique, ou on peut appeler `/index-site` explicitement.

## Etat local et production

Le fichier local `backend/data/sites.json` ne contient actuellement que le client d'exemple `client-001`. Il ne faut pas remplacer le registre de production avec ce fichier local.

Les clients ci-dessous ont ete observes en production pendant la conversation precedente. Toujours les reverifier avec `GET /ai/sites` avant une operation importante.

| Site ID | Nom | URL | Courriel de soutien |
| --- | --- | --- | --- |
| `client-001` | Example Client | `https://example.com` | valeur d'exemple/production a reverifier |
| `client-002` | Life Webaction Demo | `https://life.webactiondemo.ca` | `info@webaction.ca` |
| `client-003` | Webaction | `https://webaction.ca` | `info@webaction.ca` |
| `client-004` | McConnery | `https://mcconnery.ca` | `smcconnery44@gmail.com` |

Les cles des tableaux de bord ne sont volontairement pas inscrites ici. Elles sont sensibles. Elles se trouvent dans le `backend/data/sites.json` du serveur de production et sont aussi retournees par `POST /register-site` lors de la creation ou mise a jour d'un site.

## Commandes PowerShell de production

Ces commandes se lancent dans PowerShell sur l'ordinateur de l'administrateur, pas dans le terminal SSH du cPanel.

Verifier le backend :

```powershell
Invoke-RestMethod -Uri "https://life.webactiondemo.ca/ai/health" -Method Get
```

Lister les clients :

```powershell
Invoke-RestMethod -Uri "https://life.webactiondemo.ca/ai/sites" -Method Get
```

Afficher un client :

```powershell
Invoke-RestMethod -Uri "https://life.webactiondemo.ca/ai/sites/client-004" -Method Get
```

Creer un client ou mettre a jour un client ayant deja la meme URL :

```powershell
$body = @{
  siteUrl = "https://mcconnery.ca/"
  siteName = "McConnery"
  supportEmail = "smcconnery44@gmail.com"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://life.webactiondemo.ca/ai/register-site" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Reindexer un client apres une mise a jour de son site :

```powershell
Invoke-RestMethod `
  -Uri "https://life.webactiondemo.ca/ai/index-site" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"siteId":"client-004"}'
```

Verifier son index :

```powershell
Invoke-RestMethod `
  -Uri "https://life.webactiondemo.ca/ai/site-index/client-004" `
  -Method Get
```

La route `POST /register-site` indexe automatiquement le site et retourne notamment `siteId`, `dashboardUrl`, `dashboardKey`, `widgetUrl`, `apiUrl`, `embedCode` et `indexSummary`.

## Integration du widget

Mode recommande : charger le widget depuis le backend central, puis initialiser le bon `siteId`.

```html
<script src="https://life.webactiondemo.ca/ai/widget/chat-widget.js"></script>
<script>
WebactionChat.init({
  apiUrl: "https://life.webactiondemo.ca/ai",
  siteId: "client-004",
  title: "Assistant IA",
  buttonText: "Clavardage",
  welcomeMessage: "Bonjour, comment pouvons-nous vous aider ?",
  inputPlaceholder: "Ecrivez votre question...",
  sendButtonText: "Envoyer",
  fontFamily: "Roboto, Arial, sans-serif",
  primaryColor: "#0f766e",
  primaryDarkColor: "#115e59",
  headerDarkColor: "#134e4a"
});
</script>
```

Les couleurs Webaction utilisees pendant le travail sont :

- principale : `#0f766e`;
- principale foncee : `#115e59`;
- entete foncee : `#134e4a`.

Le widget utilise `Arial, sans-serif` par defaut. Pour confirmer Roboto dans le navigateur : inspecter `#wa-chat-root`, puis regarder la valeur calculee de `font-family`. Si Roboto n'est pas deja chargee par le site, fournir aussi un `fontUrl` valide ou charger la police dans le template.

### Emplacement Joomla

Preferer, dans cet ordre :

1. le champ de code personnalise du template, juste avant `</body>`;
2. un module HTML personnalise publie sur toutes les pages, sans filtrage du JavaScript;
3. le fichier `index.php` du template, juste avant `</body>`, si aucune option plus propre n'existe.

Une mise a jour du template peut ecraser une modification directe de son `index.php`. Toujours faire une copie avant modification.

### McConnery

Le site `https://mcconnery.ca/` utilise Joomla avec Helix Ultimate/SP Page Builder et le template `ut_seguro`. Le fichier repere dans cPanel est :

```text
/domains/mcconnery.ca/public_html/templates/ut_seguro/index.php
```

Pour ce site, utiliser `client-004`. Si le site est encore en construction, demander a Antoni de prevenir lorsque le contenu sera final, puis relancer l'indexation de `client-004`.

### Webaction

Le site `https://webaction.ca/` utilise Joomla/YOOtheme. Il est associe a `client-003`. Le widget peut etre charge directement depuis `life.webactiondemo.ca/ai`; il n'est pas necessaire de copier le projet complet dans le FTP de Webaction.

## Tableau de bord agent

Format du lien :

```text
https://life.webactiondemo.ca/ai/agent/live-chat.html?siteId=client-004&key=CLE_DU_SITE
```

Ne jamais committer ou partager publiquement la vraie valeur de `key`.

Le backend accepte :

- une cle globale `AGENT_DASHBOARD_KEY` pour tous les sites;
- une `dashboardKey` propre au site, stockee dans le registre de production.

Le tableau de bord permet de :

- mettre l'agent disponible ou indisponible;
- voir les conversations autorisees pour le site;
- repondre au visiteur;
- afficher l'etat de saisie;
- fermer ou supprimer une conversation.

## Fonctionnement du transfert humain et des courriels

Un message IA normal n'envoie pas automatiquement un courriel. Le courriel est envoye seulement lorsqu'un visiteur remplit et soumet le formulaire de suivi humain.

Flux attendu :

1. L'IA repond a partir du contenu indexe.
2. Si elle ne trouve pas de reponse fiable, le widget propose une aide humaine.
3. Le visiteur peut aussi demander directement a parler a un agent.
4. Si un agent est disponible, le widget cree une conversation via `/live-chat/start`.
5. Sinon, le formulaire appelle `/human-handoff`.
6. `/human-handoff` enregistre la demande et l'envoie par SMTP au `supportEmail` du client.
7. Si le site n'a pas de `supportEmail`, le backend utilise `DEFAULT_SUPPORT_EMAIL`.

Pour `client-004`, le destinataire attendu est `smcconnery44@gmail.com`, pas `info@webaction.ca`. Tester en mettant l'agent hors ligne, demander une personne, remplir un courriel visiteur et soumettre le formulaire. Ensuite verifier la boite de reception et les pourriels.

Variables SMTP requises dans le `.env` de production :

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
```

Ne jamais copier les valeurs reelles dans ce document ou dans Git.

## Incident Imunify/OpenResty deja rencontre

Un incident de securite serveur a donne plusieurs faux symptomes de panne du code :

- PowerShell retournait une longue page HTML `One moment, please...` et `Please wait while your request is being verified...` au lieu du JSON;
- `/ai/sites`, `/ai/register-site` et `/ai/index-site` etaient touches;
- le chargement cross-site de `chat-widget.js` retournait parfois `415 Unsupported Media Type` avec `Content-Type: text/html`;
- la console du navigateur affichait `WebactionChat is not defined` parce que le fichier JavaScript n'avait jamais ete charge;
- le widget pouvait etre visible sur mobile mais pas sur ordinateur, car l'IP, la session, le cache ou les controles anti-bot differaient;
- Imunify360 affichait `Imunify installation is not finished yet` et parfois `[Errno 104] Connection reset by peer`;
- lorsque le service Imunify est redevenu fonctionnel, les commandes PowerShell et le widget ont recommence a fonctionner sans correction du code.

Conclusion de l'incident : la cause etait la couche de securite/hebergement devant Node, probablement Imunify360/OpenResty/WebShield, et non `Invoke-RestMethod`, Joomla ou `chat-widget.js`.

L'adresse IP publique utilisee pendant l'incident etait `142.186.46.15`, mais elle peut changer. Toujours verifier l'IP actuelle avant une demande de safelist.

Une exclusion de la regle WAF `33345` avait ete ajoutee pour une detection de connexion Joomla. Cette regle n'expliquait pas a elle seule le blocage de `/ai/*`. Ne pas desactiver durablement tout le WAF sans diagnostic.

### Diagnostic rapide si cela revient

1. Tester `https://life.webactiondemo.ca/ai/health` dans le navigateur et PowerShell.
2. Verifier si la reponse est du JSON ou une page de verification HTML.
3. Dans DevTools > Network, inspecter le statut et le `Content-Type` de `chat-widget.js`.
4. Tester le backend directement depuis le serveur Node ou le terminal cPanel si possible.
5. Verifier que l'application Node est demarree dans `Setup Node.js App`.
6. Consulter Imunify360, Web Application Firewall et les journaux OpenResty.
7. Demander a l'hebergeur d'exclure `/ai/*` des controles anti-bot/challenge qui exigent JavaScript, tout en conservant une protection adaptee.

Une API ne peut pas resoudre un challenge JavaScript interactif. Les routes JSON et le fichier `.js` doivent etre servis directement.

## Application Node en production

La configuration observee dans cPanel etait :

```text
Application root: webaction-ai-chat/backend
Application URL: life.webactiondemo.ca/ai
Application startup file: server.js
Node.js: 22.22.0
Mode: Production
```

Le port `3000` n'est pas necessairement accessible directement depuis le shell du compte. Sur cPanel/Passenger, le proxy public peut injecter son propre port ou socket. Un `curl http://127.0.0.1:3000/health` refuse ne prouve donc pas a lui seul que l'application publique est arretee.

Apres un changement de code ou de variables d'environnement, utiliser le bouton `Restart` de `Setup Node.js App`, puis verifier `/ai/health`.

## Developpement local

Depuis le dossier `backend/` :

```bash
npm install
npm start
```

Le `.env` local doit contenir au minimum `OPENAI_API_KEY`; les fonctions courriel exigent aussi les variables SMTP. Le fichier `.env` ne doit jamais etre commite.

URLs locales par defaut :

```text
http://localhost:3000/health
http://localhost:3000/widget/chat-widget.js
```

## Limites et risques connus

- `GET /sites`, `POST /register-site` et `POST /index-site` ne sont actuellement pas proteges par une authentification admin dans `backend/server.js`. C'est une priorite de securisation.
- Le registre JSON de production doit etre sauvegarde avant tout redeploiement.
- L'index en memoire disparait lors d'un redemarrage.
- Le crawl et la recherche sont simples; il n'y a pas encore d'embeddings ni de base vectorielle.
- Le stockage JSON n'est pas ideal pour plusieurs processus ou beaucoup de trafic.
- La configuration CORS est actuellement generale avec `cors()`.
- Les cles dans les URLs de tableau de bord peuvent apparaitre dans l'historique du navigateur ou les journaux. Une future authentification par session serait preferable.
- Le README indique encore certaines limites historiques; le code actuel comprend bien un tableau de bord agent et une authentification par cle.

## Regles de travail pour la suite

- Ne pas supprimer/recreer un client simplement pour le reindexer; utiliser `/index-site`.
- `POST /register-site` avec la meme URL met a jour le nom et le courriel du client existant au lieu de creer un doublon.
- Ne pas recopier le `backend/data/sites.json` local vers la production.
- Sauvegarder les fichiers JSON de production avant un deploiement.
- Ne pas conclure `probleme de code` tant que les statuts HTTP et les reponses OpenResty/Imunify n'ont pas ete verifies.
- Ne pas confondre le chargement du widget et le fonctionnement de l'API : le widget peut s'afficher, mais afficher `Failed to fetch` si `/chat` est bloque.
- Ne pas pretendre qu'un courriel a ete envoye sans reponse SMTP reussie et verification des journaux ou de la boite destinataire.

## Prompt de reprise recommande

Dans un nouveau chat Codex ouvert sur ce depot, envoyer :

```text
Lis CODEX_HANDOFF.md au complet avant de faire quoi que ce soit. Ensuite, verifie l'etat actuel du depot avec git status et inspecte les fichiers concernes. Utilise le document comme contexte historique, mais reverifie l'etat de production avant toute conclusion. Ne revele aucune cle ou valeur secrete.
```
