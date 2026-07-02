/* ═══════════════════════════════════════════════
   classement-paris.js — Classement Mode Paris (design podium poker)
═══════════════════════════════════════════════ */

import { naviguer } from '../routeur.js';
import { getState }  from '../state.js';
import { playBtn }   from '../audio-hooks.js';
import { attachParisStage } from '../paris-stage.js';
import { esc }       from '../utils.js';

export const titre = 'Classement — Mode Paris';

const IMG = './assets/img/paris/';

const COULEURS_JETON = [
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #38204A 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#6E4486,#4A2A5E)' },
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #16283F 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#356094,#1E3A5C)' },
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #5E4516 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#C49A3E,#8A6620)' },
  { bg: 'repeating-conic-gradient(#ECDDB6 0deg 22.5deg, #121216 22.5deg 45deg)', inner: 'radial-gradient(circle at 38% 32%,#3A3A44,#1C1C22)' },
];

export const html = `
<div class="paris-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;
            overflow:hidden;background:#0A0804;">
  <div id="paris-stage" data-page-classement-paris
       style="width:1920px;height:1080px;position:absolute;left:50%;top:50%;
              transform-origin:center center;
              background:#0A0804;font-family:'Manrope',sans-serif;user-select:none;">

  <!-- FOND -->
  <img src="${IMG}paris-fond.png" alt=""
       style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1; animation:bgZoom 12s ease-out both;">
  <div style="position:absolute; inset:0; z-index:2; background:radial-gradient(ellipse 70% 62% at 50% 38%, rgba(0,0,0,0) 28%, rgba(5,3,1,.82) 100%);"></div>
  <div style="position:absolute; left:50%; top:34%; width:1200px; height:760px; z-index:2; transform:translate(-50%,-50%); background:radial-gradient(ellipse, rgba(232,184,75,.22) 0%, rgba(232,184,75,.05) 46%, transparent 70%); animation:haloBreathSimple 5s ease-in-out infinite; pointer-events:none;"></div>

  <!-- confettis -->
  <div data-confetti style="position:absolute; inset:0; z-index:3; pointer-events:none;"></div>

  <!-- HEADER -->
  <div style="position:absolute; left:50%; top:48px; transform:translateX(-50%); z-index:10; text-align:center;">
    <div style="font:700 17px/1 'Manrope'; letter-spacing:.5em; text-indent:.5em; color:rgba(232,184,75,.78); animation:fadeDown .7s ease-out .1s both;">FIN&nbsp;DE&nbsp;PARTIE</div>
    <div style="font:900 76px/1 'Cinzel'; letter-spacing:.1em; text-indent:.1em; color:#E8C063; margin-top:14px; text-shadow:0 0 40px rgba(232,184,75,.45), 0 3px 8px rgba(0,0,0,.7); animation:fadeDown .8s cubic-bezier(.16,.84,.3,1) .25s both;">CLASSEMENT&nbsp;FINAL</div>
    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-top:18px;">
      <div style="width:200px; height:1.5px; transform-origin:right; background:linear-gradient(to right,transparent,#C8963C); animation:lineGrow .7s ease-out .6s both;"></div>
      <div style="width:10px; height:10px; transform:rotate(45deg); background:#E8C063; box-shadow:0 0 12px rgba(232,184,75,.7); animation:badgePop .5s ease-out .85s both;"></div>
      <div style="width:200px; height:1.5px; transform-origin:left; background:linear-gradient(to left,transparent,#C8963C); animation:lineGrow .7s ease-out .6s both;"></div>
    </div>
  </div>

  <!-- PODIUM -->
  <div id="podium-paris"
       style="position:absolute; left:50%; top:50%; transform:translate(-50%,-40%);
              z-index:10; display:flex; align-items:flex-end; gap:30px; justify-content:center;">
  </div>

  <!-- 4e place -->
  <div id="quatrieme-paris"
       style="position:absolute; left:50%; bottom:16%; transform:translateX(-50%);
              z-index:10; width:min(824px,90vw); animation:rowIn .7s ease-out 2.1s both;">
  </div>

  <!-- BOUTONS -->
  <div style="position:absolute; left:50%; bottom:4%; transform:translateX(-50%);
              z-index:20; display:flex; gap:20px; flex-wrap:wrap; justify-content:center;">
    <button id="btn-rejouer"
            style="padding:17px 44px; border-radius:12px;
                   border:1.5px solid rgba(200,150,60,.5);
                   background:linear-gradient(180deg,#241830,#150D22);
                   font:700 16px/1 'Manrope'; letter-spacing:.18em; color:#E8C063;
                   cursor:pointer; transition:filter .15s, transform .15s;
                   text-shadow:0 0 14px rgba(232,184,75,.35);">
      ↺ NOUVELLE&nbsp;PARTIE
    </button>
    <button id="btn-menu"
            style="padding:17px 44px; border-radius:12px; border:none;
                   background:linear-gradient(180deg,#2A1E12,#140E08);
                   border:1.5px solid rgba(232,184,75,.7);
                   font:800 16px/1 'Cinzel'; letter-spacing:.18em; color:#E8C063;
                   cursor:pointer; transition:filter .15s, transform .15s;
                   text-shadow:0 0 14px rgba(232,184,75,.35);
                   animation:badgePop .6s cubic-bezier(.2,.9,.3,1) 2.4s both, ctaPulse 2.4s ease-in-out 3.1s infinite;">
      MENU&nbsp;PRINCIPAL
    </button>
  </div>

  </div>
</div>
`;

