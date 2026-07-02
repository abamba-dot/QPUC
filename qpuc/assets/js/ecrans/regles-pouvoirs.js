/* ════════════════════════════════════════════════════════════
   regles-pouvoirs.js — Présentation des règles et des pouvoirs
   Après l'intro, avant le jeu
════════════════════════════════════════════════════════════ */

import { naviguer }         from '../routeur.js';
import { connectRealtime }  from '../realtime-client.js';
import { playBtn }          from '../audio-hooks.js';
import { attachParisStage, PARIS_MOBILE_BREAKPOINT } from '../paris-stage.js';
import { forcerPleinEcranPouvoirs, restaurerLayoutPouvoirs } from '../pouvoirs-fullscreen.js';
import { POUVOIRS_COLORS }  from '../theme-paris-pouvoirs.js';

export const titre = 'Mode Pouvoirs — Règles';

const IMG = './assets/img/pouvoirs/';

const SLIDES = [
  {
    type:   'intro',
    titre:  'Mode Pouvoirs',
    icone:  '<i class="fa-solid fa-bolt"></i>',
    points: [
      "Chaque question s'affiche pour tous en même temps",
      'Sélectionnez votre réponse A, B, C ou D',
      'Confirmez avec le buzzer pour verrouiller votre choix',
      'Gagnez des pouvoirs grâce à vos performances !',
    ],
  },
  {
    type:    'pouvoir',
    key:     'eclair',
    img:     `${IMG}reponse_eclair.png`,
    nom:     'Réponse Éclair',
    couleur: '#3DC87A',
    obtenir: '3 bonnes réponses consécutives',
    iconeObtenir: '<i class="fa-solid fa-fire"></i>',
    effet:   'Votre prochaine bonne réponse rapporte +50 % de points',
    iconeEffet:   '<i class="fa-solid fa-star"></i>',
  },
  {
    type:    'pouvoir',
    key:     'bouclier',
    img:     `${IMG}bouclier_de_savoir.png`,
    nom:     'Bouclier de Savoir',
    couleur: '#4A90E2',
    obtenir: '3 bonnes réponses consécutives',
    iconeObtenir: '<i class="fa-solid fa-fire"></i>',
    effet:   "Protège votre série si vous ratez une réponse (s'active automatiquement)",
    iconeEffet:   '<i class="fa-solid fa-shield-halved"></i>',
  },
  {
    type:    'pouvoir',
    key:     'pression',
    img:     `${IMG}pression_mentale.png`,
    nom:     'Pression Mentale',
    couleur: '#E85A3A',
    obtenir: 'Répondre correctement en moins de 5 secondes',
    iconeObtenir: '<i class="fa-solid fa-bolt"></i>',
    effet:   "Réduit le chrono d'un adversaire de 5 secondes à la prochaine question",
    iconeEffet:   '<i class="fa-solid fa-hourglass-half"></i>',
  },
  {
    type:    'pouvoir',
    key:     'indice',
    img:     `${IMG}indice_supplementaire.png`,
    nom:     'Indice Supplémentaire',
    couleur: '#9B59B6',
    obtenir: 'Répondre correctement en moins de 3 secondes',
    iconeObtenir: '<i class="fa-solid fa-lightbulb"></i>',
    effet:   'Élimine une mauvaise réponse de votre écran (visible uniquement pour vous)',
    iconeEffet:   '<i class="fa-solid fa-lightbulb"></i>',
  },
];

let _slideIndex     = 0;
let _stageClean     = null;
let _clientSocket   = null;
let _listenerAttache = false;
let _pretEmis       = false;
let _compteARebours = null;
let _isMobileR       = false;
let _onResizeReglesRef = null;

