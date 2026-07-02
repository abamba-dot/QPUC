/* ═══════════════════════════════════════════════
   annonce-paris.js — Annonce Mode Paris (nouveau design poker)
   Durée : ~4 secondes puis navigation automatique
═══════════════════════════════════════════════ */

import { naviguer } from '../routeur.js';
import { playBtn }  from '../audio-hooks.js';
import { attachParisStage } from '../paris-stage.js';

export const titre = 'Mode Paris';

const IMG = './assets/img/paris/';

export const html = `
<div class="paris-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;
            overflow:hidden;background:#0A0804;">
  <div id="paris-stage" data-page-annonce-paris
       style="width:1920px;height:1080px;position:absolute;left:50%;top:50%;
              transform-origin:center center;
              background:#0A0804;font-family:'Manrope',sans-serif;user-select:none;">

  <!-- FOND -->
  <img src="${IMG}paris-fond.png" alt=""
       style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1; animation:bgZoom 9s ease-out both;">
  <div style="position:absolute; inset:0; z-index:2; background:radial-gradient(ellipse 65% 62% at 50% 46%, rgba(0,0,0,0) 30%, rgba(5,3,1,.78) 100%); animation:vignettePulse 6s ease-in-out infinite;"></div>
  <div style="position:absolute; inset:0; z-index:2; background:linear-gradient(180deg, rgba(8,5,2,.55) 0%, rgba(8,5,2,0) 26%, rgba(8,5,2,0) 70%, rgba(8,5,2,.7) 100%);"></div>

  <!-- RAYONS -->
  <div style="position:absolute; left:50%; top:46%; width:1500px; height:1500px; z-index:3; transform:translate(-50%,-50%); background:conic-gradient(from 0deg, rgba(232,184,75,.10) 0deg 6deg, transparent 6deg 30deg, rgba(232,184,75,.10) 30deg 36deg, transparent 36deg 60deg, rgba(232,184,75,.10) 60deg 66deg, transparent 66deg 90deg, rgba(232,184,75,.10) 90deg 96deg, transparent 96deg 120deg, rgba(232,184,75,.10) 120deg 126deg, transparent 126deg 150deg, rgba(232,184,75,.10) 150deg 156deg, transparent 156deg 180deg, rgba(232,184,75,.10) 180deg 186deg, transparent 186deg 210deg, rgba(232,184,75,.10) 210deg 216deg, transparent 216deg 240deg, rgba(232,184,75,.10) 240deg 246deg, transparent 246deg 270deg, rgba(232,184,75,.10) 270deg 276deg, transparent 276deg 300deg, rgba(232,184,75,.10) 300deg 306deg, transparent 306deg 330deg, rgba(232,184,75,.10) 330deg 336deg, transparent 336deg 360deg); -webkit-mask:radial-gradient(circle, #000 0%, transparent 62%); mask:radial-gradient(circle, #000 0%, transparent 62%); animation:raysSpin 60s linear infinite; pointer-events:none;"></div>
  <!-- halo -->
  <div style="position:absolute; left:50%; top:44%; width:1100px; height:760px; z-index:3; transform:translate(-50%,-50%); background:radial-gradient(ellipse, rgba(232,184,75,.28) 0%, rgba(232,184,75,.06) 45%, transparent 70%); animation:haloBreath 5s ease-in-out infinite; pointer-events:none;"></div>

  <!-- EMBERS -->
  <div data-embers style="position:absolute; inset:0; z-index:4; pointer-events:none;"></div>

  <!-- JETONS volants (positionnés depuis le centre) -->
  <div style="position:absolute; left:50%; top:50%; width:0; height:0; z-index:5;">
    <div style="position:absolute; --fromX:-520px; --fromY:-360px; --fromR:-120deg; --toR:-16deg; left:-560px; top:-150px; animation:chipFly 1s cubic-bezier(.2,.8,.25,1) .35s both;">
      <div style="--toR:-16deg; animation:chipFloat 4.5s ease-in-out 1.4s infinite;">
        <div style="width:118px; height:122px; background:url('${IMG}paris-jetons.png') no-repeat; background-size:400% auto; background-position:33.333% 56%; filter:drop-shadow(0 12px 22px rgba(0,0,0,.6));"></div>
      </div>
    </div>
    <div style="position:absolute; --fromX:-460px; --fromY:380px; --fromR:140deg; --toR:12deg; left:-470px; top:120px; animation:chipFly 1s cubic-bezier(.2,.8,.25,1) .5s both;">
      <div style="--toR:12deg; animation:chipFloat 5.2s ease-in-out 1.6s infinite;">
        <div style="width:96px; height:100px; background:url('${IMG}paris-jetons.png') no-repeat; background-size:400% auto; background-position:0% 56%; filter:drop-shadow(0 12px 22px rgba(0,0,0,.6));"></div>
      </div>
    </div>
    <div style="position:absolute; --fromX:520px; --fromY:-340px; --fromR:120deg; --toR:18deg; left:470px; top:-160px; animation:chipFly 1s cubic-bezier(.2,.8,.25,1) .42s both;">
      <div style="--toR:18deg; animation:chipFloat 4.8s ease-in-out 1.5s infinite;">
        <div style="width:110px; height:114px; background:url('${IMG}paris-jetons.png') no-repeat; background-size:400% auto; background-position:66.667% 56%; filter:drop-shadow(0 12px 22px rgba(0,0,0,.6));"></div>
      </div>
    </div>
    <div style="position:absolute; --fromX:470px; --fromY:360px; --fromR:-140deg; --toR:-14deg; left:500px; top:110px; animation:chipFly 1s cubic-bezier(.2,.8,.25,1) .58s both;">
      <div style="--toR:-14deg; animation:chipFloat 5.6s ease-in-out 1.7s infinite;">
        <div style="width:104px; height:108px; background:url('${IMG}paris-jetons.png') no-repeat; background-size:400% auto; background-position:100% 56%; filter:drop-shadow(0 12px 22px rgba(0,0,0,.6));"></div>
      </div>
    </div>
  </div>

  <!-- BLOC CENTRAL -->
  <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); z-index:10; display:flex; flex-direction:column; align-items:center; text-align:center;">

    <div style="font:700 18px/1 'Manrope'; letter-spacing:.52em; text-indent:.52em; color:rgba(232,184,75,.82); animation:fadeUp .8s ease-out .15s both;">QUI&nbsp;PEUT&nbsp;BATTRE&nbsp;UN&nbsp;CHAMPION</div>

    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-top:26px;">
      <div style="width:170px; height:1.5px; transform-origin:right; background:linear-gradient(to right,transparent,#C8963C); animation:lineGrow .7s ease-out .6s both;"></div>
      <div style="width:11px; height:11px; background:#E8C063; box-shadow:0 0 12px rgba(232,184,75,.7); animation:diamPop .5s cubic-bezier(.2,.8,.25,1) .9s both;"></div>
      <div style="width:170px; height:1.5px; transform-origin:left; background:linear-gradient(to left,transparent,#C8963C); animation:lineGrow .7s ease-out .6s both;"></div>
    </div>

    <div style="margin-top:18px; position:relative; line-height:0.92;">
      <div style="font:900 168px/0.92 'Cinzel'; letter-spacing:.16em; text-indent:.16em; color:#E8C063; animation:titleIn 1.1s cubic-bezier(.16,.84,.3,1) .55s both, titleGlow 4s ease-in-out 1.8s infinite;">MODE</div>
      <div style="font:900 168px/0.92 'Cinzel'; letter-spacing:.16em; text-indent:.16em; color:#E8C063; margin-top:6px; animation:titleIn 1.1s cubic-bezier(.16,.84,.3,1) .78s both, titleGlow 4s ease-in-out 2s infinite;">PARIS</div>
      <div style="position:absolute; inset:0; background:linear-gradient(105deg, transparent 38%, rgba(255,248,225,.7) 50%, transparent 62%); background-size:260% 100%; -webkit-background-clip:text; background-clip:text; color:transparent; font:900 168px/0.92 'Cinzel'; letter-spacing:.16em; text-indent:.16em; pointer-events:none; animation:sheen 4.5s ease-in-out 2.2s infinite; line-height:0.92;">MODE<div style="margin-top:6px;">PARIS</div></div>
    </div>

    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-top:30px;">
      <div style="width:120px; height:1.5px; transform-origin:right; background:linear-gradient(to right,transparent,#C8963C); animation:lineGrow .7s ease-out 1.5s both;"></div>
      <div style="width:9px; height:9px; transform:rotate(45deg); background:#C8963C; animation:diamPop .5s cubic-bezier(.2,.8,.25,1) 1.7s both;"></div>
      <div style="width:120px; height:1.5px; transform-origin:left; background:linear-gradient(to left,transparent,#C8963C); animation:lineGrow .7s ease-out 1.5s both;"></div>
    </div>

    <div style="font:600 26px/1.4 'Manrope'; color:rgba(255,255,255,.86); margin-top:28px; max-width:760px; animation:fadeUp .9s ease-out 1.95s both;">Misez vos jetons sur la bonne r&eacute;ponse.<br>Le plus audacieux rafle la mise.</div>

    <div style="display:flex; gap:14px; margin-top:34px; animation:fadeUp .9s ease-out 2.2s both; flex-wrap:wrap; justify-content:center;">
      <div style="display:flex; align-items:center; gap:10px; padding:11px 22px; border-radius:999px; border:1px solid rgba(200,150,60,.4); background:linear-gradient(180deg,rgba(36,27,51,.7),rgba(18,14,30,.78)); font:700 14px/1 'Manrope'; letter-spacing:.06em; color:rgba(255,255,255,.9);"><span style="width:26px; height:26px; border-radius:50%; background:radial-gradient(circle at 38% 32%,#6E4486,#4A2A5E); border:1.5px solid #C8963C; flex-shrink:0;"></span>4 JOUEURS</div>
      <div style="display:flex; align-items:center; gap:10px; padding:11px 22px; border-radius:999px; border:1px solid rgba(200,150,60,.4); background:linear-gradient(180deg,rgba(36,27,51,.7),rgba(18,14,30,.78)); font:700 14px/1 'Manrope'; letter-spacing:.06em; color:rgba(255,255,255,.9);"><span style="width:26px; height:26px; border-radius:50%; background:radial-gradient(circle at 38% 32%,#356094,#1E3A5C); border:1.5px solid #C8963C; flex-shrink:0;"></span>2 500 PTS DE D&Eacute;PART</div>
      <div style="display:flex; align-items:center; gap:10px; padding:11px 22px; border-radius:999px; border:1px solid rgba(200,150,60,.4); background:linear-gradient(180deg,rgba(36,27,51,.7),rgba(18,14,30,.78)); font:700 14px/1 'Manrope'; letter-spacing:.06em; color:rgba(255,255,255,.9);"><span style="width:26px; height:26px; border-radius:50%; background:radial-gradient(circle at 38% 32%,#C49A3E,#8A6620); border:1.5px solid #C8963C; flex-shrink:0;"></span>4 MISES PAR MANCHE</div>
    </div>

    <div data-cta
         style="margin-top:48px; padding:20px 58px; border-radius:12px;
                border:1.5px solid rgba(232,184,75,.7);
                background:linear-gradient(180deg,#2A1E12,#140E08);
                font:800 22px/1 'Cinzel'; letter-spacing:.22em; text-indent:.22em;
                color:#E8C063; cursor:pointer;
                animation:badgePop .6s cubic-bezier(.2,.9,.3,1) 2.5s both, ctaPulse 2.4s ease-in-out 3.2s infinite;
                text-shadow:0 0 18px rgba(232,184,75,.4);">FAITES&nbsp;VOS&nbsp;JEUX</div>

  </div>

  </div>
</div>
`;

