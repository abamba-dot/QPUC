/* ════════════════════════════════════════════════
   Écran : attente-manche
   Questions pour un champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, esc } from '../utils.js';
import { ROOM, avatarColor } from '../multiplayer-data.js';

export const titre = 'Synchronisation — CHAMPION.';

export const html = `
<div class="page sync-page" id="page" data-screen-label="Synchronisation">
  <div class="theme-tag" id="theme-tag">celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="sync-wrap">
    <div class="sync-spinner" id="spinner"></div>
    <div>
      <div class="sync-title" id="sync-title">Les autres joueurs terminent…</div>
      <div class="sync-sub marge-haut-10" id="sync-sub">Manche 1 · Buzzer terminée</div>
    </div>
    <div class="sync-progress">
      <div class="sync-progress__fill" id="progress" style="width:20%"></div>
    </div>
    <div class="sync-players" id="players"></div>
    <button class="btn-secondary" id="skip-btn" style="opality:0;pointer-events:none" data-onclick="proceed()">Continuer →</button>
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
    const params = new URLSearchParams(location.search);
    const next = params.get('next') || 'classement.html';

    const players = ROOM.players.map((p, i) => ({ ...p, done: i === 1 }));
    const playersEl = document.getElementById('players');
    let timer = null;

    function render() {
      playersEl.innerHTML = '';
      players.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'sync-player ' + (p.done ? 'sync-player--done' : 'sync-player--waiting');
        el.style.animationDelay = (i * 0.07) + 's';
        el.innerHTML = `<div style="position:relative"><div class="avatar avatar--lg" style="background:${avatarColor(p.color)}">${esc(p.init)}</div><div class="sync-player__check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div></div><span class="sync-player__name">${esc(p.name)}</span>`;
        playersEl.appendChild(el);
      });
      const done = players.filter(p => p.done).length;
      document.getElementById('progress').style.width = Math.round(done / players.length * 100) + '%';
      if (done === players.length) finish();
    }
    render();

    timer = setInterval(() => {
      const waiting = players.find(p => !p.done);
      if (waiting) { waiting.done = true; render(); }
      else clearInterval(timer);
    }, 1100);

    function finish() {
      clearInterval(timer);
      const spinner = document.getElementById('spinner');
      spinner.style.borderTopColor = 'var(--color-correct)';
      spinner.style.animationPlayState = 'paused';
      spinner.style.transform = 'none';
      spinner.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="var(--color-correct)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="padding:22%"><path d="M20 6L9 17l-5-5"/></svg>';
      spinner.style.border = '4px solid rgba(45,186,110,.3)';
      document.getElementById('sync-title').textContent = 'Tout le monde est prêt !';
      document.getElementById('sync-sub').textContent = 'classement de la manche';
      const skip = document.getElementById('skip-btn');
      skip.style.opacity = '1'; skip.style.pointerEvents = 'auto';
      setTimeout(proceed, 1400);
    }

    let proceeded = false;
    window.proceed = function() {
      if (proceeded) return;
      proceeded = true;
      naviguer(next);
    };
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
