/* ════════════════════════════════════════════════
   Écran : modes-multijoueur
   Questions pour un champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots } from '../utils.js';

export const titre = 'Mode de jeu — CHAMPION.';

export const html = `
<div class="page modes-page" id="page" data-screen-label="Mode de jeu">
  <div class="theme-tag" id="theme-tag">celadon</div>
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
    <span class="page-title">Mode de jeu</span>
    <div class="largeur-64"></div>
  </div>
  <div class="modes-wrap">
    <div class="page-header-section" style="padding:4px 0 6px">
      <span class="section-label">choisissez comment jouer</span>
    </div>
    <div class="mode-card mode-card--primary" data-onclick="pickMode('classique')" tabindex="0" role="button" aria-label="Mode Classique">
      <div class="mode-card__num">01</div>
      <div class="mode-card__icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="3.2"/><circle cx="5.5" cy="14" r="2.4"/><circle cx="18.5" cy="14" r="2.4"/><path d="M12 14.5l-3 0-5 2-5 4.5h10l0-2.5-2-4.5-5-4.5z"/></svg>
      </div>
      <div class="mode-card__body">
        <div class="mode-card__title">Classique</div>
        <div class="mode-card__desc">Le format complet : 3 manches, buzzer, série et duel final. Chacun joue sur son appareil.</div>
      </div>
      <div class="mode-card__arrow"><svg width="20" height="20" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>
    <div class="mode-card" data-onclick="pickMode('quiz')" tabindex="0" role="button" aria-label="Mode Quiz animé">
      <div class="mode-card__num">02</div>
      <div class="mode-card__icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M8 21h8M12 16v5"/></svg>
      </div>
      <div class="mode-card__body">
        <div class="mode-card__title">Quiz animé <span class="mode-tag mode-tag--new">Nouveau</span></div>
        <div class="mode-card__desc">L'hôte anime sur grand écran, les joueurs répondent depuis leur téléphone.</div>
      </div>
      <div class="mode-card__arrow"><svg width="20" height="20" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>
    <div class="mode-card" data-onclick="pickMode('duel')" tabindex="0" role="button" aria-label="Mode Duel">
      <div class="mode-card__num">03</div>
      <div class="mode-card__icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10"/><path d="M12 4v16"/><path d="M5 8l-3 6h6l-3-6z"/><path d="M19 8l-3 6h6l-3-6z"/><path d="M9 20h6"/></svg>
      </div>
      <div class="mode-card__body">
        <div class="mode-card__title">Duel</div>
        <div class="mode-card__desc">Même format que le local : jusqu'à 4 joueurs, 3 manches, puis duel final.</div>
      </div>
      <div class="mode-card__arrow"><svg width="20" height="20" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>
    <div class="mode-card mode-card--locked mode-card--mystery" data-onclick="teaseLocked()" tabindex="0" role="button" aria-label="Mode mystère verrouillé">
      <div class="mode-card__num">?</div>
      <div class="mode-card__icon mystery-q">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1l0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
      </div>
      <div class="mode-card__body">
        <div class="mode-card__title mystery-blur" aria-hidden="true">Mode secret</div>
        <div class="mystery-redact" aria-hidden="true"><span class="redact-bar" class="largeur-82"></span><span class="redact-bar" style="width:54%"></span></div>
      </div>
      <span class="lock-tag">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        Mystère
      </span>
    </div>
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
    window.pickMode = function(mode) {
      try { sessionStorage.setItem('champ_mp_mode', mode); } catch(e) {}
      naviguer('creer-salle.html');
    };

    window.teaseLocked = function() {
      const card = document.querySelector('.mode-card--mystery');
      card?.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
        { duration: 320, easing: 'ease' }
      );
    };
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
