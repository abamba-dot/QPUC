import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { playBtn } from '../audio-hooks.js';

export const titre = 'Connexion — QPUC';

export const html = `
<div class="page page-connexion" id="page-connexion">
  <div class="cx-bg-orb cx-bg-orb--1"></div>
  <div class="cx-bg-orb cx-bg-orb--2"></div>
  <div class="cx-bg-orb cx-bg-orb--3"></div>

  <div class="cx-card" role="main">
    <div class="cx-brand">
      <div class="cx-brand__logo-wrap" aria-hidden="true">
        <img class="cx-brand__logo" src="./assets/img/logo.png" alt="">
      </div>
      <p class="cx-eyebrow">Le jeu des champions</p>
      <h1 class="cx-titre">Questions pour un Champion</h1>
      <p class="cx-sous">Solo · Local · Multijoueur</p>
    </div>

    <div class="cx-sep" aria-hidden="true"></div>

    <p class="cx-section-kicker">Connexion joueur</p>

    <div class="cx-form">

      <div class="cx-field">
        <label class="cx-label" for="input-pseudo">
          <svg class="cx-label__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Votre pseudo
        </label>
        <input
          class="cx-input"
          id="input-pseudo"
          type="text"
          placeholder="Ex : Fatima Z."
          maxlength="20"
          autocomplete="nickname"
          spellcheck="false"
        >
      </div>

      <div class="cx-field">
        <label class="cx-label" id="label-pin">
          <svg class="cx-label__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Code secret
        </label>
        <div class="cx-otp" id="cx-otp" role="group" aria-labelledby="label-pin">
          <input class="cx-otp__box" type="password" maxlength="1" autocomplete="off" data-lpignore="true" inputmode="text" spellcheck="false" aria-label="Caractère 1 sur 4">
          <input class="cx-otp__box" type="password" maxlength="1" autocomplete="off" data-lpignore="true" inputmode="text" spellcheck="false" aria-label="Caractère 2 sur 4">
          <input class="cx-otp__box" type="password" maxlength="1" autocomplete="off" data-lpignore="true" inputmode="text" spellcheck="false" aria-label="Caractère 3 sur 4">
          <input class="cx-otp__box" type="password" maxlength="1" autocomplete="off" data-lpignore="true" inputmode="text" spellcheck="false" aria-label="Caractère 4 sur 4">
        </div>
      </div>

      <div class="cx-hint" id="connexion-hint" role="alert" aria-live="polite"></div>

      <button class="cx-btn-primary" id="btn-jouer" disabled>
        <span id="btn-label">Entrer en jeu</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

  </div>
</div>
`;

export async function init() {
  initTheme();

  const inputPseudo = document.getElementById('input-pseudo');
  const otpBoxes    = Array.from(document.querySelectorAll('.cx-otp__box'));
  const btnJouer    = document.getElementById('btn-jouer');
  const hint        = document.getElementById('connexion-hint');

  function getPin() {
    return otpBoxes.map(b => b.value).join('');
  }

  function setFilled(box) {
    box.classList.toggle('cx-otp__box--filled', box.value.length > 0);
  }

  function valider() {
    const pseudoOk = inputPseudo.value.trim().length >= 2;
    const pinOk    = getPin().length === 4;
    btnJouer.disabled = !(pseudoOk && pinOk);
    if (hint.textContent && pseudoOk && pinOk) hint.textContent = '';
  }

  /* ── OTP navigation ── */
  otpBoxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      if (box.value.length > 1) box.value = box.value.slice(-1);
      setFilled(box);
      if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
      valider();
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        otpBoxes[i - 1].value = '';
        setFilled(otpBoxes[i - 1]);
        otpBoxes[i - 1].focus();
        valider();
      }
      if (e.key === 'Enter' && !btnJouer.disabled) connecter();
    });

    box.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').slice(0, 4);
      pasted.split('').forEach((ch, j) => {
        if (otpBoxes[j]) { otpBoxes[j].value = ch; setFilled(otpBoxes[j]); }
      });
      const next = otpBoxes.findIndex(b => !b.value);
      (otpBoxes[next === -1 ? 3 : next]).focus();
      valider();
    });

    box.addEventListener('focus', () => box.select());
  });

  inputPseudo.addEventListener('input', valider);
  inputPseudo.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !btnJouer.disabled) connecter();
  });

  btnJouer.addEventListener('click', connecter);

  setTimeout(() => inputPseudo.focus(), 300);
}

async function connecter() {
  const inputPseudo = document.getElementById('input-pseudo');
  const otpBoxes    = Array.from(document.querySelectorAll('.cx-otp__box'));
  const btnJouer    = document.getElementById('btn-jouer');
  const btnLabel    = document.getElementById('btn-label');
  const hint        = document.getElementById('connexion-hint');

  const pseudo = inputPseudo.value.trim();
  const pin    = otpBoxes.map(b => b.value).join('');

  if (pseudo.length < 2 || pin.length !== 4) return;

  btnJouer.disabled   = true;
  btnLabel.textContent = 'Connexion…';

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
    hint.textContent    = err.message || 'Impossible de se connecter. Réessaye.';
    btnJouer.disabled   = false;
    btnLabel.textContent = 'Entrer en jeu';
  }
}

export function cleanup() {}
