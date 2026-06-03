/* ════════════════════════════════════════════════
   Écran : fin-manche2
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, DEMO } from '../state.js';
import { bindThemeDots, esc } from '../utils.js';
import { playQualify, playEliminate } from '../sound.js';

export const titre = 'Fin Manche 2 — CHAMPION.';

export const html = `
<div class="page" id="page">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <div class="page-header-section">
    <span class="section-label">Résultats</span>
    <h1 class="section-title">Fin de la Manche 2</h1>
    <div class="section-sep"></div>
    <p class="section-sub" id="result-sub">2 finalistes qualifiés</p>
  </div>

  <div class="rule-badge rule-badge--result" id="rule-badge">
    3 joueurs · 2 finalistes · 1 éliminé
  </div>

  <div class="content-section">
    <div class="player-list" id="results-list"></div>
  </div>

  <div class="btn-zone">
    <button class="btn-primary" data-onclick="navigate('intro-manche3.html')">
      Continuer → Face à Face
    </button>
    <button class="btn-secondary" data-onclick="navigate('menu.html')">Retour menu</button>
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
    const state = getState();
    const resultats = state.rounds?.m2?.results?.length
      ? state.rounds.m2.results
      : DEMO.M2_RESULTS;
    const COLORS  = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
    const list    = document.getElementById('results-list');
    const total = resultats.length;
    const finalistCount = resultats.filter(p => p.qualified).length;
    const eliminatedCount = total - finalistCount;
    const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
  
    document.getElementById('result-sub').textContent = plural(finalistCount, 'finaliste qualifié', 'finalistes qualifiés');
    document.getElementById('rule-badge').textContent = [
      plural(total, 'joueur', 'joueurs'),
      plural(finalistCount, 'finaliste', 'finalistes'),
      eliminatedCount ? plural(eliminatedCount, 'éliminé', 'éliminés') : '',
    ].filter(Boolean).join(' · ');
  
    resultats.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'player-row card' + (p.qualified ? '' : ' player-row--eliminated');
      row.style.animationDelay = (.18 + i * .1) + 's';
  
      const color = COLORS[(p.colorIdx ?? i) % COLORS.length];
      const badge = p.qualified
        ? `<span class="badge badge--success">Finaliste</span>`
        : `<span class="badge badge--danger">Éliminé</span>`;
  
      const pips = `<div class="serie-pips">${Array.from({length:4},(_,j)=>`<div class="pip${j<(p.serie||0)?'':' empty'}"></div>`).join('')}</div>`;
  
      row.innerHTML = `
        <span class="player-rank">${i + 1}</span>
        <span class="avatar" style="background:${color};animation-delay:${.22+i*.1}s">${esc(p.init||p.name.slice(0,2).toUpperCase())}</span>
        <div class="flex-1">
          <div class="player-name">${esc(p.name)}</div>
          <div class="player-meta">Série : ${p.serie || 0}/4</div>
        </div>
        ${pips}
        ${badge}`;
      list.appendChild(row);
  
      setTimeout(() => {
        if (p.qualified) playQualify();
        else playEliminate();
      }, 600 + i * 700);
    });
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
