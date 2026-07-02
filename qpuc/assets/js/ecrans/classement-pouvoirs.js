/* ═══════════════════════════════════════════════
   classement-pouvoirs.js — Classement Mode Pouvoirs
═══════════════════════════════════════════════ */

import { naviguer }         from '../routeur.js';
import { getState }         from '../state.js';
import { playBtn }          from '../audio-hooks.js';
import { attachParisStage, PARIS_MOBILE_BREAKPOINT } from '../paris-stage.js';
import { forcerPleinEcranPouvoirs, restaurerLayoutPouvoirs } from '../pouvoirs-fullscreen.js';
import { esc }               from '../utils.js';

export const titre = 'Classement — Mode Pouvoirs';

const IMG = './assets/img/pouvoirs/';
const COULEURS_RANG = ['#FFE500', '#C8C8D4', '#C8823C']; // or/argent/bronze

export const html = `
<div class="pouvoirs-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;z-index:9999;overflow:hidden;background:#0A0520;">
  <div id="pouvoirs-stage"
       style="width:1920px;height:1080px;position:absolute;left:50%;top:50%;
              transform-origin:center center;overflow:hidden;font-family:'Manrope',sans-serif;
              background:radial-gradient(ellipse 70% 62% at 50% 38%,#221258 0%,#12082E 58%,#0A0520 100%);
              display:flex;flex-direction:column;align-items:center;justify-content:space-between;
              padding:54px 96px 44px;">

    <img src="${IMG}fond.png" alt=""
         style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
                opacity:.5;pointer-events:none;z-index:0;">

    <!-- TITLE -->
    <div style="position:relative;z-index:2;text-align:center;flex-shrink:0;animation:cl-haut .7s cubic-bezier(.2,1,.4,1) .1s both;">
      <div style="display:flex;align-items:center;justify-content:center;gap:13px;font:700 14px/1 'Manrope';
                  letter-spacing:.34em;text-transform:uppercase;color:#C8963C;margin-bottom:16px;">
        <span style="width:34px;height:1px;background:linear-gradient(90deg,transparent,#C8963C);"></span>
        <i class="fa-solid fa-bolt"></i> Fin de la partie <i class="fa-solid fa-bolt"></i>
        <span style="width:34px;height:1px;background:linear-gradient(90deg,#C8963C,transparent);"></span>
      </div>
      <h1 style="font:800 74px/.9 'Bricolage Grotesque';letter-spacing:.18em;text-transform:uppercase;
                 color:#D4A830;animation:cl-shine 3s ease-in-out 1s infinite;margin:0;">Classement</h1>
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:18px;">
        <span style="width:90px;height:1px;background:linear-gradient(to right,transparent,#C8963C,transparent);"></span>
        <span style="width:9px;height:9px;background:#C8963C;transform:rotate(45deg);"></span>
        <span style="width:90px;height:1px;background:linear-gradient(to right,transparent,#C8963C,transparent);"></span>
      </div>
    </div>

    <!-- PODIUM -->
    <div id="pv-cl-podium"
         style="position:relative;z-index:2;display:flex;align-items:flex-end;justify-content:center;
                gap:30px;flex:1;padding-top:30px;"></div>

    <!-- FOOTER -->
    <div style="position:relative;z-index:2;width:100%;display:flex;flex-direction:column;
                align-items:center;gap:22px;flex-shrink:0;">

      <div id="pv-cl-barre"
           style="width:100%;max-width:1440px;background:rgba(255,255,255,.05);
                  border:1px solid rgba(200,150,60,.18);border-radius:18px;padding:20px 40px;
                  display:flex;align-items:center;justify-content:space-around;flex-wrap:wrap;gap:18px;
                  animation:cl-bas .6s ease .95s both;"></div>

      <div style="display:flex;gap:16px;animation:cl-fade .5s ease 1.2s both;">
        <button id="pv-btn-rejouer"
                style="padding:14px 32px;border-radius:9px;font:700 13px/1 'Manrope';
                       letter-spacing:.14em;text-transform:uppercase;cursor:pointer;
                       background:rgba(200,150,60,.12);border:1px solid rgba(200,150,60,.4);
                       color:#C8963C;transition:all .15s;">
          ↺ Rejouer
        </button>
        <button id="pv-btn-menu"
                style="padding:14px 32px;border-radius:9px;font:700 13px/1 'Manrope';
                       letter-spacing:.14em;text-transform:uppercase;cursor:pointer;
                       background:linear-gradient(135deg,#E8B84B,#8B6914);border:1px solid rgba(200,150,60,.4);
                       color:#0A0520;transition:all .15s;">
          Menu principal
        </button>
      </div>
    </div>

  </div>

  <!-- ════ PODIUM MOBILE NATIVE < 760px ════ -->
  <div id="classement-pv-mobile"
       style="display:none;position:fixed;inset:0;z-index:60;
              background:#0A0520;flex-direction:column;overflow-y:auto;
              -webkit-overflow-scrolling:touch;font-family:'Manrope',sans-serif;
              padding:calc(24px + env(safe-area-inset-top,0px)) 18px
                      calc(24px + env(safe-area-inset-bottom,0px));
              gap:20px;">

    <div style="position:fixed;inset:0;z-index:-1;pointer-events:none;
                background:radial-gradient(ellipse 70% 55% at 50% 20%,
                  rgba(107,47,217,.3) 0%,transparent 65%);"></div>

    <div style="text-align:center;">
      <div style="font:900 clamp(24px,7vw,32px)/1 'Bricolage Grotesque','Manrope';
                  color:#FFE500;letter-spacing:.06em;
                  text-shadow:0 0 30px rgba(255,229,0,.35);">
        Classement final
      </div>
    </div>

    <div id="classement-pv-liste-mobile"
         style="display:flex;flex-direction:column;gap:12px;"></div>

    <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">
      <button id="btn-rejouer-pv-m"
              style="width:100%;min-height:50px;border-radius:12px;cursor:pointer;
                     font:800 14px/1 'Manrope';letter-spacing:.12em;text-transform:uppercase;
                     background:linear-gradient(135deg,#C8A84B,#8B6914);
                     border:1.5px solid #FFE500;color:#0F0020;
                     -webkit-tap-highlight-color:transparent;">
        Rejouer
      </button>
      <button id="btn-menu-pv-m"
              style="width:100%;min-height:48px;border-radius:12px;cursor:pointer;
                     font:700 13px/1 'Manrope';letter-spacing:.1em;text-transform:uppercase;
                     background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);
                     color:rgba(255,255,255,.6);-webkit-tap-highlight-color:transparent;">
        Menu
      </button>
    </div>
  </div>
</div>
`;

