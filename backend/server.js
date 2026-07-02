const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const os = require('node:os');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { getOuCreerJoueur, sauvegarderPartie, getClassement, getHistoriqueJoueur } = require('./redis');

const PORT = Number(process.env.PORT || 3001);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'qpuc');
const QUESTIONS_FILE = path.join(PUBLIC_DIR, 'assets', 'data', 'questions.json');
const BACKEND_DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(BACKEND_DATA_DIR, 'auth.json');
const SESSION_COOKIE = 'qpuc_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_TTL_MS = SESSION_MAX_AGE_SECONDS * 1000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

const rooms = new Map();
const socketMeta = new Map();
const questions = loadQuestions();
const qrCache = new Map();
const sessions = new Map();
const tentativesConnexion = new Map();
const tentativesJoin = new Map();

const ROOM_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const ROOM_INACTIVE_MS = 30 * 60 * 1000;
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 500);
const RATE_WINDOW_MS = 10 * 1000;
const RATE_MAX_EVENTS = 80;
const LOGIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_ATTEMPT_MAX = 5;
const JOIN_ATTEMPT_WINDOW_MS = 60 * 1000;
const JOIN_ATTEMPT_MAX = 10;
const QUIZ_QUESTION_DURATION_SEC = Number(process.env.QUIZ_QUESTION_DURATION_SEC || 20);
const DUREES_TIMER = {
  facile: 30,
  moyen: 20,
  difficile: 12,
};

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const age = now - room.createdAt;
    const inactive = now - (room.lastActivityAt || room.createdAt);
    if (age > ROOM_MAX_AGE_MS || inactive > ROOM_INACTIVE_MS) {
      clearQuizTimers(room);
      rooms.delete(code);
      qrCache.delete(code);
    }
  }
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}, 5 * 60 * 1000);

function touchRoom(room) {
  room.lastActivityAt = Date.now();
}

function ipDepuisRequete(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim() || 'unknown';
}

function loadQuestions() {
  try {
    return JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
  } catch (error) {
    console.warn('[questions] Fichier questions introuvable:', error.message);
    return [];
  }
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.CORS_ORIGIN || '*',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error('Payload trop volumineux'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); } catch (error) { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

function sanitizePseudo(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .slice(0, 20);
}

function normaliserClePseudo(pseudo) {
  return sanitizePseudo(pseudo).toLocaleLowerCase('fr-FR');
}

function cleTentativeConnexion(ip, pseudo) {
  return `${ip}:${normaliserClePseudo(pseudo)}`;
}

function estBloquePourTentatives(ip, pseudo) {
  const cle = cleTentativeConnexion(ip, pseudo);
  const entry = tentativesConnexion.get(cle);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    tentativesConnexion.delete(cle);
    return false;
  }
  return entry.count >= LOGIN_ATTEMPT_MAX;
}

function enregistrerTentativeEchouee(ip, pseudo) {
  const cle = cleTentativeConnexion(ip, pseudo);
  const entry = tentativesConnexion.get(cle) || {
    count: 0,
    resetAt: Date.now() + LOGIN_ATTEMPT_WINDOW_MS,
  };
  entry.count += 1;
  tentativesConnexion.set(cle, entry);
}

function oublierTentativesConnexion(ip, pseudo) {
  tentativesConnexion.delete(cleTentativeConnexion(ip, pseudo));
}

function chargerAuth() {
  try {
    if (!fs.existsSync(AUTH_FILE)) return { users: {} };
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    return data && typeof data === 'object' && data.users && typeof data.users === 'object'
      ? data
      : { users: {} };
  } catch (error) {
    console.warn('[auth] Fichier auth illisible, réinitialisation en mémoire:', error.message);
    return { users: {} };
  }
}

function sauverAuth(data) {
  fs.mkdirSync(BACKEND_DATA_DIR, { recursive: true });
  const tmp = `${AUTH_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, AUTH_FILE);
}

function creerHashPin(pin, salt) {
  return crypto.scryptSync(String(pin), Buffer.from(salt, 'hex'), 64).toString('hex');
}

function verifierPin(pin, utilisateur) {
  if (!utilisateur?.pinSalt || !utilisateur?.pinHash) return false;
  const attendu = Buffer.from(utilisateur.pinHash, 'hex');
  const recu = Buffer.from(creerHashPin(pin, utilisateur.pinSalt), 'hex');
  return attendu.length === recu.length && crypto.timingSafeEqual(attendu, recu);
}

function creerSession(pseudo) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    pseudo,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function lireCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf('=');
      if (index < 0) return [part, ''];
      return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
    }));
}

function sessionDepuisRequete(req) {
  const token = lireCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function pseudoDepuisSession(req) {
  return sessionDepuisRequete(req)?.pseudo || null;
}

function creerCookieSession(token, maxAge = SESSION_MAX_AGE_SECONDS) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token || '')}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

function networkOrigins() {
  const origins = [];
  const nets = os.networkInterfaces();
  Object.entries(nets).forEach(([name, list]) => (list || []).forEach(net => {
    if (!net || net.family !== 'IPv4' || net.internal) return;
    const lowerName = name.toLowerCase();
    const virtualPenalty =
      lowerName.includes('virtual') ||
      lowerName.includes('vmware') ||
      lowerName.includes('virtualbox') ||
      net.mac?.toLowerCase().startsWith('0a:00:27') ||
      net.address.startsWith('192.168.56.')
        ? -100
        : 0;
    const wifiBonus = lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wlan') ? 20 : 0;
    origins.push({
      origin: `http://${net.address}:${PORT}`,
      score: virtualPenalty + wifiBonus,
    });
  }));
  return origins
    .sort((a, b) => b.score - a.score)
    .map(item => item.origin);
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const requested = decoded === '/' ? '/index.html' : decoded;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  const rel = path.relative(PUBLIC_DIR, filePath);
  return (!rel.startsWith('..') && !path.isAbsolute(rel)) ? filePath : null;
}

function isValidQrData(data, host) {
  if (/^(CHMP|PARIS|POUVOIRS)-[A-Z2-9]{6}$/.test(data)) return true;
  try {
    const url = new URL(data, `http://${host || 'localhost'}`);
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
    const isSpaJoin = url.pathname === '/' && url.searchParams.get('ecran') === 'rejoindre-salle';
    return isSpaJoin && /^(CHMP|PARIS|POUVOIRS)-[A-Z2-9]{6}$/.test(code);
  } catch (error) {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    sendJson(res, 200, { ok: true, rooms: rooms.size });
    return;
  }

  if (req.url === '/favicon.ico') {
    res.writeHead(204, { 'cache-control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (req.url === '/api/network') {
    sendJson(res, 200, {
      ok: true,
      origin: `http://${req.headers.host || `localhost:${PORT}`}`,
      lanOrigins: networkOrigins(),
    });
    return;
  }

  if (req.url === '/api/session' && req.method === 'GET') {
    const pseudo = pseudoDepuisSession(req);
    sendJson(res, 200, pseudo ? { connecte: true, pseudo } : { connecte: false });
    return;
  }

  if (req.url === '/api/deconnexion' && req.method === 'POST') {
    const session = sessionDepuisRequete(req);
    if (session?.token) sessions.delete(session.token);
    sendJson(res, 200, { ok: true, connecte: false }, {
      'set-cookie': creerCookieSession('', 0),
    });
    return;
  }

  if (req.url === '/api/connexion' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const pseudo = sanitizePseudo(body.pseudo);
      const pin = String(body.pin || '');
      const ip = ipDepuisRequete(req);
      if (pseudo.length < 2) { sendJson(res, 400, { erreur: 'Pseudo trop court (minimum 2 caractères)' }); return; }
      if (pin.length < 4) { sendJson(res, 400, { erreur: 'Code secret trop court (minimum 4 caractères)' }); return; }
      if (estBloquePourTentatives(ip, pseudo)) {
        sendJson(res, 429, { erreur: 'Trop de tentatives. Réessaie dans quelques minutes.' });
        return;
      }
      const clePseudo = normaliserClePseudo(pseudo);
      const auth = chargerAuth();
      const utilisateur = auth.users[clePseudo];
      if (!utilisateur) {
        const pinSalt = crypto.randomBytes(16).toString('hex');
        auth.users[clePseudo] = {
          pseudo,
          pinSalt,
          pinHash: creerHashPin(pin, pinSalt),
          createdAt: new Date().toISOString(),
        };
        sauverAuth(auth);
      } else if (!verifierPin(pin, utilisateur)) {
        enregistrerTentativeEchouee(ip, pseudo);
        sendJson(res, 401, { erreur: 'Pseudo ou code secret incorrect' });
        return;
      }
      oublierTentativesConnexion(ip, pseudo);
      const joueur = await getOuCreerJoueur(pseudo);
      const token = creerSession(pseudo);
      sendJson(res, 200, { succes: true, ok: true, pseudo, stats: joueur }, {
        'set-cookie': creerCookieSession(token),
      });
    } catch (error) {
      console.error('Erreur /api/connexion :', error);
      sendJson(res, 500, { erreur: 'Erreur serveur' });
    }
    return;
  }

  if ((req.url || '').startsWith('/api/classement') && req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pseudo = sanitizePseudo(url.searchParams.get('pseudo') || '');
      sendJson(res, 200, await getClassement(pseudo || null));
    } catch (error) {
      console.error('Erreur /api/classement :', error);
      sendJson(res, 500, { erreur: 'Erreur serveur' });
    }
    return;
  }

  if (req.url === '/api/score' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const pseudo = sanitizePseudo(body.pseudo);
      if (pseudo.length < 2) { sendJson(res, 400, { erreur: 'Pseudo manquant' }); return; }

      const pseudoSession = pseudoDepuisSession(req);
      const modePartie = body.mode || 'fidele';
      const estModeMulti = ['paris', 'pouvoirs', 'duel', 'quiz'].includes(modePartie);

      if (estModeMulti) {
        // Score multijoueur : l'état serveur est la seule source fiable.
        const code = String(body.code || '').trim().toUpperCase();
        const room = code ? rooms.get(code) : null;
        if (!room) {
          sendJson(res, 400, { erreur: 'Salle introuvable ou expirée, score non enregistré' });
          return;
        }

        const joueur = room.players?.find(p =>
          normaliserClePseudo(p.nom || p.name || '') === normaliserClePseudo(pseudo)
        );
        if (!joueur) {
          sendJson(res, 403, { erreur: 'Joueur non trouvé dans cette salle' });
          return;
        }

        const pid = joueur.id;
        let scoreReel = null;
        if (room.parisGame?.scores?.[pid] !== undefined) {
          scoreReel = room.parisGame.scores[pid];
        } else if (room.pouvoirsGame?.scores?.[pid] !== undefined) {
          scoreReel = room.pouvoirsGame.scores[pid];
        } else if (room.quiz?.scores?.[pid] !== undefined) {
          scoreReel = room.quiz.scores[pid];
        } else if (joueur.score !== undefined) {
          scoreReel = Number(joueur.score) || 0;
        }

        if (scoreReel === null) {
          sendJson(res, 400, { erreur: 'État de partie introuvable, score non enregistré' });
          return;
        }

        await sauvegarderPartie(pseudo, {
          score: scoreReel,
          victoire: Boolean(body.victoire),
          serieMax: Number(joueur.serieMax || joueur.serie || 0),
          manche: parseInt(body.manche, 10) || 1,
          mode: modePartie,
        });
        sendJson(res, 200, { succes: true, ok: true, ...(await getClassement(pseudo)) });
        return;
      }

      if (!pseudoSession) {
        sendJson(res, 401, { erreur: 'Connexion requise' });
        return;
      }
      if (pseudoSession && normaliserClePseudo(pseudoSession) !== normaliserClePseudo(pseudo)) {
        sendJson(res, 403, { erreur: 'Session invalide pour ce pseudo' });
        return;
      }

      await sauvegarderPartie(pseudo, {
        score: parseInt(body.score, 10) || 0,
        victoire: Boolean(body.victoire),
        serieMax: parseInt(body.serieMax, 10) || 0,
        manche: parseInt(body.manche, 10) || 1,
        mode: modePartie,
      });
      sendJson(res, 200, { succes: true, ok: true, ...(await getClassement(pseudo)) });
    } catch (error) {
      console.error('Erreur /api/score :', error);
      sendJson(res, 500, { erreur: 'Erreur serveur' });
    }
    return;
  }

  if ((req.url || '').startsWith('/api/joueur/') && req.method === 'GET') {
    try {
      const pseudo = sanitizePseudo(decodeURIComponent((req.url || '').split('/api/joueur/')[1].split('?')[0] || ''));
      if (pseudo.length < 2) { sendJson(res, 400, { erreur: 'Pseudo manquant' }); return; }
      sendJson(res, 200, await getHistoriqueJoueur(pseudo));
    } catch (error) {
      console.error('Erreur /api/joueur :', error);
      sendJson(res, 500, { erreur: 'Erreur serveur' });
    }
    return;
  }

  if ((req.url || '').startsWith('/api/qr')) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const data = url.searchParams.get('data') || '';
    if (!data) { sendJson(res, 400, { error: 'Paramètre data manquant' }); return; }
    if (data.length > 512) { sendJson(res, 413, { error: 'Données trop longues' }); return; }
    if (!isValidQrData(data, req.headers.host)) { sendJson(res, 400, { error: 'QR non autorisé' }); return; }
    if (qrCache.has(data)) {
      res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' });
      res.end(qrCache.get(data));
      return;
    }
    try {
      const svg = await QRCode.toString(data, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#1A3A40',
          light: '#FFFFFF',
        },
      });
      qrCache.set(data, svg);
      res.writeHead(200, {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      });
      res.end(svg);
    } catch (error) {
      sendJson(res, 500, { error: 'QR impossible à générer' });
    }
    return;
  }

  const filePath = safePath(req.url || '/');
  if (!filePath) {
    sendJson(res, 403, { error: 'Chemin interdit' });
    return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      sendJson(res, 404, { error: 'Fichier introuvable' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isAsset = ['.css', '.js', '.json', '.webmanifest', '.png', '.jpg', '.svg', '.ico', '.mp3', '.ogg'].includes(ext);
    const isHtml = ext === '.html';
    const isMutableCode = ['.html', '.js', '.css'].includes(ext);
    const etag = `"${stat.mtimeMs.toString(16)}-${stat.size}"`;

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    const headers = {
      'content-type': contentType,
      'etag': etag,
      'cache-control': isMutableCode ? 'no-cache' : (isAsset ? 'public, max-age=31536000, immutable' : 'no-cache'),
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    };

    const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
    if (acceptsGzip && isAsset) {
      headers['content-encoding'] = 'gzip';
      headers['vary'] = 'Accept-Encoding';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});

io.use((socket, next) => {
  socket.rateLimit = { windowStart: Date.now(), count: 0 };
  next();
});

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeConfig(config = {}) {
  const mode = config.mode || 'classique';
  const maxPlayersLimit = (mode === 'duel' || mode === 'duel-multijoueur') ? 4
                        : (mode === 'paris-multi') ? 4
                        : 12;
  return {
    mode,
    category: config.category || 'Culture générale',
    difficulty: config.difficulty || 'Moyen',
    nbQuestions: Math.max(1, Math.min(50, Number(config.nbQuestions) || 10)),
    manches: Math.max(1, Math.min(5, Number(config.manches) || 3)),
    visibility: config.visibility || 'Privée',
    maxPlayers: Math.max(2, Math.min(maxPlayersLimit, Number(config.maxPlayers) || 8)),
  };
}

function getInitials(name) {
  return String(name || 'Joueur')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] || '')
    .join('')
    .toUpperCase() || 'J';
}

