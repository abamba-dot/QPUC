/* ════════════════════════════════════════════════
   Écran : joueur-quiz
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, getInitials, esc } from '../utils.js';
import { ROOM, avatarColor } from '../multiplayer-data.js';
import { connectRealtime } from '../realtime-client.js';
import { playBuzzer, playCorrect, playWrong } from '../sound.js';
import { getQuestionIllustration } from '../illustrations.js';

export const titre = 'Joueur · Quiz animé — CHAMPION.';

let nettoyages = [];

function ajouterNettoyage(fn) {
  if (typeof fn === 'function') nettoyages.push(fn);
}

export const html = `
<div class="page player-page" id="page" data-screen-label="Écran joueur">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="player-topbar">
    <div class="player-name-chip">
      <div class="avatar avatar--sm" id="me-av" style="background:#4A7FB0">IM</div>
      <span id="me-name">Joueur</span>
    </div>
    <div class="player-score-chip" id="me-score">0 pts</div>
  </div>
  <div class="player-qhint" id="qhint">
    <div class="player-qhint__label">Question 1</div>
    <div class="player-qhint__text">Buzzez dès que vous avez la réponse</div>
  </div>
  <div class="player-buzz" id="buzz-zone">
    <div class="buzzer" id="buzzer" role="button" aria-label="Buzzer">
      <div class="buzzer__inner"><span class="buzzer__label">Buzz</span></div>
    </div>
    <div class="player-buzz__hint">Le plus rapide répond</div>
  </div>
  <div class="player-pads cache" id="pads">
    <button class="player-pad player-pad--a" data-i="0" aria-label="Réponse A">
      <svg class="player-pad__shape" viewBox="0 0 72 72" fill="#fff"><path d="M36 8l30 56H6z"/></svg>
      <span class="player-pad__text"></span>
    </button>
    <button class="player-pad player-pad--b" data-i="1" aria-label="Réponse B">
      <svg class="player-pad__shape" viewBox="0 0 72 72" fill="#fff"><path d="M36 5l31 31-31 31L5 36z"/></svg>
      <span class="player-pad__text"></span>
    </button>
    <button class="player-pad player-pad--c" data-i="2" aria-label="Réponse C">
      <svg class="player-pad__shape" viewBox="0 0 72 72" fill="#fff"><circle cx="36" cy="36" r="31"/></svg>
      <span class="player-pad__text"></span>
    </button>
    <button class="player-pad player-pad--d" data-i="3" aria-label="Réponse D">
      <svg class="player-pad__shape" viewBox="0 0 72 72" fill="#fff"><rect x="8" y="8" width="56" height="56" rx="7"/></svg>
      <span class="player-pad__text"></span>
    </button>
  </div>
  <div class="player-state cache" id="state"></div>
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
  
    const players = readJSON('champ_room_players', ROOM.players);
    const storedCurrentPlayer = readJSON('champ_current_player', null);
    const me = storedCurrentPlayer || players.find(p => !p.host) || players[0] || ROOM.players[1];
    const roomCode = sessionStorage.getItem('champ_room_code') || ROOM.code;
    const quizState = readJSON('champ_quiz_state', { index: 0, total: 10, question: 'Connexion…', opts: ['A','B','C','D'], correct: 0 });
    const scores = readJSON('champ_quiz_scores', {});
    const CORRECT = quizState.correct ?? 0;
    const SHAPES = { 0:'<path d="M36 8l30 56H6z"/>', 1:'<path d="M36 5l31 31-31 31L5 36z"/>', 2:'<circle cx="36" cy="36" r="31"/>', 3:'<rect x="8" y="8" width="56" height="56" rx="7"/>' };
    const COLORS = ['var(--quiz-a)','var(--quiz-b)','var(--quiz-c)','var(--quiz-d)'];
    const isClassicBuzzMode = (sessionStorage.getItem('champ_mp_mode') || 'classique') !== 'quiz';
  
    const pads = document.getElementById('pads');
    const stateEl = document.getElementById('state');
    const qhint  = document.getElementById('qhint');
    const buzzZone = document.getElementById('buzz-zone');
    let answered = false, buzzed = false, realtime = null;
    let onlineQuizState = quizState, selectedChoice = null;
    let appliedQuizIndex = quizState.index || 0;
  
    document.getElementById('me-av').style.background = avatarColor(me.color ?? me.colorIdx ?? 0);
    document.getElementById('me-av').textContent = me.init || getInitials(me.name);
    document.getElementById('me-name').textContent = me.name;
    document.getElementById('me-score').textContent = `${scores[me.id] || 0} pts`;
  
    function renderQuestionHint(state) {
      qhint.querySelector('.player-qhint__label').textContent = `Question ${(state.index || 0) + 1}`;
      qhint.querySelector('.player-qhint__text').textContent = state.question || 'Buzzez dès que vous avez la réponse';
      document.querySelectorAll('.player-pad').forEach((pad, i) => {
        const text = state.opts?.[i] || `Réponse ${String.fromCharCode(65 + i)}`;
        pad.setAttribute('aria-label', text);
        const label = pad.querySelector('.player-pad__text');
        if (label) label.textContent = text;
      });
    }
    renderQuestionHint(quizState);
  
    function resetPlayerUi() {
      answered = false; buzzed = false; selectedChoice = null;
      stateEl.style.display = 'none'; stateEl.classList.remove('player-state--summary'); stateEl.innerHTML = '';
      qhint.style.display = ''; buzzZone.style.display = 'flex'; pads.style.display = 'none';
      pads.classList.remove('player-pads--locked');
      document.getElementById('buzzer').classList.remove('buzzer--pressed');
      document.querySelectorAll('.player-pad').forEach(pad => pad.classList.remove('player-pad--chosen'));
    }
  
    function showWaiting(i) {
      qhint.style.display = ''; qhint.querySelector('.player-qhint__label').textContent = 'Réponse envoyée';
      qhint.querySelector('.player-qhint__text').textContent = onlineQuizState.question || quizState.question;
      pads.style.display = 'none'; stateEl.style.display = 'flex';
      stateEl.innerHTML = `<div class="player-state__icon player-state__icon--wait" style="background:${COLORS[i]}1f;color:${COLORS[i]}"><svg width="46" height="46" viewBox="0 0 72 72" fill="currentColor">${SHAPES[i]}</svg></div><div class="player-state__title">Réponse envoyée</div><div class="player-state__sub">En attente des autres joueurs…</div>`;
    }
  
    function showResult(i) {
      const activeState = onlineQuizState || quizState;
      const correctIndex = activeState.correct ?? CORRECT;
      const correct = i === correctIndex;
      const pts = correct ? 92 : 0;
      const currentScore = readJSON('champ_quiz_scores', {})[me.id] || 0;
      if (correct) {
        playCorrect();
        stateEl.innerHTML = `<div class="player-state__icon player-state__icon--correct"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div><div class="player-state__title">Bonne réponse !</div><div class="player-state__pts">+${pts}</div><div class="player-state__sub">Réponse envoyée</div>`;
        document.getElementById('me-score').textContent = (currentScore + pts) + ' pts';
      } else {
        playWrong();
        stateEl.innerHTML = `<div class="player-state__icon player-state__icon--wrong"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div><div class="player-state__title">Raté…</div><div class="player-state__sub">La bonne réponse était <b>${esc(activeState.opts?.[correctIndex] || 'la réponse correcte')}</b></div>`;
      }
      const btn = document.createElement('button');
      btn.className = 'btn-secondary'; btn.style.marginTop = '8px';
      btn.textContent = 'Voir le classement →'; btn.onclick = () => naviguer('classement.html');
      stateEl.appendChild(btn);
    }
  
    function showRoundSummary(choice) {
      const activeState = onlineQuizState || quizState;
      const correctIndex = activeState.correct ?? CORRECT;
      const isCorrect = Number.isInteger(choice) && choice === correctIndex;
      stateEl.style.display = 'flex'; stateEl.classList.add('player-state--summary');
      stateEl.innerHTML = `<div class="player-state__title">${isCorrect ? 'Bonne réponse !' : 'Réponse révélée'}</div><div class="player-state__sub">La bonne réponse était <b>${esc(activeState.opts?.[correctIndex] || 'la réponse correcte')}</b></div>`;
      if (!isCorrect && Number.isInteger(choice)) playWrong();
      const btn = document.createElement('button');
      btn.className = 'btn-secondary'; btn.style.marginTop = '8px';
      btn.textContent = 'Voir le classement →'; btn.onclick = () => naviguer('classement.html');
      stateEl.appendChild(btn);
    }
  
    function applyOnlineRoom(room) {
      if (!room?.quiz?.questions?.length) return;
      const quiz = room.quiz, question = quiz.questions[quiz.index];
      const changedQuestion = appliedQuizIndex !== quiz.index;
      if (changedQuestion) resetPlayerUi();
      appliedQuizIndex = quiz.index;
      onlineQuizState = { index: quiz.index, total: quiz.questions.length, question: question.q, opts: question.opts, correct: question.c, revealed: quiz.revealed, firstBuzz: quiz.firstBuzz, buzzes: quiz.buzzes || [], players: room.players, answers: quiz.answers };
      try {
        sessionStorage.setItem('champ_room_players', JSON.stringify(room.players));
        sessionStorage.setItem('champ_quiz_state', JSON.stringify(onlineQuizState));
        sessionStorage.setItem('champ_quiz_scores', JSON.stringify(Object.fromEntries((room.players || []).map(p => [p.id, p.score || 0]))));
      } catch(e) {}
      document.getElementById('me-score').textContent = `${(room.players.find(p => String(p.id) === String(me.id))?.score || 0)} pts`;
      renderQuestionHint(onlineQuizState);
      const myAnswer = quiz.answers?.[me.id];
      if (quiz.revealed) { showRoundSummary(selectedChoice); return; }
      if (Number.isInteger(myAnswer?.choice) && selectedChoice === null) { selectedChoice = myAnswer.choice; answered = true; showWaiting(selectedChoice); return; }
      // Show pads if the server confirms this player has buzzed but hasn't answered yet
      const hasBuzzed = (quiz.buzzes || []).some(b => String(b.playerId) === String(me?.id));
      if (hasBuzzed && !answered && pads.style.display === 'none') showPads();
    }
  
    function emitBuzz() {
      if (!realtime) return Promise.resolve({ ok: false });
      if (typeof realtime.buzz === 'function') return realtime.buzz();
      return Promise.resolve({ ok: false });
    }

    function normalizeKey(event) {
      if (event.key === ' ') return 'ESPACE';
      if (event.key === 'Enter') return 'ENTREE';
      if (event.key?.length === 1) return event.key.toUpperCase();
      return String(event.key || '').toUpperCase();
    }

    function isBuzzKey(event) {
      const key = normalizeKey(event);
      const configured = String(me?.buzzKey || '').toUpperCase();
      return key === 'ESPACE' || key === 'ENTREE' || key === 'B' || (configured && key === configured);
    }
  
    connectRealtime().then(async client => {
      if (!client || sessionStorage.getItem('champ_room_backend') !== 'online') return;
      realtime = client;
      ajouterNettoyage(realtime.onRoomUpdate(applyOnlineRoom));
      const joined = await realtime.joinRoom({
        code: roomCode,
        player: me,
        hostToken: me?.host ? sessionStorage.getItem('champ_room_host_token') || undefined : undefined,
        playerToken: !me?.host ? sessionStorage.getItem('champ_room_player_token') || undefined : undefined,
      });
      if (joined?.ok) {
        if (joined.playerToken && !joined.player?.host) sessionStorage.setItem('champ_room_player_token', joined.playerToken);
        else if (joined.player?.host) sessionStorage.removeItem('champ_room_player_token');
        applyOnlineRoom(joined.room);
      }
    }).catch(err => {
      console.warn('[joueur-quiz] connectRealtime échouée:', err);
    });
  
    function showPads() {
      buzzZone.style.display = 'none';
      qhint.querySelector('.player-qhint__label').textContent = 'À toi de jouer !';
      qhint.querySelector('.player-qhint__text').textContent = onlineQuizState.question || quizState.question;
      pads.style.display = 'grid'; pads.style.animation = 'slideUp .4s var(--ease-spring) both';
    }

    function handleBuzz() {
      if (buzzed) return; playBuzzer(); buzzed = true;
      document.getElementById('buzzer').classList.add('buzzer--pressed');
      if (realtime && isClassicBuzzMode) {
        qhint.querySelector('.player-qhint__label').textContent = 'Buzz envoyé…';
        qhint.querySelector('.player-qhint__text').textContent = onlineQuizState.question || quizState.question;
        emitBuzz().then(response => {
          if (response?.ok) {
            // Show pads so player can submit their answer after buzzing
            showPads();
            if (response.room) applyOnlineRoom(response.room);
          } else {
            buzzed = false;
            document.getElementById('buzzer').classList.remove('buzzer--pressed');
            qhint.querySelector('.player-qhint__label').textContent = 'Buzz refusé';
            qhint.querySelector('.player-qhint__text').textContent = response?.error || 'Réessaie.';
          }
        });
        return;
      }
      showPads();
    }

    document.getElementById('buzzer').addEventListener('click', handleBuzz);

    const buzzKeyHandler = event => {
      if (!isBuzzKey(event)) return;
      if (event.target?.closest?.('button, input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      handleBuzz();
    };
    document.addEventListener('keydown', buzzKeyHandler);
    ajouterNettoyage(() => document.removeEventListener('keydown', buzzKeyHandler));
  
    pads.addEventListener('click', (e) => {
      const pad = e.target.closest('.player-pad');
      if (!pad || answered) return;
      answered = true; const i = +pad.dataset.i;
      const answers = readJSON('champ_quiz_answers', {}); answers[me.id] = i;
      sessionStorage.setItem('champ_quiz_answers', JSON.stringify(answers));
      selectedChoice = i; realtime?.answer?.(i);
      pad.classList.add('player-pad--chosen'); pads.classList.add('player-pads--locked');
      showWaiting(i);
      if (!realtime) setTimeout(() => showResult(i), 1700);
    });
}

export function cleanup() {
  nettoyages.forEach(fn => {
    try { fn(); } catch (e) {}
  });
  nettoyages = [];
}