let _stageCleanup   = null;
let _isMobileCl     = false;
let _onResizeClRef  = null;

export async function init() {
  forcerPleinEcranPouvoirs('#0A0520');
  _injecterStyles();
  _injecterFonts();

  const stageEl = document.getElementById('pouvoirs-stage');
  if (stageEl) _stageCleanup = attachParisStage(stageEl);

  const state    = getState();
  const brut     = (state.resultats_pouvoirs?.length ? state.resultats_pouvoirs : (state.players || []));
  const resultats = brut
    .map(p => ({ nom: p.nom || p.name || 'Joueur', score: p.score || 0, colorIdx: p.colorIdx ?? 0 }))
    .sort((a, b) => b.score - a.score);

  _afficherPodium(resultats);
  _afficherBarre(resultats);
  _construireClassementMobile(resultats);

  const btnRejouer = document.getElementById('pv-btn-rejouer');
  const btnMenu    = document.getElementById('pv-btn-menu');
  if (btnRejouer) {
    btnRejouer.addEventListener('click', () => { playBtn?.(); naviguer('config-pouvoirs.html'); });
    btnRejouer.addEventListener('pointerenter', () => { btnRejouer.style.background = 'rgba(200,150,60,.22)'; btnRejouer.style.borderColor = '#C8963C'; });
    btnRejouer.addEventListener('pointerleave', () => { btnRejouer.style.background = 'rgba(200,150,60,.12)'; btnRejouer.style.borderColor = 'rgba(200,150,60,.4)'; });
  }
  if (btnMenu) {
    btnMenu.addEventListener('click', () => { playBtn?.(); naviguer('modes-multijoueur.html'); });
    btnMenu.addEventListener('pointerenter', () => { btnMenu.style.filter = 'brightness(1.1)'; });
    btnMenu.addEventListener('pointerleave', () => { btnMenu.style.filter = ''; });
  }

  document.getElementById('btn-rejouer-pv-m')?.addEventListener('click', () => {
    playBtn?.(); naviguer('config-pouvoirs.html');
  });
  document.getElementById('btn-menu-pv-m')?.addEventListener('click', () => {
    playBtn?.(); naviguer('modes-multijoueur.html');
  });

  // ── Détection mobile + toggle (écran de résultats persistant :
  // on gère le redimensionnement en direct, comme regles-pouvoirs.js) ──
  _isMobileCl = _isMobileClassement();
  _switchClassement(_isMobileCl);

  _onResizeClRef = () => {
    const now = _isMobileClassement();
    if (now !== _isMobileCl) {
      _isMobileCl = now;
      _switchClassement(_isMobileCl);
    }
  };
  window.addEventListener('resize', _onResizeClRef);
  window.addEventListener('orientationchange', _onResizeClRef);
}

