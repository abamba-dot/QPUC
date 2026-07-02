/* ══════════════════════════════════════════════════════════
   jeu-paris.js — Mode Paris Pot-Commun complet
   Chrono 15s · Jetons cliquables · ALL-IN · Pot Commun
══════════════════════════════════════════════════════════ */

import { naviguer }            from '../routeur.js';
import { getState, mergeState } from '../state.js';
import { loadQuestions, melangerOptions } from '../questions-service.js';
import { playBtn }             from '../audio-hooks.js';
import { playCorrect, playWrong, playCountdownTick } from '../sound.js';
import { connectRealtime }     from '../realtime-client.js';
import { attachParisStage, PARIS_MOBILE_BREAKPOINT } from '../paris-stage.js';
import { esc }                 from '../utils.js';

export const titre = 'Mode Paris';

const IMG        = './assets/img/paris/';
const JETONS_SRC = `${IMG}paris-jetons.png`;
const POS_JETON  = { 50: '0%', 100: '33.333%', 250: '66.667%', 500: '100%' };
const VALEURS    = [50, 100, 250, 500];
const LETTRES    = ['A', 'B', 'C', 'D'];
const POSITIONS_ZONES = [
  'left:48px; top:240px;',
  'right:48px; top:240px;',
  'left:48px; top:500px;',
  'right:48px; top:500px;',
];
const COULEURS_JETON = [
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #38204A 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#6E4486,#4A2A5E)' },
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #16283F 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#356094,#1E3A5C)' },
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #5E4516 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#C49A3E,#8A6620)' },
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #121216 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#3A3A44,#1C1C22)' },
];
const COLORS_AVATAR = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];

function _detecterMobile() {
  return window.matchMedia(`(max-width: ${PARIS_MOBILE_BREAKPOINT}px)`).matches;
}

function jetonSprite(v, w = 56, h = 58) {
  return `<div style="width:${w}px;height:${h}px;background:url('${JETONS_SRC}') no-repeat;background-size:400% auto;background-position:${POS_JETON[v]} 56%;pointer-events:none;"></div>`;
}

/* ══ ÉTAT INTERNE ══ */
const _S = {
  joueurs:        [],
  questions:      [],
  indexQ:         0,
  nbQuestions:    10,
  pot:            0,
  jackpot:        0,
  phase:          'attente',
  timerInterval:  null,
  timerValue:     15,
  modeMulti:      false,
  joueurLocalIdx: 0,
  allTimers:      [],
  socketClient:   null,
  isHost:         false,
  ecranActif:              false,
  nettoyages:              [],
  questionServeurCourante: null,
  questionLocale:          null,
  indexCorrectServeur:     null,
  optionsCourantes:        [],
  isMobile:                false,
};

function _push(fn) { if (typeof fn === 'function') _S.nettoyages.push(fn); }
function _pushTimer(t) { _S.allTimers.push(t); }

/* ══ HTML ══ */
export const html = `
<div class="paris-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;
            overflow:hidden;background:#0A0804;">
  <div id="paris-stage" data-page-jeu-paris
       style="width:1920px;height:1080px;position:absolute;left:50%;top:50%;
              transform-origin:center center;
              background:#0A0804;font-family:'Manrope',sans-serif;user-select:none;">

  <img src="${IMG}paris-fond.png" alt=""
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;">
  <div style="position:absolute;inset:0;z-index:2;
              background:radial-gradient(ellipse 70% 60% at 50% 44%,rgba(0,0,0,0) 40%,rgba(6,4,2,.55) 100%);"></div>

  <img src="${IMG}paris-table.png" alt=""
       style="position:absolute;left:50%;top:152px;width:1858px;height:auto;
              transform:translateX(-50%);z-index:10;pointer-events:none;
              filter:drop-shadow(0 24px 60px rgba(0,0,0,.6));">

  <!-- ZONES JOUEURS (générées dynamiquement) -->
  <div id="zones-joueurs-paris" style="position:absolute;inset:0;z-index:30;pointer-events:none;"></div>

  <!-- HEADER -->
  <div style="position:absolute;left:50%;top:22px;transform:translateX(-50%);z-index:90;text-align:center;">
    <div style="padding:14px 56px 12px;border-radius:7px;
                border:1.5px solid rgba(200,150,60,.6);
                background:linear-gradient(180deg,#1C1408,#0C0A06);
                box-shadow:inset 0 1px 0 rgba(220,180,90,.3),0 6px 26px rgba(0,0,0,.6);">
      <div style="font:800 46px/1 'Cinzel';letter-spacing:.16em;color:#E8C063;white-space:nowrap;
                  text-shadow:0 0 30px rgba(232,184,75,.4);">MODE PARIS</div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px;">
      <div style="width:54px;height:1px;background:linear-gradient(to right,transparent,#C8963C);"></div>
      <div style="width:8px;height:8px;background:#C8963C;transform:rotate(45deg);"></div>
      <div style="width:54px;height:1px;background:linear-gradient(to left,transparent,#C8963C);"></div>
    </div>
  </div>

  <!-- TIMER (en haut, bien séparé) -->
  <div style="position:absolute;left:50%;top:160px;transform:translateX(-50%);z-index:95;">
    <div style="position:relative;width:72px;height:72px;">
      <svg viewBox="0 0 64 64" style="position:absolute;inset:0;">
        <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(200,150,60,.22)" stroke-width="5"/>
        <circle id="timer-ring-arc" cx="32" cy="32" r="27" fill="none" stroke="#C8963C" stroke-width="5"
          stroke-linecap="round" transform="rotate(-90 32 32)"
          stroke-dasharray="170" stroke-dashoffset="0"
          style="transition:stroke .3s ease;"/>
        <circle cx="32" cy="32" r="22" fill="#0C0A06"/>
      </svg>
      <span id="timer-val"
            style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                   font:800 22px/1 'Cinzel';color:#E8C063;">25</span>
    </div>
  </div>

  <!-- QUESTION + POT (sous le timer, avec espacement) -->
  <div style="position:absolute;left:50%;top:252px;transform:translateX(-50%);
              width:min(680px,80vw);text-align:center;z-index:40;">
    <div id="q-num-paris"
         style="font:700 12px/1 'Manrope';letter-spacing:.2em;color:rgba(232,184,75,.6);
                margin-bottom:10px;text-transform:uppercase;"></div>
    <div id="pot-wrap" style="display:none;margin-bottom:10px;">
      <span id="pot-affich"
            style="display:inline-flex;align-items:center;gap:6px;
                   padding:6px 18px;border-radius:99px;
                   background:linear-gradient(180deg,#2A1C0E,#160E06);
                   border:1px solid rgba(200,150,60,.5);
                   font:700 13px/1 'Manrope';color:#E8C063;">
        POT : <b id="pot-val">0</b> pts
      </span>
    </div>
    <div id="jackpot-wrap" style="display:none;margin-bottom:6px;">
      <span style="display:inline-flex;align-items:center;gap:6px;
                   padding:6px 20px;border-radius:99px;
                   background:linear-gradient(180deg,#2A0808,#160404);
                   border:1.5px solid rgba(232,80,58,.7);
                   font:800 13px/1 'Cinzel';color:#FF6B6B;
                   animation:pretPulse 1.4s ease-in-out infinite;">
        JACKPOT — <span id="jackpot-val">0</span> pts
      </span>
    </div>
    <div id="q-texte-paris"
         style="font:700 26px/1.4 'Manrope';color:rgba(255,255,255,.94);
                text-shadow:0 2px 10px rgba(0,0,0,.7);word-wrap:break-word;
                padding:0 20px;">Chargement...</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:14px;">
      <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,rgba(200,150,60,.5));"></div>
      <div style="width:8px;height:8px;background:#C8963C;transform:rotate(45deg);box-shadow:0 0 8px rgba(200,150,60,.5);"></div>
      <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,rgba(200,150,60,.5));"></div>
    </div>
  </div>

  <!-- CARTES RÉPONSES -->
  <div id="cartes-paris"
       style="position:absolute;left:50%;top:450px;transform:translateX(-50%);
              z-index:50;display:flex;gap:16px;pointer-events:auto;">
  </div>

  <!-- FOOTER -->
  <div id="footer-paris"
       style="position:absolute;left:50%;bottom:14px;transform:translateX(-50%);
              width:1810px;z-index:60;display:flex;gap:18px;">
  </div>
  </div>

  <!-- ══════════════════════════════════════════════
       MISE EN PAGE MOBILE NATIVE (< 760px)
  ══════════════════════════════════════════════ -->
  <div id="paris-mobile-layout"
       style="display:none;position:fixed;inset:0;z-index:200;
              background:#0A0804;flex-direction:column;
              font-family:'Manrope',sans-serif;user-select:none;
              overflow:hidden;">

    <img src="${IMG}paris-fond.png" alt=""
         style="position:absolute;inset:0;width:100%;height:100%;
                object-fit:cover;z-index:1;opacity:.5;">
    <div style="position:absolute;inset:0;z-index:2;
                background:linear-gradient(180deg,rgba(6,4,2,.75),rgba(6,4,2,.92));"></div>

    <div id="paris-mobile-header"
         style="position:relative;z-index:10;flex-shrink:0;
                padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;
                display:flex;flex-direction:column;align-items:center;gap:6px;">
    </div>

    <div id="paris-mobile-opponents"
         style="position:relative;z-index:10;flex-shrink:0;
                display:flex;gap:8px;padding:6px 12px 10px;
                overflow-x:auto;-webkit-overflow-scrolling:touch;">
    </div>

    <div id="paris-mobile-cards"
         style="position:relative;z-index:10;flex:1;min-height:0;
                display:grid;grid-template-columns:1fr 1fr;gap:10px;
                padding:6px 14px;overflow-y:auto;align-content:start;">
    </div>

    <div id="paris-mobile-actionbar"
         style="position:relative;z-index:20;flex-shrink:0;
                padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));
                background:linear-gradient(180deg,rgba(10,8,4,.4),rgba(10,8,4,.96) 30%);
                border-top:1px solid rgba(200,150,60,.35);
                display:flex;flex-direction:column;gap:8px;">
    </div>

  </div>
</div>
`;

