/* ══════════════════════════════════════════════════════════
   jeu-pouvoirs.js — Mode Pouvoirs complet
   Chrono 20s · Pouvoirs (éclair/bouclier/pression/indice)
   Buzzer = buzz d'abord, puis répondre (clic option = réponse finale)
══════════════════════════════════════════════════════════ */

import { naviguer }              from '../routeur.js';
import { getState, mergeState }  from '../state.js';
import { loadQuestions }         from '../questions-service.js';
import { playBtn }               from '../audio-hooks.js';
import { playCorrect, playWrong } from '../sound.js';
import { connectRealtime }       from '../realtime-client.js';
import { attachParisStage, PARIS_MOBILE_BREAKPOINT } from '../paris-stage.js';
import { forcerPleinEcranPouvoirs, restaurerLayoutPouvoirs } from '../pouvoirs-fullscreen.js';
import { esc }                   from '../utils.js';
import { POUVOIRS_COLORS }       from '../theme-paris-pouvoirs.js';

export const titre = 'Mode Pouvoirs';

const IMG = './assets/img/pouvoirs/';

const POUVOIR_DATA = {
  eclair:   { img: `${IMG}reponse_eclair.png`,       color: POUVOIRS_COLORS.eclair,   nom: 'Réponse Éclair',       desc: 'Double les points de votre prochaine bonne réponse', label: 'RÉPONSE ÉCLAIR !' },
  bouclier: { img: `${IMG}bouclier_de_savoir.png`,   color: POUVOIRS_COLORS.bouclier, nom: 'Bouclier de Savoir',    desc: 'Protège contre une mauvaise réponse',                 label: 'BOUCLIER ACTIVÉ !' },
  pression: { img: `${IMG}pression_mentale.png`,     color: POUVOIRS_COLORS.pression, nom: 'Pression Mentale',      desc: 'Réduit le chrono d’un adversaire de 5s',         label: 'PRESSION MENTALE !' },
  indice:   { img: `${IMG}indice_supplementaire.png`, color: POUVOIRS_COLORS.indice,   nom: 'Indice Supplémentaire', desc: 'Élimine une mauvaise réponse',                        label: 'INDICE RÉVÉLÉ !' },
};

const POUVOIR_FLASH_COLOR = {
  eclair:   'rgba(61,200,122,.35)',
  bouclier: 'rgba(74,144,226,.35)',
  pression: 'rgba(232,90,58,.35)',
  indice:   'rgba(155,89,182,.35)',
};

const COULEURS_JOUEURS = ['#2ECC71', '#3498DB', '#E74C3C', '#9B59B6'];
const LETTRES = ['A', 'B', 'C', 'D'];
const TIMER_CIRC = 163.4;

/* ── État interne ── */
const _S = {
  joueurs:          [],
  questions:        [],
  indexQ:           0,
  nbQuestions:      10,
  phase:            'attente',
  modeMulti:        false,
  localIdx:         0,
  optionsCourantes: [],
  indexCorrect:     null,
  optionEliminee:   null,
  reponseLocale:    null,
  timerInterval:    null,
  timerVal:         20,
  chronoBase:       20,
  allTimers:        [],
  nettoyages:       [],
  client:           null,
  stageClean:       null,
  ecranActif:       false,
  isMobile:         false,
  mobileHasBuzzed:  false,
  mobileOpts:       [],
  desktopHasBuzzed: false,
};

function _detectMobile() {
  return window.matchMedia(`(max-width:${PARIS_MOBILE_BREAKPOINT}px)`).matches;
}

function _push(fn) { if (typeof fn === 'function') _S.nettoyages.push(fn); }
function _pushTimer(t) { _S.allTimers.push(t); }

