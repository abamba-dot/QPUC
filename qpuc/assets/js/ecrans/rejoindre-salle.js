/* ════════════════════════════════════════════════
   Écran : rejoindre-salle
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, getInitials } from '../utils.js';
import { AVATAR_PALETTE } from '../multiplayer-data.js';
import { connectRealtime } from '../realtime-client.js';

export const titre = 'Rejoindre — CHAMPION.';

export const html = `
<div class="page mode-local-page" id="page" data-screen-label="Rejoindre une salle">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="page-header">
    <button class="back-btn" data-onclick="navigate('multijoueur.html')" aria-label="Retour">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Retour
    </button>
    <span class="page-title">Rejoindre une salle</span>
    <div class="largeur-64"></div>
  </div>
  <div class="content justify-start">
    <div class="step-panel" style="gap:20px;max-width:min(560px,100%)">
      <div class="align-center">
        <div class="step-title">Entrez le code</div>
        <div class="step-sub marge-haut-8">4 caractères donnés par l'hôte</div>
      </div>
      <div class="code-input" id="code-input">
        <span class="code-prefix">CHMP-</span>
        <div class="code-cells" id="cells">
          <div class="code-cell code-cell--active" data-i="0"></div>
          <div class="code-cell" data-i="1"></div>
          <div class="code-cell" data-i="2"></div>
          <div class="code-cell" data-i="3"></div>
        </div>
        <input class="code-hidden-input" id="hidden-input" maxlength="4" autocomplete="off" autocapitalize="characters" inputmode="text" aria-label="Code de la salle">
      </div>
      <div class="pseudo-block largeur-100">
        <div class="pseudo-top">
          <div class="pseudo-av" id="my-av" style="background:#C9663A">?</div>
          <span class="pseudo-lbl">Votre pseudo</span>
        </div>
        <input class="pseudo-input" id="pseudo" placeholder="Joueur" maxlength="14" aria-label="Votre pseudo">
        <div class="avatar-picker padding-haut-6" id="avatar-picker"></div>
      </div>
      <div class="btn-zone" style="padding-top:0">
        <button class="btn-primary btn-full" id="join-btn" data-onclick="joinByCode()">Rejoindre →</button>
      </div>
      <div class="solo-status min-hauteur-18" id="join-error"></div>
    </div>
  </div>
  </div>



`;

export async function init(conteneur) {
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
    const hidden = document.getElementById('hidden-input');
    const cells  = [...document.querySelectorAll('.code-cell')];
    let colorIdx = 0;
  
    document.getElementById('code-input').addEventListener('click', () => hidden.focus());
    hidden.focus();
  
    function renderCode() {
      const val = hidden.value.toUpperCase();
      cells.forEach((cell, i) => {
        cell.textContent = val[i] || '';
        cell.classList.toggle('code-cell--filled', !!val[i]);
        cell.classList.toggle('code-cell--active', i === val.length && val.length < 4);
        cell.classList.remove('code-cell--error');
      });
    }
    hidden.addEventListener('input', () => {
      hidden.value = hidden.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      renderCode();
    });
    renderCode();
  
    const urlCode = new URLSearchParams(location.search).get('code');
    if (urlCode) {
      hidden.value = urlCode.replace(/^CHMP-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      renderCode();
    }
  
    window.joinByCode = function() {
      if (hidden.value.length < 4) {
        cells.forEach(c => c.classList.add('code-cell--error'));
        setTimeout(renderCode, 450);
        hidden.focus();
        return;
      }
      // Envoyer juste le suffixe — le serveur résout automatiquement
      // vers PARIS-XXXX, CHMP-XXXX, etc. via resolveRoomCode()
      joinRoomOnline(hidden.value.toUpperCase());
    };
  
    function showJoinError(message) {
      const el = document.getElementById('join-error');
      el.textContent = message || '';
      el.style.color = message ? 'var(--color-error)' : '';
    }
  
    async function joinRoomOnline(code) {
      showJoinError('');
      const pseudo = document.getElementById('pseudo');
      const name = pseudo.value.trim() || 'Joueur';
      const player = { id: Date.now(), name, init: getInitials(name) || '?', color: colorIdx, host: false, ready: true };
      try {
        const client = await connectRealtime();
        if (client) {
          const previousCode = sessionStorage.getItem('champ_room_code');
          const playerToken = previousCode === code ? sessionStorage.getItem('champ_room_player_token') : null;
          const response = await client.joinRoom({ code, player, playerToken: playerToken || undefined });
          if (response.ok) {
            // Routage selon le mode détecté par le serveur
            const detectedMode = response.mode || 'classique';

            if (detectedMode === 'paris') {
              sessionStorage.setItem('champ_room_code', response.code);
              sessionStorage.setItem('champ_player_id', response.player.id);
              sessionStorage.setItem('champ_player_name', response.player.name);
              sessionStorage.setItem('mode-multi-actif', 'paris');
              sessionStorage.setItem('champ_mp_mode', 'paris');
              if (response.playerToken) sessionStorage.setItem('champ_room_player_token', response.playerToken);
              naviguer('lobby-paris.html');
              return;
            }

            if (detectedMode === 'pouvoirs') {
              sessionStorage.setItem('champ_room_code', response.code);
              sessionStorage.setItem('champ_player_id', response.player.id);
              sessionStorage.setItem('champ_player_name', response.player.name);
              sessionStorage.setItem('mode-multi-actif', 'pouvoirs');
              sessionStorage.setItem('champ_mp_mode', 'pouvoirs');
              if (response.playerToken) sessionStorage.setItem('champ_room_player_token', response.playerToken);
              naviguer('lobby-pouvoirs.html');
              return;
            }

            // Autres modes (classique, duel, quiz) — flow existant
            persistJoinedRoom(response.room, response.player, response.playerToken);
            naviguer('lobby.html');
            return;
          }
          showJoinError(response.error || 'Salle introuvable.');
          hidden.focus();
          return;
        }
        showJoinError('Serveur multijoueur indisponible.');
        hidden.focus();
      } catch (err) {
        console.warn('[rejoindre-salle] joinRoomOnline échouée:', err);
        showJoinError('Erreur de connexion au serveur.');
        hidden.focus();
      }
    }
  
    function persistJoinedRoom(room, player, playerToken = null) {
      try {
        sessionStorage.setItem('champ_room_code', room.code);
        sessionStorage.setItem('champ_room_config', JSON.stringify(room.config));
        sessionStorage.setItem('champ_room_players', JSON.stringify(room.players));
        sessionStorage.setItem('champ_current_player', JSON.stringify(player));
        sessionStorage.setItem('champ_room_backend', 'online');
        sessionStorage.setItem('champ_mp_mode', room.config?.mode === 'duel' ? 'duel' : room.config?.mode === 'quiz-multijoueur' ? 'quiz' : 'classique');
        sessionStorage.removeItem('champ_room_host_token');
        if (playerToken) sessionStorage.setItem('champ_room_player_token', playerToken);
      } catch(e) {}
    }
  
    // Avatar picker
    const picker = document.getElementById('avatar-picker');
    const myAv   = document.getElementById('my-av');
    AVATAR_PALETTE.forEach((color, i) => {
      const sw = document.createElement('div');
      sw.className = 'avatar-swatch' + (i === 0 ? ' avatar-swatch--active' : '');
      sw.style.background = color;
      sw.addEventListener('click', () => {
        colorIdx = i;
        myAv.style.background = color;
        picker.querySelectorAll('.avatar-swatch').forEach((s, j) => s.classList.toggle('avatar-swatch--active', j === i));
      });
      picker.appendChild(sw);
    });
  
    const pseudo = document.getElementById('pseudo');
    pseudo.addEventListener('input', () => { myAv.textContent = getInitials(pseudo.value) || '?'; });
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