let _timers = [];
let _stageCleanup = null;

export async function init() {
  _forcerPleinEcran();
  _genererConfettis();

  const stageEl = document.getElementById('paris-stage');
  if (stageEl) _stageCleanup = attachParisStage(stageEl);

  const state = getState();
  const brut = (state.resultatsParis?.length ? state.resultatsParis : [...(state.players || [])]);
  const resultats = brut
    .map(p => ({ ...p, score: p.score || 0 }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  _afficherPodium(resultats);
  _afficher4e(resultats[3] ?? null, 3);

  const btnRejouer = document.getElementById('btn-rejouer');
  const btnMenu = document.getElementById('btn-menu');

  if (btnRejouer) {
    btnRejouer.addEventListener('click', () => { playBtn(); naviguer('annonce-paris.html'); });
    btnRejouer.addEventListener('pointerenter', () => { btnRejouer.style.filter = 'brightness(1.2)'; btnRejouer.style.transform = 'translateX(-50%) translateY(-2px)'; });
    btnRejouer.addEventListener('pointerleave', () => { btnRejouer.style.filter = ''; btnRejouer.style.transform = ''; });
  }
  if (btnMenu) {
    btnMenu.addEventListener('click', () => { playBtn(); naviguer('modes-multijoueur.html'); });
    btnMenu.addEventListener('pointerenter', () => { btnMenu.style.filter = 'brightness(1.2)'; });
    btnMenu.addEventListener('pointerleave', () => { btnMenu.style.filter = ''; });
  }
}

function _afficherPodium(resultats) {
  const podium = document.getElementById('podium-paris');
  if (!podium || resultats.length < 2) return;

  const p1 = resultats[0];
  const p2 = resultats[1];
  const p3 = resultats[2] ?? null;

  podium.innerHTML = `
    <!-- 2e -->
    <div style="display:flex; flex-direction:column; align-items:center; animation:podiumRise .8s cubic-bezier(.16,.84,.3,1) 1.35s both;">
      <div style="width:104px; height:104px; border-radius:50%; padding:3px; background:linear-gradient(180deg,#D6D6DE,#7C7C86); box-shadow:0 8px 22px rgba(0,0,0,.5);">
        <div style="width:100%; height:100%; border-radius:50%; ${COULEURS_JETON[1].bg ? `background:${COULEURS_JETON[1].bg};` : ''} display:flex; align-items:center; justify-content:center;">
          <div style="width:70px; height:70px; border-radius:50%; background:${COULEURS_JETON[1].inner}; border:2px solid #C8963C; display:flex; align-items:center; justify-content:center;">
            <div style="font:700 20px/1 'Manrope'; color:#E8C063;">${esc((p2.init || p2.name||'J').slice(0,2).toUpperCase())}</div>
          </div>
        </div>
      </div>
      <div style="font:700 19px/1 'Manrope'; letter-spacing:.08em; color:#fff; margin-top:14px; max-width:230px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(p2.name || 'JOUEUR 2')}</div>
      <div style="font:800 28px/1 'Cinzel'; color:#D6D6DE; margin-top:8px;">${(p2.score||0).toLocaleString('fr-FR')}</div>
      <div style="font:700 12px/1 'Manrope'; letter-spacing:.14em; color:rgba(214,214,222,.85); margin-top:8px;">M&Eacute;DAILLE&nbsp;D'ARGENT</div>
      <div style="width:230px; height:150px; margin-top:18px; border-radius:14px 14px 0 0; padding:2px 2px 0; background:linear-gradient(180deg,#9CA0AC,#4C4E58); box-shadow:0 -2px 0 rgba(255,255,255,.2) inset;">
        <div style="width:100%; height:100%; border-radius:13px 13px 0 0; background:linear-gradient(180deg,#2A2E3A,#171A24); display:flex; align-items:flex-start; justify-content:center; padding-top:20px;"><div style="font:900 70px/1 'Cinzel'; color:#C6C9D4; text-shadow:0 2px 6px rgba(0,0,0,.5);">2</div></div>
      </div>
    </div>

    <!-- 1er -->
    <div style="display:flex; flex-direction:column; align-items:center; animation:podiumRise .85s cubic-bezier(.16,.84,.3,1) 1.15s both;">
      <div style="font-size:46px; line-height:1; margin-bottom:6px; color:#F4D777; filter:drop-shadow(0 4px 8px rgba(0,0,0,.5)); animation:crownPop .7s cubic-bezier(.2,.9,.3,1) 1.9s both;"><i class="fa-solid fa-crown"></i></div>
      <div style="width:132px; height:132px; border-radius:50%; padding:3px; background:linear-gradient(180deg,#F4D777,#9A7528); animation:winnerGlow 2.6s ease-in-out 2s infinite;">
        <div style="width:100%; height:100%; border-radius:50%; background:${COULEURS_JETON[2].bg}; display:flex; align-items:center; justify-content:center;">
          <div style="width:92px; height:92px; border-radius:50%; background:${COULEURS_JETON[2].inner}; border:2.5px solid #F0CE72; display:flex; align-items:center; justify-content:center;">
            <div style="font:700 26px/1 'Manrope'; color:#E8C063;">${esc((p1.init || p1.name||'J').slice(0,2).toUpperCase())}</div>
          </div>
        </div>
      </div>
      <div style="font:800 23px/1 'Manrope'; letter-spacing:.08em; color:#fff; margin-top:16px; max-width:256px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(p1.name || 'JOUEUR 1')}</div>
      <div style="font:900 38px/1 'Cinzel'; color:#E8C063; margin-top:8px; text-shadow:0 0 24px rgba(232,184,75,.5);">${(p1.score||0).toLocaleString('fr-FR')}</div>
      <div style="font:800 14px/1 'Manrope'; letter-spacing:.16em; color:#F0CE72; margin-top:8px; text-shadow:0 0 14px rgba(232,184,75,.5);">GRAND&nbsp;GAGNANT</div>
      <div style="width:256px; height:190px; margin-top:18px; border-radius:14px 14px 0 0; padding:2px 2px 0; background:linear-gradient(180deg,#F4D777,#8A6620); box-shadow:0 0 36px rgba(232,184,75,.4);">
        <div style="width:100%; height:100%; border-radius:13px 13px 0 0; background:linear-gradient(180deg,#33240F,#1C1408); display:flex; align-items:flex-start; justify-content:center; padding-top:22px;"><div style="font:900 92px/1 'Cinzel'; color:#E8C063; text-shadow:0 0 30px rgba(232,184,75,.6), 0 2px 6px rgba(0,0,0,.5);">1</div></div>
      </div>
    </div>

    ${p3 ? `
    <!-- 3e -->
    <div style="display:flex; flex-direction:column; align-items:center; animation:podiumRise .8s cubic-bezier(.16,.84,.3,1) 1.55s both;">
      <div style="width:104px; height:104px; border-radius:50%; padding:3px; background:linear-gradient(180deg,#D69A66,#7A4F2C); box-shadow:0 8px 22px rgba(0,0,0,.5);">
        <div style="width:100%; height:100%; border-radius:50%; background:${COULEURS_JETON[0].bg}; display:flex; align-items:center; justify-content:center;">
          <div style="width:70px; height:70px; border-radius:50%; background:${COULEURS_JETON[0].inner}; border:2px solid #C8963C; display:flex; align-items:center; justify-content:center;">
            <div style="font:700 20px/1 'Manrope'; color:#E8C063;">${esc((p3.init || p3.name||'J').slice(0,2).toUpperCase())}</div>
          </div>
        </div>
      </div>
      <div style="font:700 19px/1 'Manrope'; letter-spacing:.08em; color:#fff; margin-top:14px; max-width:230px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(p3.name || 'JOUEUR 3')}</div>
      <div style="font:800 28px/1 'Cinzel'; color:#D69A66; margin-top:8px;">${(p3.score||0).toLocaleString('fr-FR')}</div>
      <div style="font:700 12px/1 'Manrope'; letter-spacing:.14em; color:rgba(214,154,102,.9); margin-top:8px;">M&Eacute;DAILLE&nbsp;DE&nbsp;BRONZE</div>
      <div style="width:230px; height:124px; margin-top:18px; border-radius:14px 14px 0 0; padding:2px 2px 0; background:linear-gradient(180deg,#C08A5A,#6E482A);">
        <div style="width:100%; height:100%; border-radius:13px 13px 0 0; background:linear-gradient(180deg,#2C2118,#181109); display:flex; align-items:flex-start; justify-content:center; padding-top:18px;"><div style="font:900 62px/1 'Cinzel'; color:#D69A66; text-shadow:0 2px 6px rgba(0,0,0,.5);">3</div></div>
      </div>
    </div>
    ` : ''}
  `;
}

function _afficher4e(p4, idx) {
  const zone = document.getElementById('quatrieme-paris');
  if (!zone || !p4) return;
  zone.innerHTML = `
    <div style="display:flex; align-items:center; gap:22px; padding:16px 26px; border-radius:16px; border:1px solid rgba(200,150,60,.3); background:linear-gradient(180deg,rgba(36,27,51,.62),rgba(18,14,30,.74));">
      <div style="font:900 34px/1 'Cinzel'; color:rgba(255,255,255,.5); width:46px; text-align:center;">4</div>
      <div style="width:60px; height:60px; border-radius:50%; padding:2px; background:linear-gradient(180deg,#8A6620,#4A340F); flex-shrink:0;">
        <div style="width:100%;height:100%;border-radius:50%;background:${COULEURS_JETON[3].bg};display:flex;align-items:center;justify-content:center;">
          <div style="width:40px;height:40px;border-radius:50%;background:${COULEURS_JETON[3].inner};border:1.5px solid #C8963C;display:flex;align-items:center;justify-content:center;">
            <div style="font:700 14px/1 'Manrope';color:#E8C063;">${esc((p4.init||p4.name||'J').slice(0,2).toUpperCase())}</div>
          </div>
        </div>
      </div>
      <div style="flex:1;">
        <div style="font:700 19px/1 'Manrope'; letter-spacing:.08em; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(p4.name || 'JOUEUR 4')}</div>
        <div style="font:600 13px/1 'Manrope'; color:rgba(232,184,75,.6); margin-top:6px;">Score final</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font:800 28px/1 'Cinzel'; color:#fff;">${(p4.score||0).toLocaleString('fr-FR')}</div>
      </div>
    </div>
  `;
}

function _genererConfettis() {
  const box = document.querySelector('[data-confetti]');
  if (!box) return;
  const cols = ['#E8C063','#F0CE72','#22C55E','#356094','#6E4486','#fff'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    const w = 6 + Math.random() * 8;
    const h = 8 + Math.random() * 12;
    const dur = 3.5 + Math.random() * 3.5;
    const delay = 1 + Math.random() * 5;
    const col = cols[(Math.random() * cols.length) | 0];
    const round = Math.random() > 0.6;
    c.style.cssText = `position:absolute;left:${Math.random()*100}%;top:-40px;width:${round?h*0.5:w}px;height:${round?h*0.5:h}px;background:${col};border-radius:${round?'50%':'1px'};opacity:0;box-shadow:0 0 6px ${col}55;animation:confettiFall ${dur}s linear ${delay}s infinite;`;
    box.appendChild(c);
  }
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

export function cleanup() {
  _timers.forEach(clearTimeout);
  _timers = [];
  _stageCleanup?.();
  _stageCleanup = null;
  _restaurerLayout();
}
