/* ════════════════════════════════════════════════
   APPLICATION SPA — Questions pour un Champion
   ════════════════════════════════════════════════ */

import { initTheme } from './theme.js';
import { definirConteneur, naviguer } from './routeur.js';
import {
  init          as initialiserAudio,
  bgPlay        as jouerMusique,
  bgStop        as arreterMusique,
  playBtn       as sonBouton,
  setBgEnabled  as activerMusiqueFond,
  setSfxEnabled as activerEffets,
  setBgVolume   as volumeMusique,
  setSfxVolume  as volumeEffets,
  isBgEnabled   as musiqueActive,
  isSfxEnabled  as effetsActifs,
} from './sound.js';

/* ── Écrans de jeu où la musique est coupée ── */
const ECRANS_JEU = new Set([
  'jeu-manche1',
  'jeu-manche2',
  'jeu-manche3',
  'course-contre-la-montre',
  'hote-quiz',
  'joueur-quiz',
  'jeu-multi',
  'jeu-paris',
  'jeu-pouvoirs',
]);

const conteneur = document.getElementById('application');
definirConteneur(conteneur);

initTheme({ aleatoire: true });

/* ── Synchronisation audio selon l'écran ── */
function synchroniserAudio(nomEcran, dureeMs = 600) {
  if (ECRANS_JEU.has(nomEcran)) arreterMusique(dureeMs);
  else jouerMusique(dureeMs);
}

let _ecranCourant = ecranInitial();

window.addEventListener('qpuc:ecran-change', (e) => {
  _ecranCourant = e.detail.ecran;
  synchroniserAudio(e.detail.ecran, 450);
});

// Reprendre la musique au retour depuis l'arrière-plan
window.addEventListener('qpuc:visibility-restore', () => {
  synchroniserAudio(_ecranCourant, 400);
});

/* ── Déverrouillage audio ── */
function deverrouillerAudio() {
  initialiserAudio();
  try { sessionStorage.setItem('qpuc_audio_debloque', '1'); } catch (e) {}
  const ecran = new URLSearchParams(location.search).get('ecran') || 'splash';
  const delai = ecran === 'splash' ? 1500 : 600;
  synchroniserAudio(ecran, delai);
}

['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
  window.addEventListener(evt, deverrouillerAudio, { once: true, passive: true });
});

/* ── Navigation initiale ── */
function ecranInitial() {
  const params = new URLSearchParams(location.search);
  const ecran = params.get('ecran');
  const code = params.get('code');

  if (ecran === 'rejoindre-salle' && code) {
    return 'rejoindre-salle';
  }
  if (ecran && typeof ecran === 'string') {
    return ecran;
  }
  return 'splash';
}

naviguer(ecranInitial(), { sansAnimation: true });

/* ── Interface publique globale (compatibilité) ── */
window.QPUCShell = {
  naviguer: (cible) => naviguer(cible),
  navigate: (cible) => naviguer(cible),
  unlockAudio: deverrouillerAudio,
  syncAudioFor: synchroniserAudio,
  playBtn: sonBouton,
  bgPlay: jouerMusique,
  bgStop: arreterMusique,
  setBgEnabled: activerMusiqueFond,
  setSfxEnabled: activerEffets,
  setBgVolume: volumeMusique,
  setSfxVolume: volumeEffets,
  isBgEnabled: musiqueActive,
  isSfxEnabled: effetsActifs,
};
