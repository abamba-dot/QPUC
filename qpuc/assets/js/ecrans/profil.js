/* ════════════════════════════════════════════════
   Écran : profil
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots } from '../utils.js';
import { PROFILE, avatarColor } from '../multiplayer-data.js';

export const titre = 'Profil — CHAMPION.';

export const html = `
<div class="page profile-page" id="page" data-screen-label="Profil joueur">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="page-header marge-bas-8">
    <button class="back-btn" data-onclick="navigate('classement-general.html')" aria-label="Retour">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Retour
    </button>
    <span class="page-title">Mon profil</span>
    <button class="back-btn opacite-42" data-onclick="navigate('settings.html')" aria-label="Paramètres">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
    </button>
  </div>
  <div class="profile-scroll">
    <div class="card profile-hero">
      <div class="avatar avatar--lg" id="hero-av" style="background:#3A8A6B">IM</div>
      <div class="profile-id">
        <div class="profile-name" id="hero-name">Imran</div>
        <div class="profile-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          <span id="hero-title">Stratège</span>
        </div>
      </div>
      <div class="profile-rank-chip">
        <div class="profile-rank-chip__num" id="hero-rank">#6</div>
        <div class="profile-rank-chip__lbl">Mondial</div>
      </div>
    </div>
    <div>
      <div class="profile-section-label marge-bas-10">Statistiques</div>
      <div class="profile-stats" id="stats"></div>
    </div>
    <div>
      <div class="profile-section-label marge-bas-10">Trophées <span id="trophy-count" style="opacity:.6"></span></div>
      <div class="trophy-row" id="trophies"></div>
    </div>
    <div>
      <div class="profile-section-label marge-bas-10">Parties récentes</div>
      <div class="history-list" id="history"></div>
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
    document.getElementById('hero-av').textContent = PROFILE.init;
    document.getElementById('hero-av').style.background = avatarColor(PROFILE.color);
    document.getElementById('hero-name').textContent = PROFILE.name;
    document.getElementById('hero-title').textContent = PROFILE.title;
    document.getElementById('hero-rank').textContent = '#' + PROFILE.globalRank;
  
    const s = PROFILE.stats;
    const STATS = [
      { val: s.games, lbl: 'Parties' }, { val: s.wins, lbl: 'Victoires' },
      { val: s.winRate + '%', lbl: 'Taux de victoire' }, { val: s.accuracy + '%', lbl: 'Précision' },
      { val: s.bestStreak, lbl: 'Meilleure série' }, { val: s.points.toLocaleString('fr-FR'), lbl: 'Points totaux' },
    ];
    const statsEl = document.getElementById('stats');
    STATS.forEach((st, i) => {
      const el = document.createElement('div');
      el.className = 'pstat';
      el.style.animationDelay = (i * 0.05) + 's';
      el.innerHTML = `<span class="pstat__val">${st.val}</span><span class="pstat__lbl">${st.lbl}</span>`;
      statsEl.appendChild(el);
    });
  
    const ICONS = {
      star:'<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>',
      flame:'<path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-1-2-1-3 2 1 4 3 4 6a6 6 0 0 1-12 0c0-5 6-7 6-12z"/>',
      shield:'<path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/>',
      bolt:'<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
      crown:'<path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z"/>',
      book:'<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v16"/>',
    };
    const trophiesEl = document.getElementById('trophies');
    const unlocked = PROFILE.trophies.filter(t => t.unlocked).length;
    document.getElementById('trophy-count').textContent = `· ${unlocked}/${PROFILE.trophies.length}`;
    PROFILE.trophies.forEach(t => {
      const el = document.createElement('div');
      el.className = 'trophy' + (t.unlocked ? '' : ' trophy--locked');
      el.innerHTML = `<div class="trophy__icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">${ICONS[t.icon] || ICONS.star}</svg></div><div class="trophy__name">${t.name}</div><div class="trophy__desc">${t.desc}</div>`;
      trophiesEl.appendChild(el);
    });
  
    const historyEl = document.getElementById('history');
    PROFILE.history.forEach((h, i) => {
      const isWin = h.result === 'win';
      const el = document.createElement('div');
      el.className = 'history-row';
      el.style.animationDelay = (i * 0.05) + 's';
      el.innerHTML = `<div class="history-medal ${isWin ? 'history-medal--win' : 'history-medal--good'}">${isWin ? '1' : h.rank}${isWin ? '' : 'ᵉ'}</div><div class="history-body"><div class="history-mode">${h.mode}</div><div class="history-meta">${h.date}</div></div><span class="history-pts">+${h.pts}</span>`;
      historyEl.appendChild(el);
    });
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
