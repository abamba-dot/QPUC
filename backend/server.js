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

const ROOM_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const ROOM_INACTIVE_MS = 30 * 60 * 1000;
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 500);
const RATE_WINDOW_MS = 10 * 1000;
const RATE_MAX_EVENTS = 80;
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
    const allGone = room.players.every(p => !p.connected);
    if (age > ROOM_MAX_AGE_MS || (inactive > ROOM_INACTIVE_MS && allGone)) {
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
  if (/^CHMP-[A-Z2-9]{4}$/.test(data)) return rooms.has(data);
  try {
    const url = new URL(data, `http://${host || 'localhost'}`);
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
    const isSpaJoin = url.pathname === '/' && url.searchParams.get('ecran') === 'rejoindre-salle';
    return isSpaJoin && /^CHMP-[A-Z2-9]{4}$/.test(code) && rooms.has(code);
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
      if (pseudo.length < 2) { sendJson(res, 400, { erreur: 'Pseudo trop court (minimum 2 caractères)' }); return; }
      if (pin.length < 4) { sendJson(res, 400, { erreur: 'Code secret trop court (minimum 4 caractères)' }); return; }
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
        sendJson(res, 401, { erreur: 'Pseudo ou code secret incorrect' });
        return;
      }
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
      if (!pseudoSession) {
        sendJson(res, 401, { erreur: 'Connexion requise' });
        return;
      }
      if (normaliserClePseudo(pseudoSession) !== normaliserClePseudo(pseudo)) {
        sendJson(res, 403, { erreur: 'Session invalide pour ce pseudo' });
        return;
      }
      await sauvegarderPartie(pseudo, {
        score: parseInt(body.score, 10) || 0,
        victoire: Boolean(body.victoire),
        serieMax: parseInt(body.serieMax, 10) || 0,
        manche: parseInt(body.manche, 10) || 1,
        mode: body.mode || 'fidele',
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
  const maxPlayersLimit = (mode === 'duel' || mode === 'duel-multijoueur') ? 4 : 12;
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

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = 'CHMP-';
    for (let i = 0; i < 4; i += 1) code += chars[crypto.randomInt(chars.length)];
  } while (rooms.has(code));
  return code;
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
  if (!room?.quiz || isDuelMode(room) || !isClassicBuzzMode(room)) return false;
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
  if (!room?.quiz) return;
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
  room.quiz.questionTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom?.quiz || liveRoom.quiz.status !== 'question' || liveRoom.quiz.revealed) return;
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
  scheduleQuestionTimeout(room);
}

function scheduleClassicAutoNext(room) {
  if (room.quiz.autoNextTimer) clearTimeout(room.quiz.autoNextTimer);
  room.quiz.autoNextTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom?.quiz || liveRoom.quiz.status !== 'revealed' || !isClassicBuzzMode(liveRoom)) return;
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

function roomForSocket(socket) {
  const meta = socketMeta.get(socket.id);
  return meta ? rooms.get(meta.code) : null;
}

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
    const code = String(payload.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      ack({ ok: false, error: 'Salle introuvable' });
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
    room.players = room.players.filter(p => p.id !== player.id && p.socketId !== socket.id);
    room.players.push(player);
    touchRoom(room);
    socket.join(code);
    if (reconnectsHost) room.hostSocketId = socket.id;
    socketMeta.set(socket.id, { code, playerId: player.id, host: reconnectsHost });
    ack({ ok: true, room: toPublicRoom(room), player: toPublicPlayer(player), playerToken: player.playerToken });
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
    const mancheMode = room.mancheMode || 'buzz';
    const isDuelFinal = mancheMode === 'duel-final' || isDuelMode({ config });
    // Serie mode: shorter questions; duel-final uses duel mechanics
    const questionDuration = mancheMode === 'serie' ? 8 : QUIZ_QUESTION_DURATION_SEC;
    room.quiz = {
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
    room.phase = 'playing';
    room.intro = null;
    scheduleQuestionTimeout(room);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  socket.on('quiz:answer', (payload = {}, ack = () => {}) => {
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
    const expectedAnswers = quizPlayers(room)
      .filter(p => !isJoueurQualifieManche1(room, p.id))
      .length;
    if (!isDuelMode(room) && (isClassicBuzzMode(room) || isSerie) && expectedAnswers > 0 && Object.keys(room.quiz.answers).length >= expectedAnswers) revealQuiz(room);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
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
    room.quiz.duel = room.quiz.duel || {};
    room.quiz.duel.hintIndex = Math.min(2, Number(room.quiz.duel.hintIndex || 0) + 1);
    touchRoom(room);
    ack({ ok: true, room: toPublicRoom(room) });
    emitRoom(room);
  });

  socket.on('quiz:buzz', (payload = {}, ack = () => {}) => {
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
    const classicCanAdvance = room && meta && room.quiz && isClassicBuzzMode(room) && room.quiz.status === 'revealed';
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
