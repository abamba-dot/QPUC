/* ═══════════════════════════════════════════════
   intro-pouvoirs.js — Annonce Mode Pouvoirs
   Durée : ~3.5 secondes puis navigation automatique
═══════════════════════════════════════════════ */

import { naviguer }         from '../routeur.js';
import { playBtn }          from '../audio-hooks.js';
import { attachParisStage, PARIS_MOBILE_BREAKPOINT } from '../paris-stage.js';
import { forcerPleinEcranPouvoirs, restaurerLayoutPouvoirs } from '../pouvoirs-fullscreen.js';
import { POUVOIRS_COLORS }  from '../theme-paris-pouvoirs.js';

export const titre = 'Mode Pouvoirs';

const IMG = './assets/img/pouvoirs/';

export const html = `
<div class="pouvoirs-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;z-index:9999;overflow:hidden;background:${POUVOIRS_COLORS.bg};">
  <div id="pouvoirs-stage"
       style="width:1920px;height:1080px;position:absolute;left:50%;top:50%;
              transform-origin:center center;overflow:hidden;
              background:${POUVOIRS_COLORS.bg};font-family:'Manrope',sans-serif;user-select:none;
              background-image:radial-gradient(ellipse 60% 55% at 50% 42%, rgba(107,47,217,.32) 0%, transparent 62%),
                                radial-gradient(ellipse 36% 40% at 84% 84%, rgba(255,107,0,.13) 0%, transparent 54%);">

    <img src="${IMG}fond.png" alt=""
         style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
                pointer-events:none;z-index:0;">

    <div data-intro-content style="position:absolute;inset:0;z-index:1;animation:mp-pageout 1s ease forwards 2.55s;">

      <!-- twinkle particles -->
      <div data-particles style="position:absolute;inset:0;z-index:1;pointer-events:none;"></div>

      <!-- central energy -->
      <div style="position:absolute;top:50%;left:50%;width:780px;height:780px;transform:translate(-50%,-50%);
                  border-radius:50%;z-index:1;pointer-events:none;
                  background:conic-gradient(from 0deg, transparent 0deg, rgba(255,229,0,.07) 18deg, transparent 36deg, transparent 54deg, rgba(107,47,217,.07) 72deg, transparent 90deg);
                  animation:mp-rays 24s linear infinite;"></div>
      <div style="position:absolute;top:50%;left:50%;width:640px;height:640px;border-radius:50%;z-index:1;pointer-events:none;
                  background:radial-gradient(circle, rgba(255,229,0,.18) 0%, rgba(107,47,217,.15) 42%, transparent 70%);
                  transform:translate(-50%,-50%) scale(0);animation:mp-explosion .65s ease-out .15s both;"></div>
      <div style="position:absolute;top:50%;left:50%;width:520px;height:520px;border-radius:50%;z-index:1;pointer-events:none;
                  border:2px solid rgba(255,229,0,.4);transform:translate(-50%,-50%) scale(.2);
                  animation:mp-ring 1.1s ease-out .25s both;"></div>

      <!-- skip -->
      <button data-skip
              style="position:absolute;top:40px;right:48px;z-index:10;font-family:'Manrope',sans-serif;
                     font-size:18px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
                     color:rgba(255,255,255,.4);background:none;border:none;cursor:pointer;padding:12px;
                     transition:color .15s;">
        Passer →
      </button>

      <!-- CARD: Réponse Éclair — haut gauche -->
      <div style="position:absolute;top:96px;left:180px;width:236px;height:354px;z-index:4;transform:rotate(-11deg);
                  animation:mp-hg .8s cubic-bezier(.2,1.25,.4,1) .35s both, mp-float-hg 4.6s ease-in-out 1.3s infinite;">
        <div style="position:relative;width:100%;height:100%;border-radius:16px;overflow:hidden;
                    box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 48px rgba(61,200,122,.45);">
          <img src="${IMG}reponse_eclair.png" alt="Réponse Éclair" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
      </div>

      <!-- CARD: Bouclier de Savoir — haut droite -->
      <div style="position:absolute;top:96px;right:180px;width:236px;height:354px;z-index:4;transform:rotate(11deg);
                  animation:mp-hd .8s cubic-bezier(.2,1.25,.4,1) .45s both, mp-float-hd 4.6s ease-in-out 1.5s infinite;">
        <div style="position:relative;width:100%;height:100%;border-radius:16px;overflow:hidden;
                    box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 48px rgba(74,144,226,.45);">
          <img src="${IMG}bouclier_de_savoir.png" alt="Bouclier de Savoir" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
      </div>

      <!-- CARD: Pression Mentale — bas gauche -->
      <div style="position:absolute;bottom:96px;left:180px;width:236px;height:354px;z-index:4;transform:rotate(9deg);
                  animation:mp-bg .8s cubic-bezier(.2,1.25,.4,1) .55s both, mp-float-bg 4.6s ease-in-out 1.7s infinite;">
        <div style="position:relative;width:100%;height:100%;border-radius:16px;overflow:hidden;
                    box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 48px rgba(232,90,58,.45);">
          <img src="${IMG}pression_mentale.png" alt="Pression Mentale" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
      </div>

      <!-- CARD: Indice Supplémentaire — bas droite -->
      <div style="position:absolute;bottom:96px;right:180px;width:236px;height:354px;z-index:4;transform:rotate(-9deg);
                  animation:mp-bd .8s cubic-bezier(.2,1.25,.4,1) .65s both, mp-float-bd 4.6s ease-in-out 1.9s infinite;">
        <div style="position:relative;width:100%;height:100%;border-radius:16px;overflow:hidden;
                    box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 48px rgba(155,89,182,.45);">
          <img src="${IMG}indice_supplementaire.png" alt="Indice Supplémentaire" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
      </div>

      <!-- TITLE -->
      <div style="position:absolute;top:46%;left:0;right:0;transform:translateY(-50%);text-align:center;z-index:3;
                  animation:mp-title .7s cubic-bezier(.2,.9,.3,1) .6s both;">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;color:#FFFFFF;line-height:.86;
                    letter-spacing:-.01em;animation:mp-glow 2.6s ease-in-out 1.2s infinite;">
          <div style="font-size:170px;">MODE</div>
          <div style="font-size:140px;color:#FFE500;letter-spacing:.05em;">POUVOIRS</div>
        </div>
        <div style="margin-top:34px;font-family:'Manrope',sans-serif;font-size:24px;font-weight:600;
                    letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55);">
          4 pouvoirs · 1 champion
        </div>
      </div>

      <!-- PROGRESS -->
      <div style="position:absolute;bottom:64px;left:50%;transform:translateX(-50%);width:520px;z-index:5;
                  animation:mp-fadein .5s ease .85s both;">
        <div style="font-family:'Manrope',sans-serif;font-size:16px;font-weight:700;letter-spacing:.18em;
                    text-transform:uppercase;color:rgba(255,255,255,.42);text-align:center;margin-bottom:16px;">
          Préparation en cours…
        </div>
        <div style="height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;">
          <div data-fill style="height:100%;width:0%;border-radius:3px;
                      background:linear-gradient(90deg,#FFE500,#FF6B00);
                      box-shadow:0 0 18px rgba(255,170,0,.6);animation:mp-fill 2.4s linear .85s both;"></div>
        </div>
      </div>

    </div>
  </div>

  <!-- ════ INTRO MOBILE NATIVE < 760px ════ -->
  <div id="intro-pv-mobile"
       style="display:none;position:fixed;inset:0;z-index:50;
              background:${POUVOIRS_COLORS.bg};flex-direction:column;
              align-items:center;justify-content:center;gap:28px;
              padding:24px;overflow:hidden;font-family:'Manrope',sans-serif;">

    <!-- Fond léger -->
    <div style="position:absolute;inset:0;z-index:0;pointer-events:none;
                background:radial-gradient(ellipse 90% 60% at 50% 60%,
                  rgba(107,47,217,.35) 0%,transparent 65%);"></div>

    <!-- Icône + titre -->
    <div id="intro-pv-m-title"
         style="position:relative;z-index:2;display:flex;flex-direction:column;
                align-items:center;gap:14px;opacity:0;
                animation:pvIntroMPop .7s cubic-bezier(.2,1,.4,1) .15s forwards;">
      <div style="font-size:clamp(48px,16vw,72px);line-height:1;color:#FFE500;
                  filter:drop-shadow(0 0 24px rgba(255,150,60,.6));"><i class="fa-solid fa-bolt"></i></div>
      <div style="font:900 clamp(30px,9vw,46px)/1.1 'Bricolage Grotesque','Manrope';
                  letter-spacing:.04em;color:#FFE500;text-align:center;
                  text-shadow:0 0 34px rgba(255,229,0,.4);
                  animation:pvIntroMGlow 2.2s ease-in-out .9s infinite;">
        MODE<br>POUVOIRS
      </div>
    </div>

    <!-- Barre de progression -->
    <div style="position:relative;z-index:2;width:min(220px,60vw);height:3px;
                border-radius:2px;background:rgba(255,255,255,.12);
                overflow:hidden;opacity:0;
                animation:pvIntroMFadeIn .4s ease .6s forwards;">
      <div style="height:100%;background:linear-gradient(90deg,#C8A84B,#FFE500);
                  animation:pvIntroMFill 3s linear .6s forwards;"></div>
    </div>
  </div>
</div>
`;

