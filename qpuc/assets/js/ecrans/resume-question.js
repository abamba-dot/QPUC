/* ════════════════════════════════════════════════
   Écran : resume-question
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { getInitials, esc } from '../utils.js';
import { avatarColor } from '../multiplayer-data.js';
import { connectRealtime } from '../realtime-client.js';
import { playCorrect, playWrong } from '../sound.js';
import { getQuestionIllustration, resolveQuestionIllustration } from '../illustrations.js';
import { bindThemeDots } from '../utils.js';

export const titre = 'Résumé — CHAMPION.';

let nettoyages = [];

function ajouterNettoyage(fn) {
  if (typeof fn === 'function') nettoyages.push(fn);
}

export const html = `
<div class="page lb-live-page resume-question-page" id="page" data-screen-label="Résumé de question">
  <style>
    .resume-question-page{--bg:#EFE4D2;--text:#1E160C;--sub:#6F5A41;--muted:#8B765C;--card-bg:rgba(255,253,248,.86);--card-border:rgba(255,255,255,.74);--accent-2:#B8482A;display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;align-content:center!important;gap:clamp(22px,4vh,44px)!important;width:100vw!important;min-height:100dvh!important;padding:clamp(24px,4vw,44px)!important;background:var(--bg)!important;overflow:hidden}
    .resume-head{width:min(100%,1080px)!important;justify-self:center;display:flex!important;align-items:center;justify-content:space-between;gap:clamp(14px,2vw,28px);padding:clamp(20px,2.6vw,30px);border-radius:24px;background:var(--card-bg);border:1.5px solid var(--card-border);box-shadow:0 18px 38px rgba(30,22,12,.14)}
    .resume-verdict{display:flex;align-items:center;gap:16px;min-width:0}
    .resume-verdict__icon{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
    .resume-verdict--ok .resume-verdict__icon{background:rgba(45,186,110,.14);color:#2DBA6E}
    .resume-verdict--ko .resume-verdict__icon{background:rgba(233,75,60,.12);color:#E94B3C}
    .resume-verdict__title{margin:0;font-family:var(--font-display);font-size:clamp(28px,3.4vw,42px);line-height:.98;color:var(--text)}
    .resume-verdict__sub{margin-top:8px;color:var(--sub);font-weight:750}
    .resume-gain{font-family:var(--font-display);font-size:clamp(44px,5vw,68px);font-weight:900;color:var(--muted);font-variant-numeric:tabular-nums;flex-shrink:0}
    .resume-gain:not(.resume-gain--zero){color:#2DBA6E}
    .resume-layout{width:min(100%,1240px)!important;justify-self:center;display:grid!important;grid-template-columns:minmax(0,1.45fr) minmax(320px,.82fr);gap:clamp(18px,2.2vw,28px);align-items:stretch;min-height:0}
    .trivia-card,.resume-rank{border-radius:24px;background:var(--card-bg);border:1.5px solid var(--card-border);box-shadow:0 18px 38px rgba(30,22,12,.14);overflow:hidden}
    .trivia-card{display:grid;grid-template-rows:minmax(260px,42vh) auto}
    .trivia-img{min-height:0;background-size:contain;background-position:center;background-repeat:no-repeat;background-color:rgba(255,253,248,.72);display:flex;align-items:end;position:relative;border-bottom:1px solid rgba(30,22,12,.12)}
    .trivia-img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(30,22,12,0) 46%,rgba(30,22,12,.28));pointer-events:none}
    .trivia-img__tag{margin:16px;padding:7px 13px;border-radius:999px;background:rgba(255,253,248,.88);color:var(--text);border:1px solid rgba(30,22,12,.08);font-size:10px;font-weight:900;letter-spacing:.18em;position:relative;z-index:1}
    .trivia-body{padding:clamp(20px,2.6vw,28px)}
    .trivia-label,.resume-rank__head{color:var(--accent-2);font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}
    .trivia-text{margin-top:12px;color:var(--text);font-size:clamp(16px,1.55vw,22px);font-weight:750;line-height:1.4;overflow-wrap:anywhere;hyphens:auto}
    .resume-rank{padding:clamp(20px,2.6vw,28px)}
    .resume-rank__head{color:var(--sub);margin-bottom:18px}
    .resume-rank-row{display:grid;grid-template-columns:26px 44px minmax(0,1fr) auto;align-items:center;gap:12px;padding:11px 8px;border-radius:12px}
    .resume-rank-row:not(:last-child){border-bottom:1px solid rgba(30,22,12,.11)}
    .resume-rank-row--me{background:rgba(184,72,42,.09)}
    .resume-rank-num,.resume-rank-score{font-family:var(--font-display);font-weight:900;color:var(--sub);font-variant-numeric:tabular-nums}
    .resume-rank-name{min-width:0;color:var(--text);font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .resume-rank-score{color:var(--text);font-size:18px;text-align:right}
    .resume-next{width:min(100%,360px)!important;justify-self:center;display:flex!important;flex-direction:column;gap:12px;align-items:stretch}
    .resume-next__bar{height:5px;border-radius:999px;background:rgba(30,22,12,.15);overflow:hidden}
    .resume-next__fill{width:0;height:100%;border-radius:inherit;background:var(--accent-2)}
    @media(max-width:820px){.resume-question-page{overflow-y:auto;align-content:start!important}.resume-head,.resume-layout{width:100%!important}.resume-layout{grid-template-columns:1fr}.trivia-card{grid-template-rows:minmax(240px,36vh) auto}}
    @media(max-width:520px){.resume-question-page{padding:16px!important;gap:16px!important}.resume-head{flex-direction:column;border-radius:20px}.trivia-card{grid-template-rows:minmax(210px,32vh) auto}}
  </style>
  <header class="resume-head" id="resume-head">
    <div class="resume-verdict" id="verdict">
      <div class="resume-verdict__icon" id="verdict-icon"></div>
      <div>
        <h1 class="resume-verdict__title" id="verdict-title">Réponse révélée</h1>
        <div class="resume-verdict__sub" id="verdict-sub">La réponse était <b id="correct-ans">…</b></div>
      </div>
    </div>
    <div class="resume-gain" id="gain">0</div>
  </header>
  <main class="resume-layout">
    <article class="card trivia-card">
      <div class="trivia-img" id="trivia-img">
        <span class="trivia-img__tag" id="trivia-cat">QUESTION</span>
      </div>
      <div class="trivia-body">
        <div class="trivia-label">Le saviez-vous ?</div>
        <div class="trivia-text" id="trivia-text">Chargement…</div>
        <div class="trivia-credit cache" id="trivia-credit"></div>
      </div>
    </article>
    <aside class="card resume-rank">
      <div class="resume-rank__head">Classement provisoire</div>
      <div id="rank-list"></div>
    </aside>
  </main>
  <footer class="resume-next">
    <div class="resume-next__bar"><div class="resume-next__fill" id="next-fill"></div></div>
    <button class="btn-primary" id="next-btn" type="button">Question suivante →</button>
  </footer>
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
  
    function readJSON(key, fallback) {
      try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e) { return fallback; }
    }
  
    const roomCode = sessionStorage.getItem('champ_room_code');
    const me = readJSON('champ_current_player', null);
    let realtime = null, renderedIndex = null;
    let roomState = readJSON('champ_last_revealed_room', readJSON('champ_last_room', null));
    let ecranActif = true;
    ajouterNettoyage(() => { ecranActif = false; });
  
    function questionOf(room) { return room?.quiz?.questions?.[room.quiz.index] || null; }
  
    function render(room) {
      const quiz = room?.quiz, question = questionOf(room);
      if (!quiz || !question || !quiz.revealed) return;
      if (renderedIndex === quiz.index) return;
      renderedIndex = quiz.index;
      const answer = quiz.answers?.[me?.id];
      const choice = Number.isInteger(answer?.choice) ? answer.choice : null;
      const correctText = question.opts?.[question.c] || 'la bonne réponse';
      const isCorrect = choice === question.c;
      const beforeScore = readJSON('champ_previous_scores', {});
      const currentPlayer = (room.players || []).find(p => String(p.id) === String(me?.id));
      const gain = Math.max(0, (currentPlayer?.score || 0) - (beforeScore[me?.id] || 0));
      document.getElementById('correct-ans').textContent = correctText;
      document.getElementById('trivia-cat').textContent = (question.cat || 'Question').split('·')[0].trim().toUpperCase();
      document.getElementById('trivia-text').textContent = question.fact || `${correctText} est la réponse correcte.`;
      const illustration = getQuestionIllustration(question);
      const triviaImg = document.getElementById('trivia-img'); triviaImg.style.backgroundImage = `url("${illustration.url}")`; triviaImg.setAttribute('aria-label', illustration.alt);
      const credit = document.getElementById('trivia-credit'); credit.textContent = illustration.credit ? `Image : ${illustration.credit}` : ''; credit.style.display = illustration.credit ? 'block' : 'none';
      resolveQuestionIllustration(question).then(ri => { triviaImg.style.backgroundImage = `url("${ri.url}")`; triviaImg.setAttribute('aria-label', ri.alt); credit.textContent = ri.credit ? `Image : ${ri.credit}` : ''; credit.style.display = ri.credit ? 'block' : 'none'; });
      document.getElementById('gain').textContent = gain > 0 ? `+${gain}` : '0';
      const verdict = document.getElementById('verdict'), icon = document.getElementById('verdict-icon');
      if (isCorrect) { playCorrect(); verdict.classList.add('resume-verdict--ok'); document.getElementById('verdict-title').textContent = 'Bonne réponse !'; icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'; }
      else { if (choice !== null) playWrong(); verdict.classList.add('resume-verdict--ko'); document.getElementById('verdict-title').textContent = choice === null ? 'Temps écoulé' : 'Raté…'; document.getElementById('gain').classList.add('resume-gain--zero'); icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'; }
      const ranked = [...(room.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
      const list = document.getElementById('rank-list'); list.innerHTML = '';
      ranked.forEach((p, i) => { const row = document.createElement('div'); row.className = 'resume-rank-row' + (String(p.id) === String(me?.id) ? ' resume-rank-row--me' : ''); row.innerHTML = `<span class="resume-rank-num">${i + 1}</span><div class="avatar avatar--sm" style="background:${avatarColor(p.color ?? p.colorIdx ?? i)}">${esc(p.init || getInitials(p.name))}</div><span class="resume-rank-name">${esc(p.name)}${String(p.id) === String(me?.id) ? '<span class="you-tag">Vous</span>' : ''}</span><span class="resume-rank-score">${p.score || 0}</span>`; list.appendChild(row); });
      try { sessionStorage.setItem('champ_previous_scores', JSON.stringify(Object.fromEntries((room.players || []).map(p => [p.id, p.score || 0])))); } catch(e) {}
      const fill = document.getElementById('next-fill');
      requestAnimationFrame(() => { fill.style.transition = 'width 10s linear'; fill.style.width = '100%'; });
    }
  
    function applyRoom(room) {
      if (!ecranActif) return;
      if (!room || room.code !== roomCode) return;
      roomState = room;
      try { sessionStorage.setItem('champ_last_room', JSON.stringify(room)); if (room.quiz?.revealed) sessionStorage.setItem('champ_last_revealed_room', JSON.stringify(room)); } catch(e) {}
      if (room.phase === 'manche-results') { naviguer('fin-manche-multi.html'); return; }
      if (room.quiz?.status === 'finished') { naviguer('podium.html'); return; }
      if (room.quiz?.status === 'question' && !room.quiz.revealed) { naviguer('jeu-multi.html'); return; }
      render(room);
    }
  
    document.getElementById('next-btn').addEventListener('click', async () => {
      document.getElementById('next-btn').disabled = true;
      const response = await realtime?.nextQuestion?.();
      if (response?.ok && response.room) applyRoom(response.room);
      else document.getElementById('next-btn').disabled = false;
    });
  
    if (!roomCode || !me) {
      naviguer('multijoueur.html');
    } else {
      if (roomState?.quiz?.revealed) render(roomState);
      connectRealtime().then(async client => {
        realtime = client;
        if (!realtime) return;
        ajouterNettoyage(realtime.onRoomUpdate(applyRoom));
        const joined = await realtime.joinRoom({ code: roomCode, player: me, hostToken: sessionStorage.getItem('champ_room_host_token') || undefined, playerToken: sessionStorage.getItem('champ_room_player_token') || undefined });
        if (joined?.ok) applyRoom(joined.room);
      }).catch(err => {
        console.warn('[resume-question] connectRealtime échouée:', err);
      });
    }
}

export function cleanup() {
  nettoyages.forEach(fn => {
    try { fn(); } catch (e) {}
  });
  nettoyages = [];
}
