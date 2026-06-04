/**
 * sound.js — Gestionnaire audio QPUC
 * - fond.mp3     : musique de fond en boucle (tout le parcours sauf jeu)
 * - button.ogg   : son de clic sur tous les boutons
 * - Effets Web Audio API : buzzer, correct, wrong, countdown
 */

function resolveAudioPath(file) {
  const base = document.querySelector('base')?.href || location.origin;
  return new URL('./assets/audio/' + file, base).href;
}

const AUDIO_FILES = {
  fond:   resolveAudioPath('fond.mp3'),
  button: resolveAudioPath('button.ogg'),
};

/* ── ÉTAT ── */
let _bgMusic     = null;
let _btnSound    = null;
let _sfxEnabled  = true;
let _bgEnabled   = true;
let _bgVolume    = 0.55;
let _sfxVolume   = 0.75;
let _AC          = null;
let _masterGain  = null;
let _initialized = false;
let _bgFadeTimer = null;
let _bgMode      = 'stopped';

/* ── INIT (appeler au premier geste utilisateur) ── */
function init() {
  if (_initialized) return;
  _initialized = true;

  // Contexte Web Audio pour les effets
  _AC = new (window.AudioContext || window.webkitAudioContext)();
  _masterGain = _AC.createGain();
  _masterGain.gain.value = _sfxVolume;
  _masterGain.connect(_AC.destination);

  // Précharger la musique de fond
  _bgMusic = new Audio(AUDIO_FILES.fond);
  _bgMusic.loop   = true;
  _bgMusic.volume = _bgVolume;
  _bgMusic.preload = 'auto';

  // Précharger le son bouton
  _btnSound = new Audio(AUDIO_FILES.button);
  _btnSound.volume = _sfxVolume;
  _btnSound.preload = 'auto';
}

function _getAC() {
  if (_AC && _AC.state === 'suspended') _AC.resume();
  return _AC;
}

/* ══════════════════════════════════════
   MUSIQUE DE FOND
══════════════════════════════════════ */

/**
 * Démarre la musique de fond avec fondu entrant.
 * @param {number} fadeMs - Durée du fondu en ms (défaut 1200)
 */
function bgPlay(fadeMs = 1200) {
  if (!_initialized) init();
  if (!_bgEnabled || !_bgMusic) return;
  if (_bgMode === 'playing' || _bgMode === 'fading-in') return;

  if (_bgFadeTimer) {
    clearInterval(_bgFadeTimer);
    _bgFadeTimer = null;
  }
  _bgMode = 'fading-in';
  _bgMusic.volume = 0;
  const _playResult = _bgMusic.play();
  if (_playResult) {
    _playResult.catch(() => {
      // Autoplay bloqué — remettre l'état à 'stopped' pour permettre
      // une nouvelle tentative lors du premier geste utilisateur
      clearInterval(_bgFadeTimer);
      _bgFadeTimer = null;
      _bgMode = 'stopped';
    });
  }

  const steps   = 30;
  const stepMs  = fadeMs / steps;
  const target  = _bgVolume;
  let step = 0;

  _bgFadeTimer = setInterval(() => {
    step++;
    _bgMusic.volume = Math.min(target, (target / steps) * step);
    if (step >= steps) {
      clearInterval(_bgFadeTimer);
      _bgFadeTimer = null;
      _bgMode = 'playing';
    }
  }, stepMs);
}

/**
 * Arrête la musique de fond avec fondu sortant.
 * @param {number} fadeMs - Durée du fondu en ms (défaut 800)
 */
function bgStop(fadeMs = 800) {
  if (!_bgMusic) return;
  if (_bgMode === 'stopped' || _bgMode === 'fading-out') return;

  if (_bgFadeTimer) {
    clearInterval(_bgFadeTimer);
    _bgFadeTimer = null;
  }
  _bgMode = 'fading-out';
  const startVol = _bgMusic.volume;
  const steps    = 20;
  const stepMs   = fadeMs / steps;
  let step = 0;

  _bgFadeTimer = setInterval(() => {
    step++;
    _bgMusic.volume = Math.max(0, startVol - (startVol / steps) * step);
    if (step >= steps) {
      clearInterval(_bgFadeTimer);
      _bgFadeTimer = null;
      _bgMusic.pause();
      _bgMusic.currentTime = 0;
      _bgMode = 'stopped';
    }
  }, stepMs);
}

/* ══════════════════════════════════════
   SON BOUTON
══════════════════════════════════════ */

/**
 * Joue le son de clic bouton.
 * Clone l'audio pour permettre la superposition rapide.
 */