function makeCode(prefix = 'CHMP') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = prefix + '-';
    for (let i = 0; i < 6; i += 1) code += chars[crypto.randomInt(chars.length)];
  } while (rooms.has(code));
  return code;
}

/**
 * Trouve une room par les 6 derniers caractères, peu importe le préfixe.
 * Permet de saisir "AB12CD" pour rejoindre "CHMP-AB12CD" ou "PARIS-AB12CD".
 */
function resolveRoomCode(input) {
  if (!input) return null;
  const clean = String(input).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

  if (rooms.has(clean)) return clean;

  const suffix = clean.replace(/.*-/, '').slice(-6);
  if (suffix.length !== 6) return null;

  for (const code of rooms.keys()) {
    if (code.endsWith('-' + suffix)) return code;
  }
  return null;
}

function makeSecret() {
  return crypto.randomBytes(24).toString('base64url');
}

function isRateLimited(socket) {
  const now = Date.now();
  const bucket = socket.rateLimit || { windowStart: now, count: 0 };
  if (now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket.windowStart = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  socket.rateLimit = bucket;
  return bucket.count > RATE_MAX_EVENTS;
}

function cleTentativeJoin(socket) {
  return socket.id || socket.handshake?.address || 'unknown';
}

function estJoinBloque(socket) {
  const cle = cleTentativeJoin(socket);
  const entry = tentativesJoin.get(cle);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    tentativesJoin.delete(cle);
    return false;
  }
  return entry.count >= JOIN_ATTEMPT_MAX;
}

function enregistrerJoinEchoue(socket) {
  const cle = cleTentativeJoin(socket);
  const entry = tentativesJoin.get(cle) || {
    count: 0,
    resetAt: Date.now() + JOIN_ATTEMPT_WINDOW_MS,
  };
  entry.count += 1;
  tentativesJoin.set(cle, entry);
}

function oublierJoinEchoues(socket) {
  tentativesJoin.delete(cleTentativeJoin(socket));
}

function sanitizePlayer(player = {}, socketId, host = false) {
  let name = String(player.name || (host ? 'Hôte' : 'Joueur')).trim().slice(0, 24);
  name = name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return {
    id: player.id || socketId,
    socketId,
    name,
    init: player.init || getInitials(name),
    color: Number(player.color ?? player.colorIdx ?? 0),
    host,
    ready: Boolean(player.ready ?? host),
    score: Number(player.score || 0),
    qualifie: Boolean(player.qualifie || player.qualified),
    qualified: Boolean(player.qualifie || player.qualified),
    serieEnCours: Math.max(0, Number(player.serieEnCours || 0)),
    niveauDifficulte: ['facile', 'moyen', 'difficile'].includes(player.niveauDifficulte) ? player.niveauDifficulte : 'facile',
    connected: true,
  };
}

function toPublicPlayer(player) {
  const { playerToken, ...pub } = player;
  return pub;
}

function creerIdJoueur() {
  return makeSecret();
}

function compterJoueursConnectes(room) {
  return (room?.players || []).filter(p => p.connected !== false && !p.deconnecte).length;
}

function trouverJoueurParToken(room, token) {
  if (!token) return null;
  return (room?.players || []).find(p => p.playerToken === token || p.token === token) || null;
}

function rattacherJoueur(socket, room, joueur, code, host = false) {
  joueur.socketId = socket.id;
  joueur.connected = true;
  joueur.deconnecte = false;
  if (host) room.hostSocketId = socket.id;
  socket.join(code);
  socketMeta.set(socket.id, { code, playerId: joueur.id, host });
}

function toPublicQuestion(q, revealed = false) {
  const { c, ...pub } = q;
  return revealed ? { ...pub, c } : pub;
}

function toPublicAnswers(quiz) {
  if (!quiz) return {};
  if (quiz.revealed) return quiz.answers;
  return Object.fromEntries(Object.keys(quiz.answers || {}).map(id => [id, { answered: true }]));
}

function isClassicBuzzMode(room) {
  return room.config?.mode !== 'quiz-multijoueur';
}

function isDuelMode(room) {
  const mode = room.config?.mode;
  return mode === 'duel-multijoueur' || mode === 'duel';
}

function isParisMode(room) {
  return room.config?.mode === 'paris-multi';
}

function questionPoints(room) {
  const mancheMode = room?.quiz?.mancheMode;
  if (mancheMode === 'duel-final') return 2;
  if (mancheMode === 'serie') return 1;
  // Buzz (manche 1) : escalade 1 → 2 → 3 selon joueurs qualifiés
  const qualCount = (room?.quiz?.manche1Qualified || []).length;
  return qualCount === 0 ? 1 : qualCount === 1 ? 2 : 3;
}

function isJoueurQualifieManche1(room, playerId) {
  if (!room?.quiz || room.quiz.mancheMode === 'serie' || isDuelMode(room)) return false;
  const player = room.players.find(p => String(p.id) === String(playerId));
  const listed = (room.quiz.manche1Qualified || []).some(id => String(id) === String(playerId));
  return Boolean(player?.qualifie || player?.qualified || listed);
}

function objectifQualifiesManche1(room) {
  return Math.min(3, quizPlayers(room).length);
}

function doitContinuerManche1(room) {
  if (!room?.quiz || isDuelMode(room) || isParisMode(room) || !isClassicBuzzMode(room)) return false;
  if (room.quiz.mancheMode === 'serie' || room.quiz.mancheMode === 'duel-final') return false;
  return (room.quiz.manche1Qualified || []).length < objectifQualifiesManche1(room);
}

function calculerNiveauDifficulte(serie) {
  if (serie >= 6) return 'difficile';
  if (serie >= 3) return 'moyen';
  return 'facile';
}

function descendreNiveauDifficulte(niveau) {
  if (niveau === 'difficile') return 'moyen';
  if (niveau === 'moyen') return 'facile';
  return 'facile';
}

function appliquerResultatDifficulte(player, bonneReponse) {
  if (!player) return null;
  player.serieEnCours = Math.max(0, Number(player.serieEnCours || 0));
  player.niveauDifficulte = player.niveauDifficulte || 'facile';

  if (bonneReponse) {
    player.serieEnCours += 1;
    player.niveauDifficulte = calculerNiveauDifficulte(player.serieEnCours);
  } else {
    player.niveauDifficulte = descendreNiveauDifficulte(player.niveauDifficulte);
    player.serieEnCours = 0;
  }

  return {
    niveau: player.niveauDifficulte,
    serie: player.serieEnCours,
    dureeTimer: DUREES_TIMER[player.niveauDifficulte] || DUREES_TIMER.facile,
  };
}

function emettreNiveauDifficulte(room, player, payload) {
  if (!room || !player || !payload) return;
  const socketId = player.socketId;
  if (socketId) io.to(socketId).emit('difficulte:mise-a-jour', payload);
}

function appliquerTimeoutDifficulte(room) {
  if (!room?.quiz || room.quiz.timeoutDifficulteApplique) return;
  room.quiz.timeoutDifficulteApplique = true;
  const reponses = room.quiz.answers || {};
  quizPlayers(room).forEach(player => {
    if (isJoueurQualifieManche1(room, player.id)) return;
    if (reponses[player.id]) return;
    const payload = appliquerResultatDifficulte(player, false);
    emettreNiveauDifficulte(room, player, payload);
  });
}

function quizPlayers(room) {
  if (!room) return [];
  return room.config?.mode === 'quiz-multijoueur'
    ? room.players.filter(p => !p.host)
    : room.players;
}

function clearQuizTimers(room) {
  if (room?.parisGame?.timerHandle) {
    clearTimeout(room.parisGame.timerHandle);
    clearInterval(room.parisGame.timerHandle);
    room.parisGame.timerHandle = null;
  }
  if (room?.parisGame?.transitionTimer) {
    clearTimeout(room.parisGame.transitionTimer);
    room.parisGame.transitionTimer = null;
  }
  if (room?.pouvoirsGame?.timerHandle) {
    clearTimeout(room.pouvoirsGame.timerHandle);
    clearInterval(room.pouvoirsGame.timerHandle);
    room.pouvoirsGame.timerHandle = null;
  }
  if (room?.pouvoirsGame?.transitionTimer) {
    clearTimeout(room.pouvoirsGame.transitionTimer);
    room.pouvoirsGame.transitionTimer = null;
  }
  if (room?.pouvoirsGame?.timer) {
    clearTimeout(room.pouvoirsGame.timer);
    room.pouvoirsGame.timer = null;
  }
  if (room?.pouvoirsGame?.fallbackTimer) {
    clearTimeout(room.pouvoirsGame.fallbackTimer);
    room.pouvoirsGame.fallbackTimer = null;
  }
  if (room?.pouvoirsGame?.countdownInterval) {
    clearInterval(room.pouvoirsGame.countdownInterval);
    room.pouvoirsGame.countdownInterval = null;
  }
  if (!room?.quiz) return;
  if (room.quiz.paris?.timerMise) {
    clearTimeout(room.quiz.paris.timerMise);
    room.quiz.paris.timerMise = null;
  }
  if (room.quiz.questionTimer) {
    clearTimeout(room.quiz.questionTimer);
    room.quiz.questionTimer = null;
  }
  if (room.quiz.autoNextTimer) {
    clearTimeout(room.quiz.autoNextTimer);
    room.quiz.autoNextTimer = null;
  }
}

