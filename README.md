# QPUC

Application web de quiz inspirée de "Questions pour un Champion".

Le projet utilise un frontend HTML/CSS/JavaScript Vanilla et un backend Node.js avec Socket.IO pour le multijoueur temps réel.

## Fonctionnalités

- Mode local solo : course contre la montre.
- Mode local 2 à 4 joueurs avec buzzer clavier.
- Mode multijoueur avec salles, code de partage et QR code.
- Modes multijoueur : classique, duel, quiz animé.
- Countdown synchronisé avant les manches.
- Questions adaptatives, score, classement et sauvegarde des parties.
- Connexion par pseudo + code secret avec session HttpOnly.
- Interface responsive plein écran avec thèmes et audio.

## Prérequis

- Node.js 18 ou plus récent.
- Redis optionnel pour persister les classements en production.

## Installation

```bash
git clone https://github.com/abamba-dot/QPUC.git
cd QPUC
npm install
```

## Lancement local

```bash
npm start
```

Puis ouvrir :

```text
http://localhost:3001
```

## Scripts

```bash
npm start
```

Lance le serveur Node.js.

```bash
npm run dev
```

Alias de développement.

## Configuration

Créer un fichier `.env` à partir de `.env.example` si nécessaire.

Variables principales :

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://qpuc.pro
MAX_ROOMS=500
QUIZ_QUESTION_DURATION_SEC=20
REDIS_URL=redis://localhost:6379
```

Si Redis n'est pas disponible, le serveur utilise un stockage local de secours pour le classement.

## Structure

```text
.
├── backend/
│   ├── server.js
│   └── redis.js
├── deploy/
│   ├── DEPLOIEMENT_UBUNTU.md
│   └── nginx-qpuc.conf
├── qpuc/
│   ├── index.html
│   ├── manifest.webmanifest
│   └── assets/
│       ├── audio/
│       ├── css/
│       ├── data/questions.json
│       ├── img/
│       └── js/
├── ecosystem.config.cjs
├── package.json
└── README.md
```

## Données runtime

Ces fichiers ne doivent pas être versionnés :

- `.env`
- `node_modules/`
- `data/leaderboard.json`
- `backend/data/auth.json`
- dossiers locaux `.claude/`, `.codex/`, `.agents/`

Ils sont exclus par `.gitignore`.

## Déploiement Ubuntu

Un guide complet est disponible ici :

```text
deploy/DEPLOIEMENT_UBUNTU.md
```

Commandes de mise à jour sur le serveur :

```bash
cd /var/www/qpuc
git pull
npm ci --omit=dev
pm2 restart qpuc
```

## Notes de sécurité

La connexion utilise un code secret hashé avec `crypto.scryptSync`.
La session est envoyée dans un cookie HttpOnly.

Cette sécurité reste volontairement légère : pour une production stricte, la validation des scores devrait être renforcée côté serveur.
