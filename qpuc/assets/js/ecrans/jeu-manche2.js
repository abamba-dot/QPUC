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

let _nettoyages = [];
function _ajouterNettoyage(fn) { if (typeof fn === 'function') _nettoyages.push(fn); }

export const titre = 'Jeu Manche 2 — CHAMPION.';

export const html = `
<div class="page jeu-m2-page" id="page">
  <style>
    .jeu-m2-page{
      --m2-panel:rgba(255,253,248,.23);
      --m2-panel-strong:rgba(255,253,248,.32);
      --m2-border:rgba(255,255,255,.34);
      width:100vw!important;
      min-height:100dvh!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr);
      grid-template-rows:auto auto minmax(210px,auto) auto auto auto;
      align-content:center!important;
      justify-items:center!important;
      gap:clamp(12px,1.9vh,22px)!important;
      padding:clamp(22px,4vw,52px)!important;
      overflow:hidden!important;
    }
    .jeu-m2-page .game-header,
    .jeu-m2-page .passage-strip,
    .jeu-m2-page .q-card,
    .jeu-m2-page .answers-grid,
    .jeu-m2-page .serie-card,
    .jeu-m2-page .sim-btns{
      width:min(100%,1080px)!important;
    }
    .jeu-m2-page .game-header{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:18px;
      margin:0!important;
    }
    .jeu-m2-page .game-title{
      font-size:clamp(32px,4vw,56px);
      line-height:.95;
      letter-spacing:0;
    }
    .jeu-m2-page .passage-strip{
      min-height:76px;
      padding:14px 18px;
      border-radius:22px;
      background:linear-gradient(135deg,var(--m2-panel-strong),rgba(255,255,255,.14));
      border:1px solid var(--m2-border);
      box-shadow:0 18px 42px rgba(34,24,68,.18),inset 0 1px 0 rgba(255,255,255,.3);
      backdrop-filter:blur(8px);
    }
    .jeu-m2-page #passage-avatar{
      width:56px;
      height:56px;
      box-shadow:0 10px 24px rgba(0,0,0,.18);
      border:2px solid rgba(255,255,255,.48);
    }
    .jeu-m2-page .passage-strip__label{
      color:rgba(255,255,255,.76);
      font-size:11px;
    }
    .jeu-m2-page .passage-strip__name{
      font-size:clamp(28px,3.2vw,42px);
      line-height:1;
    }
    .jeu-m2-page .q-card{
      min-height:clamp(210px,31vh,320px);
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:14px;
      padding:clamp(34px,5vw,64px);
      border-radius:26px;
      background:linear-gradient(145deg,rgba(255,253,248,.22),rgba(255,255,255,.1));
      border:1px solid var(--m2-border);
      box-shadow:0 24px 56px rgba(34,24,68,.22),inset 0 1px 0 rgba(255,255,255,.32);
      backdrop-filter:blur(10px);
      text-align:center;
      overflow:hidden;
    }
    .jeu-m2-page .q-theme{
      color:rgba(255,255,255,.78);
      font-size:clamp(10px,1vw,12px);
      letter-spacing:.22em;
    }
    .jeu-m2-page .q-text{
      max-width:900px;
      font-size:clamp(30px,4.4vw,58px);
      line-height:1.08;
      text-wrap:balance;
    }
    .jeu-m2-page .answers-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:clamp(10px,1.4vw,16px);
      margin:0!important;
    }
    .jeu-m2-page .ans-btn{
      min-height:78px;
      border-radius:18px;
      background:rgba(255,253,248,.18);
      border:1px solid rgba(255,255,255,.3);
      box-shadow:0 12px 28px rgba(34,24,68,.14);
      color:#fff;
      backdrop-filter:blur(7px);
    }
    .jeu-m2-page .ans-letter{
      background:rgba(255,255,255,.22);
      color:#fff;
    }
    .jeu-m2-page .ans-text{
      font-size:clamp(15px,1.5vw,18px);
      color:#fff;
    }
    .jeu-m2-page .serie-card{
      padding:12px 16px;
      margin:0!important;
      border-radius:999px;
      background:rgba(255,253,248,.22);
      border:1px solid rgba(255,255,255,.28);
      box-shadow:0 12px 28px rgba(34,24,68,.14);
    }
    .jeu-m2-page .serie-cases{
      display:none;
    }
    .jeu-m2-page .sim-btns{
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr);
      gap:12px;
      margin:0!important;
    }
    .jeu-m2-page .sim-btns button{
      min-height:56px;
    }
    @media(max-width:760px){
      .jeu-m2-page{
        overflow-y:auto!important;
        align-content:start!important;
      }
      .jeu-m2-page .game-header{
        align-items:center;
      }
      .jeu-m2-page .answers-grid,
      .jeu-m2-page .sim-btns{
        grid-template-columns:1fr;
      }
      .jeu-m2-page .q-card{
        min-height:auto;
      }
    }
  </style>
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
      if (!ecranActif) return;
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
      if (ok) players[currentPlayerIndex].score = (players[currentPlayerIndex].score || 0) + 2;
      const _tid = setTimeout(nextQuestion, ok ? 850 : 1300);
      _ajouterNettoyage(() => clearTimeout(_tid));
    };
  
    window.passQuestion = function() {
      if (answered) return;
      answered = true;
      timer && timer.pause();
      updateSerie(Math.max(0, serie - 1));
      const _tid = setTimeout(nextQuestion, 450);
      _ajouterNettoyage(() => clearTimeout(_tid));
    };
  
    window.finishCurrentPlayer = finishCurrentPlayer;
    function finishCurrentPlayer() {
      if (!ecranActif) return;
      timer && timer.stop();
      players[currentPlayerIndex].serie = serie;
      players[currentPlayerIndex].score = players[currentPlayerIndex].score || 0;
  
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

    const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
    const keydownHandler = e => {
      if (answered || e.ctrlKey || e.altKey || e.metaKey) return;
      const mapped = keyMap[e.key.toLowerCase()];
      if (mapped !== undefined) { e.preventDefault(); window.answer(mapped); }
    };
    document.addEventListener('keydown', keydownHandler);
    _ajouterNettoyage(() => document.removeEventListener('keydown', keydownHandler));
    _ajouterNettoyage(() => { if (timer) { timer.stop(); timer = null; } });
}

export function cleanup() {
  _nettoyages.forEach(fn => { try { fn(); } catch (e) {} });
  _nettoyages = [];
}
