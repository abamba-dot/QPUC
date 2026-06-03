/* ════════════════════════════════════════════════
   Écran : classement
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, esc } from '../utils.js';
import { LIVE_BOARD, ROOM, avatarColor } from '../multiplayer-data.js';
import { connectRealtime } from '../realtime-client.js';
import { finishGame } from '../state.js';

export const titre = 'Classement — CHAMPION.';

export const html = `
<div class="page lb-live-page" id="page" data-screen-label="Classement live">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>
  <div class="page-header" style="margin-bottom:6px">
    <button class="back-btn" data-onclick="navigate('lobby.html')" aria-label="Retour">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Salle
    </button>
    <span class="page-title">Classement</span>
    <div class="largeur-48"></div>
  </div>
  <div class="page-header-section" style="padding:8px 0 14px">
    <span class="section-label">Après la manche 1 · Buzzer</span>
    <h2 class="section-title" style="opacity:1;animation:none;font-size:clamp(26px,5vw,40px)">Classement</h2>
  </div>
  <div class="lb-live-list" id="board"></div>
  <div class="btn-zone" style="flex-shrink:0">
    <button class="btn-primary" id="next-quiz-btn" data-onclick="nextQuizStep()">Question suivante →</button>
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
    function readJSON(key, fallback) {
      try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e) { return fallback; }
    }
  
    const quizState = readJSON('champ_quiz_state', null);
    const roomPlayers = readJSON('champ_room_players', ROOM.players);
    const localScores = readJSON('champ_quiz_scores', null);
    const roomCode = sessionStorage.getItem('champ_room_code') || ROOM.code;
    const currentPlayer = readJSON('champ_current_player', roomPlayers[0]);
    let realtime = null;
    let onlineRoom = null;
  
    const client = await connectRealtime();
    if (client && sessionStorage.getItem('champ_room_backend') === 'online') {
      realtime = client;
      realtime.onRoomUpdate(room => {
        if (!room?.quiz) return;
        onlineRoom = room;
        if (room.quiz.status === 'finished') { finishQuiz(room); return; }
        if (room.quiz.status === 'question') {
          const roomMode = room.config?.mode || '';
          naviguer(roomMode === 'quiz-multijoueur' && currentPlayer?.host ? 'hote-quiz.html' : 'joueur-quiz.html');
        }
      });
      const joined = await realtime.joinRoom({ code: roomCode, player: currentPlayer, hostToken: sessionStorage.getItem('champ_room_host_token') || undefined, playerToken: sessionStorage.getItem('champ_room_player_token') || undefined });
      if (joined?.ok) {
        if (joined.playerToken) sessionStorage.setItem('champ_room_player_token', joined.playerToken);
        onlineRoom = joined.room;
        try {
          sessionStorage.setItem('champ_room_players', JSON.stringify(onlineRoom.players));
          sessionStorage.setItem('champ_room_config', JSON.stringify(onlineRoom.config));
          if (onlineRoom.quiz) sessionStorage.setItem('champ_quiz_state', JSON.stringify({ index: onlineRoom.quiz.index, total: onlineRoom.quiz.questions?.length || 10, category: onlineRoom.config?.category, revealed: onlineRoom.quiz.revealed }));
        } catch(e) {}
      }
    }
  
    const activePlayers = onlineRoom?.players || roomPlayers;
    const activeScores  = onlineRoom ? Object.fromEntries((onlineRoom.players || []).map(p => [p.id, p.score || 0])) : localScores;
    const sourceBoard   = activeScores ? activePlayers.map((p, i) => ({ id: p.id, name: p.name, init: p.init, color: p.color ?? p.colorIdx ?? i, score: activeScores[p.id] || 0, prevRank: i + 1, me: String(p.id) === String(currentPlayer?.id) })) : LIVE_BOARD;
    const maxScore = Math.max(1, ...sourceBoard.map(p => p.score));
    const isClassicMode = onlineRoom ? onlineRoom.config?.mode !== 'quiz-multijoueur' : (sessionStorage.getItem('champ_mp_mode') || 'classique') !== 'quiz';
    const isHost = Boolean(currentPlayer?.host);
  
    if (quizState) document.querySelector('.section-label').textContent = `Question ${(quizState.index || 0) + 1} · ${quizState.category || 'Quiz animé'}`;
    document.getElementById('next-quiz-btn').style.display = (isHost || isClassicMode) ? 'inline-flex' : 'none';
  
    const ranked = [...sourceBoard].sort((a, b) => b.score - a.score);
    const board  = document.getElementById('board');
    ranked.forEach((p, i) => {
      const rank = i + 1;
      const move = p.prevRank - rank;
      const moveCls  = move > 0 ? 'lb-move--up' : move < 0 ? 'lb-move--down' : 'lb-move--same';
      const moveIcon = move > 0 ? '<svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor"><path d="M6 2l4 6H2z"/></svg>' : move < 0 ? '<svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor"><path d="M6 10L2 4h8z"/></svg>' : '–';
      const moveTxt  = move !== 0 ? `${moveIcon}${Math.abs(move)}` : moveIcon;
      const row = document.createElement('div');
      row.className = 'lb-row' + (rank === 1 ? ' lb-row--leader' : '') + (p.me ? ' lb-row--me' : '');
      row.style.cssText = 'opacity:0';
      row.style.animation = `playerIn .45s var(--ease-out) ${0.1 + i * 0.09}s both`;
      row.innerHTML = `<span class="lb-rank">${rank}</span><span class="lb-move ${moveCls}">${moveTxt}</span><div class="avatar" style="background:${avatarColor(p.color)}">${esc(p.init)}</div><div class="lb-info"><div class="lb-name">${esc(p.name)}${p.me ? '<span class="you-tag">Vous</span>' : ''}${rank===1?'<span class="host-crown"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z"/></svg></span>':''}</div><div class="lb-bar-bg"><div class="lb-bar-fill" style="width:0%"></div></div></div><span class="lb-score">${p.score}</span>`;
      board.appendChild(row);
      setTimeout(() => { row.querySelector('.lb-bar-fill').style.width = (p.score / maxScore * 100) + '%'; }, 350 + i * 90);
    });
  
    window.nextQuizStep = function() {
      if (realtime) {
        realtime.nextQuestion().then(response => {
          if (response?.ok) {
            const room = response.room;
            if (room.quiz?.status === 'finished') finishQuiz(room);
            else naviguer(room.config?.mode === 'quiz-multijoueur' && currentPlayer?.host ? 'hote-quiz.html' : 'joueur-quiz.html');
          } else naviguer(isClassicMode ? 'joueur-quiz.html' : 'hote-quiz.html');
        });
        return;
      }
      if (quizState && (quizState.index + 1) < (quizState.total || 10)) {
        sessionStorage.setItem('champ_quiz_index', String((quizState.index || 0) + 1));
        naviguer(isClassicMode ? 'joueur-quiz.html' : 'hote-quiz.html');
        return;
      }
      if (quizState && (quizState.index + 1) >= (quizState.total || 10)) { finishQuiz({ players: activePlayers.map(p => ({ ...p, score: activeScores?.[p.id] || p.score || 0 })) }); return; }
      naviguer('lobby.html');
    };
  
    function finishQuiz(room) {
      const players = (room.players || activePlayers).map((p, i) => ({ id: p.id, name: p.name, init: p.init, colorIdx: p.color ?? p.colorIdx ?? i, score: p.score || activeScores?.[p.id] || 0 })).sort((a, b) => (b.score || 0) - (a.score || 0));
      const winner = players[0];
      finishGame({ finalists: players, winnerId: winner?.id, duelScores: Object.fromEntries(players.map(p => [p.id, 0])) });
      naviguer('fin-partie.html');
    }
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
