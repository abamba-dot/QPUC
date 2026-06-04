# Questions pour un Champion

Application web de quiz inspirée du format “Questions pour un Champion”, développée en HTML, CSS et JavaScript Vanilla, avec un backend Node.js pour le multijoueur en temps réel.

## Fonctionnalités

- Interface plein écran responsive.
- Mode local solo : course contre la montre..
- Mode local 2 à 4 joueurs avec buzzer clavier configurable
- Manches locales : 9 Points Gagnants, 4 à la Suite, Face à Face
- Mode multijoueur avec création de salle.
- Code de salle et QR code de partage.
- Buzzer temps réel via Socket.IO.
- Écran d’annonce et countdown avant le lancement multijoueur.
- Musique de fond, son de bouton et effets de buzzer/réponse.
- Thèmes visuels et animations CSS.

## Stack technique

- Frontend : HTML, CSS, JavaScript Vanilla.
- Backend : Node.js HTTP server.
- Temps réel : Socket.IO.
- QR code : `qrcode`.
- Données : JSON local dans `qpuc/assets/data/questions.json`.

## Prérequis

Installer Node.js 18 ou plus récent.

Vérifier l’installation :

```bash
node --version
npm --version
```

## Installation

Cloner le dépôt :

```bash
git clone https://github.com/abamba-dot/QPUC.git
cd QPUC
```

Installer les dépendances :

```bash
npm install
```

## Lancer le projet

Démarrer le serveur :

```bash
npm start
```

Puis ouvrir :

```text
http://localhost:3001
```

Le serveur Node sert à la fois :

- l’application frontend située dans `qpuc/` ;
- le backend Socket.IO pour les salles multijoueur ;
- l’API QR code utilisée par les invitations.

## Scripts disponibles

```bash
npm start
```

Lance `backend/server.js`.

```bash
npm run dev
```

Alias de `npm start` pour le développement local.

## Structure du projet

```text
.
├── backend/
│   └── server.js
├── qpuc/
│   ├── index.html
│   └── assets/
│       ├── audio/
│       ├── css/
│       ├── data/
│       │   └── questions.json
│       └── js/
│           ├── application.js
│           ├── routeur.js
│           ├── realtime-client.js
│           ├── state.js
│           ├── sound.js
│           └── ecrans/
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## Architecture

L’application est une SPA Vanilla.

- `qpuc/index.html` charge les feuilles de style et `assets/js/application.js`.
- `application.js` initialise le thème, l’audio et le conteneur principal.
- `routeur.js` charge dynamiquement les écrans depuis `assets/js/ecrans/`.
- Chaque écran expose généralement `html`, `init()` et parfois `cleanup()`.
- `backend/server.js` sert les fichiers statiques, les questions, les QR codes et les événements Socket.IO.

## Mode local

Depuis le menu :

1. Choisir `Mode local`.
2. Choisir Solo ou Duel.
3. Configurer les joueurs, catégories, difficulté et nombre de questions.
4. En mode 2 à 4 joueurs, chaque joueur peut utiliser une touche de clavier pour buzzer.

## Mode multijoueur

Depuis le menu :

1. Choisir `Multijoueur`.
2. Créer une salle.
3. Choisir le mode.
4. Partager le code ou le QR code.
5. Les autres joueurs rejoignent via le lien ou le code.
6. L’hôte lance la partie.
7. Un écran d’annonce et un countdown synchronisé s’affichent avant le jeu.

Exemple de lien de partage :

```text
http://localhost:3001/?ecran=rejoindre-salle&code=CHMP-XXXX
```

Sur le même réseau local, il faut partager l’adresse réseau de la machine hôte, par exemple :

```text
http://192.168.1.20:3001/?ecran=rejoindre-salle&code=CHMP-XXXX
```

## Variables d’environnement

Le serveur accepte quelques variables optionnelles :

```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://qpuc.pro
MAX_ROOMS=500
QUIZ_QUESTION_DURATION_SEC=20
```

Exemple PowerShell :

```powershell
$env:PORT="3001"
npm start
```

Exemple Bash :

```bash
PORT=3001 npm start
```

Un modèle prêt à copier est disponible dans :

```text
.env.example
```

## Questions

Les questions sont stockées ici :

```text
qpuc/assets/data/questions.json
```

Le backend charge ce fichier au démarrage. Après modification des questions, redémarrer le serveur.

## Audio

Les fichiers audio attendus sont dans :

```text
qpuc/assets/audio/
```

Fichiers actuellement utilisés :

- `fond.mp3`
- `button.ogg`

## Publier sur GitHub

Initialiser Git si nécessaire :

```bash
git init
git branch -M main
git remote add origin https://github.com/abamba-dot/QPUC.git
```

Vérifier les fichiers qui seront envoyés :

```bash
git status
```

Ajouter et committer :

```bash
git add .
git commit -m "Initial commit"
```

Envoyer sur GitHub :

```bash
git push -u origin main
```

Le fichier `.gitignore` exclut notamment :

- `.claude/`
- `.codex/`
- `.agents/`
- `node_modules/`
- `.env`
- les archives `.zip`
- les rapports de travail locaux
- les logs et caches

## Déploiement sur Ubuntu

Le dépôt contient les fichiers de production suivants :

```text
.env.example
ecosystem.config.cjs
deploy/nginx-qpuc.conf
deploy/DEPLOIEMENT_UBUNTU.md
```

Déploiement cible :

```text
VPS : ubuntu@51.38.187.235
Domaine : qpuc.pro
```

Avant de lancer HTTPS, modifier la zone DNS OVH :

```text
@     A    51.38.187.235
www   A    51.38.187.235
```

Les anciennes entrées `A` vers `213.186.33.5` doivent être remplacées.

Guide complet :

```text
deploy/DEPLOIEMENT_UBUNTU.md
```

Résumé côté serveur :

```bash
ssh ubuntu@51.38.187.235
sudo apt update
sudo apt install -y git nginx curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

cd /var/www
sudo git clone https://github.com/abamba-dot/QPUC.git qpuc
sudo chown -R ubuntu:ubuntu /var/www/qpuc
cd /var/www/qpuc
npm ci --omit=dev
cp .env.example .env
pm2 start ecosystem.config.cjs
pm2 save
```

Configurer Nginx :

```bash
sudo cp deploy/nginx-qpuc.conf /etc/nginx/sites-available/qpuc
sudo ln -s /etc/nginx/sites-available/qpuc /etc/nginx/sites-enabled/qpuc
sudo nginx -t
sudo systemctl reload nginx
```

Activer HTTPS :

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d qpuc.pro -d www.qpuc.pro
```

Mise à jour après un nouveau push :

```bash
cd /var/www/qpuc
git pull
npm ci --omit=dev
pm2 restart qpuc
```

## État actuel

Le jeu local est la partie la plus avancée. Le multijoueur permet déjà la création de salle, le partage par QR code/code, le lobby, le countdown synchronisé et le buzzer temps réel. Le flux complet multijoueur en 3 manches doit encore être finalisé pour reproduire exactement le mode local.

## Licence

Projet personnel. Ajouter une licence explicite avant publication ou distribution publique si nécessaire.
