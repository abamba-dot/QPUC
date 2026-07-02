/**
 * realtime-client.js — Client Socket.IO avec fallback local.
 * Le frontend reste utilisable sans backend : connectRealtime() renvoie null
 * si le serveur n'est pas disponible.
 */

const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const DEFAULT_URL = isLocalHost
  ? `${location.protocol}//${location.hostname}:3001`
  : location.origin;
let socketIoPromise = null;
let socketPromise = null;

function serverUrl() {
  const stored = localStorage.getItem('qpuc_realtime_url');
  if (!stored) return DEFAULT_URL;
  try {
    const url = new URL(stored, location.origin);
    const allowedHost =
      url.hostname === location.hostname ||
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1';
    if (!['http:', 'https:'].includes(url.protocol) || !allowedHost) return DEFAULT_URL;
    return url.origin;
  } catch (error) {
    return DEFAULT_URL;
  }
}

function loadSocketIo() {
  if (window.io) return Promise.resolve(window.io);
  if (socketIoPromise) return socketIoPromise;

  socketIoPromise = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = `${serverUrl()}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve(window.io || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return socketIoPromise;
}

function isValidClient(client) {
  return client && typeof client.prepareGame === 'function';
}

async function connectRealtime() {
  if (socketPromise) {
    const cached = await socketPromise.catch(() => null);
    // If the cached client is valid and the socket is still connected, reuse it
    if (isValidClient(cached) && cached.socket?.connected) return cached;
    // Stale, invalid or disconnected — start fresh
    socketPromise = null;
  }

  socketPromise = (async () => {
    const io = await loadSocketIo();
    if (!io) return null;

    const socket = io(serverUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 1200,
    });
    socket.setMaxListeners?.(25);
    socket.io?.engine?.setMaxListeners?.(25);

    const connected = await new Promise(resolve => {
      const done = value => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
        resolve(value);
      };
      const onConnect = () => done(true);
      const onError = () => done(false);
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
      setTimeout(() => done(socket.connected), 1400);
    });

    if (!connected) {
      socket.disconnect();
      return null;
    }

    return createClient(socket);
  })();

  return socketPromise;
}

function emitAck(socket, event, payload = {}) {
  return new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, error: 'Backend indisponible' });
      }
    }, 1800);

    socket.emit(event, payload, response => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response || { ok: false, error: 'Réponse vide' });
    });
  });
}

function createClient(socket) {
  // Reset the module-level cache when the socket disconnects so the next
  // connectRealtime() call creates a fresh connection instead of returning
  // this stale client.
  socket.once('disconnect', () => { socketPromise = null; });

  return {
    socket,
    online: true,
    onRoomUpdate(handler) {
      socket.on('room:update', handler);
      return () => socket.off('room:update', handler);
    },
    onDifficultyUpdate(handler) {
      socket.on('difficulte:mise-a-jour', handler);
      return () => socket.off('difficulte:mise-a-jour', handler);
    },
    onParisChoisirMise(handler) {
      socket.on('paris:choisir-mise', handler);
      return () => socket.off('paris:choisir-mise', handler);
    },
    onParisAttenteMise(handler) {
      socket.on('paris:attente-mise', handler);
      return () => socket.off('paris:attente-mise', handler);
    },
    onParisMiseConfirmee(handler) {
      socket.on('paris:mise-confirmee', handler);
      return () => socket.off('paris:mise-confirmee', handler);
    },
    createRoom(payload) {
      return emitAck(socket, 'room:create', payload);
    },
    joinRoom(payload) {
      return emitAck(socket, 'room:join', payload);
    },
    setReady(ready) {
      return emitAck(socket, 'player:ready', { ready });
    },
    prepareGame(payload = {}) {
      return emitAck(socket, 'game:prepare', payload);
    },
    startQuiz(payload = {}) {
      return emitAck(socket, 'quiz:start', payload);
    },
    answer(choice) {
      return emitAck(socket, 'quiz:answer', { choice });
    },
    buzz() {
      return emitAck(socket, 'quiz:buzz');
    },
    reveal() {
      return emitAck(socket, 'quiz:reveal');
    },
    hint() {
      return emitAck(socket, 'quiz:hint');
    },
    nextQuestion() {
      return emitAck(socket, 'quiz:next');
    },
    confirmerMise(mise) {
      return emitAck(socket, 'paris:confirmer-mise', { mise });
    },
    finishManche(payload = {}) {
      return emitAck(socket, 'game:finish-manche', payload);
    },
    startNextManche(payload = {}) {
      return emitAck(socket, 'game:start-next-manche', payload);
    },
  };
}

export { connectRealtime, serverUrl };
