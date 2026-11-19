# Quizz

Les joueurs scannent le QR code, saisissent un pseudo (ou lancent le dé 🎲) et apparaissent sur l’écran de l’animateur. Aucun compte n’est nécessaire pour jouer.

## Contenu
- `server.js` : le serveur de jeu (aucune dépendance).
- `public/index.html` : la page d’entrée.
- `public/css/style.css` : le design (fond dégradé bleu).
- `public/js/app.js` : joueur, animateur, éditeur de quiz, questions.
- `public/js/audio.js` : musiques (attente, suspense qui accélère, jingles, fanfare finale).
- `public/js/scores.js` : stockage des points et exports CSV.
- `public/logo.png` : (à ajouter) le logo de la ville, affiché dans le cercle.

## Types de questions
Choix multiples, Vrai ou faux, Estimation (nombre), Réponse libre (nuage de mots), Idées puis vote (en %).

## Essayer sur ton ordinateur
1. Installe Node.js 18 ou plus (nodejs.org).
2. Dans ce dossier : `node server.js`
3. Ouvre http://localhost:3000 (identifiant `admin`, mot de passe `QuizzKahoottest`).

## Mettre en ligne gratuitement (Render)
1. Envoie tous les fichiers sur un dépôt GitHub.
2. Sur render.com : « New + → Web Service », choisis le dépôt. Build Command = `npm install`, Start Command = `node server.js`, Instance Type = Free.
3. Dans « Environment », ajoute :
   - `ADMIN_USER` = ton identifiant
   - `ADMIN_PASS` = ton mot de passe (change-le !)
   - `PUBLIC_HOST` = l’adresse affichée à l’écran après « Rejoignez sur » (par défaut `quizz.ville-chilly-mazarin.fr`)
4. Pour que l’adresse affichée soit la vraie, ajoute ce nom de domaine dans Render (Settings → Custom Domains). Sinon, mets dans `PUBLIC_HOST` l’adresse Render (ex. `quiz-eclair.onrender.com`). Le QR code fonctionne dans tous les cas.

## Bon à savoir
- L’offre gratuite s’endort après un moment d’inactivité : ouvre le site une minute avant la partie.
- Les quiz sont enregistrés dans le navigateur de l’animateur.
- Les parties vivent en mémoire : si le serveur redémarre en pleine partie, il faut en relancer une.
- Le son démarre après le premier clic de l’animateur (règle des navigateurs).
