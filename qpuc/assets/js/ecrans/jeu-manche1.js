/* ════════════════════════════════════════════════
   Écran : jeu-manche1
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, finishManche1, finishGame, DEMO } from '../state.js';
import { loadQuestions } from '../questions-service.js';
import { createTimer } from '../timer.js';
import * as Utils from '../utils.js';
import { playBuzzer, playCorrect, playWrong } from '../sound.js';

const { spawnScoreFloat, spawnParticles, bindThemeDots, esc } = Utils;
const fitTextToBox = Utils.fitTextToBox || (() => {});

let _nettoyages = [];
function _ajouterNettoyage(fn) { if (typeof fn === 'function') _nettoyages.push(fn); }

export const titre = 'Jeu — Manche 1';

export const html = `
<div class="page jeu-m1-page" id="page">

  <div class="theme-dots" style="top:14px">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <!-- TOP BAR -->
  <div class="topbar">
    <div class="q-info">
      <span class="q-label" id="q-label">Question 1 / 10</span>
      <div class="progress-dots" id="q-dots"></div>
    </div>
    <div class="timer-ring" id="timer-wrap">
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--glass)" stroke-width="5"/>
        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent)" stroke-width="5"
          stroke-linecap="round" transform="rotate(-90 32 32)" stroke-dasharray="170"
          data-timer-ring style="stroke-dashoffset:0;transition:stroke .3s"/>
        <circle cx="32" cy="32" r="22" fill="var(--card-bg)" data-timer-center/>
      </svg>
      <span class="timer-ring__value" id="timer-val" data-timer-value role="timer" aria-live="off" aria-label="Temps restant : 20 secondes">20</span>
    </div>
    <div class="streak-wrap">
      <div class="streak-badge" id="streak-badge">
        <svg class="flame" width="11" height="13" viewBox="0 0 12 14" fill="none">
          <path d="M6 1S3 5 3 8a3 3 0 006 0c0-1.2-.7-2.4-.7-2.4S7.8 7 7 7s-1-.8-1-2 1.5-4 1.5-4S10 5 10 7.5A4 4 0 012 7.5" fill="#FF6A00"/>
          <path d="M7 10c0 .55-.45 1-1 1s-1-.45-1-1 1-2 1-2 1 1.45 1 2z" fill="#FFD100"/>
        </svg>
        <span id="streak-txt">×0</span>
      </div>
    </div>
  </div>

  <!-- QUESTION -->
  <div class="q-section">
    <div class="q-card" id="q-card">
      <div class="q-category" id="q-cat">Géographie · Moyen</div>
      <div class="q-text" id="q-text">Quelle est la capitale du Maroc ?</div>
      <div class="q-progress" id="q-prog"><div class="q-progress-fill" id="q-prog-fill"></div></div>
    </div>
  </div>

  <!-- RÉPONSES 2×2 -->
  <div class="answers-section answers-section--hidden" id="answers">
    <div class="answers-row">
      <div class="ans-btn" id="a0" data-onclick="answer(0)" tabindex="0">
        <div class="ans-letter" id="al0">A</div>
        <span class="ans-text" id="at0">Casablanca</span>
        <span class="ans-check" id="ac0"></span>
      </div>
      <div class="ans-btn" id="a1" data-onclick="answer(1)" tabindex="0">
        <div class="ans-letter" id="al1">B</div>
        <span class="ans-text" id="at1">Rabat</span>
        <span class="ans-check" id="ac1"></span>
      </div>
    </div>
    <div class="answers-row">
      <div class="ans-btn" id="a2" data-onclick="answer(2)" tabindex="0">
        <div class="ans-letter" id="al2">C</div>
        <span class="ans-text" id="at2">Marrakech</span>
        <span class="ans-check" id="ac2"></span>
      </div>
      <div class="ans-btn" id="a3" data-onclick="answer(3)" tabindex="0">
        <div class="ans-letter" id="al3">D</div>
        <span class="ans-text" id="at3">Fès</span>
        <span class="ans-check" id="ac3"></span>
      </div>
    </div>
  </div>

  <!-- OVERLAY SÉLECTION JOUEUR (multi) -->
  <div class="player-select-overlay" id="player-select" style="display:none;position:absolute;inset:0;z-index:8;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);align-items:center;justify-content:center;flex-direction:column;gap:16px">
    <div style="font-family:var(--font-display);font-size:clamp(18px,4vw,26px);font-weight:800;color:#fff;letter-spacing:-.02em">Qui répond ?</div>
    <div id="player-select-grid" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"></div>
  </div>

  <!-- BUZZER -->
  <div class="buzzer-section">
    <div class="buzz-status" id="buzz-status">Sélectionne un joueur ou appuie sur le buzzer</div>
    <div class="buzzer" id="buzzer" data-onclick="pressBuzzer()" role="button" tabindex="0" aria-label="Buzzer">
      <div class="buzzer__inner">
        <div class="buzzer__label">BUZZ</div>
      </div>
    </div>
  </div>

  <!-- SCORES -->
  <div class="scores-bar" id="scores-bar"></div>

  </div>



`;

export async function init(conteneur) {
  cleanup();
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
    let ecranActif = true;
    _ajouterNettoyage(() => { ecranActif = false; });
    const state = getState();
    const PLAYERS = (state.players.length ? state.players : [
      { name: 'Amara K.', init: 'AK', colorIdx: 0, score: 340 },
      { name: 'Youssef M.', init: 'YM', colorIdx: 1, score: 290 },
      { name: 'Fatima Z.', init: 'FZ', colorIdx: 2, score: 255 },
    ]).map((p, i) => ({ ...p, id: p.id ?? i + 1, score: p.score || 0, streak: p.streak || 0 }));
    const COLORS   = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
    const config = state.config || {};
    const isSolo = config.mode === 'solo' || PLAYERS.length === 1;
    const TOTAL    = Math.max(1, Number(config.nbQuestions) || 10);
    const QS = await loadQuestions({
      category: config.category,
      difficulty: config.difficulty,
      limit: 60,
      fallback: DEMO.QUESTIONS,
    });

    const GOAL = 9;
    let curQ = 0, answered = false, answersRevealed = false;
    let activePlayerId = PLAYERS[0]?.id ?? 1;
    let failedBuzzers = new Set();
    let qualifiedIds = new Set();
    let qualifiedCount = 0;
    let timer = null;

    function currentPoints() {
      return qualifiedCount === 0 ? 1 : qualifiedCount === 1 ? 2 : 3;
    }
  
    function hideAnswers() {
      if (!ecranActif) return;
      answersRevealed = false;
      document.getElementById('answers').classList.add('answers-section--hidden');
      activePlayerId = PLAYERS[0]?.id ?? activePlayerId;
      updateBuzzStatus();
      buildScores();
    }

    function revealAnswers() {
      if (!ecranActif) return;
      answersRevealed = true;
      document.getElementById('answers').classList.remove('answers-section--hidden');
      updateBuzzStatus();
    }
  
    function getActivePlayer() {
      return PLAYERS.find(p => p.id === activePlayerId) || PLAYERS[0];
    }
  
    function updateBuzzStatus() {
      const status = document.getElementById('buzz-status');
      const player = getActivePlayer();
      if (!status || !player) return;
      status.textContent = answersRevealed
        ? `${player.name} a buzzé`
        : isSolo
          ? `${player.name} est prêt`
          : 'Chaque joueur buzze avec sa touche';
    }
  
    /* ── Scores bar ── */
    function buildScores() {
      const bar = document.getElementById('scores-bar');
      bar.innerHTML = '';
      const sorted = [...PLAYERS].sort((a, b) => (b.score || 0) - (a.score || 0));
      const max = sorted[0].score || 1;
  
      sorted.forEach((p, i) => {
        const color = COLORS[(p.colorIdx ?? i) % COLORS.length];
        const chip  = document.createElement('div');
        chip.className = 'score-chip score-chip--buzzable';
        if (p.id === activePlayerId) chip.classList.add('score-chip--active');
        if (i === 0) chip.classList.add('score-chip--leader');
        chip.setAttribute('role', 'button');
        chip.setAttribute('tabindex', '0');
        chip.setAttribute('aria-label', `${p.name} buzze`);
        chip.onclick = () => buzzForPlayer(p.id);
        chip.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            buzzForPlayer(p.id);
          }
        });
        const isQual = qualifiedIds.has(p.id);
        const sc = p.score || 0;
        const barPct = isQual ? 100 : Math.round(sc / GOAL * 100);
        chip.innerHTML = `
          <div class="score-chip__top">
            <span class="avatar avatar--sm" style="background:${color}">${esc(p.init || p.name[0])}</span>
            <span class="score-chip__name">${esc(p.name.split(' ')[0])}</span>
            ${isQual ? '<span class="score-chip__buzz" style="background:var(--color-correct);color:#fff;font-size:9px">✓ Qualifié</span>' : p.buzzKey ? `<span class="score-chip__buzz">${esc(p.buzzKey)}</span>` : p.id === activePlayerId ? '<span class="score-chip__buzz">BUZZ</span>' : i === 0 ? '<div class="score-chip__live"></div>' : ''}
          </div>
          <div class="score-chip__value">${isQual ? '<span style="color:var(--color-correct)">✓</span>' : `${sc}<span style="opacity:.45;font-size:.6em">/${GOAL}</span>`}</div>
          <div class="score-chip__bar-bg">
            <div class="score-chip__bar-fill" style="width:${barPct}%;${isQual ? 'background:var(--color-correct)' : ''}"></div>
          </div>`;
        bar.appendChild(chip);
      });
    }
  
    /* ── Point value indicator ── */
    function buildDots() {
      const pts = currentPoints();
      document.getElementById('q-label').textContent = `Question ${curQ + 1}`;
      const wrap = document.getElementById('q-dots');
      wrap.innerHTML = '';
      for (let i = 0; i < pts; i++) {
        const d = document.createElement('div');
        d.className = 'progress-dot progress-dot--current';
        d.style.background = pts === 3 ? 'var(--accent-2)' : pts === 2 ? '#D4A820' : 'var(--accent)';
        d.style.width = '14px';
        wrap.appendChild(d);
      }
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:10px;font-weight:900;color:var(--sub);letter-spacing:.06em;margin-left:5px;text-transform:uppercase';
      lbl.textContent = `${pts} pt${pts > 1 ? 's' : ''}`;
      wrap.appendChild(lbl);
    }
  
    /* ── Style bouton réponse ── */
    function styleDefault(i) {
      const b = document.getElementById('a' + i);
      b.className = 'ans-btn'; b.style = '';
      document.getElementById('al' + i).style = '';
      document.getElementById('at' + i).style = '';
      document.getElementById('ac' + i).textContent = '';
    }
  
    function buzzForPlayer(playerId) {
      if (answered || answersRevealed) return;
      if (failedBuzzers.has(playerId)) {
        const status = document.getElementById('buzz-status');
        if (status) status.textContent = 'Ce joueur a déjà tenté cette question';
        return;
      }
      playBuzzer();
      activePlayerId = playerId;
      updateBuzzStatus();
      buildScores();
      const bz = document.getElementById('buzzer');
      bz.classList.remove('buzzer--pressed'); void bz.offsetWidth;
      bz.classList.add('buzzer--pressed');
      revealAnswers();
      setTimeout(() => bz.classList.remove('buzzer--pressed'), 500);
      // Re-animer les réponses
      for (let i = 0; i < 4; i++) {
        const b = document.getElementById('a' + i);
        b.style.animation = 'none'; void b.offsetWidth; b.style.animation = `slideUp .22s ease ${i * .04}s both`;
      }
    }
  
    /* ── Buzzer ── */
    window.pressBuzzer = function() {
      buzzForPlayer(activePlayerId);
    };
  
    function normalizeBuzzKey(event) {
      if (!event.key || event.ctrlKey || event.altKey || event.metaKey) return '';
      if (event.key === ' ') return 'ESPACE';
      if (event.key === 'Escape') return 'ECHAP';
      if (event.key.length === 1) return event.key.toUpperCase();
      return event.key.toUpperCase().replace(/^ARROW/, 'FLECHE ');
    }
  
    /* ── Répondre ── */
    window.answer = function(idx) {
      if (answered || !answersRevealed) return;
      answered = true;
      timer && timer.pause();
  
      const q  = QS[curQ];
      const ok = idx === q.c;
      const activePlayer = getActivePlayer();
  
      for (let i = 0; i < 4; i++) document.getElementById('a' + i).classList.add('ans-btn--disabled');
  
      const btn = document.getElementById('a' + idx);
      if (ok) {
        const pts = currentPoints();
        playCorrect();
        btn.classList.add('ans-btn--correct');
        document.getElementById('ac' + idx).textContent = '✓';
        document.getElementById('ac' + idx).style.color = 'var(--color-correct)';
        activePlayer.streak = (activePlayer.streak || 0) + 1;
        spawnScoreFloat(btn, `+${pts}`);
        spawnParticles(btn);
        activePlayer.score = (activePlayer.score || 0) + pts;
        tryQualify(activePlayer);
      } else {
        playWrong();
        btn.classList.add('ans-btn--wrong');
        document.getElementById('ac' + idx).textContent = '✗';
        document.getElementById('ac' + idx).style.color = 'var(--color-error)';
        activePlayer.streak = 0;
        failedBuzzers.add(activePlayer.id);
        const remainingPlayers = isSolo ? [] : PLAYERS.filter(p => !failedBuzzers.has(p.id));
        if (remainingPlayers.length) {
          document.getElementById('streak-txt').textContent = `${activePlayer.name.split(' ')[0]} ×0`;
          buildScores();
          const _t1 = setTimeout(() => {
            if (!ecranActif) return;
            answered = false;
            activePlayerId = remainingPlayers[0].id;
            for (let i = 0; i < 4; i++) styleDefault(i);
            hideAnswers();
            const status = document.getElementById('buzz-status');
            if (status) status.textContent = 'Mauvaise réponse · main aux autres';
            const rest = Math.max(3, timer?.getRemaining?.() || 8);
            timer?.reset?.(rest);
            timer?.start?.();
          }, 850);
          _ajouterNettoyage(() => clearTimeout(_t1));
          return;
        } else {
          // Afficher la bonne réponse quand tout le monde a tenté.
          const cb = document.getElementById('a' + q.c);
          cb.classList.add('ans-btn--correct');
          document.getElementById('ac' + q.c).textContent = '✓';
          document.getElementById('ac' + q.c).style.color = 'var(--color-correct)';
        }
      }
  
      document.getElementById('streak-txt').textContent = `${activePlayer.name.split(' ')[0]} ×${activePlayer.streak || 0}`;
      buildScores();
      const _t2 = setTimeout(nextQuestion, 1800);
      _ajouterNettoyage(() => clearTimeout(_t2));
    };
  
    function timeUp() {
      playWrong();
      answered = true;
      PLAYERS.forEach(p => { p.streak = 0; });
      revealAnswers();
      document.getElementById('streak-txt').textContent = isSolo ? `${getActivePlayer().name.split(' ')[0]} ×0` : '×0';
      const q = QS[curQ];
      for (let i = 0; i < 4; i++) document.getElementById('a' + i).classList.add('ans-btn--disabled');
      const cb = document.getElementById('a' + q.c);
      cb.classList.add('ans-btn--correct');
      document.getElementById('ac' + q.c).textContent = '✓';
      document.getElementById('ac' + q.c).style.color = 'var(--color-correct)';
      const _t3 = setTimeout(nextQuestion, 1600);
      _ajouterNettoyage(() => clearTimeout(_t3));
    }
  
    function nextQuestion() {
      if (!ecranActif) return;
      const unqualified = PLAYERS.filter(p => !qualifiedIds.has(p.id));
      if (!isSolo && unqualified.length <= 1) {
        const _t4 = setTimeout(endManche, 700);
        _ajouterNettoyage(() => clearTimeout(_t4));
        return;
      }
      if (curQ + 1 >= QS.length) {
        endManche();
        return;
      }

      timer && timer.stop();
      curQ += 1;
      answered = false;
      failedBuzzers = new Set();
      hideAnswers();
      for (let i = 0; i < 4; i++) styleDefault(i);
  
      const qc = document.getElementById('q-card');
      qc.style.animation = 'none'; void qc.offsetWidth; qc.style.animation = 'slideUp .4s var(--ease-spring) both';
  
      for (let i = 0; i < 4; i++) {
        const b = document.getElementById('a' + i);
        b.style.animation = 'none'; void b.offsetWidth; b.style.animation = `slideUp .4s ease ${i * .06}s both`;
      }
  
      const q = QS[curQ];
      document.getElementById('q-cat').textContent  = q.cat;
      const qText = document.getElementById('q-text');
      qText.textContent = q.q;
      requestAnimationFrame(() => fitTextToBox(qText, { container: document.getElementById('q-card'), min: 18, padding: 22 }));
      for (let i = 0; i < 4; i++) document.getElementById('at' + i).textContent = q.opts[i];
      buildDots();
  
      timer = createTimer(document.getElementById('timer-wrap'), {
        duration: 20, urgentAt: 5,
        onEnd: timeUp,
      });
      timer.start();
    }
  
    /* ── Qualification 9 pts ── */
    function tryQualify(player) {
      if (qualifiedIds.has(player.id) || (player.score || 0) < GOAL) return false;
      qualifiedIds.add(player.id);
      qualifiedCount++;
      buildScores();
      buildDots();
      // Bannière de qualification
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:200;background:var(--color-correct);color:#fff;padding:18px 36px;border-radius:var(--radius-lg);font-family:var(--font-display);font-size:clamp(20px,4vw,36px);font-weight:900;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.28);pointer-events:none;animation:slideUp .35s var(--ease-spring) both';
      banner.textContent = `${player.name} · QUALIFIÉ !`;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 1900);
      return true;
    }

    /* ── Fin de manche ── */
    window.endManche = endManche;
    function endManche() {
      timer && timer.stop();
      if (isSolo) {
        const solo = PLAYERS[0];
        finishGame({
          finalists: [solo],
          winnerId: solo.id,
          duelScores: { [solo.id]: 0 },
        });
        naviguer('fin-partie.html');
        return;
      }
      finishManche1(PLAYERS);
      naviguer('fin-manche1.html');
    }
  
    /* ── Init ── */
    const q = QS[0];
    document.getElementById('q-cat').textContent  = q.cat;
    document.getElementById('q-text').textContent = q.q;
    requestAnimationFrame(() => fitTextToBox(document.getElementById('q-text'), { container: document.getElementById('q-card'), min: 18, padding: 22 }));
    for (let i = 0; i < 4; i++) document.getElementById('at' + i).textContent = q.opts[i];
  
    buildDots();
    buildScores();
    updateBuzzStatus();
  
    timer = createTimer(document.getElementById('timer-wrap'), {
      duration: 20, urgentAt: 5,
      onEnd: timeUp,
    });
    timer.start();
  
    // Clavier support pour les réponses
    document.querySelectorAll('.ans-btn').forEach((b, i) => {
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') window.answer(i); });
    });
    document.getElementById('buzzer').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') window.pressBuzzer();
    });
  
    const keydownHandler = e => {
      if (isSolo || answered || answersRevealed) return;
      const key = normalizeBuzzKey(e);
      if (!key) return;
      const player = PLAYERS.find(p => String(p.buzzKey || '').toUpperCase() === key);
      if (!player) return;
      e.preventDefault();
      buzzForPlayer(player.id);
    };
    document.addEventListener('keydown', keydownHandler);
    _ajouterNettoyage(() => document.removeEventListener('keydown', keydownHandler));
    _ajouterNettoyage(() => { if (timer) { timer.stop(); timer = null; } });
}

export function cleanup() {
  _nettoyages.forEach(fn => { try { fn(); } catch (e) {} });
  _nettoyages = [];
}