/* ── HTML ── */
export const html = `
<div class="pouvoirs-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;z-index:9999;overflow:hidden;background:${POUVOIRS_COLORS.bg};">
  <div id="pouvoirs-stage"
       style="width:1920px;height:1080px;position:absolute;left:50%;top:50%;
              transform-origin:center center;background:${POUVOIRS_COLORS.bg};
              font-family:'Manrope',sans-serif;overflow:hidden;">

    <!-- Fonds -->
    <div style="position:absolute;inset:0;z-index:0;
                background:radial-gradient(ellipse 64% 60% at 50% 116%,rgba(123,57,184,.40) 0%,transparent 58%),
                           radial-gradient(ellipse 52% 46% at 50% 34%,rgba(107,47,217,.16) 0%,transparent 64%);"></div>
    <img src="${IMG}fond.png" alt=""
         style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
                pointer-events:none;z-index:0;">

    <!-- TOPBAR -->
    <div style="position:relative;z-index:5;height:72px;display:flex;align-items:center;
                padding:0 44px;background:rgba(10,0,26,.92);
                border-bottom:1px solid rgba(200,168,75,.22);">
      <div style="display:flex;align-items:center;gap:11px;font:800 15px/1 'Manrope';
                  letter-spacing:.2em;text-transform:uppercase;color:#FFF;">
        <i class="fa-solid fa-bolt"></i> Mode Pouvoirs
      </div>
      <div style="position:absolute;left:50%;transform:translateX(-50%);
                  display:flex;align-items:center;gap:16px;font:700 18px/1 'Manrope';color:#fff;">
        <span style="width:60px;height:1px;background:linear-gradient(90deg,transparent,rgba(200,168,75,.55));"></span>
        <span style="width:7px;height:7px;background:#C8A84B;transform:rotate(45deg);"></span>
        <span>Question <span id="pv-q-num-actuel" style="color:#FFE500;">1</span>
              <span style="color:rgba(255,255,255,.4);"> / </span>
              <span id="pv-q-num-total" style="color:rgba(255,255,255,.55);">10</span></span>
        <span style="width:7px;height:7px;background:#C8A84B;transform:rotate(45deg);"></span>
        <span style="width:60px;height:1px;background:linear-gradient(90deg,rgba(200,168,75,.55),transparent);"></span>
      </div>
      <div style="margin-left:auto;position:relative;width:60px;height:60px;">
        <svg viewBox="0 0 60 60" width="60" height="60"
             style="position:absolute;inset:0;filter:drop-shadow(0 0 8px rgba(240,180,41,.45));">
          <circle cx="30" cy="30" r="26" fill="rgba(10,0,26,.85)"
                  stroke="rgba(200,168,75,.30)" stroke-width="1.5"></circle>
          <circle id="pv-timer-ring" cx="30" cy="30" r="26" fill="none" stroke="#F0B429"
                  stroke-width="4" stroke-linecap="round" stroke-dasharray="${TIMER_CIRC}"
                  stroke-dashoffset="0" transform="rotate(-90 30 30)"></circle>
        </svg>
        <span id="pv-timer-val"
              style="position:absolute;inset:0;display:flex;align-items:center;
                     justify-content:center;font:800 21px/1 'Manrope';color:#FFE500;">20</span>
      </div>
    </div>

    <!-- MAIN -->
    <div style="position:relative;z-index:4;height:calc(1080px - 72px);
                display:flex;flex-direction:column;align-items:center;
                justify-content:space-between;padding:22px 230px 26px;">

      <!-- QUESTION CARD -->
      <div style="position:relative;width:100%;background:#F2EDE0;
                  border:1.5px solid rgba(200,168,75,.5);border-radius:16px;
                  padding:30px 56px 34px;box-shadow:0 6px 30px rgba(0,0,0,.4);overflow:hidden;">
        ${['top:12px;left:12px;border-top:2px solid #C8A84B;border-left:2px solid #C8A84B;',
           'top:12px;right:12px;border-top:2px solid #C8A84B;border-right:2px solid #C8A84B;',
           'bottom:12px;left:12px;border-bottom:2px solid #C8A84B;border-left:2px solid #C8A84B;',
           'bottom:12px;right:12px;border-bottom:2px solid #C8A84B;border-right:2px solid #C8A84B;'
          ].map(s => `<div style="position:absolute;width:22px;height:22px;${s}"></div>`).join('')}
        <div style="position:relative;display:flex;align-items:center;justify-content:center;
                    gap:14px;margin-bottom:18px;">
          <span style="width:40px;height:1px;background:rgba(123,79,166,.4);"></span>
          <span style="width:6px;height:6px;background:#7B4FA6;transform:rotate(45deg);"></span>
          <span id="pv-q-categorie"
                style="font:700 15px/1 'Manrope';letter-spacing:.24em;text-transform:uppercase;
                       color:#7B4FA6;">Chargement…</span>
          <span style="width:6px;height:6px;background:#7B4FA6;transform:rotate(45deg);"></span>
          <span style="width:40px;height:1px;background:rgba(123,79,166,.4);"></span>
        </div>
        <div id="pv-q-texte"
             style="font:800 46px/1.18 'Bricolage Grotesque','Manrope';
                    color:#1A1010;text-align:center;">Chargement…</div>
      </div>

      <!-- OPTIONS A/B/C/D -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;width:100%;"
           id="pv-options">
        ${['A','B','C','D'].map((l, i) => `
          <div data-option="${i}" style="position:relative;cursor:pointer;transition:transform .15s;">
            <img src="${IMG}option_${l}.png" alt="Option ${l}"
                 style="width:100%;height:auto;display:block;pointer-events:none;
                        filter:drop-shadow(0 6px 16px rgba(0,0,0,.4));transition:filter .2s,opacity .2s;">
            <span data-reponse-txt="${i}"
                  style="position:absolute;left:27%;right:8%;top:50%;transform:translateY(-50%);
                         text-align:center;font:700 30px/1.2 'Manrope';color:#1A1010;
                         pointer-events:none;">—</span>
          </div>
        `).join('')}
      </div>

      <!-- POUVOIRS + BUZZER (BUZZ AVANT DE RÉPONDRE) -->
      <div id="pv-panel-pouvoirs"
           style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;
                  width:100%;padding:22px 34px;background:rgba(10,0,26,.5);
                  border:1px solid rgba(200,168,75,.25);border-radius:18px;">
        <div id="pv-slot-0" style="display:flex;align-items:center;gap:20px;min-height:80px;">
          <div style="color:rgba(255,255,255,.55);font:500 13px 'Manrope';font-style:italic;">Aucun pouvoir</div>
        </div>
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;
                    justify-content:center;gap:12px;">
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;top:50%;left:50%;width:230px;height:230px;border-radius:50%;
                         border:2px solid rgba(255,80,80,.5);transform:translate(-50%,-50%);
                         animation:pv-ring 2s ease-out infinite;pointer-events:none;"></span>
            <span style="position:absolute;top:50%;left:50%;width:230px;height:230px;border-radius:50%;
                         border:2px solid rgba(255,80,80,.5);transform:translate(-50%,-50%);
                         animation:pv-ring 2s ease-out 1s infinite;pointer-events:none;"></span>
            <button id="pv-buzzer" type="button" aria-label="Buzzer, appuyez pour répondre"
                 style="position:relative;width:236px;height:auto;cursor:pointer;
                        animation:pv-pulse 1.4s ease-in-out infinite;
                        transition:transform .1s,filter .1s;
                        background:none;border:none;padding:0;">
              <img src="${IMG}buzzer.png" alt="" style="width:100%;height:auto;display:block;pointer-events:none;">
            </button>
          </div>
          <div id="pv-buzzer-hint"
               style="font:800 13px/1 'Manrope';letter-spacing:.16em;text-transform:uppercase;
                      color:#C8A84B;text-align:center;">Buzzez pour répondre</div>
        </div>
        <div id="pv-slot-1" style="display:flex;align-items:center;gap:20px;
                                    justify-content:flex-end;min-height:80px;">
          <div style="color:rgba(255,255,255,.55);font:500 13px 'Manrope';font-style:italic;
                      text-align:right;">Aucun pouvoir</div>
        </div>
      </div>

      <!-- SCORES JOUEURS -->
      <div style="display:flex;flex-direction:column;gap:10px;width:100%;">
        <div style="display:flex;align-items:center;gap:10px;font:700 11px/1 'Manrope';
                    letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55);">
          <span>Classement</span>
          <span style="flex:1;height:1px;background:rgba(200,168,75,.2);"></span>
        </div>
        <div id="pv-scores-grid"
             style="display:grid;gap:18px;width:100%;"></div>
      </div>

    </div>

    <!-- OVERLAY ATTENTE MULTI -->
    <div id="pv-overlay-attente"
         style="display:none;position:absolute;inset:0;z-index:200;
                background:rgba(5,0,12,.85);backdrop-filter:blur(6px);
                flex-direction:column;align-items:center;justify-content:center;gap:16px;">
      <div style="font:800 28px/1 'Bricolage Grotesque';letter-spacing:.2em;color:#FFE500;">MODE POUVOIRS</div>
      <div style="font:600 14px/1 'Manrope';color:rgba(255,255,255,.65);">Préparation de la manche…</div>
      <div style="display:flex;gap:8px;">
        ${[0,1,2].map(i => `
          <div style="width:8px;height:8px;border-radius:50%;background:#C8A84B;
                      animation:pvPretPulse 1.4s ease-in-out ${i*.2}s infinite;"></div>
        `).join('')}
      </div>
    </div>

  </div>

  <!-- ════ LAYOUT MOBILE NATIF < 760px ════ -->
  <div id="pv-mobile-root"
       style="display:none;position:fixed;inset:0;z-index:300;
              background:${POUVOIRS_COLORS.bg};flex-direction:column;
              font-family:'Manrope',sans-serif;overflow:hidden;">

    <div style="position:absolute;inset:0;z-index:0;pointer-events:none;
                background:radial-gradient(ellipse 70% 50% at 50% 100%,
                  rgba(107,47,217,.25) 0%,transparent 65%);"></div>

    <!-- TOPBAR -->
    <div style="position:relative;z-index:5;flex-shrink:0;
                padding:calc(10px + env(safe-area-inset-top,0px)) 14px 8px;
                background:rgba(5,0,12,.88);border-bottom:1px solid rgba(200,168,75,.2);
                display:flex;align-items:center;gap:10px;">

      <div style="font:800 13px/1 'Manrope';letter-spacing:.14em;
                  text-transform:uppercase;color:#FFE500;flex:1;"><i class="fa-solid fa-bolt"></i> MODE POUVOIRS</div>

      <div id="pvm-q-num"
           style="font:700 11px/1 'Manrope';letter-spacing:.1em;
                  color:rgba(200,168,75,.7);">Q 1 / 10</div>

      <div style="position:relative;width:42px;height:42px;">
        <svg viewBox="0 0 42 42" style="position:absolute;inset:0;">
          <circle cx="21" cy="21" r="18" fill="rgba(5,0,12,.9)"
                  stroke="rgba(200,168,75,.22)" stroke-width="3"></circle>
          <circle id="pvm-timer-ring" cx="21" cy="21" r="18" fill="none"
                  stroke="#FFE500" stroke-width="3" stroke-linecap="round"
                  stroke-dasharray="113" stroke-dashoffset="0"
                  transform="rotate(-90 21 21)"></circle>
        </svg>
        <span id="pvm-timer-val"
              style="position:absolute;inset:0;display:flex;align-items:center;
                     justify-content:center;font:800 16px/1 'Manrope';color:#FFE500;">20</span>
      </div>
    </div>

    <!-- QUESTION -->
    <div style="position:relative;z-index:5;flex-shrink:0;
                padding:14px 16px 10px;">
      <div id="pvm-q-cat"
           style="font:700 9px/1 'Manrope';letter-spacing:.22em;text-transform:uppercase;
                  color:rgba(107,47,217,.85);margin-bottom:8px;text-align:center;"></div>
      <div id="pvm-q-texte"
           style="font:700 clamp(16px,4.5vw,22px)/1.35 'Manrope';color:rgba(255,255,255,.94);
                  text-align:center;padding:0 4px;">Chargement...</div>
    </div>

    <!-- BANDEAU ADVERSAIRES -->
    <div id="pvm-opponents"
         style="position:relative;z-index:5;flex-shrink:0;
                display:flex;gap:8px;padding:8px 12px;
                overflow-x:auto;-webkit-overflow-scrolling:touch;"></div>

    <!-- PHASE BUZZ -->
    <div id="pvm-phase-buzz"
         style="position:relative;z-index:5;flex:1;display:flex;
                flex-direction:column;align-items:center;justify-content:center;gap:12px;
                padding:0 20px;">

      <div style="font:500 12px 'Manrope';color:rgba(255,255,255,.55);letter-spacing:.1em;">
        Appuyez quand vous êtes prêt à répondre
      </div>

      <div style="position:relative;">
        <div style="position:absolute;top:50%;left:50%;width:160px;height:160px;
                    border-radius:50%;border:2px solid rgba(255,80,80,.4);
                    transform:translate(-50%,-50%);
                    animation:pvMBuzzRing 2s ease-out infinite;pointer-events:none;"></div>
        <button id="pvm-buzzer-btn" type="button" aria-label="Buzzer, appuyez pour répondre"
             style="width:140px;height:auto;cursor:pointer;
                    animation:pvMBuzzPulse 1.5s ease-in-out infinite;
                    -webkit-tap-highlight-color:transparent;
                    background:none;border:none;padding:0;">
          <img src="${IMG}buzzer.png" alt="" style="width:100%;height:auto;display:block;pointer-events:none;">
        </button>
      </div>
    </div>

    <!-- PHASE OPTIONS -->
    <div id="pvm-phase-options"
         style="display:none;position:relative;z-index:5;flex:1;
                flex-direction:column;padding:8px 12px;gap:8px;overflow-y:auto;">

      <div id="pvm-options-grid"
           style="display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1;align-content:start;">
      </div>

      <button id="pvm-confirmer" disabled
              style="margin-top:6px;width:100%;min-height:52px;border-radius:12px;
                     border:1.5px solid rgba(200,168,75,.25);
                     background:rgba(200,168,75,.07);
                     font:800 14px/1 'Manrope';letter-spacing:.14em;text-transform:uppercase;
                     color:rgba(200,168,75,.35);cursor:not-allowed;
                     flex-shrink:0;-webkit-tap-highlight-color:transparent;">
        Choisir une réponse
      </button>
    </div>

    <!-- MES POUVOIRS -->
    <div style="position:relative;z-index:5;flex-shrink:0;
                padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px));
                background:rgba(5,0,12,.88);
                border-top:1px solid rgba(200,168,75,.18);">

      <div style="font:700 9px/1 'Manrope';letter-spacing:.2em;text-transform:uppercase;
                  color:rgba(200,168,75,.5);margin-bottom:8px;">MES POUVOIRS</div>

      <div id="pvm-mes-pouvoirs"
           style="display:flex;gap:10px;align-items:center;min-height:60px;">
        <div style="font:500 11px 'Manrope';color:rgba(255,255,255,.55);font-style:italic;">
          Aucun pouvoir pour l'instant
        </div>
      </div>
    </div>

  </div>

</div>
`;

