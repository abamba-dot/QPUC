/* ════════════════════════════════════════════════
   Écran : creer-salle
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots } from '../utils.js';
import { connectRealtime } from '../realtime-client.js';

export const titre = 'Créer une salle — CHAMPION.';

export const html = `
<div class="page mode-local-page" id="page" data-screen-label="Créer une salle">
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
    <span class="page-title">Nouvelle salle</span>
    <div class="largeur-64"></div>
  </div>
  <div class="content justify-start">
    <div class="step-panel" style="gap:18px">
      <div class="align-center">
        <div class="step-title">Configurez votre partie</div>
        <div class="step-sub marge-haut-8">Vous serez l'hôte</div>
      </div>
      <div class="cfg-card">
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
          <span class="cfg-label">Catégorie</span>
          <div class="cfg-opts cfg-opts--categories" data-group="category">
            <button class="cfg-opt selected">Culture</button>
            <button class="cfg-opt">Histoire</button>
            <button class="cfg-opt">Sciences</button>
            <button class="cfg-opt">Sport</button>
            <button class="cfg-opt">Mix</button>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg></div>
          <span class="cfg-label">Difficulté</span>
          <div class="cfg-opts" data-group="difficulty">
            <button class="cfg-opt">Facile</button>
            <button class="cfg-opt selected">Moyen</button>
            <button class="cfg-opt">Difficile</button>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></div>
          <span class="cfg-label">Questions</span>
          <div class="cfg-opts" data-group="nbQuestions">
            <button class="cfg-opt">5</button>
            <button class="cfg-opt selected">10</button>
            <button class="cfg-opt">15</button>
            <button class="cfg-opt">20</button>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg></div>
          <span class="cfg-label">Manches</span>
          <div class="cfg-opts" data-group="manches">
            <button class="cfg-opt">1</button>
            <button class="cfg-opt">2</button>
            <button class="cfg-opt selected">3</button>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span class="cfg-label">Joueurs max</span>
          <div class="cfg-opts" data-group="maxPlayers">
            <button class="cfg-opt">4</button>
            <button class="cfg-opt selected">8</button>
            <button class="cfg-opt">12</button>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <span class="cfg-label">Visibilité</span>
          <div class="cfg-opts" data-group="visibility">
            <button class="cfg-opt selected">Privée</button>
            <button class="cfg-opt">Publique</button>
          </div>
        </div>
      </div>
      <div class="launch-summary">
        <div class="sum-row">
          <span class="sum-key">Code de la salle</span>
          <span class="sum-val" id="room-code" style="letter-spacing:.08em">Généré à la création</span>
        </div>
        <div class="sum-div"></div>
        <div class="sum-row">
          <span class="sum-key">Résumé</span>
          <span class="sum-val" id="summary" style="font-size:13px;font-weight:700">Culture · Moyen · 10 Q · 3 manches</span>
        </div>
      </div>
      <div class="btn-zone" style="padding-top:4px">
        <button class="btn-primary btn-full" id="create-btn" data-onclick="createRoom()">Créer la salle →</button>
      </div>
      <div class="solo-status min-hauteur-18" id="create-status"></div>
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
    const roomMode = sessionStorage.getItem('champ_mp_mode') || 'classique';
    const cfg = {
      category:'Culture',
      difficulty:'Moyen',
      nbQuestions:'10',
      manches:'3',
      maxPlayers: roomMode === 'duel' ? '4' : '8',
      visibility:'Privée'
    };
    if (roomMode === 'duel') {
      const title = document.querySelector('.step-title');
      if (title) title.textContent = 'Configurez le format duel';
      document.querySelectorAll('[data-group="manches"] .cfg-opt').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === '3');
        btn.disabled = true;
      });
      document.querySelectorAll('[data-group="maxPlayers"] .cfg-opt').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === '4');
        btn.disabled = true;
      });
    }
  
    document.querySelectorAll('.cfg-opts').forEach(group => {
      const key = group.dataset.group;
      group.querySelectorAll('.cfg-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.cfg-opt').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          cfg[key] = btn.textContent.trim();
          updateSummary();
        });
      });
    });
  
    function updateSummary() {
      const modeLabel = roomMode === 'duel' ? 'Duel' : roomMode === 'quiz' ? 'Quiz animé' : 'Classique';
      document.getElementById('summary').textContent =
        `${modeLabel} · ${cfg.category} · ${cfg.difficulty} · ${cfg.nbQuestions} Q`;
    }
    updateSummary();
  
    window.createRoom = function() {
      const hostName = localStorage.getItem('champ_player_name') || 'Joueur 1';
      const room = {
        config: { category: cfg.category, difficulty: cfg.difficulty, nbQuestions: Number(cfg.nbQuestions), manches: Number(cfg.manches), maxPlayers: Number(cfg.maxPlayers), visibility: cfg.visibility },
        players: [{ id: crypto.randomUUID?.() || String(Date.now()), name: hostName, init: hostName === 'Joueur 1' ? 'J1' : hostName.slice(0, 2).toUpperCase(), color: 0, host: true, ready: true }],
      };
      createRoomOnline(room);
    };
  
    async function createRoomOnline(room) {
      const status = document.getElementById('create-status');
      const btn = document.getElementById('create-btn');
      status.style.color = '';
      status.textContent = 'Création de la salle en ligne…';
      btn.disabled = true;
      try {
        const client = await connectRealtime();
        if (!client) {
          status.style.color = 'var(--color-error)';
          status.textContent = 'Serveur multijoueur indisponible. Lance le backend puis réessaie.';
          btn.disabled = false;
          return;
        }
        const response = await client.createRoom({
          config: {
            ...room.config,
            mode: roomMode,
            manches: roomMode === 'duel' ? 3 : room.config.manches,
            maxPlayers: roomMode === 'duel' ? 4 : room.config.maxPlayers,
          },
          player: room.players[0],
        });
        if (response.ok) {
          persistRoom(response.room, response.hostToken);
          naviguer('lobby.html');
          return;
        }
        status.style.color = 'var(--color-error)';
        status.textContent = response.error || 'Impossible de créer la salle.';
        btn.disabled = false;
      } catch (err) {
        console.warn('[creer-salle] createRoomOnline échouée:', err);
        status.style.color = 'var(--color-error)';
        status.textContent = 'Erreur de connexion au serveur.';
        btn.disabled = false;
      }
    }
  
    function persistRoom(room, hostToken = null) {
      try {
        sessionStorage.setItem('champ_room_code', room.code);
        sessionStorage.setItem('champ_room_config', JSON.stringify(room.config));
        sessionStorage.setItem('champ_room_players', JSON.stringify(room.players));
        sessionStorage.setItem('champ_current_player', JSON.stringify(room.players[0]));
        sessionStorage.setItem('champ_room_backend', room.hostId ? 'online' : 'local');
        sessionStorage.removeItem('champ_room_player_token');
        if (hostToken) sessionStorage.setItem('champ_room_host_token', hostToken);
      } catch(e) {}
    }
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
