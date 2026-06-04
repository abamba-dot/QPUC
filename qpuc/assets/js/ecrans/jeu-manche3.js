import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getState, finishGame, DEMO } from '../state.js';
import { loadQuestions } from '../questions-service.js';
import { createTimer } from '../timer.js';
import { bindThemeDots } from '../utils.js';
import { playCorrect, playWrong, playBtn, playBuzzer } from '../sound.js';

export const titre = 'Face à Face — Manche 3';

let _m3Timers = [];
function _m3After(fn, delay) {
  const id = setTimeout(fn, delay);
  _m3Timers.push(id);
  return id;
}

export const html = `
<div class="page jeu-m3-page" id="page">
  <div style="text-align:center;padding:10px 0 12px;flex-shrink:0">
    <div class="badge badge--glass marge-auto">Manche 3 · Face à Face</div>
  </div>

  <div class="duel-layout" style="flex:1;min-height:0">
    <!-- Joueur gauche -->
    <div class="card duel-player" id="player-left">
      <span class="avatar" id="avatar-left">??</span>
      <div class="player-name taille-15" id="name-left">Joueur 1</div>
      <div class="duel-dots" id="dots-left" style="width:100%"></div>
      <button class="duel-buzz-btn" id="buzz-btn-left" type="button">
        <span class="buzz-icon">⚡</span>
        <span class="buzz-key" id="buzz-key-left">?</span>
      </button>
    </div>

    <!-- Centre -->
    <div class="duel-center">
      <div class="card duel-question">
        <div class="q-theme" id="duel-theme">Finale</div>
        <div class="duel-question__text" id="duel-question">Chargement…</div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div class="timer-ring" id="timer-wrap" style="width:54px;height:54px">
          <svg viewBox="0 0 54 54">
            <circle cx="27" cy="27" r="21" fill="none" stroke="var(--glass)" stroke-width="4"/>
            <circle cx="27" cy="27" r="21" fill="none" stroke="var(--manche3-color,var(--accent))" stroke-width="4"
              stroke-linecap="round" transform="rotate(-90 27 27)" stroke-dasharray="132"
              data-timer-ring style="stroke-dashoffset:0"/>
            <circle cx="27" cy="27" r="17" fill="var(--card-bg)"/>
          </svg>
          <span class="timer-ring__value" data-timer-value>15</span>
        </div>
        <div id="zone-pts" style="font-family:var(--font-display);font-size:clamp(11px,2vw,14px);font-weight:700;opacity:.8;letter-spacing:.04em;min-height:1.2em">4 pts</div>
      </div>

      <div class="duel-answers" id="duel-answers" style="display:none">
        <button class="duel-answer" id="da0" type="button"><span>A</span><strong id="dat0">—</strong></button>
        <button class="duel-answer" id="da1" type="button"><span>B</span><strong id="dat1">—</strong></button>
        <button class="duel-answer" id="da2" type="button"><span>C</span><strong id="dat2">—</strong></button>
        <button class="duel-answer" id="da3" type="button"><span>D</span><strong id="dat3">—</strong></button>
      </div>
    </div>

    <!-- Joueur droite -->
    <div class="card duel-player" id="player-right">
      <span class="avatar" id="avatar-right">??</span>
      <div class="player-name taille-15" id="name-right">Joueur 2</div>
      <div class="duel-dots" id="dots-right" style="width:100%"></div>
      <button class="duel-buzz-btn" id="buzz-btn-right" type="button">
        <span class="buzz-icon">⚡</span>
        <span class="buzz-key" id="buzz-key-right">?</span>
      </button>
    </div>
  </div>

  <div class="duel-bandeau" id="duel-bandeau">Appuyez sur votre touche pour buzzer</div>
</div>
`;

