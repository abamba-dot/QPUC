/* ════════════════════════════════════════════════════════════
   paris-stage.js — Scale-to-fit pour les canvas 1920×1080 du Mode Paris
   Réutilisé par annonce-paris.js, jeu-paris.js, classement-paris.js
════════════════════════════════════════════════════════════ */

const STAGE_W = 1920;
const STAGE_H = 1080;
const MOBILE_BREAKPOINT = 760;

export function attachParisStage(stageEl) {
  if (!stageEl) return () => {};

  stageEl.style.width = STAGE_W + 'px';
  stageEl.style.height = STAGE_H + 'px';
  stageEl.style.transformOrigin = 'center center';
  stageEl.style.position = 'absolute';
  stageEl.style.left = '50%';
  stageEl.style.top = '50%';
  stageEl.style.willChange = 'transform';

  function applyScale() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / STAGE_W, vh / STAGE_H);

    stageEl.style.transform = `translate(-50%,-50%) scale(${scale})`;
    stageEl.dataset.parisStageMode = vw < MOBILE_BREAKPOINT ? 'mobile-fallback' : 'scaled';
  }

  applyScale();

  let resizeRaf = null;
  const onResize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(applyScale);
  };

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  return function cleanupStage() {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
  };
}

export function wrapParisStage(innerHtml) {
  return `
<div class="paris-stage-outer"
     style="width:100vw;height:100vh;position:fixed;inset:0;
            overflow:hidden;background:#0A0804;">
  ${innerHtml}
</div>
`;
}

export const PARIS_MOBILE_BREAKPOINT = MOBILE_BREAKPOINT;
