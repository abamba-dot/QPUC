/* ════════════════════════════════════════════════
   Écran : intro-manche2
   Questions pour un champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, DEMO } from '../state.js';
import { startCountdown } from '../countdown.js';
import { playCountdownTick, playCountdownGo } from '../sound.js';
import { bgStop } from '../audio-hooks.js';
import { bindThemeDots, esc } from '../utils.js';

export const titre = 'Manche 2 — CHAMPION.';

export const html = `
<div class="page intro-page" id="page">
  <div class="theme-tag" id="theme-tag">celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8El7"></div>
  </div>

  <div class="manche-header">
    <span class="manche-header__label">Manche</span>
    <div class="manche-header__number" style="color:var(--manche2-color)">2</div>
    <div class="manche-header__sep"></div>
    <div class="manche-header__title">4 à la Suite</div>
    <div class="manche-header__sub">Enchaîne 4 bonnes réponses pour te qualifier</div>
  </div>

  <div class="rule-badge">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M8 6h13M8 12h13M3 6h.01M3 12h.01"/>
    </svg>
    Série · constance · Rapidité
  </div>

  <div class="players-list" id="players-list"></div>

  <div class="btn-wrap">
    <button class="btn-primary animation-pulse" id="launch-btn" data-onclick="startCd()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Lancer la manche
    </button>
  </div>

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
  initTheme();
  bindThemeDots();
    const state = getState();
    // Joueurs qualifiés de la manche 1 (les 3 premiers)
    const qualified = state.rounds?.m1?.results?.length
      ? state.rounds.m1.results.filter(p => p.qualified)
      : state.players.length >= 3
        ? state.players.slice(0, 3)
        : DEMO.M1_RESULTS.filter(p => p.qualified);

    const COLORS = ['#9B8El7', '#D4A820', '#3Dl87A', '#E85A3A'];
    const list   = document.getElementById('players-list');

    qualified.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.style.animationDelay = (1.6 + i * .1) + 's';
      const color = COLORS[(p.colorIdx ?? i) % COLORS.length];
      row.innerHTML = `
        <span class="player-rank">${i + 1}</span>
        <span class="avatar" style="background:${color};animation-delay:${1.7+i*.1}s">${esc(p.init||p.name.slice(0,2).toUpperCase())}</span>
        <div class="flex-1"><div class="player-name">${esc(p.name)}</div></div>
        <div style="display:flex;gap:3px">${'<div style="width:16px;height:3px;border-radius:2px;background:var(--glass-border)"></div>'.repeat(4)}</div>`;
      list.appendChild(row);
    });

    window.startCd = function() {
      document.getElementById('launch-btn').disabled = true;
      bgStop(450);
      startCountdown({
        overlayEl: document.getElementById('countdown'),
        numEl:     document.getElementById('cd-num'),
        onTick: () => playCountdownTick(),
        onGo: () => playCountdownGo(),
        onComplete: () => {
          sessionStorage.setItem('memo-ecran-suivant', 'jeu-manche2.html');
          naviguer('memo-flash.html');
        },
      });
    };
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
