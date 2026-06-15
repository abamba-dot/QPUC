/**
 * state.js — État global partagé entre les écrans
 * Questions pour un Champion
 *
 * Stocké en sessionStorage pour persister pendant la partie.
 *
 * Usage :
 *   import { getState, setState, resetState, DEMO } from './state.js';
 */

const STORAGE_KEY = 'qpuc_state';

/* ── Couleurs avatars par joueur ── */
const AVATAR_COLORS = ['#9B8EC7', '#D4A820', '#3DC87A', '#E85A3A'];
const DUREES_TIMER = {
  facile: 30,
  moyen: 20,
  difficile: 12,
};

/* ── État par défaut ── */
const DEFAULT_STATE = {
  manche: 1,
  players: [
    { id: 1, name: 'Fatima Z.',  init: 'FZ', colorIdx: 2, score: 0, streak: 0 },
    { id: 2, name: 'Amara K.',   init: 'AK', colorIdx: 0, score: 0, streak: 0 },
    { id: 3, name: 'Youssef M.', init: 'YM', colorIdx: 1, score: 0, streak: 0 },
    { id: 4, name: 'Karim B.',   init: 'KB', colorIdx: 3, score: 0, streak: 0 },
  ],
  qualified:  [],   // IDs des joueurs qualifiés par manche
  eliminated: [],   // IDs des joueurs éliminés
  niveauDifficulte: 'facile',
  serieEnCours: 0,
  dureeTimer: DUREES_TIMER.facile,
  DUREES_TIMER,
  config: {
    mode:       'duel',
    category:   'Culture',
    difficulty: 'Moyen',
    nbQuestions: 10,
  },
};

/* ════════════════════════════════════════════
   DONNÉES DE DÉMONSTRATION
════════════════════════════════════════════ */
const DEMO_M1_RESULTS = [
  { id: 1, name: 'Fatima Z.',  init: 'FZ', score: 10, qualified: true,  meta: 'Série solide' },
  { id: 2, name: 'Amara K.',   init: 'AK', score: 9,  qualified: true,  meta: 'Départ rapide' },
  { id: 3, name: 'Youssef M.', init: 'YM', score: 9,  qualified: true,  meta: 'Dernier qualifié' },
  { id: 4, name: 'Karim B.',   init: 'KB', score: 6,  qualified: false, meta: 'Parcours terminé' },
];

const DEMO_M2_RESULTS = [
  { id: 1, name: 'Fatima Z.',  init: 'FZ', serie: 4, qualified: true,  meta: 'Parfait' },
  { id: 2, name: 'Amara K.',   init: 'AK', serie: 3, qualified: true,  meta: 'Très bien' },
  { id: 3, name: 'Youssef M.', init: 'YM', serie: 2, qualified: false, meta: 'Éliminé' },
];

const DEMO_FINAL_RESULTS = [
  { id: 1, name: 'Fatima Z.',  init: 'FZ', score: 12, rank: 1, champion: true  },
  { id: 2, name: 'Amara K.',   init: 'AK', score: 8,  rank: 2, champion: false },
  { id: 3, name: 'Youssef M.', init: 'YM', score: 0,  rank: 3, champion: false },
  { id: 4, name: 'Karim B.',   init: 'KB', score: 0,  rank: 4, champion: false },
];

