/**
 * countdown.js — Composant countdown 3→2→1→GO réutilisable
 * Questions pour un Champion
 *
 * Usage :
 *   import { startCountdown } from './countdown.js';
 *
 *   startCountdown({
 *     from: 3,
 *     onTick: (n) => console.log(n),
 *     onGo: () => navigate('./jeu.html'),
 *   });
 *
 *   // Ou avec un élément existant :
 *   startCountdown({ overlayEl: document.getElementById('cd'), ... });
 */

/**
 * Lance le countdown.
 * @param {object} opts
 * @param {number}   [opts.from=3]       - Chiffre de départ
 * @param {number}   [opts.tickDuration=1000] - Durée par tick (ms)
 * @param {Function} [opts.onTick]        - Appelé à chaque tick avec le chiffre courant
 * @param {Function} [opts.onGo]          - Appelé quand "GO" s'affiche (avant la transition)
 * @param {Function} [opts.onComplete]    - Appelé à la fin (après le GO)
 * @param {number}   [opts.goDuration=800]- Durée d'affichage du GO (ms)
 * @param {HTMLElement} [opts.overlayEl]  - Élément overlay existant (.countdown-overlay)
 * @param {HTMLElement} [opts.numEl]      - Élément chiffre existant (.countdown-overlay__num)
 * @returns {{ promise: Promise<void>, cancel: function }} Objet avec la promesse et une fonction d'annulation
 */
function startCountdown(opts = {}) {
  const {
    from          = 3,
    tickDuration  = 1000,
    onTick        = null,
    onGo          = null,
    onComplete    = null,
    goDuration    = 800,
    overlayEl     : extOverlay = null,
    numEl         : extNum     = null,
  } = opts;

  // Stocke tous les IDs de setTimeout pour permettre l'annulation
  const timeouts = [];
  const cancel = () => timeouts.forEach(id => clearTimeout(id));

  const promise = new Promise(resolve => {
    // Récupère ou crée les éléments
    const overlay = extOverlay || document.querySelector('.countdown-overlay');
    const numEl   = extNum     || (overlay && overlay.querySelector('.countdown-overlay__num'));
    const subEl   =               overlay && overlay.querySelector('.countdown-overlay__sub');

    if (!overlay || !numEl) {
      // Pas d'overlay dans la page, on appelle directement onGo + resolve
      if (onGo) onGo();
      if (onComplete) onComplete();
      resolve();
      return;
    }

    // Affiche l'overlay
    overlay.classList.add('countdown-overlay--visible');
    if (subEl) subEl.style.display = '';

    let n = from;

    function showNum(value, isGo = false) {
      numEl.textContent = isGo ? 'GO !' : value;
      numEl.classList.toggle('countdown-overlay__num--go', isGo);
      // Relance l'animation
      numEl.style.animation = 'none';
      void numEl.offsetWidth; // reflow
      numEl.style.animation = '';
    }

    function tick() {
      showNum(n);
      if (onTick) onTick(n);

      if (n <= 1) {
        // Dernier tick : affiche GO
        timeouts.push(setTimeout(() => {
          showNum(null, true);
          if (onGo) onGo();

          timeouts.push(setTimeout(() => {
            overlay.classList.remove('countdown-overlay--visible');
            if (onComplete) onComplete();
            resolve();
          }, goDuration));
        }, tickDuration));
        return;
      }

      n -= 1;
      timeouts.push(setTimeout(tick, tickDuration));
    }

    tick();
  });

  return { promise, cancel };
}

export { startCountdown };