let _timerNav   = null;
let _stageClean = null;

export async function init() {
  forcerPleinEcranPouvoirs(POUVOIRS_COLORS.bg);
  _injecterFonts();
  _injecterKeyframes();

  // Écran transitoire (~4s, aucune interaction) : une détection unique
  // au chargement suffit, pas besoin de gérer le resize en direct.
  const isMobile = window.matchMedia(`(max-width:${PARIS_MOBILE_BREAKPOINT}px)`).matches;

  const stageEl  = document.getElementById('pouvoirs-stage');
  const mobileEl = document.getElementById('intro-pv-mobile');

  if (isMobile) {
    if (stageEl)  stageEl.style.display  = 'none';
    if (mobileEl) mobileEl.style.display = 'flex';
  } else {
    _genererParticules();
    if (stageEl)  _stageClean = attachParisStage(stageEl);
    if (mobileEl) mobileEl.style.display = 'none';
  }

  const skip = document.querySelector('[data-skip]');
  if (skip) {
    skip.addEventListener('pointerenter', () => { skip.style.color = 'rgba(255,255,255,.85)'; });
    skip.addEventListener('pointerleave', () => { skip.style.color = 'rgba(255,255,255,.4)'; });
    skip.addEventListener('click', () => {
      playBtn?.();
      clearTimeout(_timerNav);
      naviguer('regles-pouvoirs.html');
    });
  }

  const dureeNav = isMobile ? 3000 : 3550; // version mobile plus courte, moins de choré
  _timerNav = setTimeout(() => naviguer('regles-pouvoirs.html'), dureeNav);
}