/* ══ INIT ══ */
export async function init() {
  cleanup();
  _S.ecranActif = true;
  _push(() => { _S.ecranActif = false; });

  _forcerPleinEcran();
  _injecterStyles();
  void PARIS_MOBILE_BREAKPOINT;

  const stageEl = document.getElementById('paris-stage');
  if (stageEl) {
    _push(attachParisStage(stageEl));
  }

  const state      = getState();
  const modeParis  = state.modeParis || {};
  const config     = state.config    || {};
  _S.nbQuestions   = Math.max(1,
    Number(modeParis.nbQuestions) ||
    Number(config.nbQuestions)    ||
    10
  );
  _S.chrono = Math.max(15,
    Number(modeParis.chrono) ||
    Number(config.chrono)    ||
    25
  );
  _S.modeMulti     = config.mode === 'paris-multi' || sessionStorage.getItem('mode-multi-actif') === 'paris';
  _S.joueurLocalIdx = 0;

  const rawPlayers = (state.players?.length ? state.players : [
    { id: 1, name: 'Joueur 1', init: 'J1', colorIdx: 0 },
    { id: 2, name: 'Joueur 2', init: 'J2', colorIdx: 1 },
  ]).slice(0, 4);

  _S.joueurs = rawPlayers.map((p, i) => ({
    id:             p.id ?? i + 1,
    nom:            p.name || `Joueur ${i + 1}`,
    init:           p.init || String(p.name || `J${i+1}`).slice(0, 2).toUpperCase(),
    colorIdx:       p.colorIdx ?? i,
    score:          2500,
    miseCourante:   0,
    reponseCourante: null,
    confirme:       false,
    allinUsed:      false,
  }));

  const categorieConfig  = modeParis.categorie  || config.categorie  || config.category  || '';
  const difficulteConfig = modeParis.difficulte || config.difficulte || config.difficulty || '';
  const pool = await loadQuestions({
    category:   categorieConfig === 'mix' ? '' : categorieConfig,
    difficulty: difficulteConfig,
    limit:      Math.max(60, _S.nbQuestions * 3),
    fallback:   (getState().DEMO?.QUESTIONS || []),
  });
  _S.questions = _melangerTableau([...pool]).slice(0, _S.nbQuestions);
  _S.indexQ    = 0;
  _S.pot       = 0;
  _S.jackpot   = 0;

  _S.isMobile = _detecterMobile();
  const onResizeMobile = () => {
    const nowMobile = _detecterMobile();
    if (nowMobile !== _S.isMobile) {
      _S.isMobile = nowMobile;
      _appliquerModeAffichage();
    }
  };
  window.addEventListener('resize', onResizeMobile);
  window.addEventListener('orientationchange', onResizeMobile);
  _push(() => {
    window.removeEventListener('resize', onResizeMobile);
    window.removeEventListener('orientationchange', onResizeMobile);
  });

  _construireZones();
  _construireFooter();
  _afficherCartes([]);
  _appliquerModeAffichage();

  if (_S.modeMulti) {
    await _brancherSocket();
  } else {
    _demarrerQuestion();
  }
}

/* ══ CONSTRUCTION ZONES JOUEURS ══ */
function _construireZones() {
  const container = document.getElementById('zones-joueurs-paris');
  if (!container) return;

  container.innerHTML = _S.joueurs.map((j, i) => {
    const couleur  = COLORS_AVATAR[j.colorIdx % COLORS_AVATAR.length];
    const estLocal = !_S.modeMulti || i === _S.joueurLocalIdx;
    return `
    <div data-zone-joueur="${i}"
         style="position:absolute;${POSITIONS_ZONES[i]}width:340px;pointer-events:auto;
                padding:14px 16px 12px;border-radius:14px;
                border:${estLocal ? '2px solid rgba(232,184,75,.8)' : '1px solid rgba(200,150,60,.4)'};
                background:${estLocal
                  ? 'linear-gradient(150deg,rgba(50,35,70,.92),rgba(28,18,42,.96))'
                  : 'linear-gradient(150deg,rgba(30,20,45,.72),rgba(18,12,28,.76))'};
                box-shadow:inset 0 1px 0 rgba(220,180,90,.18),0 10px 30px rgba(0,0,0,.5);">
      <!-- Nom + avatar -->
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;">
        <div style="width:34px;height:34px;border-radius:50%;background:${couleur};flex-shrink:0;
                    display:flex;align-items:center;justify-content:center;
                    font:700 13px/1 'Manrope';color:#fff;">
          ${esc(j.init)}
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font:700 13px/1 'Manrope';letter-spacing:.08em;color:#E8C063;">
              ${esc(j.nom)}
            </span>
            ${estLocal && _S.modeMulti ? `<span style="font:700 9px 'Manrope';letter-spacing:.18em;color:#0A0804;background:#E8B84B;padding:2px 7px;border-radius:3px;">VOUS</span>` : ''}
          </div>
          <div style="font:600 11px/1 'Manrope';color:rgba(232,184,75,.55);margin-top:3px;"
               data-pts-display="${i}">${j.score} pts</div>
        </div>
        <div style="margin-left:auto;font:600 10px/1 'Manrope';letter-spacing:.16em;
                    color:rgba(200,150,60,.55);padding:3px 8px;border-radius:4px;
                    border:1px solid rgba(200,150,60,.25);"
             data-mise-display="${i}">—</div>
      </div>

      <!-- Jetons -->
      <div style="display:flex;gap:4px;justify-content:center;margin-bottom:9px;">
        ${VALEURS.map(v => `
          <div data-jeton="${v}" data-joueur="${i}" role="button" tabindex="0"
               aria-label="Miser ${v} points"
               style="width:56px;height:58px;cursor:pointer;border-radius:4px;
                      background:url('${JETONS_SRC}') no-repeat;
                      background-size:400% auto;background-position:${POS_JETON[v]} 56%;
                      transition:transform .12s,filter .12s,opacity .2s;"
               title="Miser ${v} pts">
          </div>
        `).join('')}
      </div>

      <!-- RÉSUMÉ DE MISE -->
      <div data-resume-mise="${i}"
           style="margin-bottom:8px;padding:7px 10px;border-radius:8px;
                  background:rgba(0,0,0,.3);border:1px solid rgba(200,150,60,.2);
                  min-height:28px;display:flex;align-items:center;gap:6px;">
        <span data-resume-mise-val="${i}"
              style="font:700 12px/1 'Manrope';color:rgba(200,150,60,.4);
                     flex:1;font-style:italic;">
          Choisissez un jeton…
        </span>
        <span data-resume-rep-lettre="${i}"
              style="display:none;font:900 15px/1 'Cinzel';
                     background:rgba(200,150,60,.2);border:1px solid rgba(200,150,60,.5);
                     border-radius:4px;padding:2px 8px;color:#E8C063;">
          A
        </span>
      </div>

      <!-- ALL-IN -->
      <button data-allin="${i}"
              style="width:100%;padding:6px 0;border-radius:6px;
                     border:1.5px solid rgba(200,150,60,.45);
                     background:linear-gradient(180deg,rgba(36,27,51,.7),rgba(18,14,30,.78));
                     font:700 11px/1 'Manrope';letter-spacing:.22em;color:#E8C063;
                     cursor:pointer;margin-bottom:8px;transition:background .15s;">
        ALL-IN
      </button>

      <!-- CONFIRMER -->
      <button data-confirmer="${i}" disabled
              style="width:100%;padding:9px 0;border-radius:8px;
                     border:1px solid rgba(200,150,60,.2);
                     background:rgba(0,0,0,.2);
                     font:700 11px/1 'Manrope';letter-spacing:.2em;
                     color:rgba(200,150,60,.3);opacity:.6;
                     cursor:not-allowed;transition:background .15s,border-color .15s;">
        Choisir jeton + réponse
      </button>
    </div>
    `;
  }).join('');

  /* Brancher les interactions des zones */
  _S.joueurs.forEach((_, i) => {
    const zone     = container.querySelector(`[data-zone-joueur="${i}"]`);
    if (!zone) return;
    const estLocal = !_S.modeMulti || i === _S.joueurLocalIdx;
    _brancherZoneJoueur(zone, i);
    _majBoutonConfirmer(i);
    /* En multi, masquer les contrôles des zones non-locales */
    if (_S.modeMulti && !estLocal) {
      zone.querySelectorAll('[data-jeton]').forEach(j => j.style.display = 'none');
      zone.querySelector(`[data-allin="${i}"]`)?.style.setProperty('display', 'none');
      zone.querySelector(`[data-confirmer="${i}"]`)?.style.setProperty('display', 'none');
      zone.querySelector(`[data-resume-mise="${i}"]`)?.style.setProperty('display', 'none');
    }
  });
}

function _choisirJeton(idx, valeur) {
  if (!_S.ecranActif || _S.phase !== 'mise') return false;
  const j = _S.joueurs[idx];
  if (!j || j.confirme) return false;
  if (_S.modeMulti && idx !== _S.joueurLocalIdx) return false;
  const maxMise = Math.max(0, j.score - 1);
  if (valeur > maxMise) { _flashErreur(`Vous n'avez que ${j.score} pts !`); return false; }
  j.miseCourante = valeur;
  playBtn();
  _rafraichirZone(idx);
  _rafraichirMiseHighlight(idx, valeur, false);
  _majBoutonConfirmer(idx);
  return true;
}

function _activerAllIn(idx) {
  if (!_S.ecranActif || _S.phase !== 'mise') return false;
  const j = _S.joueurs[idx];
  if (!j || j.confirme || j.allinUsed) return false;
  if (_S.modeMulti && idx !== _S.joueurLocalIdx) return false;
  j.miseCourante = j.score;
  j.allinUsed    = true;
  playBtn();
  _rafraichirZone(idx);
  _rafraichirMiseHighlight(idx, j.miseCourante, true);
  _majBoutonConfirmer(idx);
  return true;
}

