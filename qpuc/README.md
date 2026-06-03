# Questions pour un Champion

Jeu de quiz web en HTML, CSS et JavaScript Vanilla.

Pas de framework, pas de bundler, pas de Tailwind.

## Lancer le jeu

Depuis `C:\Users\HP\Documents\QPC` :

```powershell
npm install
npm start
```

Puis ouvrir :

```text
http://localhost:3001
```

Le serveur Node sert le frontend et le backend Socket.IO multijoueur.

## Structure actuelle

```text
qpuc/
├── index.html
├── assets/
│   ├── audio/
│   │   ├── fond.mp3
│   │   └── button.ogg
│   ├── css/
│   │   ├── base.css
│   │   ├── themes.css
│   │   ├── animations.css
│   │   ├── components.css
│   │   ├── responsive.css
│   │   ├── screens.css
│   │   ├── multiplayer.css
│   │   ├── artistic.css
│   │   ├── rsp-entry.css
│   │   ├── rsp-game.css
│   │   ├── rsp-multi.css
│   │   ├── rsp-results.css
│   │   └── inline-migration.css
│   ├── data/
│   │   └── questions.json
│   └── js/
│       ├── application.js
│       ├── routeur.js
│       ├── sound.js
│       ├── audio-hooks.js
│       ├── state.js
│       ├── questions-service.js
│       ├── realtime-client.js
│       ├── timer.js
│       ├── countdown.js
│       ├── theme.js
│       ├── utils.js
│       ├── splash-bg.js
│       └── ecrans/
│           └── *.js
└── rapports et test/
```

## Architecture

L'application est une SPA Vanilla :

- `index.html` charge les CSS et `assets/js/application.js`.
- `application.js` initialise le thème, l'audio et le conteneur principal.
- `routeur.js` charge dynamiquement les écrans JS depuis `assets/js/ecrans/`.
- Chaque écran exporte `html`, `init()` et éventuellement `cleanup()`.

Les anciens fichiers HTML dans `screens/` ont été retirés. Les liens de partage multijoueur utilisent maintenant :

```text
/?ecran=rejoindre-salle&code=CHMP-XXXX
```

## Écrans principaux

- `splash`
- `menu`
- `mode-local`
- `course-contre-la-montre`
- `intro-manche1`
- `jeu-manche1`
- `fin-manche1`
- `intro-manche2`
- `jeu-manche2`
- `fin-manche2`
- `intro-manche3`
- `jeu-manche3`
- `revelation`
- `podium`
- `fin-partie`
- `multijoueur`
- `modes-multijoueur`
- `creer-salle`
- `rejoindre-salle`
- `lobby`
- `jeu-multi`
- `hote-quiz`
- `joueur-quiz`
- `resume-question`
- `classement`
- `settings`
- `profil`
- `classement-general`

## Notes importantes

- Le mode local 2, 3 et 4 joueurs utilise des touches clavier configurables.
- La musique de fond utilise `fond.mp3`.
- Le son de bouton utilise `button.ogg`.
- Les données de questions sont dans `assets/data/questions.json`.
- Le multijoueur dépend du backend Socket.IO lancé par `npm start`.

## Points à stabiliser

- Finaliser le flux complet du multijoueur après lancement de partie.
- Remplacer progressivement les `data-onclick` convertis par `eval()` par des listeners explicites.
- Ajouter des vrais `cleanup()` pour les timers, listeners clavier et listeners socket.
- Ajouter un script de test Playwright officiel.

