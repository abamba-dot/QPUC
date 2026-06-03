/* ════════════════════════════════════════════════
   Écran : multijoueur
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots } from '../utils.js';

export const titre = 'Multijoueur — CHAMPION.';

export const html = `
<div class="page mp-page" id="page" data-screen-label="Multijoueur">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="page-header">
    <button class="back-btn" data-onclick="navigate('menu.html')" aria-label="Retour au menu">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Retour
    </button>
    <span class="page-title">Multijoueur</span>
    <button class="back-btn opacite-42" data-onclick="navigate('classement-general.html')" aria-label="Classement">
      Classement
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
  <div class="mp-hub">
    <div class="page-header-section" style="padding-bottom:4px">
      <span class="section-label">2 à 8 joueurs · en temps réel</span>
      <h1 class="section-title" style="animation-delay:.1s;opacity:1">Jouez ensemble</h1>
      <div class="section-sep"></div>
    </div>
    <div class="mp-choices">
      <div class="mp-tile mp-tile--primary" data-onclick="navigate('modes-multijoueur.html')" tabindex="0" role="button" aria-label="Créer une salle">
        <div class="mp-tile__icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <div class="mp-tile__title">Créer une salle</div>
        <div class="mp-tile__desc">Configurez la partie, invitez vos amis avec un code.</div>
        <span class="mp-tile__cta">Configurer →</span>
      </div>
      <div class="mp-tile" data-onclick="navigate('rejoindre-salle.html')" tabindex="0" role="button" aria-label="Rejoindre une salle">
        <div class="mp-tile__icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>
        </div>
        <div class="mp-tile__title">Rejoindre</div>
        <div class="mp-tile__desc">Entrez le code partagé par l'hôte ou scannez son QR code.</div>
        <span class="mp-tile__cta">Entrer un code →</span>
      </div>
    </div>
    <div class="mp-resume cache" id="resume" data-onclick="navigate('lobby.html')" tabindex="0" role="button">
      <div class="live-dot-lg"></div>
      <div class="mp-resume__body">
        <div class="mp-resume__label">Salle en attente · reprendre</div>
        <div class="mp-resume__code" id="resume-code"></div>
      </div>
      <svg width="18" height="18" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
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
    const activeCode = sessionStorage.getItem('champ_room_code');
    if (activeCode) {
      document.getElementById('resume').style.display = 'flex';
      document.getElementById('resume-code').textContent = activeCode;
    }
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