let _timerNavigation = null;
let _stageCleanup = null;

export async function init() {
  _injecterFonts();
  _injecterKeyframes();
  _forcerPleinEcran();
  _genererEmbers();

  const stageEl = document.getElementById('paris-stage');
  if (stageEl) _stageCleanup = attachParisStage(stageEl);

  const cta = document.querySelector('[data-cta]');
  if (cta) {
    cta.style.transition = 'transform .15s ease, background .2s ease, border-color .2s ease';
    cta.addEventListener('pointerenter', () => {
      cta.style.background = 'linear-gradient(180deg,#3A2A18,#1E150C)';
      cta.style.borderColor = '#F0CE72';
      cta.style.transform = 'translateY(-2px)';
    });
    cta.addEventListener('pointerleave', () => {
      cta.style.background = 'linear-gradient(180deg,#2A1E12,#140E08)';
      cta.style.borderColor = 'rgba(232,184,75,.7)';
      cta.style.transform = '';
    });
    cta.addEventListener('pointerdown', () => { cta.style.transform = 'scale(.97)'; });
    cta.addEventListener('pointerup', () => { cta.style.transform = 'translateY(-2px)'; });
    cta.addEventListener('click', () => {
      playBtn();
      clearTimeout(_timerNavigation);
      naviguer('jeu-paris.html');
    });
  }

  _timerNavigation = setTimeout(() => naviguer('jeu-paris.html'), 4000);
}

