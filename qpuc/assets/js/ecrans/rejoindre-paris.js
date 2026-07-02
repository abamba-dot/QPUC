/* ════════════════════════════════════════════════════════════
   rejoindre-paris.js — Écran de saisie du code de salle Paris
════════════════════════════════════════════════════════════ */

import { naviguer }        from '../routeur.js';
import { connectRealtime } from '../realtime-client.js';
import { playBtn }         from '../audio-hooks.js';

export const titre = 'Rejoindre une partie — Mode Paris';

let _client = null;

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

    <div style="font:900 26px/1 'Cinzel';color:#E8B84B;letter-spacing:.18em;margin-bottom:8px;">
      MODE PARIS
    </div>
    <div style="font:600 11px 'Manrope';letter-spacing:.18em;color:rgba(200,150,60,.65);
                text-transform:uppercase;margin-bottom:28px;">
      Rejoindre une salle
    </div>

    <div style="font:700 10px 'Manrope';letter-spacing:.2em;color:rgba(200,150,60,.7);
                text-transform:uppercase;margin-bottom:10px;">
      Code de la salle
    </div>

    <input id="input-code-paris" type="text" maxlength="6" autocomplete="off"
           placeholder="Ex : A3B7K2"
           style="width:100%;padding:18px;border-radius:10px;
                  background:rgba(0,0,0,.4);border:1.5px solid rgba(200,150,60,.4);
                  color:#FFE500;font:900 24px/1 'Cinzel';letter-spacing:.2em;
                  text-align:center;text-transform:uppercase;outline:none;
                  box-sizing:border-box;transition:all .15s;">

    <div id="msg-rejoindre"
         style="font:600 11px 'Manrope';color:#E85A3A;margin-top:10px;min-height:14px;"></div>

    <div style="display:flex;gap:10px;margin-top:24px;">
      <button onclick="window.history.back()"
              style="flex:1;padding:13px;border-radius:10px;cursor:pointer;
                     font:700 11px 'Manrope';letter-spacing:.14em;color:rgba(255,255,255,.55);
                     background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
                     transition:all .15s;">
        ANNULER
      </button>
      <button id="btn-rejoindre-paris"
              style="flex:1;padding:13px;border-radius:10px;cursor:pointer;
                     font:800 12px 'Cinzel';letter-spacing:.16em;color:#0A0804;
                     background:linear-gradient(135deg,#C8963C,#7A5A10);
                     border:1.5px solid #E8B84B;
                     box-shadow:0 0 20px rgba(200,150,60,.3);transition:all .2s;">
        REJOINDRE
      </button>
    </div>
  </div>
</div>
`;

export async function init() {
  _forcerPleinEcran();

  const input = document.getElementById('input-code-paris');
  if (input) {
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') _rejoindre();
    });
    input.focus();
  }

  const btn = document.getElementById('btn-rejoindre-paris');
  if (btn) btn.addEventListener('click', _rejoindre);

  try {
    _client = await connectRealtime();
  } catch (e) {
    _afficherErreur('Connexion au serveur indisponible');
  }
}

async function _rejoindre() {
  const input = document.getElementById('input-code-paris');
  const code  = (input?.value || '').trim().toUpperCase();

  if (code.length < 6) {
    _afficherErreur('Code invalide (6 caractères requis)');
    return;
  }

  playBtn?.();
  _afficherErreur('');

  const pseudo = sessionStorage.getItem('champ_player_name')
              || sessionStorage.getItem('qpuc-pseudo')
              || ('Joueur ' + Math.floor(Math.random() * 1000));

  if (!_client) {
    try { _client = await connectRealtime(); } catch (e) {}
  }
  if (!_client?.socket) {
    _afficherErreur('Pas de connexion au serveur');
    return;
  }

  const previousCode  = sessionStorage.getItem('champ_room_code');
  const playerToken   = previousCode === code ? sessionStorage.getItem('champ_room_player_token') : null;

  _client.socket.emit('paris:rejoindre-salle', { code, pseudo, playerToken: playerToken || undefined }, (reponse) => {
    if (reponse?.erreur) {
      _afficherErreur(reponse.erreur);
      return;
    }
    if (reponse?.ok) {
      sessionStorage.setItem('champ_room_code',    code);
      sessionStorage.setItem('champ_player_id',    reponse.player?.id || _client.socket.id);
      sessionStorage.setItem('champ_player_name',  reponse.player?.name || pseudo);
      sessionStorage.setItem('mode-multi-actif',   'paris');
      if (reponse.playerToken) sessionStorage.setItem('champ_room_player_token', reponse.playerToken);
      naviguer('lobby-paris.html');
    } else {
      _afficherErreur('Réponse serveur invalide');
    }
  });
}

function _afficherErreur(msg) {
  const el = document.getElementById('msg-rejoindre');
  if (el) el.textContent = msg || '';
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
  document.body.classList.remove('paris-fullscreen');
  document.getElementById('paris-fs-style')?.remove();
}
