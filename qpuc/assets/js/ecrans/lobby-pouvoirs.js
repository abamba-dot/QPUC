/* ════════════════════════════════════════════════════════════
   lobby-pouvoirs.js — Salle d'attente pour les invités Mode Pouvoirs
════════════════════════════════════════════════════════════ */

import { naviguer }        from '../routeur.js';
import { connectRealtime } from '../realtime-client.js';
import { mergeState }      from '../state.js';
import { esc }             from '../utils.js';

export const titre = 'Salle Mode Pouvoirs';

const IMG = './assets/img/pouvoirs/';

const CARD_IMGS = [
  IMG + 'reponse_eclair.png',
  IMG + 'bouclier_de_savoir.png',
  IMG + 'pression_mentale.png',
  IMG + 'indice_supplementaire.png',
];

const COULEURS_J = ['#3DC87A', '#4A90E2', '#E85A3A', '#9B59B6'];

let _client       = null;
let _lobbyHandler = null;
let _debutHandler = null;
let _joueurs      = [];

export const html = `
<div id="lobby-pv-root"
     style="position:fixed;inset:0;z-index:9999;overflow:hidden;
            background:#0F0020;font-family:'Manrope',sans-serif;">

  <!-- Fond animé : rayons lumineux -->
  <div style="position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;">
    <div style="position:absolute;top:50%;left:50%;width:200vw;height:200vh;
                transform:translate(-50%,-50%);
                background:conic-gradient(from 0deg at 50% 50%,
                  transparent 0deg,rgba(107,47,217,.06) 30deg,transparent 60deg,
                  transparent 120deg,rgba(200,168,75,.04) 150deg,transparent 180deg,
                  transparent 240deg,rgba(107,47,217,.06) 270deg,transparent 300deg,
                  transparent 360deg);
                animation:pvLobbyRotate 24s linear infinite;"></div>
    <div style="position:absolute;top:50%;left:50%;width:90vw;height:90vw;
                border-radius:50%;transform:translate(-50%,-50%);
                background:radial-gradient(circle,rgba(107,47,217,.18) 0%,transparent 65%);
                animation:pvLobbyPulse 3.5s ease-in-out infinite;"></div>
  </div>

  <!-- Cartes de pouvoirs en silhouette (fond décoratif) -->
  <div style="position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;">
    <img src="${CARD_IMGS[0]}" style="position:absolute;top:-5%;left:-6%;width:22%;opacity:.07;
         transform:rotate(-14deg);filter:blur(1px);">
    <img src="${CARD_IMGS[1]}" style="position:absolute;top:-5%;right:-5%;width:20%;opacity:.07;
         transform:rotate(12deg);filter:blur(1px);">
    <img src="${CARD_IMGS[2]}" style="position:absolute;bottom:-8%;left:-4%;width:21%;opacity:.07;
         transform:rotate(10deg);filter:blur(1px);">
    <img src="${CARD_IMGS[3]}" style="position:absolute;bottom:-8%;right:-6%;width:19%;opacity:.07;
         transform:rotate(-11deg);filter:blur(1px);">
  </div>

  <!-- Contenu principal -->
  <div style="position:relative;z-index:10;width:100%;height:100%;
              display:flex;flex-direction:column;align-items:center;
              justify-content:center;padding:clamp(24px,5vw,60px) clamp(16px,4vw,48px);">

    <!-- Titre -->
    <div style="text-align:center;margin-bottom:clamp(24px,4vh,48px);">
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;
                  margin-bottom:10px;">
        <div style="width:40px;height:1.5px;background:linear-gradient(90deg,transparent,#C8A84B);"></div>
        <span style="font:700 11px/1 'Manrope';letter-spacing:.28em;
                     text-transform:uppercase;color:#C8A84B;">SALLE D'ATTENTE</span>
        <div style="width:40px;height:1.5px;background:linear-gradient(90deg,#C8A84B,transparent);"></div>
      </div>
      <div style="font:900 clamp(36px,6vw,64px)/1 'Bricolage Grotesque','Manrope';
                  letter-spacing:.06em;color:#FFE500;
                  text-shadow:0 0 40px rgba(255,229,0,.3);">
        <i class="fa-solid fa-bolt"></i> MODE POUVOIRS
      </div>
    </div>

    <!-- Card principale : code + joueurs -->
    <div style="width:min(680px,94vw);background:rgba(255,255,255,.035);
                border:1.5px solid rgba(200,168,75,.3);border-radius:20px;
                overflow:hidden;box-shadow:0 0 60px rgba(107,47,217,.2),
                                           0 24px 48px rgba(0,0,0,.5);">

      <!-- Code de salle -->
      <div style="padding:28px 32px;border-bottom:1px solid rgba(200,168,75,.15);
                  text-align:center;background:rgba(200,168,75,.04);">
        <div style="font:700 10px/1 'Manrope';letter-spacing:.26em;
                    text-transform:uppercase;color:rgba(200,168,75,.65);margin-bottom:10px;">
          CODE DE LA SALLE
        </div>
        <div id="code-lobby-pv"
             style="font:900 clamp(26px,5vw,44px)/1 'Manrope';letter-spacing:.2em;
                    color:#FFE500;text-shadow:0 0 28px rgba(255,229,0,.3);">——</div>
      </div>

      <!-- Liste des joueurs -->
      <div style="padding:22px 28px;">
        <div style="font:700 10px/1 'Manrope';letter-spacing:.22em;
                    text-transform:uppercase;color:rgba(200,168,75,.55);
                    margin-bottom:16px;">JOUEURS CONNECTÉS</div>

        <div id="liste-lobby-pv" style="display:flex;flex-direction:column;gap:10px;
                                         min-height:80px;"></div>

        <div id="pv-lobby-attente"
             style="display:flex;align-items:center;gap:10px;margin-top:16px;
                    font:500 13px 'Manrope';color:rgba(255,255,255,.35);">
          <div style="display:flex;gap:6px;">
            <span style="width:7px;height:7px;border-radius:50%;background:#C8A84B;
                         animation:pvLobbyDot 1.4s ease-in-out 0s infinite;"></span>
            <span style="width:7px;height:7px;border-radius:50%;background:#C8A84B;
                         animation:pvLobbyDot 1.4s ease-in-out .2s infinite;"></span>
            <span style="width:7px;height:7px;border-radius:50%;background:#C8A84B;
                         animation:pvLobbyDot 1.4s ease-in-out .4s infinite;"></span>
          </div>
          En attente de l'hôte…
        </div>
      </div>
    </div>

    <!-- Info icônes pouvoirs miniatures -->
    <div style="display:flex;gap:16px;margin-top:28px;align-items:center;">
      ${[
        { img: 'reponse_eclair.png',        color: '#3DC87A', label: 'Éclair' },
        { img: 'bouclier_de_savoir.png',    color: '#4A90E2', label: 'Bouclier' },
        { img: 'pression_mentale.png',      color: '#E85A3A', label: 'Pression' },
        { img: 'indice_supplementaire.png', color: '#9B59B6', label: 'Indice' },
      ].map(p => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;opacity:.55;">
          <img src="${IMG}${p.img}" style="width:clamp(36px,4vw,52px);height:auto;
               border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.4);">
          <span style="font:600 10px/1 'Manrope';letter-spacing:.1em;
                       text-transform:uppercase;color:${p.color};">${p.label}</span>
        </div>
      `).join('')}
    </div>
  </div>
