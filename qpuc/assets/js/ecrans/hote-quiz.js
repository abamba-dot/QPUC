/* ════════════════════════════════════════════════
   Écran : hote-quiz
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import * as Utils from '../utils.js';
import { ROOM, avatarColor } from '../multiplayer-data.js';
import { loadQuestions } from '../questions-service.js';
import { connectRealtime } from '../realtime-client.js';
import { playBuzzer, playBtn } from '../sound.js';
import { getQuestionIllustration, resolveQuestionIllustration } from '../illustrations.js';

const { bindThemeDots, esc } = Utils;
const fitTextToBox = Utils.fitTextToBox || (() => {});

export const titre = 'Hôte · Quiz animé — CHAMPION.';

let nettoyages = [];

function ajouterNettoyage(fn) {
  if (typeof fn === 'function') nettoyages.push(fn);
}

export const html = `
<a href="#main-content" class="skip-link">Passer au contenu principal</a>
  <div class="page host-page" id="main-content" data-screen-label="Écran hôte">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="host-topbar">
    <div>
      <div class="brand">CHAMPION</div>
      <div class="host-qmeta" style="margin-top:4px">Question <span id="qnum">1</span> / 10 · Culture</div>
    </div>
    <div class="host-answered">
      <div class="host-answered__dot"></div>
      <span id="answered">0</span>/<span id="total">4</span> ont répondu
    </div>
    <div class="host-timer-ring" id="timer-ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--glass-border)" stroke-width="7"/>
        <circle id="ring" cx="50" cy="50" r="44" fill="none" stroke="var(--accent-2)" stroke-width="7" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="0"/>
      </svg>
      <div class="host-timer-ring__val" id="timer">20</div>
    </div>
  </div>
  <div class="host-question">
    <div class="host-question__text" id="question">Chargement…</div>
  </div>
  <div class="host-buzz-wait" id="buzz-wait">
    <div class="host-buzz-wait__pulse"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg></div>
    <div class="host-buzz-wait__text" id="buzz-text">En attente du premier buzz…</div>
  </div>
  <div class="host-answers cache" id="answers">
    <div class="host-ans host-ans--a" data-i="0">
      <svg class="host-ans__shape" viewBox="0 0 40 40" fill="#fff"><path d="M20 4l16 30H4z"/></svg>
      <span class="host-ans__text">A</span><span class="host-ans__count" data-count="0"></span>
      <div class="host-ans__check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
    </div>
    <div class="host-ans host-ans--b" data-i="1">
      <svg class="host-ans__shape" viewBox="0 0 40 40" fill="#fff"><path d="M20 3l17 17-17 17L3 20z"/></svg>
      <span class="host-ans__text">B</span><span class="host-ans__count" data-count="0"></span>
      <div class="host-ans__check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
    </div>
    <div class="host-ans host-ans--c" data-i="2">
      <svg class="host-ans__shape" viewBox="0 0 40 40" fill="#fff"><circle cx="20" cy="20" r="17"/></svg>
      <span class="host-ans__text">C</span><span class="host-ans__count" data-count="0"></span>
      <div class="host-ans__check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
    </div>
    <div class="host-ans host-ans--d" data-i="3">
      <svg class="host-ans__shape" viewBox="0 0 40 40" fill="#fff"><rect x="5" y="5" width="30" height="30" rx="4"/></svg>
      <span class="host-ans__text">D</span><span class="host-ans__count" data-count="0"></span>
      <div class="host-ans__check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
    </div>
  </div>
  <section class="host-summary cache" id="host-summary">
    <article class="host-summary__fact">
      <div class="host-summary__media" id="host-fact-img" role="img" aria-label="Illustration"></div>
      <div class="host-summary__label">Le saviez-vous ?</div>
      <div class="host-summary__text" id="host-fact">La réponse vient d'être révélée.</div>
      <div class="host-summary__credit" id="host-fact-credit"></div>
    </article>
    <aside class="host-summary__rank">
      <div class="host-summary__rank-title">Classement provisoire</div>
      <div id="host-rank-list"></div>
    </aside>
  </section>
  <div class="host-controls">
    <div class="host-avatars" id="avatars"></div>
    <button class="btn-secondary" id="buzz-btn" data-onclick="triggerBuzz()">Ouvrir les réponses</button>
    <button class="btn-secondary cache" id="reveal-btn" data-onclick="reveal()">Révéler la réponse</button>
    <button class="btn-primary cache" id="next-btn" data-onclick="hostNextQuestion()">Question suivante →</button>
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
    function readJSON(key, fallback) {
      try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e) { return fallback; }
    }
  
    const roomConfig = readJSON('champ_room_config', ROOM.config);
    const storedPlayers = readJSON('champ_room_players', null);
    const players = (storedPlayers?.length ? storedPlayers : ROOM.players).filter(p => !p.host).slice(0, roomConfig.maxPlayers || 8);
    const totalQuestions = Number(roomConfig.nbQuestions) || 10;
    const questionIndex = Number(sessionStorage.getItem('champ_quiz_index') || 0);
    const roomCode = sessionStorage.getItem('champ_room_code') || ROOM.code;
    const currentPlayer = readJSON('champ_current_player', players[0]);
  
    const questions = await loadQuestions({ category: roomConfig.category, difficulty: roomConfig.difficulty, limit: totalQuestions });
    let currentQuestion = questions[questionIndex] || questions[0];
    let currentIndex = questionIndex, currentTotal = totalQuestions, CORRECT = currentQuestion.c;
    const answerLabels = ['.host-ans--a .host-ans__text', '.host-ans--b .host-ans__text', '.host-ans--c .host-ans__text', '.host-ans--d .host-ans__text'];
  
    function renderQuestion(question, index = currentIndex, total = currentTotal, category = roomConfig.category) {
      currentQuestion = question; currentIndex = index; currentTotal = total; CORRECT = question.c;
      document.querySelector('.host-qmeta').innerHTML = `Question <span id="qnum">${index + 1}</span> / ${total} · ${esc(category)}`;
      const questionEl = document.getElementById('question');
      questionEl.textContent = question.q;
      question.opts.forEach((opt, i) => { const el = document.querySelector(answerLabels[i]); if (el) el.textContent = opt; });
      requestAnimationFrame(() => fitTextToBox(questionEl, { container: document.querySelector('.host-question'), min: 24, padding: 8 }));
    }
    renderQuestion(currentQuestion);
    document.getElementById('total').textContent = players.length;
  
    const avatarsEl = document.getElementById('avatars');
    function renderHostAvatars(list) {
      avatarsEl.innerHTML = '';
      list.forEach((p, i) => {
        const av = document.createElement('div');
        av.className = 'host-mini-av'; av.dataset.id = p.id;
        av.style.background = avatarColor(p.color ?? p.colorIdx ?? i);
        av.textContent = p.init || p.name.slice(0, 2).toUpperCase();
        avatarsEl.appendChild(av);
      });
    }
    renderHostAvatars(players);
  
    let ecranActif = true;
    ajouterNettoyage(() => { ecranActif = false; });

    const onResize = () => {
      if (!ecranActif) return;
      fitTextToBox(document.getElementById('question'), { container: document.querySelector('.host-question'), min: 24, padding: 8 });
    };
    window.addEventListener('resize', onResize);
    ajouterNettoyage(() => window.removeEventListener('resize', onResize));
  
    let answered = 0, revealed = false, buzzed = false, realtime = null;
    let onlineRevealApplied = false, appliedQuizIndex = currentIndex, firstBuzz = null, onlineAnswerCount = 0;
    const R = 44, CIRC = 2 * Math.PI * R;
    const ring = document.getElementById('ring');
    ring.style.strokeDasharray = CIRC; ring.style.strokeDashoffset = 0;
    let t = 20;
    const timerEl = document.getElementById('timer');
    let timer = null, answerTimer = null;
    ajouterNettoyage(() => { clearInterval(timer); clearInterval(answerTimer); });
    const counts = [0, 0, 0, 0], picks = [];
  
    function resetQuestionUi() {
      onlineRevealApplied = false; revealed = false; buzzed = false; firstBuzz = null;
      answered = 0; counts.splice(0, 4, 0, 0, 0, 0); picks.splice(0);
      t = 20; clearInterval(timer); clearInterval(answerTimer);
      timerEl.textContent = t; timerEl.style.color = '';
      ring.style.stroke = 'var(--accent-2)'; ring.style.strokeDashoffset = 0;
      document.getElementById('answered').textContent = 0;
      document.getElementById('buzz-text').textContent = 'En attente du premier buzz…';
      document.getElementById('buzz-wait').style.display = 'flex';
      document.getElementById('buzz-wait').classList.remove('host-buzz-wait--hit');
      document.getElementById('answers').style.display = 'none';
      document.getElementById('host-summary').style.display = 'none';
      document.getElementById('buzz-btn').style.display = realtime ? 'none' : 'inline-flex';
      document.getElementById('reveal-btn').style.display = 'none';
      document.getElementById('next-btn').style.display = 'none';
      avatarsEl.querySelectorAll('.host-mini-av').forEach(a => a.classList.remove('host-mini-av--answered'));
      document.querySelectorAll('.host-ans').forEach(el => { el.classList.remove('host-ans--revealed','host-ans--correct','host-ans--dim'); const c = el.querySelector('.host-ans__count'); if (c) c.textContent = ''; });
    }
  
    function renderHostSummary(room, question) {
      document.getElementById('host-summary').style.display = 'grid';
      const illustration = getQuestionIllustration(question);
      const media = document.getElementById('host-fact-img');
      media.style.backgroundImage = `url("${illustration.url}")`; media.setAttribute('aria-label', illustration.alt);
      const credit = document.getElementById('host-fact-credit');
      credit.textContent = illustration.credit ? `Image : ${illustration.credit}` : ''; credit.style.display = illustration.credit ? 'block' : 'none';
      resolveQuestionIllustration(question).then(ri => { media.style.backgroundImage = `url("${ri.url}")`; media.setAttribute('aria-label', ri.alt); credit.textContent = ri.credit ? `Image : ${ri.credit}` : ''; credit.style.display = ri.credit ? 'block' : 'none'; });
      document.getElementById('host-fact').textContent = question.fact || `${question.opts?.[question.c] || 'La bonne réponse'} est la réponse correcte.`;
      const rank = document.getElementById('host-rank-list'); rank.innerHTML = '';
      [...(room.players || [])].filter(p => !p.host).sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((p, i) => {
        const row = document.createElement('div'); row.className = 'host-rank-row';
        row.innerHTML = `<span>${i + 1}</span><span class="avatar avatar--sm" style="background:${avatarColor(p.color ?? p.colorIdx ?? i)}">${esc(p.init || p.name.slice(0, 2).toUpperCase())}</span><span class="host-rank-row__name">${esc(p.name)}</span><span class="host-rank-row__score">${p.score || 0}</span>`;
        rank.appendChild(row);
      });
    }
  
    function applyOnlineRoom(room) {
      if (!ecranActif) return;
      if (!room?.quiz?.questions?.length) return;
      if (room.quiz.status === 'finished') { naviguer('podium.html'); return; }
      const quiz = room.quiz, question = quiz.questions[quiz.index];
      const gamePlayers = (room.players || []).filter(p => !p.host);
      const changedQuestion = appliedQuizIndex !== quiz.index;
      if (changedQuestion) resetQuestionUi();
      appliedQuizIndex = quiz.index;
      renderQuestion(question, quiz.index, quiz.questions.length, room.config?.category || roomConfig.category);
      renderHostAvatars(gamePlayers);
      document.getElementById('total').textContent = gamePlayers.length;
      const answerIds = Object.keys(quiz.answers || {});
      onlineAnswerCount = answerIds.length;
      document.getElementById('answered').textContent = answerIds.length;
      if (quiz.firstBuzz && !firstBuzz) { firstBuzz = quiz.firstBuzz; triggerBuzz(firstBuzz); }
      avatarsEl.querySelectorAll('.host-mini-av').forEach(av => { av.classList.toggle('host-mini-av--answered', answerIds.includes(av.dataset.id)); if (quiz.firstBuzz?.playerId === av.dataset.id) av.classList.add('host-mini-av--answered'); });
      if (buzzed && !quiz.revealed) document.getElementById('reveal-btn').style.display = 'inline-flex';
      if (quiz.revealed && !onlineRevealApplied) {
        playBtn(); onlineRevealApplied = true; clearInterval(timer); clearInterval(answerTimer); revealed = true; buzzed = true;
        document.getElementById('buzz-wait').style.display = 'none'; document.getElementById('answers').style.display = 'grid';
        counts.splice(0, 4, ...(quiz.counts || [0,0,0,0]));
        document.querySelectorAll('.host-ans').forEach((el, i) => { el.classList.add('host-ans--revealed'); const c = el.querySelector('.host-ans__count'); c.textContent = counts[i] || 0; el.classList.add(i === question.c ? 'host-ans--correct' : 'host-ans--dim'); });
        document.getElementById('buzz-btn').style.display = 'none'; document.getElementById('reveal-btn').style.display = 'none'; document.getElementById('next-btn').style.display = 'inline-flex';
        renderHostSummary(room, question);
      }
    }
  
    connectRealtime().then(async client => {
      if (!client || sessionStorage.getItem('champ_room_backend') !== 'online') return;
      realtime = client; document.getElementById('buzz-btn').style.display = 'none';
      ajouterNettoyage(realtime.onRoomUpdate(applyOnlineRoom));
      const join = await realtime.joinRoom({ code: roomCode, player: currentPlayer, hostToken: sessionStorage.getItem('champ_room_host_token') || undefined, playerToken: sessionStorage.getItem('champ_room_player_token') || undefined });
      if (join?.ok) {
        if (join.playerToken) sessionStorage.setItem('champ_room_player_token', join.playerToken);
        applyOnlineRoom(join.room);
        // Only start quiz if host AND no quiz running AND room not in intro phase (intro-multi handles that)
        const phase = join.room?.phase;
        if (currentPlayer?.host && !join.room?.quiz && phase !== 'intro') {
          const started = await realtime.startQuiz({ config: join.room?.config || roomConfig });
          if (started?.ok) applyOnlineRoom(started.room);
        }
      }
    }).catch(err => {
      console.warn('[hote-quiz] connectRealtime échouée:', err);
    });
  
    window.triggerBuzz = function(buzz = null) {
      if (buzzed) return; playBuzzer(); buzzed = true;
      const first = buzz ? (players.find(p => String(p.id) === String(buzz.playerId)) || buzz) : players[0];
      document.getElementById('buzz-text').textContent = `${first.name} a buzzé en premier !`;
      document.getElementById('buzz-wait').classList.add('host-buzz-wait--hit');
      avatarsEl.querySelector(`[data-id="${first.id || buzz?.playerId}"]`)?.classList.add('host-mini-av--answered');
      setTimeout(() => {
        document.getElementById('buzz-wait').style.display = 'none';
        const ans = document.getElementById('answers'); ans.style.display = 'grid'; ans.style.animation = 'slideUp .45s var(--ease-spring) both';
        document.getElementById('buzz-btn').style.display = 'none'; document.getElementById('reveal-btn').style.display = 'inline-flex';
        clearInterval(timer);
        if (realtime) {
          document.getElementById('answered').textContent = onlineAnswerCount;
        } else {
          answered = 0;
          document.getElementById('answered').textContent = 0;
        }
        timer = setInterval(() => { t--; timerEl.textContent = t; ring.style.strokeDashoffset = CIRC * (1 - t / 20); if (t <= 5) { ring.style.stroke = 'var(--color-error)'; timerEl.style.color = 'var(--color-error)'; } if (t <= 0) { clearInterval(timer); if (!revealed) window.reveal(); } }, 1000);
        if (realtime) return;
        answerTimer = setInterval(() => { if (answered >= players.length) { clearInterval(answerTimer); return; } const p = players[answered]; const pick = (answered === 0 ? CORRECT : (CORRECT + answered) % 4); picks[answered] = pick; counts[pick]++; answered++; document.getElementById('answered').textContent = answered; avatarsEl.querySelector(`[data-id="${p.id}"]`)?.classList.add('host-mini-av--answered'); }, 1200);
      }, 900);
    };
  
    window.reveal = async function() {
      if (revealed || !buzzed) return;
      if (realtime && !onlineRevealApplied) { const response = await realtime.reveal(); if (response?.ok) { applyOnlineRoom(response.room); return; } }
      revealed = true; playBtn(); clearInterval(timer); clearInterval(answerTimer);
      while (answered < players.length) { const p = players[answered]; const pick = (answered === 0 ? CORRECT : (CORRECT + answered) % 4); picks[answered] = pick; counts[pick]++; answered++; }
      document.getElementById('answered').textContent = answered;
      avatarsEl.querySelectorAll('.host-mini-av').forEach(a => a.classList.add('host-mini-av--answered'));
      document.querySelectorAll('.host-ans').forEach((el, i) => { el.classList.add('host-ans--revealed'); el.querySelector('.host-ans__count').textContent = counts[i]; el.classList.add(i === CORRECT ? 'host-ans--correct' : 'host-ans--dim'); });
      const nextScores = readJSON('champ_quiz_scores', {});
      players.forEach((p, i) => { const gain = picks[i] === CORRECT ? 2 : 0; nextScores[p.id] = (nextScores[p.id] || 0) + gain; });
      sessionStorage.setItem('champ_quiz_scores', JSON.stringify(nextScores));
      document.getElementById('reveal-btn').style.display = 'none'; document.getElementById('next-btn').style.display = 'inline-flex';
    };
  
    window.hostNextQuestion = async function() {
      if (realtime) { const response = await realtime.nextQuestion(); if (response?.ok && response.room) { applyOnlineRoom(response.room); return; } }
      const nextIndex = currentIndex + 1;
      if (nextIndex >= currentTotal) { naviguer('podium.html'); return; }
      sessionStorage.setItem('champ_quiz_index', String(nextIndex));
      naviguer('hote-quiz.html');
    };
  
    sessionStorage.setItem('champ_quiz_state', JSON.stringify({ index: questionIndex, total: totalQuestions, category: roomConfig.category, difficulty: roomConfig.difficulty, question: currentQuestion.q, opts: currentQuestion.opts, correct: CORRECT, revealed: false }));
}

export function cleanup() {
  nettoyages.forEach(fn => {
    try { fn(); } catch (e) {}
  });
  nettoyages = [];
}
