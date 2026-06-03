/**
 * multiplayer-data.js — Données locales
 * CHAMPION. — avatars, fallbacks et classements hors ligne.
 */

/* Palette d'avatars — accents harmonisés au design system */
export const AVATAR_PALETTE = [
  '#C9663A', // terracotta
  '#8A6FB5', // améthyste
  '#3A8A6B', // vert profond
  '#C99A2E', // or
  '#4A7FB0', // bleu ardoise
  '#B5566E', // framboise
  '#5E8C8C', // céladon foncé
  '#7A6A52', // taupe
];

/* ── Salle multijoueur active (lobby) ── */
export const ROOM = {
  code: 'CHMP-7K2D',
  host: 'Nadia',
  config: {
    category:   'Culture générale',
    difficulty: 'Moyen',
    nbQuestions: 10,
    manches:    3,
    visibility: 'Privée',
    maxPlayers: 8,
  },
  players: [
    { id: 1, name: 'Nadia',    init: 'NA', color: 0, host: true,  ready: true  },
    { id: 2, name: 'Imran',    init: 'IM', color: 1, host: false, ready: true  },
    { id: 3, name: 'Lina',     init: 'LI', color: 2, host: false, ready: false },
    { id: 4, name: 'Soufiane', init: 'SO', color: 3, host: false, ready: true  },
    { id: 5, name: 'Yasmine',  init: 'YA', color: 5, host: false, ready: false },
  ],
};

/* ── Classement live (en partie) ── */
export const LIVE_BOARD = [
  { id: 1, name: 'Nadia',    init: 'NA', color: 0, score: 84, prevRank: 2 },
  { id: 2, name: 'Imran',    init: 'IM', color: 1, score: 78, prevRank: 1, me: true },
  { id: 3, name: 'Soufiane', init: 'SO', color: 3, score: 65, prevRank: 3 },
  { id: 4, name: 'Lina',     init: 'LI', color: 2, score: 52, prevRank: 5 },
  { id: 5, name: 'Yasmine',  init: 'YA', color: 5, score: 47, prevRank: 4 },
];

/* ── Classement général (all-time) ── */
export const GLOBAL_BOARD = {
  semaine: [
    { id: 101, name: 'Mehdi T.',   init: 'MT', color: 0, score: 1240, games: 18 },
    { id: 102, name: 'Salma R.',   init: 'SR', color: 1, score: 1185, games: 21 },
    { id: 103, name: 'Imran',      init: 'IM', color: 2, score: 1098, games: 16, me: true },
    { id: 104, name: 'Othmane K.', init: 'OK', color: 3, score: 1042, games: 14 },
    { id: 105, name: 'Rania B.',   init: 'RB', color: 5, score: 996,  games: 19 },
    { id: 106, name: 'Walid F.',   init: 'WF', color: 4, score: 921,  games: 12 },
    { id: 107, name: 'Hajar M.',   init: 'HM', color: 6, score: 880,  games: 15 },
    { id: 108, name: 'Driss A.',   init: 'DA', color: 7, score: 814,  games: 11 },
    { id: 109, name: 'Sara L.',    init: 'SL', color: 1, score: 769,  games: 13 },
    { id: 110, name: 'Younes E.',  init: 'YE', color: 0, score: 702,  games: 10 },
  ],
  mois: [
    { id: 102, name: 'Salma R.',   init: 'SR', color: 1, score: 4820, games: 74 },
    { id: 101, name: 'Mehdi T.',   init: 'MT', color: 0, score: 4655, games: 68 },
    { id: 104, name: 'Othmane K.', init: 'OK', color: 3, score: 4390, games: 61 },
    { id: 103, name: 'Imran',      init: 'IM', color: 2, score: 4180, games: 58, me: true },
    { id: 107, name: 'Hajar M.',   init: 'HM', color: 6, score: 3980, games: 63 },
    { id: 105, name: 'Rania B.',   init: 'RB', color: 5, score: 3720, games: 55 },
    { id: 106, name: 'Walid F.',   init: 'WF', color: 4, score: 3510, games: 49 },
    { id: 108, name: 'Driss A.',   init: 'DA', color: 7, score: 3245, games: 44 },
    { id: 109, name: 'Sara L.',    init: 'SL', color: 1, score: 3010, games: 47 },
    { id: 110, name: 'Younes E.',  init: 'YE', color: 0, score: 2870, games: 41 },
  ],
  toujours: [
    { id: 101, name: 'Mehdi T.',   init: 'MT', color: 0, score: 28940, games: 412 },
    { id: 102, name: 'Salma R.',   init: 'SR', color: 1, score: 27600, games: 388 },
    { id: 104, name: 'Othmane K.', init: 'OK', color: 3, score: 24180, games: 351 },
    { id: 105, name: 'Rania B.',   init: 'RB', color: 5, score: 22050, games: 333 },
    { id: 107, name: 'Hajar M.',   init: 'HM', color: 6, score: 20890, games: 360 },
    { id: 103, name: 'Imran',      init: 'IM', color: 2, score: 18740, games: 268, me: true },
    { id: 106, name: 'Walid F.',   init: 'WF', color: 4, score: 17320, games: 244 },
    { id: 108, name: 'Driss A.',   init: 'DA', color: 7, score: 15600, games: 221 },
    { id: 109, name: 'Sara L.',    init: 'SL', color: 1, score: 14210, games: 232 },
    { id: 110, name: 'Younes E.',  init: 'YE', color: 0, score: 12980, games: 198 },
  ],
};

/* ── Profil joueur ── */
export const PROFILE = {
  name: 'Imran',
  init: 'IM',
  color: 2,
  title: 'Stratège',
  globalRank: 6,
  stats: {
    games:     268,
    wins:      94,
    winRate:   35,        // %
    accuracy:  78,        // % bonnes réponses
    bestStreak: 14,
    points:    18740,
  },
  trophies: [
    { id: 't1', name: 'Premier sang',   desc: '1ʳᵉ victoire',          icon: 'star',   unlocked: true  },
    { id: 't2', name: 'En série',        desc: '10 bonnes d\'affilée',  icon: 'flame',  unlocked: true  },
    { id: 't3', name: 'Centurion',       desc: '100 parties jouées',    icon: 'shield', unlocked: true  },
    { id: 't4', name: 'Foudre',          desc: 'Buzz < 1s × 20',        icon: 'bolt',   unlocked: true  },
    { id: 't5', name: 'Invaincu',        desc: '5 victoires de suite',  icon: 'crown',  unlocked: false },
    { id: 't6', name: 'Encyclopédie',    desc: '90% de précision',      icon: 'book',   unlocked: false },
  ],
  history: [
    { mode: 'Multijoueur · 6 joueurs', result: 'win',  rank: 1, date: 'Aujourd\'hui · 14:20', pts: 124 },
    { mode: 'Multijoueur · 4 joueurs', result: 'good', rank: 2, date: 'Hier · 21:05',         pts: 98  },
    { mode: 'Duel',                    result: 'win',  rank: 1, date: 'Hier · 20:30',         pts: 110 },
    { mode: 'Multijoueur · 8 joueurs', result: 'good', rank: 3, date: '26 mai · 19:48',       pts: 76  },
    { mode: 'Multijoueur · 5 joueurs', result: 'good', rank: 4, date: '25 mai · 18:12',       pts: 54  },
  ],
};

/* Helpers */
export function avatarColor(idx) {
  return AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
}

export function ordinal(n) {
  return n === 1 ? '1ᵉʳ' : `${n}ᵉ`;
}
