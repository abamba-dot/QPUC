/* ════════════════════════════════════════════════
   Écran : intro-multi
   Annonce synchronisée avant une manche multijoueur
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots, esc } from '../utils.js';
import { connectRealtime } from '../realtime-client.js';
import { startCountdown } from '../countdown.js';
import { playCountdownTick, playCountdownGo, bgStop } from '../sound.js';

export const titre = 'Annonce multijoueur — CHAMPION.';

let nettoyages = [];

function ajouterNettoyage(fn) {
  if (typeof fn === 'function') nettoyages.push(fn);
}

export const html = `
<div class="page intro-page intro-multi-page" id="page" data-screen-label="Annonce multijoueur">
  <style>
    .intro-multi-page{background:var(--bg)!important;overflow:hidden}
    .intro-multi-card{width:min(100%,980px);margin:auto;display:grid;gap:clamp(18px,3vh,30px);text-align:center}
    .intro-multi-kicker{color:var(--sub);font-weight:950;letter-spacing:.32em;text-transform:uppercase;font-size:clamp(12px,1.2vw,15px)}
    .intro-multi-title{font-family:var(--font-display);font-size:clamp(42px,7vw,92px);font-weight:950;line-height:.95;color:var(--text);text-wrap:balance}
    .intro-multi-sub{max-width:620px;margin:0 auto;color:var(--sub);font-size:clamp(15px,1.6vw,20px);font-weight:800;line-height:1.45}
    .intro-multi-roster{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:4px}
    .intro-multi-player{display:inline-flex;align-items:center;gap:9px;padding:9px 13px;border-radius:999px;background:rgba(255,253,248,.5);border:1px solid rgba(30,22,12,.1);font-weight:900;color:var(--text)}
    .intro-multi-player .avatar{width:34px;height:34px;font-size:12px}
    .intro-multi-wait{min-height:20px;color:var(--sub);font-weight:900;letter-spacing:.16em;text-transform:uppercase;font-size:12px}
  </style>

  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="beige" style="background:#EFE4D2;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="celadon" style="background:#B8D1D2"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#8A7BB8"></div>
  </div>

  <main class="intro-multi-card">
    <div class="intro-multi-kicker" id="intro-kicker">Multijoueur</div>
    <h1 class="intro-multi-title" id="intro-title">La manche commence</h1>
    <p class="intro-multi-sub" id="intro-sub">Préparez-vous.</p>
    <div class="intro-multi-roster" id="intro-roster"></div>
    <div class="intro-multi-wait" id="intro-wait">Synchronisation des joueurs...</div>
  </main>

  <div class="countdown-overlay" id="countdown">
    <div class="countdown-overlay__num" id="cd-num">3</div>
    <div class="countdown-overlay__sub">Préparez-vous !</div>
  </div>
</div>
`;

export async function init() {
  cleanup();
  initTheme();
  bindThemeDots?.();
  document.documentElement.dataset.theme = 'beige';

  const roomCode = sessionStorage.getItem('champ_room_code');
  const me = readJSON('champ_current_player', null);
  let realtime = null;
  let countdownStarted = false;
  let ecranActif = true;
  let cdHandle = null;

  ajouterNettoyage(() => {
    ecranActif = false;
    cdHandle?.cancel?.();
  });

  function readJSON(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function cibleJeu(room) {
    const mode = room?.config?.mode;
    const current = (room?.players || []).find(p => String(p.id) === String(me?.id)) || me;
    if (mode === 'quiz-multijoueur' && current?.host) return 'hote-quiz.html';
    if (mode === 'paris-multi') return 'jeu-multi.html';
    return 'jeu-multi.html';
  }

  function joueursDeJeu(room) {
    const players = room?.players || [];
    return room?.config?.mode === 'quiz-multijoueur'
      ? players.filter(p => !p.host)
      : players;
  }

  function render(room) {
    const intro = room?.intro || {};
    const mode = room?.config?.mode;
    document.getElementById('intro-kicker').textContent = mode === 'quiz-multijoueur'
      ? 'Quiz animé'
      : `Manche ${intro.manche || 1}`;
    document.getElementById('intro-title').textContent = intro.title || 'La manche commence';
    document.getElementById('intro-sub').textContent = intro.subtitle || 'Préparez-vous.';

    const roster = document.getElementById('intro-roster');
    roster.innerHTML = '';
    joueursDeJeu(room).forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = 'intro-multi-player';
      chip.innerHTML = `<span class="avatar" style="background:${avatarColor(i)}">${esc(p.init || p.name.slice(0, 2).toUpperCase())}</span>${esc(p.name)}${String(p.id) === String(me?.id) ? ' · vous' : ''}`;
      roster.appendChild(chip);
    });
  }

  function avatarColor(index) {
    const colors = ['#D66A3A', '#8A73BE', '#3B9B75', '#C99B1E'];
    return colors[index % colors.length];
  }

  async function lancerCountdown(room) {
    if (countdownStarted || !ecranActif) return;
    countdownStarted = true;
    render(room);
    document.getElementById('intro-wait').textContent = me?.host ? 'Lancement en cours...' : "En attente de l'hôte...";
    bgStop(450);

    const delay = Math.max(0, Number(room?.intro?.startsAt || Date.now()) - Date.now());
    setTimeout(() => {
      if (!ecranActif) return;
      cdHandle = startCountdown({
        overlayEl: document.getElementById('countdown'),
        numEl: document.getElementById('cd-num'),
        onTick: () => playCountdownTick(),
        onGo: () => playCountdownGo(),
        onComplete: async () => {
          if (!ecranActif) return;
          const waitEl = document.getElementById('intro-wait');
          if (me?.host) {
            let started = await realtime?.startQuiz?.({ config: room.config });
            if (!started?.ok) {
              // Socket potentiellement déconnecté — reconnecter et réessayer une fois
              try {
                const freshClient = await connectRealtime();
                if (freshClient && ecranActif) {
                  realtime = freshClient;
                  await realtime.joinRoom({
                    code: roomCode, player: me,
                    hostToken: sessionStorage.getItem('champ_room_host_token') || undefined,
                  });
                  started = await realtime.startQuiz({ config: room.config });
                }
              } catch (_) {}
            }
            if (!ecranActif) return;
            if (started?.ok && started.room) {
              sessionStorage.setItem('champ_last_room', JSON.stringify(started.room));
              naviguer(cibleJeu(started.room));
              return;
            }
            if (waitEl) waitEl.textContent = started?.error || 'Impossible de lancer la manche.';
          } else {
            // Non-host : attente passive du room:update, mais vérification active après 2s
            setTimeout(async () => {
              if (!ecranActif) return;
              try {
                const refreshed = await realtime?.joinRoom?.({
                  code: roomCode, player: me,
                  playerToken: sessionStorage.getItem('champ_room_player_token') || undefined,
                });
                if (!ecranActif) return;
                if (refreshed?.ok && refreshed.room) applyRoom(refreshed.room);
              } catch (_) {}
            }, 2000);
          }
        },
      });
    }, delay);
  }

  function applyRoom(room) {
    if (!ecranActif || !room || room.code !== roomCode) return;
    try {
      sessionStorage.setItem('champ_room_config', JSON.stringify(room.config));
      sessionStorage.setItem('champ_room_players', JSON.stringify(room.players || []));
      sessionStorage.setItem('champ_last_room', JSON.stringify(room));
    } catch (e) {}
    if (room.quiz?.status === 'question') {
      naviguer(cibleJeu(room));
      return;
    }
    if (room.phase === 'intro') lancerCountdown(room);
  }

  if (!roomCode || !me) {
    naviguer('multijoueur.html');
    return;
  }

  connectRealtime().then(async client => {
    realtime = client;
    if (!realtime) {
      naviguer('multijoueur.html');
      return;
    }
    ajouterNettoyage(realtime.onRoomUpdate(applyRoom));
    const joined = await realtime.joinRoom({
      code: roomCode,
      player: me,
      hostToken: me.host ? sessionStorage.getItem('champ_room_host_token') || undefined : undefined,
      playerToken: !me.host ? sessionStorage.getItem('champ_room_player_token') || undefined : undefined,
    });
    if (joined?.ok) {
      if (joined.playerToken && !joined.player?.host) sessionStorage.setItem('champ_room_player_token', joined.playerToken);
      applyRoom(joined.room);
    }
  }).catch(err => {
    console.warn('[intro-multi] connectRealtime échouée:', err);
    naviguer('multijoueur.html');
  });
}

export function cleanup() {
  nettoyages.forEach(fn => {
    try { fn(); } catch (e) {}
  });
  nettoyages = [];
}
