/**
 * theme.js — Gestion du thème global
 * Questions pour un Champion
 *
 * Usage :
 *   import { initTheme, setTheme, getCurrentTheme } from './theme.js';
 *   initTheme();  // à appeler au DOMContentLoaded
 */

const THEMES   = ['celadon', 'beige', 'violet'];
const NAMES    = { celadon: 'Celadon', beige: 'Beige', violet: 'Violet' };
/** Couleurs de la barre système (theme-color meta) */
const THEME_COLORS = { celadon: '#B4D3D9', beige: '#F2EAE0', violet: '#9B8EC7' };
const STORAGE_KEY = 'qpuc_theme';
let _callbacks = [];

/* ── Tirer un thème aléatoire ── */
function randomTheme() {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

/* ── Appliquer le thème sur <html> ── */
function _apply(key) {
  const html = document.documentElement;
  html.dataset.theme = key;

  // Met à jour le theme-color meta (barre système mobile)
  const metaThemeColor = document.getElementById('theme-color-meta');
  if (metaThemeColor) metaThemeColor.content = THEME_COLORS[key] || '#B4D3D9';

  // Met à jour l'étiquette si présente
  document.querySelectorAll('.theme-tag').forEach(el => {
    el.textContent = NAMES[key] || key;
  });

  // Met à jour les dots
  document.querySelectorAll('.theme-dot').forEach(dot => {
    const isActive = dot.dataset.themeKey === key;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Notifie les observateurs
  _callbacks.forEach(cb => cb(key));
}

/* ── API publique ── */

/**
 * Initialise le thème :
 * - Lit le localStorage (persistance entre pages)
 * - Sinon tire un thème aléatoire
 * - Branche les dots cliquables
 * @param {object} [opts]
 * @param {boolean} [opts.random=false] - Force un nouveau tirage même si localStorage a une valeur
 */
function initTheme(opts = {}) {
  // 1. URL ?theme=  (pour piloter les iframes depuis le canvas)
  let urlTheme = null;
  try {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('theme');
    if (t && THEMES.includes(t)) urlTheme = t;
  } catch (_) {}

  const stored = opts.random ? null : localStorage.getItem(STORAGE_KEY);
  const key    = urlTheme
    ? urlTheme
    : (stored && THEMES.includes(stored)) ? stored : randomTheme();
  _apply(key);

  // Permet à l'iframe parent de pousser un nouveau thème en live
  // Guard : n'enregistre le listener qu'une seule fois pour éviter
  // l'accumulation de handlers en cas d'appels multiples à initTheme()
  if (!window.__themeMessageListenerAdded) {
    window.addEventListener('message', (e) => {
      const data = e.data || {};
      if (data.type === 'set-theme' && THEMES.includes(data.theme)) {
        _apply(data.theme);
      }
      if (data.type === 'set-typography' && typeof data.display === 'string') {
        document.documentElement.style.setProperty('--font-display', data.display);
        document.documentElement.style.setProperty('--font-body',    data.body || data.display);
      }
    });
    window.__themeMessageListenerAdded = true;
  }

  // Branche les dots de la page courante
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => setTheme(dot.dataset.themeKey));
  });
}

/**
 * Change le thème et le persiste.
 * @param {string} key - 'celadon' | 'beige' | 'violet'
 */
function setTheme(key) {
  if (!THEMES.includes(key)) { console.warn(`[theme] Thème inconnu : ${key}`); return; }
  localStorage.setItem(STORAGE_KEY, key);
  _apply(key);
}

/**
 * Retourne le thème actuel.
 * @returns {string}
 */
function getCurrentTheme() {
  return document.documentElement.dataset.theme || 'celadon';
}

/**
 * Abonne une fonction au changement de thème.
 * @param {function} cb - Appelé avec la clé du nouveau thème
 * @returns {function} Fonction de désabonnement
 */
function onThemeChange(cb) {
  if (typeof cb !== 'function') return () => {};
  _callbacks.push(cb);
  return () => {
    _callbacks = _callbacks.filter(c => c !== cb);
  };
}

export { initTheme, setTheme, getCurrentTheme, onThemeChange, THEMES, NAMES };
