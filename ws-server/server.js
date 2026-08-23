
/**
 * WebSocket broadcast server for CTF Arena.
 * - WS clients connect on ws://host/ws (proxied by nginx)
 * - PHP backend notifies via HTTP POST /notify {"type":"...", "targetUserId"?: number}
 *   - Sans targetUserId : broadcast à tous les clients
 *   - Avec targetUserId : envoi uniquement aux connexions de cet utilisateur
 * - Les clients s'enregistrent après connexion : {"action":"register","userId":"123"}
 *
 * Sécurité /notify :
 *   - Chaque requête POST /notify doit porter le header X-Notify-Secret
 *   - La valeur doit correspondre à la variable d'env NOTIFY_SECRET
 *   - Si absente ou incorrecte : 401 Unauthorized, pas de broadcast
 */
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = 8080;

// Secret partagé avec le backend PHP — obligatoire au démarrage
const NOTIFY_SECRET = process.env.NOTIFY_SECRET || '';
if (!NOTIFY_SECRET) {
  console.error('[ws] FATAL: NOTIFY_SECRET non défini. Arrêt du serveur.');
  process.exit(1);
}

// Tous les clients connectés (pour les broadcasts globaux)
const clients = new Set();

// userId (string) → Set<WebSocket> (pour les messages ciblés)
const userClients = new Map();

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/notify') {
    // ── Vérification du secret partagé ───────────────────────────────────────
    const incoming = req.headers['x-notify-secret'] ?? '';
    if (incoming !== NOTIFY_SECRET) {
      console.warn('[ws] /notify refusé — secret invalide');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        broadcast(event);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, clients: clients.size }));
      } catch {
        res.writeHead(400);
        res.end('bad json');
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (total: ${clients.size})`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.action === 'register' && msg.userId != null) {
        const uid = String(msg.userId);
        if (ws._userId && ws._userId !== uid) {
          userClients.get(ws._userId)?.delete(ws);
        }
        ws._userId = uid;
        if (!userClients.has(uid)) userClients.set(uid, new Set());
        userClients.get(uid).add(ws);
        console.log(`[ws] registered userId=${uid} (connections: ${userClients.get(uid).size})`);
      }
    } catch { /* messages malformés ignorés */ }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (ws._userId) {
      userClients.get(ws._userId)?.delete(ws);
      if (userClients.get(ws._userId)?.size === 0) userClients.delete(ws._userId);
    }
    console.log(`[ws] client disconnected (total: ${clients.size})`);
  });

  ws.on('error', () => {
    clients.delete(ws);
    if (ws._userId) userClients.get(ws._userId)?.delete(ws);
  });
});

function broadcast(event) {
  if (event.targetUserId != null) {
    const uid = String(event.targetUserId);
    const targets = userClients.get(uid) ?? new Set();
    const msg = JSON.stringify(event);
    let sent = 0;
    for (const client of targets) {
      if (client.readyState === 1) { client.send(msg); sent++; }
    }
    console.log(`[ws] targeted ${event.type} → userId=${uid} (${sent}/${targets.size})`);
  } else {
    const msg = JSON.stringify(event);
    let sent = 0;
    for (const client of clients) {
      if (client.readyState === 1) { client.send(msg); sent++; }
    }
    console.log(`[ws] broadcast ${event.type} to ${sent}/${clients.size} clients`);
  }
}

server.listen(PORT, () => {
  console.log(`[ws] server running on :${PORT}`);
});

