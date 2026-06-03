/**
 * utils.js — Fonctions utilitaires partagées
 * Questions pour un Champion
 */

/**
 * Échappe les caractères spéciaux HTML pour prévenir les XSS.
 * @param {*} s
 * @returns {string}
 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Mélange un tableau (Fisher-Yates).
 * @param {Array} arr
 * @returns {Array} Nouveau tableau mélangé
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Attend N ms.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamp une valeur entre min et max.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Réduit un titre jusqu'à ce qu'il tienne dans son conteneur.
 * Utile pour les longues questions qui doivent rester dans leur carte.
 */
function fitTextToBox(el, options = {}) {
  if (!el) return;
  const container = options.container || el.parentElement;
  if (!container) return;

  const min = Number(options.min || 16);
  const computedSize = parseFloat(getComputedStyle(el).fontSize) || 48;
  if (!el.dataset.fitMax) el.dataset.fitMax = String(computedSize);
  const max = Number(options.max || el.dataset.fitMax || computedSize);
  const step = Number(options.step || 1);
  const padding = Number(options.padding || 10);

  el.style.fontSize = `${max}px`;
  el.style.overflowWrap = 'anywhere';
  el.style.wordBreak = 'normal';
  el.style.hyphens = 'auto';

  let size = max;
  const fits = () => {
    const er = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return (
      el.scrollWidth <= el.clientWidth + 1 &&
      er.left >= cr.left - 1 &&
      er.right <= cr.right + 1 &&
      er.top >= cr.top - 1 &&
      er.bottom <= cr.bottom - padding
    );
  };

  while (size > min && !fits()) {
    size -= step;
    el.style.fontSize = `${size}px`;
  }
}

/**
 * Génère les initiales d'un nom (ex: "Fatima Zahra" → "FZ").
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => (part[0] || '').toUpperCase())
    .filter(Boolean)
    .join('');
}

/**
 * Formate un score avec le suffixe "pts".
 * @param {number} score
 * @returns {string}
 */
function formatScore(score) {
  return `${score} pts`;
}

/**
 * Crée et injecte une animation de score flottant (+10).
 * @param {HTMLElement} anchorEl - Élément d'ancrage
 * @param {string} text - Texte à afficher (ex: '+10')
 * @param {string} [color] - Couleur du texte
 */
function spawnScoreFloat(anchorEl, text, color = '#3DC87A') {
  const page = document.querySelector('.page');
  if (!page || !anchorEl) return;

  const r  = anchorEl.getBoundingClientRect();
  const pr = page.getBoundingClientRect();

  const el = document.createElement('div');
  el.className = 'score-float';
  el.textContent = text;
  el.style.color = color;
  el.style.left  = `${r.right - pr.left - 20}px`;
  el.style.top   = `${r.top  - pr.top  - 4}px`;
  page.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

/**
 * Crée des particules de confetti autour d'un point.
 * @param {HTMLElement} anchorEl
 * @param {string} [color]
 */
function spawnParticles(anchorEl, color = '#3DC87A') {
  const page = document.querySelector('.page');
  if (!page || !anchorEl) return;

  const r  = anchorEl.getBoundingClientRect();
  const pr = page.getBoundingClientRect();
  const cx = r.left - pr.left + r.width  / 2;
  const cy = r.top  - pr.top  + r.height / 2;

  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = i * (Math.PI * 2 / 8);
    const dist  = 35 + Math.random() * 18;
    p.style.cssText = [
      `position:absolute`,
      `width:6px`,
      `height:6px`,
      `border-radius:50%`,
      `background:${color}`,
      `pointer-events:none`,
      `z-index:10`,
      `left:${cx}px`,
      `top:${cy}px`,
      `--px:${Math.cos(angle) * dist}px`,
      `--py:${Math.sin(angle) * dist}px`,
      `animation:particle .7s ease-out ${i * .04}s forwards`,
    ].join(';');
    page.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

/**
 * Génère les confettis du podium dans .confetti-container.
 */
function spawnConfetti() {
  const container = document.querySelector('.confetti-container');
  if (!container) return;

  // Vide le conteneur pour éviter l'accumulation de nœuds DOM
  container.innerHTML = '';

  const colors = ['#B4D3D9', '#F2EAE0', '#9B8EC7', '#3DC87A', '#FFD100', '#FF9060'];
  for (let i = 0; i < 34; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.left              = `${Math.random() * 100}%`;
    c.style.background        = colors[i % colors.length];
    c.style.animationDuration = `${3.2 + Math.random() * 2.4}s`;
    c.style.animationDelay    = `${Math.random() * 2.2}s`;
    c.style.transform         = `rotate(${Math.random() * 90}deg)`;
    container.appendChild(c);
  }

  // Cleanup après la durée maximale d'animation pour libérer les nœuds DOM
  const maxMs = (3.2 + 2.4 + 2.2) * 1000 + 200;
  setTimeout(() => { if (container) container.innerHTML = ''; }, maxMs);
}

/**
 * Enregistre les handlers sur tous les .theme-dot de la page.
 * (Appeler après DOMContentLoaded si theme.js n'est pas encore chargé)
 */
function bindThemeDots() {
  document.querySelectorAll('.theme-dot[data-theme-key]').forEach(dot => {
    dot.addEventListener('click', () => {
      const key = dot.dataset.themeKey;
      document.documentElement.dataset.theme = key;
      localStorage.setItem('qpuc_theme', key);
      document.querySelectorAll('.theme-tag').forEach(el => {
        el.textContent = { celadon: 'Celadon', beige: 'Beige', violet: 'Violet' }[key] || key;
      });
      document.querySelectorAll('.theme-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.themeKey === key);
        d.setAttribute('aria-selected', d.dataset.themeKey === key ? 'true' : 'false');
      });
    });
  });
}

export { esc, shuffle, sleep, clamp, fitTextToBox, getInitials, formatScore, spawnScoreFloat, spawnParticles, spawnConfetti, bindThemeDots };