export const html = `
<div class="pouvoirs-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;z-index:9999;overflow:hidden;background:${POUVOIRS_COLORS.bg};">
  <div id="regles-stage"
       style="width:1920px;height:1080px;position:absolute;left:50%;top:50%;
              transform-origin:center center;background:${POUVOIRS_COLORS.bg};overflow:hidden;
              font-family:'Manrope',sans-serif;">

    <div style="position:absolute;inset:0;z-index:0;
                background:radial-gradient(ellipse 64% 60% at 50% 116%,rgba(123,57,184,.35) 0%,transparent 58%),
                           radial-gradient(ellipse 52% 46% at 50% 34%,rgba(107,47,217,.14) 0%,transparent 64%);
                pointer-events:none;"></div>
    <img src="${IMG}fond.png" alt=""
         style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
                opacity:.45;pointer-events:none;">

    <div style="position:relative;z-index:5;width:100%;height:100%;
                display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:60px 200px;">

      <div id="regles-slide-zone" style="width:100%;flex:1;display:flex;
                                          align-items:center;justify-content:center;"></div>

      <div id="regles-nav" style="width:100%;display:flex;align-items:center;
                  justify-content:space-between;padding:0 40px;flex-shrink:0;margin-top:32px;">

        <div id="regles-dots" style="display:flex;gap:10px;align-items:center;"></div>

        <div style="display:flex;gap:16px;align-items:center;">
          <button id="btn-regles-passer"
                  style="padding:14px 30px;border-radius:10px;cursor:pointer;
                         font:700 13px/1 'Manrope';letter-spacing:.14em;text-transform:uppercase;
                         background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);
                         color:rgba(255,255,255,.55);transition:all .15s;">
            Passer
          </button>
          <button id="btn-regles-suivant"
                  style="padding:14px 44px;border-radius:10px;cursor:pointer;
                         font:800 14px/1 'Manrope';letter-spacing:.14em;text-transform:uppercase;
                         background:linear-gradient(135deg,#C8A84B,#8B6914);
                         border:1.5px solid #FFE500;color:#0F0020;
                         box-shadow:0 0 22px rgba(200,168,75,.4);transition:all .15s;">
            Suivant →
          </button>
        </div>
      </div>
    </div>

  </div>

  <!-- ════ RÈGLES MOBILE NATIVE < 760px ════ -->
  <div id="regles-mobile-root"
       style="display:none;position:fixed;inset:0;z-index:40;
              background:${POUVOIRS_COLORS.bg};flex-direction:column;overflow:hidden;
              font-family:'Manrope',sans-serif;">

    <div style="position:absolute;inset:0;z-index:0;pointer-events:none;
                background:radial-gradient(ellipse 70% 50% at 50% 100%,
                  rgba(107,47,217,.28) 0%,transparent 65%);"></div>

    <!-- En-tête compact -->
    <div style="position:relative;z-index:2;flex-shrink:0;
                padding:calc(14px + env(safe-area-inset-top,0px)) 18px 10px;
                display:flex;align-items:center;justify-content:space-between;">
      <div style="font:800 13px/1 'Manrope';letter-spacing:.14em;
                  text-transform:uppercase;color:#FFE500;"><i class="fa-solid fa-bolt"></i> Mode Pouvoirs</div>
      <div id="regles-m-compteur"
           style="font:700 12px/1 'Manrope';color:rgba(200,168,75,.7);"></div>
    </div>

    <!-- Zone slide scrollable -->
    <div id="regles-slide-zone-mobile"
         style="position:relative;z-index:2;flex:1;min-height:0;
                overflow-y:auto;-webkit-overflow-scrolling:touch;
                padding:8px 18px 16px;"></div>

    <!-- Navigation collante en bas -->
    <div style="position:relative;z-index:2;flex-shrink:0;
                padding:12px 18px calc(14px + env(safe-area-inset-bottom,0px));
                background:linear-gradient(180deg,rgba(15,0,32,0),rgba(15,0,32,.95) 25%);
                display:flex;flex-direction:column;gap:12px;">

      <div id="regles-dots-mobile"
           style="display:flex;gap:8px;align-items:center;justify-content:center;"></div>

      <div style="display:flex;gap:10px;">
        <button id="btn-regles-passer-m"
                style="flex:0 0 auto;padding:0 20px;min-height:48px;border-radius:10px;
                       cursor:pointer;font:700 12px/1 'Manrope';letter-spacing:.1em;
                       text-transform:uppercase;background:rgba(255,255,255,.06);
                       border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.55);
                       -webkit-tap-highlight-color:transparent;">
          Passer
        </button>
        <button id="btn-regles-suivant-m"
                style="flex:1;min-height:48px;border-radius:10px;cursor:pointer;
                       font:800 13px/1 'Manrope';letter-spacing:.12em;text-transform:uppercase;
                       background:linear-gradient(135deg,#C8A84B,#8B6914);
                       border:1.5px solid #FFE500;color:#0F0020;
                       box-shadow:0 0 18px rgba(200,168,75,.35);
                       -webkit-tap-highlight-color:transparent;">
          Suivant →
        </button>
      </div>
    </div>
  </div>

  <div id="regles-countdown-overlay"
       style="display:none;position:fixed;inset:0;z-index:9998;
              background:rgba(5,0,12,.9);backdrop-filter:blur(8px);
              flex-direction:column;align-items:center;justify-content:center;
              gap:clamp(16px,4vh,24px);font-family:'Manrope',sans-serif;">
    <div style="font:700 clamp(12px,3vw,16px)/1 'Manrope';letter-spacing:.24em;
                text-transform:uppercase;color:#C8A84B;">Début dans</div>
    <div id="regles-countdown-val"
         style="font:900 clamp(70px,22vw,140px)/1 'Bricolage Grotesque','Manrope';
                color:#FFE500;text-shadow:0 0 60px rgba(255,229,0,.5);">5</div>
    <div style="font:600 clamp(13px,3.5vw,18px)/1 'Manrope';color:rgba(255,255,255,.5);">
      Préparez-vous !
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      ${[0,1,2].map(i => `<div style="width:9px;height:9px;border-radius:50%;
        background:#C8A84B;animation:regPretPulse 1.4s ease-in-out ${i*.2}s infinite;"></div>`).join('')}
    </div>
  </div>