function _rafraichirMiseHighlight(idx, valeur, isAllIn) {
  document.querySelectorAll(
    `[data-zone-joueur="${idx}"] [data-jeton], [data-mobile-jetons="${idx}"] [data-jeton]`
  ).forEach(jtn => {
    const estCeJeton = parseInt(jtn.dataset.jeton, 10) === valeur && !isAllIn;
    jtn.dataset.selectionne = estCeJeton ? '1' : '';
    jtn.style.transform     = estCeJeton ? 'scale(1.12) translateY(-3px)' : '';
    jtn.style.filter        = estCeJeton ? 'brightness(1.35) drop-shadow(0 0 8px rgba(232,184,75,.7))' : '';
    jtn.style.outline       = estCeJeton ? '2px solid #E8B84B' : '';
    jtn.style.outlineOffset = estCeJeton ? '2px' : '';
  });

  document.querySelectorAll(
    `[data-resume-mise-val="${idx}"], [data-mobile-resume-mise]`
  ).forEach(el => {
    el.textContent   = isAllIn ? `ALL-IN — ${valeur} pts` : `Mise : ${valeur} pts`;
    el.style.color   = isAllIn ? '#FFE500' : '#E8C063';
    el.style.fontStyle = 'normal';
  });

  if (isAllIn) {
    document.querySelectorAll(
      `[data-allin="${idx}"], [data-mobile-allin]`
    ).forEach(btn => {
      btn.textContent      = 'ALL-IN ✓';
      btn.style.background = 'linear-gradient(135deg,#E8B84B,#8B6914)';
      btn.style.color      = '#0A0804';
      btn.style.border     = '1.5px solid #E8B84B';
    });
  }
}

function _brancherZoneJoueur(zoneEl, idx) {
  /* Jetons */
  zoneEl.querySelectorAll('[data-jeton]').forEach(el => {
    const valeur = parseInt(el.dataset.jeton, 10);

    el.addEventListener('pointerdown', () => {
      if (el.dataset.selectionne !== '1') {
        el.style.transform = 'scale(.86)';
        el.style.filter    = 'brightness(1.3)';
      }
    });
    ['pointerup', 'pointerleave'].forEach(ev =>
      el.addEventListener(ev, () => {
        if (el.dataset.selectionne !== '1') {
          el.style.transform = '';
          el.style.filter    = '';
        }
      })
    );

    el.addEventListener('click', () => { _choisirJeton(idx, valeur); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  /* ALL-IN */
  const allInBtn = zoneEl.querySelector(`[data-allin="${idx}"]`);
  if (allInBtn) {
    allInBtn.addEventListener('click', () => { _activerAllIn(idx); });
  }

  /* CONFIRMER */
  const confirmBtn = zoneEl.querySelector(`[data-confirmer="${idx}"]`);
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!_S.ecranActif || _S.phase !== 'mise') return;
      const j = _S.joueurs[idx];
      if (!j || j.confirme) return;
      if (_S.modeMulti && idx !== _S.joueurLocalIdx) return;
      if (j.reponseCourante === null || j.miseCourante === 0) return;
      _confirmerJoueur(idx);
    });
  }
}

function _majBoutonConfirmer(idx) {
  const j = _S.joueurs[idx];
  if (!j) return;

  const btns = document.querySelectorAll(
    `[data-confirmer="${idx}"]${idx === _S.joueurLocalIdx ? ', [data-mobile-confirmer]' : ''}`
  );
  if (!btns.length) return;

  const miseOk    = j.miseCourante > 0;
  const reponseOk = j.reponseCourante !== null;
  const pret      = miseOk && reponseOk && !j.confirme;

  btns.forEach(btn => {
    if (j.confirme) {
      btn.textContent       = '✓ CONFIRMÉ';
      btn.style.color       = '#22C55E';
      btn.style.borderColor = '#22C55E';
      btn.style.background  = 'rgba(34,197,94,.15)';
      btn.style.cursor      = 'default';
      btn.style.opacity     = '1';
      btn.disabled          = true;
    } else if (pret) {
      btn.textContent       = 'CONFIRMER ✓';
      btn.style.color       = '#E8C063';
      btn.style.borderColor = 'rgba(200,150,60,.8)';
      btn.style.background  = 'linear-gradient(180deg,rgba(200,150,60,.25),rgba(200,150,60,.12))';
      btn.style.cursor      = 'pointer';
      btn.style.opacity     = '1';
      btn.disabled          = false;
    } else {
      const manque = [];
      if (!miseOk)    manque.push('jeton');
      if (!reponseOk) manque.push('réponse');
      btn.textContent       = 'Choisir ' + manque.join(' + ');
      btn.style.color       = 'rgba(200,150,60,.3)';
      btn.style.borderColor = 'rgba(200,150,60,.2)';
      btn.style.background  = 'rgba(0,0,0,.2)';
      btn.style.cursor      = 'not-allowed';
      btn.style.opacity     = '0.6';
      btn.disabled          = true;
    }
  });
}

/* ══ FOOTER ══ */
function _construireFooter() {
  const footer = document.getElementById('footer-paris');
  if (!footer) return;

  footer.innerHTML = _S.joueurs.map((j, i) => {
    const c = COULEURS_JETON[i % COULEURS_JETON.length];
    return `
    <div style="flex:1;height:130px;border-radius:14px;padding:3px;
                background:linear-gradient(180deg,#C99A3E,#5E441A);
                box-shadow:0 8px 22px rgba(0,0,0,.5);">
      <div style="width:100%;height:100%;border-radius:11px;
                  background:linear-gradient(160deg,#2A1C3E,#160E24);
                  display:flex;align-items:center;padding:0 16px 0 14px;gap:14px;
                  box-shadow:inset 0 1px 0 rgba(220,180,90,.15);">
        <!-- Jeton avatar -->
        <div style="width:64px;height:64px;border-radius:50%;flex-shrink:0;
                    background:${c.bg};box-shadow:0 4px 10px rgba(0,0,0,.5);
                    display:flex;align-items:center;justify-content:center;">
          <div style="width:46px;height:46px;border-radius:50%;
                      background:${c.inner};border:2px solid #C8963C;
                      display:flex;align-items:center;justify-content:center;">
            <div style="font:700 14px/1 'Manrope';color:#E8C063;">${esc(j.init)}</div>
          </div>
        </div>
        <!-- Infos -->
        <div style="flex:1;min-width:0;">
          <div style="font:700 13px/1 'Manrope';letter-spacing:.06em;color:#fff;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${esc(j.nom)}
          </div>
          <div style="font:600 11px/1 'Manrope';color:rgba(232,184,75,.65);margin-top:5px;"
               data-footer-pts="${i}">${j.score} pts</div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:7px;">
            <div data-pret-dot="${i}"
                 style="width:7px;height:7px;border-radius:50%;
                        background:rgba(255,255,255,.15);"></div>
            <span data-pret-label="${i}"
                  style="font:600 10px/1 'Manrope';letter-spacing:.14em;
                         color:rgba(255,255,255,.3);">EN ATTENTE</span>
          </div>
        </div>
        <!-- Mise footer -->
        <div style="text-align:center;flex-shrink:0;">
          <div style="font:700 9px/1 'Manrope';letter-spacing:.14em;
                      color:rgba(200,150,60,.55);margin-bottom:5px;">MISE</div>
          <div data-footer-mise="${i}"
               style="font:700 18px/1 'Cinzel';color:rgba(200,150,60,.4);">—</div>
        </div>
      </div>
    </div>
    `;
  }).join('');
}

/* ══ CARTES RÉPONSES ══ */
function _afficherCartes(opts, indexCorrect = -1, reveal = false) {
  const zone = document.getElementById('cartes-paris');
  if (!zone) return;

  zone.innerHTML = (opts || []).map((opt, i) => {
    const lettre   = LETTRES[i] || String(i + 1);
    const estBonne = reveal && i === indexCorrect;
    const estMauvaise = reveal && i !== indexCorrect;

    return `
    <div data-carte="${i}" role="button" tabindex="0" aria-label="Répondre ${lettre} : ${esc(opt)}"
         style="width:140px;height:234px;border-radius:16px;padding:3px;
                background:${estBonne
                  ? 'linear-gradient(150deg,#22C55E,#166534 48%,#22C55E)'
                  : 'linear-gradient(150deg,#A07C30,#46340F 48%,#A07C30)'};
                box-shadow:${estBonne
                  ? '0 0 28px rgba(34,197,94,.7),0 10px 24px rgba(0,0,0,.5)'
                  : '0 8px 22px rgba(0,0,0,.5)'};
                cursor:${reveal ? 'default' : 'pointer'};
                transition:transform .15s,background .35s;
                ${estMauvaise ? 'opacity:.4;filter:grayscale(.7)' : ''}">
      <div style="width:100%;height:100%;border-radius:13px;
                  background:${estBonne
                    ? 'linear-gradient(160deg,#14532D,#166534)'
                    : 'linear-gradient(160deg,#2C1C40,#150D22)'};
                  display:flex;flex-direction:column;align-items:center;
                  justify-content:center;gap:10px;
                  box-shadow:inset 0 2px 18px rgba(0,0,0,.55),
                             inset 0 0 0 1px rgba(200,150,60,.2);">
        <div style="font:800 36px/1 'Cinzel';color:${estBonne ? '#22C55E' : '#C8963C'};">
          ${lettre}
        </div>
        <div style="font:600 13px/1.3 'Manrope';color:rgba(255,255,255,.92);
                    text-align:center;padding:0 10px;word-break:break-word;"
             data-reponse-txt="${i}">
          ${esc(opt)}
        </div>
      </div>
    </div>
    `;
  }).join('');

  if (!reveal && opts.length > 0) {
    zone.querySelectorAll('[data-carte]').forEach(carte => {
      carte.addEventListener('pointerdown', () => { carte.style.transform = 'scale(.96)'; });
      ['pointerup', 'pointerleave'].forEach(ev =>
        carte.addEventListener(ev, () => { carte.style.transform = ''; })
      );
      carte.addEventListener('click', () => {
        if (_S.phase !== 'mise') return;
        const idx = parseInt(carte.dataset.carte, 10);

        if (_S.modeMulti) {
          const j = _S.joueurs[_S.joueurLocalIdx];
          if (j && !j.confirme) {
            j.reponseCourante = idx;
            /* Afficher la lettre dans la zone du joueur local */
            const zone = document.querySelector(`[data-zone-joueur="${_S.joueurLocalIdx}"]`);
            if (zone) {
              const lettreEl = zone.querySelector(`[data-resume-rep-lettre="${_S.joueurLocalIdx}"]`);
              if (lettreEl) {
                lettreEl.textContent   = LETTRES[idx] || '?';
                lettreEl.style.display = 'inline-block';
              }
            }
            _majBoutonConfirmer(_S.joueurLocalIdx);
            _surlignerCarte(idx);
          }
        } else {
          /* En local : le clic appartient au 1er joueur non confirmé */
          const joueurIdx = _S.joueurs.findIndex(j => !j.confirme);
          if (joueurIdx === -1) return;
          _S.joueurs[joueurIdx].reponseCourante = idx;
          /* Afficher la lettre dans la zone du joueur concerné */
          const zone = document.querySelector(`[data-zone-joueur="${joueurIdx}"]`);
          if (zone) {
            const lettreEl = zone.querySelector(`[data-resume-rep-lettre="${joueurIdx}"]`);
            if (lettreEl) {
              lettreEl.textContent   = LETTRES[idx] || '?';
              lettreEl.style.display = 'inline-block';
            }
          }
          _majBoutonConfirmer(joueurIdx);
          _surlignerCarte(idx);
        }
        playBtn();
      });
      carte.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); carte.click(); }
      });
    });
  }
}

