/* ════════════════════════════════════════════════
   Écran : mode-local
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { mergeState } from '../state.js';
import { bindThemeDots } from '../utils.js';

export const titre = 'Mode Local — CHAMPION.';

export const html = `
<div class="page mode-local-page" id="page">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <!-- Header -->
  <div class="page-header">
    <button class="back-btn" id="back-btn" aria-label="Retour">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Retour
    </button>
    <span class="page-title">Mode Local</span>
    <div class="largeur-48"></div>
  </div>

  <!-- Stepper -->
  <div class="stepper" id="stepper">
    <div class="stepper__col"><div class="stepper__dot stepper__dot--active" id="sd0">1</div><div class="stepper__label stepper__label--active" id="sl0">Mode</div></div>
    <div class="stepper__line" id="sline0"></div>
    <div class="stepper__col"><div class="stepper__dot" id="sd1">2</div><div class="stepper__label" id="sl1">Config</div></div>
    <div class="stepper__line" id="sline1"></div>
    <div class="stepper__col"><div class="stepper__dot" id="sd2">3</div><div class="stepper__label" id="sl2">Joueurs</div></div>
    <div class="stepper__line" id="sline2"></div>
    <div class="stepper__col"><div class="stepper__dot" id="sd3">4</div><div class="stepper__label" id="sl3">Lancer</div></div>
  </div>

  <div class="content" id="content">

    <!-- STEP 1 — MODE -->
    <div class="step-panel" id="step0">
      <div class="step-title">Quel mode ?</div>
      <div class="step-sub">Choisis comment tu veux jouer</div>
      <div class="mode-cards">
        <div class="mode-stack" id="ms-solo" data-onclick="selectMode('solo')" tabindex="0" role="button" aria-label="Mode Solo">
          <div class="stack__back"></div><div class="stack__mid"></div>
          <div class="stack__top">
            <div class="mode-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>
            <span class="mode-name">Solo</span>
            <span class="mode-desc">Contre la<br>montre</span>
          </div>
        </div>
        <div class="mode-stack" id="ms-duel" data-onclick="selectMode('duel')" tabindex="0" role="button" aria-label="Mode Duel">
          <div class="stack__back"></div><div class="stack__mid"></div>
          <div class="stack__top">
            <div class="mode-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c0-3 2.7-5 6-5"/><path d="M22 20c0-3-2.7-5-6-5"/><path d="M9 20c0-3 1.3-5 3-5s3 2 3 5"/></svg></div>
            <span class="mode-name">Duel</span>
            <span class="mode-desc">2 – 4 joueurs<br>même écran</span>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 2 — CONFIG -->
    <div class="step-panel hidden" id="step1">
      <div class="step-title">Configuration</div>
      <div class="cfg-card">
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
          <span class="cfg-label">Catégorie</span>
          <div class="cfg-opts cfg-opts--categories">
            <div class="cfg-opt selected" data-g="cat" data-v="Culture générale" data-onclick="selOpt(this,'cat')">Culture générale</div>
            <div class="cfg-opt" data-g="cat" data-v="Histoire et géographie" data-onclick="selOpt(this,'cat')">Histoire &amp; géo</div>
            <div class="cfg-opt" data-g="cat" data-v="Arts et médias" data-onclick="selOpt(this,'cat')">Arts &amp; médias</div>
            <div class="cfg-opt" data-g="cat" data-v="Sciences et nature" data-onclick="selOpt(this,'cat')">Sciences</div>
            <div class="cfg-opt" data-g="cat" data-v="Sport et loisirs" data-onclick="selOpt(this,'cat')">Sport</div>
            <div class="cfg-opt" data-g="cat" data-v="Monde et société" data-onclick="selOpt(this,'cat')">Monde</div>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 19h20L12 2z"/><path d="M12 9v4"/></svg></div>
          <span class="cfg-label">Difficulté</span>
          <div class="cfg-opts">
            <div class="cfg-opt" data-g="diff" data-v="Facile"   data-onclick="selOpt(this,'diff')">Facile</div>
            <div class="cfg-opt selected" data-g="diff" data-v="Moyen"    data-onclick="selOpt(this,'diff')">Moyen</div>
            <div class="cfg-opt" data-g="diff" data-v="Difficile" data-onclick="selOpt(this,'diff')">Difficile</div>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></div>
          <span class="cfg-label">Questions</span>
          <div class="cfg-opts">
            <div class="cfg-opt" data-g="nb" data-v="5"  data-onclick="selOpt(this,'nb')">5</div>
            <div class="cfg-opt selected" data-g="nb" data-v="10" data-onclick="selOpt(this,'nb')">10</div>
            <div class="cfg-opt" data-g="nb" data-v="15" data-onclick="selOpt(this,'nb')">15</div>
            <div class="cfg-opt" data-g="nb" data-v="20" data-onclick="selOpt(this,'nb')">20</div>
          </div>
        </div>
      </div>
      <div class="nav-btns">
        <button class="nav-btn-step" data-onclick="prevStep()">← Retour</button>
        <button class="nav-btn-step primary" data-onclick="nextStep()">Continuer →</button>
      </div>
    </div>

    <!-- STEP 3 — JOUEURS -->
    <div class="step-panel hidden" id="step2">
      <div class="step-title">Joueurs</div>
      <div id="nb-section" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:10px">
        <div class="step-sub">Combien de joueurs ?</div>
        <div class="nb-sel" id="nb-sel"></div>
      </div>
      <div id="pseudo-wrap" class="largeur-100"></div>
      <div class="nav-btns">
        <button class="nav-btn-step" data-onclick="prevStep()">← Retour</button>
        <button class="nav-btn-step primary" data-onclick="nextStep()">Continuer →</button>
      </div>
    </div>

    <!-- STEP 4 — LANCER -->
    <div class="step-panel hidden" id="step3">
      <div class="step-title">Prêt ?</div>
      <div class="launch-summary" id="summary"></div>
      <button class="btn-primary btn-full animation-pulse" id="launch-btn" data-onclick="launchGame()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Lancer la partie
      </button>
      <button class="nav-btn-step largeur-100" data-onclick="prevStep()">← Modifier</button>
    </div>

  </div>
  </div>



`;

export function init(conteneur) {
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

  // Rendre navigate accessible aux attributs onclick=""
  window.naviguer = naviguer;
  
  // Initialisation thème et points de couleur
  initTheme();
  bindThemeDots();
    const AVATAR_COLORS = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
    let curStep = 0, selMode = null, nbPlayers = 2;
    let cfg = { cat: 'Culture générale', diff: 'Moyen', nb: '10' };
    let pseudos = ['', '', '', ''];
    let avCI = [0, 1, 2, 3];
    let buzzKeys = ['A', 'Z', 'K', 'M'];
    let listeningKeyIndex = null;
  
    /* ── Stepper ── */
    function updateStepper() {
      for (let i = 0; i < 4; i++) {
        const d = document.getElementById('sd' + i);
        const l = document.getElementById('sl' + i);
        if (i < curStep) {
          d.className = 'stepper__dot stepper__dot--done';
          d.textContent = '✓'; d.style.fontSize = '11px';
        } else if (i === curStep) {
          d.className = 'stepper__dot stepper__dot--active';
          d.textContent = i + 1; d.style.fontSize = '10px';
        } else {
          d.className = 'stepper__dot';
          d.textContent = i + 1; d.style.fontSize = '10px';
        }
        l.className = 'stepper__label' + (i <= curStep ? ' stepper__label--active' : '');
        if (i < 3) {
          document.getElementById('sline' + i).className = 'stepper__line' + (i < curStep ? ' stepper__line--done' : '');
        }
      }
    }
  
    /* ── Navigation steps ── */
    function showStep(n) {
      for (let i = 0; i < 4; i++) {
        const p = document.getElementById('step' + i);
        p.classList.toggle('hidden', i !== n);
        if (i === n) { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; }
      }
      curStep = n;
      updateStepper();
      if (n === 2) { buildNbSel(); buildPseudos(); }
      if (n === 3) buildSummary();
      document.getElementById('content').scrollTop = 0;
    }
  
    window.nextStep = () => { if (curStep < 3) showStep(curStep + 1); };
    window.prevStep = () => { if (curStep > 0) showStep(curStep - 1); };
  
    /* ── Back button ── */
    document.getElementById('back-btn').addEventListener('click', () => {
      if (curStep === 0) naviguer('menu.html');
      else window.prevStep();
    });
  
    /* ── Sélection mode ── */
    window.selectMode = function(m) {
      if (selMode === m && curStep === 0) return;
      selMode = m;
      if (m === 'solo') nbPlayers = 1;
      else nbPlayers = 2;
      document.getElementById('ms-solo').classList.toggle('mode-stack--selected', m === 'solo');
      document.getElementById('ms-duel').classList.toggle('mode-stack--selected', m === 'duel');
      setTimeout(() => showStep(1), 220);
    };
  
    /* ── Config options ── */
    window.selOpt = function(el, grp) {
      cfg[grp] = el.dataset.v;
      document.querySelectorAll(`.cfg-opt[data-g="${grp}"]`).forEach(o => {
        o.classList.toggle('selected', o.dataset.v === el.dataset.v);
      });
    };
  
    /* ── Nb joueurs ── */
    function buildNbSel() {
      const sec = document.getElementById('nb-section');
      const sel = document.getElementById('nb-sel');
      sec.style.display = selMode === 'duel' ? 'flex' : 'none';
      if (selMode !== 'duel') return;
      sel.innerHTML = '';
      [2, 3, 4].forEach((n, i) => {
        const btn = document.createElement('div');
        btn.className = 'nb-btn' + (nbPlayers === n ? ' nb-btn--selected' : '');
        btn.style.animationDelay = (i * .08) + 's';
        btn.innerHTML = `<span class="nb-num">${n}</span><span class="nb-lbl">joueurs</span>
          <div class="nb-dots">${'<div class="nb-dot"></div>'.repeat(n)}</div>`;
        btn.onclick = () => { nbPlayers = n; buildNbSel(); buildPseudos(); };
        sel.appendChild(btn);
      });
    }
  
    /* ── Pseudos ── */
    function buildPseudos() {
      const wrap = document.getElementById('pseudo-wrap');
      if (!wrap) return;
      wrap.innerHTML = '';
      const count = selMode === 'duel' ? nbPlayers : 1;
      const labels = ['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4'];
      const grid = document.createElement('div');
      grid.className = 'pseudo-grid';
      if (count === 1) grid.style.gridTemplateColumns = '1fr';
      wrap.appendChild(grid);
  
      for (let i = 0; i < count; i++) {
        const blk = document.createElement('div');
        blk.className = 'pseudo-block';
        blk.style.animationDelay = (i * .06) + 's';
  
        const top = document.createElement('div'); top.className = 'pseudo-top';
        const av = document.createElement('div'); av.className = 'pseudo-av';
        av.style.background = AVATAR_COLORS[avCI[i] % AVATAR_COLORS.length];
        av.textContent = (pseudos[i] || labels[i])[0].toUpperCase();
        av.onclick = () => { avCI[i] = (avCI[i] + 1) % AVATAR_COLORS.length; av.style.background = AVATAR_COLORS[avCI[i] % AVATAR_COLORS.length]; };
  
        const lbl = document.createElement('div'); lbl.className = 'pseudo-lbl'; lbl.textContent = labels[i];
        top.appendChild(av); top.appendChild(lbl);
  
        const inp = document.createElement('input');
        inp.className = 'pseudo-input'; inp.placeholder = labels[i]; inp.value = pseudos[i];
        inp.oninput = () => { pseudos[i] = inp.value; av.textContent = (inp.value || labels[i])[0].toUpperCase(); };
  
        const keyRow = document.createElement('div');
        keyRow.className = 'buzz-key-row';
        const keyLabel = document.createElement('span');
        keyLabel.className = 'buzz-key-label';
        keyLabel.textContent = 'Buzzer clavier';
        const keyBtn = document.createElement('button');
        keyBtn.type = 'button';
        keyBtn.className = 'buzz-key-btn';
        keyBtn.dataset.playerIndex = String(i);
        keyBtn.textContent = buzzKeys[i];
        keyBtn.onclick = () => startKeyCapture(i);
        keyRow.appendChild(keyLabel);
        keyRow.appendChild(keyBtn);
  
        blk.appendChild(top);
        blk.appendChild(inp);
        if (selMode === 'duel') blk.appendChild(keyRow);
        grid.appendChild(blk);
      }
    }
  
    function normalizeBuzzKey(event) {
      if (!event.key || event.ctrlKey || event.altKey || event.metaKey) return '';
      if (event.key === ' ') return 'ESPACE';
      if (event.key === 'Escape') return 'ECHAP';
      if (event.key.length === 1) return event.key.toUpperCase();
      return event.key.toUpperCase().replace(/^ARROW/, 'FLECHE ');
    }
  
    function startKeyCapture(index) {
      listeningKeyIndex = index;
      document.querySelectorAll('.buzz-key-btn').forEach((btn, i) => {
        btn.classList.toggle('buzz-key-btn--listening', i === index);
        btn.textContent = i === index ? 'Appuie...' : buzzKeys[i];
      });
    }
  
    const keydownHandler = event => {
      if (listeningKeyIndex === null || curStep !== 2) return;
      const key = normalizeBuzzKey(event);
      if (!key) return;
      event.preventDefault();
      const duplicateIndex = buzzKeys.findIndex((value, i) => value === key && i !== listeningKeyIndex);
      if (duplicateIndex >= 0) {
        const btn = document.querySelector(`.buzz-key-btn[data-player-index="${listeningKeyIndex}"]`);
        if (btn) {
          btn.textContent = 'Prise';
          btn.classList.add('buzz-key-btn--error');
          setTimeout(() => {
            if (listeningKeyIndex !== null) startKeyCapture(listeningKeyIndex);
          }, 650);
        }
        return;
      }
      buzzKeys[listeningKeyIndex] = key;
      listeningKeyIndex = null;
      buildPseudos();
    };
    window.addEventListener('keydown', keydownHandler);
  
    /* ── Résumé ── */
    function buildSummary() {
      const count = selMode === 'duel' ? nbPlayers : 1;
      const ns = Array.from({ length: count }, (_, i) => pseudos[i] || `J${i + 1}`);
      const keys = Array.from({ length: count }, (_, i) => `${pseudos[i] || `J${i + 1}`}=${buzzKeys[i] || '-'}`);
      const rows = [
        ['Mode',       selMode === 'duel' ? `Duel — ${nbPlayers} joueurs` : 'Solo'],
        ['Joueur(s)', ns.join(' · ')],
        ...(selMode === 'duel' ? [['Touches', keys.join(' · ')]] : []),
        ['Catégorie', cfg.cat], ['Difficulté', cfg.diff], ['Questions', cfg.nb],
      ];
      const sum = document.getElementById('summary'); sum.innerHTML = '';
      rows.forEach((r, i) => {
        if (i > 0) { const d = document.createElement('div'); d.className = 'sum-div'; sum.appendChild(d); }
        const row = document.createElement('div'); row.className = 'sum-row';
        const k = document.createElement('span'); k.className = 'sum-key'; k.textContent = r[0];
        const v = document.createElement('span'); v.className = 'sum-val'; v.textContent = r[1];
        row.appendChild(k); row.appendChild(v); sum.appendChild(row);
      });
    }
  
    /* ── Lancer ── */
    window.launchGame = function() {
      const count = selMode === 'duel' ? nbPlayers : 1;
      const players = Array.from({ length: count }, (_, i) => ({
        id: i + 1, name: pseudos[i] || `Joueur ${i + 1}`, init: (pseudos[i] || `J${i + 1}`).slice(0, 2).toUpperCase(),
        colorIdx: avCI[i], score: 0, streak: 0, buzzKey: selMode === 'duel' ? (buzzKeys[i] || null) : null,
      }));
      mergeState({
        players,
        config: { mode: selMode, category: cfg.cat, difficulty: cfg.diff, nbQuestions: parseInt(cfg.nb) },
        manche: 1,
        qualified: [],
        eliminated: [],
        rounds: {},
        status: 'playing',
      });
      naviguer(selMode === 'solo' ? 'course-contre-la-montre.html' : 'intro-manche1.html');
    };
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