export async function init(conteneur) {
  conteneur.querySelectorAll('[data-onclick]').forEach(el => {
    const code = el.dataset.onclick;
    const navMatch = code.match(/navigate\('([^']+)'\)/);
    if (navMatch) { el.addEventListener('click', () => import('../routeur.js').then(m => m.naviguer(navMatch[1]))); el.removeAttribute('data-onclick'); return; }
    if (/^[a-zA-Z0-9_$]+\(\)$/.test(code)) { const fn = code.replace('()',''); el.addEventListener('click', () => { if (typeof window[fn]==='function') window[fn](); }); el.removeAttribute('data-onclick'); return; }
    const fnNum = code.match(/^(\w+)\((\d+)\)$/);
    if (fnNum) { const [,fn,a]=fnNum; el.addEventListener('click', () => { if (typeof window[fn]==='function') window[fn](Number(a)); }); el.removeAttribute('data-onclick'); return; }
    el.addEventListener('click', function() { eval(code); }); el.removeAttribute('data-onclick');
  });
  window.naviguer = naviguer;
  initTheme();
  bindThemeDots();

  const state = getState();
  const COLORS = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];

  const finalists = (
    state.rounds?.m2?.results?.filter(p => p.qualified).slice(0, 2)?.length === 2
      ? state.rounds.m2.results.filter(p => p.qualified).slice(0, 2)
      : state.rounds?.m1?.results?.filter(p => p.qualified).slice(0, 2)?.length >= 2
        ? state.rounds.m1.results.filter(p => p.qualified).slice(0, 2)
        : state.players?.length >= 2
          ? state.players.slice(0, 2)
          : DEMO.M2_RESULTS.filter(p => p.qualified).slice(0, 2)
  );

  const questions = await loadQuestions({
    category: state.config?.category,
    difficulty: state.config?.difficulty,
    limit: 20,
    fallback: DEMO.QUESTIONS,
  });

  let scoreL = 0, scoreR = 0, qIndex = 0;
  let buzzed = null;
  let firstWrongSide = null;
  let timer = null;
  let roundActive = false;
  let keyListener = null;
  let questionStartTime = 0;
  let zoneInterval = null;

  const $ = id => conteneur.querySelector('#' + id);

  function getZonePoints() {
    const elapsed = (Date.now() - questionStartTime) / 1000;
    const duration = 15;
    const remaining = Math.max(0, duration - elapsed);
    if (remaining > duration * 0.75) return 4;
    if (remaining > duration * 0.5)  return 3;
    if (remaining > duration * 0.25) return 2;
    return 1;
  }

  function updateZoneIndicator() {
    const el = $('zone-pts');
    if (!el) return;
    const pts = getZonePoints();
    el.textContent = pts + ' pts';
  }

  function startZoneIndicator() {
    stopZoneIndicator();
    updateZoneIndicator();
    zoneInterval = setInterval(updateZoneIndicator, 200);
    window._m3ZoneInterval = zoneInterval;
  }

  function stopZoneIndicator() {
    if (zoneInterval) { clearInterval(zoneInterval); zoneInterval = null; }
    if (window._m3ZoneInterval) { clearInterval(window._m3ZoneInterval); window._m3ZoneInterval = null; }
    const el = $('zone-pts');
    if (el) el.textContent = '';
  }

  function normalizeBuzzKey(event) {
    if (!event.key || event.ctrlKey || event.altKey || event.metaKey) return '';
    if (event.key === ' ') return 'ESPACE';
    if (event.key === 'Escape') return 'ECHAP';
    if (event.key.length === 1) return event.key.toUpperCase();
    return event.key.toUpperCase().replace(/^ARROW/, 'FLECHE ');
  }

  function renderScore(containerId, score) {
    const el = $(containerId);
    if (!el) return;
    const pct = Math.round(score / 12 * 100);
    el.innerHTML = `
      <div style="font-family:var(--font-display);font-size:clamp(28px,5vw,42px);font-weight:900;line-height:1">
        ${score}<span style="font-size:.45em;opacity:.55;letter-spacing:-.02em">/12</span>
      </div>
      <div style="width:100%;height:6px;background:var(--glass);border-radius:999px;overflow:hidden;margin-top:4px">
        <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:999px;transition:width .4s var(--ease-out)"></div>
      </div>`;
  }

  function setBandeau(text, state) {
    const el = $('duel-bandeau');
    if (!el) return;
    el.textContent = text;
    el.className = 'duel-bandeau' + (state === 'correct' ? ' duel-bandeau--correct' : state === 'wrong' ? ' duel-bandeau--wrong' : '');
  }

  function setBuzzButtons(activeSide) {
    const btnL = $('buzz-btn-left');
    const btnR = $('buzz-btn-right');
    if (!btnL || !btnR) return;
    btnL.className = 'duel-buzz-btn';
    btnR.className = 'duel-buzz-btn';
    if (activeSide === 'left') {
      btnL.classList.add('duel-buzz-btn--active');
      btnR.classList.add('duel-buzz-btn--disabled');
    } else if (activeSide === 'right') {
      btnR.classList.add('duel-buzz-btn--active');
      btnL.classList.add('duel-buzz-btn--disabled');
    }
  }

  function setBuzzButtonsWrong(side) {
    const btn = $(side === 'left' ? 'buzz-btn-left' : 'buzz-btn-right');
    if (btn) {
      btn.className = 'duel-buzz-btn duel-buzz-btn--wrong';
    }
  }

  function setPlayerHighlight(activeSide) {
    const pL = $('player-left');
    const pR = $('player-right');
    if (!pL || !pR) return;
    pL.classList.remove('duel-player--buzzing');
    pR.classList.remove('duel-player--buzzing');
    if (activeSide === 'left') pL.classList.add('duel-player--buzzing');
    if (activeSide === 'right') pR.classList.add('duel-player--buzzing');
  }

  function hydratePlayers() {
    const [left, right] = finalists;
    $('name-left').textContent = left.name;
    $('name-right').textContent = right.name;
    $('avatar-left').textContent = left.init || left.name.slice(0, 2).toUpperCase();
    $('avatar-right').textContent = right.init || right.name.slice(0, 2).toUpperCase();
    $('avatar-left').style.background = COLORS[(left.colorIdx ?? 0) % COLORS.length];
    $('avatar-right').style.background = COLORS[(right.colorIdx ?? 1) % COLORS.length];
    $('buzz-key-left').textContent = String(left.buzzKey || 'A').toUpperCase();
    $('buzz-key-right').textContent = String(right.buzzKey || 'Z').toUpperCase();
    renderScore('dots-left', 0);
    renderScore('dots-right', 0);
  }

  function currentQuestion() {
    return questions[qIndex % questions.length];
  }

  function stopTimer() {
    if (timer) { timer.stop(); timer = null; }
  }

  function startTimer(onEnd) {
    stopTimer();
    const wrap = $('timer-wrap');
    if (!wrap) return;
    timer = createTimer(wrap, { duration: 15, urgentAt: 5, onEnd });
    timer.start();
  }

  function showAnswers(enabled) {
    const grid = $('duel-answers');
    if (!grid) return;
    grid.style.display = enabled ? 'grid' : 'none';
    grid.querySelectorAll('.duel-answer').forEach(btn => {
      btn.disabled = !enabled;
      btn.className = 'duel-answer';
    });
  }

  function renderQuestion() {
    buzzed = null;
    firstWrongSide = null;
    roundActive = true;
    questionStartTime = Date.now();
    showAnswers(false);
    setPlayerHighlight(null);
    setBuzzButtons(null);
    setBandeau('Appuyez sur votre touche pour buzzer', '');
    const q = currentQuestion();
    $('duel-theme').textContent = q.cat || 'Finale';
    $('duel-question').textContent = q.q;
    for (let i = 0; i < 4; i++) {
      $('dat' + i).textContent = q.opts?.[i] || '—';
    }
    stopTimer();
    startZoneIndicator();
  }

  function buzz(side) {
    if (!roundActive) return;
    if (buzzed === side) return;
    if (firstWrongSide === side) return;

    const currentBuzzPoints = getZonePoints();
    stopZoneIndicator();

    playBuzzer();
    buzzed = side;
    roundActive = false;

    const player = side === 'left' ? finalists[0] : finalists[1];
    setBandeau(`${player.name} a buzzé — choisissez une réponse (zone ${currentBuzzPoints} pts)`, '');
    setPlayerHighlight(side);
    setBuzzButtons(side);

    const q = currentQuestion();
    for (let i = 0; i < 4; i++) {
      const btn = $('da' + i);
      btn.className = 'duel-answer';
      btn.disabled = false;
      btn.onclick = () => answerDuel(i, side, currentBuzzPoints);
    }
    showAnswers(true);

    startTimer(() => answerDuelTimeout(side));
  }

  function answerDuel(idx, side, pts) {
    stopTimer();
    stopZoneIndicator();
    showAnswers(false);

    const q = currentQuestion();
    const ok = idx === q.c;
    const player = side === 'left' ? finalists[0] : finalists[1];
    const earnedPts = pts || 1;

    const answerEl = $('da' + idx);
    const correctEl = $('da' + q.c);
    if (answerEl) answerEl.className = 'duel-answer ' + (ok ? 'duel-answer--correct' : 'duel-answer--wrong');
    if (!ok && correctEl && firstWrongSide !== null) correctEl.className = 'duel-answer duel-answer--correct';

    const answersGrid = $('duel-answers');
    if (answersGrid) {
      answersGrid.style.display = 'grid';
      answersGrid.querySelectorAll('.duel-answer').forEach(b => { b.disabled = true; b.onclick = null; });
    }

    if (ok) {
      playCorrect();
      if (side === 'left') { scoreL += earnedPts; renderScore('dots-left', scoreL); }
      else { scoreR += earnedPts; renderScore('dots-right', scoreR); }
      setBandeau(`${player.name} répond : ${q.opts[idx]} — Correct ! +${earnedPts} pt${earnedPts > 1 ? 's' : ''} (zone ${earnedPts})`, 'correct');
      setPlayerHighlight(null);

      if (scoreL >= 12 || scoreR >= 12) {
        _m3After(finishDuel, 1200);
      } else {
        qIndex++;
        _m3After(renderQuestion, 1500);
      }
    } else {
      const isSecondChance = firstWrongSide !== null;
      playWrong();
      setBuzzButtonsWrong(side);
      setPlayerHighlight(null);
      setBuzzButtons(null);

      if (isSecondChance) {
        setBandeau(`${player.name} répond : ${q.opts[idx]} — Faux ! Aucun point.`, 'wrong');
        qIndex++;
        _m3After(renderQuestion, 1600);
      } else {
        firstWrongSide = side;
        const otherSide = side === 'left' ? 'right' : 'left';
        const otherPlayer = side === 'left' ? finalists[1] : finalists[0];
        setBandeau(`${player.name} répond : ${q.opts[idx]} — Faux ! ${otherPlayer.name} peut tenter`, 'wrong');
        const otherBtn = $(otherSide === 'left' ? 'buzz-btn-left' : 'buzz-btn-right');
        if (otherBtn) otherBtn.className = 'duel-buzz-btn';
        _m3After(() => { roundActive = true; questionStartTime = Date.now(); startZoneIndicator(); }, 300);
      }
    }
  }

  function answerDuelTimeout(side) {
    const isSecondChance = firstWrongSide !== null;
    stopZoneIndicator();
    playWrong();
    setBuzzButtonsWrong(side);
    showAnswers(false);
    setPlayerHighlight(null);
    setBuzzButtons(null);

    if (isSecondChance) {
      setBandeau('Temps écoulé — aucun point — question suivante', 'wrong');
      qIndex++;
      _m3After(renderQuestion, 1500);
    } else {
      firstWrongSide = side;
      const otherSide = side === 'left' ? 'right' : 'left';
      const otherPlayer = side === 'left' ? finalists[1] : finalists[0];
      setBandeau(`Temps écoulé ! ${otherPlayer.name} peut tenter`, 'wrong');
      const otherBtn = $(otherSide === 'left' ? 'buzz-btn-left' : 'buzz-btn-right');
      if (otherBtn) otherBtn.className = 'duel-buzz-btn';
      _m3After(() => { roundActive = true; questionStartTime = Date.now(); startZoneIndicator(); }, 300);
    }
  }

  function finishDuel() {
    stopZoneIndicator();
    const winner = scoreL >= 12 ? finalists[0] : finalists[1];

    const overlay = document.createElement('div');
    overlay.className = 'duel-winner-overlay';
    overlay.innerHTML = `
      <div class="duel-winner-badge">🏆 ${winner.name}</div>
      <div class="duel-winner-sub">Remporte le duel !</div>
    `;
    document.body.appendChild(overlay);

    _m3After(() => {
      finishGame({
        finalists,
        winnerId: winner.id,
        duelScores: {
          [finalists[0].id]: scoreL,
          [finalists[1].id]: scoreR,
        },
      });
      naviguer('podium.html');
    }, 2500);
  }

  keyListener = function(e) {
    if (!roundActive) return;
    const key = normalizeBuzzKey(e);
    if (!key) return;

    const leftKey = String(finalists[0].buzzKey || 'A').toUpperCase();
    const rightKey = String(finalists[1].buzzKey || 'Z').toUpperCase();

    if (key === leftKey && firstWrongSide !== 'left') {
      buzz('left');
    } else if (key === rightKey && firstWrongSide !== 'right') {
      buzz('right');
    }
  };
  window._m3KeyListener = keyListener;
  document.addEventListener('keydown', keyListener);

  const btnLeft = $('buzz-btn-left');
  const btnRight = $('buzz-btn-right');
  if (btnLeft) btnLeft.addEventListener('click', () => { if (firstWrongSide !== 'left') buzz('left'); });
  if (btnRight) btnRight.addEventListener('click', () => { if (firstWrongSide !== 'right') buzz('right'); });

  hydratePlayers();
  renderQuestion();
}

export function cleanup() {
  if (typeof window._m3KeyListener === 'function') {
    document.removeEventListener('keydown', window._m3KeyListener);
    window._m3KeyListener = null;
  }
  if (window._m3ZoneInterval) {
    clearInterval(window._m3ZoneInterval);
    window._m3ZoneInterval = null;
  }
  _m3Timers.forEach(id => clearTimeout(id));
  _m3Timers = [];
}
