const fs = require('node:fs');
const path = require('node:path');
const Redis = require('ioredis');

const ROOT = path.resolve(__dirname, '..');
const FALLBACK_FILE = path.join(ROOT, 'data', 'leaderboard.json');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis = null;
let redisDisponible = false;

function clientRedis() {
  if (redis) return redis;
  redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 1200,
    retryStrategy: () => null,
  });
  redis.on('error', err => {
    redisDisponible = false;
    if (!clientRedis._erreurSignalee) {
      clientRedis._erreurSignalee = true;
      console.warn('[redis] Connexion indisponible, stockage local utilisé :', err.message);
    }
  });
  return redis;
}

async function execRedis(operation) {
  try {
    const client = clientRedis();
    if (client.status === 'wait') await client.connect();
    redisDisponible = true;
    return await operation(client);
  } catch (error) {
    redisDisponible = false;
    throw error;
  }
}

function chargerFallback() {
  try {
    return JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
  } catch (error) {
    return { players: {} };
  }
}

function sauverFallback(data) {
  fs.mkdirSync(path.dirname(FALLBACK_FILE), { recursive: true });
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2));
}

function pseudoKey(pseudo) {
  return String(pseudo || '').trim();
}

function statsVides() {
  return {
    parties: 0,
    victoires: 0,
    scoreMoyen: 0,
    meilleureSerieMax: 0,
    dernierePartie: new Date().toISOString(),
  };
}

async function getOuCreerJoueur(pseudo) {
  const nom = pseudoKey(pseudo);
  try {
    return await execRedis(async client => {
      const cle = `joueur:${nom}`;
      const existant = await client.hgetall(cle);
      if (existant && existant.parties !== undefined) return normaliserStats(existant);
      const initial = statsVides();
      await client.hset(cle, initial);
      return initial;
    });
  } catch (error) {
    const board = chargerFallback();
    board.players[nom] = board.players[nom] || { pseudo: nom, ...statsVides(), meilleurScore: 0, historique: [] };
    sauverFallback(board);
    return statsDepuisFallback(board.players[nom]);
  }
}

async function sauvegarderPartie(pseudo, { score, victoire, serieMax, manche, mode } = {}) {
  const nom = pseudoKey(pseudo);
  const scoreNet = Math.max(0, Math.round(Number(score || 0)));
  const serieNet = Math.max(0, Math.round(Number(serieMax || 0)));
  const entreeHistorique = {
    date: new Date().toISOString(),
    score: scoreNet,
    victoire: Boolean(victoire),
    serieMax: serieNet,
    manche: Math.max(1, Number(manche || 1)),
    mode: mode || 'fidele',
  };

  try {
    return await execRedis(async client => {
      const cle = `joueur:${nom}`;
      await getOuCreerJoueur(nom);
      const stats = await client.hgetall(cle);
      const partiesAvant = parseInt(stats.parties || 0, 10);
      const partiesTotal = partiesAvant + 1;
      const victoiresTotal = parseInt(stats.victoires || 0, 10) + (victoire ? 1 : 0);
      const scoreMoyenCalc = Math.round(
        ((parseFloat(stats.scoreMoyen || 0) * partiesAvant) + scoreNet) / partiesTotal
      );
      const meilleureSerieMax = Math.max(parseInt(stats.meilleureSerieMax || 0, 10), serieNet);

      const nextStats = {
        parties: partiesTotal,
        victoires: victoiresTotal,
        scoreMoyen: scoreMoyenCalc,
        meilleureSerieMax,
        dernierePartie: new Date().toISOString(),
      };
      await client.hset(cle, nextStats);

      const meilleurScore = await client.zscore('classement:global', nom);
      if (!meilleurScore || scoreNet > parseFloat(meilleurScore)) {
        await client.zadd('classement:global', scoreNet, nom);
      }

      await client.lpush(`historique:${nom}`, JSON.stringify(entreeHistorique));
      await client.ltrim(`historique:${nom}`, 0, 4);
      return nextStats;
    });
  } catch (error) {
    const board = chargerFallback();
    const previous = board.players[nom] || { pseudo: nom, ...statsVides(), meilleurScore: 0, historique: [] };
    const partiesAvant = Number(previous.parties || 0);
    const partiesTotal = partiesAvant + 1;
    const scoreMoyen = Math.round(((Number(previous.scoreMoyen || 0) * partiesAvant) + scoreNet) / partiesTotal);
    board.players[nom] = {
      ...previous,
      pseudo: nom,
      parties: partiesTotal,
      victoires: Number(previous.victoires || 0) + (victoire ? 1 : 0),
      scoreMoyen,
      meilleureSerieMax: Math.max(Number(previous.meilleureSerieMax || 0), serieNet),
      meilleurScore: Math.max(Number(previous.meilleurScore || 0), scoreNet),
      dernierePartie: new Date().toISOString(),
      historique: [entreeHistorique, ...(previous.historique || [])].slice(0, 5),
    };
    sauverFallback(board);
    return statsDepuisFallback(board.players[nom]);
  }
}

