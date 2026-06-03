/* ════════════════════════════════════════════════
   Écran : jeu-multi
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import * as Utils from '../utils.js';
import { avatarColor } from '../multiplayer-data.js';
import { connectRealtime } from '../realtime-client.js';
import { playBuzzer } from '../sound.js';

const { bindThemeDots, getInitials, esc } = Utils;
const fitTextToBox = Utils.fitTextToBox || (() => {});

export const titre = 'Partie multijoueur — CHAMPION.';

let nettoyages = [];

function ajouterNettoyage(fn) {
  if (typeof fn === 'function') nettoyages.push(fn);
}

export const html = `
<div class="page jeu-m1-page jeu-multi-page quiz-waiting" id="page" data-screen-label="Partie multijoueur">
  <style>
    .jeu-multi-page{--bg:#EFE4D2;--text:#1E160C;--sub:#6F5A41;--card-bg:rgba(255,253,248,.86);--card-border:rgba(255,255,255,.74);--accent-2:#B8482A;display:grid!important;width:100vw!important;min-height:100dvh!important;padding:clamp(20px,3.2vw,38px)!important;gap:clamp(16px,2.2vh,26px)!important;background:var(--bg)!important;overflow:hidden}
    .jeu-multi-page.quiz-waiting{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto minmax(220px,auto) auto minmax(72px,auto)!important;grid-template-areas:"topbar" "question" "buzzer" "scores"!important;align-content:center!important}
    .jeu-multi-page.quiz-answering{grid-template-columns:minmax(0,1.08fr) minmax(360px,.92fr)!important;grid-template-rows:auto minmax(0,1fr) minmax(72px,auto)!important;grid-template-areas:"topbar topbar" "question answers" "scores scores"!important;align-content:stretch!important}
    .jeu-multi-page .topbar{grid-area:topbar;width:min(100%,1500px);justify-self:center}
    .jeu-multi-page .q-section{grid-area:question;width:min(100%,1350px);justify-self:center;justify-content:center;min-height:0;padding:0}
    .jeu-multi-page .q-card{width:100%;min-height:clamp(230px,36vh,360px);padding:clamp(34px,6vh,76px) clamp(36px,7vw,112px);border-radius:24px;background:var(--card-bg);border:1.5px solid var(--card-border);box-shadow:0 18px 38px rgba(30,22,12,.14);text-align:center;align-items:center;overflow:hidden}
    .jeu-multi-page .q-text{max-width:980px;margin-inline:auto;font-size:clamp(34px,4.2vw,64px);line-height:1.12;color:var(--text);overflow-wrap:anywhere;hyphens:auto}
    .jeu-multi-page .q-category{color:var(--sub);font-size:clamp(12px,1.1vw,15px);margin-bottom:clamp(14px,2.2vh,26px)}
    .jeu-multi-page .buzzer-section{grid-area:buzzer;justify-self:center;align-self:center;padding:0;transform:none!important;z-index:5}
    .jeu-multi-page .buzzer{width:clamp(122px,12vw,156px);height:clamp(122px,12vw,156px)}
    .jeu-multi-page .answers-section{grid-area:answers;width:100%;min-height:0;justify-content:center;padding:0}
    .jeu-multi-page.quiz-waiting .answers-section{display:none!important}
    .jeu-multi-page .answers-grid{width:100%;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,1.4vw,18px)}
    .jeu-multi-page .scores-bar{grid-area:scores;width:min(100%,1500px);justify-self:center;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:clamp(8px,1vw,12px);padding:0}
    @media(max-width:899px){.jeu-multi-page,.jeu-multi-page.quiz-waiting,.jeu-multi-page.quiz-answering{display:flex!important;flex-direction:column;overflow-y:auto}.jeu-multi-page .q-card{min-height:auto;padding:24px 20px}.jeu-multi-page .q-text{font-size:clamp(24px,8vw,38px)}.jeu-multi-page .answers-grid{grid-template-columns:1fr}}
  </style>
  <div class="topbar">
    <div class="q-info">
      <span class="q-label">Question <span id="qnum">1</span> / <span id="qtotal">5</span></span>
      <div class="progress-dots" id="dots"></div>
    </div>
    <div class="streak-wrap">
      <div class="host-answered">
        <div class="host-answered__dot"></div>
        <span id="answered">0</span> / <span id="ptotal">0</span> ont répondu
      </div>
    </div>
    <div class="timer-ring" id="timer-ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--glass-border)" stroke-width="7"/>
        <circle id="ring" cx="50" cy="50" r="44" fill="none" stroke="var(--accent-2)" stroke-width="7" stroke-linecap="round" transform="rotate(-90 50 50)"/>
      </svg>
      <div class="timer-ring__value" id="timer">20</div>
    </div>
  </div>
  <section class="q-section">
    <article class="q-card">
      <div class="q-category" id="q-cat">Connexion</div>
      <h1 class="q-text" id="q-text">Chargement…</h1>
      <div class="q-progress"><div class="q-progress-fill largeur-100" id="q-fill"></div></div>
    </article>
  </section>
  <section class="buzzer-section" id="buzzer-section">
    <div class="buzzer" id="buzzer" role="button" aria-label="Buzzer">
      <div class="buzzer__inner"><span class="buzzer__label">Buzz</span></div>
    </div>
    <div class="player-buzz__hint" id="buzz-hint">Buzzez pour répondre</div>
  </section>
  <section class="answers-section answers-section--hidden" id="answers-section">
    <div class="answers-grid" id="answers"></div>
  </section>
  <section class="buzzer-section cache" id="wait-section">
    <div class="streak-badge"><div class="host-answered__dot"></div><span id="wait-text">En attente des autres joueurs…</span></div>
  </section>
  <div class="scores-bar" id="scores"></div>
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
    document.documentElement.dataset.theme = 'beige';
  
    const DEFAULT_DURATION = 20;
    const LETTERS = ['A','B','C','D'];
    const roomCode = sessionStorage.getItem('champ_room_code');
  
    function readJSON(key, fallback) {
      try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e) { return fallback; }
    }
  
    const me = readJSON('champ_current_player', null);
    let realtime = null, currentIndex = -1, currentRoom = null, selectedChoice = null, buzzed = false, timerId = null;
    let ecranActif = true;
    ajouterNettoyage(() => {
      ecranActif = false;
      clearInterval(timerId);
    });
  
    const answersSection = document.getElementById('answers-section');
    const buzzerSection = document.getElementById('buzzer-section');
    const waitSection = document.getElementById('wait-section');
    const answersEl = document.getElementById('answers');

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
  
    function persistRoom(room) { currentRoom = room; try { sessionStorage.setItem('champ_room_players', JSON.stringify(room.players || [])); sessionStorage.setItem('champ_last_room', JSON.stringify(room)); if (room.quiz?.revealed) sessionStorage.setItem('champ_last_revealed_room', JSON.stringify(room)); } catch(e) {} }
    function questionOf(room) { return room?.quiz?.questions?.[room.quiz.index] || null; }
  
    function renderProgress(index, total) {
      document.getElementById('qnum').textContent = index + 1; document.getElementById('qtotal').textContent = total;
      const dots = document.getElementById('dots'); dots.innerHTML = '';
      for (let i = 0; i < total; i++) { const dot = document.createElement('div'); dot.className = 'progress-dot' + (i < index ? ' progress-dot--done' : i === index ? ' progress-dot--current' : ''); dots.appendChild(dot); }
    }
  
    function buildScores(players = []) {
      const scores = document.getElementById('scores');
      const maxScore = Math.max(10, ...players.map(p => p.score || 0));
      scores.innerHTML = '';
      [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((p, i) => {
        const chip = document.createElement('div'); chip.className = 'score-chip' + (i === 0 ? ' score-chip--leader' : '');
        chip.innerHTML = `<div class="score-chip__top"><div class="avatar avatar--sm" style="background:${avatarColor(p.color ?? p.colorIdx ?? i)}">${esc(p.init || getInitials(p.name))}</div><span class="score-chip__name">${esc(p.name)}${String(p.id) === String(me?.id) ? ' · vous' : ''}</span><span class="score-chip__value">${p.score || 0}</span></div><div class="score-chip__bar-bg"><div class="score-chip__bar-fill" style="width:${((p.score || 0) / maxScore) * 100}%"></div></div>`;
        scores.appendChild(chip);
      });
    }
  
    function renderAnswers(question) {
      answersEl.innerHTML = '';
      (question.opts || []).forEach((answer, i) => {
        const btn = document.createElement('button'); btn.className = 'ans-btn'; btn.dataset.i = String(i);
        btn.innerHTML = `<div class="ans-letter">${LETTERS[i]}</div><div class="ans-text">${esc(answer)}</div><div class="ans-check">✓</div>`;
        answersEl.appendChild(btn);
      });
    }
  
    function resetForQuestion(room) {
      const page = document.getElementById('page');
      const buzzer = document.getElementById('buzzer');
      if (!page || !buzzer || !answersSection || !buzzerSection || !waitSection) return;
      selectedChoice = null; buzzed = false;
      page.classList.remove('quiz-answering'); page.classList.add('quiz-waiting');
      buzzer.classList.remove('buzzer--pressed');
      document.getElementById('buzz-hint').textContent = 'Buzzez pour répondre';
      buzzerSection.style.display = 'flex'; waitSection.style.display = 'none';
      answersSection.style.display = 'flex'; answersSection.classList.add('answers-section--hidden');
    }
  
    function revealAnswers() {
      const page = document.getElementById('page');
      if (!page || !answersSection || !buzzerSection || !waitSection) return;
      page.classList.remove('quiz-waiting'); page.classList.add('quiz-answering');
      buzzerSection.style.display = 'none'; waitSection.style.display = 'none';
      answersSection.style.display = 'flex'; answersSection.classList.remove('answers-section--hidden');
    }
  
    function showWaiting() {
      const page = document.getElementById('page');
      if (!page || !answersSection || !buzzerSection || !waitSection) return;
      page.classList.remove('quiz-answering'); page.classList.add('quiz-waiting');
      buzzerSection.style.display = 'none'; answersSection.style.display = 'none'; waitSection.style.display = 'flex';
      const count = Object.keys(currentRoom?.quiz?.answers || {}).length;
      const total = currentRoom?.config?.mode === 'quiz-multijoueur' ? (currentRoom?.players || []).filter(p => !p.host).length : (currentRoom?.players || []).length;
      document.getElementById('wait-text').textContent = `${count}/${total} joueurs ont répondu…`;
    }
  
    function startTimer(startedAt, duration = DEFAULT_DURATION) {
      clearInterval(timerId);
      const ring = document.getElementById('ring'), timer = document.getElementById('timer'), fill = document.getElementById('q-fill'), circ = 2 * Math.PI * 44;
      ring.style.strokeDasharray = circ;
      const tick = () => { const elapsed = Math.floor((Date.now() - startedAt) / 1000); const left = Math.max(0, duration - elapsed); timer.textContent = left; ring.style.strokeDashoffset = circ * (1 - left / duration); fill.style.width = `${(left / duration) * 100}%`; };
      tick(); timerId = setInterval(tick, 500);
    }
  
    function renderQuestion(room) {
      if (!ecranActif) return;
      const quiz = room.quiz, question = questionOf(room);
      if (!question || !quiz) return;
      const page = document.getElementById('page');
      if (!page) return;
      const isQuizAnimated = room.config?.mode === 'quiz-multijoueur';
      const gamePlayers = isQuizAnimated ? (room.players || []).filter(p => !p.host) : (room.players || []);
      page.classList.toggle('quiz-animated-player', isQuizAnimated);
      const changed = currentIndex !== quiz.index;
      if (changed) resetForQuestion(room);
      currentIndex = quiz.index;
      renderProgress(quiz.index, quiz.questions.length);
      document.getElementById('ptotal').textContent = gamePlayers.length;
      document.getElementById('answered').textContent = Object.keys(quiz.answers || {}).length;
      document.getElementById('q-cat').textContent = question.cat || 'Culture générale';
      const qText = document.getElementById('q-text'); qText.textContent = question.q || 'Question indisponible';
      renderAnswers(question); buildScores(gamePlayers);
      requestAnimationFrame(() => fitTextToBox(qText, { container: document.querySelector('.q-card'), min: 20, padding: 24 }));
      startTimer(quiz.startedAt || Date.now(), quiz.duration || DEFAULT_DURATION);
      const myAnswer = quiz.answers?.[me?.id];
      if (Number.isInteger(myAnswer?.choice) || selectedChoice !== null) showWaiting();
      else if ((quiz.buzzes || []).some(b => String(b.playerId) === String(me?.id)) || buzzed) revealAnswers();
    }
  
    function applyRoom(room) {
      if (!ecranActif) return;
      if (!room || room.code !== roomCode) return;
      persistRoom(room);
      if (room.quiz?.status === 'finished') { naviguer('podium.html'); return; }
      if (room.quiz?.revealed || room.quiz?.status === 'revealed') { if (room.config?.mode === 'quiz-multijoueur') { document.getElementById('wait-text').textContent = "Réponse révélée · en attente de l'hôte…"; buildScores((room.players || []).filter(p => !p.host)); } else naviguer('resume-question.html'); return; }
      if (room.quiz?.status === 'question') renderQuestion(room);
    }
  
    function emitBuzz() {
      if (!realtime) return Promise.resolve({ ok: false });
      if (typeof realtime.buzz === 'function') return realtime.buzz();
      return Promise.resolve({ ok: false });
    }
  
    const onResize = () => {
      if (!ecranActif) return;
      fitTextToBox(document.getElementById('q-text'), { container: document.querySelector('.q-card'), min: 20, padding: 24 });
    };
    window.addEventListener('resize', onResize);
    ajouterNettoyage(() => window.removeEventListener('resize', onResize));
  
    async function handleBuzz() {
      if (buzzed || selectedChoice !== null) return;
      playBuzzer(); buzzed = true;
      document.getElementById('buzzer').classList.add('buzzer--pressed');
      document.getElementById('buzz-hint').textContent = 'Buzz envoyé…';
      const response = await emitBuzz();
      if (response?.ok && response.room) {
        applyRoom(response.room);
        return;
      }
      buzzed = false;
      document.getElementById('buzzer').classList.remove('buzzer--pressed');
      document.getElementById('buzz-hint').textContent = response?.error || 'Buzz refusé · réessaie';
    }

    document.getElementById('buzzer').addEventListener('click', handleBuzz);

    const buzzKeyHandler = event => {
      if (!ecranActif || !isBuzzKey(event)) return;
      if (event.target?.closest?.('button, input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      handleBuzz();
    };
    document.addEventListener('keydown', buzzKeyHandler);
    ajouterNettoyage(() => document.removeEventListener('keydown', buzzKeyHandler));
  
    answersEl.addEventListener('click', async event => {
      const btn = event.target.closest('.ans-btn');
      if (!btn || selectedChoice !== null) return;
      selectedChoice = Number(btn.dataset.i); btn.classList.add('ans-btn--disabled');
      const response = await realtime?.answer?.(selectedChoice);
      if (response?.ok && response.room) applyRoom(response.room); else showWaiting();
    });
  
    if (!roomCode || !me) {
      naviguer('multijoueur.html');
    } else {
      connectRealtime().then(async client => {
        realtime = client;
        if (!realtime) { naviguer('multijoueur.html'); return; }
        ajouterNettoyage(realtime.onRoomUpdate(applyRoom));
        const joined = await realtime.joinRoom({
          code: roomCode,
          player: me,
          hostToken: me?.host ? sessionStorage.getItem('champ_room_host_token') || undefined : undefined,
          playerToken: !me?.host ? sessionStorage.getItem('champ_room_player_token') || undefined : undefined,
        });
        if (joined?.ok) {
          if (joined.playerToken && !joined.player?.host) sessionStorage.setItem('champ_room_player_token', joined.playerToken);
          else if (joined.player?.host) sessionStorage.removeItem('champ_room_player_token');
          applyRoom(joined.room);
        }
      }).catch(err => {
        console.warn('[jeu-multi] connectRealtime échouée:', err);
        naviguer('multijoueur.html');
      });
    }
}

export function cleanup() {
  nettoyages.forEach(fn => {
    try { fn(); } catch (e) {}
  });
  nettoyages = [];
}