const DEMO_QUESTIONS = [
  { q: 'Quelle est la capitale du Maroc ?',                  cat: 'Géographie · Moyen',   opts: ['Casablanca', 'Rabat', 'Marrakech', 'Fès'],      c: 1 },
  { q: "En quelle année l'homme a marché sur la Lune ?",    cat: 'Histoire · Facile',    opts: ['1965', '1967', '1969', '1972'],                  c: 2 },
  { q: 'Symbole chimique du Fer ?',                          cat: 'Science · Moyen',      opts: ['F', 'Fe', 'Fr', 'Fm'],                          c: 1 },
  { q: "Combien de pays composent l'Afrique ?",              cat: 'Géographie',           opts: ['48', '52', '54', '58'],                         c: 2 },
  { q: "Quelle est la plus haute montagne du monde ?",       cat: 'Géographie · Facile',  opts: ['K2', 'Mont Blanc', 'Everest', 'Aconcagua'],     c: 2 },
  { q: "Qui a peint la Joconde ?",                           cat: 'Art · Facile',         opts: ['Raphaël', 'Michel-Ange', 'Léonard de Vinci', 'Botticelli'], c: 2 },
  { q: "Combien de cordes a une guitare classique ?",        cat: 'Musique · Facile',     opts: ['4', '5', '6', '7'],                             c: 2 },
  { q: "Quel pays est le plus grand du monde en superficie ?", cat: 'Géographie · Facile', opts: ['Canada', 'Chine', 'USA', 'Russie'],            c: 3 },
  { q: "En quelle année a eu lieu la Révolution Française ?", cat: 'Histoire · Moyen',   opts: ['1776', '1789', '1804', '1815'],                 c: 1 },
  { q: "Quelle planète est la plus proche du Soleil ?",     cat: 'Science · Facile',     opts: ['Vénus', 'Terre', 'Mercure', 'Mars'],            c: 2 },
];

const DEMO = { M1_RESULTS: DEMO_M1_RESULTS, M2_RESULTS: DEMO_M2_RESULTS, FINAL_RESULTS: DEMO_FINAL_RESULTS, QUESTIONS: DEMO_QUESTIONS, AVATAR_COLORS };

/* ════════════════════════════════════════════
   API
════════════════════════════════════════════ */