function _surlignerCarte(indexSelectionne) {
  document.querySelectorAll('[data-carte]').forEach((c, i) => {
    c.style.background = i === indexSelectionne
      ? 'linear-gradient(150deg,#F0CE72,#7A5A1E 48%,#F0CE72)'
      : 'linear-gradient(150deg,#A07C30,#46340F 48%,#A07C30)';
    c.style.boxShadow = i === indexSelectionne
      ? '0 0 26px rgba(232,184,75,.8),0 10px 24px rgba(0,0,0,.5)'
      : '0 8px 22px rgba(0,0,0,.5)';
  });
}

function _afficherCartesMobile(opts, indexCorrect = -1, reveal = false) {
  const zone = document.getElementById('paris-mobile-cards');
  if (!zone) return;

  zone.innerHTML = (opts || []).map((opt, i) => {
    const lettre     = LETTRES[i] || String(i + 1);
    const estBonne   = reveal && i === indexCorrect;
    const estMauvaise = reveal && i !== indexCorrect;
    const jLocal     = _S.joueurs[_S.joueurLocalIdx];
    const estSel     = !reveal && jLocal?.reponseCourante === i;

    return `
    <button data-mobile-carte="${i}" type="button" aria-label="Répondre ${lettre} : ${esc(opt)}"
            style="min-height:84px;border-radius:14px;padding:3px;border:none;
                   background:${estBonne
                     ? 'linear-gradient(150deg,#22C55E,#166534 48%,#22C55E)'
                     : estSel
                       ? 'linear-gradient(150deg,#E8B84B,#8B6914 48%,#E8B84B)'
                       : 'linear-gradient(150deg,#A07C30,#46340F 48%,#A07C30)'};
                   box-shadow:${estBonne
                     ? '0 0 20px rgba(34,197,94,.6)'
                     : estSel
                       ? '0 0 16px rgba(232,184,75,.55)'
                       : '0 4px 12px rgba(0,0,0,.4)'};
                   ${estMauvaise ? 'opacity:.4;filter:grayscale(.7);' : ''}
                   cursor:${reveal ? 'default' : 'pointer'};
                   transition:transform .12s,background .25s;-webkit-tap-highlight-color:transparent;">
      <div style="width:100%;height:100%;border-radius:11px;
                  background:${estBonne
                    ? 'linear-gradient(160deg,#14532D,#166534)'
                    : 'linear-gradient(160deg,#2C1C40,#150D22)'};
                  display:flex;flex-direction:column;align-items:center;
                  justify-content:center;gap:4px;padding:10px 6px;">
        <div style="font:800 clamp(20px,6vw,26px)/1 'Cinzel';
                    color:${estBonne ? '#22C55E' : estSel ? '#0A0804' : '#C8963C'};">
          ${lettre}
        </div>
        <div style="font:600 clamp(11px,3.2vw,13px)/1.25 'Manrope';
                    color:${estSel && !estBonne ? '#0A0804' : 'rgba(255,255,255,.92)'};
                    text-align:center;word-break:break-word;">
          ${esc(opt)}
        </div>
      </div>
    </button>
    `;
  }).join('');

  if (reveal) return;

  zone.querySelectorAll('[data-mobile-carte]').forEach(carte => {
    carte.addEventListener('click', () => {
      if (_S.phase !== 'mise') return;
      const carteIdx = parseInt(carte.dataset.mobileCarte, 10);
      const j = _S.joueurs[_S.joueurLocalIdx];
      if (!j || j.confirme) return;
      j.reponseCourante = carteIdx;
      playBtn();
      _afficherCartesMobile(opts, indexCorrect, false);
      document.querySelectorAll(
        `[data-resume-rep-lettre="${_S.joueurLocalIdx}"], [data-mobile-resume-reponse]`
      ).forEach(el => {
        el.textContent   = LETTRES[carteIdx] || '?';
        el.style.display = 'inline-block';
      });
      _majBoutonConfirmer(_S.joueurLocalIdx);
    });
  });
}

/* ══ DÉROULEMENT QUESTION ══ */
function _demarrerQuestion() {
  if (!_S.ecranActif) return;

  /* ── Source de la question : serveur (multi) ou pool local ── */
  let qTexte, qOptions;
  if (_S.modeMulti) {
    if (!_S.questionServeurCourante) return; // en attente du serveur
    const srv = _S.questionServeurCourante;
    _S.questionServeurCourante = null;
    qTexte   = srv.question || srv.q   || '';
    qOptions = srv.options  || srv.opts || [];
  } else {
    if (_S.indexQ >= _S.questions.length) { _finPartie(); return; }
    _S.questionLocale = _S.questions[_S.indexQ];
    qTexte   = _S.questionLocale.question || _S.questionLocale.q   || '';
    qOptions = _S.questionLocale.options  || _S.questionLocale.opts || [];
  }
  _S.optionsCourantes = qOptions;

  /* Réinitialiser l'état des joueurs pour cette question */
  _S.joueurs.forEach(j => {
    j.miseCourante    = 0;
    j.reponseCourante = null;
    j.confirme        = false;
  });
  _S.pot   = 0;
  _S.phase = 'mise';

  /* Réinitialiser les zones joueurs */
  _S.joueurs.forEach((j, i) => {
    const zone = document.querySelector(`[data-zone-joueur="${i}"]`);
    if (!zone) return;

    const resumeEl = zone.querySelector(`[data-resume-mise-val="${i}"]`);
    if (resumeEl) {
      resumeEl.textContent     = 'Choisissez un jeton…';
      resumeEl.style.color     = 'rgba(200,150,60,.4)';
      resumeEl.style.fontStyle = 'italic';
    }
    const lettreEl = zone.querySelector(`[data-resume-rep-lettre="${i}"]`);
    if (lettreEl) lettreEl.style.display = 'none';

    zone.querySelectorAll('[data-jeton]').forEach(e => {
      e.dataset.selectionne = '';
      e.style.transform     = '';
      e.style.filter        = '';
      e.style.outline       = '';
      e.style.outlineOffset = '';
    });

    const allIn = zone.querySelector(`[data-allin="${i}"]`);
    if (allIn && !j.allinUsed) {
      allIn.textContent      = 'ALL-IN';
      allIn.style.background = 'linear-gradient(180deg,rgba(36,27,51,.7),rgba(18,14,30,.78))';
      allIn.style.color      = '#E8C063';
      allIn.style.border     = '1.5px solid rgba(200,150,60,.45)';
    }

    _mettreAJourJetonsZone(zone, j);
    _majBoutonConfirmer(i);
  });

  /* Réinitialisation mobile */
  const mResumeMise = document.querySelector('[data-mobile-resume-mise]');
  if (mResumeMise) { mResumeMise.textContent = 'Choisissez un jeton…'; mResumeMise.style.color = 'rgba(200,150,60,.4)'; mResumeMise.style.fontStyle = 'italic'; }
  const mResumeRep = document.querySelector('[data-mobile-resume-reponse]');
  if (mResumeRep) mResumeRep.style.display = 'none';
  document.querySelectorAll('[data-mobile-jetons] [data-jeton]').forEach(jtn => {
    jtn.dataset.selectionne = ''; jtn.style.transform = ''; jtn.style.filter = ''; jtn.style.outline = '';
  });
  const mAllin = document.querySelector('[data-mobile-allin]');
  const jLocal = _S.joueurs[_S.joueurLocalIdx];
  if (mAllin && !jLocal?.allinUsed) {
    mAllin.textContent = 'ALL-IN';
    mAllin.style.background = 'linear-gradient(180deg,rgba(36,27,51,.7),rgba(18,14,30,.8))';
    mAllin.style.color = '#E8C063';
    mAllin.style.border = '1.5px solid rgba(200,150,60,.5)';
  }

  /* Afficher la question */
  const qEl  = document.getElementById('q-texte-paris');
  const qNum = document.getElementById('q-num-paris');
  if (qEl)  qEl.textContent  = qTexte;
  if (qNum) qNum.textContent = `Question ${_S.indexQ + 1} / ${_S.nbQuestions}`;

  const qNumM = document.getElementById('q-num-paris-mobile');
  if (qNumM) qNumM.textContent = `Question ${_S.indexQ + 1} / ${_S.nbQuestions}`;
  const qTxtM = document.getElementById('q-texte-paris-mobile');
  if (qTxtM) qTxtM.textContent = qTexte;

  _afficherCartes(qOptions);
  if (_S.isMobile) _afficherCartesMobile(qOptions, -1, false);
  _rafraichirFooter();
  _afficherPot();

  const duree = _S.chrono || getState().modeParis?.chrono || 25;
  _demarrerChrono(duree, _onTimeoutQuestion);
}

function _mettreAJourJetonsZone(zoneEl, j) {
  zoneEl.querySelectorAll('[data-jeton]').forEach(el => {
    const v = parseInt(el.dataset.jeton, 10);
    const abordable = j.score - 1 >= v;
    el.style.opacity = abordable ? '1' : '.2';
    el.style.cursor  = abordable ? 'pointer' : 'not-allowed';
  });
}

function _onTimeoutQuestion() {
  _S.joueurs.forEach(j => {
    if (!j.confirme) {
      j.miseCourante    = 0;
      j.reponseCourante = null;
      j.confirme        = true;
    }
  });
  _revelerResultats();
}

