/* ════════════════════════════════════════════════
   Écran : attente-manche
   Résultats de manche multijoueur — données serveur
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, esc } from '../utils.js';
import { avatarColor } from '../multiplayer-data.js';
import { connectRealtime } from '../realtime-client.js';

export const titre = 'Entre deux manches — CHAMPION.';

let nettoyages = [];

function ajouterNettoyage(fn) {
  if (typeof fn === 'function') nettoyages.push(fn);
}

export const html = `
<div class="page sync-page" id="page" data-screen-label="Entre deux manches">
  <div class="theme-tag" id="theme-tag">celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="sync-wrap">
    <div class="sync-spinner" id="spinner"></div>
    <div>
      <div class="sync-title" id="sync-title">Résultats de la manche</div>
      <div class="sync-sub marge-haut-10" id="sync-sub">Classement provisoire</div>
    </div>
    <div class="sync-progress">
      <div class="sync-progress__fill" id="progress" style="width:0%;transition:width 3s ease"></div>
    </div>
    <div class="sync-players" id="players"></div>
    <button class="btn-primary" id="next-manche-btn" type="button">Manche suivante →</button>
    <div class="sync-sub" id="host-wait">En attente de l'hôte...</div>
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

  function currentManche(room) {
    const manche = Number(room?.manche || room?.quiz?.manche || 1);
    if (room?.mancheResults?.m2?.results?.length) return 2;
    if (room?.mancheResults?.m1?.results?.length) return 1;
    return manche;
  }

  function resultBlock(room) {
    const manche = currentManche(room);
    return room?.mancheResults?.[`m${manche}`]
      || room?.mancheResults?.m2
      || room?.mancheResults?.m1
      || { results: room?.players || [], qualifiedIds: [] };
  }

  function nextCopy(room) {
    const nextManche = Number(resultBlock(room)?.nextManche || currentManche(room) + 1);
    if (nextManche >= 3) {
      return {
        title: 'Manche 3 · Face à Face',
        subtitle: 'Le duel final pour le titre de champion',
      };
    }
    return {
      title: 'Manche 2 · 4 à la Suite',
      subtitle: 'Enchaînez les bonnes réponses pour rejoindre la finale',
    };
  }

  function render(room) {
    if (!ecranActif || !room) return;
    currentRoom = room;
    try { sessionStorage.setItem('champ_last_room', JSON.stringify(room)); } catch (e) {}

    const block = resultBlock(room);
    const results = Array.isArray(block.results) && block.results.length ? block.results : (room.players || []);
    const qualifiedIds = new Set((block.qualifiedIds || block.qualified || []).map(id => String(id)));
    const manche = currentManche(room);
    const isHost = Boolean((room.players || []).find(p => String(p.id) === String(me?.id))?.host || me?.host);

    document.getElementById('sync-title').textContent = `Fin de manche ${manche}`;
    document.getElementById('sync-sub').textContent = `${qualifiedIds.size || 0} qualifié${qualifiedIds.size > 1 ? 's' : ''}`;
    progress.style.width = '0%';
    requestAnimationFrame(() => { progress.style.width = '100%'; });

    playersEl.innerHTML = '';
    [...results].sort((a, b) => (b.score || b.serie || 0) - (a.score || a.serie || 0)).forEach((p, i) => {
      const isQualified = qualifiedIds.size ? qualifiedIds.has(String(p.id)) : Boolean(p.qualified);
      const row = document.createElement('div');
      row.className = `sync-player ${isQualified ? 'sync-player--done' : 'sync-player--waiting'}`;
      row.style.animationDelay = `${i * 0.07}s`;
      row.innerHTML = `
        <div style="position:relative">
          <div class="avatar avatar--lg" style="background:${avatarColor(p.color ?? p.colorIdx ?? i)}">${esc(p.init || p.name?.slice(0, 2).toUpperCase() || 'J')}</div>
          <div class="sync-player__check">${isQualified ? '✓' : ''}</div>
        </div>
        <span class="sync-player__name">${esc(p.name || 'Joueur')}</span>
        <span class="ready-pill ${isQualified ? 'ready-pill--yes' : 'ready-pill--no'}">${isQualified ? 'Qualifié ✓' : 'Éliminé'}</span>`;
      playersEl.appendChild(row);
    });

    nextBtn.style.display = isHost ? 'inline-flex' : 'none';
    waitText.style.display = isHost ? 'none' : 'block';
  }

  async function startNextManche() {
    if (!realtime || !currentRoom) return;
    nextBtn.disabled = true;
    const copy = nextCopy(currentRoom);
    const response = await realtime.startNextManche(copy);
    if (response?.ok) {
      if (response.room) {
        try { sessionStorage.setItem('champ_last_room', JSON.stringify(response.room)); } catch (e) {}
      }
      naviguer('intro-multi.html');
      return;
    }
    nextBtn.disabled = false;
    waitText.style.display = 'block';
    waitText.textContent = response?.error || 'Impossible de lancer la manche suivante.';
  }

  nextBtn.addEventListener('click', startNextManche);

  if (currentRoom) render(currentRoom);

  if (!roomCode || !me) {
    naviguer('multijoueur.html');
    return;
  }

  realtime = await connectRealtime();
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
