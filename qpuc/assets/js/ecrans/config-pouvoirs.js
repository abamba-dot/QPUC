/* ════════════════════════════════════════════════════════════
   config-pouvoirs.js — Configuration de partie Mode Pouvoirs
   Thème : clair (cohérent avec le reste du projet)
   Le thème violet n'apparaît qu'à partir de intro-pouvoirs.js
════════════════════════════════════════════════════════════ */

import { naviguer }             from '../routeur.js';
import { mergeState }           from '../state.js';
import { playBtn }              from '../audio-hooks.js';
import { connectRealtime }      from '../realtime-client.js';
import { esc }                  from '../utils.js';
import { PARIS_MOBILE_BREAKPOINT } from '../paris-stage.js';

export const titre = 'Mode Pouvoirs — Configuration';

const CATEGORIES = [
  { id: 'histoire',   label: 'Histoire'    },
  { id: 'sciences',   label: 'Sciences'    },
  { id: 'sport',      label: 'Sport'       },
  { id: 'geographie', label: 'Géographie'  },
  { id: 'culture',    label: 'Culture'     },
  { id: 'mix',        label: 'Mix'        },
];

const cfg = {
  nbJoueurs:   4,
  chrono:      20,
  nbQuestions: 10,
  categorie:   'mix',
  difficulte:  'moyen',
};

let codeGenere       = '';
let joueursLobby     = [];
let _client          = null;
let _lobbyHandler    = null;
let _launchInFlight  = false;