function _isMobileClassement() {
  return window.matchMedia(`(max-width:${PARIS_MOBILE_BREAKPOINT}px)`).matches;
}

function _switchClassement(mobile) {
  const stageEl  = document.getElementById('pouvoirs-stage');
  const mobileEl = document.getElementById('classement-pv-mobile');
  if (stageEl)  stageEl.style.display  = mobile ? 'none' : '';
  if (mobileEl) mobileEl.style.display = mobile ? 'flex' : 'none';
}

function _construireClassementMobile(classement) {
  const zone = document.getElementById('classement-pv-liste-mobile');
  if (!zone) return;

  zone.innerHTML = classement.map((j, i) => {
    const estPodium = i < 3;
    const couleur   = estPodium ? COULEURS_RANG[i] : 'rgba(255,255,255,.4)';
    return `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;
                border-radius:14px;background:rgba(255,255,255,.045);
                border:1.5px solid ${estPodium ? couleur + '55' : 'rgba(255,255,255,.1)'};
                ${i === 0 ? `box-shadow:0 0 24px ${couleur}33;` : ''}">
      <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;
                  font:900 15px/1 'Manrope';
                  background:${estPodium ? couleur : 'rgba(255,255,255,.08)'};
                  color:${estPodium ? '#0F0020' : 'rgba(255,255,255,.5)'};">
        ${i + 1}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font:700 15px/1.2 'Manrope';color:#fff;
                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${esc(j.nom)}
        </div>
      </div>
      <div style="font:800 16px/1 'Manrope';color:${couleur};flex-shrink:0;">
        ${(j.score || 0).toLocaleString('fr-FR')} pts
      </div>
    </div>`;
  }).join('');
}

function _afficherPodium(resultats) {
  const podium = document.getElementById('pv-cl-podium');
  if (!podium) return;

  const p1 = resultats[0];
  const p2 = resultats[1] ?? null;
  const p3 = resultats[2] ?? null;

  const bloc = (p, place, icone, taille, anim) => {
    if (!p) return '';
    const estPremier = place === 1;
    return `
    <div style="display:flex;flex-direction:column;align-items:center;animation:${anim};">
      ${estPremier ? `<div style="font-size:38px;margin-bottom:10px;color:#E8B84B;filter:drop-shadow(0 0 16px rgba(232,184,75,.6));animation:cl-crown 3s ease-in-out 1.2s infinite;"><i class="fa-solid fa-crown"></i></div>` : ''}
      <img src="${IMG}icone${icone}.png" alt=""
           style="width:${taille}px;height:${taille}px;object-fit:contain;margin-bottom:18px;
                  filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))${estPremier ? ' drop-shadow(0 0 20px rgba(232,184,75,.35))' : ''};">
      <div style="position:relative;width:${estPremier ? 312 : 288}px;height:${estPremier ? 348 : (place===2 ? 266 : 206)}px;
                  border-radius:5px 5px 0 0;display:flex;flex-direction:column;align-items:center;
                  justify-content:flex-start;gap:11px;padding:${estPremier ? '30px 22px' : '24px 20px'};
                  background:linear-gradient(160deg,${estPremier ? '#2E1A6A 0%,#1E1050 50%,#14093A 100%' : '#2A1860 0%,#1A0F48 42%,#120830 100%'});
                  ${estPremier ? 'animation:cl-glow 3s ease-in-out 1s infinite;' : 'box-shadow:inset 0 2px 0 rgba(200,150,60,.6),0 0 0 1px rgba(200,150,60,.15),0 20px 60px rgba(0,0,0,.5);'}">
        <div style="font:800 ${estPremier ? 96 : 74}px/.85 'Playfair Display',serif;
                    color:${estPremier ? '#E8B84B' : '#C8963C'};
                    text-shadow:0 0 ${estPremier ? 34 : 26}px rgba(${estPremier ? '232,184,75' : '200,150,60'},.4),0 4px 8px rgba(0,0,0,.5);">${place}</div>
        <div style="font:700 ${estPremier ? 20 : 17}px/1 'Manrope';letter-spacing:.16em;text-transform:uppercase;
                    color:${estPremier ? '#fff' : 'rgba(255,255,255,.88)'};max-width:230px;text-align:center;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.nom)}</div>
        <div style="display:flex;align-items:center;gap:9px;width:74%;margin:2px 0;">
          <span style="flex:1;height:1px;background:rgba(200,150,60,.4);"></span>
          <span style="width:5px;height:5px;background:#C8963C;transform:rotate(45deg);"></span>
          <span style="flex:1;height:1px;background:rgba(200,150,60,.4);"></span>
        </div>
        <div style="font:${estPremier ? '800 30px' : '700 24px'}/1 'Bricolage Grotesque';letter-spacing:.06em;
                    color:${estPremier ? '#E8B84B' : '#D4A830'};">${(p.score||0).toLocaleString('fr-FR')}</div>
      </div>
      <div style="width:${estPremier ? 312 : 288}px;height:20px;
                  background:linear-gradient(to bottom,${estPremier ? '#33206F' : '#2A1860'},#0D0520);
                  box-shadow:inset 0 1px 0 rgba(200,150,60,.25),0 8px 20px rgba(0,0,0,.5);"></div>
    </div>`;
  };

  podium.innerHTML = [
    bloc(p2, 2, 2, 88,  'cl-bas .7s cubic-bezier(.2,1.2,.4,1) .55s both'),
    bloc(p1, 1, 1, 104, 'cl-bas .8s cubic-bezier(.2,1.2,.4,1) .3s both'),
    bloc(p3, 3, 3, 88,  'cl-bas .7s cubic-bezier(.2,1.2,.4,1) .7s both'),
  ].join('');
}