function scheduleQuestionTimeout(room) {
  if (!room?.quiz) return;
  if (room.quiz.questionTimer) clearTimeout(room.quiz.questionTimer);
  const durationMs = (room.quiz.duration || QUIZ_QUESTION_DURATION_SEC) * 1000;
  const gameId = room.quiz.gameId;
  room.quiz.questionTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom?.quiz || liveRoom.quiz.gameId !== gameId || liveRoom.quiz.status !== 'question' || liveRoom.quiz.revealed) return;
    appliquerTimeoutDifficulte(liveRoom);
    revealQuiz(liveRoom);
    touchRoom(liveRoom);
    emitRoom(liveRoom);
  }, durationMs);
}

function revealQuiz(room) {
  if (!room?.quiz || room.quiz.revealed) return;
  if (room.quiz.questionTimer) {
    clearTimeout(room.quiz.questionTimer);
    room.quiz.questionTimer = null;
  }
  const question = room.quiz.questions[room.quiz.index];
  const counts = [0, 0, 0, 0];
  quizPlayers(room).forEach(player => {
    const answer = room.quiz.answers[player.id];
    if (!Number.isInteger(answer?.choice)) return;
    counts[answer.choice] += 1;
  });
  room.quiz.counts = counts;

  if (isDuelMode(room)) {
    const responderId = room.quiz.firstBuzz?.playerId;
    const answer = responderId ? room.quiz.answers[responderId] : null;
    const responder = room.players.find(p => String(p.id) === String(responderId));
    const isCorrect = Number.isInteger(answer?.choice) && answer.choice === question.c;
    const points = questionPoints(room);
    if (isCorrect && responder) responder.score = (responder.score || 0) + points;
    const gameOver = Boolean(responder && (responder.score || 0) >= 12);
    const previousLast = room.quiz.duel?.last || null;
    room.quiz.duel = {
      ...(room.quiz.duel || {}),
      last: responderId ? {
        responderId,
        choice: Number.isInteger(answer?.choice) ? answer.choice : null,
        correct: isCorrect,
        points: isCorrect ? points : 0,
        gameOver,
      } : previousLast,
      gameOver,
    };
    room.quiz.revealed = true;
    room.quiz.status = 'revealed';
    scheduleClassicAutoNext(room);
    return;
  }

  if (isParisMode(room)) {
    const paris = room.quiz.paris || {};
    const responderId = room.quiz.firstBuzz?.playerId;
    const answer = responderId ? room.quiz.answers[responderId] : null;
    const responder = room.players.find(p => String(p.id) === String(responderId));
    const isCorrect = Number.isInteger(answer?.choice) && answer.choice === question.c;
    if (responder) {
      const mise = paris.miseEnCours || 0;
      if (mise > 0) {
        responder.score = isCorrect
          ? (responder.score || 5) + mise * 2
          : Math.max(1, (responder.score || 5) - mise);
      } else if (isCorrect) {
        responder.score = (responder.score || 5) + 1;
      }
    }
    paris.miseEnCours = 0;
    paris.etoileEnCours = false;
    paris.attenteMise = false;
    paris.buzzeurId = null;
    room.quiz.revealed = true;
    room.quiz.status = 'revealed';
    scheduleClassicAutoNext(room);
    return;
  }

  const correctAnswerers = quizPlayers(room)
    .filter(p => {
      const ans = room.quiz.answers[p.id];
      return Number.isInteger(ans?.choice) && ans.choice === question.c;
    })
    .sort((a, b) => (room.quiz.answers[a.id].at || 0) - (room.quiz.answers[b.id].at || 0));

  correctAnswerers.forEach((player, rank) => {
    player.score = (player.score || 0) + questionPoints(room);
  });

  // Qualification manche 1 (mode buzz)
  if (!isDuelMode(room) && isClassicBuzzMode(room) && room.quiz.manche1Qualified !== undefined) {
    const MANCHE1_THRESHOLD = 9;
    const players = quizPlayers(room);
    players.forEach(player => {
      if ((player.score || 0) >= MANCHE1_THRESHOLD && !room.quiz.manche1Qualified.includes(String(player.id))) {
        room.quiz.manche1Qualified.push(String(player.id));
        player.qualifie = true;
        player.qualified = true;
      } else if (room.quiz.manche1Qualified.includes(String(player.id))) {
        player.qualifie = true;
        player.qualified = true;
      }
    });
    if (room.quiz.manche1Qualified.length >= objectifQualifiesManche1(room)) {
      room.quiz.revealed = true;
      room.quiz.status = 'finished';
      clearQuizTimers(room);
      return;
    }
  }

  room.quiz.revealed = true;
  room.quiz.status = 'revealed';
  if (isClassicBuzzMode(room)) scheduleClassicAutoNext(room);
}

function advanceQuiz(room) {
  if (!room?.quiz) return;
  clearQuizTimers(room);
  if (isDuelMode(room) && room.quiz.duel?.gameOver) {
    room.quiz.status = 'finished';
    return;
  }
  const nextIndex = room.quiz.index + 1;
  if (nextIndex >= room.quiz.questions.length) {
    if (doitContinuerManche1(room)) {
      const extraQuestion = pickQuestions({ ...room.config, nbQuestions: 1 })[0];
      if (extraQuestion) room.quiz.questions.push(extraQuestion);
      else {
        room.quiz.status = 'finished';
        return;
      }
    } else {
      room.quiz.status = 'finished';
      return;
    }
  }
  room.quiz.index = nextIndex;
  room.quiz.answers = {};
  room.quiz.buzzes = [];
  room.quiz.firstBuzz = null;
  room.quiz.counts = [0, 0, 0, 0];
  room.quiz.revealed = false;
  room.quiz.timeoutDifficulteApplique = false;
  room.quiz.status = 'question';
  room.quiz.startedAt = Date.now();
  if (isDuelMode(room)) {
    room.quiz.duel = {
      ...(room.quiz.duel || {}),
      hintIndex: 0,
      last: null,
      gameOver: false,
    };
  }
  if (isParisMode(room)) appliquerEtoileParis(room);
  scheduleQuestionTimeout(room);
}

function scheduleClassicAutoNext(room) {
  if (room.quiz.autoNextTimer) clearTimeout(room.quiz.autoNextTimer);
  const gameId = room.quiz.gameId;
  room.quiz.autoNextTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom?.quiz || liveRoom.quiz.gameId !== gameId || liveRoom.quiz.status !== 'revealed' || !isClassicBuzzMode(liveRoom)) return;
    advanceQuiz(liveRoom);
    touchRoom(liveRoom);
    emitRoom(liveRoom);
  }, 10000);
}

function toPublicRoom(room) {
  const revealed = Boolean(room.quiz?.revealed || room.quiz?.status === 'finished');
  return {
    code: room.code,
    hostId: room.hostId,
    config: room.config,
    phase: room.phase || (room.quiz ? 'playing' : 'lobby'),
    intro: room.intro || null,
    manche: room.manche || 1,
    mancheMode: room.mancheMode || 'buzz',
    mancheResults: room.mancheResults || null,
    players: room.players.map(p => ({ ...toPublicPlayer(p), serie: p.serie || 0, serieMax: p.serieMax || 0 })),
    quizPlayerCount: quizPlayers(room).length,
    quiz: room.quiz ? {
      status: room.quiz.status,
      index: room.quiz.index,
      questions: room.quiz.questions.map(q => toPublicQuestion(q, revealed)),
      answers: toPublicAnswers(room.quiz),
      buzzes: room.quiz.buzzes || [],
      firstBuzz: room.quiz.firstBuzz || null,
      counts: room.quiz.counts,
      revealed: room.quiz.revealed,
      startedAt: room.quiz.startedAt,
      duration: room.quiz.duration || QUIZ_QUESTION_DURATION_SEC,
      duel: room.quiz.duel || null,
      manche1Qualified: room.quiz.manche1Qualified || [],
      paris: room.quiz.paris ? {
        etoileEnCours: room.quiz.paris.etoileEnCours,
        attenteMise: room.quiz.paris.attenteMise,
        buzzeurId: room.quiz.paris.buzzeurId,
      } : null,
    } : null,
    createdAt: room.createdAt,
  };
}

function emitRoom(room) {
  io.to(room.code).emit('room:update', toPublicRoom(room));
}

function matchQuestion(raw, config) {
  const category = normalizeText(config.category);
  const difficulty = normalizeText(config.difficulty);
  const rawCategory = normalizeText(raw.categorie);
  const rawDifficulty = normalizeText(raw.difficulte);
  const categoryOk =
    !category ||
    category === 'mix' ||
    category === 'culture générale' ||
    rawCategory.includes(category) ||
    category.includes(rawCategory);
  const difficultyOk = !difficulty || rawDifficulty.includes(difficulty) || difficulty.includes(rawDifficulty);
  return categoryOk && difficultyOk;
}

function shuffleQuestionOptions(options, correctIndex) {
  const items = options.map((text, index) => ({ text, correct: index === correctIndex }));
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return {
    options: items.map(item => item.text),
    correctIndex: Math.max(0, items.findIndex(item => item.correct)),
  };
}

function toGameQuestion(raw, index) {
  const options = Array.isArray(raw.options) ? raw.options.slice(0, 4) : [];
  const correct = Math.max(0, options.findIndex(opt => opt === raw.reponseCorrecte));
  const shuffled = shuffleQuestionOptions(options, correct);
  const imageKeyword = raw.wikidataLabel || raw.reponseCorrecte || raw.categorie || 'quiz';
  return {
    id: raw.id || `question-${index + 1}`,
    q: raw.question,
    opts: shuffled.options,
    c: shuffled.correctIndex,
    cat: `${raw.categorie || 'Culture générale'} · ${raw.difficulte || 'Moyen'}`,
    fact: raw.illustrationTexte || `${raw.reponseCorrecte || 'Réponse'} — ${raw.sourceLabel || 'information vérifiée'}`,
    imageUrl: raw.imageUrl || '',
    imageAlt: raw.wikidataLabel || raw.reponseCorrecte || raw.categorie || 'Illustration de la question',
    imageKeyword,
    imageCredit: raw.imageCredit || '',
    imageSource: raw.imageSource || '',
    imageLicense: raw.imageLicense || '',
    sourceLabel: raw.sourceLabel || '',
    sourceUrl: raw.sourceUrl || '',
  };
}

function pickQuestions(config) {
  const valid = questions.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4);
  const filtered = valid.filter(q => matchQuestion(q, config));
  const pool = filtered.length ? filtered : valid;
  return pool
    .map((q, i) => ({ q, sort: Math.random(), i }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, config.nbQuestions)
    .map(item => toGameQuestion(item.q, item.i));
}

function pickDifficileQuestion(config, excludeIds = new Set()) {
  const valid = questions.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4);
  const difficiles = valid.filter(q => {
    const diff = normalizeText(q.difficulte);
    return (diff.includes('difficile') || diff.includes('hard')) && matchQuestion(q, { ...config, difficulty: '' });
  });
  const base = difficiles.length ? difficiles : valid;
  const pool = base.filter(q => !excludeIds.has(q.id));
  const finalPool = pool.length ? pool : base;
  if (!finalPool.length) return null;
  const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
  return toGameQuestion(picked, finalPool.indexOf(picked));
}

function _parisQuestionPayload(q, avecReponse = false) {
  const texte = q?.q || q?.question || q?.texte || '';
  const options = Array.isArray(q?.opts) ? q.opts
                : Array.isArray(q?.o) ? q.o
                : Array.isArray(q?.options) ? q.options
                : [];
  const correct = q?.c ?? q?.indexCorrect ?? q?.reponse ?? 0;
  const payload = {
    question: texte,
    options: options.slice(0, 4),
  };

  if (avecReponse) payload.indexCorrect = correct;
  return payload;
}

// Décide si la question courante d'une room en mode Paris est ⭐ (1 chance sur 3,
// jamais 2 consécutives) et force une question difficile côté serveur si c'est le cas.
// Réinitialise aussi l'état de mise transitoire pour la nouvelle question.
function appliquerEtoileParis(room) {
  if (!room?.quiz?.paris) return;
  const paris = room.quiz.paris;
  if (paris.timerMise) {
    clearTimeout(paris.timerMise);
    paris.timerMise = null;
  }
  paris.buzzeurId = null;
  paris.attenteMise = false;
  paris.miseEnCours = 0;

  const idx = room.quiz.index;
  const gap = paris.indexDerniereEtoile < 0 ? Infinity : idx - paris.indexDerniereEtoile;
  const estEtoile = gap >= 2 && Math.random() < 0.33;
  paris.etoileEnCours = estEtoile;
  if (!estEtoile) return;

  paris.indexDerniereEtoile = idx;
  const excludeIds = new Set(room.quiz.questions.map(q => q.id));
  const remplacement = pickDifficileQuestion(room.config, excludeIds);
  if (remplacement) room.quiz.questions[idx] = remplacement;
}

