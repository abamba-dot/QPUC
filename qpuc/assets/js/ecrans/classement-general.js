/* ════════════════════════════════════════════════
   Écran : classement-general
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, esc } from '../utils.js';
import { GLOBAL_BOARD, avatarColor } from '../multiplayer-data.js';

export const titre = 'Classement général — CHAMPION.';

export const html = `
<div class="page lb-gen-page" id="page" data-screen-label="Classement général">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="page-header marge-bas-8">
    <button class="back-btn" data-onclick="navigate('menu.html')" aria-label="Retour">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Retour
    </button>
    <span class="page-title">Classement général</span>
    <button class="back-btn opacite-42" data-onclick="navigate('profil.html')" aria-label="Mon profil">
      Profil
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
  <div class="period-tabs" id="period-tabs">
    <button class="period-tab" data-period="semaine">Semaine</button>
    <button class="period-tab period-tab--active" data-period="mois">Mois</button>
    <button class="period-tab" data-period="toujours">Toujours</button>
  </div>
  <div class="lb-podium" id="podium"></div>
  <div class="lb-gen-scroll" id="list"></div>
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
    let period = 'mois';
  
    function render() {
      const data   = GLOBAL_BOARD[period];
      const podium = document.getElementById('podium');
      const list   = document.getElementById('list');
      const top3   = data.slice(0, 3);
      const order  = [top3[1], top3[0], top3[2]];
      const ranks  = [2, 1, 3];
      podium.innerHTML = '';
      const podEls = {};
      order.forEach((p, i) => {
        if (!p) return;
        const rank = ranks[i];
        const el = document.createElement('div');
        el.className = 'lb-pod' + (rank === 1 ? ' lb-pod--first' : '');
        const crown = rank === 1 ? `<div class="lb-pod__crown"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z"/></svg></div>` : '';
        el.innerHTML = `${crown}<div class="avatar ${rank===1?'avatar--lg':''}" style="background:${avatarColor(p.color)}">${esc(p.init)}</div><div class="lb-pod__medal lb-pod__medal--${rank}">${rank}</div><div class="lb-pod__name">${esc(p.name)}</div><div class="lb-pod__score">${p.score.toLocaleString('fr-FR')}</div><div class="lb-pod__base lb-pod__base--${rank}"></div>`;
        podium.appendChild(el);
        podEls[rank] = el;
      });
      [3, 2, 1].forEach((rank, step) => { setTimeout(() => podEls[rank]?.classList.add('lb-pod--revealed'), 260 + step * 620); });
      list.innerHTML = '';
      data.slice(3).forEach((p, i) => {
        const rank = i + 4;
        const row = document.createElement('div');
        row.className = 'lb-gen-row' + (p.me ? ' lb-gen-row--me' : '');
        row.style.animationDelay = (i * 0.04) + 's';
        row.innerHTML = `<span class="lb-gen-rank">${rank}</span><div class="avatar avatar--sm" style="background:${avatarColor(p.color)}">${esc(p.init)}</div><div class="lb-gen-info"><div class="lb-gen-name">${esc(p.name)}${p.me ? '<span class="you-tag">Vous</span>' : ''}</div><div class="lb-gen-sub">${p.games} parties</div></div><span class="lb-gen-score">${p.score.toLocaleString('fr-FR')}</span>`;
        list.appendChild(row);
      });
      const me = data.find(p => p.me);
      const meRank = data.indexOf(me) + 1;
      if (me && meRank <= 3) {
        const row = document.createElement('div');
        row.className = 'lb-gen-row lb-gen-row--me';
        row.innerHTML = `<span class="lb-gen-rank">${meRank}</span><div class="avatar avatar--sm" style="background:${avatarColor(me.color)}">${esc(me.init)}</div><div class="lb-gen-info"><div class="lb-gen-name">${esc(me.name)}<span class="you-tag">Vous</span></div><div class="lb-gen-sub">${me.games} parties · podium</div></div><span class="lb-gen-score">${me.score.toLocaleString('fr-FR')}</span>`;
        list.appendChild(row);
      }
    }
  
    document.getElementById('period-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.period-tab');
      if (!tab) return;
      period = tab.dataset.period;
      document.querySelectorAll('.period-tab').forEach(t => t.classList.toggle('period-tab--active', t === tab));
      render();
    });
  
    render();
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
