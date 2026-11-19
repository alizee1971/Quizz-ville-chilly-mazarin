# Quiz Éclair — ton Kahoot à toi

Les joueurs scannent le QR code, tapent un pseudo et apparaissent sur l’écran de l’animateur. Aucun compte n’est nécessaire pour jouer.

## Essayer sur ton ordinateur
1. Installe Node.js (nodejs.org, version 18 ou plus).
2. Dans ce dossier : `node server.js`
3. Ouvre http://localhost:3000 (identifiant `admin`, mot de passe `QuizzKahoottest`).

## Mettre en ligne gratuitement (Render)
1. Crée un compte gratuit sur github.com, puis un dépôt « quiz-eclair » et envoie-y tous les fichiers de ce dossier (bouton « Add file → Upload files »).
2. Crée un compte gratuit sur render.com, puis « New + → Web Service » et choisis ton dépôt.
3. Réglages : Runtime = Node, Build Command = `npm install`, Start Command = `node server.js`, Instance Type = Free.
4. Dans « Environment », ajoute :
   - `ADMIN_USER` = ton identifiant
   - `ADMIN_PASS` = ton mot de passe (change-le !)
5. Clique sur « Create Web Service ». Au bout de quelques minutes, tu obtiens un lien du type https://quiz-eclair.onrender.com : c’est ton site.

## Bon à savoir
- L’offre gratuite s’endort après un moment d’inactivité : ouvre ton site une minute avant de lancer une partie.
- Tes quiz sont enregistrés dans le navigateur de l’animateur (pas sur le serveur). Utilise toujours le même navigateur.
- Les parties vivent en mémoire : si le serveur redémarre en pleine partie, il faut en relancer une.
- Pour changer l’identifiant ou le mot de passe, modifie les variables ADMIN_USER / ADMIN_PASS.