/* ── INIT ── */
export async function init() {
  cleanup();
  _S.ecranActif = true;
  _push(() => { _S.ecranActif = false; });

  forcerPleinEcranPouvoirs(POUVOIRS_COLORS.bg);
  _injecterStyles();
  _injecterFonts();

  const stageEl = document.getElementById('pouvoirs-stage');
  if (stageEl) _push(attachParisStage(stageEl));

  const state    = getState();
  const modeConf = state.modePouvoirs || {};
  _S.nbQuestions = Math.max(1, Number(modeConf.nbQuestions) || 10);
  _S.modeMulti   = sessionStorage.getItem('mode-multi-actif') === 'pouvoirs';
  _S.localIdx    = 0;

  const rawPlayers = (state.players?.length ? state.players : [
    { id: 1, name: 'Joueur 1', colorIdx: 0 },
    { id: 2, name: 'Joueur 2', colorIdx: 1 },
  ]).slice(0, 4);

  _S.joueurs = rawPlayers.map((p, i) => ({
    id:       p.id ?? i + 1,
    nom:      p.name || p.nom || `Joueur ${i + 1}`,
    colorIdx: p.colorIdx ?? i,
    score:    0,
    stack:    [],
    confirme: false,
  }));

  _construireScores();
  _afficherSlots();

  const buzzer = document.getElementById('pv-buzzer');
  if (buzzer) {
    buzzer.addEventListener('pointerdown', () => {
      buzzer.style.transform = 'scale(.9)';
      buzzer.style.filter    = 'brightness(.95) drop-shadow(0 0 26px rgba(255,60,60,.7))';
    });
    ['pointerup', 'pointerleave'].forEach(ev =>
      buzzer.addEventListener(ev, () => { buzzer.style.transform = ''; buzzer.style.filter = ''; })
    );
    buzzer.addEventListener('click', _onBuzzDesktop);
  }

  _S.isMobile = _detectMobile();
  const _onResizeMobile = () => {
    const nowMobile = _detectMobile();
    if (nowMobile !== _S.isMobile) {
      _S.isMobile = nowMobile;
      _switchMobile(_S.isMobile);
      if (_S.isMobile) _rafraichirToutMobile();
    }
  };
  window.addEventListener('resize', _onResizeMobile);
  window.addEventListener('orientationchange', _onResizeMobile);
  _push(() => {
    window.removeEventListener('resize', _onResizeMobile);
    window.removeEventListener('orientationchange', _onResizeMobile);
  });
  _switchMobile(_S.isMobile);

  const buzzerMobile = document.getElementById('pvm-buzzer-btn');
  if (buzzerMobile) {
    buzzerMobile.addEventListener('pointerdown', () => {
      buzzerMobile.style.transform = 'scale(.9)';
      buzzerMobile.style.filter    = 'brightness(.9) drop-shadow(0 0 20px rgba(200,168,75,.7))';
    });
    ['pointerup', 'pointerleave'].forEach(ev =>
      buzzerMobile.addEventListener(ev, () => {
        buzzerMobile.style.transform = '';
        buzzerMobile.style.filter    = '';
      })
    );
    buzzerMobile.addEventListener('click', () => {
      if (_S.phase !== 'mise') return;
      const localJ = _S.joueurs[_S.localIdx];
      if (localJ?.confirme) return;
      if (!_S.mobileHasBuzzed) {
        _S.mobileHasBuzzed = true;
        _montrerPhaseOptions();
        playBtn?.();
      }
    });
  }

  document.getElementById('pvm-confirmer')?.addEventListener('click', () => {
    if (_S.phase !== 'mise') return;
    if (_S.reponseLocale === null) return;
    _onConfirmer();
    _verrouilerPostConfirmMobile();
  });

  if (_S.modeMulti) {
    _S.client = await connectRealtime().catch(() => null);
    _gererReconnexionSocket();
    _afficherOverlayAttente(true);

    try {
      const payloadMemoire = JSON.parse(sessionStorage.getItem('pouvoirs_debut_payload') || 'null');
      if (payloadMemoire?.joueurs?.length) _onDebut(payloadMemoire);
    } catch (e) { /* ignore */ }

    if (_S.client?.socket) _brancherSocket();
  } else {
    const categorieConfig  = modeConf.categorie  || '';
    const difficulteConfig = modeConf.difficulte || '';
    _S.questions = await loadQuestions({
      category:   categorieConfig === 'mix' ? '' : categorieConfig,
      difficulty: difficulteConfig,
      limit:      Math.max(30, _S.nbQuestions * 3),
      fallback:   (getState().DEMO?.QUESTIONS || []),
    }).then(pool => pool.slice(0, _S.nbQuestions));
    _S.indexQ = 0;
    _demarrerQuestionLocale();
  }
}

/* ── Affichage d'une question (texte + options) ── */
function _afficherQuestion(texte, categorie, options) {
  const appliquer = () => {
    // Retirer tous les badges de coche laissés par la question précédente
    document.querySelectorAll('[data-pv-coche-badge]').forEach(b => b.remove());

    _S.optionsCourantes  = options || [];
    _S.optionEliminee    = null;
    _S.reponseLocale     = null;
    _S.desktopHasBuzzed  = false;
    _S.joueurs.forEach(j => { j.confirme = false; });

    const qEl  = document.getElementById('pv-q-texte');
    const cEl  = document.getElementById('pv-q-categorie');
    const nEl  = document.getElementById('pv-q-num-actuel');
    const tEl  = document.getElementById('pv-q-num-total');
    if (qEl) qEl.textContent = texte || '';
    if (cEl) cEl.textContent = categorie || 'Culture générale';
    if (nEl) nEl.textContent = _S.indexQ + 1;
    if (tEl) tEl.textContent = _S.nbQuestions;

    document.querySelectorAll('[data-selection-overlay], [data-confirm-badge]').forEach(el => el.remove());
    _afficherOptions(options || [], -1, false);
    _majScores();
    _afficherSlots();
    _reinitialiserBuzzer();

    const buzzer = document.getElementById('pv-buzzer');
    if (buzzer) {
      buzzer.style.opacity       = '1';
      buzzer.style.pointerEvents = 'auto';
    }
    const buzzerHint = document.getElementById('pv-buzzer-hint');
    if (buzzerHint) {
      buzzerHint.textContent = 'Buzzez pour répondre';
      buzzerHint.style.color = '#C8A84B';
    }

    _S.phase = 'mise';

    _S.mobileOpts = options || [];
    if (_S.isMobile) {
      _majMobileHeader();
      _majAdversairesMobile();
      _reinitPhaseBuzz();
      _majPouvoirsMobile();
    }
  };

  if (_S.indexQ > 0) {
    _transitionVersNouvelleQuestion(appliquer);
  } else {
    appliquer();
  }
}

function _afficherOptions(opts, indexCorrect, reveal) {
  if (reveal) {
    document.querySelectorAll('[data-selection-overlay], [data-confirm-badge]').forEach(el => el.remove());
    document.querySelectorAll('[data-option]').forEach((el, i) => {
      const txt = el.querySelector('[data-reponse-txt]');
      if (txt) txt.textContent = opts[i] || '—';
    });
    _revelerOptionsDesktop(indexCorrect);
    return;
  }

  document.querySelectorAll('[data-option]').forEach((el, i) => {
    const txt = el.querySelector('[data-reponse-txt]');
    const img = el.querySelector('img');
    const estEliminee     = _S.optionEliminee === i;
    const estSelectionnee = i === _S.reponseLocale;
    if (txt) txt.textContent = opts[i] || '—';

    if (estEliminee) {
      el.style.opacity       = '0.25';
      el.style.pointerEvents = 'none';
      if (img) { img.style.filter = 'grayscale(1) brightness(.5)'; img.style.transform = ''; }
    } else if (!_S.desktopHasBuzzed) {
      // Verrouillé tant que le buzzer n'a pas été pressé
      el.style.opacity       = '0.4';
      el.style.pointerEvents = 'none';
      if (img) { img.style.filter = 'grayscale(.45) brightness(.75)'; img.style.transform = ''; }
    } else if (estSelectionnee) {
      el.style.opacity       = '1';
      el.style.pointerEvents = 'auto';
      if (img) {
        img.style.filter    = 'drop-shadow(0 0 28px rgba(200,168,75,.9)) brightness(1.1)';
        img.style.transform = 'scale(1.04) translateY(-3px)';
      }
    } else if (_S.reponseLocale === null) {
      // Aucune sélection encore faite — état neutre
      el.style.opacity       = '1';
      el.style.pointerEvents = 'auto';
      if (img) { img.style.filter = 'drop-shadow(0 6px 16px rgba(0,0,0,.4))'; img.style.transform = ''; }
    } else {
      el.style.opacity       = '0.55';
      el.style.pointerEvents = 'auto';
      if (img) { img.style.filter = 'grayscale(.3) brightness(.85)'; img.style.transform = ''; }
    }
  });

  document.querySelectorAll('[data-option]').forEach((el, i) => {
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('pointerdown', () => { clone.style.transform = 'scale(.98)'; });
    ['pointerup', 'pointerleave'].forEach(ev =>
      clone.addEventListener(ev, () => { clone.style.transform = ''; })
    );
    clone.addEventListener('click', () => _onChoisirOption(i));
  });
}

/**
 * Séquence de révélation fluide (desktop) : dim progressif, puis glow
 * vert pulsant + coche sur la bonne réponse, shake + rouge sur la
 * réponse du joueur local si elle est fausse.
 */
function _revelerOptionsDesktop(indexCorrect) {
  const maRep = _S.reponseLocale;

  document.querySelectorAll('[data-option]').forEach((el, idx) => {
    const img = el.querySelector('img');
    if (!img) return;

    img.style.transition    = 'filter .35s ease, transform .35s cubic-bezier(.2,1,.4,1), opacity .3s ease';
    el.style.transition     = 'opacity .3s ease';
    el.style.pointerEvents  = 'none';

    if (idx === indexCorrect) {
      const t1 = setTimeout(() => {
        if (!_S.ecranActif) return;
        img.style.filter    = 'drop-shadow(0 0 6px rgba(39,174,96,.4))';
        img.style.transform = 'scale(1)';
        el.style.opacity    = '1';

        const t2 = setTimeout(() => {
          if (!_S.ecranActif) return;
          img.style.filter    = 'drop-shadow(0 0 32px rgba(39,174,96,1)) saturate(1.2)';
          img.style.transform = 'scale(1.06)';
          document.querySelectorAll('[data-pv-coche-badge]').forEach(b => b.remove());
          _ajouterCocheAnimee(el);

          const t3 = setTimeout(() => {
            if (img) img.style.transform = 'scale(1.0)';
          }, 260);
          _pushTimer(t3);
        }, 60);
        _pushTimer(t2);
      }, 280);
      _pushTimer(t1);
    } else {
      const t = setTimeout(() => {
        if (!_S.ecranActif) return;
        img.style.filter = 'drop-shadow(0 0 12px rgba(231,76,60,.5)) brightness(.8)';
        el.style.opacity = idx === maRep ? '1' : '0.4';

        if (idx === maRep && maRep !== indexCorrect) {
          img.style.animation = 'pvShakeWrong .4s ease';
          const t2 = setTimeout(() => { if (img) img.style.animation = ''; }, 420);
          _pushTimer(t2);
        }
      }, 280);
      _pushTimer(t);
    }
  });
}

/**
 * Ajoute une coche verte animée en surimpression de l'option correcte.
 */
function _ajouterCocheAnimee(el) {
  const badge = document.createElement('div');
  badge.dataset.pvCocheBadge = '1';
  badge.style.cssText = `
    position: absolute;
    top: -14px;
    right: -14px;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3DC87A, #1a8a4a);
    border: 3px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font: 900 22px/1 sans-serif;
    color: #fff;
    box-shadow: 0 0 18px rgba(61,200,122,.8);
    animation: pvCochePop .4s cubic-bezier(.2,1.4,.4,1) both;
    z-index: 20;
    pointer-events: none;
  `;
  badge.textContent = '✓';
  el.appendChild(badge);
}

