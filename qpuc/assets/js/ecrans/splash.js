/* ════════════════════════════════════════════════
   Écran : splash
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme, setTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { playBtn, unlockOnSplashCta } from '../audio-hooks.js';
import { bindThemeDots } from '../utils.js';

let _tTitle = null, _tSub = null, _tBtn = null, _observer = null;

export const titre = 'Quiz Champion';

export const html = `
<div class="page splash-page" id="page">
  <canvas id="bg-canvas"></canvas>
  <div class="theme-tag" id="theme-tag"></div>

  <!-- Sélecteur langue -->
  <div class="lang-sel" id="lang-sel">
    <div class="lang-opt active" data-i="0" data-onclick="switchLang(0)">
      <div class="lang-bar" id="bar-0"></div>
      <span class="lang-name" id="ln-0">FR</span>
    </div>
    <div class="lang-opt" data-i="1" data-onclick="switchLang(1)">
      <div class="lang-bar" id="bar-1"></div>
      <span class="lang-name" id="ln-1">EN</span>
    </div>
    <div class="lang-opt" data-i="2" data-onclick="switchLang(2)">
      <div class="lang-bar" id="bar-2"></div>
      <span class="lang-name" id="ln-2">دارجة</span>
    </div>
  </div>

  <!-- Contenu centré -->
  <div class="splash-center">
    <div class="splash-title-wrap">
      <div class="splash-title" id="title-el">Quiz Champion.</div>
    </div>
    <div class="splash-sep" id="sep"></div>
    <div class="splash-sub-wrap">
      <div class="splash-sub" id="sub-el">Le plus rapide gagne</div>
    </div>
    <button class="splash-btn" id="splash-btn" data-onclick="goToMenu()">
      <span id="btn-el">Prêt à jouer ?</span>
      <div class="btn-arrow" id="btn-arrow">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path id="arrow-p" d="M1.5 4H6.5M4 1.5L6.5 4L4 6.5" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>
        </svg>
      </div>
    </button>
    <div class="splash-dots">
      <div class="splash-dot on" id="dot-0"></div>
      <div class="splash-dot"    id="dot-1"></div>
      <div class="splash-dot"    id="dot-2"></div>
    </div>
  </div>

  <!-- Theme switcher -->
  <div class="theme-dots" style="bottom:16px">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9" title="Celadon" aria-label="Thème Celadon" data-onclick="relaunch('celadon')"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc" title="Beige" aria-label="Thème Beige" data-onclick="relaunch('beige')"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7" title="Violet" aria-label="Thème Violet" data-onclick="relaunch('violet')"></div>
  </div>
  </div>



`;

export async function init(conteneur) {
  cleanup();
  /* ── Conversion des événements inline ── */
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

  async function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    return new Promise((res, rej) => {
      const s = Object.assign(document.createElement('script'), { src, onload: res, onerror: rej });
      document.head.appendChild(s);
    });
  }
  // Rendre navigate accessible aux attributs onclick=""
  window.naviguer = naviguer;
  
  // Initialisation thème et points de couleur
  initTheme();
  bindThemeDots();
  
    await loadScript('../assets/js/vendor/typed.umd.js');
    await loadScript('../assets/js/vendor/three.min.js');
  
    const LANGS = [
      { title: 'Quiz Champion.', sub: 'Le plus rapide gagne',  btn: 'Prêt à jouer ?', dir: 'ltr' },
      { title: 'Quiz Champion.', sub: 'Fastest mind wins',     btn: 'Ready to play?',  dir: 'ltr' },
      { title: 'كويز البطل.', sub: 'الأسرع هو الرابح',       btn: 'جاهز تلعب ؟',    dir: 'rtl' },
    ];
  
    let cur = 0, typing = false;
    let tTitle = null, tSub = null, tBtn = null;
    _tTitle = null; _tSub = null; _tBtn = null;
  
    /* ── Navigation ── */
    window.goToMenu = () => {
      destroyAll();
      typing = false;
      unlockOnSplashCta();
      playBtn();
      naviguer('menu.html');
    };
  
    /* ── Typed ── */
    function destroyAll() {
      if (tTitle) { tTitle.destroy(); tTitle = null; }
      if (tSub)   { tSub.destroy();   tSub   = null; }
      if (tBtn)   { tBtn.destroy();   tBtn   = null; }
      document.getElementById('title-el').innerHTML = '';
      document.getElementById('sub-el').innerHTML   = '';
      document.getElementById('btn-el').innerHTML   = '';
    }
  
    function typeAll(idx) {
      if (typing) return;
      typing = true;
      destroyAll();
      const l = LANGS[idx];
      document.getElementById('btn-el').textContent = l.btn;
      document.getElementById('splash-btn').setAttribute('aria-label', l.btn);
  
      ['title-el', 'sub-el', 'btn-el'].forEach(id => {
        document.getElementById(id).style.direction = l.dir;
      });
  
      tTitle = new Typed('#title-el', {
        strings: [l.title], typeSpeed: 50, showCursor: true, cursorChar: '|',
        onComplete: () => {
          tSub = new Typed('#sub-el', {
            strings: [l.sub], typeSpeed: 36, showCursor: true, cursorChar: '|',
            onComplete: () => {
              tBtn = new Typed('#btn-el', {
                strings: [l.btn], typeSpeed: 42, showCursor: false,
                onComplete: () => { typing = false; }
              });
              _tBtn = tBtn;
            }
          });
          _tSub = tSub;
        }
      });
      _tTitle = tTitle;
    }
  
    /* ── Switch langue ── */
    window.switchLang = function(idx) {
      if (idx === cur || typing) return;
      cur = idx;
  
      document.querySelectorAll('.lang-opt').forEach(o => {
        const i = +o.dataset.i;
        o.classList.toggle('active', i === idx);
      });
      document.querySelectorAll('.splash-dot').forEach((d, i) => {
        d.classList.toggle('on', i === idx);
      });
  
      typeAll(idx);
    };
  
    /* ── Relancer avec un thème ── */
    window.relaunch = function(key) {
      if (key) setTheme(key);
      cur = 0; typing = false;
      document.querySelectorAll('.lang-opt').forEach((o, i) => o.classList.toggle('active', i === 0));
      document.querySelectorAll('.splash-dot').forEach((d, i) => d.classList.toggle('on', i === 0));
      typeAll(0);
    };
  
    /* ── Init ── */
    // Mise à jour du badge thème
    const tag = document.getElementById('theme-tag');
    const names = { celadon: 'Celadon', beige: 'Beige', violet: 'Violet' };
    function updateTag() {
      tag.textContent = names[document.documentElement.dataset.theme] || 'Celadon';
    }
    updateTag();
  
    // Observer les changements de thème
    const observer = new MutationObserver(() => { updateTag(); window.__splashBgRecolor && window.__splashBgRecolor(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    _observer = observer;
  
    typeAll(0);
  
    // Charger splash-bg.js après que THREE soit disponible
    await loadScript('../assets/js/splash-bg.js');
}

export function cleanup() {
  if (_tTitle) { try { _tTitle.destroy(); } catch(e) {} _tTitle = null; }
  if (_tSub)   { try { _tSub.destroy();   } catch(e) {} _tSub   = null; }
  if (_tBtn)   { try { _tBtn.destroy();   } catch(e) {} _tBtn   = null; }
  if (_observer) { _observer.disconnect(); _observer = null; }
}
