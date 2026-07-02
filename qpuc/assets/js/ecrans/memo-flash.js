/* ════════════════════════════════════════════════
   Écran : memo-flash
   Mini-jeu de patience entre les manches — Questions pour un Champion
   Purement cosmétique, aucun impact sur le score
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { playBtn } from '../audio-hooks.js';

export const titre = 'Patience — Mémo Flash';

// Durée totale d'affichage du mini-jeu (en ms)
const DUREE_TOTALE = 18000;

// Délai entre chaque forme de la séquence (en ms)
const DELAI_SEQUENCE = 700;

let _ecranSuivant = 'menu.html';
let _minuteurFin = null;
let _minuteurSequence = null;
let _enCours = false;
let _sequence = [];
let _saisieJoueur = [];
let _longueurActuelle = 3;

export const html = `
<div class="page page-memo-flash" id="page-memo-flash">
  <div class="memo-header">
    <div class="memo-titre">En attendant…</div>
    <div class="memo-sous-titre">Mémorise la séquence</div>
  </div>

  <div class="memo-compteur" id="memo-compteur">
    <span id="memo-streak">Série : 0</span>
  </div>

  <div class="memo-grille" id="memo-grille">
    <div class="memo-case" data-id="0" style="--couleur-case:#3DC87A"></div>
    <div class="memo-case" data-id="1" style="--couleur-case:#E85A3A"></div>
    <div class="memo-case" data-id="2" style="--couleur-case:#FFD100"></div>
    <div class="memo-case" data-id="3" style="--couleur-case:#9B8EC7"></div>
  </div>

  <div class="memo-statut" id="memo-statut">Regarde bien…</div>

  <div class="memo-barre-temps">
    <div class="memo-barre-temps__fill" id="memo-barre-fill"></div>
  </div>

  <button class="btn-secondary memo-passer" id="btn-passer-memo">
    Passer →
  </button>
</div>
`;

export function init(conteneur) {
  initTheme();

  // L'écran appelant définit la cible via sessionStorage avant de naviguer ici
  _ecranSuivant = sessionStorage.getItem('memo-ecran-suivant') || 'menu.html';
  sessionStorage.removeItem('memo-ecran-suivant');

  _longueurActuelle = 3;
  _enCours = true;

  conteneur.querySelector('#btn-passer-memo')?.addEventListener('click', () => {
    playBtn();
    terminerMiniJeu();
  });

  const barreFill = conteneur.querySelector('#memo-barre-fill');
  if (barreFill) {
    barreFill.style.transition = `width ${DUREE_TOTALE}ms linear`;
    requestAnimationFrame(() => { barreFill.style.width = '0%'; });
  }

  _minuteurFin = setTimeout(terminerMiniJeu, DUREE_TOTALE);

  setTimeout(() => demarrerNouvelleSequence(conteneur), 600);

  conteneur.querySelectorAll('.memo-case').forEach(case_ => {
    case_.addEventListener('click', () => onClicCase(conteneur, parseInt(case_.dataset.id, 10)));
  });
}

function demarrerNouvelleSequence(conteneur) {
  if (!_enCours) return;
  _saisieJoueur = [];
  _sequence = [];
  for (let i = 0; i < _longueurActuelle; i++) {
    _sequence.push(Math.floor(Math.random() * 4));
  }
  jouerSequence(conteneur);
}

function jouerSequence(conteneur) {
  const statut = conteneur.querySelector('#memo-statut');
  if (statut) statut.textContent = 'Regarde bien…';

  let index = 0;
  function etapeSuivante() {
    if (!_enCours) return;
    if (index > 0) allumerCase(conteneur, _sequence[index - 1], false);
    if (index >= _sequence.length) {
      if (statut) statut.textContent = 'À toi de jouer !';
      return;
    }
    allumerCase(conteneur, _sequence[index], true);
    index++;
    _minuteurSequence = setTimeout(etapeSuivante, DELAI_SEQUENCE);
  }
  etapeSuivante();
}

function allumerCase(conteneur, id, actif) {
  const case_ = conteneur.querySelector(`.memo-case[data-id="${id}"]`);
  if (case_) case_.classList.toggle('memo-case--actif', actif);
}

function onClicCase(conteneur, id) {
  if (!_enCours) return;
  const statut = conteneur.querySelector('#memo-statut');

  const case_ = conteneur.querySelector(`.memo-case[data-id="${id}"]`);
  if (case_) {
    case_.classList.add('memo-case--clic');
    setTimeout(() => case_.classList.remove('memo-case--clic'), 200);
  }

  _saisieJoueur.push(id);
  const indexActuel = _saisieJoueur.length - 1;

  if (_saisieJoueur[indexActuel] !== _sequence[indexActuel]) {
    if (statut) { statut.textContent = 'Oups !'; statut.style.color = 'var(--color-error)'; }
    _longueurActuelle = 3;
    const streak = conteneur.querySelector('#memo-streak');
    if (streak) streak.textContent = 'Série : 0';
    setTimeout(() => {
      if (statut) statut.style.color = '';
      demarrerNouvelleSequence(conteneur);
    }, 900);
    return;
  }

  if (_saisieJoueur.length === _sequence.length) {
    if (statut) { statut.textContent = 'Parfait !'; statut.style.color = 'var(--color-correct)'; }
    _longueurActuelle = Math.min(6, _longueurActuelle + 1);
    const streak = conteneur.querySelector('#memo-streak');
    if (streak) streak.textContent = `Série : ${_longueurActuelle - 2}`;
    setTimeout(() => {
      if (statut) statut.style.color = '';
      demarrerNouvelleSequence(conteneur);
    }, 800);
  }
}

function terminerMiniJeu() {
  if (!_enCours) return;
  _enCours = false;
  clearTimeout(_minuteurFin);
  clearTimeout(_minuteurSequence);
  naviguer(_ecranSuivant);
}

export function cleanup() {
  _enCours = false;
  clearTimeout(_minuteurFin);
  clearTimeout(_minuteurSequence);
}
