/* ════════════════════════════════════════════════
   Écran : fin-manche1
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, DEMO } from '../state.js';
import { bindThemeDots, esc } from '../utils.js';
import { playQualify, playEliminate } from '../sound.js';

export const titre = 'Fin Manche 1 — CHAMPION.';

export const html = `
<div class="page" id="page">

  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <!-- Header -->
  <div class="page-header-section">
    <span class="section-label">Résultats</span>
    <h1 class="section-title">Fin de la Manche 1</h1>
    <div class="section-sep"></div>
    <p class="section-sub" id="result-sub">3 candidats qualifiés</p>
  </div>

  <!-- Badge règle -->
  <div class="rule-badge rule-badge--result" id="rule-badge">
    4 joueurs · 3 qualifiés · 1 éliminé
  </div>

  <!-- Liste résultats -->
  <div class="content-section">
    <div class="player-list" id="results-list"></div>
  </div>

  <!-- Boutons -->
  <div class="btn-zone">
    <button class="btn-primary" id="next-round-btn">
      Continuer → Manche 2
    </button>
    <button class="btn-secondary" data-onclick="navigate('menu.html')">
      Retour menu
    </button>
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
    const fallbackQualifiedCount = Math.min(3, state.players.length || DEMO.M1_RESULTS.length);
    const resultats = state.rounds?.m1?.results?.length
      ? state.rounds.m1.results
      : state.players.length
        ? [...state.players]
            .map(p => ({ ...p, score: p.score || 0 }))
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((p, i) => ({
              ...p,
              qualified: i < fallbackQualifiedCount,
              meta: i < fallbackQualifiedCount
                ? (fallbackQualifiedCount <= 2 ? 'Finaliste' : i === fallbackQualifiedCount - 1 ? 'Dernier qualifié' : 'Qualifié')
                : 'Parcours terminé',
            }))
        : DEMO.M1_RESULTS;
  
    const COLORS = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
    const list   = document.getElementById('results-list');
    const total = resultats.length;
    const qualifiedCount = resultats.filter(p => p.qualified).length;
    const eliminatedCount = total - qualifiedCount;
    const goToFinal = qualifiedCount <= 2;
    const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
  
    document.getElementById('result-sub').textContent = goToFinal
      ? plural(qualifiedCount, 'finaliste qualifié', 'finalistes qualifiés')
      : plural(qualifiedCount, 'candidat qualifié', 'candidats qualifiés');
  
    document.getElementById('rule-badge').textContent = [
      plural(total, 'joueur', 'joueurs'),
      goToFinal
        ? plural(qualifiedCount, 'finaliste', 'finalistes')
        : plural(qualifiedCount, 'qualifié', 'qualifiés'),
      eliminatedCount ? plural(eliminatedCount, 'éliminé', 'éliminés') : '',
    ].filter(Boolean).join(' · ');
  
    const nextBtn = document.getElementById('next-round-btn');
    nextBtn.textContent = goToFinal ? 'Continuer → Face à Face' : 'Continuer → Manche 2';
    nextBtn.addEventListener('click', () => naviguer(goToFinal ? 'intro-manche3.html' : 'intro-manche2.html'));
  
    resultats.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'player-row card' + (p.qualified ? '' : ' player-row--eliminated');
      row.style.animationDelay = (.18 + i * .1) + 's';
  
      const color = COLORS[(p.colorIdx ?? i) % COLORS.length];
      const badge = p.qualified
        ? `<span class="badge badge--success">${goToFinal ? 'Finaliste' : 'Qualifié'}</span>`
        : `<span class="badge badge--danger">Éliminé</span>`;
  
      row.innerHTML = `
        <span class="player-rank">${i + 1}</span>
        <span class="avatar" style="background:${color};animation-delay:${.22 + i * .1}s">${esc(p.init || p.name.slice(0,2).toUpperCase())}</span>
        <div class="flex-1">
          <div class="player-name">${esc(p.name)}</div>
          <div class="player-meta">${esc(p.meta || '')}</div>
        </div>
        ${badge}
        <span class="player-score">${p.score}</span>`;
  
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