function roomForSocket(socket) {
  const meta = socketMeta.get(socket.id);
  return meta ? rooms.get(meta.code) : null;
}

/* ══ HELPERS MODE PARIS POT-COMMUN ══ */

const PARIS_SCORE_MINIMUM = 50;

function _parisClassement(room) {
  const pg = room.parisGame;
  return room.players
    .map(p => ({
      id: p.id,
      nom: p.name || p.nom,
      name: p.name || p.nom,
      init: p.init || getInitials(p.name || p.nom || 'J'),
      score: pg?.scores?.[p.id] ?? 0,
    }))
    .sort((a, b) => b.score - a.score);
}

function _parisJoueursElimines(room) {
  const pg = room.parisGame;
  if (!pg?.scores) return [];
  return room.players
    .filter(p => (pg.scores[p.id] ?? 0) < PARIS_SCORE_MINIMUM)
    .map(p => p.id);
}

function _parisFinirPartie(room, raison = 'fin') {
  const pg = room.parisGame;
  if (!pg?.actif) return;
  _parisStopChrono(room);
  pg.actif = false;
  io.to(room.code).emit('paris:fin', {
    classement: _parisClassement(room),
    raison,
    elimines: _parisJoueursElimines(room),
  });
  touchRoom(room);
}

function _parisStartChrono(room, duree = 25) {
  _parisStopChrono(room);
  const pg = room.parisGame;
  if (!pg) return;
  pg.timerVal = duree;

  pg.timerHandle = setInterval(() => {
    pg.timerVal--;
    io.to(room.code).emit('paris:timer', { val: pg.timerVal });
    if (pg.timerVal <= 0) {
      _parisStopChrono(room);
      /* Confirmer automatiquement les joueurs non-confirmés avec mise=0 */
      room.players.forEach(p => {
        if (!pg.confirmes.has(p.id)) {
          pg.mises[p.id]    = 0;
          pg.reponses[p.id] = null;
          pg.confirmes.add(p.id);
        }
      });
      _parisRevelerEtTraiter(room);
    }
  }, 1000);
}

function _parisRevelerEtTraiter(room) {
  const pg = room.parisGame;
  if (!pg?.actif) return;
  if (pg.transitionTimer) clearTimeout(pg.transitionTimer);
  io.to(room.code).emit('paris:tous-confirmes');
  pg.transitionTimer = setTimeout(() => {
    pg.transitionTimer = null;
    const liveRoom = rooms.get(room.code);
    if (liveRoom?.parisGame?.actif) _parisTraiterResultats(liveRoom);
  }, 2000);
}

function _parisStopChrono(room) {
  const pg = room.parisGame;
  if (!pg?.timerHandle) return;
  clearInterval(pg.timerHandle);
  pg.timerHandle = null;
}

function _parisTraiterResultats(room) {
  const pg = room.parisGame;
  if (!pg?.actif) return;

  const q            = pg.questions[pg.indexQ];
  const indexCorrect = q.c;

  let potQ = 0;
  Object.values(pg.mises).forEach(m => { potQ += m; });
  const potTotal = potQ + pg.jackpot;

  const gagnants = room.players.filter(p =>
    pg.reponses[p.id] === indexCorrect && (pg.mises[p.id] || 0) > 0
  );

  // Toutes les mises quittent d'abord les scores et alimentent le pot commun.
  // Les gagnants récupèrent ensuite une part de ce pot selon leur mise.
  room.players.forEach(p => {
    const mise = pg.mises[p.id] || 0;
    if (mise > 0) {
      pg.scores[p.id] = Math.max(0, (pg.scores[p.id] ?? 2500) - mise);
    }
  });

  if (gagnants.length === 0) {
    pg.jackpot = potTotal;
  } else {
    pg.jackpot = 0;
    if (gagnants.length === 1) {
      pg.scores[gagnants[0].id] = (pg.scores[gagnants[0].id] ?? 0) + potTotal;
    } else {
      const miseTotale = gagnants.reduce((s, p) => s + (pg.mises[p.id] || 0), 0);
      const parts = gagnants.map(p => {
        const exact = miseTotale > 0
          ? Math.floor(((pg.mises[p.id] || 0) / miseTotale) * potTotal)
          : Math.floor(potTotal / gagnants.length);
        const valeurExacte = miseTotale > 0
          ? ((pg.mises[p.id] || 0) / miseTotale) * potTotal
          : potTotal / gagnants.length;
        return { player: p, part: exact, reste: valeurExacte - exact };
      });
      let restePot = potTotal - parts.reduce((s, item) => s + item.part, 0);
      parts
        .sort((a, b) => b.reste - a.reste)
        .forEach(item => {
          if (restePot > 0) {
            item.part += 1;
            restePot -= 1;
          }
      });
      parts.forEach(({ player, part }) => {
        pg.scores[player.id] = (pg.scores[player.id] ?? 0) + part;
      });
    }
  }

  const scores = room.players.map(p => pg.scores[p.id] ?? 0);

  io.to(room.code).emit('paris:resultat', {
    indexCorrect,
    gagnants:    gagnants.map(p => p.id),
    pot:         potTotal,
    jackpot:     pg.jackpot,
    scores,
  });

  touchRoom(room);

  pg.transitionTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom?.parisGame?.actif) {
      pg.transitionTimer = null;
      return;
    }
    const lpg = liveRoom.parisGame;
    lpg.transitionTimer = null;

    if (_parisJoueursElimines(liveRoom).length > 0) {
      _parisFinirPartie(liveRoom, 'score-minimum');
      return;
    }

    lpg.indexQ++;

    if (lpg.indexQ >= lpg.nbQuestions) {
      _parisFinirPartie(liveRoom, 'questions-terminees');
    } else {
      lpg.mises    = {};
      lpg.reponses = {};
      lpg.confirmes = new Set();
      lpg.pot      = 0;
      const prochQ = lpg.questions[lpg.indexQ];
      io.to(room.code).emit('paris:question-suivante', {
        indexQ: lpg.indexQ,
        question: prochQ ? _parisQuestionPayload(prochQ) : null,
      });
      _parisStartChrono(liveRoom, liveRoom.parisGame?.chrono || 25);
    }
  }, 4000);
}

/* ══ HELPERS MODE POUVOIRS ══ */

const POUVOIRS_DISPONIBLES = ['eclair', 'bouclier'];

function _pouvoirsQuestionPayload(q, avecReponse = false) {
  const texte = q?.q || q?.question || q?.texte || '';
  const options = Array.isArray(q?.opts) ? q.opts
                : Array.isArray(q?.o) ? q.o
                : Array.isArray(q?.options) ? q.options
                : [];
  const payload = {
    question: texte,
    options: options.slice(0, 4),
    categorie: q?.cat || q?.categorie || 'Culture générale',
  };
  if (avecReponse) payload.indexCorrect = q?.c ?? q?.indexCorrect ?? 0;
  return payload;
}

function _pouvoirsGainPourQuestion(q) {
  const source = q?.diff || q?.difficulte || q?.difficulty || q?.cat || '';
  const diff = normalizeText(source);
  if (diff.includes('facile')) return 3;
  if (diff.includes('difficile') || diff.includes('hard')) return 9;
  return 6;
}

function _pouvoirsJoueursActifs(room) {
  return room.players.filter(p => p.connected !== false && !p.deconnecte);
}

function _pouvoirsJoueursPublics(room) {
  const pg = room.pouvoirsGame;
  return room.players.map((p, ci) => ({
    id: p.id,
    nom: p.nom || p.name,
    init: p.init || getInitials(p.nom || p.name || 'J'),
    colorIdx: p.color ?? ci,
    score: pg?.scores?.[p.id] || 0,
    host: Boolean(p.host),
  }));
}

function _pouvoirsAjouterPouvoir(room, player, type, attributions) {
  const pg = room.pouvoirsGame;
  if (!pg || !player?.id) return false;
  const stack = pg.stacks[player.id] || [];

  if (stack.length >= 2) {
    io.to(player.socketId || player.id).emit('pouvoirs:stack-plein', { pouvoirs: stack });
    return false;
  }
  if (stack.includes(type)) return false;

  stack.push(type);
  pg.stacks[player.id] = stack;
  attributions.push({ playerId: player.id, pouvoir: type });
  return true;
}

function _pouvoirsStopChrono(room) {
  const pg = room.pouvoirsGame;
  if (!pg) return;
  if (pg.timerHandle) {
    clearInterval(pg.timerHandle);
    pg.timerHandle = null;
  }
  if (pg.timer && pg.timer !== pg.timerHandle) {
    clearTimeout(pg.timer);
    pg.timer = null;
  }
  if (pg.fallbackTimer) {
    clearTimeout(pg.fallbackTimer);
    pg.fallbackTimer = null;
  }
  if (pg.transitionTimer) {
    clearTimeout(pg.transitionTimer);
    pg.transitionTimer = null;
  }
}

function _pouvoirsSignalerTousPrets(room, code) {
  const pg = room?.pouvoirsGame;
  if (!pg?.actif || pg.departSignale) return;

  pg.departSignale = true;
  io.to(code).emit('pouvoirs:tous-prets');

  pg.timer = setTimeout(() => {
    pg.timer = null;
    if (pg.actif) {
      _pouvoirsStartChrono(room, code);
    }
  }, 6000);
}

function _pouvoirsStartChrono(room, code = room?.code) {
  _pouvoirsStopChrono(room);
  const pg = room?.pouvoirsGame;
  if (!pg?.actif) return;

  const dureeBase = Math.max(5, Math.min(60, Number(pg.chrono) || 20));
  pg.timerVal = dureeBase;

  _pouvoirsJoueursActifs(room).forEach(p => {
    const sousPression = Boolean(pg.pressionAppliquee[p.id]);
    io.to(p.socketId || p.id).emit('pouvoirs:chrono-debut', {
      duree: sousPression ? Math.max(5, dureeBase - 5) : dureeBase,
      pression: sousPression,
    });
    pg.pressionAppliquee[p.id] = false;
  });

  io.to(code).emit('pouvoirs:timer', { val: pg.timerVal });
  pg.timerHandle = setInterval(() => {
    if (!pg.actif || pg.revealing) {
      _pouvoirsStopChrono(room);
      return;
    }
    pg.timerVal -= 1;
    io.to(code).emit('pouvoirs:timer', { val: pg.timerVal });
    if (pg.timerVal <= 0) {
      _pouvoirsStopChrono(room);
      _pouvoirsJoueursActifs(room).forEach(p => {
        if (!pg.confirmes.has(p.id)) {
          pg.reponses[p.id] = null;
          pg.timerValAuMomentConfirme[p.id] = 0;
          pg.confirmes.add(p.id);
        }
      });
      _pouvoirsRevelerEtTraiter(room, code);
    }
  }, 1000);
}

