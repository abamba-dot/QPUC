/* ════════════════════════════════════════════════
   Écran : jeu-manche3
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, finishGame, DEMO } from '../state.js';
import { loadQuestions } from '../questions-service.js';
import { createTimer } from '../timer.js';
import { bindThemeDots } from '../utils.js';
import { playCorrect, playWrong, playBtn } from '../sound.js';

export const titre = 'Face à Face — Manche 3';

export const html = `
<div class="page jeu-m3-page" id="page">
  <div class="theme-dots" style="top:14px;right:14px;bottom:auto">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <!-- En-tête manche -->
  <div style="text-align:center;padding:10px 0 14px">
    <div class="badge badge--glass marge-auto">Manche 3 · Face à Face</div>
  </div>

  <!-- Duel layout -->
  <div class="duel-layout">
    <!-- Joueur gauche -->
    <div class="card duel-player">
      <span class="avatar" id="avatar-left" style="background:#3DC87A">FZ</span>
      <div class="player-name taille-15" id="name-left">Fatima Z.</div>
      <div class="duel-score" id="score-left">0</div>
      <div class="duel-target">/ 3 pts</div>
    </div>

    <!-- Centre : question et indices -->
    <div class="duel-center">
      <div class="duel-question card">
        <div class="q-theme" id="duel-theme">Finale</div>
        <div class="duel-question__text" id="duel-question">Question finale</div>
        <div class="duel-status" id="duel-status">Choisis le finaliste qui répond</div>
      </div>
      <div class="hint-list" id="hint-list" data-active="0">
        <div class="hint-row active"><span>Indice 1 (3 pts)</span><span class="hint-points">3</span></div>
        <div class="hint-row"><span>Indice 2 (2 pts)</span><span class="hint-points">2</span></div>
        <div class="hint-row"><span>Indice 3 (1 pt)</span><span class="hint-points">1</span></div>
      </div>
      <div class="duel-answers" id="duel-answers">
        <button class="duel-answer" id="da0" data-onclick="answerDuel(0)"><span>A</span><strong id="dat0">Réponse A</strong></button>
        <button class="duel-answer" id="da1" data-onclick="answerDuel(1)"><span>B</span><strong id="dat1">Réponse B</strong></button>
        <button class="duel-answer" id="da2" data-onclick="answerDuel(2)"><span>C</span><strong id="dat2">Réponse C</strong></button>
        <button class="duel-answer" id="da3" data-onclick="answerDuel(3)"><span>D</span><strong id="dat3">Réponse D</strong></button>
      </div>
      <div class="timer-ring" id="timer-wrap" style="width:62px;height:62px;margin:auto">
        <svg viewBox="0 0 62 62">
          <circle cx="31" cy="31" r="25" fill="none" stroke="var(--glass)" stroke-width="5"/>
          <circle cx="31" cy="31" r="25" fill="none" stroke="var(--manche3-color)" stroke-width="5"
            stroke-linecap="round" transform="rotate(-90 31 31)" stroke-dasharray="157"
            data-timer-ring style="stroke-dashoffset:0"/>
          <circle cx="31" cy="31" r="20" fill="var(--card-bg)"/>
        </svg>
        <span class="timer-ring__value" data-timer-value>30</span>
      </div>
    </div>

    <!-- Joueur droite -->
    <div class="card duel-player">
      <span class="avatar" id="avatar-right" style="background:#9B8EC7">AK</span>
      <div class="player-name taille-15" id="name-right">Amara K.</div>
      <div class="duel-score" id="score-right">0</div>
      <div class="duel-target">/ 3 pts</div>
    </div>
  </div>

  <!-- Commandes duel -->
  <div class="duel-btn-row">
    <button class="btn-secondary flex-1" data-onclick="selectResponder('left')" id="btn-left">Gauche répond</button>
    <button class="btn-secondary flex-1" data-onclick="nextHint()" id="btn-hint">Indice suivant</button>
    <button class="btn-secondary flex-1" data-onclick="selectResponder('right')" id="btn-right">Droite répond</button>
  </div>

  </div>



`;

export async function init(conteneur) {
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
    const finalists = state.rounds?.m2?.results?.length
      ? state.rounds.m2.results.filter(p => p.qualified).slice(0, 2)
      : state.rounds?.m1?.results?.length
        ? state.rounds.m1.results.filter(p => p.qualified).slice(0, 2)
        : state.players?.length >= 2
          ? state.players.filter(p => !(state.eliminated || []).includes(p.id)).slice(0, 2)
          : DEMO.M2_RESULTS.filter(p => p.qualified).slice(0, 2);
    const COLORS = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
    const questions = await loadQuestions({
      category: state.config?.category,
      difficulty: state.config?.difficulty,
      limit: 12,
      fallback: DEMO.QUESTIONS,
    });
    let activeHint = 0, scoreL = 0, scoreR = 0, qIndex = 0, responder = null, answered = false, timer = null;
  
    function hydratePlayers() {
      const [left, right] = finalists;
      if (!left || !right) return;
      document.getElementById('name-left').textContent = left.name;
      document.getElementById('name-right').textContent = right.name;
      document.getElementById('avatar-left').textContent = left.init || left.name.slice(0, 2).toUpperCase();
      document.getElementById('avatar-right').textContent = right.init || right.name.slice(0, 2).toUpperCase();
      document.getElementById('avatar-left').style.background = COLORS[(left.colorIdx ?? 0) % COLORS.length];
      document.getElementById('avatar-right').style.background = COLORS[(right.colorIdx ?? 1) % COLORS.length];
      document.getElementById('btn-left').textContent = `${left.name.split(' ')[0]} répond`;
      document.getElementById('btn-right').textContent = `${right.name.split(' ')[0]} répond`;
    }
  
    function updateHints() {
      document.querySelectorAll('.hint-row').forEach((row, i) => {
        row.classList.toggle('active', i === activeHint);
        row.style.opacity = i <= activeHint ? '1' : '.42';
      });
      document.getElementById('btn-hint').disabled = activeHint >= 2 || answered;
    }
  
    function currentQuestion() {
      return questions[qIndex % questions.length];
    }
  
    function renderQuestion() {
      answered = false;
      responder = null;
      activeHint = 0;
      updateHints();
      document.querySelectorAll('.duel-player').forEach(card => card.classList.remove('duel-player--active'));
      document.getElementById('duel-status').textContent = 'Choisis le finaliste qui répond';
      const q = currentQuestion();
      document.getElementById('duel-theme').textContent = q.cat;
      document.getElementById('duel-question').textContent = q.q;
      for (let i = 0; i < 4; i++) {
        const btn = document.getElementById('da' + i);
        btn.className = 'duel-answer';
        btn.disabled = false;
        document.getElementById('dat' + i).textContent = q.opts[i] || '-';
      }
      timer && timer.stop();
      timer = createTimer(document.getElementById('timer-wrap'), {
        duration: 30,
        urgentAt: 6,
        onEnd: () => nextHint(),
      });
      timer.start();
    }
  
    window.selectResponder = function(side) {
      if (answered) return;
      responder = side;
      const player = side === 'left' ? finalists[0] : finalists[1];
      document.querySelectorAll('.duel-player').forEach(card => card.classList.remove('duel-player--active'));
      document.querySelector(side === 'left' ? '.duel-player:first-child' : '.duel-player:last-child')?.classList.add('duel-player--active');
      document.getElementById('duel-status').textContent = `${player?.name || 'Finaliste'} répond pour ${3 - activeHint} point${activeHint < 2 ? 's' : ''}`;
    };
  
    window.nextHint = function() {
      if (answered) return;
      playBtn();
      activeHint = Math.min(2, activeHint + 1);
      updateHints();
      const label = responder ? `${responder === 'left' ? finalists[0]?.name : finalists[1]?.name} répond` : 'Choisis le finaliste qui répond';
      document.getElementById('duel-status').textContent = `${label} · ${3 - activeHint} point${activeHint < 2 ? 's' : ''}`;
    };
  
    window.answerDuel = function(idx) {
      if (answered || !responder) return;
      answered = true;
      timer && timer.pause();
      const q = currentQuestion();
      const ok = idx === q.c;
      const pts = 3 - activeHint;
      if (ok) playCorrect();
      else playWrong();
      document.querySelectorAll('.duel-answer').forEach(btn => { btn.disabled = true; btn.classList.add('duel-answer--disabled'); });
      document.getElementById('da' + idx).classList.add(ok ? 'duel-answer--correct' : 'duel-answer--wrong');
      document.getElementById('da' + q.c).classList.add('duel-answer--correct');
      if (ok && responder === 'left') {
        scoreL += pts;
        document.getElementById('score-left').textContent = scoreL;
      }
      if (ok && responder === 'right') {
        scoreR += pts;
        document.getElementById('score-right').textContent = scoreR;
      }
      document.getElementById('duel-status').textContent = ok ? `+${pts} points` : `Réponse correcte : ${q.opts[q.c]}`;
  
      const gameOver = scoreL >= 3 || scoreR >= 3;
  
      // Sauvegarde les données pour l'écran Révélation
      try {
        sessionStorage.setItem('champ_revelation', JSON.stringify({
          question:    q.q,
          answer:      q.opts[q.c],
          scorerName:  ok ? (responder === 'left' ? finalists[0]?.name : finalists[1]?.name) : null,
          pts:         ok ? pts : 0,
          correct:     ok,
          scoreL,
          scoreR,
          nameL:   finalists[0]?.name  || 'Finaliste 1',
          nameR:   finalists[1]?.name  || 'Finaliste 2',
          initL:   finalists[0]?.init  || '?',
          initR:   finalists[1]?.init  || '?',
          colorL:  finalists[0]?.colorIdx ?? 0,
          colorR:  finalists[1]?.colorIdx ?? 1,
          gameOver,
          nextQIndex: gameOver ? qIndex : qIndex + 1,
        }));
      } catch(e) {}
  
      if (gameOver) {
        setTimeout(finishDuel, 1100);
      } else {
        qIndex++;
        setTimeout(renderQuestion, 1300);
      }
    };
  
    function finishDuel() {
      const winner = scoreL >= scoreR ? finalists[0] : finalists[1];
      finishGame({
        finalists,
        winnerId: winner?.id,
        duelScores: {
          [finalists[0]?.id]: scoreL,
          [finalists[1]?.id]: scoreR,
        },
      });
      naviguer('podium.html');
    }
  
    hydratePlayers();
    renderQuestion();
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