function _onChoisirOption(i) {
  if (_S.phase !== 'mise') return;
  if (!_S.desktopHasBuzzed) return; // il faut buzzer avant de pouvoir répondre
  const localJ = _S.joueurs[_S.localIdx];
  if (!localJ || localJ.confirme) return;
  if (_S.optionEliminee === i) return;

  _S.reponseLocale = i;
  playBtn?.();

  document.querySelectorAll('[data-option]').forEach((optEl, optIdx) => {
    const img = optEl.querySelector('img');
    if (!img) return;

    const estEliminee     = _S.optionEliminee === optIdx;
    const estSelectionnee = optIdx === i;

    if (estEliminee) {
      optEl.style.opacity       = '0.25';
      optEl.style.pointerEvents = 'none';
      img.style.filter          = 'grayscale(1) brightness(.5)';
      img.style.transform       = '';
    } else if (estSelectionnee) {
      optEl.style.opacity       = '1';
      optEl.style.pointerEvents = 'auto';
      img.style.filter          = 'drop-shadow(0 0 28px rgba(200,168,75,.9)) brightness(1.1)';
      img.style.transform       = 'scale(1.04) translateY(-3px)';
      img.style.transition      = 'filter .2s ease, transform .18s cubic-bezier(.2,1.2,.4,1)';
    } else {
      optEl.style.opacity       = '0.55';
      optEl.style.pointerEvents = 'auto';
      img.style.filter          = 'grayscale(.3) brightness(.85)';
      img.style.transform       = '';
      img.style.transition      = 'filter .15s ease, transform .15s ease';
    }
  });

  _afficherOverlaySelection(i);

  // Une fois buzzé, choisir une option est la réponse finale — verrouillage immédiat
  _onConfirmer();
}

/**
 * Premier clic sur le buzzer : "buzz" pour obtenir le droit de répondre.
 * Déverrouille les options (jusque-là non cliquables) ; le buzzer
 * lui-même devient inactif, son rôle étant consommé pour la question.
 */
function _onBuzzDesktop() {
  if (_S.phase !== 'mise') return;
  if (_S.desktopHasBuzzed) return;
  const localJ = _S.joueurs[_S.localIdx];
  if (!localJ || localJ.confirme) return;

  _S.desktopHasBuzzed = true;
  playBtn?.();

  const buzzer = document.getElementById('pv-buzzer');
  if (buzzer) {
    buzzer.style.animation     = 'none';
    buzzer.style.opacity       = '.4';
    buzzer.style.pointerEvents = 'none';
    buzzer.style.filter        = 'grayscale(.6) brightness(.8)';
  }
  const buzzerHint = document.getElementById('pv-buzzer-hint');
  if (buzzerHint) {
    buzzerHint.textContent = 'À vous de répondre !';
    buzzerHint.style.color = '#3DC87A';
  }

  _afficherOptions(_S.optionsCourantes, -1, false);
}

/**
 * Affiche un badge animé avec la lettre sélectionnée (A/B/C/D)
 * en surimpression sur l'option choisie.
 */