function _pouvoirsRevelerEtTraiter(room, code = room?.code) {
  const pg = room?.pouvoirsGame;
  if (!pg?.actif || pg.revealing) return;
  pg.revealing = true;
  _pouvoirsStopChrono(room);

  const q = pg.questions[pg.indexQ];
  const indexCorrect = q?.c ?? q?.indexCorrect ?? 0;
  io.to(code).emit('pouvoirs:revelation', {
    indexCorrect,
    reponses: pg.reponses,
  });

  if (pg.transitionTimer) clearTimeout(pg.transitionTimer);
  pg.transitionTimer = setTimeout(() => {
    pg.transitionTimer = null;
    const liveRoom = rooms.get(code);
    const livePg = liveRoom?.pouvoirsGame;
    if (!livePg?.actif) return;

    const liveQ = livePg.questions[livePg.indexQ];
    const correctIndex = liveQ?.c ?? liveQ?.indexCorrect ?? 0;
    const gainBase = _pouvoirsGainPourQuestion(liveQ);
    const attributions = [];

    liveRoom.players.forEach(player => {
      const playerId = player.id;
      const correct = livePg.reponses[playerId] === correctIndex;

      if (correct) {
        const multiplicateur = livePg.eclairActif[playerId] ? 2 : 1;
        const gain = gainBase * multiplicateur;
        livePg.scores[playerId] = (livePg.scores[playerId] || 0) + gain;
        livePg.consecutifs[playerId] = (livePg.consecutifs[playerId] || 0) + 1;
        livePg.eclairActif[playerId] = false;

        if (livePg.consecutifs[playerId] > 0 && livePg.consecutifs[playerId] % 3 === 0) {
          const pouvoir = POUVOIRS_DISPONIBLES[Math.floor(Math.random() * POUVOIRS_DISPONIBLES.length)];
          _pouvoirsAjouterPouvoir(liveRoom, player, pouvoir, attributions);
        }

        if ((livePg.timerValAuMomentConfirme[playerId] || 0) >= (livePg.chrono - 3)) {
          _pouvoirsAjouterPouvoir(liveRoom, player, 'indice', attributions);
        }
      } else {
        livePg.eclairActif[playerId] = false;
        if (livePg.bouclierActif[playerId]) {
          livePg.bouclierActif[playerId] = false;
          io.to(player.socketId || player.id).emit('pouvoirs:bouclier-utilise');
        } else {
          livePg.consecutifs[playerId] = 0;
        }
      }
    });

    io.to(code).emit('pouvoirs:resultat', {
      indexCorrect: correctIndex,
      reponses: livePg.reponses,
      scores: livePg.scores,
      stacks: livePg.stacks,
      attributions,
    });
    touchRoom(liveRoom);

    // Laisser jouer les animations de score et de pouvoirs côté client.
    livePg.transitionTimer = setTimeout(() => {
      livePg.transitionTimer = null;
      const nextRoom = rooms.get(code);
      const nextPg = nextRoom?.pouvoirsGame;
      if (!nextPg?.actif) return;

      let compte = 3;
      io.to(code).emit('pouvoirs:next-in', { val: compte });

      const countdownInterval = setInterval(() => {
        compte -= 1;

        if (compte > 0) {
          io.to(code).emit('pouvoirs:next-in', { val: compte });
          return;
        }

        clearInterval(countdownInterval);
        nextPg.countdownInterval = null;
        io.to(code).emit('pouvoirs:next-in', { val: 0 });

        nextPg.indexQ += 1;
        nextPg.revealing = false;
        nextPg.reponses = {};
        nextPg.confirmes = new Set();
        nextPg.timerValAuMomentConfirme = {};

        if (nextPg.indexQ >= nextPg.nbQuestions) {
          nextPg.actif = false;
          _pouvoirsStopChrono(nextRoom);
          io.to(code).emit('pouvoirs:fin', {
            classement: _pouvoirsJoueursPublics(nextRoom).sort((a, b) => b.score - a.score),
          });
          touchRoom(nextRoom);
          return;
        }

        const prochQ = nextPg.questions[nextPg.indexQ];
        io.to(code).emit('pouvoirs:question-suivante', {
          indexQ: nextPg.indexQ,
          question: prochQ ? _pouvoirsQuestionPayload(prochQ) : null,
          scores: nextPg.scores,
          stacks: nextPg.stacks,
        });
        touchRoom(nextRoom);
        _pouvoirsStartChrono(nextRoom, code);
      }, 1000);

      nextPg.countdownInterval = countdownInterval;
    }, 3000);
  }, 1500);
}

/* ══════════════════════════════════════════════════════════════════════════ */