function _genererParticules() {
  const zone = document.querySelector('[data-particles]');
  if (!zone) return;
  const cols = ['#FFE500', '#9B59B6', '#3DC87A', '#4A90E2', '#E85A3A', '#FFFFFF'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    const size = rnd(3, 6).toFixed(1);
    const color = cols[Math.floor(Math.random() * cols.length)];
    p.style.cssText = `
      position:absolute;left:${rnd(4, 96).toFixed(1)}%;top:${rnd(6, 90).toFixed(1)}%;
      width:${size}px;height:${size}px;border-radius:50%;background:${color};
      box-shadow:0 0 10px ${color};opacity:0;
      animation:mp-twinkle ${rnd(2.2, 4).toFixed(2)}s ease-in-out ${rnd(0.6, 3).toFixed(2)}s infinite;
    `;
    zone.appendChild(p);
  }
}

function _injecterFonts() {
  if (!document.getElementById('pouvoirs-fonts')) {
    const l = document.createElement('link');
    l.id = 'pouvoirs-fonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800&display=swap';
    document.head.appendChild(l);
  }
}

function _injecterKeyframes() {
  if (document.getElementById('pouvoirs-intro-kf')) return;
  const s = document.createElement('style');
  s.id = 'pouvoirs-intro-kf';
  s.textContent = `
    @keyframes mp-explosion{ 0%{ transform:translate(-50%,-50%) scale(0); opacity:0; } 55%{ transform:translate(-50%,-50%) scale(1.25); opacity:1; } 100%{ transform:translate(-50%,-50%) scale(1); opacity:.85; } }
    @keyframes mp-ring{ 0%{ transform:translate(-50%,-50%) scale(.2); opacity:0; } 30%{ opacity:.7; } 100%{ transform:translate(-50%,-50%) scale(2.3); opacity:0; } }
    @keyframes mp-rays{ from{ transform:translate(-50%,-50%) rotate(0deg); } to{ transform:translate(-50%,-50%) rotate(360deg); } }
    @keyframes mp-title{ 0%{ opacity:0; transform:translateY(40px) scale(.92); filter:blur(8px); } 100%{ opacity:1; transform:translateY(0) scale(1); filter:blur(0); } }
    @keyframes mp-glow{ 0%,100%{ text-shadow:0 0 60px rgba(255,229,0,.35),0 0 130px rgba(107,47,217,.32); } 50%{ text-shadow:0 0 90px rgba(255,229,0,.6),0 0 180px rgba(107,47,217,.5); } }
    @keyframes mp-hg{ 0%{ transform:rotate(-26deg) translate(-420px,-320px); opacity:0; } 100%{ transform:rotate(-11deg) translate(0,0); opacity:1; } }
    @keyframes mp-hd{ 0%{ transform:rotate(26deg) translate(420px,-320px); opacity:0; } 100%{ transform:rotate(11deg) translate(0,0); opacity:1; } }
    @keyframes mp-bg{ 0%{ transform:rotate(22deg) translate(-420px,320px); opacity:0; } 100%{ transform:rotate(9deg) translate(0,0); opacity:1; } }
    @keyframes mp-bd{ 0%{ transform:rotate(-22deg) translate(420px,320px); opacity:0; } 100%{ transform:rotate(-9deg) translate(0,0); opacity:1; } }
    @keyframes mp-float-hg{ 0%,100%{ transform:rotate(-11deg) translateY(0); } 50%{ transform:rotate(-12deg) translateY(-12px); } }
    @keyframes mp-float-hd{ 0%,100%{ transform:rotate(11deg) translateY(0); } 50%{ transform:rotate(12deg) translateY(-12px); } }
    @keyframes mp-float-bg{ 0%,100%{ transform:rotate(9deg) translateY(0); } 50%{ transform:rotate(10deg) translateY(-12px); } }
    @keyframes mp-float-bd{ 0%,100%{ transform:rotate(-9deg) translateY(0); } 50%{ transform:rotate(-10deg) translateY(-12px); } }
    @keyframes mp-twinkle{ 0%,100%{ opacity:0; transform:scale(.4); } 50%{ opacity:.9; transform:scale(1); } }
    @keyframes mp-fadein{ from{ opacity:0; } to{ opacity:1; } }
    @keyframes mp-fill{ from{ width:0%; } to{ width:100%; } }
    @keyframes mp-pageout{ 0%,72%{ opacity:1; } 100%{ opacity:0; } }
    @keyframes pvIntroMPop {
      0%   { opacity:0; transform:translateY(24px) scale(.9); }
      100% { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes pvIntroMGlow {
      0%,100% { text-shadow:0 0 34px rgba(255,229,0,.4); }
      50%     { text-shadow:0 0 54px rgba(255,229,0,.7); }
    }
    @keyframes pvIntroMFadeIn { to { opacity:1; } }
    @keyframes pvIntroMFill   { from { width:0%; } to { width:100%; } }
  `;
  document.head.appendChild(s);
}

export function cleanup() {
  clearTimeout(_timerNav);
  _timerNav = null;
  _stageClean?.();
  _stageClean = null;
  restaurerLayoutPouvoirs();
  document.getElementById('pouvoirs-intro-kf')?.remove();
}