</div>

<style>
  @keyframes pvLobbyRotate { to{ transform:translate(-50%,-50%) rotate(360deg); } }
  @keyframes pvLobbyPulse  { 0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1);}
                              50%{opacity:1;transform:translate(-50%,-50%) scale(1.08);} }
  @keyframes pvLobbyDot    { 0%,100%{opacity:1;transform:scale(1);}
                              50%{opacity:.3;transform:scale(.65);} }
</style>
`;

export async function init() {
  _forcerPleinEcran();

  const code = sessionStorage.getItem('champ_room_code') || '——';
  const codeEl = document.getElementById('code-lobby-pv');
  if (codeEl) codeEl.textContent = code;

  try { _client = await connectRealtime(); } catch (e) { /* ignore */ }

  _lobbyHandler = ({ joueurs }) => {
    _joueurs = joueurs;
    _majListe();
  };

  _debutHandler = (payload) => {
    try {
      sessionStorage.setItem('pouvoirs_debut_payload', JSON.stringify(payload));
    } catch (e) { /* ignore */ }
    mergeState({
      players: (payload.joueurs || []).map(j => ({
        id:       j.id,
        name:     j.nom || j.name,
        init:     (j.init || String(j.nom || 'J').slice(0, 2)).toUpperCase(),
        colorIdx: j.colorIdx || 0,
        score:    j.score || 0,
      })),
      modePouvoirs: { ...payload, started: true },
    });
    naviguer('intro-pouvoirs.html');
  };

  if (_client?.socket) {
    _client.socket.on('pouvoirs:lobby-update', _lobbyHandler);
    _client.socket.on('pouvoirs:debut',        _debutHandler);
  }
}

function _majListe() {
  const c = document.getElementById('liste-lobby-pv');
  const a = document.getElementById('pv-lobby-attente');
  if (!c) return;

  c.innerHTML = _joueurs.map((j, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                border-radius:12px;background:rgba(255,255,255,.04);
                border:1px solid ${i === 0 ? 'rgba(200,168,75,.4)' : 'rgba(255,255,255,.08)'};
                transition:all .25s;">
      <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;
                  background:${COULEURS_J[i % 4]};
                  display:flex;align-items:center;justify-content:center;
                  font:800 14px/1 'Manrope';color:#fff;
                  box-shadow:0 0 14px ${COULEURS_J[i % 4]}66;">
        ${esc((j.nom || j.name || '?')[0].toUpperCase())}
      </div>
      <span style="font:600 15px 'Manrope';color:#fff;flex:1;">${esc(j.nom || j.name || 'Joueur')}</span>
      ${i === 0 ? `<span style="font:700 9px 'Manrope';letter-spacing:.16em;
                             text-transform:uppercase;color:#C8A84B;
                             border:1px solid rgba(200,168,75,.4);
                             border-radius:4px;padding:3px 8px;">HÔTE</span>` : ''}
      <div style="width:8px;height:8px;border-radius:50%;background:#3DC87A;
                  box-shadow:0 0 8px #3DC87A;animation:pvLobbyDot 1.4s ease-in-out ${i * .15}s infinite;"></div>
    </div>
  `).join('');

  if (a) a.style.display = _joueurs.length >= 2 ? 'none' : 'flex';
}

function _forcerPleinEcran() {
  document.body.classList.add('pouvoirs-fullscreen');
  if (!document.getElementById('pouvoirs-fs-style')) {
    const s = document.createElement('style');
    s.id = 'pouvoirs-fs-style';
    s.textContent = `
      body.pouvoirs-fullscreen{background:#0F0020!important;overflow:hidden!important;padding:0!important;margin:0!important}
      body.pouvoirs-fullscreen #app,body.pouvoirs-fullscreen .app-shell,
      body.pouvoirs-fullscreen>div:first-of-type{
        width:100vw!important;height:100vh!important;max-width:none!important;
        border-radius:0!important;box-shadow:none!important;
        overflow:hidden!important;background:#0F0020!important;padding:0!important}
    `;
    document.head.appendChild(s);
  }
}

export function cleanup() {
  if (_client?.socket) {
    if (_lobbyHandler) _client.socket.off('pouvoirs:lobby-update', _lobbyHandler);
    if (_debutHandler) _client.socket.off('pouvoirs:debut',        _debutHandler);
  }
  _lobbyHandler = null;
  _debutHandler = null;
  document.body.classList.remove('pouvoirs-fullscreen');
  document.getElementById('pouvoirs-fs-style')?.remove();
}