</div>
`;

export async function init() {
  forcerPleinEcranPouvoirs(POUVOIRS_COLORS.bg);

  _slideIndex   = 0;
  _pretEmis     = false;
  _clientSocket = null;
  _listenerAttache = false;

  _injecterStyles();
  _injecterFonts();

  const stageEl = document.getElementById('regles-stage');
  if (stageEl) _stageClean = attachParisStage(stageEl);

  _afficherSlide(_slideIndex);
  _majDots();

  document.getElementById('btn-regles-suivant')?.addEventListener('click', _onSuivant);
  document.getElementById('btn-regles-passer')?.addEventListener('click', _onPasser);

  // ── Détection mobile + toggle (rendu qui reste affiché tant que
  // l'utilisateur lit : on gère le redimensionnement en direct) ──
  _isMobileR = _isMobileRegles();
  _switchRegles(_isMobileR);

  _onResizeReglesRef = () => {
    const now = _isMobileRegles();
    if (now !== _isMobileR) {
      _isMobileR = now;
      _switchRegles(_isMobileR);
    }
  };
  window.addEventListener('resize', _onResizeReglesRef);
  window.addEventListener('orientationchange', _onResizeReglesRef);

  // ── Listeners boutons mobiles ──
  document.getElementById('btn-regles-suivant-m')?.addEventListener('click', _onSuivant);
  document.getElementById('btn-regles-passer-m')?.addEventListener('click', _onPasser);

  // Connexion socket en tâche de fond (couvre le cas normal où le joueur
  // prend au moins quelques secondes pour lire les slides).
  if (sessionStorage.getItem('mode-multi-actif') === 'pouvoirs') {
    _assurerSocket();
  }
}

function _isMobileRegles() {
  return window.matchMedia(`(max-width:${PARIS_MOBILE_BREAKPOINT}px)`).matches;
}

function _switchRegles(mobile) {
  const stageEl  = document.getElementById('regles-stage');
  const mobileEl = document.getElementById('regles-mobile-root');
  if (stageEl)  stageEl.style.display  = mobile ? 'none' : '';
  if (mobileEl) mobileEl.style.display = mobile ? 'flex' : 'none';
}

async function _assurerSocket() {
  if (!_clientSocket) {
    const client = await connectRealtime().catch(() => null);
    _clientSocket = client?.socket || null;
  }
  if (_clientSocket && !_listenerAttache) {
    _clientSocket.on('pouvoirs:tous-prets', _demarrerCompteARebours);
    _listenerAttache = true;
  }
  return _clientSocket;
}

function _onSuivant() {
  playBtn?.();
  if (_slideIndex < SLIDES.length - 1) {
    _slideIndex++;
    _afficherSlide(_slideIndex);
    _majDots();

    const btn = document.getElementById('btn-regles-suivant');
    if (btn && _slideIndex === SLIDES.length - 1) {
      btn.textContent = 'Commencer !';
      btn.style.background  = 'linear-gradient(135deg,#3DC87A,#1a8a4a)';
      btn.style.borderColor = '#3DC87A';
    }

    const btnM = document.getElementById('btn-regles-suivant-m');
    if (btnM && _slideIndex === SLIDES.length - 1) {
      btnM.textContent = 'Commencer !';
      btnM.style.background  = 'linear-gradient(135deg,#3DC87A,#1a8a4a)';
      btnM.style.borderColor = '#3DC87A';
    }
  } else {
    _marquerPret();
  }
}

function _onPasser() {
  playBtn?.();
  _marquerPret();
}

async function _marquerPret() {
  if (_pretEmis) return;
  _pretEmis = true;

  const estMulti = sessionStorage.getItem('mode-multi-actif') === 'pouvoirs';
  if (!estMulti) {
    _demarrerCompteARebours();
    return;
  }

  const sock = await _assurerSocket();
  if (sock) {
    sock.emit('pouvoirs:pret');
    _afficherAttenteJoueurs();
  } else {
    // Pas de connexion possible — ne pas bloquer indéfiniment le joueur
    _demarrerCompteARebours();
  }
}

function _afficherAttenteJoueurs() {
  const slideZone = document.getElementById('regles-slide-zone');
  if (slideZone) {
    slideZone.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:20px;">
        <div style="font:800 22px/1 'Bricolage Grotesque';color:#FFE500;letter-spacing:.1em;">
          En attente des autres joueurs…
        </div>
        <div style="font:500 14px/1.4 'Manrope';color:rgba(255,255,255,.5);">
          La partie démarrera quand tous seront prêts
        </div>
        <div style="display:flex;gap:10px;margin-top:8px;">
          ${[0,1,2].map(i => `
            <div style="width:10px;height:10px;border-radius:50%;background:#C8A84B;
                        animation:regPretPulse 1.4s ease-in-out ${i*.2}s infinite;"></div>
          `).join('')}
        </div>
      </div>
    `;
  }
  const nav = document.getElementById('regles-nav');
  if (nav) nav.style.display = 'none';

  const zoneM = document.getElementById('regles-slide-zone-mobile');
  if (zoneM) {
    zoneM.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
                  gap:16px;padding-top:40px;">
        <div style="font:800 18px/1.3 'Bricolage Grotesque';color:#FFE500;
                    letter-spacing:.06em;text-align:center;">
          En attente des autres joueurs…
        </div>
        <div style="font:500 13px 'Manrope';color:rgba(255,255,255,.5);
                    text-align:center;">
          La partie démarrera quand tous seront prêts
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;">
          ${[0,1,2].map(i => `<div style="width:9px;height:9px;border-radius:50%;
            background:#C8A84B;animation:regPretPulse 1.4s ease-in-out ${i*.2}s infinite;"></div>`).join('')}
        </div>
      </div>
    `;
  }
  // Masquer la navigation mobile pendant l'attente
  document.getElementById('btn-regles-passer-m')?.parentElement?.style.setProperty('display', 'none');
}

function _demarrerCompteARebours() {
  const overlay = document.getElementById('regles-countdown-overlay');
  if (overlay) overlay.style.display = 'flex';

  clearInterval(_compteARebours);
  let val = 5;
  const valEl = document.getElementById('regles-countdown-val');
  if (valEl) valEl.textContent = val;

  _compteARebours = setInterval(() => {
    val--;
    if (valEl) {
      valEl.textContent = val;
      valEl.style.animation = 'pvCountdownPop .25s cubic-bezier(.2,1.3,.4,1) both';
      setTimeout(() => { if (valEl) valEl.style.animation = ''; }, 300);
    }
    if (val <= 0) {
      clearInterval(_compteARebours);
      _compteARebours = null;
      naviguer('jeu-pouvoirs.html');
    }
  }, 1000);
}

function _afficherSlide(index) {
  const zone = document.getElementById('regles-slide-zone');
  if (!zone) return;

  const slide = SLIDES[index];
  if (!slide) return;

  if (slide.type === 'intro') {
    zone.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:40px;
                  animation:pvSlideIn .45s cubic-bezier(.2,1,.4,1) both;">

        <div style="font:900 78px/1 'Bricolage Grotesque','Manrope';
                    letter-spacing:.1em;color:#FFE500;
                    text-shadow:0 0 50px rgba(255,229,0,.35);">
          ${slide.icone} ${slide.titre}
        </div>

        <div style="display:flex;flex-direction:column;gap:20px;max-width:900px;width:100%;">
          ${slide.points.map((p, i) => `
            <div style="display:flex;align-items:center;gap:22px;padding:20px 28px;
                        border-radius:14px;background:rgba(255,255,255,.05);
                        border:1px solid rgba(200,168,75,.2);
                        animation:pvSlideIn .4s cubic-bezier(.2,1,.4,1) ${.1+i*.08}s both;">
              <div style="width:38px;height:38px;border-radius:50%;background:rgba(200,168,75,.15);
                          border:1.5px solid rgba(200,168,75,.5);display:flex;align-items:center;
                          justify-content:center;font:800 18px/1 'Manrope';color:#C8A84B;
                          flex-shrink:0;">
                ${i + 1}
              </div>
              <span style="font:600 26px/1.3 'Manrope';color:rgba(255,255,255,.88);">${p}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    zone.innerHTML = `
      <div style="display:flex;align-items:center;gap:80px;
                  animation:pvSlideIn .45s cubic-bezier(.2,1,.4,1) both;max-width:1400px;">

        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:16px;">
          <img src="${slide.img}" alt="${slide.nom}"
               style="width:320px;height:auto;border-radius:18px;
                      box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 40px ${slide.couleur}55;
                      animation:pvCardEntree .65s cubic-bezier(.18,1.2,.4,1) .1s both;">
          <div style="font:800 20px/1 'Manrope';letter-spacing:.12em;text-transform:uppercase;
                      color:${slide.couleur};text-align:center;
                      text-shadow:0 0 20px ${slide.couleur}88;">
            ${slide.nom}
          </div>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;gap:32px;">

          <div style="padding:28px 32px;border-radius:16px;
                      background:rgba(255,255,255,.04);
                      border:1.5px solid ${slide.couleur}44;
                      animation:pvSlideIn .4s cubic-bezier(.2,1,.4,1) .15s both;">
            <div style="font:700 12px/1 'Manrope';letter-spacing:.22em;text-transform:uppercase;
                        color:${slide.couleur};margin-bottom:12px;opacity:.8;">
              ${slide.iconeObtenir} Comment l'obtenir
            </div>
            <div style="font:700 30px/1.3 'Manrope';color:#fff;">
              ${slide.obtenir}
            </div>
          </div>

          <div style="padding:28px 32px;border-radius:16px;
                      background:rgba(255,229,0,.04);
                      border:1.5px solid rgba(255,229,0,.25);
                      animation:pvSlideIn .4s cubic-bezier(.2,1,.4,1) .25s both;">
            <div style="font:700 12px/1 'Manrope';letter-spacing:.22em;text-transform:uppercase;
                        color:#FFE500;margin-bottom:12px;opacity:.8;">
              ${slide.iconeEffet} Effet quand utilisé
            </div>
            <div style="font:700 30px/1.3 'Manrope';color:#fff;">
              ${slide.effet}
            </div>
          </div>

          <div style="font:500 16px/1.4 'Manrope';color:rgba(255,255,255,.4);
                      animation:pvSlideIn .4s cubic-bezier(.2,1,.4,1) .32s both;">
            <i class="fa-solid fa-triangle-exclamation"></i> Maximum 2 pouvoirs en stock. Si votre stack est plein, utilisez-en un d'abord.
          </div>
        </div>
      </div>
    `;
  }

  _afficherSlideMobile(index);
}

