/* ════════════════════════════════════════════════
   Écran : podium
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, DEMO } from '../state.js';
import { spawnConfetti, bindThemeDots } from '../utils.js';

export const titre = 'Podium — CHAMPION.';

export const html = `
<div class="page" id="page">
  <!-- Confettis -->
  <div class="confetti-container" id="confetti"></div>

  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <!-- Titre -->
  <div class="section-title padding-haut-6">Podium Final</div>
  <div class="section-sub">Félicitations au champion</div>

  <!-- Podium top 3 -->
  <div class="podium" id="podium">
    <!-- 2e place (gauche) -->
    <div class="podium__step" style="animation-delay:.32s">
      <span class="avatar" style="background:#9B8EC7">AK</span>
      <div class="podium-name">Amara K.</div>
      <div class="podium-meta">2e · 8 pts</div>
      <div class="podium__base podium__base--2">2</div>
    </div>

    <!-- 1er (centre) -->
    <div class="podium__step" style="animation-delay:.12s">
      <span class="avatar avatar--lg" style="background:#3DC87A">FZ</span>
      <span class="badge badge--success" style="animation:popIn .5s ease .6s both">Championne</span>
      <div class="podium-name" style="font-size:18px">Fatima Z.</div>
      <div class="podium-meta">12 pts</div>
      <div class="podium__base podium__base--1">1</div>
    </div>

    <!-- 3e place (droite) -->
    <div class="podium__step" style="animation-delay:.42s">
      <span class="avatar" style="background:#D4A820">YM</span>
      <div class="podium-name">Youssef M.</div>
      <div class="podium-meta">3e · Série 2</div>
      <div class="podium__base podium__base--3">3</div>
    </div>
  </div>

  <!-- 4e place -->
  <div class="fourth-row marge-haut-10">
    <span class="player-rank">4</span>
    <span class="avatar avatar--sm" style="background:#E85A3A">KB</span>
    <div class="player-name flex-1">Karim B.</div>
    <span class="player-score" style="font-size:14px">6 pts</span>
  </div>

  <!-- Boutons -->
  <div class="btn-zone">
    <button class="btn-primary" data-onclick="navigate('fin-partie.html')">Statistiques →</button>
    <button class="btn-secondary" data-onclick="navigate('mode-local.html')">Rejouer</button>
    <button class="btn-secondary" data-onclick="navigate('menu.html')">Menu</button>
  </div>

  </div>



`;

export function init(conteneur) {
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
    // Confettis au chargement
    setTimeout(spawnConfetti, 400);
  
    function readJSON(key, fallback) {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch(e) {
        return fallback;
      }
    }
  
    const isMulti = Boolean(sessionStorage.getItem('champ_room_code'));
    // Rewire action buttons based on context (multi vs solo)
    if (isMulti) {
      const rejouerBtn = conteneur.querySelector('[data-onclick="navigate(\'mode-local.html\')"]');
      if (rejouerBtn) {
        rejouerBtn.removeAttribute('data-onclick');
        rejouerBtn.addEventListener('click', () => naviguer('multijoueur.html'));
      }
    }

    const state = getState();
    const onlineRoom = readJSON('champ_last_room', null);
    const onlinePlayers = Array.isArray(onlineRoom?.players)
      ? onlineRoom.players.filter(p => onlineRoom.config?.mode === 'quiz-multijoueur' ? !p.host : true)
      : [];
    const resultats = onlinePlayers.length
      ? onlinePlayers
          .map((p, i) => ({
            ...p,
            init: p.init || p.name.slice(0, 2).toUpperCase(),
            colorIdx: p.colorIdx ?? p.color ?? i,
            score: p.score || 0,
          }))
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .map((p, i) => ({ ...p, rank: i + 1, champion: i === 0 }))
      : (state.rounds?.m3?.results?.length ? state.rounds.m3.results : DEMO.FINAL_RESULTS);
    const COLORS  = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
  
    if (resultats.length) {
      const sorted = [...resultats].sort((a,b) => (a.rank || 99) - (b.rank || 99));
      const champion = sorted.find(p => p.champion) || sorted[0];
      const overlayName = document.getElementById('champion-overlay-name');
      if (overlayName && champion) overlayName.textContent = champion.name;
      const top3 = sorted.slice(0, 3);
      const steps = document.querySelectorAll('.podium__step');
      const order = [1, 0, 2]; // le DOM est: 2e, 1er, 3e
  
      order.forEach((rank, domIdx) => {
        const p = top3[rank];
        if (!steps[domIdx]) return;
        if (!p) {
          steps[domIdx].style.display = 'none';
          return;
        }
        const av = steps[domIdx].querySelector('.avatar');
        if (av) { av.style.background = COLORS[(p.colorIdx ?? rank) % COLORS.length]; av.textContent = p.init || p.name.slice(0,2).toUpperCase(); }
        const nm = steps[domIdx].querySelector('.podium-name');
        if (nm) nm.textContent = p.name;
        const mt = steps[domIdx].querySelector('.podium-meta');
        if (mt) mt.textContent = `${rank+1}e · ${p.score||0} pts`;
        const badge = steps[domIdx].querySelector('.badge');
        if (badge) badge.textContent = p.champion ? 'Champion' : 'Finaliste';
      });
  
      const fourth = sorted[3];
      const fourthRow = document.querySelector('.fourth-row');
      if (fourth && fourthRow) {
        fourthRow.querySelector('.avatar').style.background = COLORS[(fourth.colorIdx ?? 3) % COLORS.length];
        fourthRow.querySelector('.avatar').textContent = fourth.init || fourth.name.slice(0,2).toUpperCase();
        fourthRow.querySelector('.player-name').textContent = fourth.name;
        fourthRow.querySelector('.player-score').textContent = `${fourth.score || 0} pts`;
      } else if (fourthRow) {
        fourthRow.style.display = 'none';
      }
    }

}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
