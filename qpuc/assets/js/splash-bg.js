/**
 * splash-bg.js — Animation de fond 3D pour le splash
 * Quiz Champion — champ d'icônes de catégories qui flottent
 *
 * Three.js (r128). Icônes de quiz (culture, sport, histoire, sciences,
 * géo, musique, cinéma, art, savoir, trophée) dessinées sur des textures
 * canvas, appliquées à des plans qui dérivent. Parallaxe souris/gyro,
 * onde "buzzer" centrale. Couleurs de marque, recolorables au thème.
 */

(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !window.THREE) return;

  const THREE = window.THREE;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function palette() {
    return { a: '#C2603A', b: '#7C5FA6', c: '#C2912B', d: '#2F6E68' };
  }

  /* ════════════════════════════════════════════
     DESSIN DES ICÔNES (canvas 2D → texture)
     Tracé blanc sur transparent, teinté ensuite.
  ════════════════════════════════════════════ */
  const ICON_DRAWERS = {
    // Livre — Culture / Littérature
    livre(c) {
      c.beginPath();
      c.moveTo(50, 60); c.quadraticCurveTo(128, 36, 128, 60);
      c.lineTo(128, 196); c.quadraticCurveTo(128, 176, 50, 196); c.closePath();
      c.moveTo(206, 60); c.quadraticCurveTo(128, 36, 128, 60);
      c.lineTo(128, 196); c.quadraticCurveTo(128, 176, 206, 196); c.closePath();
      c.stroke();
    },
    // Ballon — Sport
    ballon(c) {
      c.beginPath(); c.arc(128, 128, 80, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      const r = 30;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath(); c.stroke();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        const a2 = -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / 5);
        c.beginPath();
        c.moveTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
        c.lineTo(128 + Math.cos(a2) * 78, 128 + Math.sin(a2) * 78);
        c.stroke();
      }
    },
    // Colonne antique — Histoire
    colonne(c) {
      c.beginPath();
      c.moveTo(56, 74); c.lineTo(200, 74); c.stroke();           // chapiteau
      c.beginPath(); c.moveTo(48, 92); c.lineTo(208, 92); c.stroke();
      c.beginPath(); c.moveTo(64, 188); c.lineTo(192, 188); c.stroke(); // base
      c.beginPath(); c.moveTo(48, 206); c.lineTo(208, 206); c.stroke();
      [78, 110, 146, 178].forEach(x => {                          // fûts cannelés
        c.beginPath(); c.moveTo(x, 92); c.lineTo(x, 188); c.stroke();
      });
    },
    // Fiole — Sciences
    fiole(c) {
      c.beginPath();
      c.moveTo(104, 44); c.lineTo(104, 108);
      c.lineTo(58, 188); c.quadraticCurveTo(50, 208, 72, 208);
      c.lineTo(184, 208); c.quadraticCurveTo(206, 208, 198, 188);
      c.lineTo(152, 108); c.lineTo(152, 44);
      c.stroke();
      c.beginPath(); c.moveTo(92, 44); c.lineTo(164, 44); c.stroke();
      c.beginPath(); c.moveTo(78, 150); c.lineTo(178, 150); c.stroke();
    },
    // Globe — Géographie
    globe(c) {
      c.beginPath(); c.arc(128, 128, 80, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(128, 128, 32, 80, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(48, 128); c.lineTo(208, 128); c.stroke();
      c.beginPath(); c.ellipse(128, 128, 80, 36, 0, 0, Math.PI * 2); c.stroke();
    },
    // Note de musique — Musique
    musique(c) {
      c.beginPath();
      c.moveTo(96, 176); c.lineTo(96, 64); c.lineTo(180, 48); c.lineTo(180, 150);
      c.stroke();
      c.beginPath(); c.moveTo(96, 64); c.lineTo(180, 48); c.stroke();
      c.beginPath(); c.ellipse(76, 176, 24, 18, -0.3, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(160, 150, 24, 18, -0.3, 0, Math.PI * 2); c.stroke();
    },
    // Clap de cinéma — Cinéma
    cinema(c) {
      c.strokeRect(52, 104, 152, 100);
      c.beginPath();
      c.moveTo(52, 104); c.lineTo(70, 70); c.lineTo(118, 60);
      c.lineTo(100, 94); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(118, 60); c.lineTo(166, 50);
      c.lineTo(148, 84); c.lineTo(100, 94); c.stroke();
      c.beginPath(); c.moveTo(166, 50); c.lineTo(204, 42);
      c.lineTo(196, 76); c.lineTo(148, 84); c.stroke();
    },
    // Ampoule — Savoir général
    ampoule(c) {
      c.beginPath(); c.arc(128, 104, 56, Math.PI * 0.15, Math.PI * 0.85, true); c.stroke();
      c.beginPath();
      c.moveTo(96, 150); c.quadraticCurveTo(96, 168, 108, 176);
      c.lineTo(148, 176); c.quadraticCurveTo(160, 168, 160, 150);
      c.stroke();
      c.beginPath(); c.moveTo(106, 192); c.lineTo(150, 192); c.stroke();
      c.beginPath(); c.moveTo(112, 206); c.lineTo(144, 206); c.stroke();
    },
    // Palette — Art
    palette(c) {
      c.beginPath();
      c.ellipse(128, 122, 84, 72, 0, 0, Math.PI * 2);
      c.stroke();
      c.beginPath(); c.arc(150, 168, 22, Math.PI, Math.PI * 2.4); c.stroke();
      [[96, 92], [120, 78], [156, 86], [172, 118]].forEach(([x, y]) => {
        c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.stroke();
      });
    },
    // Trophée — Champion
    trophee(c) {
      c.beginPath();
      c.moveTo(86, 56); c.lineTo(170, 56); c.lineTo(166, 104);
      c.quadraticCurveTo(160, 140, 128, 144);
      c.quadraticCurveTo(96, 140, 90, 104); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(86, 68); c.quadraticCurveTo(52, 70, 56, 96);
      c.quadraticCurveTo(60, 116, 92, 116); c.stroke();
      c.beginPath(); c.moveTo(170, 68); c.quadraticCurveTo(204, 70, 200, 96);
      c.quadraticCurveTo(196, 116, 164, 116); c.stroke();
      c.beginPath(); c.moveTo(128, 144); c.lineTo(128, 178); c.stroke();
      c.beginPath(); c.moveTo(98, 200); c.lineTo(158, 200);
      c.lineTo(150, 178); c.lineTo(106, 178); c.closePath(); c.stroke();
    },
    // Point d'interrogation — Mystère
    question(c) {
      c.beginPath();
      c.arc(128, 92, 42, Math.PI * 0.9, Math.PI * 2.15);
      c.stroke();
      c.beginPath(); c.moveTo(128, 134); c.lineTo(128, 158); c.stroke();
      c.beginPath(); c.arc(128, 192, 7, 0, Math.PI * 2); c.fill();
    },
  };

  const ICON_KEYS = Object.keys(ICON_DRAWERS);

  function makeIconTexture(key) {
    const size = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    c.strokeStyle = '#ffffff';
    c.fillStyle = '#ffffff';
    c.lineWidth = 12;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    ICON_DRAWERS[key](c);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }

  const textures = {};
  ICON_KEYS.forEach(k => { textures[k] = makeIconTexture(k); });

  /* ════════════════════════════════════════════
     SCÈNE
  ════════════════════════════════════════════ */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 16;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const pal = palette();
  const COLORS = [pal.a, pal.b, pal.c, pal.d];

  const group = new THREE.Group();
  scene.add(group);

  const planeGeo = new THREE.PlaneGeometry(2, 2);
  const COUNT = 30;
  const items = [];
  const SPREAD_X = 28, SPREAD_Y = 17, SPREAD_Z = 18;

  for (let i = 0; i < COUNT; i++) {
    const key = ICON_KEYS[i % ICON_KEYS.length];
    const colorIdx = i % COLORS.length;
    const mat = new THREE.MeshBasicMaterial({
      map: textures[key],
      color: new THREE.Color(COLORS[colorIdx]),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(planeGeo, mat);

    const depth = Math.random();
    mesh.position.set(
      (Math.random() - 0.5) * SPREAD_X,
      (Math.random() - 0.5) * SPREAD_Y,
      -SPREAD_Z * (1 - depth)
    );
    const scale = 0.9 + depth * 1.7;
    mesh.scale.setScalar(scale);
    mesh.rotation.z = (Math.random() - 0.5) * 0.5;

    items.push({
      mesh, key, colorIdx,
      targetOpacity: 0.12 + depth * 0.5,
      driftX: (Math.random() - 0.5) * 0.1,
      driftY: 0.05 + Math.random() * 0.12,
      spin: (Math.random() - 0.5) * 0.0022,
      bobAmp: 0.4 + Math.random() * 0.7,
      bobSpeed: 0.25 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      baseX: mesh.position.x,
      baseY: mesh.position.y,
    });
    group.add(mesh);
  }

  /* Onde "buzzer" centrale */
  function makeRing(rIn, rOut, color, z) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(rIn, rOut, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    m.position.z = z;
    scene.add(m);
    return m;
  }
  const ring1 = makeRing(2.6, 2.85, pal.a, -4);
  const ring2 = makeRing(3.4, 3.6, pal.b, -5);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    target.x = Math.max(-1, Math.min(1, e.gamma / 30));
    target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  });

  const clock = new THREE.Clock();
  let elapsed = 0, raf = null;

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    cur.x += (target.x - cur.x) * 0.04;
    cur.y += (target.y - cur.y) * 0.04;
    group.position.x = cur.x * 1.6;
    group.position.y = -cur.y * 1.0;
    group.rotation.y = cur.x * 0.06;
    group.rotation.x = cur.y * 0.04;

    items.forEach((it) => {
      const m = it.mesh;
      if (m.material.opacity < it.targetOpacity) {
        m.material.opacity = Math.min(it.targetOpacity, m.material.opacity + dt * 0.3);
      }
      it.baseY += it.driftY * dt;
      it.baseX += it.driftX * dt;
      if (it.baseY > SPREAD_Y / 2 + 2) it.baseY = -SPREAD_Y / 2 - 2;
      if (it.baseX > SPREAD_X / 2 + 2) it.baseX = -SPREAD_X / 2 - 2;
      if (it.baseX < -SPREAD_X / 2 - 2) it.baseX = SPREAD_X / 2 + 2;
      m.position.y = it.baseY + Math.sin(elapsed * it.bobSpeed + it.phase) * it.bobAmp * 0.16;
      m.position.x = it.baseX + Math.cos(elapsed * it.bobSpeed * 0.7 + it.phase) * it.bobAmp * 0.1;
      m.rotation.z += it.spin;
    });

    const pulse = (elapsed % 3.4) / 3.4;
    const ease = 1 - Math.pow(1 - pulse, 3);
    ring1.scale.setScalar(0.6 + ease * 1.6);
    ring1.material.opacity = Math.max(0, 0.26 * (1 - pulse));
    ring2.scale.setScalar(0.5 + ease * 1.9);
    ring2.material.opacity = Math.max(0, 0.18 * (1 - pulse));

    renderer.render(scene, camera);
  }

  resize();
  tick();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
    else if (!raf) { clock.getDelta(); tick(); }
  });

  window.__splashBgRecolor = function () {
    const p = palette();
    const cols = [p.a, p.b, p.c, p.d];
    items.forEach((it) => it.mesh.material.color.set(cols[it.colorIdx]));
    ring1.material.color.set(p.a);
    ring2.material.color.set(p.b);
  };

  window.__splashBgStats = function () {
    return {
      drawCalls: renderer.info.render.calls,
      items: items.length,
      icons: ICON_KEYS.length,
      avgOpacity: (items.reduce((s, it) => s + it.mesh.material.opacity, 0) / items.length).toFixed(3),
    };
  };
})();