/**
 * Version mobile d'un slide : layout empilé verticalement,
 * typographie clamp(), image de pouvoir plus petite et centrée.
 * Réutilise l'array SLIDES existant — aucune donnée dupliquée.
 */
function _afficherSlideMobile(index) {
  const zone = document.getElementById('regles-slide-zone-mobile');
  if (!zone) return;

  const slide = SLIDES[index];
  if (!slide) return;

  const compteur = document.getElementById('regles-m-compteur');
  if (compteur) compteur.textContent = `${index + 1} / ${SLIDES.length}`;

  if (slide.type === 'intro') {
    zone.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:20px;
                  padding-top:8px;animation:pvSlideIn .4s ease both;">

        <div style="font:900 clamp(24px,7vw,32px)/1.15 'Bricolage Grotesque','Manrope';
                    letter-spacing:.04em;color:#FFE500;text-align:center;
                    text-shadow:0 0 26px rgba(255,229,0,.3);">
          ${slide.icone} ${slide.titre}
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;width:100%;">
          ${slide.points.map((p, i) => `
            <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;
                        border-radius:12px;background:rgba(255,255,255,.045);
                        border:1px solid rgba(200,168,75,.2);
                        animation:pvSlideIn .35s ease ${.08+i*.06}s both;">
              <div style="width:26px;height:26px;border-radius:50%;flex-shrink:0;
                          background:rgba(200,168,75,.15);border:1.5px solid rgba(200,168,75,.5);
                          display:flex;align-items:center;justify-content:center;
                          font:800 12px/1 'Manrope';color:#C8A84B;">${i+1}</div>
              <span style="font:600 clamp(13px,3.6vw,15px)/1.4 'Manrope';
                           color:rgba(255,255,255,.88);">${p}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    zone.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:18px;
                  padding-top:6px;animation:pvSlideIn .4s ease both;">

        <img src="${slide.img}" alt="${slide.nom}"
             style="width:clamp(120px,42vw,180px);height:auto;border-radius:14px;
                    box-shadow:0 14px 34px rgba(0,0,0,.55),0 0 26px ${slide.couleur}55;
                    animation:pvCardEntree .55s cubic-bezier(.18,1.2,.4,1) .1s both;">

        <div style="font:800 clamp(15px,4.5vw,18px)/1 'Manrope';letter-spacing:.1em;
                    text-transform:uppercase;color:${slide.couleur};text-align:center;
                    text-shadow:0 0 16px ${slide.couleur}66;">
          ${slide.nom}
        </div>

        <div style="width:100%;padding:16px 18px;border-radius:14px;
                    background:rgba(255,255,255,.04);border:1.5px solid ${slide.couleur}44;">
          <div style="font:700 10px/1 'Manrope';letter-spacing:.18em;text-transform:uppercase;
                      color:${slide.couleur};opacity:.85;margin-bottom:8px;">
            ${slide.iconeObtenir} Comment l'obtenir
          </div>
          <div style="font:700 clamp(15px,4.2vw,19px)/1.35 'Manrope';color:#fff;">
            ${slide.obtenir}
          </div>
        </div>

        <div style="width:100%;padding:16px 18px;border-radius:14px;
                    background:rgba(255,229,0,.04);border:1.5px solid rgba(255,229,0,.22);">
          <div style="font:700 10px/1 'Manrope';letter-spacing:.18em;text-transform:uppercase;
                      color:#FFE500;opacity:.85;margin-bottom:8px;">
            ${slide.iconeEffet} Effet quand utilisé
          </div>
          <div style="font:700 clamp(15px,4.2vw,19px)/1.35 'Manrope';color:#fff;">
            ${slide.effet}
          </div>
        </div>

        <div style="font:500 clamp(11px,3vw,13px)/1.4 'Manrope';color:rgba(255,255,255,.4);
                    text-align:center;padding:0 4px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Maximum 2 pouvoirs en stock. Utilisez-en un si votre stack est plein.
        </div>
      </div>
    `;
  }
}

function _majDots() {
  const zone = document.getElementById('regles-dots');
  if (!zone) return;
  zone.innerHTML = SLIDES.map((_, i) => `
    <div style="width:${i===_slideIndex?'28':'10'}px;height:10px;border-radius:5px;
                background:${i===_slideIndex?'#FFE500':'rgba(255,255,255,.25)'};
                transition:all .25s cubic-bezier(.2,1,.4,1);"></div>
  `).join('');

  _majDotsMobile();
}

function _majDotsMobile() {
  const zone = document.getElementById('regles-dots-mobile');
  if (!zone) return;
  zone.innerHTML = SLIDES.map((_, i) => `
    <div style="width:${i===_slideIndex?'22':'8'}px;height:8px;border-radius:4px;
                background:${i===_slideIndex?'#FFE500':'rgba(255,255,255,.25)'};
                transition:all .25s cubic-bezier(.2,1,.4,1);"></div>
  `).join('');
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
  if (document.getElementById('regles-styles')) return;
  const s = document.createElement('style');
  s.id = 'regles-styles';
  s.textContent = `
    @keyframes pvSlideIn  { from{ opacity:0; transform:translateY(24px); } to{ opacity:1; transform:none; } }
    @keyframes pvCardEntree{ 0%{ transform:translateY(-80px) rotate(-8deg) scale(.7); opacity:0; } 65%{ transform:translateY(6px) rotate(1deg) scale(1.04); opacity:1; } 100%{ transform:none; opacity:1; } }
    @keyframes pvCountdownPop{ from{ transform:scale(1.35); } to{ transform:scale(1); } }
    @keyframes regPretPulse  { 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
  `;
  document.head.appendChild(s);
}

export function cleanup() {
  if (_compteARebours) { clearInterval(_compteARebours); _compteARebours = null; }
  if (_clientSocket && _listenerAttache) {
    _clientSocket.off('pouvoirs:tous-prets', _demarrerCompteARebours);
  }
  if (_onResizeReglesRef) {
    window.removeEventListener('resize', _onResizeReglesRef);
    window.removeEventListener('orientationchange', _onResizeReglesRef);
    _onResizeReglesRef = null;
  }
  _stageClean?.();
  _stageClean = null;
  _pretEmis   = false;
  document.getElementById('regles-styles')?.remove();
  restaurerLayoutPouvoirs();
}
