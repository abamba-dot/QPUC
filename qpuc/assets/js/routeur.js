/* ════════════════════════════════════════════════
   ROUTEUR SPA — Questions pour un Champion
   ════════════════════════════════════════════════ */

const DUREE_SORTIE = 240;

const ECRANS = {
  'connexion':               () => import('./ecrans/connexion.js'),
  'splash':                  () => import('./ecrans/splash.js'),
  'menu':                    () => import('./ecrans/menu.js'),
  'mode-local':              () => import('./ecrans/mode-local.js'),
  'settings':                () => import('./ecrans/settings.js'),
  'profil':                  () => import('./ecrans/profil.js'),
  'classement-general':      () => import('./ecrans/classement-general.js'),
  'intro-manche1':           () => import('./ecrans/intro-manche1.js'),
  'jeu-manche1':             () => import('./ecrans/jeu-manche1.js'),
  'fin-manche1':             () => import('./ecrans/fin-manche1.js'),
  'intro-manche2':           () => import('./ecrans/intro-manche2.js'),
  'jeu-manche2':             () => import('./ecrans/jeu-manche2.js'),
  'fin-manche2':             () => import('./ecrans/fin-manche2.js'),
  'intro-manche3':           () => import('./ecrans/intro-manche3.js'),
  'jeu-manche3':             () => import('./ecrans/jeu-manche3.js'),
  'revelation':              () => import('./ecrans/revelation.js'),
  'podium':                  () => import('./ecrans/podium.js'),
  'fin-partie':              () => import('./ecrans/fin-partie.js'),
  'course-contre-la-montre': () => import('./ecrans/course-contre-la-montre.js'),
  'multijoueur':             () => import('./ecrans/multijoueur.js'),
  'modes-multijoueur':       () => import('./ecrans/modes-multijoueur.js'),
  'creer-salle':             () => import('./ecrans/creer-salle.js'),
  'rejoindre-salle':         () => import('./ecrans/rejoindre-salle.js'),
  'lobby':                   () => import('./ecrans/lobby.js'),
  'attente-manche':          () => import('./ecrans/attente-manche.js'),
  'fin-manche-multi':        () => import('./ecrans/fin-manche-multi.js'),
  'intro-multi':             () => import('./ecrans/intro-multi.js'),
  'jeu-multi':               () => import('./ecrans/jeu-multi.js'),
  'joueur-quiz':             () => import('./ecrans/joueur-quiz.js'),
  'hote-quiz':               () => import('./ecrans/hote-quiz.js'),
  'resume-question':         () => import('./ecrans/resume-question.js'),
  'classement':              () => import('./ecrans/classement.js'),
};

let ecranActuel = null;
let moduleActuel = null;
let conteneur = null;

export function definirConteneur(el) {
  conteneur = el;
}

export function obtenirEcranActuel() {
  return ecranActuel;
}

export function naviguer(nom, opts = {}) {
  if (!conteneur) {
    console.warn('[routeur] Conteneur non défini');
    return;
  }

  const normalise = normaliserNom(nom);
  if (!normalise || !ECRANS[normalise]) {
    console.warn(`[routeur] Écran inconnu : ${nom}`);
    return;
  }

  const page = conteneur.querySelector('.page');

  if (page && !opts.sansAnimation) {
    page.style.transition = `opacity ${DUREE_SORTIE}ms ease, transform ${DUREE_SORTIE}ms ease`;
    page.style.opacity = '0';
    page.style.transform = 'translateY(-8px)';
    setTimeout(() => chargerEcran(normalise, opts), DUREE_SORTIE);
  } else {
    chargerEcran(normalise, opts);
  }
}

async function chargerEcran(nom, opts) {
  if (moduleActuel && typeof moduleActuel.cleanup === 'function') {
    try { moduleActuel.cleanup(); } catch (e) {}
  }

  conteneur.innerHTML = '<div class="page page--loading"></div>';

  try {
    const mod = await ECRANS[nom]();
    moduleActuel = mod;
    ecranActuel = nom;

    // Mettre à jour le titre
    if (mod.titre) document.title = mod.titre;

    // Injecter le HTML
    conteneur.innerHTML = mod.html || '<div class="page"></div>';

    // S'assurer qu'il y a un .page
    if (!conteneur.querySelector('.page')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'page';
      while (conteneur.firstChild) wrapper.appendChild(conteneur.firstChild);
      conteneur.appendChild(wrapper);
    }

    // Animer l'entrée
    const page = conteneur.querySelector('.page');
    page.style.opacity = '0';
    page.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        page.style.transition = `opacity ${DUREE_SORTIE}ms ease, transform ${DUREE_SORTIE}ms ease`;
        page.style.opacity = '1';
        page.style.transform = 'translateY(0)';
      });
    });

    // Initialiser la logique
    if (typeof mod.init === 'function') {
      await mod.init(conteneur);
    }

    // Propager l'événement pour l'audio
    window.dispatchEvent(new CustomEvent('qpuc:ecran-change', { detail: { ecran: nom } }));

  } catch (err) {
    console.error(`[routeur] Erreur chargement ${nom}:`, err);
    conteneur.innerHTML = '<div class="page"><h1>Erreur de chargement</h1><button class="btn-primary" onclick="location.reload()">Recharger</button></div>';
  }
}

function normaliserNom(cible) {
  if (!cible) return 'splash';
  // Enlever l'extension .html
  let nom = cible.replace(/\.html$/, '');
  // Enlever les chemins
  nom = nom.replace(/^.*[\\/]/, '');
  return nom;
}

export function revenir(repli = 'menu') {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    naviguer(repli);
  }
}

// Rétrocompatibilité
export const navigate = naviguer;
export const goBack = revenir;