function _injecterFonts() {
  if (!document.getElementById('paris-fonts')) {
    const link = document.createElement('link');
    link.id = 'paris-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }
}

function _injecterKeyframes() {
  if (document.getElementById('paris-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'paris-keyframes';
  s.textContent = `
    @keyframes bgZoom { from{transform:scale(1.12)} to{transform:scale(1)} }
    @keyframes vignettePulse { 0%,100%{opacity:.92} 50%{opacity:.78} }
    @keyframes raysSpin { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }
    @keyframes haloBreath { 0%,100%{opacity:.5;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.85;transform:translate(-50%,-50%) scale(1.08)} }
    @keyframes chipFly {
      0%{opacity:0;transform:translateY(var(--fromY)) translateX(var(--fromX)) rotate(var(--fromR)) scale(.3)}
      70%{opacity:1}
      100%{opacity:1;transform:translateY(0) translateX(0) rotate(var(--toR)) scale(1)}
    }
    @keyframes chipFloat { 0%,100%{transform:translateY(0) rotate(var(--toR))} 50%{transform:translateY(-14px) rotate(calc(var(--toR) + 6deg))} }
    @keyframes lineGrow { from{transform:scaleX(0);opacity:0} to{transform:scaleX(1);opacity:1} }
    @keyframes diamPop { 0%{transform:rotate(45deg) scale(0)} 70%{transform:rotate(45deg) scale(1.3)} 100%{transform:rotate(45deg) scale(1)} }
    @keyframes titleIn { 0%{opacity:0;letter-spacing:.5em;transform:translateY(26px);filter:blur(8px)} 100%{opacity:1;letter-spacing:.16em;transform:translateY(0);filter:blur(0)} }
    @keyframes titleGlow { 0%,100%{text-shadow:0 0 34px rgba(232,184,75,.4),0 4px 8px rgba(0,0,0,.7)} 50%{text-shadow:0 0 60px rgba(232,184,75,.85),0 0 18px rgba(232,184,75,.5),0 4px 8px rgba(0,0,0,.7)} }
    @keyframes sheen { 0%{background-position:-220% 0} 60%,100%{background-position:320% 0} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes badgePop { 0%{opacity:0;transform:scale(.6)} 70%{transform:scale(1.08)} 100%{opacity:1;transform:scale(1)} }
    @keyframes ctaPulse { 0%,100%{box-shadow:inset 0 1px 0 rgba(220,180,90,.35),0 0 0 0 rgba(232,184,75,.5)} 50%{box-shadow:inset 0 1px 0 rgba(220,180,90,.35),0 0 0 14px rgba(232,184,75,0)} }
    @keyframes emberRise { 0%{opacity:0;transform:translateY(0) scale(.6)} 12%{opacity:.9} 88%{opacity:.7} 100%{opacity:0;transform:translateY(var(--rise)) scale(1.1)} }
    @keyframes pretPulse { 0%,100%{opacity:1;box-shadow:0 0 9px rgba(34,197,94,.75)} 50%{opacity:.65;box-shadow:0 0 16px rgba(34,197,94,1)} }
    @keyframes cardGlow  { 0%,100%{filter:drop-shadow(0 0 14px rgba(232,184,75,.55))} 50%{filter:drop-shadow(0 0 26px rgba(232,184,75,.9))} }
    @keyframes confettiFall { 0%{opacity:0;transform:translateY(-40px) rotate(0)} 8%{opacity:1} 100%{opacity:0;transform:translateY(880px) rotate(640deg)} }
    @keyframes podiumRise { 0%{opacity:0;transform:translateY(70px)} 60%{transform:translateY(-8px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes crownPop { 0%{opacity:0;transform:translateY(14px) scale(.4) rotate(-12deg)} 70%{transform:translateY(0) scale(1.18) rotate(4deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
    @keyframes winnerGlow { 0%,100%{box-shadow:0 0 0 1px rgba(232,184,75,.5),0 0 30px rgba(232,184,75,.35),0 18px 40px rgba(0,0,0,.55)} 50%{box-shadow:0 0 0 1px rgba(232,184,75,.85),0 0 56px rgba(232,184,75,.7),0 18px 40px rgba(0,0,0,.55)} }
    @keyframes rowIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
    @keyframes haloBreathSimple { 0%,100%{opacity:.45} 50%{opacity:.75} }
    @keyframes fadeDown { from{opacity:0;transform:translateY(-22px)} to{opacity:1;transform:translateY(0)} }
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

function _genererEmbers() {
  const zone = document.querySelector('[data-embers]');
  if (!zone) return;
  for (let i = 0; i < 26; i++) {
    const e = document.createElement('div');
    const size = 2 + Math.random() * 4;
    const rise = -(220 + Math.random() * 360);
    const dur = 6 + Math.random() * 7;
    const delay = Math.random() * 8;
    const gold = Math.random() > 0.4;
    e.style.cssText = `position:absolute;left:${Math.random()*100}%;top:${70+Math.random()*30}%;width:${size}px;height:${size}px;border-radius:50%;background:${gold?'rgba(232,184,75,':'rgba(255,240,210,'}${.5+Math.random()*.4});box-shadow:0 0 ${4+size}px rgba(232,184,75,.7);--rise:${rise}px;animation:emberRise ${dur}s ease-in ${delay}s infinite;`;
    zone.appendChild(e);
  }
}

export function cleanup() {
  clearTimeout(_timerNavigation);
  _timerNavigation = null;
  _stageCleanup?.();
  _stageCleanup = null;
  _restaurerLayout();
  document.getElementById('paris-keyframes')?.remove();
  document.getElementById('paris-fonts')?.remove();
}
