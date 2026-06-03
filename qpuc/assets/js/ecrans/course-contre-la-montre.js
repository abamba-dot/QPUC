/* ════════════════════════════════════════════════
   Écran : course-contre-la-montre
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, mergeState, finishGame, DEMO } from '../state.js';
import { loadQuestions } from '../questions-service.js';
import * as Utils from '../utils.js';
import { playCorrect, playWrong } from '../sound.js';

const { spawnScoreFloat, spawnParticles, bindThemeDots } = Utils;
const fitTextToBox = Utils.fitTextToBox || (() => {});

export const titre = 'Course contre la montre';

export const html = `
<div class="page solo-page" id="page">
  <header class="solo-topbar">
    <button class="solo-back" data-onclick="navigate('mode-local.html')" aria-label="Retour">
      <span aria-hidden="true">‹</span> Retour
    </button>
    <div class="solo-kicker">Course contre la montre</div>
    <div class="solo-timer" aria-live="polite">
      <span id="time-left">90</span>
      <small>sec</small>
    </div>
  </header>
  <main class="solo-stage">
    <section class="solo-score-card">
      <div class="avatar avatar--lg" id="solo-avatar">J1</div>
      <div>
        <div class="solo-player" id="solo-player">Joueur 1</div>
        <div class="solo-meta" id="solo-meta">Question 1 / 10</div>
      </div>
      <div class="solo-score">
        <span id="score">0</span>
        <small>pts</small>
      </div>
    </section>
    <section class="solo-question-card" id="question-card">
      <div class="q-category" id="q-cat">Culture générale · Moyen</div>
      <h1 class="solo-question" id="q-text">Chargement de la question...</h1>
      <div class="solo-progress">
        <div class="solo-progress__fill" id="solo-progress"></div>
      </div>
    </section>
    <section class="solo-answers" id="answers" aria-label="Réponses">
      <button class="solo-answer" id="a0" data-onclick="answer(0)"><span>A</span><strong id="at0">Réponse A</strong></button>
      <button class="solo-answer" id="a1" data-onclick="answer(1)"><span>B</span><strong id="at1">Réponse B</strong></button>
      <button class="solo-answer" id="a2" data-onclick="answer(2)"><span>C</span><strong id="at2">Réponse C</strong></button>
      <button class="solo-answer" id="a3" data-onclick="answer(3)"><span>D</span><strong id="at3">Réponse D</strong></button>
    </section>
    <div class="solo-status" id="status">Réponds vite, mais proprement.</div>
  </main>
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
    const config = state.config || {};
    const player = (state.players?.[0] || { id: 1, name: 'Joueur 1', init: 'J1', colorIdx: 0, score: 0 });
    const colors = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
    const total = Math.max(1, Number(config.nbQuestions) || 10);
    const duration = Math.min(180, Math.max(60, total * 12));
    const questions = await loadQuestions({
      category: config.category,
      difficulty: config.difficulty,
      limit: total,
      fallback: DEMO.QUESTIONS,
    });
  
    let index = 0, score = 0, streak = 0, bestStreak = 0;
    let answeredCount = 0, correctCount = 0, answered = false;
    let remaining = duration, timerId = null, ended = false;
  
    const timeEl = document.getElementById('time-left');
    const scoreEl = document.getElementById('score');
    const statusEl = document.getElementById('status');
  
    document.getElementById('solo-avatar').textContent = player.init || player.name.slice(0, 2).toUpperCase();
    document.getElementById('solo-avatar').style.background = colors[(player.colorIdx ?? 0) % colors.length];
    document.getElementById('solo-player').textContent = player.name;
    timeEl.textContent = remaining;
  
    function updateMeta() {
      document.getElementById('solo-meta').textContent = `Question ${index + 1} / ${Math.min(total, questions.length)} · Série ${streak}`;
      document.getElementById('solo-progress').style.width = `${Math.round(index / Math.min(total, questions.length) * 100)}%`;
    }
  
    function renderQuestion() {
      const q = questions[index];
      answered = false;
      document.getElementById('q-cat').textContent = q.cat;
      const questionText = document.getElementById('q-text');
      questionText.textContent = q.q;
      for (let i = 0; i < 4; i++) {
        const btn = document.getElementById('a' + i);
        btn.disabled = false;
        btn.className = 'solo-answer';
        document.getElementById('at' + i).textContent = q.opts[i];
      }
      updateMeta();
      const card = document.getElementById('question-card');
      requestAnimationFrame(() => fitTextToBox(questionText, { container: card, min: 22, padding: 28 }));
      card.style.animation = 'none';
      void card.offsetWidth;
      card.style.animation = 'slideUp .36s var(--ease-out) both';
    }
  
    const onResize = () => fitTextToBox(document.getElementById('q-text'), { container: document.getElementById('question-card'), min: 22, padding: 28 });
    window.addEventListener('resize', onResize);
  
    function nextQuestion() {
      index += 1;
      if (index >= total || index >= questions.length || remaining <= 0) { endSolo(); return; }
      renderQuestion();
    }
  
    window.answer = function(choice) {
      if (answered || remaining <= 0) return;
      answered = true;
      const q = questions[index];
      const ok = choice === q.c;
      answeredCount += 1;
      document.querySelectorAll('.solo-answer').forEach(btn => { btn.disabled = true; });
      const selected = document.getElementById('a' + choice);
      const correct  = document.getElementById('a' + q.c);
      selected.classList.add(ok ? 'solo-answer--correct' : 'solo-answer--wrong');
      correct.classList.add('solo-answer--correct');
      if (ok) {
        playCorrect();
        streak += 1; correctCount += 1;
        bestStreak = Math.max(bestStreak, streak);
        const gain = 10 + Math.min(streak - 1, 4) * 2;
        score += gain; scoreEl.textContent = score;
        spawnScoreFloat(selected, `+${gain}`);
        spawnParticles(selected);
        statusEl.textContent = `Bonne réponse. Série ${streak}.`;
      } else {
        playWrong();
        streak = 0;
        statusEl.textContent = 'Raté. On enchaîne.';
      }
      setTimeout(nextQuestion, ok ? 760 : 1100);
    };
  
    function tick() {
      if (ended) return;
      remaining -= 1;
      timeEl.textContent = remaining;
      document.querySelector('.solo-timer')?.classList.toggle('solo-timer--urgent', remaining <= 10);
      if (remaining <= 0) { playWrong(); endSolo(); }
    }
  
    function endSolo() {
      if (ended) return;
      ended = true;
      clearInterval(timerId);
      const finalPlayer = { ...player, score: 0, streak: bestStreak, serie: bestStreak };
      finishGame({ finalists: [finalPlayer], winnerId: finalPlayer.id, duelScores: { [finalPlayer.id]: score } });
      const saved = getState();
      mergeState({ rounds: { ...(saved.rounds || {}), solo: { score, answered: answeredCount, correct: correctCount, total: Math.min(total, questions.length), bestStreak, finalStreak: streak, duration, remaining, category: config.category || 'Culture générale', difficulty: config.difficulty || 'Moyen' } } });
      naviguer('fin-partie.html');
    }
  
    document.querySelectorAll('.solo-answer').forEach((btn, i) => {
      btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.answer(i); } });
    });
  
    renderQuestion();
    timerId = setInterval(tick, 1000);
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
