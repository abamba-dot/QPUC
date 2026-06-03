/* ════════════════════════════════════════════════
   Écran : settings
   Questions pour un Champion — Module d'écran
   ════════════════════════════════════════════════ */

import { initTheme, setTheme } from '../theme.js';
import { naviguer } from '../routeur.js';
import { bindThemeDots } from '../utils.js';
import {
  applySettings,
  saveSettings,
  readSettings,
  setBgEnabled,
  setSfxEnabled,
  setBgVolume,
  setSfxVolume,
  bgPlay,
  playBtn,
} from '../audio-hooks.js';

export const titre = 'Paramètres — CHAMPION.';

export const html = `
<div class="page" id="page">
  <div class="theme-tag" id="theme-tag">Celadon</div>
  <div class="theme-dots">
    <div class="theme-dot active" data-theme-key="celadon" style="background:#B4D3D9"></div>
    <div class="theme-dot" data-theme-key="beige" style="background:#F2EAE0;border-color:#ccc"></div>
    <div class="theme-dot" data-theme-key="violet" style="background:#9B8EC7"></div>
  </div>

  <!-- Header -->
  <div class="page-header">
    <button class="back-btn" data-onclick="navigate('menu.html')" aria-label="Retour au menu">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      Retour
    </button>
    <span class="page-title">Paramètres</span>
    <div class="largeur-48"></div>
  </div>

  <div class="settings-scroll">

    <!-- Son & Musique -->
    <div>
      <div class="settings-section-label">Son &amp; Musique</div>
      <div class="settings-card">
        <div class="settings-row" data-onclick="toggleSetting('musique')">
          <div class="settings-row__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
            </svg>
          </div>
          <div class="settings-row__body">
            <div class="settings-row__title">Musique de fond</div>
            <div class="settings-row__sub">Ambiance pendant les manches</div>
          </div>
          <button class="toggle toggle--on" id="tog-musique" aria-label="Toggle musique">
            <div class="toggle__thumb"></div>
          </button>
        </div>
        <div class="settings-row" data-onclick="toggleSetting('sfx')">
          <div class="settings-row__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
            </svg>
          </div>
          <div class="settings-row__body">
            <div class="settings-row__title">Effets sonores</div>
            <div class="settings-row__sub">Buzzer, bonne réponse, erreur</div>
          </div>
          <button class="toggle toggle--on" id="tog-sfx" aria-label="Toggle effets sonores">
            <div class="toggle__thumb"></div>
          </button>
        </div>
        <!-- Volume slider -->
        <div class="sl-row">
          <div class="sl-top">
            <span class="sl-label">Volume</span>
            <span class="sl-val" id="vol-val">75%</span>
          </div>
          <div class="slider-track" id="vol-track" data-onclick="slideVolume(event)">
            <div class="slider-fill" id="vol-fill" style="width:75%"></div>
            <div class="slider-thumb" id="vol-thumb" style="left:75%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Affichage -->
    <div>
      <div class="settings-section-label">Affichage</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            </svg>
          </div>
          <div class="settings-row__body">
            <div class="settings-row__title">Thème visuel</div>
            <div class="settings-row__sub">Changer la palette de couleurs</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <div style="width:18px;height:18px;border-radius:50%;background:#B4D3D9;border:2px solid transparent;cursor:pointer" data-onclick="applyTheme('celadon')" title="Celadon"></div>
            <div style="width:18px;height:18px;border-radius:50%;background:#F2EAE0;border:2px solid #ccc;cursor:pointer" data-onclick="applyTheme('beige')" title="Beige"></div>
            <div style="width:18px;height:18px;border-radius:50%;background:#9B8EC7;border:2px solid transparent;cursor:pointer" data-onclick="applyTheme('violet')" title="Violet"></div>
          </div>
        </div>
        <div class="settings-row" data-onclick="toggleSetting('animations')">
          <div class="settings-row__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div class="settings-row__body">
            <div class="settings-row__title">Animations</div>
            <div class="settings-row__sub">Transitions et effets visuels</div>
          </div>
          <button class="toggle toggle--on" id="tog-animations">
            <div class="toggle__thumb"></div>
          </button>
        </div>
      </div>
    </div>

    <!-- Partie -->
    <div>
      <div class="settings-section-label">Partie par défaut</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="settings-row__body">
            <div class="settings-row__title">Durée par question</div>
            <div class="settings-row__sub">Secondes avant timeout</div>
          </div>
          <div style="display:flex;gap:5px">
            <div class="badge badge--glass curseur-pointeur" data-onclick="setTimer(this,'15')">15s</div>
            <div class="badge badge--glass curseur-pointeur" data-onclick="setTimer(this,'20')">20s</div>
            <div class="badge badge--glass curseur-pointeur" data-onclick="setTimer(this,'30')">30s</div>
          </div>
        </div>
        <div class="settings-row" data-onclick="toggleSetting('shuffle')">
          <div class="settings-row__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
              <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
            </svg>
          </div>
          <div class="settings-row__body">
            <div class="settings-row__title">Questions aléatoires</div>
            <div class="settings-row__sub">Ordre différent à chaque partie</div>
          </div>
          <button class="toggle toggle--on" id="tog-shuffle">
            <div class="toggle__thumb"></div>
          </button>
        </div>
      </div>
    </div>

    <!-- À propos -->
    <div>
      <div class="settings-section-label">À propos</div>
      <div class="settings-card">
        <div class="settings-row">
          <div class="settings-row__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="settings-row__body">
            <div class="settings-row__title">Version</div>
            <div class="settings-row__sub">CHAMPION.</div>
          </div>
          <span class="badge badge--glass">v1.0</span>
        </div>
      </div>
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
  
    window.applyTheme = setTheme;
    const audioSettings = applySettings();
    syncAudioControls(audioSettings);
  
    function syncAudioControls(settings = readSettings()) {
      const withDefaults = { sfx: true, bg: true, volume: 0.75, ...settings };
      setToggleVisual('musique', withDefaults.bg);
      setToggleVisual('sfx', withDefaults.sfx);
      setVolumeVisual(withDefaults.volume);
    }
  
    function setToggleVisual(id, enabled) {
      const tog = document.getElementById('tog-' + id);
      if (!tog) return;
      tog.classList.toggle('toggle--on', enabled);
      tog.classList.toggle('toggle--off', !enabled);
    }
  
    function setVolumeVisual(volume) {
      const val = Math.round(Math.max(0, Math.min(1, volume)) * 100);
      document.getElementById('vol-fill').style.width = val + '%';
      document.getElementById('vol-thumb').style.left = val + '%';
      document.getElementById('vol-val').textContent = val + '%';
    }
  
    /* ── Toggles ── */
    window.toggleSetting = function(id) {
      const tog = document.getElementById('tog-' + id);
      if (!tog) return;
      const isOn = tog.classList.contains('toggle--on');
      const enabled = !isOn;
      setToggleVisual(id, enabled);
  
      if (id === 'sfx') {
        setSfxEnabled(enabled);
        saveSettings({ sfx: enabled });
        if (enabled) playBtn();
      }
      if (id === 'musique') {
        setBgEnabled(enabled);
        saveSettings({ bg: enabled });
        if (enabled) bgPlay(500);
      }
    };
  
    /* ── Volume slider ── */
    window.slideVolume = function(e) {
      updateVolumeFromPointer(e, true);
    };
  
    function updateVolumeFromPointer(e, audition = false) {
      const track = document.getElementById('vol-track');
      const rect  = track.getBoundingClientRect();
      const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setVolumeVisual(pct);
      setBgVolume(pct * 0.55);
      setSfxVolume(pct * 0.75);
      saveSettings({ volume: pct });
      if (audition) playBtn();
    }
  
    const volumeTrack = document.getElementById('vol-track');
    const volumeRow = volumeTrack.closest('.sl-row');
    volumeTrack.addEventListener('pointerdown', event => {
      volumeTrack.setPointerCapture?.(event.pointerId);
      updateVolumeFromPointer(event, true);
    });
    volumeTrack.addEventListener('pointermove', event => {
      if (event.buttons !== 1) return;
      updateVolumeFromPointer(event);
    });
    volumeRow?.addEventListener('pointerdown', event => {
      if (event.target.closest('#vol-track')) return;
      updateVolumeFromPointer(event, true);
    });
    volumeRow?.addEventListener('pointermove', event => {
      if (event.buttons !== 1) return;
      updateVolumeFromPointer(event);
    });
  
    /* ── Durée timer ── */
    window.setTimer = function(el, secs) {
      document.querySelectorAll('[data-onclick^="setTimer"]').forEach(b => {
        b.className = 'badge badge--glass curseur-pointeur';
      });
      el.className = 'badge badge--success curseur-pointeur';
      try { localStorage.setItem('champ_timer_duration', String(secs)); } catch(e) {}
    };

    // Appliquer visuellement le timer sauvegardé au chargement
    (function initTimerBadges() {
      const saved = localStorage.getItem('champ_timer_duration') || '20';
      document.querySelectorAll('[data-onclick^="setTimer"]').forEach(b => {
        const match = b.dataset.onclick.match(/setTimer\(this,'(\d+)'\)/);
        if (match && match[1] === saved) {
          b.className = 'badge badge--success curseur-pointeur';
        } else {
          b.className = 'badge badge--glass curseur-pointeur';
        }
      });
    })();
}

export function cleanup() {
  // TODO : nettoyer les listeners globaux, timers, etc.
}