async function getClassement(pseudoJoueur) {
  const moi = pseudoJoueur ? pseudoKey(pseudoJoueur) : null;
  try {
    return await execRedis(async client => {
      const top10 = await client.zrevrange('classement:global', 0, 9, 'WITHSCORES');
      const joueurs = [];
      for (let i = 0; i < top10.length; i += 2) {
        const pseudo = top10[i];
        const score = parseFloat(top10[i + 1]);
        const stats = await client.hgetall(`joueur:${pseudo}`);
        joueurs.push({
          rang: Math.floor(i / 2) + 1,
          pseudo,
          score,
          victoires: parseInt(stats?.victoires || 0, 10),
          parties: parseInt(stats?.parties || 0, 10),
          scoreMoyen: parseFloat(stats?.scoreMoyen || 0),
          meilleureSerieMax: parseInt(stats?.meilleureSerieMax || 0, 10),
          estMoi: pseudo === moi,
        });
      }
      let rangJoueur = null;
      if (moi) {
        const rang = await client.zrevrank('classement:global', moi);
        if (rang !== null) rangJoueur = rang + 1;
      }
      return { top10: joueurs, rangJoueur, joueur: moi ? joueurs.find(j => j.pseudo === moi) || null : null };
    });
  } catch (error) {
    const board = chargerFallback();
    const rows = Object.values(board.players || {})
      .map(player => ({
        pseudo: player.pseudo,
        score: Number(player.meilleurScore || player.score || 0),
        victoires: Number(player.victoires || 0),
        parties: Number(player.parties || 0),
        scoreMoyen: Number(player.scoreMoyen || 0),
        meilleureSerieMax: Number(player.meilleureSerieMax || 0),
      }))
      .sort((a, b) => b.score - a.score || b.victoires - a.victoires || a.pseudo.localeCompare(b.pseudo));
    const rangIndex = moi ? rows.findIndex(row => row.pseudo === moi) : -1;
    return {
      top10: rows.slice(0, 10).map((row, index) => ({ ...row, rang: index + 1, estMoi: row.pseudo === moi })),
      rangJoueur: rangIndex >= 0 ? rangIndex + 1 : null,
      joueur: rangIndex >= 0 ? rows[rangIndex] : null,
    };
  }
}

async function getHistoriqueJoueur(pseudo) {
  const nom = pseudoKey(pseudo);
  try {
    return await execRedis(async client => {
      const stats = normaliserStats(await client.hgetall(`joueur:${nom}`));
      const historique = await client.lrange(`historique:${nom}`, 0, 4);
      return {
        pseudo: nom,
        stats,
        historique: historique.map(item => JSON.parse(item)),
      };
    });
  } catch (error) {
    const joueur = chargerFallback().players[nom] || { pseudo: nom, ...statsVides(), historique: [] };
    return {
      pseudo: nom,
      stats: statsDepuisFallback(joueur),
      historique: joueur.historique || [],
    };
  }
}

function normaliserStats(stats = {}) {
  return {
    parties: Number(stats.parties || 0),
    victoires: Number(stats.victoires || 0),
    scoreMoyen: Number(stats.scoreMoyen || 0),
    meilleureSerieMax: Number(stats.meilleureSerieMax || 0),
    dernierePartie: stats.dernierePartie || new Date().toISOString(),
  };
}

function statsDepuisFallback(player = {}) {
  return normaliserStats(player);
}

module.exports = {
  getOuCreerJoueur,
  sauvegarderPartie,
  getClassement,
  getHistoriqueJoueur,
  redisDisponible: () => redisDisponible,
};
