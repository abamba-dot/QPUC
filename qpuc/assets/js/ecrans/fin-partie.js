/* ════════════════════════════════════════════════
   Écran : fin-partie
   Questions pour un champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, DEMO } from '../state.js';
import { bindThemeDots, esc } from '../utils.js';

export const titre = 'Fin de Partie — CHAMPION.';

export const html = `
<div class="page fin-partie-page" id="page">
  <div class="theme-tag" id="theme-tag">celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8El7"></div>
  </div>

  <div class="section-title" id="final-title">Fin de Partie</div>
  <div class="section-sub" id="final-sub">Récapitulatif Complet</div>

  <!-- champion -->
  <div class="card champ-row">
    <span class="avatar avatar--lg" style="background:#3Dl87A">FZ</span>
    <div class="champ-info">
      <div class="champ-name">Fatima Z.</div>
      <div class="champ-title-lbl" id="champ-role">championne</div>
    </div>
    <div>
      <div class="champ-score">12</div>
      <div class="champ-title-lbl" style="text-align:right">pts</div>
    </div>
    <span class="badge badge--success" id="champ-badge">champion</span>
  </div>

  <!-- Stats -->
  <div class="stats-grid marge-bas-10" id="stats-grid">
    <div class="stat-card">
      <div class="stat-card__label">Questions posées</div>
      <div class="stat-card__value">30</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Bonne réponse rapide</div>
      <div class="stat-card__value">Fatima Z.</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Meilleure série</div>
      <div class="stat-card__value">4/4</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Durée de la partie</div>
      <div class="stat-card__value">~18 min</div>
    </div>
  </div>

  <!-- classement final -->
  <div class="player-list" id="classement">
    <div class="player-row card" style="animation-delay:.1s">
      <span class="player-rank">1</span>
      <span class="avatar" style="background:#3Dl87A">FZ</span>
      <div class="flex-1"><div class="player-name">Fatima Z.</div><div class="player-meta">champion</div></div>
      <span class="badge badge--success">champion</span>
      <span class="player-score">12</span>
    </div>
    <div class="player-row card" style="animation-delay:.18s">
      <span class="player-rank">2</span>
      <span class="avatar" style="background:#9B8El7">AK</span>
      <div class="flex-1"><div class="player-name">Amara K.</div><div class="player-meta">Finaliste</div></div>
      <span class="player-score">8</span>
    </div>
    <div class="player-row card" style="animation-delay:.26s">
      <span class="player-rank">3</span>
      <span class="avatar" style="background:#D4A820">YM</span>
      <div class="flex-1"><div class="player-name">Youssef M.</div><div class="player-meta">Demi-finale</div></div>
      <span class="player-score">9</span>
    </div>
    <div class="player-row card player-row--eliminated" style="animation-delay:.34s">
      <span class="player-rank">4</span>
      <span class="avatar" style="background:#E85A3A">KB</span>
      <div class="flex-1"><div class="player-name">Karim B.</div><div class="player-meta">Manche 1</div></div>
      <span class="player-score">6</span>
    </div>
  </div>

  <div class="btn-zone">
    <button class="btn-primary" id="replay-btn" data-onclick="navigate('mode-local.html')">Rejouer</button>
    <button class="btn-secondary" id="podium-btn" data-onclick="navigate('podium.html')">Podium</button>
    <button class="btn-secondary" data-onclick="navigate('menu.html')">Menu</button>
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
    const COLORS = ['#9B8El7', '#D4A820', '#3Dl87A', '#E85A3A'];
    const state = getState();
    const config = state.config || {};
    const isSolo = config.mode === 'solo' || state.rounds?.solo || state.players.length === 1;
    const isMultiplayer = ['multijoueur', 'quiz-multijoueur'].includes(config.mode);
    const resultats = state.rounds?.m3?.results?.length ? state.rounds.m3.results : DEMO.FINAL_RESULTS;
    const sorted = [...resultats].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    const champion = sorted.find(p => p.champion) || sorted[0];
    const statLabels = document.querySelectorAll('.stat-card__label');
    const statValues = document.querySelectorAll('.stat-card__value');
    const bestSerie = Math.max(0, ...sorted.map(p => p.serie || p.streak || 0));

    async function sauvegarderScore() {
      const pseudo = sessionStorage.getItem('qpuc-pseudo');
      if (!pseudo) return;
      const score = isSolo
        ? Number(state.rounds?.solo?.score || champion?.score || 0)
        : Number(champion?.score || 0);
      const signature = `${pseudo}:${score}:${config.mode || 'fidele'}:${sorted.map(p => `${p.id}-${p.score}`).join('|')}`;
      if (sessionStorage.getItem('qpuc-score-sauvegarde') === signature) return;

      try {
        await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pseudo,
            score,
            victoire: Boolean(champion),
            serieMax: isSolo ? (state.rounds?.solo?.bestStreak || bestSerie) : bestSerie,
            manche: state.manche || 1,
            mode: config.mode || 'fidele',
          }),
        });
        sessionStorage.setItem('qpuc-score-sauvegarde', signature);
      } catch (err) {
        console.warn('Score non sauvegardé :', err);
      }
    }

    function initials(p) {
      return p.init || p.name.slice(0, 2).toUpperCase();
    }

    function playerColor(p, fallbackIndex = 0) {
      return COLORS[(p.colorIdx ?? fallbackIndex) % COLORS.length];
    }

    if (champion) {
      const champRow = document.querySelector('.champ-row');
      champRow.querySelector('.avatar').style.background = playerColor(champion);
      champRow.querySelector('.avatar').textContent = initials(champion);
      champRow.querySelector('.champ-name').textContent = champion.name;
      champRow.querySelector('.champ-score').textContent = champion.score || 0;
    }

    if (isSolo) {
      const solo = state.rounds?.solo || {};
      document.getElementById('final-title').textContent = 'Course terminée';
      document.getElementById('final-sub').textContent = `${solo.category || config.category || 'Culture générale'} · ${solo.difficulty || config.difficulty || 'Moyen'}`;
      document.getElementById('champ-role').textContent = 'Performance solo';
      document.getElementById('champ-badge').textContent = 'Solo';
      document.getElementById('podium-btn').style.display = 'none';

      if (statLabels[0]) statLabels[0].textContent = 'Bonnes réponses';
      if (statLabels[1]) statLabels[1].textContent = 'Questions jouées';
      if (statLabels[2]) statLabels[2].textContent = 'Meilleure série';
      if (statLabels[3]) statLabels[3].textContent = 'Temps restant';
      if (statValues[0]) statValues[0].textContent = `${solo.correct ?? 0}/${solo.total || config.nbQuestions || 10}`;
      if (statValues[1]) statValues[1].textContent = `${solo.answered ?? 0}`;
      if (statValues[2]) statValues[2].textContent = `${solo.bestStreak || bestSerie}`;
      if (statValues[3]) statValues[3].textContent = `${Math.max(0, solo.remaining || 0)}s`;
    } else if (isMultiplayer) {
      document.getElementById('final-title').textContent = 'Partie terminée';
      document.getElementById('final-sub').textContent = `${config.category || 'Culture générale'} · ${config.difficulty || 'Moyen'} · Multijoueur`;
      document.getElementById('champ-role').textContent = 'Vainqueur multijoueur';
      document.getElementById('champ-badge').textContent = 'Vainqueur';
      document.getElementById('replay-btn').onclick = () => naviguer('multijoueur.html');

      const totalScore = sorted.reduce((sum, p) => sum + (p.score || 0), 0);
      const answeredPlayers = sorted.filter(p => (p.score || 0) > 0).length;
      if (statLabels[0]) statLabels[0].textContent = 'Questions jouées';
      if (statLabels[1]) statLabels[1].textContent = 'Vainqueur';
      if (statLabels[2]) statLabels[2].textContent = 'Joueurs classés';
      if (statLabels[3]) statLabels[3].textContent = 'Score total';
      if (statValues[0]) statValues[0].textContent = `${config.nbQuestions || sorted.length || 10}`;
      if (statValues[1]) statValues[1].textContent = champion?.name || '-';
      if (statValues[2]) statValues[2].textContent = `${answeredPlayers}/${sorted.length}`;
      if (statValues[3]) statValues[3].textContent = `${totalScore}`;
    } else {
      if (statValues[0]) statValues[0].textContent = `${config.nbQuestions || 10}+`;
      if (statValues[1]) statValues[1].textContent = champion?.name || '-';
      if (statValues[2]) statValues[2].textContent = `${bestSerie}/4`;
    }

    const classement = document.getElementById('classement');
    classement.innerHTML = '';
    sorted.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'player-row card' + (p.champion ? '' : i > 1 ? ' player-row--eliminated' : '');
      row.style.animationDelay = (.1 + i * .08) + 's';
      const meta = isSolo
        ? 'Course contre la montre'
        : isMultiplayer
          ? (p.champion ? 'Vainqueur' : `Classé ${i + 1}e`)
          : p.champion ? 'champion' : p.finaliste ? 'Finaliste' : 'Demi-finale';
      const badge = p.champion
        ? `<span class="badge badge--success">${isSolo ? 'Solo' : isMultiplayer ? 'Vainqueur' : 'champion'}</span>`
        : '';
      row.innerHTML = `
        <span class="player-rank">${i + 1}</span>
        <span class="avatar" style="background:${playerColor(p, i)}">${esc(initials(p))}</span>
        <div class="flex-1"><div class="player-name">${esc(p.name)}</div><div class="player-meta">${esc(meta)}</div></div>
        ${badge}
        <span class="player-score">${p.score || 0}</span>`;
      classement.appendChild(row);
    });

    sauvegarderScore();
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
