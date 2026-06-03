/* ════════════════════════════════════════════════
   Écran : revelation
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots } from '../utils.js';

export const titre = 'Révélation — Face à Face';

export const html = `
<div class="page" id="page">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <div class="badge badge--glass" style="margin-bottom:16px">Manche 3 · Révélation</div>

  <div class="card revelation-card" id="reveal-card">
    <div class="revelation-question">La réponse était…</div>
    <div class="revelation-answer" id="reveal-answer">—</div>
    <div class="revelation-winner" id="reveal-winner"></div>
    <div class="revelation-pts" id="reveal-pts"></div>
  </div>

  <!-- Score actuel -->
  <div class="card card--glass" style="margin-top:12px;padding:14px 16px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
      <div class="align-center flex-1">
        <div class="avatar avatar--sm marge-auto" id="avatar-l">?</div>
        <div class="score-chip__value marge-haut-6" id="score-l">0</div>
        <div class="score-chip__name" id="name-l">—</div>
      </div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:800;color:var(--sub)">–</div>
      <div class="align-center flex-1">
        <div class="avatar avatar--sm marge-auto" id="avatar-r">?</div>
        <div class="score-chip__value marge-haut-6" id="score-r">0</div>
        <div class="score-chip__name" id="name-r">—</div>
      </div>
    </div>
    <div class="rounds-info" style="margin-top:8px;text-align:center" id="rounds-info"></div>
  </div>

  <div class="btn-zone marge-haut-8">
    <button class="btn-primary" id="btn-next" data-onclick="navigate('jeu-manche3.html')">Question suivante →</button>
    <button class="btn-secondary" data-onclick="navigate('podium.html')">Voir le Podium</button>
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
    const COLORS = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
  
    function readJSON(key, fallback) {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch(e) { return fallback; }
    }
  
    const d = readJSON('champ_revelation', null);
  
    if (d) {
      // Réponse
      document.getElementById('reveal-answer').textContent = d.answer || '—';
  
      // Gagnant / message
      const winnerEl = document.getElementById('reveal-winner');
      const ptsEl    = document.getElementById('reveal-pts');
      if (d.correct && d.scorerName) {
        winnerEl.textContent = `${d.scorerName} marque ${d.pts} pt${d.pts > 1 ? 's' : ''} !`;
        ptsEl.textContent    = `+${d.pts}`;
        ptsEl.style.color    = 'var(--color-correct)';
      } else {
        winnerEl.textContent = 'Personne ne marque';
        ptsEl.textContent    = '0';
        ptsEl.style.color    = 'var(--sub)';
      }
  
      // Avatars et scores
      const avL = document.getElementById('avatar-l');
      avL.textContent       = d.initL;
      avL.style.background  = COLORS[d.colorL % COLORS.length];
      document.getElementById('score-l').textContent = d.scoreL;
      document.getElementById('name-l').textContent  = d.nameL;
  
      const avR = document.getElementById('avatar-r');
      avR.textContent       = d.initR;
      avR.style.background  = COLORS[d.colorR % COLORS.length];
      document.getElementById('score-r').textContent = d.scoreR;
      document.getElementById('name-r').textContent  = d.nameR;
  
      // Info bas
      const target = 3;
      const leading = Math.max(d.scoreL, d.scoreR);
      document.getElementById('rounds-info').textContent = d.gameOver
        ? `Finale terminée · Objectif ${target} pts atteint`
        : `Objectif ${target} pts · Meneur : ${leading} pt${leading > 1 ? 's' : ''}`;
  
      // Masquer "Question suivante" si partie terminée
      if (d.gameOver) {
        document.getElementById('btn-next').style.display = 'none';
      }
    }
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
