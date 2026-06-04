/* ════════════════════════════════════════════════
   Écran : fin-manche-multi
   Résultats de manche multijoueur — données serveur
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, esc } from '../utils.js';
import { avatarColor } from '../multiplayer-data.js';
import { connectRealtime } from '../realtime-client.js';

export const titre = 'Résultats de manche — CHAMPION.';

let nettoyages = [];

function ajouterNettoyage(fn) {
  if (typeof fn === 'function') nettoyages.push(fn);
}

export const html = `
<div class="page sync-page fin-manche-multi-page" id="page" data-screen-label="Résultats de manche">
  <style>
    .fin-manche-multi-page .sync-wrap{width:min(100%,780px)}
    .fin-manche-multi-page .sync-players{flex-direction:column;flex-wrap:nowrap;align-items:stretch;max-width:620px}
    .fin-manche-multi-page .sync-player{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:14px;width:100%;padding:12px 14px;border-radius:18px;background:rgba(255,253,248,.72);border:1px solid rgba(30,22,12,.08);box-shadow:0 12px 26px rgba(30,22,12,.08)}
    .fin-manche-multi-page .sync-player--me{border-color:rgba(184,72,42,.36);box-shadow:0 0 0 1px rgba(184,72,42,.14),0 18px 34px rgba(30,22,12,.1)}
    .fin-manche-multi-page .sync-player__score{font-weight:950;color:var(--text);white-space:nowrap}
    .fin-manche-multi-page .sync-footer{display:flex;align-items:center;justify-content:center;min-height:56px}
    .fin-manche-multi-page .sync-wait{display:inline-flex;align-items:center;gap:10px}
    .fin-manche-multi-page .sync-wait .sync-spinner{width:22px;height:22px;border-width:3px}
    @media(max-width:640px){
      .fin-manche-multi-page .sync-player{grid-template-columns:auto minmax(0,1fr);align-items:center}
      .fin-manche-multi-page .ready-pill,.fin-manche-multi-page .sync-player__score{justify-self:start}
    }
  </style>
  <div class="theme-tag" id="theme-tag">celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="sync-wrap">
    <div class="sync-spinner" id="spinner"></div>
    <div>
      <div class="sync-title" id="sync-title">Fin de Manche</div>
      <div class="sync-sub marge-haut-10" id="sync-sub">Classement provisoire</div>
    </div>
    <div class="sync-progress">
      <div class="sync-progress__fill" id="progress" style="width:0%;transition:width 3s ease"></div>
    </div>
    <div class="sync-players" id="players"></div>
    <div class="sync-footer">
      <button class="btn-primary" id="next-manche-btn" type="button">Manche suivante →</button>
      <div class="sync-sub sync-wait" id="host-wait">
        <span class="sync-spinner" aria-hidden="true"></span>
        <span>En attente de l'hôte...</span>
      </div>
    </div>
  </div>
</div>
`;

export async function init() {
  cleanup();
  initTheme();
  bindThemeDots();

  const roomCode = sessionStorage.getItem('champ_room_code');
  const me = readJSON('champ_current_player', null);
  let realtime = null;
  let currentRoom = readJSON('champ_last_room', null) || readJSON('champ_last_revealed_room', null);
  let ecranActif = true;

  ajouterNettoyage(() => { ecranActif = false; });

  const progress = document.getElementById('progress');
  const playersEl = document.getElementById('players');
  const nextBtn = document.getElementById('next-manche-btn');
  const waitText = document.getElementById('host-wait');

  function readJSON(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function mancheTerminee(room) {
    const manche = Number(room?.manche || 1);
    if (manche === 2 || room?.mancheResults?.m2?.results?.length) return 2;
    return 1;
  }

  function resultBlock(room) {
    const manche = mancheTerminee(room);
    return room?.mancheResults?.[`m${manche}`] || { results: room?.players || [], qualifiedIds: [] };
  }

  function scoreValue(player, mode) {
    if (mode === 'serie') return Number(player.serieMax ?? player.serie ?? 0);
    return Number(player.score ?? 0);
  }

  function scoreLabel(player, mode) {
    if (mode === 'serie') return `Série ${scoreValue(player, mode)}`;
    return `${scoreValue(player, mode)} pts`;
  }

  function nextCopy(room) {
    const block = resultBlock(room);
    const nextManche = Number(block.nextManche || mancheTerminee(room) + 1);
    if (nextManche >= 3) {
      return {
        title: 'Manche 3 · Face à Face',
        subtitle: 'Le duel final pour le titre de champion',
      };
    }
    return {
      title: 'Manche 2 · 4 à la Suite',
      subtitle: 'Enchaînez les bonnes réponses',
    };
  }

  function render(room) {
    if (!ecranActif || !room) return;
    currentRoom = room;
    try { sessionStorage.setItem('champ_last_room', JSON.stringify(room)); } catch (e) {}

    const manche = mancheTerminee(room);
    const block = resultBlock(room);
    const mode = room.mancheMode || (manche === 2 ? 'serie' : 'buzz');
    const results = Array.isArray(block.results) && block.results.length ? block.results : (room.players || []);
    const qualifiedIds = new Set((block.qualifiedIds || []).map(id => String(id)));
    const qualifiedCount = qualifiedIds.size || results.filter(p => p.qualified).length;
    const isHost = Boolean((room.players || []).find(p => String(p.id) === String(me?.id))?.host || me?.host);

    document.getElementById('sync-title').textContent = `Fin de Manche ${manche}`;
    document.getElementById('sync-sub').textContent = manche === 2
      ? `${qualifiedCount} finaliste${qualifiedCount > 1 ? 's' : ''} pour le duel final`
      : `${qualifiedCount} qualifié${qualifiedCount > 1 ? 's' : ''} pour la suite`;

    progress.style.width = '0%';
    requestAnimationFrame(() => { progress.style.width = '100%'; });

    playersEl.innerHTML = '';
    [...results]
      .sort((a, b) => scoreValue(b, mode) - scoreValue(a, mode))
      .forEach((p, i) => {
        const isQualified = qualifiedIds.size ? qualifiedIds.has(String(p.id)) : Boolean(p.qualified);
        const isMe = String(p.id) === String(me?.id);
        const row = document.createElement('div');
        row.className = `sync-player ${isQualified ? 'sync-player--done' : 'sync-player--waiting'}${isMe ? ' sync-player--me' : ''}`;
        row.style.animationDelay = `${i * 0.07}s`;
        row.innerHTML = `
          <div style="position:relative">
            <div class="avatar avatar--lg" style="background:${avatarColor(p.color ?? p.colorIdx ?? i)}">${esc(p.init || p.name?.slice(0, 2).toUpperCase() || 'J')}</div>
            <div class="sync-player__check">${isQualified ? '✓' : ''}</div>
          </div>
          <span class="sync-player__name">${esc(p.name || 'Joueur')}</span>
          <span class="sync-player__score">${esc(scoreLabel(p, mode))}</span>
          <span class="ready-pill ${isQualified ? 'ready-pill--yes' : 'ready-pill--no'}">${isQualified ? 'Qualifié ✓' : 'Éliminé'}</span>`;
        playersEl.appendChild(row);
      });

    nextBtn.style.display = isHost ? 'inline-flex' : 'none';
    waitText.style.display = isHost ? 'none' : 'inline-flex';
  }

  async function startNextManche() {
    if (!realtime || !currentRoom) return;
    nextBtn.disabled = true;
    try {
      const response = await realtime.startNextManche(nextCopy(currentRoom));
      if (response?.ok) {
        if (response.room) {
          try { sessionStorage.setItem('champ_last_room', JSON.stringify(response.room)); } catch (e) {}
        }
        naviguer('intro-multi.html');
        return;
      }
      nextBtn.disabled = false;
      const errSpan = waitText.querySelector('span:last-child');
      if (errSpan) errSpan.textContent = response?.error || 'Impossible de lancer la manche suivante.';
      waitText.style.display = 'inline-flex';
    } catch (err) {
      console.warn('[fin-manche-multi] startNextManche échouée:', err);
      nextBtn.disabled = false;
    }
  }

  nextBtn.addEventListener('click', startNextManche);

  if (currentRoom) render(currentRoom);

  if (!roomCode || !me) {
    naviguer('multijoueur.html');
    return;
  }

  try {
    realtime = await connectRealtime();
  } catch (err) {
    console.warn('[fin-manche-multi] connectRealtime échouée:', err);
    return;
  }
  if (!realtime) return;

  ajouterNettoyage(realtime.onRoomUpdate(room => {
    if (!room || room.code !== roomCode) return;
    if (room.phase === 'intro') {
      try { sessionStorage.setItem('champ_last_room', JSON.stringify(room)); } catch (e) {}
      naviguer('intro-multi.html');
      return;
    }
    render(room);
  }));

  const joined = await realtime.joinRoom({
    code: roomCode,
    player: me,
    hostToken: me?.host ? sessionStorage.getItem('champ_room_host_token') || undefined : undefined,
    playerToken: !me?.host ? sessionStorage.getItem('champ_room_player_token') || undefined : undefined,
  });
  if (joined?.ok) {
    if (joined.playerToken && !joined.player?.host) sessionStorage.setItem('champ_room_player_token', joined.playerToken);
    render(joined.room);
  }
}

export function cleanup() {
  nettoyages.forEach(fn => {
    try { fn(); } catch (e) {}
  });
  nettoyages = [];
}
