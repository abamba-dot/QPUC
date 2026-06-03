/**
 * questions-service.js — Source de questions remplaçable par une API
 * Questions pour un Champion
 */

import { shuffle } from './utils.js';

const QUESTIONS_URL = '../data/questions.json';

const CATEGORY_GROUPS = {
  'culture générale': [],
  'histoire et géographie': [
    'Afrique et monde francophone',
    'Géopolitique et international',
    'Politique et institutions',
  ],
  'arts et médias': [
    'Culture et médias',
    'Prix et distinctions',
  ],
  'sciences et nature': [
    'Sciences et espace',
    'Technologie et numérique',
    'Environnement et santé',
  ],
  'sport et loisirs': [
    'Sport',
  ],
  'monde et société': [
    'Afrique et monde francophone',
    'Géopolitique et international',
    'Politique et institutions',
    'Économie et développement',
  ],
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function labelDifficulty(value) {
  const v = normalizeText(value);
  if (v === 'facile') return 'Facile';
  if (v === 'difficile') return 'Difficile';
  return 'Moyen';
}

function matchesFilter(value, filter) {
  if (!filter) return true;
  const source = normalizeText(value);
  const target = normalizeText(filter);
  const group = CATEGORY_GROUPS[target];
  if (Array.isArray(group)) {
    return group.length === 0 || group.some(item => normalizeText(item) === source);
  }
  return source === target || source.includes(target) || target.includes(source);
}

function toGameQuestion(raw, index = 0) {
  const opts = Array.isArray(raw.options) ? raw.options : [];
  const correctIndex = opts.findIndex(opt => opt === raw.reponseCorrecte);
  const correctText = correctIndex >= 0 ? opts[correctIndex] : raw.reponseCorrecte;

  return {
    id: raw.id || `actualite-${index + 1}`,
    q: raw.question,
    cat: `${raw.categorie || 'Actualité'} · ${labelDifficulty(raw.difficulte)}`,
    opts,
    c: correctIndex >= 0 ? correctIndex : 0,
    fact: raw.illustrationTexte || `${correctText || 'La bonne réponse'} — ${raw.sourceLabel || 'information vérifiée'}`,
    imageUrl: raw.imageUrl || '',
    imageAlt: raw.imageAlt || raw.wikidataLabel || correctText || raw.categorie || 'Illustration de la question',
    imageKeyword: raw.imageKeyword || raw.wikidataLabel || correctText || raw.categorie || '',
    imageCredit: raw.imageCredit || '',
    imageSource: raw.imageSource || '',
    imageLicense: raw.imageLicense || '',
    sourceLabel: raw.sourceLabel || '',
    sourceUrl: raw.sourceUrl || '',
    dateReference: raw.dateReference || '',
  };
}

async function loadQuestions(options = {}) {
  const {
    category = '',
    difficulty = '',
    limit = 10,
    fallback = [],
  } = options;

  try {
    const res = await fetch(new URL(QUESTIONS_URL, import.meta.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawQuestions = await res.json();
    const questions = rawQuestions
      .filter(q => Array.isArray(q.options) && q.options.length === 4 && q.question)
      .filter(q => matchesFilter(q.categorie, category))
      .filter(q => matchesFilter(q.difficulte, difficulty))
      .map(toGameQuestion);

    const pool = questions.length ? questions : rawQuestions.map(toGameQuestion);
    return shuffle(pool).slice(0, Math.max(1, limit));
  } catch (err) {
    console.warn('[questions] Chargement JSON impossible, fallback DEMO utilisé.', err);
    return shuffle(fallback).slice(0, Math.max(1, limit));
  }
}

export { loadQuestions, toGameQuestion };
