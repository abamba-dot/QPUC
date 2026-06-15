/* ════════════════════════════════════════════════
   Écran : menu
   Questions pour un champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots } from '../utils.js';

export const titre = 'Menu — CHAMPION.';

export const html = `
<div class="page menu-page" id="page">

  <div class="theme-tag" id="theme-tag">celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9" aria-label="Thème celadon"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc" aria-label="Thème Beige"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8El7" aria-label="Thème Violet"></div>
  </div>

  <!-- Header -->
  <div class="page-header">
    <button class="back-btn" data-onclick="navigate('splash.html')" aria-label="Retour au splash">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Retour
    </button>
    <span class="page-title">choisir un mode</span>
    <div class="largeur-48"></div>
  </div>

  <!-- cards scroll -->
  <div class="scroll-wrap" id="swrap">
    <div class="scroll-track" id="track">

      <!-- Mode Local -->
      <div class="stack" id="st0" data-onclick="navigate('mode-local.html')" tabindex="0" role="button" aria-label="Mode Local">
        <div class="stack__back" id="sb0"></div>
        <div class="stack__mid"  id="sm0"></div>
        <div class="stack__top"  id="st-top0" style="animation-delay:.05s">
          <div class="card-icon" id="li0">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20l0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <span class="card-name">Mode Local</span>
          <span class="card-desc">Solo · Duel<br>même écran</span>
        </div>
      </div>

      <!-- Multijoueur -->
      <div class="stack" id="st1" data-onclick="navigate('multijoueur.html')" tabindex="0" role="button" aria-label="Multijoueur">
        <div class="stack__back" id="sb1"></div>
        <div class="stack__mid"  id="sm1"></div>
        <div class="stack__top"  id="st-top1" style="animation-delay:.15s">
          <span class="badge badge--success" style="position:absolute;top:14px;right:14px;z-index:4">Live</span>
          <div class="card-icon" id="li1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="8" cy="9" r="3"/>
              <circle cx="16" cy="9" r="3"/>
              <path d="M2 20l0-3 2.7-5 6-5"/>
              <path d="M22 20l0-3-2.7-5-6-5"/>
              <path d="M9 20l0-3 1.3-5 3-5s3 2 3 5"/>
            </svg>
          </div>
          <span class="card-name">Multijoueur</span>
          <div class="card-live-badge">
            <div class="live-dot"></div>
            <span class="card-desc" class="opacite-1">2–8 joueurs</span>
          </div>
        </div>
      </div>

      <!-- classement -->
      <div class="stack" id="st2" data-onclick="navigate('classement.html')" tabindex="0" role="button" aria-label="classement">
        <div class="stack__back" id="sb2"></div>
        <div class="stack__mid"  id="sm2"></div>
        <div class="stack__top"  id="st-top2" style="animation-delay:.25s">
          <div class="card-icon" id="li2">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          </div>
          <span class="card-name">classement</span>
          <span class="card-desc">Top joueurs<br>du monde</span>
        </div>
      </div>

      <!-- Options -->
      <div class="stack" id="st3" data-onclick="navigate('settings.html')" tabindex="0" role="button" aria-label="Options">
        <div class="stack__back" id="sb3"></div>
        <div class="stack__mid"  id="sm3"></div>
        <div class="stack__top"  id="st-top3" style="animation-delay:.35s">
          <div class="card-icon" id="li3">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </div>
          <span class="card-name">Options</span>
          <span class="card-desc">Son · Langue<br>Difficulté</span>
        </div>
      </div>

    </div>
  </div>

  <!-- Nav -->
  <div class="nav-row">
    <button class="nav-btn" id="btn-prev" data-onclick="navTo(-1)" aria-label="Précédent">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="nav-hints">
      <div class="nav-hint on" id="nh0"></div>
      <div class="nav-hint"    id="nh1"></div>
      <div class="nav-hint"    id="nh2"></div>
      <div class="nav-hint"    id="nh3"></div>
    </div>
    <button class="nav-btn" id="btn-next" data-onclick="navTo(1)" aria-label="Suivant">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>

  </div>



`;

export function init(conteneur) {
  /* ── conversion des événements inline ── */
  conteneur.querySelectorAll('[data-onclick]').forEach(el => {
    const code = el.dataset.onclick;
    // Navigation simple
    const navMatch = code.match(/navigate\('([^']+)'\)/);
    if (navMatch) {
      el.addEventListener('click', () => {
        const cible = navMatch[1];
        import('../routeur.js').then(m => m.naviguer(cible));
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Fonction globale simple sans argument
    if (/^[a-zA-Z0-9_$]+\(\)$/.test(code)) {
      const fnName = code.replace('()', '');
      el.addEventListener('click', () => {
        if (typeof window[fnName] === 'function') window[fnName]();
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Fonction avec argument numérique
    const fnNumMatch = code.match(/^(\w+)\((\d+)\)$/);
    if (fnNumMatch) {
      const [, fnName, arg] = fnNumMatch;
      el.addEventListener('click', () => {
        if (typeof window[fnName] === 'function') window[fnName](Number(arg));
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Pattern: fonction(this, 'string') — ex: selOpt(this, 'cat')
    const fnThisStrMatch = code.match(/^(\w+)\(this,\s*'([^']+)'\)$/);
    if (fnThisStrMatch) {
      const [, fnName, strArg] = fnThisStrMatch;
      el.addEventListener('click', function() {
        if (typeof window[fnName] === 'function') window[fnName](this, strArg);
      });
      el.removeAttribute('data-onclick');
      return;
    }
    // Fallback : eval restreint (regular function pour conserver 'this' = élément)
    el.addEventListener('click', function() {
      // eslint-disable-next-line no-eval
      eval(code);
    });
    el.removeAttribute('data-onclick');
  });

  conteneur.querySelectorAll('[data-onchange]').forEach(el => {
    const code = el.dataset.onchange;
    el.addEventListener('change', () => eval(code));
    el.removeAttribute('data-onchange');
  });

  conteneur.querySelectorAll('[data-oninput]').forEach(el => {
    const code = el.dataset.oninput;
    el.addEventListener('input', () => eval(code));
    el.removeAttribute('data-oninput');
  });

  /* ══════════════════════════════════════
     Logique extraite de l'écran
  ══════════════════════════════════════ */

  // Rendre navigate accessible aux attributs onclick=""
  window.naviguer = naviguer;

  // Initialisation thème et points de couleur
  initTheme();
  bindThemeDots();
    /* ── Scroll avec inertie ── */
    const wrap  = document.getElementById('swrap');
    const track = document.getElementById('track');
    const cards = Array.from(track.querySelectorAll('.stack'));
    const N = cards.length;
    let posX = 0, velX = 0, pointerDown = false, lastPX = 0, lastPT = 0, animId = null, curIdx = 0;

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function getMax() {
      return Math.max(0, track.scrollWidth - wrap.clientWidth);
    }

    function centerTrackPadding() {
      const first = cards[0];
      if (!first) return;
      const pad = Math.max(0, (wrap.clientWidth - first.offsetWidth) / 2);
      track.style.paddingLeft = `${pad}px`;
      track.style.paddingRight = `${pad}px`;
    }

    function targetForIndex(idx) {
      const card = cards[clamp(idx, 0, N - 1)];
      if (!card) return 0;
      return clamp(card.offsetLeft + card.offsetWidth / 2 - wrap.clientWidth / 2, 0, getMax());
    }

    function indexFromPos(x) {
      let best = 0, bestDist = Infinity;
      cards.forEach((card, i) => {
        const target = targetForIndex(i);
        const dist = Math.abs(target - x);
        if (dist < bestDist) { best = i; bestDist = dist; }
      });
      return best;
    }

    function snap(x) {
      return targetForIndex(indexFromPos(x));
    }

    function updateHints(idx) {
      document.querySelectorAll('.nav-hint').forEach((h, i) => h.classList.toggle('on', i === idx));
      cards.forEach((card, i) => card.classList.toggle('stack--active', i === idx));
    }

    function springTo(dest) {
      cancelAnimationFrame(animId);
      const go = () => {
        const dx = dest - posX;
        posX += dx * .16;
        track.style.transform = `translateX(${-posX}px)`;
        curIdx = indexFromPos(posX);
        updateHints(curIdx);
        if (Math.abs(dx) > .4) animId = requestAnimationFrame(go);
        else { posX = dest; track.style.transform = `translateX(${-dest}px)`; }
      };
      animId = requestAnimationFrame(go);
    }

    function momentum() {
      cancelAnimationFrame(animId);
      const go = () => {
        velX *= .9;
        posX = clamp(posX + velX, 0, getMax());
        track.style.transform = `translateX(${-posX}px)`;
        curIdx = indexFromPos(posX);
        updateHints(curIdx);
        if (Math.abs(velX) > .5) animId = requestAnimationFrame(go);
        else springTo(snap(posX));
      };
      animId = requestAnimationFrame(go);
    }

    window.navTo = dir => springTo(targetForIndex(clamp(curIdx + dir, 0, N - 1)));

    wrap.addEventListener('mousedown', e => { cancelAnimationFrame(animId); pointerDown = true; lastPX = e.clientX; lastPT = performance.now(); velX = 0; });
    document.addEventListener('mouseup', () => { if (!pointerDown) return; pointerDown = false; momentum(); });
    document.addEventListener('mousemove', e => {
      if (!pointerDown) return;
      const now = performance.now(), dt = Math.max(1, now - lastPT), dx = lastPX - e.clientX;
      velX = dx / dt * 14; posX = clamp(posX + dx, 0, getMax());
      track.style.transform = `translateX(${-posX}px)`;
      lastPX = e.clientX; lastPT = now;
    });
    wrap.addEventListener('touchstart', e => { cancelAnimationFrame(animId); pointerDown = true; lastPX = e.touches[0].clientX; lastPT = performance.now(); velX = 0; }, { passive: true });
    wrap.addEventListener('touchend', () => { pointerDown = false; momentum(); }, { passive: true });
    wrap.addEventListener('touchmove', e => {
      if (!pointerDown) return;
      const now = performance.now(), dt = Math.max(1, now - lastPT), dx = lastPX - e.touches[0].clientX;
      velX = dx / dt * 14; posX = clamp(posX + dx, 0, getMax());
      track.style.transform = `translateX(${-posX}px)`;
      lastPX = e.touches[0].clientX; lastPT = now;
    }, { passive: true });
    wrap.addEventListener('wheel', e => { e.preventDefault(); cancelAnimationFrame(animId); velX += e.deltaX * .6 + e.deltaY * .3; momentum(); }, { passive: false });

    const resizeHandler = () => {
      centerTrackPadding();
      springTo(targetForIndex(curIdx));
    };
    window.addEventListener('resize', resizeHandler);

    centerTrackPadding();
    springTo(targetForIndex(0));

    // Clavier nav pour les cards
    cards.forEach((st, i) => {
      st.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') st.click(); });
    });
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