function playBtn() {
  if (!_sfxEnabled || !_btnSound) return;
  const clone = _btnSound.cloneNode();
  clone.volume = _sfxVolume * 0.8;
  clone.play().catch(() => {});
}

/* ══════════════════════════════════════
   EFFETS WEB AUDIO API
══════════════════════════════════════ */

function _osc({ type='sine', freq=440, t, dur=0.2, gain=0.4, attack=0.005, sustain=0.5 }) {
  const ctx = _getAC();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(gain * sustain, t + attack + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(_masterGain);
  osc.start(t); osc.stop(t + dur + 0.05);
}

/** Buzzer principal (rouge 3D) */
function playBuzzer() {
  if (!_sfxEnabled || !_AC) return;
  const t = _AC.currentTime;
  _osc({ type:'square',   freq:160, t, dur:0.28, gain:0.5,  attack:0.002, sustain:0.7 });
  _osc({ type:'square',   freq:320, t, dur:0.18, gain:0.20, attack:0.002, sustain:0.5 });
  _osc({ type:'sawtooth', freq:180, t: t+0.02, dur:0.28, gain:0.15, attack:0.005, sustain:0.4 });
}

/** Bonne réponse */
function playCorrect() {
  if (!_sfxEnabled || !_AC) return;
  const t = _AC.currentTime;
  _osc({ type:'sine', freq:523, t,       dur:0.12, gain:0.4, sustain:0.8 });
  _osc({ type:'sine', freq:659, t:t+0.10, dur:0.14, gain:0.4, sustain:0.8 });
  _osc({ type:'sine', freq:784, t:t+0.22, dur:0.20, gain:0.45, sustain:0.7 });
}

/** Mauvaise réponse */
function playWrong() {
  if (!_sfxEnabled || !_AC) return;
  const t = _AC.currentTime;
  _osc({ type:'triangle', freq:280, t,       dur:0.18, gain:0.4, sustain:0.7 });
  _osc({ type:'triangle', freq:200, t:t+0.15, dur:0.22, gain:0.35, sustain:0.5 });
}

/** Countdown tick (3, 2, 1) */
function playCountdownTick() {
  if (!_sfxEnabled || !_AC) return;
  const t = _AC.currentTime;
  _osc({ type:'sine', freq:660, t, dur:0.10, gain:0.35, sustain:0.5 });
}

/** Countdown GO */
function playCountdownGo() {
  if (!_sfxEnabled || !_AC) return;
  const t = _AC.currentTime;
  _osc({ type:'square',   freq:220, t,       dur:0.30, gain:0.45, sustain:0.7 });
  _osc({ type:'sine',     freq:440, t,       dur:0.25, gain:0.22, sustain:0.6 });
  _osc({ type:'triangle', freq:330, t,       dur:0.22, gain:0.18, sustain:0.5 });
}

/** Qualification joueur */
function playQualify() {
  if (!_sfxEnabled || !_AC) return;
  const t = _AC.currentTime;
  [523, 659, 784, 1046].forEach((freq, i) => {
    _osc({ type:'sine', freq, t: t + i * 0.09, dur:0.15, gain:0.4, sustain:0.7 });
  });
}

/** Élimination joueur */
function playEliminate() {
  if (!_sfxEnabled || !_AC) return;
  const t = _AC.currentTime;
  [392, 330, 262, 196].forEach((freq, i) => {
    _osc({ type:'triangle', freq, t: t + i * 0.12, dur:0.18, gain:0.3, sustain:0.6 });
  });
}

/* ══════════════════════════════════════
   PARAMÈTRES
══════════════════════════════════════ */

function setBgEnabled(v)   { _bgEnabled = v;  if (!v) bgStop(400); else bgPlay(); }
function setSfxEnabled(v)  { _sfxEnabled = v; }
function setBgVolume(v)    { _bgVolume = v;   if (_bgMusic) _bgMusic.volume = v; }
function setSfxVolume(v)   { _sfxVolume = v;  if (_masterGain) _masterGain.gain.value = v; }
function isBgEnabled()     { return _bgEnabled; }
function isSfxEnabled()    { return _sfxEnabled; }

/* ══════════════════════════════════════
   EXPORT
══════════════════════════════════════ */

export {
  init,
  bgPlay, bgStop,
  playBtn, playBuzzer,
  playCorrect, playWrong,
  playCountdownTick, playCountdownGo,
  playQualify, playEliminate,
  setBgEnabled, setSfxEnabled,
  setBgVolume, setSfxVolume,
  isBgEnabled, isSfxEnabled,
};
