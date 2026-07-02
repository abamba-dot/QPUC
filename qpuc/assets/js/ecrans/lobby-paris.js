/* ════════════════════════════════════════════════════════════
   lobby-paris.js — Salle d'attente pour les invités Mode Paris
════════════════════════════════════════════════════════════ */

import { naviguer }        from '../routeur.js';
import { connectRealtime } from '../realtime-client.js';
import { mergeState }      from '../state.js';
import { esc }             from '../utils.js';

export const titre = 'Salle Mode Paris';

let _client       = null;
let _lobbyHandler = null;
let _debutHandler = null;
let joueursLobby  = [];

export const html = `
<div style="width:100vw;height:100vh;background:#0A0804;
            font-family:'Manrope',sans-serif;overflow:hidden;
            display:flex;flex-direction:column;align-items:center;
            justify-content:center;position:relative;">

  <img src="./assets/img/paris/paris-fond.png"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35;z-index:0;"
       onerror="this.style.display='none'">
  <div style="position:absolute;inset:0;z-index:0;
              background:radial-gradient(ellipse 80% 80% at 50% 50%,
                rgba(0,0,0,.2) 0%,rgba(6,4,2,.92) 100%);"></div>

  <div style="position:relative;z-index:1;width:min(440px,92vw);
              background:linear-gradient(160deg,#1E1430,#12091E);
              border:1.5px solid rgba(200,150,60,.45);border-radius:18px;
              padding:36px 32px;text-align:center;
              box-shadow:0 20px 60px rgba(0,0,0,.6);">

    <div style="font:900 24px/1 'Cinzel';color:#E8B84B;letter-spacing:.18em;margin-bottom:6px;">
      MODE PARIS
    </div>
    <div style="font:600 11px 'Manrope';letter-spacing:.16em;color:rgba(200,150,60,.6);
                text-transform:uppercase;margin-bottom:20px;">
      Salle : <span id="code-lobby">——</span>
    </div>

    <div style="font:700 10px 'Manrope';letter-spacing:.2em;color:rgba(200,150,60,.7);
                text-transform:uppercase;margin-bottom:14px;">
      Joueurs connectés
    </div>
    <div id="liste-lobby-paris"
         style="display:flex;flex-direction:column;gap:8px;min-height:120px;
                margin-bottom:24px;"></div>

    <div style="font:600 12px 'Manrope';color:rgba(255,255,255,.55);margin-bottom:8px;">
      En attente du lancement par l'hôte…
    </div>
    <div style="display:flex;gap:8px;justify-content:center;">
      <div style="width:8px;height:8px;border-radius:50%;background:#C8963C;
                  animation:pretPulse 1.4s ease-in-out 0s infinite;"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:#C8963C;
                  animation:pretPulse 1.4s ease-in-out .2s infinite;"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:#C8963C;
                  animation:pretPulse 1.4s ease-in-out .4s infinite;"></div>
    </div>
  </div>
</div>
<style>
@keyframes pretPulse {
  0%,100% { opacity:1; box-shadow:0 0 9px rgba(200,150,60,.6); }
  50%     { opacity:.5; box-shadow:0 0 16px rgba(200,150,60,.9); }
}
</style>
`;

export async function init() {
  _forcerPleinEcran();

  const code = sessionStorage.getItem('champ_room_code') || '——';
  const codeEl = document.getElementById('code-lobby');
  if (codeEl) codeEl.textContent = code;

  try { _client = await connectRealtime(); } catch (e) {}

  _lobbyHandler = ({ joueurs }) => {
    joueursLobby = joueurs;
    _majListe();
  };

  _debutHandler = (payload) => {
    try {
      sessionStorage.setItem('paris_debut_payload', JSON.stringify(payload));
    } catch (e) {}
    mergeState({
      players: payload.joueurs.map(j => ({
        id:       j.id,
        name:     j.nom || j.name,
        init:     (j.init || String(j.nom || 'J').slice(0, 2)).toUpperCase(),
        colorIdx: j.colorIdx || 0,
        score:    j.score || 2500,
      })),
      modeParis: { ...payload, started: true },
    });
    naviguer('annonce-paris.html');
  };

  if (_client?.socket) {
    _client.socket.on('paris:lobby-update', _lobbyHandler);
    _client.socket.on('paris:debut',        _debutHandler);
  }
}

function _majListe() {
  const c = document.getElementById('liste-lobby-paris');
  if (!c) return;
  const COULEURS = ['#6E4486', '#2E86C1', '#E8B84B', '#27AE60'];
  c.innerHTML = joueursLobby.map((j, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;
                border-radius:8px;background:rgba(255,255,255,.04);
                border:1px solid rgba(200,150,60,${i === 0 ? '.35' : '.12'});">
      <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
                  background:${COULEURS[i] || '#555'};display:flex;
                  align-items:center;justify-content:center;
                  font:700 11px 'Manrope';color:#fff;">
        ${esc((j.nom || j.name || '?')[0].toUpperCase())}
      </div>
      <span style="font:600 12px 'Manrope';color:#fff;flex:1;text-align:left;">
        ${esc(j.nom || j.name)}
      </span>
      ${i === 0 ? '<span style="font:700 9px \'Manrope\';color:#E8B84B;letter-spacing:.1em">HÔTE</span>' : ''}
    </div>
  `).join('');
}

function _forcerPleinEcran() {
  document.body.classList.add('paris-fullscreen');
  if (!document.getElementById('paris-fs-style')) {
    const s = document.createElement('style');
    s.id = 'paris-fs-style';
    s.textContent = `
      body.paris-fullscreen{background:#0A0804!important;overflow:hidden!important;padding:0!important;margin:0!important}
      body.paris-fullscreen #app,body.paris-fullscreen .app-shell,
      body.paris-fullscreen>div:first-of-type{
        width:100vw!important;height:100vh!important;max-width:none!important;
        border-radius:0!important;box-shadow:none!important;
        overflow:hidden!important;background:#0A0804!important;padding:0!important}
    `;
    document.head.appendChild(s);
  }
}

export function cleanup() {
  if (_client?.socket) {
    if (_lobbyHandler) _client.socket.off('paris:lobby-update', _lobbyHandler);
    if (_debutHandler) _client.socket.off('paris:debut',        _debutHandler);
  }
  document.body.classList.remove('paris-fullscreen');
  document.getElementById('paris-fs-style')?.remove();
}
