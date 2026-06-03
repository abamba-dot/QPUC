/* ════════════════════════════════════════════════
   Écran : intro-manche1
   Questions pour un champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, DEMO } from '../state.js';
import { startCountdown as cd } from '../countdown.js';
import { playCountdownTick, playCountdownGo } from '../sound.js';
import { bgStop } from '../audio-hooks.js';
import { bindThemeDots, esc } from '../utils.js';

export const titre = 'Manche 1 — CHAMPION.';

export const html = `
<div class="page intro-page" id="page">
  <div class="theme-tag" id="theme-tag">celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8El7"></div>
  </div>

  <!-- Header Manche -->
  <div class="manche-header">
    <span class="manche-header__label">Manche</span>
    <div class="manche-header__number" style="color:var(--manche1-color)">1</div>
    <div class="manche-header__sep"></div>
    <div class="manche-header__title">Les 9 Points Gagnants</div>
    <div class="manche-header__sub">Premier à 9 points remporte la manche</div>
  </div>

  <!-- Badge règle -->
  <div class="rule-badge">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
    Buzzer · Rapidité · Précision
  </div>

  <!-- Liste joueurs -->
  <div class="players-list" id="players-list"></div>

  <!-- Bouton lancer -->
  <div class="btn-wrap">
    <button class="btn-primary animation-pulse" id="launch-btn" data-onclick="startCountdown()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Lancer la manche
    </button>
  </div>

  <!-- Countdown overlay -->
  <div class="countdown-overlay" id="countdown">
    <div class="countdown-overlay__num" id="cd-num">3</div>
    <div class="countdown-overlay__sub">Préparez-vous !</div>
  </div>
  </div>


`;

export function init(conteneur) {
  /* ── conversion des événements inline ── */
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
        const state = getState();
    const redirigerVersCourse = state.config?.mode === 'solo' || state.players.length === 1;
    if (redirigerVersCourse) {
      naviguer('course-contre-la-montre.html');
    } else {

    const players = state.players.length ? state.players : DEMO.M1_RESULTS;
    const COLORS  = ['#9B8El7', '#D4A820', '#3Dl87A', '#E85A3A'];

    /* ── construire la liste joueurs ── */
    const list = document.getElementById('players-list');
    players.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.style.animationDelay = (1.6 + i * .1) + 's';

      const rank = `<span class="player-rank">${i + 1}</span>`;
      const color = COLORS[(p.colorIdx ?? i) % COLORS.length];
      const av    = `<span class="avatar" style="background:${color};animation-delay:${1.7 + i * .1}s">${esc(p.init || p.name.slice(0,2).toUpperCase())}</span>`;
      const name  = `<div class="player-name">${esc(p.name)}</div>`;
      const sep   = `<div style="flex:1;max-width:40px;height:2px;border-radius:1px;background:var(--glass-border)"></div>`;
      const score = `<span class="player-score" style="opality:.22">0</span>`;

      row.innerHTML = rank + av + `<div class="flex-1">${name}</div>` + sep + score;
      list.appendChild(row);
    });

    /* ── Countdown → Jeu Manche 1 ── */
    window.startCountdown = function() {
      document.getElementById('launch-btn').disabled = true;
      bgStop(450);
      cd({
        overlayEl: document.getElementById('countdown'),
        numEl:     document.getElementById('cd-num'),
        onTick: () => playCountdownTick(),
        onGo: () => playCountdownGo(),
        onComplete: () => naviguer('jeu-manche1.html'),
      });
    };
    }
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