export const html = `
<div id="page-config-pouvoirs" class="page" style="padding:32px 20px 40px;min-height:calc(100vh - 80px);
                          background:var(--bg);">
  <style>
    #page-config-pouvoirs { overflow-y: auto; -webkit-overflow-scrolling: touch; }
    @media (max-width: ${PARIS_MOBILE_BREAKPOINT}px) {
      #page-config-pouvoirs .config-pouvoirs-grid {
        grid-template-columns: 1fr !important;
      }
    }
  </style>

  <!-- TITRE -->
  <div style="text-align:center;margin-bottom:28px;">
    <h1 style="font:800 32px/1.1 'Manrope';color:var(--text);margin:0 0 6px;">
      Mode Pouvoirs
    </h1>
    <div style="font:600 11px 'Manrope';letter-spacing:.18em;
                color:var(--sub);text-transform:uppercase;">
      Configuration de la partie
    </div>
  </div>

  <!-- GRILLE -->
  <div class="config-pouvoirs-grid" style="max-width:920px;margin:0 auto;display:grid;
              grid-template-columns:1fr min(300px,100%);gap:18px;align-items:start;">

    <!-- ═══ COLONNE GAUCHE : PARAMÈTRES ═══ -->
    <div style="background:var(--card-bg);border:1px solid var(--card-border);
                border-radius:16px;padding:26px 24px;
                box-shadow:0 4px 20px var(--shadow-soft,rgba(0,0,0,.06));">

      <div style="font:800 14px 'Manrope';color:var(--text);
                  margin-bottom:20px;display:flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-gear"></i> Paramètres
      </div>

      <!-- NB JOUEURS MAX -->
      <div style="margin-bottom:22px;">
        <div style="font:700 10px 'Manrope';letter-spacing:.18em;text-transform:uppercase;
                    color:var(--sub);margin-bottom:8px;">
          Joueurs maximum
        </div>
        <div style="display:flex;gap:8px;" id="grp-joueurs-pv">
          ${[2,3,4].map(n => `
            <button data-val="${n}" onclick="pvSetCfg('nbJoueurs',${n})"
                    style="flex:1;padding:12px;border-radius:var(--radius-btn);cursor:pointer;
                           font:700 18px 'Manrope';transition:all .15s;
                           display:flex;align-items:center;justify-content:center;
                           text-align:center;line-height:1.25;
                           background:${n===4?'var(--accent)':'var(--glass)'};
                           border:1.5px solid ${n===4?'var(--accent)':'var(--glass-border)'};
                           color:${n===4?'var(--btn-text)':'var(--sub)'};">
              ${n}
            </button>`).join('')}
        </div>
      </div>

      <!-- NB QUESTIONS -->
      <div style="margin-bottom:22px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;
                    margin-bottom:8px;">
          <span style="font:700 10px 'Manrope';letter-spacing:.18em;text-transform:uppercase;
                       color:var(--sub);">Nombre de questions</span>
          <span id="val-nbq-pv" style="font:800 15px 'Manrope';color:var(--accent-2);">10</span>
        </div>
        <input type="range" min="5" max="30" value="10" id="sl-nbq-pv"
               oninput="document.getElementById('val-nbq-pv').textContent=this.value;pvSetCfg('nbQuestions',+this.value)"
               style="width:100%;accent-color:var(--accent);cursor:pointer;">
        <div style="display:flex;justify-content:space-between;margin-top:4px;
                    font:500 10px 'Manrope';color:var(--muted);">
          <span>5</span><span>30</span>
        </div>
      </div>

      <!-- CATÉGORIE -->
      <div style="margin-bottom:22px;">
        <div style="font:700 10px 'Manrope';letter-spacing:.18em;text-transform:uppercase;
                    color:var(--sub);margin-bottom:8px;">
          Catégorie
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;" id="grp-cat-pv">
          ${CATEGORIES.map(c => {
            const actif = c.id === 'mix';
            return `
              <button data-val="${c.id}" onclick="pvSetCfg('categorie','${c.id}')"
                      style="padding:8px 14px;border-radius:var(--radius-btn);cursor:pointer;
                             font:600 12px 'Manrope';transition:all .15s;
                             display:flex;align-items:center;justify-content:center;
                             text-align:center;line-height:1.25;
                             background:${actif?'var(--accent)':'var(--glass)'};
                             border:1px solid ${actif?'var(--accent)':'var(--glass-border)'};
                             color:${actif?'var(--btn-text)':'var(--sub)'};">
                ${c.label}
              </button>`;
          }).join('')}
        </div>
      </div>

      <!-- DIFFICULTÉ -->
      <div style="margin-bottom:22px;">
        <div style="font:700 10px 'Manrope';letter-spacing:.18em;text-transform:uppercase;
                    color:var(--sub);margin-bottom:8px;">
          Difficulté
        </div>
        <div style="display:flex;gap:8px;" id="grp-diff-pv">
          ${['facile','moyen','difficile'].map(d => {
            const actif = d === 'moyen';
            return `
              <button data-val="${d}" onclick="pvSetCfg('difficulte','${d}')"
                      style="flex:1;padding:10px;border-radius:var(--radius-btn);cursor:pointer;
                             font:700 12px 'Manrope';transition:all .15s;
                             display:flex;align-items:center;justify-content:center;
                             text-align:center;line-height:1.25;
                             background:${actif?'var(--accent)':'var(--glass)'};
                             border:1px solid ${actif?'var(--accent)':'var(--glass-border)'};
                             color:${actif?'var(--btn-text)':'var(--sub)'};">
                ${d.charAt(0).toUpperCase()+d.slice(1)}
              </button>`;
          }).join('')}
        </div>
      </div>

      <!-- CHRONO -->
      <div style="margin-bottom:22px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;
                    margin-bottom:8px;">
          <span style="font:700 10px 'Manrope';letter-spacing:.18em;text-transform:uppercase;
                       color:var(--sub);">Chrono par question</span>
          <span id="val-chrono-pv" style="font:800 15px 'Manrope';color:var(--accent-2);">20 s</span>
        </div>
        <input type="range" min="10" max="40" value="20" id="sl-chrono-pv"
               oninput="document.getElementById('val-chrono-pv').textContent=this.value+' s';pvSetCfg('chrono',+this.value)"
               style="width:100%;accent-color:var(--accent);cursor:pointer;">
        <div style="display:flex;justify-content:space-between;margin-top:4px;
                    font:500 10px 'Manrope';color:var(--muted);">
          <span>10 s</span><span>40 s</span>
        </div>
      </div>

      <!-- Info -->
      <div style="padding:10px 14px;border-radius:8px;background:var(--glass);
                  font:500 12px 'Manrope';color:var(--sub);">
        <i class="fa-solid fa-bolt"></i> Réponse simultanée · pouvoirs gagnés selon vos performances
      </div>
    </div>

    <!-- ═══ COLONNE DROITE : LOBBY ═══ -->
    <div style="display:flex;flex-direction:column;gap:14px;">

      <!-- CODE DE SALLE -->
      <div style="background:var(--card-bg);border:1px solid var(--card-border);
                  border-radius:16px;padding:22px 20px;text-align:center;
                  box-shadow:0 4px 20px var(--shadow-soft,rgba(0,0,0,.06));">
        <div style="font:700 10px 'Manrope';letter-spacing:.2em;text-transform:uppercase;
                    color:var(--sub);margin-bottom:10px;">
          Code de la salle
        </div>
        <div id="affich-code-pv"
             style="font:900 26px/1 'Manrope';letter-spacing:.14em;
                    color:var(--accent-2);margin-bottom:14px;word-break:break-all;">
          ——
        </div>
        <button id="btn-copier-pv" onclick="pvCopierCode()"
                style="padding:9px 18px;border-radius:8px;cursor:pointer;
                       font:700 11px 'Manrope';letter-spacing:.1em;
                       color:var(--accent);background:var(--glass);
                       border:1.5px solid var(--glass-border);transition:all .15s;">
          <i class="fa-solid fa-copy"></i> Copier le code
        </button>
      </div>

      <!-- LISTE JOUEURS -->
      <div style="background:var(--card-bg);border:1px solid var(--card-border);
                  border-radius:16px;padding:18px 20px;min-height:140px;
                  box-shadow:0 4px 20px var(--shadow-soft,rgba(0,0,0,.06));">
        <div style="font:700 10px 'Manrope';letter-spacing:.2em;text-transform:uppercase;
                    color:var(--sub);margin-bottom:12px;">
          Joueurs connectés
        </div>
        <div id="liste-joueurs-pv"></div>
        <div id="msg-attente-pv"
             style="font:500 12px 'Manrope';color:var(--muted);
                    text-align:center;margin-top:10px;">
          En attente d'au moins 1 autre joueur…
        </div>
      </div>

      <!-- BOUTON LANCER — désactivé tant que < 2 joueurs -->
      <button id="btn-lancer-pv" onclick="pvLancer()" disabled
              style="width:100%;padding:16px;border-radius:12px;cursor:not-allowed;
                     font:800 13px 'Manrope';letter-spacing:.12em;text-transform:uppercase;
                     background:var(--glass);
                     border:1.5px solid var(--glass-border);
                     color:var(--muted);opacity:.55;transition:all .2s;">
        LANCER LA PARTIE
      </button>

      <!-- RETOUR -->
      <button onclick="window.history.back()"
              style="width:100%;padding:11px;border-radius:10px;cursor:pointer;
                     font:600 12px 'Manrope';color:var(--sub);
                     background:transparent;border:1px solid transparent;
                     transition:all .15s;">
        ← Retour
      </button>
    </div>

  </div>
</div>
`;

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
export async function init() {
  window.pvSetCfg     = _setCfg;
  window.pvCopierCode = _copierCode;
  window.pvLancer      = _lancer;

  try {
    _client = await connectRealtime();
  } catch (e) { _client = null; }

  if (_client?.socket) {
    const pseudo = sessionStorage.getItem('champ_player_name')
                || sessionStorage.getItem('qpuc-pseudo')
                || 'Hôte';

    _client.socket.emit('pouvoirs:creer-salle', { pseudo, config: { nbJoueurs: cfg.nbJoueurs } }, (reponse) => {
      if (reponse?.ok && reponse?.code) {
        codeGenere = reponse.code;
        const el = document.getElementById('affich-code-pv');
        if (el) el.textContent = codeGenere;
        try {
          sessionStorage.setItem('champ_room_code',  codeGenere);
          sessionStorage.setItem('champ_host_id',    reponse.player?.id || _client.socket.id);
          sessionStorage.setItem('champ_player_id',  reponse.player?.id || _client.socket.id);
          sessionStorage.setItem('mode-multi-actif', 'pouvoirs');
          if (reponse.playerToken) sessionStorage.setItem('champ_room_player_token', reponse.playerToken);
        } catch (e) { /* ignore */ }
        joueursLobby = [{ id: reponse.player?.id || _client.socket.id, nom: pseudo, host: true }];
        _majListe();
        _majBtnLancer();
      } else {
        _afficherErreur(reponse?.erreur || 'Erreur de création de salle');
      }
    });

    _lobbyHandler = ({ joueurs }) => {
      joueursLobby = joueurs;
      _majListe();
      _majBtnLancer();
    };
    _client.socket.on('pouvoirs:lobby-update', _lobbyHandler);
  } else {
    _afficherErreur('Serveur indisponible');
  }
}