/* ══ CONFIRMER UN JOUEUR ══ */
function _confirmerJoueur(idx) {
  const j = _S.joueurs[idx];
  if (!j || j.confirme) return;

  j.confirme = true;
  _S.pot    += j.miseCourante;
  playBtn();

  _majBoutonConfirmer(idx);
  _rafraichirFooter();
  _afficherPot();

  if (_S.modeMulti && _S.socketClient?.socket) {
    _S.socketClient.socket.emit('paris:confirmer', {
      mise:    j.miseCourante,
      reponse: j.reponseCourante,
    });
  } else {
    /* Mode local : si tout le monde a confirmé → révéler */
    if (_S.joueurs.every(j2 => j2.confirme)) {
      _stopperChrono();
      _revelerResultats();
    }
  }
}

/* ══ CHRONO ══ */
function _demarrerChrono(duree, onFin) {
  _stopperChrono();
  _S.timerValue = duree;
  _updateTimerDisplay(_S.timerValue);

  /* Anneau SVG */
  const arc = document.getElementById('timer-ring-arc');
  if (arc) {
    const total = 170;
    arc.style.transition   = 'none';
    arc.style.strokeDashoffset = '0';
    void arc.getBoundingClientRect();
    arc.style.transition   = `stroke-dashoffset ${duree}s linear`;
    arc.style.strokeDashoffset = String(total);
  }

  const arcMobile = document.getElementById('timer-ring-arc-mobile');
  if (arcMobile) {
    const total = 170;
    arcMobile.style.transition = 'none';
    arcMobile.style.strokeDashoffset = '0';
    void arcMobile.getBoundingClientRect();
    arcMobile.style.transition = `stroke-dashoffset ${duree}s linear`;
    arcMobile.style.strokeDashoffset = String(total);
  }

  _S.timerInterval = setInterval(() => {
    _S.timerValue--;
    _updateTimerDisplay(_S.timerValue);

    if (_S.timerValue <= 5 && _S.timerValue > 0) {
      try { playCountdownTick?.(); } catch (e) { /* ignore */ }
    }

    const numEl = document.getElementById('timer-val');
    if (numEl) numEl.style.color = _S.timerValue <= 5 ? '#E85A3A' : '#E8C063';

    if (_S.timerValue <= 0) {
      _stopperChrono();
      if (!_S.modeMulti) {
        onFin?.();
      }
    }
  }, 1000);
}

function _stopperChrono() {
  if (_S.timerInterval) {
    clearInterval(_S.timerInterval);
    _S.timerInterval = null;
  }
}

function _updateTimerDisplay(val) {
  const el = document.getElementById('timer-val');
  if (el) el.textContent = Math.max(0, val);
  const numM = document.getElementById('timer-val-mobile');
  if (numM) {
    numM.textContent = Math.max(0, val);
    numM.style.color = val <= 5 ? '#E85A3A' : '#E8C063';
  }
}

/* ══ RÉVÉLATION ══ */
function _revelerResultats() {
  if (_S.phase === 'revelation' || _S.phase === 'resultat' || _S.phase === 'fin') return;
  _S.phase = 'revelation';
  _stopperChrono();

  const opts = _S.optionsCourantes || [];

  const t1 = setTimeout(() => {
    if (!_S.ecranActif) return;
    _afficherChoixSurCartes();

    const t2 = setTimeout(() => {
      if (!_S.ecranActif) return;

      const indexCorrect = _S.modeMulti
        ? (_S.indexCorrectServeur ?? -1)
        : (_S.questionLocale?.c ?? _S.questionLocale?.indexCorrect ?? -1);

      _afficherCartes(opts, indexCorrect, true);
      if (_S.isMobile) _afficherCartesMobile(opts, indexCorrect, true);

      if (indexCorrect !== -1) {
        try { playCorrect(); } catch (e) {}
      }

      const t3 = setTimeout(() => {
        if (!_S.ecranActif) return;
        _calculerPot(indexCorrect);
      }, 1200);
      _pushTimer(t3);
    }, 2000);
    _pushTimer(t2);
  }, 1200);
  _pushTimer(t1);
}

function _afficherChoixSurCartes() {
  _S.joueurs.forEach((j, i) => {
    if (j.reponseCourante === null || j.miseCourante === 0) return;
    const carte = document.querySelector(`[data-carte="${j.reponseCourante}"]`);
    if (!carte) return;

    const badge = document.createElement('div');
    badge.textContent = `${j.nom} (${j.miseCourante}pts)`;
    badge.style.cssText = `
      position:absolute;bottom:4px;left:50%;transform:translateX(-50%);
      font:600 9px 'Manrope';color:#E8C063;
      background:rgba(0,0,0,.7);padding:2px 6px;
      border-radius:4px;white-space:nowrap;
      animation:parisFloatUp .3s ease ${i * 0.1}s both;
    `;
    carte.style.position = 'relative';
    carte.appendChild(badge);
  });
}

function _calculerPot(indexCorrect) {
  const potTotal = _S.pot + _S.jackpot;

  const gagnants = _S.joueurs.filter(j =>
    j.reponseCourante === indexCorrect && j.miseCourante > 0
  );

  if (gagnants.length === 0) {
    if (potTotal > 0) {
      /* Vrai jackpot : le pot se cumule */
      _S.jackpot = potTotal;
      _S.pot     = 0;
      _S.joueurs.forEach(j => {
        if (j.miseCourante > 0) {
          j.score -= j.miseCourante;
          j.score  = Math.max(0, j.score);
        }
      });
      _rafraichirFooter();
      _afficherPot();
      mergeState({ players: _S.joueurs.map(j => ({ ...j, score: j.score })) });
      _afficherResultatOverlay({ type: 'jackpot', pot: potTotal });

      if (!_S.modeMulti && _S.joueurs.some(j => j.score < 50)) {
        const t = setTimeout(() => {
          if (!_S.ecranActif) return;
          _finPartie();
        }, 1800);
        _pushTimer(t);
      }
    } else {
      /* Personne n'a misé — passer silencieusement sans overlay */
      if (!_S.modeMulti) {
        const t = setTimeout(() => {
          if (!_S.ecranActif) return;
          _S.indexQ++;
          _demarrerQuestion();
        }, 800);
        _pushTimer(t);
      }
    }
    return;
  }

  /* Au moins un gagnant */
  _S.jackpot = 0;
  _S.pot     = 0;

  /* Toutes les mises quittent d'abord les scores et alimentent le pot commun. */
  _S.joueurs.forEach(j => {
    if (j.miseCourante > 0) {
      j.score -= j.miseCourante;
      j.score  = Math.max(0, j.score);
    }
  });

  if (gagnants.length === 1) {
    gagnants[0].score += potTotal;
    _afficherResultatOverlay({ type: 'solo', gagnant: gagnants[0], pot: potTotal });
  } else {
    const miseTotale = gagnants.reduce((s, j) => s + j.miseCourante, 0);
    const parts = gagnants.map(j => {
      const valeurExacte = miseTotale > 0
        ? (j.miseCourante / miseTotale) * potTotal
        : potTotal / gagnants.length;
      return { joueur: j, part: Math.floor(valeurExacte), reste: valeurExacte - Math.floor(valeurExacte) };
    });
    let restePot = potTotal - parts.reduce((s, item) => s + item.part, 0);
    parts
      .sort((a, b) => b.reste - a.reste)
      .forEach(item => {
        if (restePot > 0) {
          item.part += 1;
          restePot -= 1;
        }
      });
    parts.forEach(({ joueur, part }) => {
      joueur.score += part;
    });
    _afficherResultatOverlay({ type: 'partage', gagnants, pot: potTotal });
  }

  _rafraichirFooter();
  _afficherPot();
  mergeState({ players: _S.joueurs.map(j => ({ ...j, score: j.score })) });

  /* Mode LOCAL uniquement — en multi, le serveur envoie paris:question-suivante */
  if (!_S.modeMulti) {
    const t = setTimeout(() => {
      if (!_S.ecranActif) return;
      if (_S.joueurs.some(j => j.score < 50)) {
        _finPartie();
        return;
      }
      _S.indexQ++;
      _demarrerQuestion();
    }, 3200);
    _pushTimer(t);
  }
}

