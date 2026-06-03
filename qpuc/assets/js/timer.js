/**
 * timer.js — Timer circulaire SVG réutilisable
 * Questions pour un Champion
 *
 * Usage :
 *   import { createTimer } from './timer.js';
 *
 *   const timer = createTimer(document.getElementById('timer-wrap'), {
 *     duration: 20,
 *     urgentAt: 5,
 *     onTick: (remaining) => {},
 *     onEnd: () => {},
 *   });
 *
 *   timer.start();
 *   timer.pause();
 *   timer.stop();
 *   timer.reset();
 */

const CIRCUMFERENCE = 170; // 2 * π * r ≈ 170 pour r=27

/**
 * Crée un timer circulaire.
 * @param {HTMLElement} wrapEl - Conteneur .timer-ring
 * @param {object} opts
 * @param {number}   opts.duration  - Durée totale en secondes
 * @param {number}   [opts.urgentAt=5] - Passe en mode urgent sous ce nombre de secondes
 * @param {Function} [opts.onTick]  - Appelé chaque seconde avec le nombre restant
 * @param {Function} [opts.onEnd]   - Appelé quand le timer atteint 0
 * @returns {object} API { start, pause, stop, reset, getRemaining, destroy }
 */
function createTimer(wrapEl, opts = {}) {
  if (!wrapEl) {
    console.warn('[timer] Élément introuvable');
    return null;
  }

  const {
    duration  = 20,
    urgentAt  = 5,
    onTick    = null,
    onEnd     = null,
  } = opts;

  const ringEl    = wrapEl.querySelector('[data-timer-ring]')  || wrapEl.querySelector('circle:last-child');
  const valueEl   = wrapEl.querySelector('[data-timer-value]') || wrapEl.querySelector('.timer-ring__value');
  const progressEl = wrapEl.querySelector('[data-timer-progress]'); // barre optionnelle

  let remaining = duration;
  let currentDuration = duration;
  let intervalId = null;
  let _running  = false;

  // Résoudre les couleurs CSS une seule fois à l'initialisation
  // pour éviter de rappeler getComputedStyle à chaque tick de rendu
  const cs = getComputedStyle(document.documentElement);
  let _colorNormal = cs.getPropertyValue('--accent').trim()       || '#4A8090';
  let _colorUrgent = cs.getPropertyValue('--color-error').trim()  || '#E85A3A';

  /* ── Mise à jour visuelle ── */
  function _render(secs) {
    const fraction = secs / currentDuration;
    const urgent   = secs <= urgentAt;

    // Anneau SVG
    if (ringEl) {
      ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
      ringEl.setAttribute('stroke', urgent ? _colorUrgent : _colorNormal);
    }

    // Chiffre
    if (valueEl) {
      valueEl.textContent = secs;
      valueEl.classList.toggle('timer-ring--urgent', urgent);
      valueEl.style.color = urgent ? _colorUrgent : '';
    }

    // Barre de progression optionnelle (CSS transition)
    if (progressEl) {
      progressEl.style.background = urgent ? _colorUrgent : '';
    }
  }

  /* ── API ── */
  function start() {
    if (_running) return;
    _running = true;

    // Initialise la barre de progression CSS si présente
    if (progressEl) {
      progressEl.style.transition = 'none';
      progressEl.style.width = '100%';
      void progressEl.offsetWidth;
      progressEl.style.transition = `width ${remaining}s linear`;
      progressEl.style.width = '0%';
    }

    _render(remaining);

    intervalId = setInterval(() => {
      remaining -= 1;
      _render(remaining);
      if (onTick) onTick(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        _running = false;
        if (onEnd) onEnd();
      }
    }, 1000);
  }

  function pause() {
    clearInterval(intervalId);
    _running = false;
    // Fige la barre
    if (progressEl) {
      const computed = getComputedStyle(progressEl).width;
      progressEl.style.transition = 'none';
      progressEl.style.width = computed;
    }
  }

  function stop() {
    clearInterval(intervalId);
    _running   = false;
    remaining  = currentDuration;
    _render(currentDuration);
  }

  function reset(newDuration) {
    clearInterval(intervalId);
    _running = false;
    if (newDuration != null) {
      currentDuration = newDuration;
    }
    remaining = currentDuration;
    _render(remaining);
  }

  function getRemaining() { return remaining; }

  function destroy() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    _running   = false;
  }

  // Rendu initial
  _render(duration);

  return { start, pause, stop, reset, getRemaining, destroy };
}

export { createTimer, CIRCUMFERENCE };