function _afficherOverlaySelection(optionIdx) {
  document.querySelectorAll('[data-selection-overlay]').forEach(el => el.remove());

  const optEl = document.querySelector(`[data-option="${optionIdx}"]`);
  if (!optEl) return;

  const overlay = document.createElement('div');
  overlay.dataset.selectionOverlay = '1';
  overlay.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);
    z-index:10;width:72px;height:72px;border-radius:50%;
    background:linear-gradient(135deg,#C8A84B,#8B6914);border:3px solid #FFE500;
    display:flex;align-items:center;justify-content:center;
    font:900 34px/1 'Bricolage Grotesque','Manrope',sans-serif;color:#0F0020;
    box-shadow:0 0 20px rgba(200,168,75,.8),0 0 40px rgba(200,168,75,.4);
    animation:pvSelectionPop .35s cubic-bezier(.2,1.4,.4,1) both;pointer-events:none;
  `;
  overlay.textContent = LETTRES[optionIdx] || '?';

  optEl.style.position = 'relative';
  optEl.appendChild(overlay);
}

/**
 * Réinitialise l'apparence du buzzer (pulse normal) au début d'une
 * nouvelle question, avant que le joueur n'ait buzzé.
 */
function _reinitialiserBuzzer() {
  const buzzer = document.getElementById('pv-buzzer');
  if (!buzzer) return;

  buzzer.style.animation = 'pv-pulse 1.4s ease-in-out infinite';
  buzzer.style.filter    = '';
}

/* ── CONFIRMER (buzzer) ── */
function _onConfirmer() {
  if (_S.phase !== 'mise') return;
  const j = _S.joueurs[_S.localIdx];
  if (!j || j.confirme) return;

  j.confirme = true;
  playBtn?.();

  const buzzer = document.getElementById('pv-buzzer');
  if (buzzer) {
    buzzer.style.animation = 'none';
    buzzer.style.opacity   = '.55';
    buzzer.style.pointerEvents = 'none';
    buzzer.style.filter    = 'brightness(1.15) drop-shadow(0 0 30px rgba(255,229,0,.6))';
  }

  // Verrouiller visuellement la sélection après confirmation
  document.querySelectorAll('[data-confirm-badge]').forEach(el => el.remove());
  document.querySelectorAll('[data-option]').forEach((optEl, optIdx) => {
    const img = optEl.querySelector('img');
    optEl.style.pointerEvents = 'none';
    if (optIdx !== _S.reponseLocale) {
      optEl.style.opacity = '0.4';
      if (img) img.style.filter = 'grayscale(.5) brightness(.7)';
    } else {
      if (img) img.style.filter = 'drop-shadow(0 0 22px rgba(34,197,94,.8)) brightness(1.1)';
      const conf = document.createElement('div');
      conf.dataset.confirmBadge = '1';
      conf.style.cssText = `
        position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
        background:rgba(34,197,94,.9);border-radius:6px;padding:4px 12px;
        font:700 11px/1 'Manrope';letter-spacing:.12em;color:#fff;
        pointer-events:none;white-space:nowrap;
      `;
      conf.textContent = '✓ CONFIRMÉ';
      optEl.style.position = 'relative';
      optEl.appendChild(conf);
    }
  });

  _majScores();

  if (_S.modeMulti && _S.client?.socket) {
    _S.client.socket.emit('pouvoirs:confirmer', { reponse: _S.reponseLocale ?? null });
  } else {
    if (_S.joueurs.every(j2 => j2.confirme)) {
      _stopperChrono();
      _revelerLocal();
    }
  }
}

/* ── MODE LOCAL (sans serveur) ── */
function _demarrerQuestionLocale() {
  if (!_S.ecranActif) return;
  if (_S.indexQ >= _S.questions.length) { _finPartieLocale(); return; }
  const q = _S.questions[_S.indexQ];
  const texte     = q.q || q.question || '';
  const categorie = q.cat || q.categorie || 'Culture générale';
  const options   = q.o || q.opts || q.options || [];
  _S.indexCorrect = q.c ?? q.indexCorrect ?? 0;

  _afficherQuestion(texte, categorie, options);
  _demarrerChrono(_S.chronoBase, _onTimeoutLocal);
}

function _onTimeoutLocal() {
  _S.joueurs.forEach(j => { j.confirme = true; });
  _revelerLocal();
}

function _revelerLocal() {
  if (_S.phase !== 'mise') return;
  _S.phase = 'revelation';
  _stopperChrono();

  const opts = _S.optionsCourantes;
  const t = setTimeout(() => {
    if (!_S.ecranActif) return;
    _afficherOptions(opts, _S.indexCorrect, true);
    if (_S.isMobile) {
      document.getElementById('pvm-phase-buzz')?.style.setProperty('display', 'none');
      const optPhase = document.getElementById('pvm-phase-options');
      if (optPhase) optPhase.style.display = 'flex';
      _revelerOptionsMobile(_S.mobileOpts, _S.indexCorrect);
    }
    try { playCorrect?.(); } catch (e) { /* ignore */ }

    const t2 = setTimeout(() => {
      if (!_S.ecranActif) return;
      _S.phase = 'resultat';

      const localJ = _S.joueurs[_S.localIdx];
      if (localJ && _S.reponseLocale === _S.indexCorrect) {
        const ancien = localJ.score;
        localJ.score += 10;
        _animerScoreVers(_S.localIdx, ancien, localJ.score);
      }
      _majStatutsPret();

      const t3 = setTimeout(() => {
        if (!_S.ecranActif) return;
        _S.indexQ++;
        _demarrerQuestionLocale();
      }, 2600);
      _pushTimer(t3);
    }, 900);
    _pushTimer(t2);
  }, 1200);
  _pushTimer(t);
}

function _finPartieLocale() {
  _S.phase = 'fin';
  const classement = [..._S.joueurs].sort((a, b) => b.score - a.score);
  mergeState({ resultats_pouvoirs: classement });
  _enregistrerScore(classement);
  const t = setTimeout(() => naviguer('classement-pouvoirs.html'), 600);
  _pushTimer(t);
}

/**
 * Enregistre le score de fin de partie côté serveur (classement global),
 * en best-effort — n'importe rien si l'utilisateur n'a pas de pseudo
 * de compte ou si l'enregistrement échoue.
 */
function _enregistrerScore(classement) {
  const pseudo = sessionStorage.getItem('qpuc-pseudo');
  if (!pseudo) return;
  const moi = _S.joueurs[_S.localIdx];
  const premier = classement?.[0];
  fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pseudo,
      score:    moi?.score || 0,
      victoire: (premier?.nom || premier?.name) === moi?.nom,
      serieMax: 0,
      mode:     'pouvoirs',
      code:     sessionStorage.getItem('champ_room_code') || '',
    }),
  }).catch(() => {});
}

/* ── MULTIJOUEUR ── */
function _onDebut(payload) {
  const { joueurs, nbQuestions, question, indexQ, chrono, stacks } = payload;
  if (!joueurs?.length) return;

  _S.joueurs = joueurs.map((j, i) => ({
    id:       j.id,
    nom:      j.nom || j.name || `Joueur ${i + 1}`,
    colorIdx: j.colorIdx ?? i,
    score:    j.score || 0,
    stack:    (stacks && stacks[j.id]) || [],
    confirme: false,
  }));

  const myId = sessionStorage.getItem('champ_player_id');
  const idx  = _S.joueurs.findIndex(j => String(j.id) === String(myId));
  if (idx !== -1) _S.localIdx = idx;

  _S.nbQuestions = nbQuestions || _S.nbQuestions;
  _S.indexQ      = indexQ || 0;
  _S.chronoBase  = chrono || 20;
  _S.timerVal    = _S.chronoBase;

  _construireScores();
  _afficherOverlayAttente(false);
  _S.indexCorrect = null;
  _afficherQuestion(question?.question, question?.categorie, question?.options || []);
  _majTimerStatique(_S.chronoBase);
}

/**
 * Best-effort : tente de reprendre la partie avec le playerToken stocké
 * si la connexion socket est perdue puis rétablie en cours de partie.
 * La resynchronisation complète de l'état (question courante, scores,
 * pouvoirs) n'est pas couverte ici — seule la reprise de connexion/
 * identité l'est.
 */
function _gererReconnexionSocket() {
  const sock = _S.client?.socket;
  if (!sock?.io) return;

  const onReconnect = () => {
    const code   = sessionStorage.getItem('champ_room_code');
    const token  = sessionStorage.getItem('champ_room_player_token');
    const pseudo = sessionStorage.getItem('champ_player_name');
    if (!code || !token) return;

    sock.emit('pouvoirs:rejoindre-salle', { code, pseudo, playerToken: token }, (ack) => {
      if (ack?.ok && ack?.reconnecte) {
        console.info('[pouvoirs] Reconnexion réussie — partie reprise.');
      } else if (!ack?.ok) {
        console.warn('[pouvoirs] Échec de la reconnexion :', ack?.erreur);
      }
    });
  };

  sock.io.on('reconnect', onReconnect);
  _push(() => sock.io.off('reconnect', onReconnect));
}

function _brancherSocket() {
  const sock = _S.client.socket;
  const handlers = {
    'pouvoirs:debut':            (p) => _onDebut(p),
    'pouvoirs:timer':            ({ val }) => _majTimer(val),
    'pouvoirs:chrono-debut':     ({ duree, pression }) => {
      _demarrerChrono(duree, () => {});
      if (pression) _flashMsg('<i class="fa-solid fa-hourglass-half"></i> Pression Mentale ! Votre chrono est réduit', '#E85A3A');
    },
    'pouvoirs:joueur-confirme':  ({ playerId }) => {
      const j = _S.joueurs.find(j2 => String(j2.id) === String(playerId));
      if (j) { j.confirme = true; _majScores(); }
    },
    'pouvoirs:revelation':       ({ indexCorrect }) => {
      _S.phase = 'revelation';
      _S.indexCorrect = indexCorrect;
      _stopperChrono();
      _afficherOptions(_S.optionsCourantes, indexCorrect, true);
      if (_S.isMobile) {
        document.getElementById('pvm-phase-buzz')?.style.setProperty('display', 'none');
        const optPhase = document.getElementById('pvm-phase-options');
        if (optPhase) optPhase.style.display = 'flex';
        _revelerOptionsMobile(_S.mobileOpts, indexCorrect);
      }
      try { playCorrect?.(); } catch (e) { /* ignore */ }
    },
    'pouvoirs:resultat':         ({ scores, stacks, attributions }) => {
      _S.phase = 'resultat';
      if (scores) {
        _S.joueurs.forEach((j, idx) => {
          if (scores[j.id] !== undefined && scores[j.id] !== j.score) {
            const ancien = j.score;
            j.score = scores[j.id];
            _animerScoreVers(idx, ancien, j.score);
          }
        });
      }
      if (stacks) _S.joueurs.forEach(j => { if (stacks[j.id]) j.stack = stacks[j.id]; });
      _majStatutsPret();
      _afficherSlots();
      (attributions || []).forEach(({ playerId, pouvoir }, i) => {
        const pIdx = _S.joueurs.findIndex(j => String(j.id) === String(playerId));
        if (pIdx === -1) return;
        const t = setTimeout(() => _animerAttribution(pIdx, pouvoir), i * 600);
        _pushTimer(t);
      });
    },
    'pouvoirs:stacks-update':    ({ stacks }) => {
      _S.joueurs.forEach(j => { if (stacks[j.id]) j.stack = stacks[j.id]; });
      _afficherSlots();
    },
    'pouvoirs:pouvoir-utilise':  ({ playerId, type }) => {
      const idx = _S.joueurs.findIndex(j => String(j.id) === String(playerId));
      if (idx !== -1) _animerUtilisationPouvoir(idx, type);
    },
    'pouvoirs:stack-plein':      () => _flashMsg('Stack plein ! Utilisez un pouvoir d’abord.', '#C8A84B'),
    'pouvoirs:indice-recu':      ({ eliminee }) => {
      _S.optionEliminee = eliminee;
      _afficherOptions(_S.optionsCourantes, -1, false);
      if (_S.isMobile) _afficherOptionsMobile(_S.mobileOpts, -1, false);
      _flashMsg('<i class="fa-solid fa-lightbulb"></i> Indice : une réponse a été éliminée !', '#9B59B6');
    },
    'pouvoirs:pression-recue':   ({ from }) => {
      const j = _S.joueurs.find(j2 => String(j2.id) === String(from));
      _flashMsg(`<i class="fa-solid fa-hourglass-half"></i> Pression Mentale de ${j ? esc(j.nom) : 'un adversaire'} !`, '#E85A3A');
    },
    'pouvoirs:bouclier-utilise': () => {
      try { playWrong?.(); } catch (e) { /* ignore */ }
      _flashMsg('<i class="fa-solid fa-shield-halved"></i> Votre Bouclier de Savoir vous a protégé !', '#4A90E2');
    },
    'pouvoirs:question-suivante': ({ indexQ, question, scores, stacks }) => {
      _S.indexQ = indexQ;
      if (scores) _S.joueurs.forEach(j => { if (scores[j.id] !== undefined) j.score = scores[j.id]; });
      if (stacks) _S.joueurs.forEach(j => { if (stacks[j.id]) j.stack = stacks[j.id]; });
      _S.indexCorrect = null;
      _afficherQuestion(question?.question, question?.categorie, question?.options || []);
      _majTimerStatique(_S.chronoBase);
    },
    'pouvoirs:fin':               ({ classement }) => {
      mergeState({ resultats_pouvoirs: classement });
      _enregistrerScore(classement);
      naviguer('classement-pouvoirs.html');
    },
  };

  Object.entries(handlers).forEach(([ev, fn]) => {
    sock.on(ev, fn);
    _push(() => sock.off(ev, fn));
  });
}

/* ── Pouvoirs : affichage des slots ── */
function _afficherSlots() {
  const localJ = _S.joueurs[_S.localIdx];
  if (!localJ) return;

  ['pv-slot-0', 'pv-slot-1'].forEach((id, slotIdx) => {
    const slot = document.getElementById(id);
    if (!slot) return;
    const key = localJ.stack[slotIdx];
    const aDroite = slotIdx === 1;

    if (!key) {
      slot.innerHTML = `<div style="color:rgba(255,255,255,.55);font:500 13px 'Manrope';
                                    font-style:italic;${aDroite ? 'text-align:right;width:100%;' : ''}">
        Aucun pouvoir
      </div>`;
      return;
    }

    const P = POUVOIR_DATA[key];
    const img = `<img src="${P.img}" alt="${esc(P.nom)}"
           style="width:86px;height:auto;border-radius:8px;flex-shrink:0;
                  box-shadow:0 6px 20px rgba(0,0,0,.5),0 0 18px ${P.color}44;
                  transform:rotate(${aDroite ? '3' : '-3'}deg);">`;
    const texte = `
      <div style="display:flex;flex-direction:column;align-items:${aDroite ? 'flex-end' : 'flex-start'};gap:8px;">
        <div style="font:800 15px/1 'Manrope';letter-spacing:.14em;text-transform:uppercase;
                    color:#C8A84B;${aDroite ? 'text-align:right;' : ''}">${esc(P.nom)}</div>
        <div style="font:500 13px/1.4 'Manrope';color:rgba(255,255,255,.6);max-width:230px;
                    ${aDroite ? 'text-align:right;' : ''}">${esc(P.desc)}</div>
        <button data-use-pouvoir="${key}"
                style="margin-top:2px;padding:9px 22px;background:rgba(10,0,26,.8);
                       border:1px solid rgba(200,168,75,.45);border-radius:7px;
                       font:700 11px/1 'Manrope';letter-spacing:.16em;text-transform:uppercase;
                       color:#fff;cursor:pointer;">
          ${key === 'pression' ? 'Cibler →' : 'Utiliser'}
        </button>
      </div>`;
    slot.innerHTML = aDroite ? (texte + img) : (img + texte);
    slot.querySelector('[data-use-pouvoir]')?.addEventListener('click', () => _utiliserPouvoir(key));
  });

  if (_S.isMobile) _majPouvoirsMobile();
}

function _utiliserPouvoir(key) {
  if (_S.phase !== 'mise') return;
  const localJ = _S.joueurs[_S.localIdx];
  if (!localJ || !localJ.stack.includes(key)) return;

  if (key === 'pression' && _S.modeMulti) {
    _afficherSelecteurCible(key);
  } else {
    _envoyerUtilisation(key, null);
  }
}