/* ══════════════════════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════════════════════ */
function _setCfg(cle, val) {
  cfg[cle] = val;
  try { playBtn?.(); } catch (e) { /* ignore */ }

  const groupes = { nbJoueurs: '#grp-joueurs-pv', categorie: '#grp-cat-pv', difficulte: '#grp-diff-pv' };
  const sel = groupes[cle];
  if (sel) {
    document.querySelectorAll(sel + ' button[data-val]').forEach(btn => {
      const actif = String(btn.dataset.val) === String(val);
      btn.style.background  = actif ? 'var(--accent)' : 'var(--glass)';
      btn.style.borderColor = actif ? 'var(--accent)' : 'var(--glass-border)';
      btn.style.color       = actif ? 'var(--btn-text)' : 'var(--sub)';
    });
  }
}

function _copierCode() {
  if (!codeGenere) return;
  navigator.clipboard?.writeText(codeGenere).catch(() => {});
  const btn = document.getElementById('btn-copier-pv');
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = '✓ Copié !';
  setTimeout(() => { btn.textContent = old; }, 2000);
}

function _majListe() {
  const c = document.getElementById('liste-joueurs-pv');
  const m = document.getElementById('msg-attente-pv');
  if (!c) return;

  c.innerHTML = joueursLobby.map((j, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;
                margin-bottom:6px;border-radius:8px;
                background:var(--glass);
                border:1px solid ${i===0?'var(--accent-2)':'var(--glass-border)'};">
      <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
                  background:var(--accent);display:flex;
                  align-items:center;justify-content:center;
                  font:700 11px 'Manrope';color:var(--btn-text);">
        ${esc((j.nom||'?')[0].toUpperCase())}
      </div>
      <span style="font:600 12px 'Manrope';color:var(--text);flex:1;">${esc(j.nom||'?')}</span>
      ${i===0?'<span style="font:700 9px \'Manrope\';color:var(--accent-2);letter-spacing:.1em;">HÔTE</span>':''}
    </div>
  `).join('');

  if (m) {
    if (joueursLobby.length >= 2) {
      m.style.display = 'none';
    } else {
      m.style.display = 'block';
      m.textContent = `${joueursLobby.length} joueur connecté · au moins 2 requis pour lancer`;
    }
  }
}

function _majBtnLancer() {
  const btn = document.getElementById('btn-lancer-pv');
  if (!btn) return;

  const peutLancer = joueursLobby.length >= 2 && !!_client?.socket;

  btn.disabled          = !peutLancer;
  btn.style.cursor      = peutLancer ? 'pointer'       : 'not-allowed';
  btn.style.opacity     = peutLancer ? '1'             : '.55';
  btn.style.background  = peutLancer ? 'var(--accent)' : 'var(--glass)';
  btn.style.color       = peutLancer ? 'var(--btn-text)' : 'var(--muted)';
  btn.style.borderColor = peutLancer ? 'var(--accent)' : 'var(--glass-border)';
  btn.style.boxShadow   = peutLancer ? '0 4px 14px var(--shadow,rgba(0,0,0,.12))' : 'none';
  btn.textContent       = peutLancer
    ? `LANCER LA PARTIE (${joueursLobby.length} joueurs)`
    : 'LANCER LA PARTIE';
}

async function _lancer() {
  if (_launchInFlight) return;
  if (joueursLobby.length < 2) return;
  if (!_client?.socket) return;

  _launchInFlight = true;
  const btnLock = document.getElementById('btn-lancer-pv');
  if (btnLock) { btnLock.disabled = true; btnLock.style.opacity = '.6'; btnLock.style.cursor = 'not-allowed'; }

  try { playBtn?.(); } catch (e) { /* ignore */ }

  mergeState({
    modePouvoirs: {
      code:        codeGenere,
      nbJoueurs:   cfg.nbJoueurs,
      nbQuestions: cfg.nbQuestions,
      categorie:   cfg.categorie,
      difficulte:  cfg.difficulte,
    },
    players: joueursLobby,
  });

  const memoriserDebut = payload => {
    try {
      sessionStorage.setItem('pouvoirs_debut_payload', JSON.stringify(payload || {}));
    } catch (e) {
      /* ignore */
    }
    _client.socket.off('pouvoirs:debut', memoriserDebut);
  };

  _client.socket.on('pouvoirs:debut', memoriserDebut);
  _client.socket.emit('pouvoirs:lancer-partie', { code: codeGenere, config: cfg }, (reponse) => {
    if (!reponse?.ok) {
      _client.socket.off('pouvoirs:debut', memoriserDebut);
      _launchInFlight = false;
      if (btnLock) { btnLock.disabled = false; btnLock.style.opacity = '1'; btnLock.style.cursor = 'pointer'; }
      _afficherErreur(reponse?.erreur || 'Impossible de lancer la partie');
      return;
    }
    setTimeout(() => _client?.socket?.off('pouvoirs:debut', memoriserDebut), 1000);
    naviguer('intro-pouvoirs.html');
  });
}

function _afficherErreur(msg) {
  const el = document.getElementById('affich-code-pv');
  if (!el) return;
  el.innerHTML = '';
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-triangle-exclamation';
  el.appendChild(icon);
  el.appendChild(document.createTextNode(' ' + msg));
}

/* ══════════════════════════════════════════════════════════
   CLEANUP
══════════════════════════════════════════════════════════ */
export function cleanup() {
  delete window.pvSetCfg;
  delete window.pvCopierCode;
  delete window.pvLancer;
  if (_client?.socket && _lobbyHandler) {
    _client.socket.off('pouvoirs:lobby-update', _lobbyHandler);
  }
  _lobbyHandler = null;
}
