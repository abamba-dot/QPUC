import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { playBtn } from '../audio-hooks.js';

export const titre = 'Connexion — QPUC';

export const html = `
<div class="page page-connexion" id="page-connexion">
  <div class="page__radial"></div>

  <div class="connexion-contenu">
    <div class="connexion-logo">
      <div class="connexion-logo__titre">Questions</div>
      <div class="connexion-logo__sous">pour un Champion</div>
    </div>

    <div class="connexion-form">
      <label class="connexion-label" for="input-pseudo">Votre pseudo</label>
      <input
        class="connexion-input"
        id="input-pseudo"
        type="text"
        placeholder="Ex : Fatima Z."
        maxlength="20"
        autocomplete="nickname"
        spellcheck="false"
      >
      <label class="connexion-label" for="input-pin">Code secret</label>
      <input
        class="connexion-input"
        id="input-pin"
        type="password"
        placeholder="4 caractères minimum"
        minlength="4"
        maxlength="64"
        autocomplete="current-password"
        spellcheck="false"
      >
      <div class="connexion-hint" id="connexion-hint"></div>
      <button class="btn-primary connexion-btn" id="btn-jouer" disabled>
        Jouer →
      </button>
    </div>

    <button class="connexion-classement-lien" id="lien-classement" type="button">
      Voir le classement
    </button>
  </div>
</div>
`;

export async function init() {
  initTheme();

  const input = document.getElementById('input-pseudo');
  const inputPin = document.getElementById('input-pin');
  const btnJouer = document.getElementById('btn-jouer');
  const hint = document.getElementById('connexion-hint');

  function valider() {
    const pseudoOk = input.value.trim().length >= 2;
    const pinOk = inputPin.value.trim().length >= 4;
    const valide = pseudoOk && pinOk;
    btnJouer.disabled = !valide;
    hint.textContent = valide
      ? ''
      : !pseudoOk
        ? 'Pseudo : minimum 2 caractères'
        : 'Code secret : minimum 4 caractères';
  }

  input.addEventListener('input', valider);
  inputPin.addEventListener('input', valider);
  btnJouer.addEventListener('click', connecter);
  [input, inputPin].forEach(el => el.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !btnJouer.disabled) connecter();
  }));

  document.getElementById('lien-classement')?.addEventListener('click', () => {
    playBtn();
    naviguer('classement.html');
  });

  setTimeout(() => input.focus(), 300);
}

async function connecter() {
  const input = document.getElementById('input-pseudo');
  const inputPin = document.getElementById('input-pin');
  const btnJouer = document.getElementById('btn-jouer');
  const hint = document.getElementById('connexion-hint');
  const pseudo = input.value.trim();
  const pin = inputPin.value.trim();
  if (pseudo.length < 2 || pin.length < 4) return;

  btnJouer.disabled = true;
  btnJouer.textContent = 'Connexion…';

  try {
    const reponse = await fetch('/api/connexion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, pin }),
    });
    const data = await reponse.json();
    if (!reponse.ok) throw new Error(data.erreur || 'Connexion impossible');
    sessionStorage.setItem('qpuc-pseudo', data.pseudo || pseudo);
    sessionStorage.setItem('qpuc-stats', JSON.stringify(data.stats || {}));
    playBtn();
    naviguer('menu.html');
  } catch (err) {
    hint.textContent = err.message || 'Impossible de se connecter. Réessaye.';
    btnJouer.disabled = false;
    btnJouer.textContent = 'Jouer →';
  }
}

export function cleanup() {}
