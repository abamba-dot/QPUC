/* ════════════════════════════════════════════════════════════
   pouvoirs-fullscreen.js — Force le plein écran viewport
   Neutralise transform/filter/padding des ancêtres (#application,
   .page) qui piègent position:fixed dans une boîte plus petite
   que le viewport. Voir routeur.js : `.page` garde en permanence
   un `style.transform` inline (translateY) après les transitions,
   ce qui en fait un containing block pour tout descendant fixed.
════════════════════════════════════════════════════════════ */

const STYLE_ID = 'pouvoirs-fullscreen-style';

export function forcerPleinEcranPouvoirs(bg = '#0F0020') {
  document.body.classList.add('pouvoirs-fullscreen');

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
    body.pouvoirs-fullscreen {
      background: ${bg} !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Neutraliser tout ancêtre qui piègerait position:fixed
       (transform actif, padding, ou dimensions réduites) */
    body.pouvoirs-fullscreen #application,
    body.pouvoirs-fullscreen .app-shell,
    body.pouvoirs-fullscreen .page,
    body.pouvoirs-fullscreen .screen,
    body.pouvoirs-fullscreen > * {
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      transform: none !important;
      filter: none !important;
      perspective: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: hidden !important;
      background: ${bg} !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  `;
}

export function restaurerLayoutPouvoirs() {
  document.body.classList.remove('pouvoirs-fullscreen');
  document.getElementById(STYLE_ID)?.remove();
}