function _afficherSelecteurCible(key) {
  document.getElementById('pv-overlay-cible')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'pv-overlay-cible';
  overlay.style.cssText = `
    position:absolute;inset:0;z-index:300;background:rgba(5,0,12,.75);
    backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;
  `;

  const adversaires = _S.joueurs.filter((_, i) => i !== _S.localIdx);
  const btns = adversaires.map(j => `
    <button data-cible="${j.id}"
            style="display:flex;align-items:center;gap:12px;padding:14px 22px;
                   border-radius:12px;cursor:pointer;
                   background:rgba(232,90,58,.15);border:1.5px solid rgba(232,90,58,.5);
                   font:700 15px/1 'Manrope';color:#fff;min-width:180px;">
      ${esc(j.nom)}
    </button>`).join('');

  overlay.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:20px;
                padding:32px 40px;background:rgba(15,0,32,.9);border-radius:18px;
                border:1.5px solid rgba(232,90,58,.5);">
      <div style="font:800 18px/1 'Bricolage Grotesque';color:#E85A3A;letter-spacing:.1em;">Choisir la cible</div>
      <div style="font:500 13px/1.4 'Manrope';color:rgba(255,255,255,.6);">
        Sélectionnez l'adversaire qui subira −5s au prochain chrono
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">${btns}</div>
      <button id="pv-btn-annuler-cible"
              style="padding:8px 20px;border-radius:8px;cursor:pointer;
                     background:transparent;border:1px solid rgba(255,255,255,.2);
                     font:600 12px/1 'Manrope';color:rgba(255,255,255,.6);">
        Annuler
      </button>
    </div>
  `;

  document.getElementById('pouvoirs-stage')?.appendChild(overlay);
  overlay.querySelectorAll('[data-cible]').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.remove();
      _envoyerUtilisation(key, btn.dataset.cible);
    });
  });
  overlay.querySelector('#pv-btn-annuler-cible')?.addEventListener('click', () => overlay.remove());
}

function _envoyerUtilisation(key, cibleId) {
  if (_S.modeMulti && _S.client?.socket) {
    _S.client.socket.emit('pouvoirs:utiliser', { type: key, cibleId }, (reponse) => {
      if (!reponse?.ok) _flashMsg(reponse?.erreur || 'Pouvoir indisponible', '#E85A3A');
    });
  } else {
    const localJ = _S.joueurs[_S.localIdx];
    const idx = localJ?.stack.indexOf(key) ?? -1;
    if (idx !== -1) localJ.stack.splice(idx, 1);
    _animerUtilisationPouvoir(_S.localIdx, key);
    if (key === 'indice') {
      const mauvaises = (_S.optionsCourantes || []).map((_, i) => i).filter(i => i !== _S.indexCorrect);
      _S.optionEliminee = mauvaises[Math.floor(Math.random() * mauvaises.length)];
      _afficherOptions(_S.optionsCourantes, -1, false);
      if (_S.isMobile) _afficherOptionsMobile(_S.mobileOpts, -1, false);
    }
    _afficherSlots();
  }
}

/**
 * Animation d'activation d'un pouvoir : flash coloré plein écran bref
 * + éclatement de particules depuis la carte du joueur concerné,
 * visible par tous les joueurs de la partie.
 */
function _animerUtilisationPouvoir(joueurIdx, key) {
  const P = POUVOIR_DATA[key];
  if (!P) return;
  const stage = document.getElementById('pouvoirs-stage') || document.body;

  // ── Flash plein écran bref ──
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: absolute; inset: 0; z-index: 55; pointer-events: none;
    background: ${POUVOIR_FLASH_COLOR[key] || 'rgba(255,255,255,.2)'};
    animation: pvFlashPouvoir .5s ease-out forwards;
  `;
  stage.appendChild(flash);
  const t1 = setTimeout(() => flash.remove(), 520);
  _pushTimer(t1);

  // ── Éclatement de particules depuis la carte du joueur ──
  const anchorEl = document.querySelector(`[data-score-card="${joueurIdx}"]`);
  const rect = anchorEl?.getBoundingClientRect() || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;

  const burst = document.createElement('div');
  burst.style.cssText = 'position:fixed;left:0;top:0;z-index:60;pointer-events:none;';
  burst.innerHTML = Array.from({ length: 10 }, (_, i) => `
    <div style="position:absolute;left:${cx}px;top:${cy}px;width:9px;height:9px;
                border-radius:50%;background:${P.color};box-shadow:0 0 10px ${P.color};
                --angle:${i * 36}deg;animation:pvPouvoirBurst .65s ease-out forwards;"></div>
  `).join('');
  document.body.appendChild(burst);
  const t2 = setTimeout(() => burst.remove(), 700);
  _pushTimer(t2);

  // ── Label flottant "Pouvoir activé" ──
  const label = document.createElement('div');
  label.style.cssText = `
    position: fixed; left:${cx}px; top:${cy - 40}px; transform: translateX(-50%);
    z-index: 61; font: 800 15px/1 'Manrope'; letter-spacing: .1em;
    text-transform: uppercase; color: ${P.color};
    text-shadow: 0 0 14px ${P.color};
    animation: pvPouvoirLabel 1s ease-out forwards; pointer-events: none;
  `;
  label.textContent = `${P.nom} activé`;
  document.body.appendChild(label);
  const t3 = setTimeout(() => label.remove(), 1050);
  _pushTimer(t3);

  try { playBtn?.(); } catch (e) { /* ignore */ }
}

/* ── Mobile layout (< 760px) ── */
function _switchMobile(actif) {
  const stage  = document.getElementById('pouvoirs-stage');
  const mobile = document.getElementById('pv-mobile-root');
  if (stage)  stage.style.display  = actif ? 'none' : '';
  if (mobile) mobile.style.display = actif ? 'flex' : 'none';
}

function _rafraichirToutMobile() {
  _majMobileHeader();
  _majAdversairesMobile();
  _majPouvoirsMobile();
  if (_S.phase === 'revelation' || _S.phase === 'resultat') {
    document.getElementById('pvm-phase-buzz')?.style.setProperty('display', 'none');
    const optZone = document.getElementById('pvm-phase-options');
    if (optZone) optZone.style.display = 'flex';
    _afficherOptionsMobile(_S.mobileOpts, _S.indexCorrect ?? -1, true);
  } else if (_S.mobileHasBuzzed) {
    _montrerPhaseOptions();
  } else {
    _reinitPhaseBuzz();
  }
}

function _majMobileHeader() {
  const qNum = document.getElementById('pvm-q-num');
  if (qNum) qNum.textContent = `Q ${_S.indexQ + 1} / ${_S.nbQuestions}`;
  const qCat = document.getElementById('pvm-q-cat');
  const cEl  = document.getElementById('pv-q-categorie');
  if (qCat) qCat.textContent = cEl ? cEl.textContent : '';
  const qTxt = document.getElementById('pvm-q-texte');
  const tEl  = document.getElementById('pv-q-texte');
  if (qTxt) qTxt.textContent = tEl ? tEl.textContent : '';
}

function _majTimerMobile(val) {
  const el = document.getElementById('pvm-timer-val');
  if (el) { el.textContent = Math.max(0, val); el.style.color = val <= 5 ? '#E85A3A' : '#FFE500'; }
  const ring = document.getElementById('pvm-timer-ring');
  if (ring) ring.style.stroke = val <= 5 ? '#E85A3A' : '#FFE500';
}

function _majAdversairesMobile() {
  const zone = document.getElementById('pvm-opponents');
  if (!zone) return;
  zone.innerHTML = _S.joueurs.filter((_, i) => i !== _S.localIdx).map(j => {
    const c = COULEURS_JOUEURS[j.colorIdx % COULEURS_JOUEURS.length];
    return `
    <div style="flex-shrink:0;display:flex;align-items:center;gap:6px;
                padding:5px 10px 5px 6px;border-radius:99px;
                background:rgba(255,255,255,.04);
                border:1px solid rgba(200,168,75,.18);min-width:max-content;">
      <div style="width:24px;height:24px;border-radius:50%;
                  background:${c};display:flex;align-items:center;
                  justify-content:center;font:700 10px 'Manrope';color:#fff;flex-shrink:0;">
        ${esc((j.nom || '?')[0].toUpperCase())}
      </div>
      <span style="font:700 11px 'Manrope';color:#fff;max-width:70px;
                   overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(j.nom)}</span>
      <span style="font:600 10px 'Manrope';color:rgba(200,168,75,.6);">${j.score}pts</span>
      <span data-pvm-dot="${j.id}"
            style="width:7px;height:7px;border-radius:50%;flex-shrink:0;
                   background:${j.confirme ? '#3DC87A' : 'rgba(255,255,255,.2)'};
                   box-shadow:${j.confirme ? '0 0 6px #3DC87A' : 'none'};"></span>
    </div>`;
  }).join('');
}

