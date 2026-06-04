/**
 * audio-hooks.js — Branchement audio global QPUC.
 * Si l'app tourne dans index.html, le son de fond reste dans la page parente.
 */

import {
  init as localInit,
  bgPlay as localBgPlay,
  bgStop as localBgStop,
  playBtn as localPlayBtn,
  setBgEnabled as localSetBgEnabled,
  setSfxEnabled as localSetSfxEnabled,
  setBgVolume as localSetBgVolume,
  setSfxVolume as localSetSfxVolume,
  isBgEnabled as localIsBgEnabled,
  isSfxEnabled as localIsSfxEnabled,
} from './sound.js';

const SETTINGS_KEY = 'qpuc_audio_settings';
const UNLOCK_KEY = 'qpuc_audio_unlocked';
const GAME_SCREENS = new Set([
  'jeu-manche1.html',
  'jeu-manche2.html',
  'jeu-manche3.html',
  'course-contre-la-montre.html',
  'hote-quiz.html',
  'joueur-quiz.html',
]);

function shell() {
  return window.parent && window.parent !== window ? window.parent.QPUCShell : null;
}

function init() {
  localInit();
  shell()?.unlockAudio(location.pathname);
}
function bgPlay(fadeMs = 1200) { shell()?.bgPlay(fadeMs) ?? localBgPlay(fadeMs); }
function bgStop(fadeMs = 800) { shell()?.bgStop(fadeMs) ?? localBgStop(fadeMs); }
function playBtn() { shell()?.playBtn() ?? localPlayBtn(); }
function setBgEnabled(v) {
  if (shell()) shell().setBgEnabled(v);
  else localSetBgEnabled(v);
}
function setSfxEnabled(v) { localSetSfxEnabled(v); shell()?.setSfxEnabled(v); }
function setBgVolume(v) {
  if (shell()) shell().setBgVolume(v);
  else localSetBgVolume(v);
}
function setSfxVolume(v) { localSetSfxVolume(v); shell()?.setSfxVolume(v); }
function isBgEnabled() { return shell()?.isBgEnabled() ?? localIsBgEnabled(); }
function isSfxEnabled() { return shell()?.isSfxEnabled() ?? localIsSfxEnabled(); }

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveSettings(partial = {}) {
  const next = { bg: true, sfx: true, volume: 0.75, ...readSettings(), ...partial };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) {}
  return next;
}

function applySettings() {
  const settings = { bg: true, sfx: true, volume: 0.75, ...readSettings() };
  setBgVolume(settings.volume * 0.55);
  setSfxVolume(settings.volume * 0.75);
  setBgEnabled(settings.bg);
  setSfxEnabled(settings.sfx);
  return settings;
}

function currentScreen() {
  return location.pathname.split('/').pop() || 'splash.html';
}

function syncScreenAudio(fadeMs = 600) {
  const current = currentScreen();
  if (shell()) {
    shell().syncAudioFor(location.pathname, fadeMs);
    return;
  }
  if (GAME_SCREENS.has(current)) localBgStop(fadeMs);
  else localBgPlay(fadeMs);
}

function unlockAudio() {
  init();
  try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
  applySettings();
  syncScreenAudio(currentScreen() === 'splash.html' ? 1500 : 600);
}

// Appelé par splash.js au clic du bouton CTA — démarre la musique sans délai
function unlockOnSplashCta() {
  init();
  try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
  applySettings();
  bgPlay(800);
}

['pointerdown', 'keydown', 'touchstart', 'click', 'touchend'].forEach(eventName => {
  document.addEventListener(eventName, unlockAudio, { once: true, passive: true });
});

// Reprendre la musique au retour de l'app (fond d'écran → avant-plan)
// En mode SPA, QPUCShell.syncAudioFor gère le routage correct ; sinon lecture directe
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (window.QPUCShell) {
      // Déclenche la synchronisation avec le bon écran (géré par application.js)
      window.dispatchEvent(new CustomEvent('qpuc:visibility-restore'));
    } else {
      bgPlay(400);
    }
  }
});

try {
  if (sessionStorage.getItem(UNLOCK_KEY) === '1') {
    setTimeout(() => unlockAudio(), 80);
  }
} catch (e) {}

// Tentative de démarrage automatique (certains navigateurs l'autorisent)
// Ne s'exécute qu'une fois au chargement initial du module
function _tenterAutoplay() {
  // En SPA, écran initial = param URL (avant toute navigation)
  const ecranInitial = new URLSearchParams(location.search).get('ecran') || 'splash';
  const JEUX_SPA = new Set(['jeu-manche1', 'jeu-manche2', 'jeu-manche3', 'course-contre-la-montre', 'hote-quiz', 'joueur-quiz', 'jeu-multi']);
  if (JEUX_SPA.has(ecranInitial)) return;
  localInit();
  localBgPlay(800);
}
setTimeout(_tenterAutoplay, 120);

document.addEventListener('click', event => {
  const target = event.target.closest('button, [role="button"], a, .stack, .cfg-opt, .theme-dot, .lang-opt, .reaction-btn, .mode-stack, .np-btn, .ios-row, .lang-row');
  if (!target) return;
  const isBuzzer = target.closest('.buzzer') || target.id === 'buzzer';
  if (!isBuzzer) playBtn();
}, true);

window.QPUCAudio = {
  init,
  bgPlay,
  bgStop,
  playBtn,
  setBgEnabled,
  setSfxEnabled,
  setBgVolume,
  setSfxVolume,
  isBgEnabled,
  isSfxEnabled,
  readSettings,
  saveSettings,
  applySettings,
  syncScreenAudio,
};

export {
  init,
  bgPlay,
  bgStop,
  playBtn,
  setBgEnabled,
  setSfxEnabled,
  setBgVolume,
  setSfxVolume,
  isBgEnabled,
  isSfxEnabled,
  readSettings,
  saveSettings,
  applySettings,
  syncScreenAudio,
  unlockOnSplashCta,
};