function _afficherBarre(resultats) {
  const barre = document.getElementById('pv-cl-barre');
  if (!barre) return;
  barre.innerHTML = resultats.map((p, i) => `
    ${i > 0 ? '<span style="width:1px;height:50px;background:rgba(200,150,60,.18);"></span>' : ''}
    <div style="display:flex;align-items:center;gap:16px;">
      <img src="${IMG}icone${(i % 4) + 1}.png" alt=""
           style="width:60px;height:60px;object-fit:contain;flex-shrink:0;">
      <div style="display:flex;flex-direction:column;gap:7px;">
        <div style="font:700 15px/1 'Manrope';letter-spacing:.14em;text-transform:uppercase;
                    color:rgba(255,255,255,.88);">${esc(p.nom)}</div>
        <div style="display:flex;align-items:baseline;gap:6px;">
          <span style="font:800 22px/1 'Bricolage Grotesque';color:#E8B84B;">${(p.score||0).toLocaleString('fr-FR')}</span>
          <span style="font:600 12px/1 'Manrope';letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45);">pts</span>
        </div>
      </div>
    </div>
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
  if (document.getElementById('pouvoirs-classement-kf')) return;
  const s = document.createElement('style');
  s.id = 'pouvoirs-classement-kf';
  s.textContent = `
    @keyframes cl-haut{ from{ opacity:0; transform:translateY(-34px); } to{ opacity:1; transform:translateY(0); } }
    @keyframes cl-bas{ from{ opacity:0; transform:translateY(60px); } to{ opacity:1; transform:translateY(0); } }
    @keyframes cl-fade{ from{ opacity:0; } to{ opacity:1; } }
    @keyframes cl-shine{ 0%,100%{ text-shadow:0 0 40px rgba(212,168,48,.3),0 2px 0 rgba(0,0,0,.4); } 50%{ text-shadow:0 0 60px rgba(232,184,75,.55),0 2px 0 rgba(0,0,0,.4); } }
    @keyframes cl-crown{ 0%,100%{ transform:translateY(0) rotate(0); } 50%{ transform:translateY(-7px) rotate(-3deg); } }
    @keyframes cl-glow{ 0%,100%{ box-shadow:inset 0 3px 0 rgba(200,150,60,.85),0 0 0 1px rgba(200,150,60,.25),0 0 60px rgba(200,150,60,.10),0 30px 80px rgba(0,0,0,.6); } 50%{ box-shadow:inset 0 3px 0 rgba(232,184,75,1),0 0 0 1px rgba(200,150,60,.4),0 0 90px rgba(200,150,60,.22),0 30px 80px rgba(0,0,0,.6); } }
  `;
  document.head.appendChild(s);
}

export function cleanup() {
  _stageCleanup?.();
  _stageCleanup = null;
  if (_onResizeClRef) {
    window.removeEventListener('resize', _onResizeClRef);
    window.removeEventListener('orientationchange', _onResizeClRef);
    _onResizeClRef = null;
  }
  restaurerLayoutPouvoirs();
  document.getElementById('pouvoirs-classement-kf')?.remove();
}