function _majPouvoirsMobile() {
  const zone = document.getElementById('pvm-mes-pouvoirs');
  if (!zone) return;
  const localJ = _S.joueurs[_S.localIdx];
  if (!localJ?.stack?.length) {
    zone.innerHTML = `<div style="font:500 11px 'Manrope';color:rgba(255,255,255,.55);font-style:italic;">Aucun pouvoir pour l'instant</div>`;
    return;
  }

  zone.innerHTML = localJ.stack.map(key => {
    const P = POUVOIR_DATA[key];
    if (!P) return '';
    return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;"
         data-pvm-use="${key}">
      <img src="${P.img}"
           style="width:44px;height:auto;border-radius:6px;
                  box-shadow:0 4px 12px rgba(0,0,0,.4),0 0 12px ${P.color}44;">
      <span style="font:700 9px 'Manrope';color:${P.color};letter-spacing:.08em;">${esc(P.nom)}</span>
      <span style="font:600 8px 'Manrope';color:rgba(200,168,75,.6);letter-spacing:.08em;">
        ${key === 'pression' ? 'Cibler' : 'Utiliser'}
      </span>
    </div>`;
  }).join('');

  zone.querySelectorAll('[data-pvm-use]').forEach(el => {
    el.addEventListener('click', () => { _utiliserPouvoir(el.dataset.pvmUse); });
  });
}

function _afficherOptionsMobile(opts, indexCorrect, reveal) {
  const grid = document.getElementById('pvm-options-grid');
  if (!grid) return;

  grid.innerHTML = opts.map((opt, i) => {
    const estEliminee  = _S.optionEliminee === i;
    const estSelection = !reveal && _S.reponseLocale === i;
    const estBonne      = reveal && i === indexCorrect;
    const estMauvaise   = reveal && i !== indexCorrect;

    let bg, border, glow;
    if (estBonne)          { bg = 'rgba(61,200,122,.18)';  border = '#3DC87A'; glow = '0 0 18px rgba(61,200,122,.5)'; }
    else if (estMauvaise)  { bg = 'rgba(0,0,0,.3)';        border = 'rgba(255,255,255,.08)'; glow = 'none'; }
    else if (estSelection) { bg = 'rgba(200,168,75,.15)';  border = '#FFE500'; glow = '0 0 18px rgba(255,229,0,.45)'; }
    else                   { bg = 'rgba(255,255,255,.04)'; border = 'rgba(200,168,75,.2)';   glow = 'none'; }

    return `
    <button data-pvm-option="${i}" type="button"
            style="position:relative;min-height:clamp(64px,14vw,90px);
                   border-radius:12px;padding:3px;border:none;cursor:pointer;
                   background:linear-gradient(135deg,${border}88,${border}44);
                   box-shadow:${glow};
                   transition:transform .12s,box-shadow .2s;
                   opacity:${estEliminee ? '.22' : estMauvaise ? '.38' : '1'};
                   pointer-events:${reveal || estEliminee ? 'none' : 'auto'};
                   -webkit-tap-highlight-color:transparent;">
      <div style="width:100%;height:100%;border-radius:9px;background:${bg};
                  border:1px solid ${border}44;
                  display:flex;align-items:center;gap:10px;padding:8px 12px;">
        <span style="font:900 clamp(18px,4.5vw,24px)/1 'Bricolage Grotesque','Manrope';
                     color:${estBonne ? '#3DC87A' : estSelection ? '#FFE500' : '#C8A84B'};
                     flex-shrink:0;">${LETTRES[i]}</span>
        <span style="font:600 clamp(12px,3vw,15px)/1.3 'Manrope';
                     color:rgba(255,255,255,${estMauvaise ? '.4' : '.92'});
                     text-align:left;">${esc(opt)}</span>
        ${estBonne ? '<span style="margin-left:auto;font-size:16px;color:#3DC87A;"><i class="fa-solid fa-check"></i></span>' : ''}
      </div>
    </button>`;
  }).join('');

  if (reveal) return;

  grid.querySelectorAll('[data-pvm-option]').forEach(btn => {
    btn.addEventListener('pointerdown', () => { btn.style.transform = 'scale(.96)'; });
    ['pointerup', 'pointerleave'].forEach(ev => btn.addEventListener(ev, () => { btn.style.transform = ''; }));
    btn.addEventListener('click', () => {
      if (_S.phase !== 'mise') return;
      const localJ = _S.joueurs[_S.localIdx];
      if (localJ?.confirme) return;
      const i = parseInt(btn.dataset.pvmOption, 10);
      if (_S.optionEliminee === i) return;
      _S.reponseLocale = i;
      playBtn?.();
      _afficherOptionsMobile(opts, indexCorrect, false);
      _majConfirmerMobile();
    });
  });
}

/**
 * Séquence de révélation fluide (mobile) : dim progressif des options
 * puis rendu final coloré (bonne réponse en vert, réponse fausse du
 * joueur local en rouge + shake).
 */
function _revelerOptionsMobile(opts, indexCorrect) {
  const grid = document.getElementById('pvm-options-grid');
  if (grid) {
    grid.querySelectorAll('[data-pvm-option]').forEach(btn => {
      btn.style.transition   = 'opacity .3s ease';
      btn.style.opacity      = '.5';
      btn.style.pointerEvents = 'none';
    });
  }

  const t = setTimeout(() => {
    if (!_S.ecranActif) return;
    const maRep = _S.reponseLocale;
    _afficherOptionsMobile(opts, indexCorrect, true);

    const correctBtn = document.querySelector(`[data-pvm-option="${indexCorrect}"]`);
    if (correctBtn) correctBtn.style.animation = 'pvCochePop .3s ease both';

    if (maRep !== null && maRep !== indexCorrect) {
      const wrongBtn = document.querySelector(`[data-pvm-option="${maRep}"]`);
      if (wrongBtn) {
        wrongBtn.style.animation = 'pvShakeWrong .4s ease';
        const t2 = setTimeout(() => { if (wrongBtn) wrongBtn.style.animation = ''; }, 420);
        _pushTimer(t2);
      }
    }
  }, 280);
  _pushTimer(t);
}

function _majConfirmerMobile() {
  const btn = document.getElementById('pvm-confirmer');
  if (!btn) return;
  const pret = _S.reponseLocale !== null && !(_S.joueurs[_S.localIdx]?.confirme);

  btn.disabled          = !pret;
  btn.style.background  = pret ? 'linear-gradient(180deg,rgba(200,168,75,.25),rgba(200,168,75,.12))' : 'rgba(200,168,75,.07)';
  btn.style.color       = pret ? '#FFE500' : 'rgba(200,168,75,.35)';
  btn.style.borderColor = pret ? 'rgba(200,168,75,.6)' : 'rgba(200,168,75,.25)';
  btn.style.cursor      = pret ? 'pointer' : 'not-allowed';
  btn.textContent       = pret ? 'CONFIRMER ✓' : 'Choisir une réponse';
}

function _verrouilerPostConfirmMobile() {
  const btn = document.getElementById('pvm-confirmer');
  if (btn) {
    btn.textContent       = '✓ CONFIRMÉ';
    btn.style.color       = '#3DC87A';
    btn.style.borderColor = '#3DC87A';
    btn.style.background  = 'rgba(61,200,122,.12)';
    btn.disabled          = true;
    btn.style.cursor      = 'default';
  }
}

function _montrerPhaseOptions() {
  document.getElementById('pvm-phase-buzz')?.style.setProperty('display', 'none');
  const optZone = document.getElementById('pvm-phase-options');
  if (optZone) {
    optZone.style.display  = 'flex';
    optZone.style.animation = 'pvMOptionsSlide .35s cubic-bezier(.2,1,.4,1) both';
  }

  const opts = _S.mobileOpts;
  if (opts?.length) _afficherOptionsMobile(opts, -1, false);
  _majConfirmerMobile();
}

function _reinitPhaseBuzz() {
  _S.mobileHasBuzzed = false;
  const buzzPhase = document.getElementById('pvm-phase-buzz');
  const optPhase  = document.getElementById('pvm-phase-options');
  if (buzzPhase) buzzPhase.style.display = 'flex';
  if (optPhase)  optPhase.style.display  = 'none';
  _majConfirmerMobile();
}

/* ── Scores ── */
function _construireScores() {
  const grid = document.getElementById('pv-scores-grid');
  if (!grid) return;
  grid.style.gridTemplateColumns = `repeat(${_S.joueurs.length},1fr)`;
  grid.innerHTML = _S.joueurs.map((j, i) => {
    const c = COULEURS_JOUEURS[j.colorIdx % COULEURS_JOUEURS.length];
    return `
    <div data-score-card="${i}" style="position:relative;display:flex;align-items:center;gap:14px;
                padding:14px 18px;background:rgba(10,0,26,.7);
                border:1px solid ${c}88;border-radius:14px;box-shadow:0 0 22px ${c}33;">
      <img src="${IMG}icone${(i % 4) + 1}.png" alt=""
           style="width:60px;height:60px;object-fit:contain;flex-shrink:0;
                  filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));">
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;">
        <span style="font:800 16px/1 'Manrope';letter-spacing:.07em;
                     text-transform:uppercase;color:#fff;white-space:nowrap;
                     overflow:hidden;text-overflow:ellipsis;">${esc(j.nom)}</span>
        <span data-score-val="${i}" style="font:700 15px/1 'Manrope';color:${c};">0 pts</span>
      </span>
      <span data-score-pret="${i}"
            style="font:600 10px/1 'Manrope';letter-spacing:.12em;text-transform:uppercase;
                   color:rgba(255,255,255,.55);flex-shrink:0;">EN ATTENTE</span>
    </div>
    `;
  }).join('');
  _majScores();
}

function _majScores() {
  _S.joueurs.forEach((j, i) => {
    const valEl = document.querySelector(`[data-score-val="${i}"]`);
    if (valEl) valEl.textContent = `${j.score} pts`;
  });
  _majStatutsPret();
}

/**
 * Met à jour uniquement les badges PRÊT/EN ATTENTE (et le bandeau mobile),
 * sans toucher au texte du score — utilisé pendant la révélation pour ne
 * pas écraser l'animation de comptage du score.
 */
function _majStatutsPret() {
  _S.joueurs.forEach((j, i) => {
    const pretEl = document.querySelector(`[data-score-pret="${i}"]`);
    if (pretEl) {
      pretEl.textContent = j.confirme ? 'PRÊT ✓' : 'EN ATTENTE';
      pretEl.style.color = j.confirme ? '#22C55E' : 'rgba(255,255,255,.55)';
    }
  });
  if (_S.isMobile) _majAdversairesMobile();
}

/**
 * Anime le score d'un joueur de son ancienne valeur vers la nouvelle,
 * en comptant progressivement (pas un saut instantané), avec un bonus
 * flottant "+N" qui monte et s'efface au-dessus du score.
 */
function _animerScoreVers(joueurIdx, ancienScore, nouveauScore) {
  const el = document.querySelector(`[data-score-val="${joueurIdx}"]`);
  if (!el) return;

  const diff = nouveauScore - ancienScore;
  if (diff === 0) return;

  const duree = 650;
  const debut = performance.now();

  function step(now) {
    if (!_S.ecranActif) return;
    const t     = Math.min(1, (now - debut) / duree);
    const eased = 1 - Math.pow(1 - t, 3);
    const val   = Math.round(ancienScore + diff * eased);
    el.textContent = `${val} pts`;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = `${nouveauScore} pts`;
    }
  }
  requestAnimationFrame(step);

  if (diff > 0) {
    const carte = el.closest('[data-score-card]');
    if (carte) {
      const bonus = document.createElement('div');
      bonus.textContent = `+${diff}`;
      bonus.style.cssText = `
        position: absolute; top: -6px; right: 14px;
        font: 800 20px/1 'Manrope'; color: #FFE500;
        text-shadow: 0 0 12px rgba(255,229,0,.7);
        animation: pvBonusFloat 1.1s ease-out forwards;
        pointer-events: none; z-index: 15;
      `;
      carte.appendChild(bonus);
      const t = setTimeout(() => bonus.remove(), 1150);
      _pushTimer(t);
    }
  }
}

/* ── Chrono ── */
function _demarrerChrono(duree, onFin) {
  _stopperChrono();
  _S.timerVal = duree;
  _majTimer(_S.timerVal);

  const ring = document.getElementById('pv-timer-ring');
  if (ring) {
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = '0';
    void ring.getBoundingClientRect();
    ring.style.transition = `stroke-dashoffset ${duree}s linear`;
    ring.style.strokeDashoffset = String(TIMER_CIRC);
  }

  const ringM = document.getElementById('pvm-timer-ring');
  if (ringM) {
    const C = 113;
    ringM.style.transition = 'none';
    ringM.style.strokeDashoffset = '0';
    void ringM.getBoundingClientRect();
    ringM.style.transition = `stroke-dashoffset ${duree}s linear`;
    ringM.style.strokeDashoffset = String(C);
  }

  _S.timerInterval = setInterval(() => {
    _S.timerVal--;
    _majTimer(_S.timerVal);
    if (_S.timerVal <= 0) {
      _stopperChrono();
      if (!_S.modeMulti) onFin?.();
    }
  }, 1000);
}

function _stopperChrono() {
  clearInterval(_S.timerInterval);
  _S.timerInterval = null;
}

function _majTimer(val) {
  const el = document.getElementById('pv-timer-val');
  if (el) {
    el.textContent = Math.max(0, val);
    el.style.color = val <= 5 ? '#E85A3A' : '#FFE500';
  }
  const ring = document.getElementById('pv-timer-ring');
  if (ring) ring.style.stroke = val <= 5 ? '#E85A3A' : '#F0B429';
  _majTimerMobile(val);
}

function _majTimerStatique(val) {
  _stopperChrono();
  const ring = document.getElementById('pv-timer-ring');
  if (ring) { ring.style.transition = 'none'; ring.style.strokeDashoffset = '0'; }
  _majTimer(val);
}

/* ── Animation attribution de pouvoir ── */
function _animerAttribution(joueurIdx, key) {
  const P = POUVOIR_DATA[key];
  const stage = document.getElementById('pouvoirs-stage');
  if (!P || !stage) return;

  const ov = document.createElement('div');
  ov.style.cssText = 'position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(5,0,12,.55);backdrop-filter:blur(6px);pointer-events:none;';

  const parts = Array.from({ length: 8 }, (_, i) =>
    `<div style="position:absolute;top:50%;left:50%;width:11px;height:11px;border-radius:50%;background:${P.color};box-shadow:0 0 10px ${P.color};--angle:${i * 45}deg;animation:pv-particule .7s ease-out .8s both;"></div>`
  ).join('');

  ov.innerHTML = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:20px;">
      <div style="font:700 13px/1 'Manrope';letter-spacing:.3em;text-transform:uppercase;color:${P.color};opacity:0;animation:pv-label-pop .4s ease .15s both;">${esc(_S.joueurs[joueurIdx]?.nom || '')}</div>
      <div style="position:relative;">
        <img src="${P.img}" alt="${esc(P.nom)}" style="width:230px;height:auto;border-radius:14px;filter:drop-shadow(0 0 34px ${P.color});animation:pv-carte-entree .85s cubic-bezier(.18,1.2,.4,1) .1s both;">
        <div style="position:absolute;inset:0;pointer-events:none;">${parts}</div>
      </div>
      <div style="font:800 30px/1 'Bricolage Grotesque','Manrope';letter-spacing:.06em;text-transform:uppercase;color:#FFE500;text-shadow:0 0 26px rgba(255,229,0,.6);opacity:0;animation:pv-label-pop .45s ease .9s both;">Nouveau pouvoir&nbsp;!</div>
    </div>`;

  stage.appendChild(ov);
  const t = setTimeout(() => {
    ov.style.animation = 'pv-overlay-out .4s ease both';
    const t2 = setTimeout(() => ov.remove(), 400);
    _pushTimer(t2);
  }, 1800);
  _pushTimer(t);
}