/** Lit l'état depuis sessionStorage. */
function getState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return _normaliserEtat(JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

/**
 * Modifie une clé de l'état et persiste.
 * @param {string} key
 * @param {*} value
 */
function setState(key, value) {
  const s = getState();
  s[key] = value;
  _save(s);
}

/**
 * Fusionne un objet dans l'état.
 * @param {object} partial
 */
function mergeState(partial) {
  const s = getState();
  Object.assign(s, partial);
  _save(s);
}

function mettreAJourNiveauDifficulte(bonneReponse) {
  const etat = getState();
  etat.DUREES_TIMER = { ...DUREES_TIMER };

  if (bonneReponse) {
    etat.serieEnCours = Number(etat.serieEnCours || 0) + 1;
    if (etat.serieEnCours >= 6) etat.niveauDifficulte = 'difficile';
    else if (etat.serieEnCours >= 3) etat.niveauDifficulte = 'moyen';
    else etat.niveauDifficulte = 'facile';
  } else {
    if (etat.niveauDifficulte === 'difficile') etat.niveauDifficulte = 'moyen';
    else if (etat.niveauDifficulte === 'moyen') etat.niveauDifficulte = 'facile';
    else etat.niveauDifficulte = 'facile';
    etat.serieEnCours = 0;
  }

  etat.dureeTimer = DUREES_TIMER[etat.niveauDifficulte] || DUREES_TIMER.facile;
  _save(etat);
  return etat.niveauDifficulte;
}

/**
 * Enregistre les résultats de la manche 1.
 * Jusqu'à 3 joueurs sont qualifiés pour la manche suivante.
 * @param {Array<object>} players
 */
function finishManche1(players = []) {
  const sorted = [...players]
    .map(p => ({ ...p, score: p.score || 0 }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const qualifiedCount = Math.min(3, sorted.length);
  const qualifiedIds = sorted.slice(0, qualifiedCount).map(p => p.id);
  const eliminatedIds = sorted.slice(qualifiedCount).map(p => p.id);
  const results = sorted.map((p, i) => ({
    ...p,
    qualified: i < qualifiedCount,
    meta: i < qualifiedCount
      ? (qualifiedCount <= 2 ? 'Finaliste' : i === qualifiedCount - 1 ? 'Dernier qualifié' : 'Qualifié')
      : 'Parcours terminé',
  }));

  const s = getState();
  s.manche = qualifiedCount <= 2 ? 3 : 2;
  s.players = results;
  s.qualified = qualifiedIds;
  s.eliminated = eliminatedIds;
  s.rounds = {
    ...(s.rounds || {}),
    m1: { results, qualified: qualifiedIds, eliminated: eliminatedIds },
  };
  _save(s);
  return results;
}

/**
 * Enregistre les résultats de la manche 2.
 * Les 2 meilleures séries sont qualifiées pour la finale.
 * @param {Array<object>} players
 */
function finishManche2(players = []) {
  const sorted = [...players]
    .map(p => ({ ...p, serie: p.serie || 0, score: p.score || 0 }))
    .sort((a, b) => (b.serie || 0) - (a.serie || 0) || (b.score || 0) - (a.score || 0));

  const finalistIds = sorted.slice(0, 2).map(p => p.id);
  const eliminatedIds = [
    ...new Set([...(getState().eliminated || []), ...sorted.slice(2).map(p => p.id)]),
  ];
  const results = sorted.map((p, i) => ({
    ...p,
    qualified: i < 2,
    meta: i < 2 ? 'Finaliste' : 'Éliminé',
  }));

  const s = getState();
  s.manche = 3;
  s.players = results;
  s.qualified = finalistIds;
  s.eliminated = eliminatedIds;
  s.rounds = {
    ...(s.rounds || {}),
    m2: { results, qualified: finalistIds, eliminated: eliminatedIds },
  };
  _save(s);
  return results;
}

/**
 * Enregistre le résultat final du duel.
 * @param {object} params
 * @param {Array<object>} params.finalists
 * @param {string|number} params.winnerId
 * @param {object} params.duelScores
 */
function finishGame({ finalists = [], winnerId = null, duelScores = {} } = {}) {
  const s = getState();
  const finalistById = new Map(finalists.map(p => [String(p.id), p]));
  const basePlayers = (s.players.length ? s.players : finalists).map(p => ({
    ...p,
    ...(finalistById.get(String(p.id)) || {}),
  }));
  const winnerKey = String(winnerId);
  const finalistIds = finalists.map(p => String(p.id));

  const ranked = [...basePlayers].map(p => {
    const duelScore = duelScores[p.id] || 0;
    const isFinalist = finalistIds.includes(String(p.id));
    return {
      ...p,
      duelScore,
      champion: String(p.id) === winnerKey,
      finaliste: isFinalist,
      score: (p.score || 0) + duelScore,
    };
  }).sort((a, b) => {
    if (a.champion !== b.champion) return a.champion ? -1 : 1;
    if (a.finaliste !== b.finaliste) return a.finaliste ? -1 : 1;
    return (b.score || 0) - (a.score || 0);
  }).map((p, i) => ({ ...p, rank: i + 1 }));

  s.manche = 3;
  s.status = 'finished';
  s.players = ranked;
  s.rounds = {
    ...(s.rounds || {}),
    m3: {
      finalists,
      winnerId,
      duelScores,
      results: ranked,
    },
  };
  _save(s);
  return ranked;
}

/** Réinitialise l'état. */
function resetState() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function _save(s) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
}

function _normaliserEtat(s = {}) {
  const etat = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...s };
  etat.DUREES_TIMER = { ...DUREES_TIMER };
  etat.niveauDifficulte = ['facile', 'moyen', 'difficile'].includes(etat.niveauDifficulte)
    ? etat.niveauDifficulte
    : 'facile';
  etat.serieEnCours = Math.max(0, Number(etat.serieEnCours || 0));
  etat.dureeTimer = DUREES_TIMER[etat.niveauDifficulte] || DUREES_TIMER.facile;
  return etat;
}

/** Retourne la couleur d'avatar pour un joueur par colorIdx. */
function getAvatarColor(colorIdx) {
  return AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
}

export { getState, setState, mergeState, mettreAJourNiveauDifficulte, finishManche1, finishManche2, finishGame, resetState, getAvatarColor, DEMO, DEFAULT_STATE, DUREES_TIMER };
