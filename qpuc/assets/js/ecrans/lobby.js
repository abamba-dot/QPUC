/* ════════════════════════════════════════════════
   Écran : lobby
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, esc } from '../utils.js';
import { avatarColor } from '../multiplayer-data.js';
import { mergeState } from '../state.js';
import { connectRealtime, serverUrl } from '../realtime-client.js';

export const titre = 'Salle d\'attente — CHAMPION.';

let arreterEcouteSalle = null;

function nettoyerEcoutesLobby() {
  if (typeof arreterEcouteSalle === 'function') {
    arreterEcouteSalle();
    arreterEcouteSalle = null;
  }
}

export const html = `
<a href="#main-content" class="skip-link">Passer au contenu principal</a>
  <div class="page lobby-page" id="main-content" data-screen-label="Salle d'attente">

  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>

  <!-- Header -->
  <div class="page-header marge-bas-12">
    <button class="back-btn" data-onclick="navigate('multijoueur.html')" aria-label="Quitter la salle">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Quitter
    </button>
    <span class="page-title">Salle d'attente</span>
    <div class="streak-badge" style="gap:7px">
      <div class="live-dot-lg"></div>
      <span class="taille-11" id="connection-status">Local</span>
    </div>
  </div>

  <div class="lobby-layout">

    <!-- Colonne gauche : joueurs -->
    <div class="card lobby-players">
      <div class="lobby-players__head">
        <span class="lobby-players__count" aria-live="polite"><span id="pcount">0</span>/<span id="pmax">0</span> joueurs</span>
        <span class="badge badge--glass" id="cfg-badge">Salle</span>
      </div>
      <div id="players" role="list"></div>

    </div>

    <!-- Colonne droite : code + partage + lancement -->
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
      <div class="card lobby-code-card">
        <div>
          <div class="lobby-code-label">Code de la salle</div>
          <div class="lobby-code-big" id="room-code">CHMP-····</div>
        </div>
        <div class="lobby-share">
          <div class="qr-box" id="qr-box"></div>
          <div class="lobby-share__text" id="lobby-share-text">
            Scannez le QR ou<br>partagez le code<br>pour inviter des amis.
          </div>
        </div>
        <button class="btn-secondary btn-full" id="copy-btn" data-onclick="copyCode()">Copier le code</button>
        <button class="btn-secondary btn-full" id="copy-link-btn" data-onclick="copyInviteLink()">Copier le lien</button>
      </div>

      <!-- Lancement (hôte) -->
      <div class="card panel" style="gap:10px">
        <div class="panel-label">Mode · <span id="mode-label">Classique</span></div>
        <div style="font-size:12px;color:var(--sub);line-height:1.5" id="ready-info">
          En attente de 2 joueurs…
        </div>
        <button class="btn-primary btn-full" id="start-btn" data-onclick="startGame()">Lancer la partie →</button>
        <button class="btn-secondary btn-full" id="ready-btn" data-onclick="toggleReady()">Je suis prêt</button>
        <button class="btn-secondary btn-full cache" id="player-view-btn" data-onclick="navigate('joueur-quiz.html')">Voir la vue joueur</button>
        <div class="taille-10 align-center" id="launch-hint">
          Les joueurs non prêts seront lancés automatiquement
        </div>
      </div>
    </div>

  </div>

  </div>



`;

export async function init(conteneur) {
  nettoyerEcoutesLobby();
  /* ── Conversion des événements inline ── */
  conteneur.querySelectorAll('[data-onclick]').forEach(el => {
    const code = el.dataset.onclick;
    // Navigation simple
    const navMatch = code.match(/navigate\('([^']+)'\)/);
    if (navMatch) {
      el.addEventListener('click', () => {
        const cible = navMatch[1];
        import('../routeur.js').then(m => m.naviguer(cible));
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Fonction globale simple sans argument
    if (/^[a-zA-Z0-9_$]+\(\)$/.test(code)) {
      const fnName = code.replace('()', '');
      el.addEventListener('click', () => {
        if (typeof window[fnName] === 'function') window[fnName]();
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Fonction avec argument numérique
    const fnNumMatch = code.match(/^(\w+)\((\d+)\)$/);
    if (fnNumMatch) {
      const [, fnName, arg] = fnNumMatch;
      el.addEventListener('click', () => {
        if (typeof window[fnName] === 'function') window[fnName](Number(arg));
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Pattern: fonction(this, 'string') — ex: selOpt(this, 'cat')
    const fnThisStrMatch = code.match(/^(\w+)\(this,\s*'([^']+)'\)$/);
    if (fnThisStrMatch) {
      const [, fnName, strArg] = fnThisStrMatch;
      el.addEventListener('click', function() {
        if (typeof window[fnName] === 'function') window[fnName](this, strArg);
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Fallback : eval restreint (regular function pour conserver 'this' = élément)
    el.addEventListener('click', function() {
      // eslint-disable-next-line no-eval
      eval(code);
    });
    el.removeAttribute('data-onclick');
  });

  conteneur.querySelectorAll('[data-onchange]').forEach(el => {
    const code = el.dataset.onchange;
    el.addEventListener('change', () => eval(code));
    el.removeAttribute('data-onchange');
  });

  conteneur.querySelectorAll('[data-oninput]').forEach(el => {
    const code = el.dataset.oninput;
    el.addEventListener('input', () => eval(code));
    el.removeAttribute('data-oninput');
  });

  /* ══════════════════════════════════════
     Logique extraite de l'écran
  ══════════════════════════════════════ */

  // Rendre navigate accessible aux attributs onclick=""
  window.naviguer = naviguer;
  
  // Initialisation thème et points de couleur
  initTheme();
  bindThemeDots();
    /* Code (depuis création éventuelle) */
    function readJSON(key, fallback) {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch(e) {
        return fallback;
      }
    }
  
    const code = sessionStorage.getItem('champ_room_code') || new URLSearchParams(location.search).get('code') || '----';
    if (code === '----') naviguer('creer-salle.html');
  
    const EMPTY_CONFIG = {
      category: 'Culture générale',
      difficulty: 'Moyen',
      nbQuestions: 10,
      manches: 3,
      visibility: 'Privée',
      maxPlayers: 8,
    };
    const roomConfig = readJSON('champ_room_config', EMPTY_CONFIG);
    const storedPlayers = readJSON('champ_room_players', null);
    document.getElementById('room-code').textContent = code;
    /* Fusionner avec EMPTY_CONFIG pour garantir que tous les champs existent */
    let activeConfig = Object.assign({}, EMPTY_CONFIG, roomConfig || {});
    let currentPlayer = readJSON('champ_current_player', null);
    document.getElementById('cfg-badge').textContent = `${(activeConfig.category || 'Culture').split(' ')[0]} · ${activeConfig.difficulty || 'Moyen'}`;
    document.getElementById('pmax').textContent = activeConfig.maxPlayers || 8;
  
    function isLocalHostName(hostname) {
      return ['localhost', '127.0.0.1', '::1'].includes(hostname);
    }
  
    let inviteUrl = `${serverUrl()}/?ecran=rejoindre-salle&code=${encodeURIComponent(code)}`;
  
    async function resolveInviteUrl() {
      if (sessionStorage.getItem('champ_room_backend') !== 'online') {
        inviteUrl = `${location.origin}/?ecran=rejoindre-salle&code=${encodeURIComponent(code)}`;
        return inviteUrl;
      }
      try {
        const response = await fetch(`${serverUrl()}/api/network`, { cache: 'no-store' });
        const info = await response.json();
        const current = new URL(serverUrl());
        const base = isLocalHostName(current.hostname) && info.lanOrigins?.length
          ? info.lanOrigins[0]
          : serverUrl();
        inviteUrl = `${base}/?ecran=rejoindre-salle&code=${encodeURIComponent(code)}`;
      } catch(e) {
        inviteUrl = `${serverUrl()}/?ecran=rejoindre-salle&code=${encodeURIComponent(code)}`;
      }
      return inviteUrl;
    }
  
    async function renderQr() {
      const qrBox = document.getElementById('qr-box');
      const url = await resolveInviteUrl();
      qrBox.innerHTML = '';
      const img = document.createElement('img');
      img.alt = `QR code pour rejoindre la salle ${code}`;
      img.src = `${serverUrl()}/api/qr?data=${encodeURIComponent(url)}`;
      img.onload = () => qrBox.classList.add('qr-box--ready');
      img.onerror = () => {
        qrBox.classList.remove('qr-box--ready');
        qrBox.textContent = code.slice(5);
      };
      qrBox.appendChild(img);
      document.getElementById('lobby-share-text').innerHTML =
        `Scannez pour rejoindre<br><span style="font-family:var(--font-display);font-weight:900;color:var(--text);letter-spacing:.04em">${code}</span>`;
    }
    if (code !== '----') renderQr();
  
    /* Mode de jeu (depuis le choix de mode) */
    const mode = sessionStorage.getItem('champ_mp_mode')
      || (activeConfig.mode === 'duel' ? 'duel' : activeConfig.mode === 'quiz-multijoueur' || activeConfig.mode === 'quiz' ? 'quiz' : 'classique');
    const MODE_LABELS = { classique: 'Classique', quiz: 'Quiz animé', duel: 'Duel', 'paris-multi': 'Mode Paris' };
    document.getElementById('mode-label').textContent = MODE_LABELS[mode] || 'Classique';
    if (mode === 'quiz') {
      document.getElementById('player-view-btn').style.display = 'inline-flex';
      document.getElementById('launch-hint').textContent = "Vous animez sur grand écran · les joueurs jouent sur leur téléphone";
    } else if (mode === 'duel') {
      document.getElementById('launch-hint').textContent = 'Format complet en ligne · 3 manches · 4 joueurs maximum';
    } else if (mode === 'paris-multi') {
      document.getElementById('launch-hint').textContent = 'Double ou rien · 5 points de départ · 4 joueurs maximum';
    }
  
    /* État des joueurs (copie locale modifiable) */
    let players = (storedPlayers?.length ? storedPlayers : []).map(p => ({ ...p }));
    if (!currentPlayer) currentPlayer = players[0];
    let realtime = null;
    let isOnline = sessionStorage.getItem('champ_room_backend') === 'online';
    let receivedRoomUpdate = false;
    document.getElementById('connection-status').textContent = isOnline ? 'Online' : 'Local';
  
    const playersEl = document.getElementById('players');
    function render() {
      playersEl.innerHTML = '';
      const visiblePlayers = mode === 'quiz' ? players.filter(p => !p.host) : players;
      visiblePlayers.forEach((p, i) => {
        const disconnected = p.connected === false;
        const row = document.createElement('div');
        row.className = 'lobby-player' + (disconnected ? ' lobby-player--offline' : '');
        row.style.animationDelay = (i * 0.06) + 's';
        const crown = p.host && mode === 'quiz'
          ? `<span class="host-crown" title="Hôte"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z"/></svg></span>`
          : '';
        const discBadge = disconnected
          ? `<span class="disconn-tag" title="Joueur déconnecté" style="font-size:10px;color:var(--sub);font-weight:700;letter-spacing:.04em">Absent</span>`
          : '';
        row.innerHTML = `
          <div class="avatar" style="background:${avatarColor(p.color)};opacity:${disconnected ? '.4' : '1'}">${esc(p.init)}</div>
          <span class="lobby-player__name">${esc(p.name)}${crown}${discBadge}</span>
          <span class="ready-pill ${disconnected ? 'ready-pill--no' : p.ready ? 'ready-pill--yes' : 'ready-pill--no'}">${disconnected ? 'Déconnecté' : p.ready ? 'Prêt' : 'En attente'}</span>`;
        playersEl.appendChild(row);
      });
      // Slots vides
      const empties = Math.min(2, Math.max(0, activeConfig.maxPlayers - visiblePlayers.length));
      for (let i = 0; i < empties; i++) {
        const row = document.createElement('div');
        row.className = 'lobby-player lobby-player--empty';
        row.innerHTML = `
          <div class="empty-av">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <span class="lobby-player__name">En attente…</span>`;
        playersEl.appendChild(row);
      }
      document.getElementById('pcount').textContent = visiblePlayers.length;
      updateReadyInfo();
    }
  
    function updateReadyInfo() {
      const gamePlayers = mode === 'quiz' ? players.filter(p => !p.host) : players;
      const notReady = gamePlayers.filter(p => !p.ready).length;
      const info = document.getElementById('ready-info');
      const startBtn = document.getElementById('start-btn');
      const readyBtn = document.getElementById('ready-btn');
      const enoughPlayers = mode === 'quiz' ? gamePlayers.length >= 1 : gamePlayers.length >= 2;
      const requiresReady = mode !== 'quiz';
      const me = players.find(p => String(p.id) === String(currentPlayer?.id)) || currentPlayer;
      const isHost = Boolean(me?.host);
      startBtn.style.display = isHost ? 'inline-flex' : 'none';
      readyBtn.style.display = isHost ? 'none' : 'inline-flex';
      readyBtn.textContent = me?.ready ? 'Je ne suis plus prêt' : 'Je suis prêt';
      startBtn.disabled = !enoughPlayers;

      if (!enoughPlayers) {
        info.textContent = mode === 'quiz' ? 'En attente d\'au moins 1 joueur…' : 'En attente d\'au moins 2 joueurs…';
      } else if (!isHost) {
        info.textContent = mode === 'quiz'
          ? "Connecté · en attente du lancement par l'hôte"
          : (me?.ready ? "Prêt · en attente du lancement par l'hôte" : 'Prépare-toi puis confirme.');
      } else if (notReady === 0) {
        info.innerHTML = `<span style="color:var(--color-correct);font-weight:700">Tous les joueurs sont prêts !</span>`;
      } else {
        info.textContent = `${notReady} joueur${notReady > 1 ? 's' : ''} pas encore prêt${notReady > 1 ? 's' : ''} — vous pouvez lancer.`;
      }
    }
    render();
  
    connectRealtime().then(client => {
      if (!client || sessionStorage.getItem('champ_room_backend') !== 'online') {
        isOnline = false;
        document.getElementById('connection-status').textContent = 'Hors ligne';
        document.getElementById('ready-info').textContent = 'Serveur multijoueur indisponible. Relancez le backend puis revenez.';
        document.getElementById('start-btn').disabled = true;
        return;
      }
      realtime = client;
      isOnline = true;
      document.getElementById('connection-status').textContent = 'Online';
      arreterEcouteSalle = realtime.onRoomUpdate(room => {
        if (!room || room.code !== code) return;
        if (room.phase === 'intro') {
          nettoyerEcoutesLobby();
          naviguer('intro-multi.html');
          return;
        }
        if (room.quiz?.status === 'question') {
          nettoyerEcoutesLobby();
          const me = (room.players || []).find(p => String(p.id) === String(currentPlayer?.id)) || currentPlayer;
          const roomMode = room.config?.mode || mode;
          const cible = roomMode === 'quiz-multijoueur' && me?.host
            ? 'hote-quiz.html'
            : 'jeu-multi.html';
          naviguer(cible);
          return;
        }
        receivedRoomUpdate = true;
        activeConfig = room.config || activeConfig;
        players = (room.players || players).map(p => ({ ...p }));
        currentPlayer = players.find(p => String(p.id) === String(currentPlayer?.id)) || currentPlayer;
        document.getElementById('cfg-badge').textContent = `${activeConfig.category.split(' ')[0]} · ${activeConfig.difficulty}`;
        document.getElementById('pmax').textContent = activeConfig.maxPlayers;
        try {
          sessionStorage.setItem('champ_room_config', JSON.stringify(activeConfig));
          sessionStorage.setItem('champ_room_players', JSON.stringify(players));
          sessionStorage.setItem('champ_current_player', JSON.stringify(currentPlayer));
        } catch(e) {}
        render();
      });
      realtime.joinRoom({
        code,
        player: currentPlayer,
        hostToken: sessionStorage.getItem('champ_room_host_token') || undefined,
        playerToken: sessionStorage.getItem('champ_room_player_token') || undefined,
      }).then(response => {
        if (response?.ok && response.room) {
          const joinedPlayer = response.player || currentPlayer;
          if (response.playerToken && !joinedPlayer?.host) {
            sessionStorage.setItem('champ_room_player_token', response.playerToken);
          } else if (joinedPlayer?.host) {
            sessionStorage.removeItem('champ_room_player_token');
          }
          activeConfig = response.room.config || activeConfig;
          players = (response.room.players || players).map(p => ({ ...p }));
          currentPlayer = players.find(p => String(p.id) === String(currentPlayer?.id)) || currentPlayer;
          try {
            sessionStorage.setItem('champ_room_config', JSON.stringify(activeConfig));
            sessionStorage.setItem('champ_room_players', JSON.stringify(players));
            sessionStorage.setItem('champ_current_player', JSON.stringify(currentPlayer));
          } catch(e) {}
          // Si la partie est déjà lancée (ex : reconnexion tardive), rattraper
          if (response.room.phase === 'intro') { nettoyerEcoutesLobby(); naviguer('intro-multi.html'); return; }
          if (response.room.quiz?.status === 'question') {
            nettoyerEcoutesLobby();
            const roomMode = response.room.config?.mode || mode;
            const cible = roomMode === 'quiz-multijoueur' && currentPlayer?.host
              ? 'hote-quiz.html'
              : 'jeu-multi.html';
            naviguer(cible); return;
          }
          render();
          renderQr();
          return;
        }
        // Si onRoomUpdate a déjà confirmé la salle, c'est un simple timeout d'ACK :
        // le socket est bien dans la salle côté serveur — pas d'erreur fatale.
        if (receivedRoomUpdate) {
          render();
          return;
        }
        // Salle expirée ou introuvable — proposer de recréer
        document.getElementById('connection-status').textContent = 'Erreur';
        const infoEl = document.getElementById('ready-info');
        const errMsg = response?.error || 'Salle introuvable ou expirée.';
        const isSalleExpired = errMsg.includes('introuvable') || errMsg.includes('expir');
        if (isSalleExpired) {
          infoEl.innerHTML = `${esc(errMsg)} — <button class="btn-link" style="font-weight:900;text-decoration:underline;cursor:pointer" id="new-room-btn">Créer une nouvelle salle</button>`;
          document.getElementById('new-room-btn')?.addEventListener('click', () => {
            sessionStorage.removeItem('champ_room_code');
            sessionStorage.removeItem('champ_room_host_token');
            sessionStorage.removeItem('champ_room_player_token');
            naviguer('creer-salle.html');
          });
        } else {
          infoEl.textContent = errMsg;
        }
        document.getElementById('start-btn').disabled = true;
      });
    }).catch(err => {
      console.warn('[lobby] connectRealtime échouée:', err);
      isOnline = false;
      document.getElementById('connection-status').textContent = 'Hors ligne';
      document.getElementById('ready-info').textContent = 'Connexion impossible au serveur.';
      document.getElementById('start-btn').disabled = true;
    });
  
    let simInterval = null;
  
    /* Copier le code */
    window.copyCode = function() {
      const btn = document.getElementById('copy-btn');
      navigator.clipboard?.writeText(code).catch(() => {});
      btn.textContent = 'Code copié ✓';
      setTimeout(() => { btn.textContent = 'Copier le code'; }, 1600);
    };
  
    window.copyInviteLink = async function() {
      const btn = document.getElementById('copy-link-btn');
      const url = await resolveInviteUrl();
      navigator.clipboard?.writeText(url).catch(() => {});
      btn.textContent = 'Lien copié ✓';
      setTimeout(() => { btn.textContent = 'Copier le lien'; }, 1600);
    };
  
    window.toggleReady = function() {
      const me = players.find(p => String(p.id) === String(currentPlayer?.id));
      if (!me || me.host) return;
      me.ready = !me.ready;
      currentPlayer = { ...currentPlayer, ready: me.ready };
      try {
        sessionStorage.setItem('champ_room_players', JSON.stringify(players));
        sessionStorage.setItem('champ_current_player', JSON.stringify(currentPlayer));
      } catch(e) {}
      render();
      realtime?.setReady(me.ready);
    };
  
    /* Lancer */
    window.startGame = async function() {
      const me = players.find(p => String(p.id) === String(currentPlayer?.id)) || currentPlayer;
      const startBtn = document.getElementById('start-btn');
      const info = document.getElementById('ready-info');
      if (!me?.host) { updateReadyInfo(); return; }
      const playablePlayers = mode === 'quiz' ? players.filter(p => !p.host) : players;
      if ((mode === 'quiz' && playablePlayers.length < 1) || (mode !== 'quiz' && playablePlayers.length < 2)) {
        updateReadyInfo(); return;
      }
      clearInterval(simInterval);
      const scoreDepart = mode === 'paris-multi' ? 5 : 0;
      mergeState({
        players: playablePlayers.map((p, i) => ({ id: p.id, name: p.name, init: p.init, colorIdx: p.color ?? i, score: scoreDepart, streak: 0 })),
        config: { mode: mode === 'quiz' ? 'quiz-multijoueur' : mode === 'duel' ? 'duel' : mode === 'paris-multi' ? 'paris-multi' : 'multijoueur', category: activeConfig.category, difficulty: activeConfig.difficulty, nbQuestions: activeConfig.nbQuestions },
        manche: 1, qualified: [], eliminated: [],
      });
      if (!isOnline || !realtime) {
        naviguer(mode === 'quiz' ? 'hote-quiz.html' : 'intro-manche1.html');
        return;
      }
      startBtn.disabled = true;
      info.textContent = 'Lancement…';
      const serverMode = mode === 'quiz' ? 'quiz-multijoueur' : mode === 'duel' ? 'duel' : mode === 'paris-multi' ? 'paris-multi' : 'multijoueur';
      const cibleJeu = mode === 'quiz' ? 'hote-quiz.html' : 'jeu-multi.html';
      const started = await realtime.startQuiz({
        config: { ...activeConfig, mode: serverMode },
      });
      if (!started?.ok) {
        // Réessayer après reconnexion si le socket était périmé
        try {
          const fresh = await connectRealtime();
          if (fresh) {
            realtime = fresh;
            await realtime.joinRoom({ code, player: currentPlayer, hostToken: sessionStorage.getItem('champ_room_host_token') || undefined });
            const retry = await realtime.startQuiz({ config: { ...activeConfig, mode: serverMode } });
            if (retry?.ok && retry.room) {
              nettoyerEcoutesLobby();
              sessionStorage.setItem('champ_last_room', JSON.stringify(retry.room));
              naviguer(cibleJeu);
              return;
            }
            info.textContent = retry?.error || 'Impossible de lancer la partie.';
          } else {
            info.textContent = 'Serveur injoignable — redémarrez le backend.';
          }
        } catch (_) {
          info.textContent = 'Erreur de connexion.';
        }
        startBtn.disabled = false;
        return;
      }
      nettoyerEcoutesLobby();
      sessionStorage.setItem('champ_last_room', JSON.stringify(started.room));
      naviguer(cibleJeu);
    };
}

export function cleanup() {
  nettoyerEcoutesLobby();
}
