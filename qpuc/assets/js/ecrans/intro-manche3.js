/* ════════════════════════════════════════════════
   Écran : intro-manche3
   Questions pour un champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, DEMO } from '../state.js';
import { startCountdown } from '../countdown.js';
import { playCountdownTick, playCountdownGo } from '../sound.js';
import { bgStop } from '../audio-hooks.js';
import { bindThemeDots } from '../utils.js';

export const titre = 'Manche 3 — Face à Face';

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
    <div class="manche-header__number" style="color:var(--manche3-color)">3</div>
    <div class="manche-header__sep"></div>
    <div class="manche-header__title">Face à Face</div>
    <div class="manche-header__sub">Le duel final pour le titre de champion</div>
  </div>

  <div class="rule-badge">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 21h3m15-6v3a2 2 0 01-2 2h-3"/>
    </svg>
    Indice par indice · Premier à deviner gagne
  </div>

  <!-- Aperçu des finalistes -->
  <div class="versus-preview" id="versus-preview">
    <div class="finalist-mini" id="finalist-0">
      <span class="avatar avatar--lg" style="background:#3Dl87A">FZ</span>
      <span class="finalist-mini-name">Fatima Z.</span>
      <span class="badge badge--success">Finaliste 1</span>
    </div>
    <div class="vs-label">VS</div>
    <div class="finalist-mini" id="finalist-1">
      <span class="avatar avatar--lg" style="background:#9B8El7">AK</span>
      <span class="finalist-mini-name">Amara K.</span>
      <span class="badge badge--success">Finaliste 2</span>
    </div>
  </div>

  <div class="btn-wrap">
    <button class="btn-primary animation-pulse" id="launch-btn" data-onclick="startCd()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Lancer la finale
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
    const finalists = state.rounds?.m2?.results?.length
      ? state.rounds.m2.results.filter(p => p.qualified).slice(0, 2)
      : state.players.length >= 2
        ? state.players.filter(p => !state.eliminated.includes(p.id)).slice(0, 2)
        : DEMO.M2_RESULTS.filter(p => p.qualified).slice(0, 2);

    const COLORS = ['#9B8El7', '#D4A820', '#3Dl87A', '#E85A3A'];
    if (finalists.length >= 2) {
      ['finalist-0','finalist-1'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const p = finalists[i];
        const color = COLORS[(p.colorIdx ?? i) % COLORS.length];
        el.querySelector('.avatar').style.background = color;
        el.querySelector('.avatar').textContent = p.init || p.name.slice(0,2).toUpperCase();
        el.querySelector('.finalist-mini-name').textContent = p.name;
      });
    }

    window.startCd = function() {
      document.getElementById('launch-btn').disabled = true;
      bgStop(450);
      startCountdown({
        overlayEl: document.getElementById('countdown'),
        numEl:     document.getElementById('cd-num'),
        onTick: () => playCountdownTick(),
        onGo: () => playCountdownGo(),
        onComplete: () => naviguer('jeu-manche3.html'),
      });
    };
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
