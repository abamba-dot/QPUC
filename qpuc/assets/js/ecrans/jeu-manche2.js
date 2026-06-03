/* ════════════════════════════════════════════════
   Écran : jeu-manche2
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, finishManche2, DEMO } from '../state.js';
import { loadQuestions } from '../questions-service.js';
import { createTimer } from '../timer.js';
import * as Utils from '../utils.js';
import { playCorrect, playWrong } from '../sound.js';

const { bindThemeDots } = Utils;
const fitTextToBox = Utils.fitTextToBox || (() => {});

export const titre = 'Jeu Manche 2 — CHAMPION.';

export const html = `
<div class="page jeu-m2-page" id="page">
  <div class="theme-dots" style="top:14px;right:14px;bottom:auto">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <!-- Header jeu -->
  <div class="game-header">
    <div class="game-title-block">
      <div class="game-sub"><span>Manche 2</span> · 4 à la Suite</div>
      <h1 class="game-title">Passage joueur</h1>
    </div>
    <div class="timer-ring" id="timer-wrap" style="width:68px;height:68px">
      <svg viewBox="0 0 68 68">
        <circle cx="34" cy="34" r="27" fill="none" stroke="var(--glass)" stroke-width="5"/>
        <circle cx="34" cy="34" r="27" fill="none" stroke="var(--manche2-color)" stroke-width="5"
          stroke-linecap="round" transform="rotate(-90 34 34)" stroke-dasharray="170"
          data-timer-ring style="stroke-dashoffset:0"/>
        <circle cx="34" cy="34" r="22" fill="var(--card-bg)"/>
      </svg>
      <span class="timer-ring__value" data-timer-value id="timer-val">40</span>
    </div>
  </div>

  <div class="passage-strip" id="passage-strip">
    <span class="avatar" id="passage-avatar">FZ</span>
    <div class="passage-strip__body">
      <div class="passage-strip__label" id="passage-label">Passage 1 / 3</div>
      <div class="passage-strip__name" id="current-player">Fatima Z.</div>
    </div>
    <span class="badge badge--glass" id="passage-status">À toi</span>
  </div>

  <!-- Question -->
  <div class="card q-card" id="q-card">
    <div class="q-theme" id="q-theme">Question fictive</div>
    <div class="q-text" id="q-text">Quel pays a remporté la Coupe du monde 2018 ?</div>
  </div>

  <!-- Réponses -->
  <div class="answers-grid marge-haut-8">
    <div class="ans-btn" id="a0" data-onclick="answer(0)" tabindex="0"><div class="ans-letter">A</div><span class="ans-text" id="at0">France</span></div>
    <div class="ans-btn" id="a1" data-onclick="answer(1)" tabindex="0"><div class="ans-letter">B</div><span class="ans-text" id="at1">Croatie</span></div>
    <div class="ans-btn" id="a2" data-onclick="answer(2)" tabindex="0"><div class="ans-letter">C</div><span class="ans-text" id="at2">Brésil</span></div>
    <div class="ans-btn" id="a3" data-onclick="answer(3)" tabindex="0"><div class="ans-letter">D</div><span class="ans-text" id="at3">Allemagne</span></div>
  </div>

  <!-- Série -->
  <div class="card serie-card marge-haut-8">
    <div class="serie-header">
      <span class="serie-label" id="serie-label">Série actuelle : 0 / 4</span>
      <span class="badge badge--glass">Objectif 4</span>
    </div>
    <div class="serie-cases" id="serie-cases">
      <div class="serie-case" style="animation-delay:.05s"><span class="serie-num">1</span><span class="serie-lbl">Rép. 1</span></div>
      <div class="serie-case" style="animation-delay:.12s"><span class="serie-num">2</span><span class="serie-lbl">Rép. 2</span></div>
      <div class="serie-case" style="animation-delay:.19s"><span class="serie-num">3</span><span class="serie-lbl">Rép. 3</span></div>
      <div class="serie-case" style="animation-delay:.26s"><span class="serie-num">4</span><span class="serie-lbl">Rép. 4</span></div>
    </div>
  </div>

  <!-- Sim boutons -->
  <div class="sim-btns">
    <button class="btn-secondary" data-onclick="passQuestion()">Passer</button>
    <button class="btn-primary"   data-onclick="finishCurrentPlayer()">Terminer le passage</button>
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
    const qualified = state.rounds?.m1?.results?.length
      ? state.rounds.m1.results.filter(p => p.qualified)
      : state.players.length
        ? state.players.slice(0, 3)
        : DEMO.M1_RESULTS.filter(p => p.qualified);
  
    const COLORS = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
    const players = qualified.map((p, i) => ({
      ...p,
      id: p.id ?? i + 1,
      serie: 0,
      score: p.score || 0,
    }));
    const PASS_LIMIT = 6;
    const questions = await loadQuestions({
      category: state.config?.category,
      difficulty: state.config?.difficulty,
      limit: Math.max(players.length * PASS_LIMIT, 12),
      fallback: DEMO.QUESTIONS,
    });
  
    let currentPlayerIndex = 0;
    let questionIndex = 0;
    let playerQuestionCount = 0;
    let serie = 0;
    let answered = false;
    let timer = null;
  
    function updateSerie(n) {
      serie = Math.max(0, Math.min(4, n));
      document.getElementById('serie-label').textContent = `Série actuelle : ${serie} / 4 · Question ${playerQuestionCount + 1}/${PASS_LIMIT}`;
      document.querySelectorAll('.serie-case').forEach((c, i) => {
        c.classList.toggle('active', i < serie);
        c.classList.remove('error');
      });
      const status = document.getElementById('passage-status');
      if (status) status.textContent = serie >= 4 ? 'Série complète' : 'À toi';
    }
  
    function currentQuestion() {
      return questions[questionIndex % questions.length];
    }
  
    function renderPlayer() {
      const p = players[currentPlayerIndex];
      document.getElementById('current-player').textContent = p.name;
      document.getElementById('passage-label').textContent = `Passage ${currentPlayerIndex + 1} / ${players.length}`;
      const avatar = document.getElementById('passage-avatar');
      avatar.textContent = p.init || p.name.slice(0, 2).toUpperCase();
      avatar.style.background = COLORS[(p.colorIdx ?? currentPlayerIndex) % COLORS.length];
    }
  
    function renderQuestion() {
      answered = false;
      updateSerie(serie);
      const q = currentQuestion();
      document.getElementById('q-theme').textContent = q.cat;
      const qText = document.getElementById('q-text');
      qText.textContent = q.q;
      requestAnimationFrame(() => fitTextToBox(qText, { container: document.getElementById('q-card'), min: 18, padding: 22 }));
      for (let i = 0; i < 4; i++) {
        const btn = document.getElementById('a' + i);
        btn.className = 'ans-btn';
        btn.style = '';
        document.getElementById('at' + i).textContent = q.opts[i];
      }
  
      timer && timer.stop();
      timer = createTimer(document.getElementById('timer-wrap'), {
        duration: 40,
        urgentAt: 8,
        onEnd: finishCurrentPlayer,
      });
      timer.start();
    }
  
    function nextQuestion() {
      questionIndex++;
      playerQuestionCount++;
      if (serie >= 4 || playerQuestionCount >= PASS_LIMIT) {
        setTimeout(finishCurrentPlayer, 650);
        return;
      }
      renderQuestion();
    }
  
    window.answer = function(idx) {
      if (answered) return;
      answered = true;
      timer && timer.pause();
  
      const q = currentQuestion();
      const ok = idx === q.c;
      for (let i = 0; i < 4; i++) document.getElementById('a' + i).classList.add('ans-btn--disabled');
  
      const chosen = document.getElementById('a' + idx);
      chosen.classList.add(ok ? 'ans-btn--correct' : 'ans-btn--wrong');
      if (!ok) document.getElementById('a' + q.c).classList.add('ans-btn--correct');
      if (ok) playCorrect();
      else playWrong();
  
      updateSerie(ok ? serie + 1 : 0);
      setTimeout(nextQuestion, ok ? 850 : 1300);
    };
  
    window.passQuestion = function() {
      if (answered) return;
      answered = true;
      timer && timer.pause();
      updateSerie(Math.max(0, serie - 1));
      setTimeout(nextQuestion, 450);
    };
  
    window.finishCurrentPlayer = finishCurrentPlayer;
    function finishCurrentPlayer() {
      timer && timer.stop();
      players[currentPlayerIndex].serie = serie;
      players[currentPlayerIndex].score = (players[currentPlayerIndex].score || 0) + serie;
  
      if (currentPlayerIndex + 1 >= players.length) {
        finishManche2(players);
        naviguer('fin-manche2.html');
        return;
      }
  
      currentPlayerIndex++;
      playerQuestionCount = 0;
      serie = 0;
      updateSerie(0);
      renderPlayer();
      renderQuestion();
    }
  
    renderPlayer();
    updateSerie(0);
    renderQuestion();
  
    document.querySelectorAll('.ans-btn').forEach((btn, i) => {
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.answer(i);
        }
      });
    });
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