/* ══ OVERLAY RÉSULTAT ══ */
function _afficherResultatOverlay({ type, gagnant, gagnants = [], pot }) {
  const jWrap = document.getElementById('jackpot-wrap');
  const pWrap = document.getElementById('pot-wrap');
  if (jWrap) jWrap.style.display = 'none';
  if (pWrap) pWrap.style.display = 'none';

  /* ── JACKPOT : takeover plein écran ── */
  if (type === 'jackpot') {
    try { playWrong(); } catch (e) {}

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:300;
      background:#070305;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Manrope',sans-serif;text-align:center;overflow:hidden;
      animation:jkFadeIn .35s ease-out both;
    `;

    overlay.innerHTML = `
      <!-- fond rouge pulsé -->
      <div style="position:absolute;inset:0;pointer-events:none;
                  background:radial-gradient(ellipse 70% 55% at 50% 50%,rgba(180,20,20,.28) 0%,transparent 70%);
                  animation:jkHalo 2s ease-in-out infinite;"></div>

      <!-- particules cartes -->
      <div id="jk-particles" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;"></div>

      <!-- contenu principal -->
      <div style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:0;">

        <!-- étiquette -->
        <div style="font:700 clamp(11px,1.2vw,14px)/1 'Manrope';letter-spacing:.45em;text-indent:.45em;
                    color:rgba(220,80,60,.85);text-transform:uppercase;margin-top:28px;
                    animation:jkFadeUp .5s ease-out .45s both;">
          personne n'a trouvé
        </div>

        <!-- titre JACKPOT -->
        <div style="font:900 clamp(72px,9vw,130px)/1 'Cinzel';letter-spacing:.06em;
                    background:linear-gradient(180deg,#FF6B6B 0%,#C8963C 45%,#FF6B6B 100%);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
                    filter:drop-shadow(0 0 30px rgba(220,50,30,.7));
                    margin-top:10px;
                    animation:jkTitlePop .7s cubic-bezier(.16,.84,.3,1) .6s both;">
          JACKPOT
        </div>

        <!-- ligne décorative -->
        <div style="display:flex;align-items:center;gap:16px;margin-top:22px;
                    animation:jkFadeUp .5s ease-out .9s both;width:min(640px,80vw);">
          <div style="flex:1;height:1.5px;background:linear-gradient(to right,transparent,rgba(220,80,60,.6));"></div>
          <div style="width:8px;height:8px;transform:rotate(45deg);background:#C8963C;
                      box-shadow:0 0 12px rgba(200,150,60,.8);flex-shrink:0;"></div>
          <div style="flex:1;height:1.5px;background:linear-gradient(to left,transparent,rgba(220,80,60,.6));"></div>
        </div>

        <!-- montant du pot -->
        <div style="margin-top:24px;animation:jkFadeUp .6s ease-out 1.1s both;">
          <div style="font:700 clamp(10px,1.1vw,13px)/1 'Manrope';letter-spacing:.3em;text-indent:.3em;
                      color:rgba(232,184,75,.55);text-transform:uppercase;margin-bottom:12px;">
            le pot passe à
          </div>
          <div style="font:900 clamp(52px,7vw,96px)/1 'Cinzel';
                      color:#FFE500;
                      text-shadow:0 0 60px rgba(255,229,0,.5),0 0 120px rgba(255,180,0,.25),0 4px 12px rgba(0,0,0,.8);
                      animation:jkCounterGlow 1.6s ease-in-out 1.4s infinite;">
            ${pot.toLocaleString('fr-FR')} pts
          </div>
        </div>

        <!-- sous-titre -->
        <div style="font:600 clamp(13px,1.4vw,16px)/1.5 'Manrope';
                    color:rgba(255,255,255,.4);margin-top:22px;
                    animation:jkFadeUp .5s ease-out 1.35s both;">
          Aucune bonne réponse &mdash; le pot continue de grossir&hellip;
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    /* Particules cartes flottantes */
    const pBox = overlay.querySelector('#jk-particles');
    if (pBox) {
      const symbols = ['♠','♦','♣','♥'];
      for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        const sz = 18 + Math.random() * 28;
        const dur = 4 + Math.random() * 5;
        const delay = Math.random() * 3;
        p.style.cssText = `
          position:absolute;left:${Math.random()*100}%;top:110%;
          font-size:${sz}px;opacity:0;pointer-events:none;
          animation:jkParticleRise ${dur}s linear ${delay}s infinite;
          filter:drop-shadow(0 0 8px rgba(255,80,60,.5));
        `;
        p.textContent = symbols[(Math.random()*symbols.length)|0];
        pBox.appendChild(p);
      }
    }

    const t = setTimeout(() => {
      overlay.style.animation = 'jkFadeOut .4s ease-in both';
      const t2 = setTimeout(() => { overlay.remove(); _afficherPot(); }, 380);
      _pushTimer(t2);
    }, 4400);
    _pushTimer(t);
    return;
  }

  /* ── SOLO / PARTAGE : carte centrée (inchangée) ── */
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
    background:linear-gradient(160deg,#2C1C40,#150D22);
    border:2px solid #E8B84B;border-radius:20px;
    padding:28px 44px;text-align:center;z-index:150;min-width:300px;
    box-shadow:0 0 40px rgba(232,184,75,.3),0 20px 60px rgba(0,0,0,.6);
    animation:parisBadgePop .4s cubic-bezier(.2,1.2,.4,1) both;
    font-family:'Manrope',sans-serif;
  `;

  let inner = '';
  if (type === 'solo') {
    inner = `
      <div style="font:800 13px/1 'Cinzel';letter-spacing:.2em;color:#E8B84B;margin-bottom:10px;">GAGNANT !</div>
      <div style="font:700 20px/1 'Manrope';color:#fff;margin-bottom:10px;">${esc(gagnant.nom)}</div>
      <div style="font:700 48px/1 'Cinzel';color:#22C55E">+${pot} pts</div>
    `;
    try { playCorrect(); } catch (e) {}
  } else {
    const liste = gagnants.map(j => esc(j.nom)).join(' &amp; ');
    inner = `
      <div style="font:800 13px/1 'Cinzel';letter-spacing:.2em;color:#E8B84B;margin-bottom:10px;">PARTAGE !</div>
      <div style="font:600 15px 'Manrope';color:rgba(255,255,255,.85);margin-bottom:8px;">${liste}</div>
      <div style="font:700 48px/1 'Cinzel';color:#22C55E">${pot} pts</div>
    `;
    try { playCorrect(); } catch (e) {}
  }

  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  const t = setTimeout(() => {
    overlay.remove();
    _afficherPot();
  }, 2800);
  _pushTimer(t);
}

/* ══ AFFICHAGE ══ */
function _rafraichirZone(idx) {
  const j   = _S.joueurs[idx];
  if (!j) return;

  const ptsEl  = document.querySelector(`[data-pts-display="${idx}"]`);
  const miseEl = document.querySelector(`[data-mise-display="${idx}"]`);
  if (ptsEl)  ptsEl.textContent  = `${j.score} pts`;
  if (miseEl) {
    const estLocal = !_S.modeMulti || idx === _S.joueurLocalIdx;
    if (estLocal || _S.phase === 'revelation') {
      miseEl.textContent = j.miseCourante > 0 ? `${j.miseCourante} pts` : '—';
      miseEl.style.color = '';
    } else {
      miseEl.textContent = j.confirme ? '●●●' : '—';
      miseEl.style.color = 'rgba(255,255,255,.2)';
    }
  }
  if (idx === _S.joueurLocalIdx) {
    const mPts = document.querySelector('[data-mobile-pts]');
    if (mPts) mPts.textContent = `${j.score} pts`;
  }
}

function _rafraichirFooter() {
  _S.joueurs.forEach((j, i) => {
    const ptsEl   = document.querySelector(`[data-footer-pts="${i}"]`);
    const miseEl  = document.querySelector(`[data-footer-mise="${i}"]`);
    const dot     = document.querySelector(`[data-pret-dot="${i}"]`);
    const label   = document.querySelector(`[data-pret-label="${i}"]`);

    if (ptsEl)  ptsEl.textContent  = `${j.score} pts`;
    if (miseEl) {
      const estLocal = !_S.modeMulti || i === _S.joueurLocalIdx;
      if (_S.phase !== 'mise' || estLocal) {
        miseEl.textContent = j.confirme
          ? (j.miseCourante > 0 ? `${j.miseCourante}` : '–')
          : '—';
        miseEl.style.color = '';
      } else {
        miseEl.textContent = j.confirme ? '●●●' : '—';
        miseEl.style.color = 'rgba(255,255,255,.2)';
      }
    }
    if (dot)    dot.style.background   = j.confirme ? '#22C55E' : 'rgba(255,255,255,.15)';
    if (dot && j.confirme) dot.style.animation = 'pretPulse 1.4s ease-in-out infinite';
    if (label)  label.textContent  = j.confirme ? 'PRÊT' : 'EN ATTENTE';
    if (label)  label.style.color  = j.confirme ? '#22C55E' : 'rgba(255,255,255,.3)';
  });
  _rafraichirOpponentsMobile();
}

function _afficherPot() {
  const potWrap  = document.getElementById('pot-wrap');
  const potVal   = document.getElementById('pot-val');
  const jWrap    = document.getElementById('jackpot-wrap');
  const jVal     = document.getElementById('jackpot-val');
  const total    = _S.pot + _S.jackpot;

  if (potWrap) potWrap.style.display  = total > 0 ? 'block' : 'none';
  if (potVal)  potVal.textContent     = total;
  if (jWrap)   jWrap.style.display    = _S.jackpot > 0 ? 'block' : 'none';
  if (jVal)    jVal.textContent       = _S.jackpot;

  const potWrapM = document.getElementById('pot-wrap-mobile');
  const potValM  = document.getElementById('pot-val-mobile');
  const jWrapM   = document.getElementById('jackpot-wrap-mobile');
  const jValM    = document.getElementById('jackpot-val-mobile');
  if (potWrapM) potWrapM.style.display = total > 0 ? 'block' : 'none';
  if (potValM)  potValM.textContent    = total;
  if (jWrapM)   jWrapM.style.display   = _S.jackpot > 0 ? 'block' : 'none';
  if (jValM)    jValM.textContent      = _S.jackpot;
}

function _flashErreur(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;bottom:200px;left:50%;transform:translateX(-50%);
    background:rgba(232,90,58,.9);color:#fff;padding:10px 22px;
    border-radius:8px;font:700 13px 'Manrope';z-index:200;
    animation:parisFloatUp .3s ease both;pointer-events:none;
  `;
  document.body.appendChild(el);
  const t = setTimeout(() => el.remove(), 1800);
  _pushTimer(t);
}

/* ══ MOBILE — CONSTRUCTION ══ */
function _construireMobileHeader() {
  const zone = document.getElementById('paris-mobile-header');
  if (!zone) return;

  zone.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;width:100%;justify-content:center;">
      <div style="font:800 clamp(15px,4.5vw,18px)/1 'Cinzel';letter-spacing:.12em;color:#E8C063;">MODE PARIS</div>
      <div style="position:relative;width:38px;height:38px;flex-shrink:0;">
        <svg viewBox="0 0 64 64" style="position:absolute;inset:0;">
          <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(200,150,60,.22)" stroke-width="6"/>
          <circle id="timer-ring-arc-mobile" cx="32" cy="32" r="27" fill="none" stroke="#C8963C" stroke-width="6"
            stroke-linecap="round" transform="rotate(-90 32 32)"
            stroke-dasharray="170" stroke-dashoffset="0" style="transition:stroke .3s ease;"/>
          <circle cx="32" cy="32" r="20" fill="#0C0A06"/>
        </svg>
        <span id="timer-val-mobile"
              style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                     font:800 14px/1 'Cinzel';color:#E8C063;">${_S.timerValue}</span>
      </div>
    </div>

    <div id="q-num-paris-mobile"
         style="font:700 10px/1 'Manrope';letter-spacing:.16em;color:rgba(232,184,75,.6);
                text-transform:uppercase;"></div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
      <div id="pot-wrap-mobile" style="display:none;">
        <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;
                     border-radius:99px;background:linear-gradient(180deg,#2A1C0E,#160E06);
                     border:1px solid rgba(200,150,60,.5);font:700 11px/1 'Manrope';color:#E8C063;">
          POT : <b id="pot-val-mobile">0</b> pts
        </span>
      </div>
      <div id="jackpot-wrap-mobile" style="display:none;">
        <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;
                     border-radius:99px;background:linear-gradient(180deg,#2A0808,#160404);
                     border:1.5px solid rgba(232,80,58,.7);font:800 11px/1 'Cinzel';color:#FF6B6B;
                     animation:pretPulse 1.4s ease-in-out infinite;">
          JACKPOT — <span id="jackpot-val-mobile">0</span> pts
        </span>
      </div>
    </div>

    <div id="q-texte-paris-mobile"
         style="font:700 clamp(15px,4.5vw,18px)/1.35 'Manrope';color:rgba(255,255,255,.94);
                text-align:center;padding:0 4px;">Chargement...</div>
  `;
}

function _construireOpponentsStripMobile() {
  const zone = document.getElementById('paris-mobile-opponents');
  if (!zone) return;

  const autres = _S.joueurs
    .map((j, i) => ({ j, i }))
    .filter(({ i }) => i !== _S.joueurLocalIdx);

  if (!autres.length) { zone.style.display = 'none'; return; }
  zone.style.display = 'flex';

  zone.innerHTML = autres.map(({ j, i }) => {
    const couleur = COLORS_AVATAR[j.colorIdx % COLORS_AVATAR.length];
    return `
    <div data-mobile-opponent="${i}"
         style="flex-shrink:0;display:flex;align-items:center;gap:7px;
                padding:7px 12px 7px 7px;border-radius:99px;
                background:linear-gradient(150deg,rgba(30,20,45,.85),rgba(18,12,28,.9));
                border:1px solid rgba(200,150,60,.3);min-width:max-content;">
      <div style="width:28px;height:28px;border-radius:50%;background:${couleur};
                  display:flex;align-items:center;justify-content:center;flex-shrink:0;
                  font:700 11px/1 'Manrope';color:#fff;">${esc(j.init)}</div>
      <div>
        <div style="font:700 11px/1 'Manrope';color:#E8C063;white-space:nowrap;
                    max-width:80px;overflow:hidden;text-overflow:ellipsis;">${esc(j.nom)}</div>
        <div style="display:flex;align-items:center;gap:5px;margin-top:2px;">
          <span data-mobile-opp-pts="${i}"
                style="font:600 10px/1 'Manrope';color:rgba(232,184,75,.6);">${j.score} pts</span>
          <span data-mobile-opp-dot="${i}"
                style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.15);
                       display:inline-block;"></span>
        </div>
      </div>
    </div>
    `;
  }).join('');
}

function _construireActionBarMobile() {
  const zone = document.getElementById('paris-mobile-actionbar');
  if (!zone) return;
  const idx = _S.joueurLocalIdx;
  const j   = _S.joueurs[idx];
  if (!j) return;

  zone.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;
                background:rgba(0,0,0,.3);border:1px solid rgba(200,150,60,.2);min-height:30px;">
      <span data-mobile-resume-mise
            style="flex:1;font:700 12px/1 'Manrope';color:rgba(200,150,60,.4);font-style:italic;">
        Choisissez un jeton…
      </span>
      <span data-mobile-resume-reponse
            style="display:none;font:900 14px/1 'Cinzel';background:rgba(200,150,60,.2);
                   border:1px solid rgba(200,150,60,.5);border-radius:4px;padding:2px 8px;color:#E8C063;">
        A
      </span>
    </div>

    <div data-mobile-jetons="${idx}" style="display:flex;gap:6px;align-items:center;">
      ${VALEURS.map(v => `
        <div data-jeton="${v}" data-joueur="${idx}" role="button" tabindex="0"
             aria-label="Miser ${v} points"
             style="flex:1;aspect-ratio:1;min-height:44px;max-width:60px;cursor:pointer;border-radius:6px;
                    background:url('${JETONS_SRC}') no-repeat;background-size:400% auto;
                    background-position:${POS_JETON[v]} 56%;
                    transition:transform .12s,filter .12s;"></div>
      `).join('')}
      <button data-mobile-allin type="button"
              style="flex-shrink:0;padding:0 14px;min-height:44px;border-radius:8px;
                     border:1.5px solid rgba(200,150,60,.5);
                     background:linear-gradient(180deg,rgba(36,27,51,.7),rgba(18,14,30,.8));
                     font:800 11px/1 'Manrope';letter-spacing:.1em;color:#E8C063;
                     -webkit-tap-highlight-color:transparent;">
        ALL-IN
      </button>
    </div>

    <button data-mobile-confirmer disabled type="button"
            style="width:100%;min-height:48px;border-radius:10px;border:1px solid rgba(200,150,60,.2);
                   background:rgba(0,0,0,.2);font:800 13px/1 'Manrope';letter-spacing:.14em;
                   color:rgba(200,150,60,.3);cursor:not-allowed;-webkit-tap-highlight-color:transparent;">
      Choisir jeton + réponse
    </button>
  `;

  zone.querySelectorAll('[data-jeton]').forEach(el => {
    const valeur = parseInt(el.dataset.jeton, 10);
    el.addEventListener('pointerdown', () => {
      if (el.dataset.selectionne !== '1') { el.style.transform = 'scale(.9)'; el.style.filter = 'brightness(1.25)'; }
    });
    ['pointerup', 'pointerleave'].forEach(ev =>
      el.addEventListener(ev, () => {
        if (el.dataset.selectionne !== '1') { el.style.transform = ''; el.style.filter = ''; }
      })
    );
    el.addEventListener('click', () => { _choisirJeton(idx, valeur); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  zone.querySelector('[data-mobile-allin]')
    ?.addEventListener('click', () => { _activerAllIn(idx); });

  zone.querySelector('[data-mobile-confirmer]')
    ?.addEventListener('click', () => {
      if (!_S.ecranActif || _S.phase !== 'mise') return;
      if (j.confirme || j.reponseCourante === null || j.miseCourante === 0) return;
      _confirmerJoueur(idx);
    });

  _majBoutonConfirmer(idx);
}

function _rafraichirOpponentsMobile() {
  _S.joueurs.forEach((j, i) => {
    if (i === _S.joueurLocalIdx) return;
    const pts = document.querySelector(`[data-mobile-opp-pts="${i}"]`);
    const dot = document.querySelector(`[data-mobile-opp-dot="${i}"]`);
    if (pts) pts.textContent = `${j.score} pts`;
    if (dot) dot.style.background = j.confirme ? '#22C55E' : 'rgba(255,255,255,.15)';
  });
}

function _appliquerModeAffichage() {
  const desktopEl = document.getElementById('paris-stage');
  const mobileEl  = document.getElementById('paris-mobile-layout');

  if (_S.isMobile) {
    if (desktopEl) desktopEl.style.display = 'none';
    if (mobileEl)  mobileEl.style.display  = 'flex';

    _construireMobileHeader();
    _construireOpponentsStripMobile();
    _construireActionBarMobile();

    _updateTimerDisplay(_S.timerValue);
    _afficherPot();
    _rafraichirFooter();

    const qNumM = document.getElementById('q-num-paris-mobile');
    if (qNumM) qNumM.textContent = `Question ${_S.indexQ + 1} / ${_S.nbQuestions}`;
    const qTxtM = document.getElementById('q-texte-paris-mobile');
    const qTxtD = document.getElementById('q-texte-paris');
    if (qTxtM && qTxtD) qTxtM.textContent = qTxtD.textContent;

    if (_S.optionsCourantes?.length) {
      _afficherCartesMobile(_S.optionsCourantes, -1, false);
    }
  } else {
    if (desktopEl) desktopEl.style.display = '';
    if (mobileEl)  mobileEl.style.display  = 'none';
  }
}

/* ══ FIN DE PARTIE ══ */
function _finPartie() {
  _S.phase = 'fin';

  const classement = [..._S.joueurs]
    .sort((a, b) => b.score - a.score)
    .map(j => ({ name: j.nom, nom: j.nom, init: j.init, score: j.score }));

  mergeState({ resultatsParis: classement, players: classement });

  /* Enregistrer le score si connecté */
  const pseudo = sessionStorage.getItem('qpuc-pseudo');
  if (pseudo) {
    const moi = _S.joueurs[_S.joueurLocalIdx];
    fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo,
        score:    moi?.score || 0,
        victoire: classement[0]?.nom === moi?.nom,
        serieMax: 0,
        mode:     'paris',
        code:     sessionStorage.getItem('champ_room_code') || '',
      }),
    }).catch(() => {});
  }

  const t = setTimeout(() => naviguer('classement-paris.html'), 600);
  _pushTimer(t);
}

/* ══ MULTIJOUEUR ══ */
/**
 * Best-effort : tente de reprendre la partie avec le playerToken stocké
 * si la connexion socket est perdue puis rétablie en cours de partie.
 * La resynchronisation complète de l'état (question courante, scores)
 * n'est pas couverte ici — seule la reprise de connexion/identité l'est.
 */
function _gererReconnexionSocket() {
  const sock = _S.socketClient?.socket;
  if (!sock?.io) return;

  const onReconnect = () => {
    const code   = sessionStorage.getItem('champ_room_code');
    const token  = sessionStorage.getItem('champ_room_player_token');
    const pseudo = sessionStorage.getItem('champ_player_name');
    if (!code || !token) return;

    sock.emit('paris:rejoindre-salle', { code, pseudo, playerToken: token }, (ack) => {
      if (ack?.ok && ack?.reconnecte) {
        console.info('[paris] Reconnexion réussie — partie reprise.');
      } else if (!ack?.ok) {
        console.warn('[paris] Échec de la reconnexion :', ack?.erreur);
      }
    });
  };

  sock.io.on('reconnect', onReconnect);
  _push(() => sock.io.off('reconnect', onReconnect));
}

async function _brancherSocket() {
  _afficherEcranAttente();

  try {
    const client = await connectRealtime();
    if (!client?.socket) return;
    _S.socketClient = client;
    const sock = client.socket;

    _gererReconnexionSocket();

    /* Déterminer si on est l'hôte */
    const roomCode = sessionStorage.getItem('champ_room_code');
    const hostId   = sessionStorage.getItem('champ_host_id');
    const myId     = sessionStorage.getItem('champ_player_id');
    _S.isHost      = Boolean(hostId && myId && hostId === myId);

    if (_S.isHost) {
      _ajouterBoutonLancer(roomCode);
    }

    const onDebut = ({ joueurs, nbQuestions, question, indexQ = 0 }) => {
      _cacherEcranAttente();
      const myId = sessionStorage.getItem('champ_player_id');
      _S.joueurs = joueurs.map((j, i) => ({
        id:              j.id,
        nom:             j.nom || j.name,
        init:            (j.init || String(j.nom || 'J').slice(0, 2)).toUpperCase(),
        colorIdx:        j.colorIdx ?? i,
        score:           j.score || 2500,
        miseCourante:    0,
        reponseCourante: null,
        confirme:        false,
        allinUsed:       false,
      }));
      if (myId) {
        const idx = _S.joueurs.findIndex(j2 => String(j2.id) === String(myId));
        if (idx !== -1) _S.joueurLocalIdx = idx;
      }
      _S.nbQuestions = nbQuestions;
      _S.indexQ      = indexQ;
      _S.jackpot     = 0;
      if (question) _S.questionServeurCourante = question;
      _construireZones();
      _construireFooter();
      _appliquerModeAffichage();
      _demarrerQuestion();
    };

    try {
      const payloadMemoire = JSON.parse(sessionStorage.getItem('paris_debut_payload') || 'null');
      if (payloadMemoire?.joueurs?.length) {
        onDebut(payloadMemoire);
      }
    } catch (e) {
      /* ignore */
    }

    const onTimer = ({ val }) => {
      _S.timerValue = val;
      _updateTimerDisplay(val);
    };

    const onJoueurPret = ({ playerId }) => {
      const j = _S.joueurs.find(j2 => String(j2.id) === String(playerId));
      if (j) { j.confirme = true; _rafraichirFooter(); }
    };

    const onTousConfirmes = () => {
      _stopperChrono();
      _revelerResultats();
    };

    const onResultat = ({ indexCorrect, scores, jackpot: jk, pot }) => {
      if (typeof indexCorrect === 'number') {
        _S.indexCorrectServeur = indexCorrect;
      }
      if (scores) {
        if (Array.isArray(scores)) {
          scores.forEach((s, i) => { if (_S.joueurs[i]) _S.joueurs[i].score = s; });
        } else if (typeof scores === 'object') {
          _S.joueurs.forEach(j => {
            const s = scores[j.id];
            if (s !== undefined) j.score = s;
          });
        }
      }
      if (typeof jk === 'number') _S.jackpot = jk;
      _rafraichirFooter();
      _afficherPot();
    };

    const onSuivante = ({ indexQ, question }) => {
      _S.indexQ              = indexQ;
      _S.indexCorrectServeur = null;
      if (question) _S.questionServeurCourante = question;
      _demarrerQuestion();
    };

    const onFin = ({ classement }) => {
      mergeState({ resultatsParis: classement, players: classement });
      naviguer('classement-paris.html');
    };

    sock.on('paris:debut',            onDebut);
    sock.on('paris:timer',            onTimer);
    sock.on('paris:joueur-pret',      onJoueurPret);
    sock.on('paris:tous-confirmes',   onTousConfirmes);
    sock.on('paris:resultat',         onResultat);
    sock.on('paris:question-suivante', onSuivante);
    sock.on('paris:fin',              onFin);

    _push(() => {
      sock.off('paris:debut',            onDebut);
      sock.off('paris:timer',            onTimer);
      sock.off('paris:joueur-pret',      onJoueurPret);
      sock.off('paris:tous-confirmes',   onTousConfirmes);
      sock.off('paris:resultat',         onResultat);
      sock.off('paris:question-suivante', onSuivante);
      sock.off('paris:fin',              onFin);
    });

  } catch (e) {
    /* Fallback local si socket indisponible */
    _cacherEcranAttente();
    _demarrerQuestion();
  }
}

function _ajouterBoutonLancer(roomCode) {
  const overlay = document.getElementById('paris-attente-overlay');
  if (!overlay) return;

  const btn = document.createElement('button');
  btn.textContent = 'LANCER LA PARTIE →';
  btn.style.cssText = `
    margin-top:28px;padding:18px 48px;border-radius:12px;
    border:1.5px solid rgba(232,184,75,.7);
    background:linear-gradient(180deg,#2A1E12,#140E08);
    font:800 16px/1 'Cinzel';letter-spacing:.18em;color:#E8C063;
    cursor:pointer;transition:filter .15s;
  `;
  btn.addEventListener('pointerenter', () => { btn.style.filter = 'brightness(1.2)'; });
  btn.addEventListener('pointerleave', () => { btn.style.filter = ''; });
  btn.addEventListener('click', () => {
    playBtn();
    _S.socketClient?.socket?.emit('paris:lancer', {
      roomCode,
      nbQuestions: _S.nbQuestions,
    });
    btn.disabled     = true;
    btn.textContent  = 'En attente des joueurs…';
    btn.style.opacity = '.6';
  });
  overlay.appendChild(btn);
}

function _afficherEcranAttente() {
  if (document.getElementById('paris-attente-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'paris-attente-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(10,8,4,.88);
    display:flex;flex-direction:column;align-items:center;
    justify-content:center;z-index:200;font-family:'Manrope',sans-serif;
  `;
  overlay.innerHTML = `
    <div style="font:800 28px/1 'Cinzel';color:#E8B84B;letter-spacing:.2em;margin-bottom:14px;">MODE PARIS</div>
    <div style="font:600 15px 'Manrope';color:rgba(255,255,255,.65);">
      En attente du lancement par l'hôte…
    </div>
    <div style="margin-top:20px;display:flex;gap:8px;">
      ${[0, 1, 2].map(i =>
        `<div style="width:8px;height:8px;border-radius:50%;background:#C8963C;
               animation:pretPulse 1.4s ease-in-out ${i * 0.2}s infinite;"></div>`
      ).join('')}
    </div>
  `;
  document.body.appendChild(overlay);
}

function _cacherEcranAttente() {
  document.getElementById('paris-attente-overlay')?.remove();
}

/* ══ STYLES + PLEIN ÉCRAN ══ */
function _injecterStyles() {
  if (document.querySelector('style[data-paris-jeu]')) return;
  const s = document.createElement('style');
  s.dataset.parisJeu = '1';
  s.textContent = `
    @keyframes pretPulse {
      0%,100%{ opacity:1; box-shadow:0 0 9px rgba(34,197,94,.75); }
      50%{ opacity:.65; box-shadow:0 0 16px rgba(34,197,94,1); }
    }
    @keyframes parisBadgePop {
      0%{ opacity:0; transform:translate(-50%,-50%) scale(.6); }
      70%{ transform:translate(-50%,-50%) scale(1.06); }
      100%{ opacity:1; transform:translate(-50%,-50%) scale(1); }
    }
    @keyframes parisFloatUp {
      from{ opacity:0; transform:translateX(-50%) translateY(10px); }
      to{ opacity:1; transform:translateX(-50%) translateY(0); }
    }
    /* ── Jackpot overlay ── */
    @keyframes jkFadeIn {
      from{ opacity:0; }
      to{ opacity:1; }
    }
    @keyframes jkFadeOut {
      from{ opacity:1; }
      to{ opacity:0; }
    }
    @keyframes jkHalo {
      0%,100%{ opacity:.7; transform:scale(1); }
      50%{ opacity:1; transform:scale(1.08); }
    }
    @keyframes jkCardDrop {
      0%{ opacity:0; transform:scale(.3) rotate(-18deg) translateY(-60px); }
      60%{ transform:scale(1.12) rotate(4deg) translateY(6px); }
      80%{ transform:scale(.96) rotate(-2deg); }
      100%{ opacity:1; transform:scale(1) rotate(0deg) translateY(0); }
    }
    @keyframes jkTitlePop {
      0%{ opacity:0; transform:scale(.55) translateY(24px); letter-spacing:.24em; }
      70%{ transform:scale(1.04) translateY(-4px); }
      100%{ opacity:1; transform:scale(1) translateY(0); }
    }
    @keyframes jkFadeUp {
      from{ opacity:0; transform:translateY(18px); }
      to{ opacity:1; transform:translateY(0); }
    }
    @keyframes jkCounterGlow {
      0%,100%{ text-shadow:0 0 60px rgba(255,229,0,.5),0 0 120px rgba(255,180,0,.25),0 4px 12px rgba(0,0,0,.8); }
      50%{ text-shadow:0 0 100px rgba(255,229,0,.85),0 0 200px rgba(255,180,0,.5),0 4px 12px rgba(0,0,0,.8); }
    }
    @keyframes jkParticleRise {
      0%{ opacity:0; transform:translateY(0) scale(.6) rotate(0deg); }
      10%{ opacity:.55; }
      85%{ opacity:.25; }
      100%{ opacity:0; transform:translateY(-110vh) scale(1.1) rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
}

function _forcerPleinEcran() {
  document.body.classList.add('paris-fullscreen');
  if (!document.getElementById('paris-fullscreen-style')) {
    const s = document.createElement('style');
    s.id = 'paris-fullscreen-style';
    s.textContent = `
      body.paris-fullscreen{background:#0A0804!important;overflow:hidden!important;padding:0!important;margin:0!important}
      body.paris-fullscreen #app,body.paris-fullscreen .app-shell,
      body.paris-fullscreen>div:first-of-type{
        width:100vw!important;height:100vh!important;max-width:none!important;
        border-radius:0!important;box-shadow:none!important;
        overflow:hidden!important;background:#0A0804!important;padding:0!important
      }
      body.paris-fullscreen .page{padding:0!important;background:#0A0804!important;overflow:hidden!important}
    `;
    document.head.appendChild(s);
  }
}

function _restaurerLayout() {
  document.body.classList.remove('paris-fullscreen');
  document.getElementById('paris-fullscreen-style')?.remove();
}

function _melangerTableau(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ══ CLEANUP ══ */
export function cleanup() {
  _S.ecranActif = false;
  _S.phase      = 'attente';

  _stopperChrono();

  _S.allTimers.forEach(clearTimeout);
  _S.allTimers = [];

  _S.nettoyages.forEach(fn => { try { fn(); } catch (e) {} });
  _S.nettoyages = [];

  _cacherEcranAttente();
  document.querySelectorAll('style[data-paris-jeu]').forEach(s => s.remove());
  _restaurerLayout();

  _S.joueurs      = [];
  _S.questions    = [];
  _S.indexQ       = 0;
  _S.pot          = 0;
  _S.jackpot      = 0;
  _S.socketClient            = null;
  _S.isHost                  = false;
  _S.questionServeurCourante = null;
  _S.questionLocale          = null;
  _S.indexCorrectServeur     = null;
  _S.optionsCourantes        = [];
}