/**
 * Effectue un fondu de sortie sur la zone question, exécute la fonction
 * de mise à jour du contenu, puis un fondu d'entrée — pour éviter un
 * switch brutal entre deux questions.
 */
function _transitionVersNouvelleQuestion(majContenuCb) {
  const zones = [
    document.getElementById('pv-q-texte'),
    document.getElementById('pv-options'),
    document.getElementById('pv-q-categorie'),
  ].filter(Boolean);

  zones.forEach(z => {
    z.style.transition = 'opacity .28s ease, transform .28s ease';
    z.style.opacity    = '0';
    z.style.transform  = 'translateY(-8px)';
  });

  const t = setTimeout(() => {
    if (!_S.ecranActif) return;
    majContenuCb();
    zones.forEach(z => {
      z.style.transform = 'translateY(8px)';
      void z.getBoundingClientRect();
      z.style.opacity   = '1';
      z.style.transform = 'translateY(0)';
    });
  }, 300);
  _pushTimer(t);
}

/* ── Utilitaires ── */
function _afficherOverlayAttente(show) {
  const el = document.getElementById('pv-overlay-attente');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function _flashMsg(msg, couleur = '#C8A84B') {
  const stage = document.getElementById('pouvoirs-stage');
  if (!stage) return;
  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute;bottom:120px;left:50%;transform:translateX(-50%);
    background:${couleur}EE;color:#fff;padding:10px 24px;border-radius:8px;
    font:700 13px/1 'Manrope';z-index:500;white-space:nowrap;pointer-events:none;
    animation:pv-label-pop .3s ease both;
  `;
  el.innerHTML = msg;
  stage.appendChild(el);
  const t = setTimeout(() => el.remove(), 2500);
  _pushTimer(t);
}

function _injecterFonts() {
  if (document.getElementById('pouvoirs-fonts')) return;
  const l = document.createElement('link');
  l.id = 'pouvoirs-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800&display=swap';
  document.head.appendChild(l);
}

function _injecterStyles() {
  if (document.getElementById('pouvoirs-jeu-styles')) return;
  const s = document.createElement('style');
  s.id = 'pouvoirs-jeu-styles';
  s.textContent = `
    @keyframes pv-pulse{ 0%{ transform:scale(1); filter:drop-shadow(0 12px 26px rgba(0,0,0,.55)) drop-shadow(0 0 0 rgba(255,60,60,0)); } 50%{ transform:scale(1.07); filter:drop-shadow(0 16px 30px rgba(0,0,0,.55)) drop-shadow(0 0 30px rgba(255,70,70,.55)); } 100%{ transform:scale(1); filter:drop-shadow(0 12px 26px rgba(0,0,0,.55)) drop-shadow(0 0 0 rgba(255,60,60,0)); } }
    @keyframes pv-ring{ 0%{ transform:translate(-50%,-50%) scale(.7); opacity:.7; } 100%{ transform:translate(-50%,-50%) scale(1.5); opacity:0; } }
    @keyframes pv-carte-entree{ 0%{ transform:translateY(-340px) rotate(-18deg) scale(.7); opacity:0; } 60%{ transform:translateY(10px) rotate(2deg) scale(1.06); opacity:1; } 80%{ transform:translateY(-6px) rotate(-1deg) scale(.98); } 100%{ transform:translateY(0) rotate(0) scale(1); opacity:1; } }
    @keyframes pv-label-pop{ 0%{ opacity:0; transform:translateY(12px) scale(.9); } 60%{ opacity:1; transform:translateY(-3px) scale(1.05); } 100%{ opacity:1; transform:translateY(0) scale(1); } }
    @keyframes pv-particule{ 0%{ transform:translate(-50%,-50%) rotate(var(--angle)) translateY(0) scale(1.6); opacity:1; } 100%{ transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-120px) scale(0); opacity:0; } }
    @keyframes pv-overlay-out{ to{ opacity:0; } }
    @keyframes pvPretPulse{ 0%,100%{ opacity:1; } 50%{ opacity:.5; } }
    @keyframes pvSelectionPop {
      0%   { transform: translate(-50%,-50%) scale(0) rotate(-20deg); opacity:0; }
      60%  { transform: translate(-50%,-50%) scale(1.2) rotate(5deg); opacity:1; }
      100% { transform: translate(-50%,-50%) scale(1) rotate(0deg); opacity:1; }
    }
    @keyframes pvMBuzzPulse {
      0%,100% { transform:scale(1); filter:drop-shadow(0 12px 24px rgba(0,0,0,.5)) drop-shadow(0 0 0 rgba(255,60,60,0)); }
      50%     { transform:scale(1.07); filter:drop-shadow(0 16px 28px rgba(0,0,0,.5)) drop-shadow(0 0 28px rgba(255,70,70,.5)); }
    }
    @keyframes pvMBuzzRing {
      0%   { transform:translate(-50%,-50%) scale(.7); opacity:.7; }
      100% { transform:translate(-50%,-50%) scale(1.6); opacity:0; }
    }
    @keyframes pvMOptionsSlide {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes pvCochePop {
      0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
      60%  { transform: scale(1.25) rotate(5deg); opacity: 1; }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
    @keyframes pvShakeWrong {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-8px); }
      40%     { transform: translateX(7px); }
      60%     { transform: translateX(-5px); }
      80%     { transform: translateX(3px); }
    }
    @keyframes pvBonusFloat {
      0%   { opacity: 0; transform: translateY(0) scale(.8); }
      20%  { opacity: 1; transform: translateY(-6px) scale(1.1); }
      100% { opacity: 0; transform: translateY(-32px) scale(1); }
    }
    @keyframes pvFlashPouvoir {
      0%   { opacity: 0; }
      25%  { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes pvPouvoirBurst {
      0%   { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(0) scale(1); opacity: 1; }
      100% { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(-70px) scale(0); opacity: 0; }
    }
    @keyframes pvPouvoirLabel {
      0%   { opacity: 0; transform: translateX(-50%) translateY(10px); }
      20%  { opacity: 1; transform: translateX(-50%) translateY(0); }
      80%  { opacity: 1; }
      100% { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    }
  `;
  document.head.appendChild(s);
}

/* ── CLEANUP ── */
export function cleanup() {
  _S.ecranActif = false;
  _S.phase      = 'attente';

  _stopperChrono();

  _S.allTimers.forEach(clearTimeout);
  _S.allTimers = [];

  _S.nettoyages.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
  _S.nettoyages = [];

  document.getElementById('pv-overlay-cible')?.remove();
  document.querySelectorAll('[data-pv-coche-badge]').forEach(b => b.remove());
  document.querySelectorAll('style[id="pouvoirs-jeu-styles"]').forEach(s => s.remove());
  restaurerLayoutPouvoirs();

  _S.joueurs           = [];
  _S.questions         = [];
  _S.indexQ            = 0;
  _S.client            = null;
  _S.optionsCourantes  = [];
  _S.indexCorrect      = null;
  _S.optionEliminee    = null;
  _S.reponseLocale     = null;
  _S.mobileHasBuzzed   = false;
  _S.mobileOpts        = [];
  _S.desktopHasBuzzed  = false;
}