io.on('connection', socket => {
  socket.emit('server:ready', { socketId: socket.id });

  socket.on('room:create', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) {
      ack({ ok: false, error: 'Trop de requêtes, réessaie dans quelques secondes' });
      return;
    }
    if (rooms.size >= MAX_ROOMS) {
      ack({ ok: false, error: 'Trop de salles actives pour le moment' });
      return;
    }
    const code = makeCode();
    const config = normalizeConfig(payload.config);
    const host = sanitizePlayer(payload.player, socket.id, true);
    if (config.mode === 'paris-multi') host.score = 2500;
    const hostToken = makeSecret();
    host.playerToken = hostToken;
    const room = {
      code,
      hostId: host.id,
      hostSocketId: socket.id,
      hostToken,
      config,
      players: [host],
      quiz: null,
      phase: 'lobby',
      intro: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    rooms.set(code, room);
    socket.join(code);
    socketMeta.set(socket.id, { code, playerId: host.id, host: true });
    ack({ ok: true, room: toPublicRoom(room), hostToken });
    emitRoom(room);
  });

  socket.on('room:join', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) {
      ack({ ok: false, error: 'Trop de requêtes, réessaie dans quelques secondes' });
      return;
    }
    if (estJoinBloque(socket)) {
      ack({ ok: false, error: 'Trop de codes invalides, réessaie dans une minute' });
      return;
    }
    const resolvedCode = resolveRoomCode(payload.code);
    if (!resolvedCode) {
      enregistrerJoinEchoue(socket);
      ack({ ok: false, error: 'Salle introuvable' });
      return;
    }
    oublierJoinEchoues(socket);
    const room = rooms.get(resolvedCode);

    let detectedMode = 'classique';
    if (room.type === 'paris-config' || room.type === 'paris') {
      detectedMode = 'paris';
    } else if (room.type === 'pouvoirs-config' || room.type === 'pouvoirs') {
      detectedMode = 'pouvoirs';
    } else if (room.config?.mode === 'duel') {
      detectedMode = 'duel';
    } else if (room.config?.mode === 'quiz-multijoueur') {
      detectedMode = 'quiz';
    }

    if (detectedMode === 'paris') {
      const maxJ = room.config?.nbJoueurs || 4;
      const reconnecte = trouverJoueurParToken(room, payload.playerToken);
      if (reconnecte) {
        rattacherJoueur(socket, room, reconnecte, resolvedCode, Boolean(reconnecte.host));
        touchRoom(room);
        io.to(resolvedCode).emit('paris:lobby-update', {
          joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name })),
        });
        ack({ ok: true, mode: 'paris', code: resolvedCode, player: { id: reconnecte.id, name: reconnecte.nom || reconnecte.name }, playerToken: reconnecte.playerToken, reconnecte: true });
        return;
      }
      if (compterJoueursConnectes(room) >= maxJ) {
        ack({ ok: false, error: 'Salle pleine' });
        return;
      }
      const pseudo = sanitizePseudo(payload.player?.name || payload.pseudo || `Joueur ${room.players.length + 1}`);
      const playerToken = makeSecret();
      const parisPlayer = {
        socketId: socket.id, id: creerIdJoueur(), playerToken,
        nom: pseudo, name: pseudo,
        init: getInitials(pseudo), color: room.players.length, host: false,
        connected: true, deconnecte: false,
      };
      room.players.push(parisPlayer);
      touchRoom(room);
      socket.join(resolvedCode);
      socketMeta.set(socket.id, { code: resolvedCode, playerId: parisPlayer.id, host: false });
      io.to(resolvedCode).emit('paris:lobby-update', {
        joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name })),
      });
      ack({
        ok: true,
        mode: 'paris',
        code: resolvedCode,
        player: { id: parisPlayer.id, name: pseudo },
        playerToken,
      });
      return;
    }

    if (detectedMode === 'pouvoirs') {
      const maxJ = room.config?.nbJoueurs || 4;
      const reconnecte = trouverJoueurParToken(room, payload.playerToken);
      if (reconnecte) {
        rattacherJoueur(socket, room, reconnecte, resolvedCode, Boolean(reconnecte.host));
        touchRoom(room);
        io.to(resolvedCode).emit('pouvoirs:lobby-update', {
          joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name, host: Boolean(p.host) })),
        });
        ack({ ok: true, mode: 'pouvoirs', code: resolvedCode, player: { id: reconnecte.id, name: reconnecte.nom || reconnecte.name }, playerToken: reconnecte.playerToken, reconnecte: true });
        return;
      }
      if (compterJoueursConnectes(room) >= maxJ) {
        ack({ ok: false, error: 'Salle pleine' });
        return;
      }
      const pseudo = sanitizePseudo(payload.player?.name || payload.pseudo || `Joueur ${room.players.length + 1}`);
      const playerToken = makeSecret();
      const player = {
        socketId: socket.id,
        id: creerIdJoueur(),
        playerToken,
        nom: pseudo,
        name: pseudo,
        init: getInitials(pseudo),
        color: room.players.length,
        host: false,
        connected: true,
        deconnecte: false,
      };
      room.players.push(player);
      touchRoom(room);
      socket.join(resolvedCode);
      socketMeta.set(socket.id, { code: resolvedCode, playerId: player.id, host: false });
      io.to(resolvedCode).emit('pouvoirs:lobby-update', {
        joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name, host: Boolean(p.host) })),
      });
      ack({
        ok: true,
        mode: 'pouvoirs',
        code: resolvedCode,
        player: { id: player.id, name: pseudo },
        playerToken,
      });
      return;
    }

    const reconnectsHost =
      String(payload.player?.id || '') === String(room.hostId) &&
      typeof payload.hostToken === 'string' &&
      payload.hostToken === room.hostToken;
    const requestedId = String(payload.player?.id || '');
    const previous = room.players.find(p => String(p.id) === requestedId);
    const reconnectsPlayer =
      previous &&
      !previous.host &&
      typeof payload.playerToken === 'string' &&
      payload.playerToken === previous.playerToken;
    if (!reconnectsHost && !reconnectsPlayer && room.players.length >= room.config.maxPlayers) {
      ack({ ok: false, error: 'Salle pleine' });
      return;
    }
    if (previous && !reconnectsHost && !reconnectsPlayer) {
      ack({ ok: false, error: 'Identité joueur déjà utilisée' });
      return;
    }
    const player = {
      ...sanitizePlayer(payload.player, socket.id, reconnectsHost),
      id: previous ? previous.id : (payload.player?.id || socket.id),
      playerToken: previous?.playerToken || makeSecret(),
      score: previous?.score || Number(payload.player?.score || 0),
      qualifie: Boolean(previous?.qualifie || previous?.qualified || payload.player?.qualifie || payload.player?.qualified),
      qualified: Boolean(previous?.qualifie || previous?.qualified || payload.player?.qualifie || payload.player?.qualified),
      serieEnCours: previous?.serieEnCours || Number(payload.player?.serieEnCours || 0),
      niveauDifficulte: previous?.niveauDifficulte || payload.player?.niveauDifficulte || 'facile',
      ready: previous?.ready ?? Boolean(payload.player?.ready ?? reconnectsHost),
      host: reconnectsHost,
    };
    if (!previous && room.config?.mode === 'paris-multi') player.score = 2500;
    room.players = room.players.filter(p => p.id !== player.id && p.socketId !== socket.id);
    room.players.push(player);
    touchRoom(room);
    socket.join(resolvedCode);
    if (reconnectsHost) room.hostSocketId = socket.id;
    socketMeta.set(socket.id, { code: resolvedCode, playerId: player.id, host: reconnectsHost });
    ack({ ok: true, room: toPublicRoom(room), player: toPublicPlayer(player), playerToken: player.playerToken, mode: detectedMode });
    emitRoom(room);
  });

  socket.on('player:ready', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta) {
      ack({ ok: false, error: 'Aucune salle active' });
      return;
    }
    const player = room.players.find(p => p.id === meta.playerId);
    if (player) player.ready = Boolean(payload.ready);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  socket.on('game:prepare', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !meta.host || meta.playerId !== room.hostId) {
      ack({ ok: false, error: 'Seul l’hôte peut préparer la partie' });
      return;
    }
    const config = normalizeConfig({ ...room.config, ...payload.config });
    room.config = config;
    room.phase = 'intro';
    room.intro = {
      manche: Number(payload.manche || 1),
      title: payload.title || 'Manche 1',
      subtitle: payload.subtitle || 'Préparez-vous',
      startsAt: Date.now() + 450,
    };
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  socket.on('quiz:start', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !meta.host || meta.playerId !== room.hostId) {
      ack({ ok: false, error: 'Seul l’hôte peut lancer le quiz' });
      return;
    }
    const config = normalizeConfig({ ...room.config, ...payload.config });
    room.config = config;
    const quizQuestions = pickQuestions(config);
    if (!quizQuestions.length) {
      ack({ ok: false, error: 'Aucune question disponible pour cette configuration' });
      return;
    }
    if (room.quiz) {
      clearQuizTimers(room);
    }
    const mancheMode = room.mancheMode || 'buzz';
    const isDuelFinal = mancheMode === 'duel-final' || isDuelMode({ config });
    // Serie mode: shorter questions; duel-final uses duel mechanics
    const questionDuration = mancheMode === 'serie' ? 8 : QUIZ_QUESTION_DURATION_SEC;
    room.quiz = {
      gameId: `${Date.now()}-${crypto.randomUUID()}`,
      status: 'question',
      index: 0,
      questions: quizQuestions,
      answers: {},
      buzzes: [],
      firstBuzz: null,
      counts: [0, 0, 0, 0],
      revealed: false,
      timeoutDifficulteApplique: false,
      startedAt: Date.now(),
      duration: questionDuration,
      mancheMode,
      manche1Qualified: [],
      duel: isDuelFinal ? {
        finalists: quizPlayers(room).slice(0, 2).map(p => p.id),
        hintIndex: 0,
        last: null,
        gameOver: false,
      } : null,
    };
    if (isParisMode(room)) {
      room.quiz.paris = {
        indexDerniereEtoile: -99,
        miseEnCours: 0,
        etoileEnCours: false,
        buzzeurId: null,
        attenteMise: false,
        timerMise: null,
      };
      appliquerEtoileParis(room);
    }
    room.phase = 'playing';
    room.intro = null;
    scheduleQuestionTimeout(room);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  socket.on('quiz:answer', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) {
      ack({ ok: false, error: 'Trop de requêtes' });
      return;
    }
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !room.quiz) {
      ack({ ok: false, error: 'Quiz inactif' });
      return;
    }
    if (!room.quiz || room.quiz.revealed || room.quiz.status !== 'question') {
      ack({ ok: false, error: 'Réponse non acceptée' });
      return;
    }
    if (room.quiz.answers[meta.playerId]) {
      ack({ ok: false, error: 'Déjà répondu' });
      return;
    }
    const player = room.players.find(p => p.id === meta.playerId);
    if (!player) {
      ack({ ok: false, error: 'Joueur inconnu' });
      return;
    }
    if (isJoueurQualifieManche1(room, meta.playerId)) {
      ack({ ok: false, error: 'Joueur déjà qualifié' });
      return;
    }
    if (isDuelMode(room) && !room.quiz.duel?.finalists?.some(id => String(id) === String(meta.playerId))) {
      ack({ ok: false, error: 'Tu observes ce duel' });
      return;
    }
    if (meta.host && room.config?.mode === 'quiz-multijoueur') {
      ack({ ok: false, error: 'L’hôte anime la partie, il ne répond pas' });
      return;
    }
    const isSerie = room.quiz.mancheMode === 'serie';
    if (!isSerie && !room.quiz.buzzes?.some(b => b.playerId === meta.playerId)) {
      ack({ ok: false, error: 'Buzz requis avant de répondre' });
      return;
    }
    if (isDuelMode(room) && String(room.quiz.firstBuzz?.playerId) !== String(meta.playerId)) {
      ack({ ok: false, error: 'Seul le premier buzzer répond dans le duel' });
      return;
    }
    if (isParisMode(room) && room.quiz.paris?.attenteMise) {
      ack({ ok: false, error: 'En attente de la mise' });
      return;
    }
    if (isParisMode(room) && String(room.quiz.firstBuzz?.playerId) !== String(meta.playerId)) {
      ack({ ok: false, error: 'Seul le buzzeur répond' });
      return;
    }
    const choice = Number(payload.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
      ack({ ok: false, error: 'Réponse invalide' });
      return;
    }
    const question = room.quiz.questions[room.quiz.index];
    const isCorrect = choice === question.c;
    room.quiz.answers[meta.playerId] = { choice, at: Date.now() };
    const difficultePayload = appliquerResultatDifficulte(player, isCorrect);
    emettreNiveauDifficulte(room, player, difficultePayload);

    // Streak tracking for serie mode
    if (isSerie) {
      if (player) {
        if (isCorrect) {
          player.serie = (player.serie || 0) + 1;
          player.serieMax = Math.max(player.serieMax || 0, player.serie);
          player.score = (player.score || 0) + questionPoints(room);
        } else {
          player.serie = 0;
        }
      }
    }

    if (isDuelMode(room)) {
      if (isCorrect) {
        revealQuiz(room);
      } else {
        room.quiz.duel = {
          ...(room.quiz.duel || {}),
          last: {
            responderId: meta.playerId,
            choice,
            correct: false,
            points: 0,
            gameOver: false,
          },
          gameOver: false,
        };
        room.quiz.firstBuzz = null;
        const finalists = room.quiz.duel?.finalists || [];
        const everyFinalistTried = finalists.length > 0
          && finalists.every(id => room.quiz.answers[id]);
        if (everyFinalistTried) {
          revealQuiz(room);
        }
      }
    }
    if (isParisMode(room)) {
      if (isCorrect) {
        revealQuiz(room);
      } else {
        // Mauvaise réponse : la mise est perdue immédiatement, et le buzz
        // se rouvre aux joueurs qui n'ont pas encore tenté cette question
        // au lieu de révéler/avancer directement.
        const paris = room.quiz.paris || {};
        const mise = paris.miseEnCours || 0;
        if (mise > 0) player.score = Math.max(1, (player.score || 5) - mise);
        paris.miseEnCours = 0;
        room.quiz.firstBuzz = null;
        const joueursRestants = quizPlayers(room).filter(p => !room.quiz.answers[p.id]);
        if (!joueursRestants.length) revealQuiz(room);
      }
    }
    const expectedAnswers = quizPlayers(room)
      .filter(p => !isJoueurQualifieManche1(room, p.id))
      .length;
    if (!isDuelMode(room) && (isClassicBuzzMode(room) || isSerie) && expectedAnswers > 0 && Object.keys(room.quiz.answers).length >= expectedAnswers) revealQuiz(room);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room), correct: isCorrect });
    emitRoom(room);
  });

  socket.on('quiz:hint', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !room.quiz || !isDuelMode(room)) {
      ack({ ok: false, error: 'Duel inactif' });
      return;
    }
    if (room.quiz.revealed || room.quiz.status !== 'question') {
      ack({ ok: false, error: 'Indice fermé' });
      return;
    }
    const estHote = meta.host && meta.playerId === room.hostId;
    const estFinaliste = room.quiz.duel?.finalists?.some(id => String(id) === String(meta.playerId));
    if (!estHote && !estFinaliste) {
      ack({ ok: false, error: 'Non autorisé' });
      return;
    }
    room.quiz.duel = room.quiz.duel || {};
    room.quiz.duel.hintIndex = Math.min(2, Number(room.quiz.duel.hintIndex || 0) + 1);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  socket.on('quiz:buzz', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) {
      ack({ ok: false, error: 'Trop de requêtes' });
      return;
    }
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !room.quiz) {
      ack({ ok: false, error: 'Quiz inactif' });
      return;
    }
    if (room.quiz.revealed || room.quiz.status !== 'question') {
      ack({ ok: false, error: 'Buzz fermé' });
      return;
    }
    const player = room.players.find(p => p.id === meta.playerId);
    if (!player) {
      ack({ ok: false, error: 'Joueur inconnu' });
      return;
    }
    if (isJoueurQualifieManche1(room, meta.playerId)) {
      ack({ ok: false, error: 'Joueur déjà qualifié' });
      return;
    }
    if (player.host && room.config?.mode === 'quiz-multijoueur') {
      ack({ ok: false, error: 'L’hôte ne buzz pas dans ce mode' });
      return;
    }
    if (isDuelMode(room) && !room.quiz.duel?.finalists?.some(id => String(id) === String(meta.playerId))) {
      ack({ ok: false, error: 'Tu observes ce duel' });
      return;
    }
    if (room.quiz.answers?.[meta.playerId]) {
      ack({ ok: false, error: 'Tu as déjà tenté cette question' });
      return;
    }
    if (isDuelMode(room) && room.quiz.firstBuzz && String(room.quiz.firstBuzz.playerId) !== String(meta.playerId)) {
      ack({ ok: false, error: 'Un autre joueur répond' });
      return;
    }
    if (isParisMode(room) && room.quiz.firstBuzz && String(room.quiz.firstBuzz.playerId) !== String(meta.playerId)) {
      ack({ ok: false, error: 'Un autre joueur a buzzé' });
      return;
    }
    if (room.quiz.buzzes?.some(b => b.playerId === meta.playerId)) {
      ack({ ok: true, room: toPublicRoom(room) });
      return;
    }
    const buzz = {
      playerId: meta.playerId,
      name: player.name,
      at: Date.now(),
    };
    room.quiz.buzzes = [...(room.quiz.buzzes || []), buzz].sort((a, b) => a.at - b.at);
    if (!room.quiz.firstBuzz) room.quiz.firstBuzz = buzz;

    if (isParisMode(room) && room.quiz.paris?.etoileEnCours && !room.quiz.paris.attenteMise) {
      const paris = room.quiz.paris;
      paris.buzzeurId = meta.playerId;
      paris.attenteMise = true;
      paris.miseEnCours = 0;
      if (room.quiz.questionTimer) {
        clearTimeout(room.quiz.questionTimer);
        room.quiz.questionTimer = null;
      }
      const scoreActuel = player.score || 5;
      const miseMax = Math.max(1, scoreActuel - 1);
      touchRoom(room);
      if (player.socketId) io.to(player.socketId).emit('paris:choisir-mise', { scoreActuel, miseMax });
      socket.to(room.code).emit('paris:attente-mise', { nomBuzzeur: player.name });
      ack({ ok: true, room: toPublicRoom(room), first: true, etoile: true });
      emitRoom(room);
      paris.timerMise = setTimeout(() => {
        const liveRoom = rooms.get(room.code);
        if (!liveRoom?.quiz?.paris?.attenteMise) return;
        liveRoom.quiz.paris.attenteMise = false;
        liveRoom.quiz.paris.miseEnCours = 0;
        io.to(room.code).emit('paris:mise-confirmee', { mise: 0, passe: true });
        scheduleQuestionTimeout(liveRoom);
        touchRoom(liveRoom);
        emitRoom(liveRoom);
      }, 12000);
      return;
    }

    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room), first: room.quiz.firstBuzz.playerId === meta.playerId });
    emitRoom(room);
  });


  socket.on('quiz:reveal', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !meta.host || meta.playerId !== room.hostId || !room.quiz) {
      ack({ ok: false, error: 'Action non autorisée' });
      return;
    }
    if (room.quiz.revealed) {
      ack({ ok: true, room: toPublicRoom(room) });
      return;
    }
    revealQuiz(room);
    touchRoom(room);
    io.to(room.code).emit('quiz:revealed', {
      questions: room.quiz.questions,
      counts: room.quiz.counts,
      players: room.players,
    });
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  socket.on('quiz:next', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    const expectedAnswers = room?.quiz
      ? quizPlayers(room).filter(p => !isJoueurQualifieManche1(room, p.id)).length
      : 0;
    const answeredCount = Object.keys(room?.quiz?.answers || {}).length;
    const classicCanAdvance = room && meta && room.quiz && isClassicBuzzMode(room) && room.quiz.status === 'revealed' && expectedAnswers > 0 && answeredCount >= expectedAnswers;
    if (!room || !meta || (!meta.host && !classicCanAdvance) || (meta.host && meta.playerId !== room.hostId) || !room.quiz) {
      ack({ ok: false, error: 'Action non autorisée' });
      return;
    }
    advanceQuiz(room);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  // ── Multi-manche (mode classique) ──────────────────────────────────────────

  socket.on('game:finish-manche', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !meta.host || meta.playerId !== room.hostId) {
      ack({ ok: false, error: 'Seul l\'hôte peut terminer la manche' });
      return;
    }
    if (!room.quiz || room.quiz.status !== 'finished') {
      ack({ ok: false, error: 'La manche n\'est pas encore terminée' });
      return;
    }
    const mancheNum = Number(room.manche || 1);
    const players = quizPlayers(room);
    // Manche 2 (série) : tri par meilleure série puis score ; manche 1/3 : tri par score
    const sorted = [...players].sort((a, b) =>
      mancheNum === 2
        ? (b.serieMax || b.serie || 0) - (a.serieMax || a.serie || 0) || (b.score || 0) - (a.score || 0)
        : (b.score || 0) - (a.score || 0)
    );

    let qualifiedIds = [];
    let nextManche = null;

    if (mancheNum === 1) {
      const objectif = Math.min(3, players.length);
      const idsQualifiesQuiz = room.quiz?.manche1Qualified || [];
      qualifiedIds = sorted
        .filter(p => idsQualifiesQuiz.some(id => String(id) === String(p.id)) || p.qualifie || p.qualified)
        .slice(0, objectif)
        .map(p => p.id);
      if (qualifiedIds.length < objectif) {
        qualifiedIds = sorted.slice(0, objectif).map(p => p.id);
      }
      nextManche = qualifiedIds.length <= 2 ? 3 : 2;
    } else if (mancheNum === 2) {
      qualifiedIds = sorted.slice(0, 2).map(p => p.id);
      nextManche = 3;
    }

    const results = sorted.map((p, i) => ({
      id: p.id, name: p.name, init: p.init, color: p.color,
      score: p.score || 0,
      serie: p.serieMax || p.serie || 0,
      qualified: qualifiedIds.includes(p.id),
    }));

    room.mancheResults = room.mancheResults || {};
    room.mancheResults[`m${mancheNum}`] = { results, qualifiedIds, nextManche };
    room.manche = mancheNum;
    room.phase = 'manche-results';
    room.quiz = null;

    // Filter players to only qualified for next manche (keep host)
    if (nextManche && qualifiedIds.length) {
      room.players = room.players.filter(p => p.host || qualifiedIds.includes(p.id));
    }

    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room), results, qualifiedIds, nextManche });
    emitRoom(room);
  });

  socket.on('game:start-next-manche', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !meta.host || meta.playerId !== room.hostId) {
      ack({ ok: false, error: 'Seul l\'hôte peut lancer la manche suivante' });
      return;
    }
    if (room.phase !== 'manche-results') {
      ack({ ok: false, error: 'Aucun résultat de manche en attente' });
      return;
    }
    const currentManche = Number(room.manche || 1);
    const nextManche = currentManche + 1;
    room.manche = nextManche;

    if (nextManche === 2) {
      room.mancheMode = 'serie';
      // Reset per-manche streaks on players
      room.players.forEach(p => { p.serie = 0; p.serieMax = 0; });
    } else if (nextManche >= 3) {
      room.mancheMode = 'duel-final';
      // Keep only the 2 finalists (+ host)
      const m2 = room.mancheResults?.m2;
      const finalistIds = m2?.qualifiedIds?.length >= 2
        ? m2.qualifiedIds.slice(0, 2)
        : [...room.players].filter(p => !p.host).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 2).map(p => p.id);
      room.players = room.players.filter(p => p.host || finalistIds.some(id => String(id) === String(p.id)));
      // Reset scores for the duel (fresh start)
      room.players.forEach(p => { p.score = 0; });
      // Switch config to duel so isDuelMode() works throughout
      room.config = normalizeConfig({ ...room.config, mode: 'duel' });
    } else {
      room.mancheMode = 'buzz';
    }

    room.phase = 'intro';
    room.intro = {
      manche: nextManche,
      title: payload.title || (nextManche === 2 ? 'Manche 2 · 4 à la Suite' : nextManche >= 3 ? 'Manche 3 · Face à Face' : `Manche ${nextManche}`),
      subtitle: payload.subtitle || (nextManche === 2 ? 'Enchaînez les bonnes réponses' : nextManche >= 3 ? 'Le duel final' : 'Préparez-vous'),
      startsAt: Date.now() + 450,
    };
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  // ══ MODE PARIS POT-COMMUN (nouveaux événements, mécanique simultanée) ══════

  socket.on('paris:lancer', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !meta.host || meta.playerId !== room.hostId) {
      ack({ ok: false, error: 'Seul l\'hôte peut lancer le Mode Paris' });
      return;
    }
    if (isRateLimited(socket)) {
      ack({ ok: false, error: 'Trop de requêtes' });
      return;
    }
    if (room.parisGame?.actif) {
      ack({ ok: true });
      return;
    }

    const nbQuestions = Math.max(1, Math.min(50, Number(payload.nbQuestions) || 10));
    const quizQs = pickQuestions({ ...room.config, nbQuestions });
    if (!quizQs.length) {
      ack({ ok: false, error: 'Aucune question disponible' });
      return;
    }

    const chronoLancer = Math.max(10, Math.min(60, Number(payload.chrono) || 25));
    room.parisGame = {
      actif:       true,
      questions:   quizQs,
      indexQ:      0,
      nbQuestions: quizQs.length,
      chrono:      chronoLancer,
      pot:         0,
      jackpot:     0,
      mises:       {},
      reponses:    {},
      confirmes:   new Set(),
      scores:      {},
      allinUsed:   new Set(),
      timerHandle: null,
      transitionTimer: null,
      timerVal:    0,
    };

    room.players.forEach(p => {
      room.parisGame.scores[p.id] = 2500;
    });

    const joueurs = room.players.map(p => ({
      id:       p.id,
      nom:      p.name,
      init:     p.init || getInitials(p.name),
      colorIdx: p.color || 0,
      score:    2500,
    }));

    touchRoom(room);
    io.to(room.code).emit('paris:debut', {
      joueurs,
      nbQuestions: quizQs.length,
      question: _parisQuestionPayload(quizQs[0]),
      indexQ: 0,
    });
    ack({ ok: true });

    room.parisGame.timerHandle = setTimeout(() => {
      const liveRoom = rooms.get(room.code);
      if (liveRoom?.parisGame?.actif) _parisStartChrono(liveRoom, chronoLancer);
    }, 5000);
  });

  socket.on('paris:confirmer', (payload = {}, ack = () => {}) => {
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !room.parisGame?.actif) {
      ack({ ok: false, error: 'Partie Paris inactive' });
      return;
    }
    const pg       = room.parisGame;
    const playerId = meta.playerId;
    if (pg.confirmes.has(playerId)) {
      ack({ ok: false });
      return;
    }

    const scoreActuel  = pg.scores[playerId] || 2500;
    const miseValidee  = Math.min(Math.max(0, Number(payload.mise) || 0), Math.max(0, scoreActuel - 1));
    const reponse      = Number.isInteger(payload.reponse) ? payload.reponse : null;
    const allinDemande = Boolean(payload.allin);

    if (allinDemande && !pg.allinUsed.has(playerId)) {
      pg.allinUsed.add(playerId);
      pg.mises[playerId]   = scoreActuel;
    } else {
      pg.mises[playerId]   = miseValidee;
    }
    pg.reponses[playerId] = reponse;
    pg.confirmes.add(playerId);

    io.to(room.code).emit('paris:joueur-pret', { playerId });
    ack({ ok: true });
    touchRoom(room);

    const joueursActifs = room.players.filter(p => p.connected !== false);
    if (pg.confirmes.size >= joueursActifs.length) {
      _parisStopChrono(room);
      _parisRevelerEtTraiter(room);
    }
  });

  // ── MODE POUVOIRS CONFIG-SALLE (création / lobby / partie) ───────────────

  socket.on('pouvoirs:creer-salle', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) { ack({ ok: false, erreur: 'Trop de requêtes' }); return; }
    if (rooms.size >= MAX_ROOMS) { ack({ ok: false, erreur: 'Trop de salles actives' }); return; }

    const pseudo = sanitizePseudo(payload.pseudo || payload.player?.name || 'Hôte');
    const code = makeCode('POUVOIRS');
    const playerToken = makeSecret();
    const player = {
      socketId: socket.id,
      id: creerIdJoueur(),
      playerToken,
      nom: pseudo,
      name: pseudo,
      init: getInitials(pseudo),
      color: 0,
      host: true,
      connected: true,
      deconnecte: false,
    };
    const room = {
      code,
      type: 'pouvoirs-config',
      hostId: player.id,
      hostSocketId: socket.id,
      config: {
        nbJoueurs: Math.max(2, Math.min(4, Number(payload.config?.nbJoueurs) || 4)),
      },
      players: [player],
      pouvoirsGame: null,
      phase: 'lobby',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    rooms.set(code, room);
    socket.join(code);
    socketMeta.set(socket.id, { code, playerId: player.id, host: true });
    ack({ ok: true, code, player: { id: player.id, name: pseudo }, playerToken });
    io.to(code).emit('pouvoirs:lobby-update', {
      joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name, host: Boolean(p.host) })),
    });
  });

  socket.on('pouvoirs:rejoindre-salle', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) { ack({ ok: false, erreur: 'Trop de requêtes' }); return; }
    if (estJoinBloque(socket)) { ack({ ok: false, erreur: 'Trop de codes invalides, réessaie dans une minute' }); return; }
    const resolvedCode = resolveRoomCode(payload.code);
    if (!resolvedCode) {
      enregistrerJoinEchoue(socket);
      ack({ ok: false, erreur: 'Salle introuvable' });
      return;
    }
    oublierJoinEchoues(socket);
    const room = rooms.get(resolvedCode);
    if (!room || (room.type !== 'pouvoirs-config' && room.type !== 'pouvoirs')) {
      ack({ ok: false, erreur: 'Cette salle n\'est pas une partie Pouvoirs.' });
      return;
    }
    const maxJ = room.config?.nbJoueurs || 4;
    const reconnecte = trouverJoueurParToken(room, payload.playerToken);
    if (reconnecte) {
      rattacherJoueur(socket, room, reconnecte, resolvedCode, Boolean(reconnecte.host));
      touchRoom(room);
      ack({ ok: true, code: resolvedCode, player: { id: reconnecte.id, name: reconnecte.nom || reconnecte.name }, playerToken: reconnecte.playerToken, reconnecte: true });
      io.to(resolvedCode).emit('pouvoirs:lobby-update', {
        joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name, host: Boolean(p.host) })),
      });
      return;
    }
    if (compterJoueursConnectes(room) >= maxJ) { ack({ ok: false, erreur: 'Salle pleine' }); return; }

    const pseudo = sanitizePseudo(payload.pseudo || payload.player?.name || `Joueur ${room.players.length + 1}`);
    const playerToken = makeSecret();
    const player = {
      socketId: socket.id,
      id: creerIdJoueur(),
      playerToken,
      nom: pseudo,
      name: pseudo,
      init: getInitials(pseudo),
      color: room.players.length,
      host: false,
      connected: true,
      deconnecte: false,
    };
    room.players.push(player);
    touchRoom(room);
    socket.join(resolvedCode);
    socketMeta.set(socket.id, { code: resolvedCode, playerId: player.id, host: false });
    ack({ ok: true, code: resolvedCode, player: { id: player.id, name: pseudo }, playerToken });
    io.to(resolvedCode).emit('pouvoirs:lobby-update', {
      joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name, host: Boolean(p.host) })),
    });
  });

  socket.on('pouvoirs:lancer-partie', (payload = {}, ack = () => {}) => {
    const meta = socketMeta.get(socket.id);
    const code = resolveRoomCode(payload.code) || meta?.code;
    const room = code ? rooms.get(code) : null;
    if (!room || !meta || meta.playerId !== room.hostId) {
      ack?.({ ok: false, erreur: 'Non autorisé' });
      return;
    }
    if (room.pouvoirsGame?.actif) {
      ack?.({ ok: true });
      return;
    }
    if (compterJoueursConnectes(room) < 2) {
      ack?.({ ok: false, erreur: 'Il faut au moins 2 joueurs' });
      return;
    }

    const cfg = payload.config || {};
    const nbQuestions = Math.max(1, Math.min(30, Number(cfg.nbQuestions) || 10));
    const chrono = Math.max(5, Math.min(60, Number(cfg.chrono) || 20));
    const categorie = String(cfg.categorie || cfg.category || 'mix');
    const quizCfg = {
      category: normalizeText(categorie) === 'mix' ? '' : categorie,
      difficulty: String(cfg.difficulte || cfg.difficulty || 'Moyen'),
      nbQuestions,
    };
    const quizQs = pickQuestions(quizCfg);
    if (!quizQs.length) {
      ack?.({ ok: false, erreur: 'Aucune question disponible' });
      return;
    }

    room.type = 'pouvoirs';
    room.phase = 'game';
    room.config = {
      ...room.config,
      ...quizCfg,
      mode: 'pouvoirs',
      nbQuestions: quizQs.length,
      chrono,
      nbJoueurs: compterJoueursConnectes(room),
    };
    room.pouvoirsGame = {
      actif: true,
      questions: quizQs,
      indexQ: 0,
      nbQuestions: quizQs.length,
      chrono,
      scores: Object.fromEntries(room.players.map(p => [p.id, 0])),
      reponses: {},
      confirmes: new Set(),
      joueursPrets: new Set(),
      timer: null,
      timerHandle: null,
      fallbackTimer: null,
      transitionTimer: null,
      departSignale: false,
      timerVal: 0,
      timerValAuMomentConfirme: {},
      stacks: Object.fromEntries(room.players.map(p => [p.id, []])),
      consecutifs: Object.fromEntries(room.players.map(p => [p.id, 0])),
      bouclierActif: Object.fromEntries(room.players.map(p => [p.id, false])),
      pressionAppliquee: Object.fromEntries(room.players.map(p => [p.id, false])),
      eclairActif: Object.fromEntries(room.players.map(p => [p.id, false])),
      revealing: false,
    };

    touchRoom(room);
    io.to(code).emit('pouvoirs:debut', {
      joueurs: _pouvoirsJoueursPublics(room),
      nbQuestions: quizQs.length,
      question: _pouvoirsQuestionPayload(quizQs[0]),
      indexQ: 0,
      chrono,
      stacks: room.pouvoirsGame.stacks,
    });
    ack?.({ ok: true });

    // Filet de sécurité : on démarre quand même si un joueur ne signale
    // jamais qu'il est arrivé sur l'écran de jeu.
    room.pouvoirsGame.fallbackTimer = setTimeout(() => {
      const liveRoom = rooms.get(code);
      if (liveRoom?.pouvoirsGame?.actif) _pouvoirsSignalerTousPrets(liveRoom, code);
    }, 90000);
  });

  socket.on('pouvoirs:pret', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.code) return;

    const room = rooms.get(meta.code);
    const pg   = room?.pouvoirsGame;
    if (!pg) return;

    const joueur = room.players.find(p => p.socketId === socket.id || p.id === meta.playerId);
    if (!joueur) return;

    pg.joueursPrets = pg.joueursPrets || new Set();
    pg.joueursPrets.add(joueur.id);

    const tousPrets = room.players
      .filter(p => p.connected !== false && !p.deconnecte)
      .every(p =>
        pg.joueursPrets.has(p.id)
    );

    if (tousPrets) {
      if (pg.fallbackTimer) {
        clearTimeout(pg.fallbackTimer);
        pg.fallbackTimer = null;
      }
      _pouvoirsSignalerTousPrets(room, meta.code);
    }
  });

  socket.on('pouvoirs:confirmer', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) { ack({ ok: false, erreur: 'Trop de requêtes' }); return; }
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !room.pouvoirsGame?.actif) {
      ack({ ok: false, erreur: 'Partie Pouvoirs inactive' });
      return;
    }

    const pg = room.pouvoirsGame;
    const playerId = meta.playerId;
    if (pg.revealing) {
      ack({ ok: false, erreur: 'Question en révélation' });
      return;
    }
    if (pg.confirmes.has(playerId)) {
      ack({ ok: false, erreur: 'Réponse déjà confirmée' });
      return;
    }

    const choix = Number.isInteger(payload.reponse) ? payload.reponse
                : Number.isInteger(payload.choice) ? payload.choice
                : null;
    pg.reponses[playerId] = choix;
    pg.timerValAuMomentConfirme[playerId] = Number(pg.timerVal) || 0;
    pg.confirmes.add(playerId);
    touchRoom(room);

    io.to(room.code).emit('pouvoirs:joueur-confirme', { playerId });
    ack({ ok: true });

    if (pg.confirmes.size >= _pouvoirsJoueursActifs(room).length) {
      _pouvoirsRevelerEtTraiter(room, room.code);
    }
  });

  // ── Joueur a appuyé sur le buzzer (avant de sélectionner) ──
  socket.on('pouvoirs:buzz', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.code) return;

    const room = rooms.get(meta.code);
    if (!room?.pouvoirsGame?.actif) return;

    const joueur = room.players.find(p =>
      (p.socketId || p.id) === socket.id
    );
    if (!joueur) return;

    io.to(meta.code).emit('pouvoirs:joueur-buzze', {
      playerId: joueur.id,
    });
  });

  socket.on('pouvoirs:utiliser', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) { ack({ ok: false, erreur: 'Trop de requêtes' }); return; }
    const room = roomForSocket(socket);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || !room.pouvoirsGame?.actif) {
      ack({ ok: false, erreur: 'Partie Pouvoirs inactive' });
      return;
    }

    const pg = room.pouvoirsGame;
    const playerId = meta.playerId;
    const type = String(payload.type || '').trim().toLowerCase();
    const stack = pg.stacks[playerId] || [];
    const index = stack.indexOf(type);
    if (index < 0) {
      ack({ ok: false, erreur: 'Pouvoir indisponible' });
      return;
    }

    const retirerPouvoir = () => {
      stack.splice(index, 1);
      pg.stacks[playerId] = stack;
    };

    if (type === 'eclair') {
      retirerPouvoir();
      pg.eclairActif[playerId] = true;
    } else if (type === 'bouclier') {
      retirerPouvoir();
      pg.bouclierActif[playerId] = true;
    } else if (type === 'pression') {
      const cibleId = String(payload.cibleId || payload.targetId || '');
      const cible = room.players.find(p => String(p.id) === cibleId);
      if (!cible || cible.id === playerId) {
        ack({ ok: false, erreur: 'Cible invalide' });
        return;
      }
      retirerPouvoir();
      pg.pressionAppliquee[cible.id] = true;
      io.to(cible.socketId || cible.id).emit('pouvoirs:pression-recue', { from: playerId });
    } else if (type === 'indice') {
      const q = pg.questions[pg.indexQ];
      const correct = q?.c ?? q?.indexCorrect ?? 0;
      const mauvaises = [0, 1, 2, 3].filter(i => i !== correct);
      const eliminee = mauvaises[Math.floor(Math.random() * mauvaises.length)];
      retirerPouvoir();
      io.to(socket.id).emit('pouvoirs:indice-recu', { eliminee });
    } else {
      ack({ ok: false, erreur: 'Pouvoir inconnu' });
      return;
    }

    touchRoom(room);
    io.to(room.code).emit('pouvoirs:stacks-update', { stacks: pg.stacks });
    io.to(room.code).emit('pouvoirs:pouvoir-utilise', { playerId, type });
    ack({ ok: true });
  });

  // ── MODE PARIS CONFIG-SALLE (creer / rejoindre / lancer) ─────────────────

  socket.on('paris:creer-salle', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) { ack({ erreur: 'Trop de requêtes' }); return; }
    if (rooms.size >= MAX_ROOMS) { ack({ erreur: 'Trop de salles actives' }); return; }
    const pseudo = sanitizePseudo(payload.pseudo || 'Hôte');
    const code   = makeCode('PARIS');
    const playerToken = makeSecret();
    const player = {
      socketId: socket.id, id: creerIdJoueur(), playerToken,
      nom: pseudo, name: pseudo,
      init: getInitials(pseudo), color: 0, host: true,
      connected: true, deconnecte: false,
    };
    const room = {
      code,
      type:           'paris-config',
      hostId:         player.id,
      hostSocketId:   socket.id,
      config:         {},
      players:        [player],
      parisGame:      null,
      phase:          'lobby',
      createdAt:      Date.now(),
      lastActivityAt: Date.now(),
    };
    rooms.set(code, room);
    socket.join(code);
    socketMeta.set(socket.id, { code, playerId: player.id, host: true });
    ack({ ok: true, code, player: { id: player.id, name: pseudo }, playerToken });
    io.to(code).emit('paris:lobby-update', {
      joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name })),
    });
  });

  socket.on('paris:rejoindre-salle', (payload = {}, ack = () => {}) => {
    if (isRateLimited(socket)) { ack({ erreur: 'Trop de requêtes' }); return; }
    if (estJoinBloque(socket)) { ack({ erreur: 'Trop de codes invalides, réessaie dans une minute' }); return; }
    const resolvedCode = resolveRoomCode(payload.code);
    if (!resolvedCode) {
      enregistrerJoinEchoue(socket);
      ack({ erreur: 'Salle introuvable' });
      return;
    }
    oublierJoinEchoues(socket);
    const room = rooms.get(resolvedCode);
    if (room.type !== 'paris-config' && room.type !== 'paris') {
      ack({ erreur: 'Cette salle n\'est pas une partie Paris.' });
      return;
    }
    const maxJ = room.config?.nbJoueurs || 4;
    const reconnecte = trouverJoueurParToken(room, payload.playerToken);
    if (reconnecte) {
      rattacherJoueur(socket, room, reconnecte, resolvedCode, Boolean(reconnecte.host));
      touchRoom(room);
      ack({ ok: true, code: resolvedCode, player: { id: reconnecte.id, name: reconnecte.nom || reconnecte.name }, playerToken: reconnecte.playerToken, reconnecte: true });
      io.to(resolvedCode).emit('paris:lobby-update', {
        joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name })),
      });
      return;
    }
    if (compterJoueursConnectes(room) >= maxJ) { ack({ erreur: 'Salle pleine' }); return; }
    const pseudo = sanitizePseudo(payload.pseudo || `Joueur ${room.players.length + 1}`);
    const playerToken = makeSecret();
    const player = {
      socketId: socket.id, id: creerIdJoueur(), playerToken,
      nom: pseudo, name: pseudo,
      init: getInitials(pseudo), color: room.players.length, host: false,
      connected: true, deconnecte: false,
    };
    room.players.push(player);
    touchRoom(room);
    socket.join(resolvedCode);
    socketMeta.set(socket.id, { code: resolvedCode, playerId: player.id, host: false });
    ack({ ok: true, code: resolvedCode, player: { id: player.id, name: pseudo }, playerToken });
    io.to(resolvedCode).emit('paris:lobby-update', {
      joueurs: room.players.map(p => ({ id: p.id, nom: p.nom || p.name })),
    });
  });

  socket.on('paris:lancer-partie', (payload = {}, ack = () => {}) => {
    const code = String(payload.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    const meta = socketMeta.get(socket.id);
    if (!room || !meta || meta.playerId !== room.hostId) { ack?.({ erreur: 'Non autorisé' }); return; }
    if (room.parisGame?.actif) { ack?.({ ok: true }); return; }
    if (compterJoueursConnectes(room) < 2) { ack?.({ erreur: 'Il faut au moins 2 joueurs' }); return; }
    const cfg         = payload.config || {};
    const chrono      = Math.max(10, Math.min(60, Number(cfg.chrono)      || 25));
    const nbQuestions = Math.max(1,  Math.min(50, Number(cfg.nbQuestions) || 20));
    const quizCfg     = {
      category:    String(cfg.categorie  || 'Culture générale'),
      difficulty:  String(cfg.difficulte || 'Moyen'),
      nbQuestions,
    };
    const quizQs = pickQuestions(quizCfg);
    if (!quizQs.length) { ack?.({ erreur: 'Aucune question disponible' }); return; }
    room.config   = { ...room.config, ...quizCfg, chrono };
    room.parisGame = {
      actif:       true,
      questions:   quizQs,
      indexQ:      0,
      nbQuestions: quizQs.length,
      chrono,
      pot:         0,
      jackpot:     0,
      mises:       {},
      reponses:    {},
      confirmes:   new Set(),
      scores:      Object.fromEntries(room.players.map(p => [p.id, 2500])),
      allinUsed:   new Set(),
      timerHandle: null,
      transitionTimer: null,
      timerVal:    0,
    };
    const joueurs = room.players.map((p, ci) => ({
      id:       p.id,
      nom:      p.nom || p.name,
      init:     p.init || getInitials(p.nom || p.name || 'J'),
      colorIdx: p.color ?? ci,
      score:    2500,
    }));
    touchRoom(room);
    io.to(code).emit('paris:debut', {
      joueurs,
      nbQuestions: quizQs.length,
      question: _parisQuestionPayload(quizQs[0]),
      indexQ: 0,
    });
    ack?.({ ok: true });
    room.parisGame.timerHandle = setTimeout(() => {
      const liveRoom = rooms.get(code);
      if (liveRoom?.parisGame?.actif) _parisStartChrono(liveRoom, chrono);
    }, 5000);
  });

  // ───────────────────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    socketMeta.delete(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.code);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id || p.id === meta.playerId);
    if (player) {
      player.socketId = null;
      player.connected = false;
      player.deconnecte = true;
    }
    emitRoom(room);

    setTimeout(() => {
      const latest = rooms.get(meta.code);
      if (!latest) return;
      latest.players = latest.players.filter(p => p.connected || p.id !== meta.playerId);
      if (!latest.players.length) clearQuizTimers(latest);
      if (!latest.players.length) {
        rooms.delete(meta.code);
        return;
      }
      if (!latest.players.some(p => p.id === latest.hostId)) {
        latest.players[0].host = true;
        latest.hostId = latest.players[0].id;
      }
      emitRoom(latest);
    }, 30000);
  });
});

['SIGTERM', 'SIGINT'].forEach(sig => {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
});

server.listen(PORT, () => {
  console.log(`[qpuc] Frontend + backend temps réel: http://localhost:${PORT}`);
});
