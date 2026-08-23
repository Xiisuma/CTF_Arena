# . **Prompt**

ok ca ne va pas dutout, j'ai des comptes qui sont rester inscrit et qui pourtant ne sont pas afficher dans les parametres

quand j'essaie de me connecter sur telephone, le username et le mot de passe s'affiche sur l'ecran de connection de mon ordi deja ca c'est problematique

quand je lance le ctf le boutons charge en boucle pendant tres longtemps et fonctionne apres, pareil pour brouillage et afficher le podium.

suite a ca la page home charge tres longtemps

quand j'a recharger la page, c'est la page des enigmes qui c'est affiché puis rechargement encore pour l'affichage 

et lors du dévoilement des vainqueurs ils ne se sont meme pas affichier sur mon téléphone

constant générale : temps trop long a mon gout du chargement des pages

aussi je voudrais que les gagnant sois dévoiler dans le sens inverse (finir par le premier)

je veux que les joueurs sois stockées dans la base de données et qu'il sois inscrit dans les fichiers import export

## **La difficulté**

- marqué la difficulté a chaque enigmes
- Pour l'ADMINSYS, mettre un selecteur de difficulté quand ou ajoute/modifie une enigme avec le mode "auto" qui est préselectionné et qui donne ceci : 
    -100 Pts : Facile
    100 à 199 Pts : Moyen
    +200 Pts : Difficile

## **Système de Niveaux/Ranks**
1-2 enigmes :    Starter
3-5 enigmes : 🥉 Beginner
6 - 10 enigmes : 🥈 Intermediate
11-20 enigmes : 🥇 Advanced
21-30 enigmes   : 💎 Expert
31-50 enimes : 👑 Master
50+ enigmes :  Terminator

- Affichage du niveau à côté du pseudo
- Progression vers le niveau suivant afficher dans la page home et la page profile

## **Système d'Amis**
- Ajout de la section "Amis" à la page Profile
- Barre de recherche avec boutons pour Ajouterdes amis
- en dessous de la barre de recherche, il y a la liste de ses amis, on voit leur ranks, leur classement et un boutons pour retirer l'amis
- Voir les profils des amis
- Comparer ses stats avec ses amis

## **Systeme de Team**
- Ajout de la section "Ma Team" à la page Profile
- Barre de recherche
    + un selecteur (filtre) a gauche pour public/privé 
    + un bouton création à droite
- à la création : ouvrir un sous menu avec choisir le nom, la description, un emoji pour l'icone et choisir si le team est public ou privé et enfin un bouton créer
- role : 
    - OwnerTeam (Emoji couronne a coté du pseudo)
    - AdminTeam (Emoji Etoile a coté du pseudo)
- Permission : 
    - OwnerTeam : 
        + Kick/bannir tout les joueurs avec un boutons engrenage sur chaque joueurs dans le classement des joueurs
        + boutons paramètre pour modifier le nom, la description, l'emoji et public/Privé
        + boutons pour supprimer le team
    - AdminTeam : 
        + Kick/bannir tout les joueurs (sauf l'OwnerTeam) avec un boutons engrenage sur chaque joueurs dans le classement des joueurs
        + boutons paramètre pour modifier le nom, la description, l'emoji et public/Privé
- apres le choix / création de la team : 
    - sous section Liste/Classement privé dans la team
    - pour l'Owner et les admins : le boutons paramètre qui ouvre un sous menu parametre du clan où ils peuvent modifier le nom, la description, l'emoji et public/Privé et supprimer le clan suivant leur permission

## **Achievement Secret**
- ajouter la possibilité dans la création/modifcation d'achievement de cacher l'achievement au joueur pour faire un achievement secret
- ajouter l'achievement cacher par défaut "Et tu n'est pas le Chef" : devenir le chef d'une team
- ajouter aussi l'achievement "Sociable" : avoir 3+ amis
- ajouter aussi l'achievement "Star" : avoir 15+ amis
- ajouter aussi l'achievement "Super Star" : avoir 30+ amis

## **Page Enigme**

- refonte complète de l'affichage des enigmes dans les catégories
- forme de cartes
- bouton au dessus pour choisir le nombres de cartes par ligne (3 cartes par défaut)
- chaque cartes comportera le nom de l'enigme et un bouton start(triangle)
- quand le boutons sera cliquer : 
    - un sous enu s'ouvrira avec le nom de l'enigme, la description, le(s) différent(s) fichier(s) optionnels, la case pour ecrire la réponse et le chrono qui défile en haut.
    - il y aura aussi la croix en haut a droite, quand on clique dessus cela ferme le sous menu et mes en pause l'enigme


## **Tri**
- avoir le meme trie dans le classement joueur que dans le classement team
- pouvoir trieer sa liste d'amis par la durée a laquelle ils sont en amis, nombre de points, et nombre de flags trouvé

##  **Profils Utilisateurs Publics**
- Page profil : `/profile/:username`
- Avatar personnalisable
- Biographie courte
- Stats publiques
- Badges obtenus
- Graphique de progression
- Derniers challenges résolus

## **systeme de notification**
- une notification est une petite popup qui apparais en bas a droite de son écran
- les différentes notifications sont : 
    - un amis X à compléter l'enigme Y
    - un amis X à débloquer le succès Y
    - un membre X de la team à completer l'enigme Y
    - un membre X de la team à débloquer le succès Y
    - le joueur X est passer premier au classement
- quand un joueur fais partie de ta team et est en amis avec toi, il n'y a qu'une seul notification qui apparait, celle de l'amis

## **Changement de pages**
- change la page Guide en page Règles
- définit les règles du jeu et oublie pas de preciser qu'il est strictement interdit de divulguer un flag ou une réponse a une enigme de quelque moyen existant.
- change la page Achievements et page Succes, c'est la meme chose mais au lieux que le nom sois achievements, le nom est "succès"
- Pour l'ADMINSYS : 
    - l'attribution des succès doit se faire dans la page paramètres (section joueurs)
    - l'ADMINSYS doit aussi pouvoir donner, changer ou retirer un membre a une team
    - l'ADMINSYS doit aussi pouvoir definir les roles au seins d'une team
- Dans la pages Settings il y aura donc les sections (joueurs et Teams)
- je veux aussi que tu mette une barre de recherche dans les deux sections mais tous les joueurs et team seront afficher par défaut avec une scroll bar au couleur des themes du ctf

## **refonte du systeme de notif**

- je veux un boutons notification (avec une cloche) en haut a droite
- se bouton sera normal si aucune notification non lu, il aura un chiffre allant de 1 à 9+ suivant le nombre de notif non lu
- se bouton ouvre un petit sous menu avec les 10 derniers notifications et un boutons en bas pour voir l'historique des notifications
- quand on clique sur une notification dans le sous menu, elle s'efface du sous menu, et par défaut elle mene a la page des notications
- le boutons pour voir tout l'historique des notifications ouvrira une page a part entiere avec toute les notifications
- ici il y aura la possibilité de supprimer les notifications et d'annuler au cas ou on l'a supprimer par mégarde.
- chaque notification contiendras l'heure a laquelle est elle envoyé, le pseudo du joueur ou le nom de la team concerné
- les différentes notifications sont :
    - {pseudo de l'ami} à compléter {Nom de l'énigme}
    - {pseudo de l'ami} à débloquer le succès {Nom du succès}
    - {pseudo du membre de la team} à compléter {Nom de l'énigme}
    - {pseudo du membre de la team} à débloquer le succès {Nom du succès}
    - {pseudo du joueur} est passé 1er au classement générale
    - {pseudo du joueur} à rejoint votre Team

## **modification du systeme d'ami**

- dans la page profile dans la section amis, on doit avoir une sous section en plus de "mes amis" (la liste de ses amis), sous section qui s'appelle "mes demandes" et une autres qui s'appelle "demandes envoyés"
- dans la sous section "mes demandes"
    - la liste des joueurs qui nous demande en amis avec le choix de les accepter ou non, s'ils sont accepter, ils sont automatiquement ajouter a la liste des amis dans la sous section "mes amis"
dans la sous section "demandes envoyés"
    - la liste des joueurs que l'ont demande en amis, on as aussi la possibilité de supprimer nos demandes
    - quand la demnde est accepter, le joueur passe directement dans la sous seciton "mes amis"
- quand un joueur ajoute en ami un autre, il envoie une notification au joueur concerné.
- quand le joueur clique sur la notification, il est deplacer sur sa page profil dans la section mes amis et la sous section "mes demandes"

## **refonte du system d'Authentification**

- Je veux mettre mon site en ligne donc finis le local Storage je veux un que les compte sois stockées de manière sécurise
- 2 modes Connexion & Inscription
- Connexion : 
    - Adresse mail et mot de passe
    - bouton "mot de passe oubliés" qui envoie un mail au joueur, mail qui enverra un lien vers une page pour changer son mot de passe, puis l'utilisateur devras retourner sur la page principale pour se connecter avec son nouveau mot de passe
    - possibilité de se connecter via google et via Apple
- Inscription : 
    - Pseudo, Age, sexe(sélecteur logo Male/Female), Adresse mail et mot de passe
    - possibilité de s'inscrire via google et via Apple
- (l'ADMINSYS) : tu ne change rien, c'est le seul a pouvoir se connecter sans adresse mail tu garde l'identifiant "ADMINSYS" et le mot de passe "999666999"
- Fais attention a ce que tout ca soit le plus sécurisé possible

## **Dark Mode Auto (Système)**
- Détection automatique du thème système
- Option "Auto" dans le sélecteur de thème
- Synchronisation avec les préférences OS

## **Modification de la page paramètre pour l'ADMINSYS**
- nouvelle section dans la page parametres "Dashboard"
- Statistiques globales :
  - Nombre total de joueurs
  - Taux de résolution par challenge
  - Challenges les plus difficiles
  - Temps moyen de résolution
- Graphiques en temps réel
- Export de données
- nouvelle section dans la page paramètre "Logs" (objectif : modération)
    - Logs de toutes les soumissions de flags
    - Détection de tentatives de triche
    - Bannir temporairement/définitivement
    - Historique des actions admin

## **securité**
- securisé l'ADMINSYS, fair en sorte que l'identifiant et le mot de passe de l'ADMINSYS sois securisé
- securisé les flag et faire tres attention a ce qu'il ne sois jamais accessible par un autre que l'ADMINSYS

## **Gestion des Catégories**
- Ajouter/modifier/supprimer des catégories
- Ordre personnalisé
- Icônes personnalisées
- Descriptions riches (markdown)

##  **Système de Parrainage**
- Code de parrainage unique par joueur
- Bonus de points pour le parrain et le filleul
- Suivi des filleuls
- Badge "Mentor"
- Bonus de 25 point pour le parrain et pour le filleul
- affichage du nombre de "parrainer" dans le classement

## **Debugg**

### 1. Gestion de l'état avant le démarrage du CTF
**Problème actuel :** Quand un joueur rejoint le CTF, il est directement redirigé sur la page du podium.

**Comportement souhaité :** 
- Afficher les catégories et les énigmes dès la connexion
- Désactiver la possibilité de commencer les énigmes
- Afficher un message en haut de page : "Le CTF commence bientôt..."

---

### 2. Mise à jour en temps réel sans actualisation
**Problème actuel :** Nécessité d'actualiser manuellement la page pour voir les changements.

**Pages/Actions concernées :**
- Page des paramètres : affichage des nouveaux joueurs inscrits
- Système d'amis : ajout d'amis
- Gestion des équipes : création et inscription

**Comportement souhaité :** Mise à jour automatique et en temps réel de toutes ces actions sans rechargement de page.

---

### 3. Bug de brouillage après redémarrage Docker
**Problème actuel :** Après un `docker compose down` puis `up`, quand je démarre le CTF, le brouillage est déjà actif alors qu'il ne devrait pas l'être.

**Comportement souhaité :** Le brouillage ne doit pas être actif au démarrage du CTF après un redémarrage des conteneurs Docker.

---

### 4. Documentation
Après avoir implémenté ces corrections, noter les changements dans `/task/lessons`.



## **Prompt**


change le classement et une partie du systeme de team
quand tu rejoins le ctf, tu as le choix entre Soloplayer (Je joue en solo) et Multiplayer (Je joue avec ma Team)
le mode soloplayer est celui de base et dans le mode multiplayer, les flags son centralisé sur la team et non sur le joueur, donc chaque joueurs de la team recupere les flags pour ca team
il existera classement bien distinct, le classment solo et le classement team, au sein du classement solo, les récompensée a la fin du ctf sont les 3 premiers, mais dans le classement team seul la première team est vainqueur.
une nouvelle page podium statique et contiendras les gagnant des ctf le podium a trois places plus 2 annexes, les trois premiers du classement joueurs, le premiers du classement team, et celui qui à obtenu le plus grand nombres de flags.
il y aura un boutons manuelle sur cette page car les gagnant devront dévoiler progressivement
la page ne pourra etre accessible et ne s'affichera à la place de la page home que lorsque je le choisirai sur la nouvelle section "deroulement" dans la page paramètre
un boutons Debut de jeu pour laisser le temps au joueur de se connecter, de decouvrir le ctf les fonctionnlités mais personnes pourra commencer les enigmes
aussi, il y aura un boutons brouillage dans cette meme section qui brouillera tous les classements et qui affichera sur la page home et le classement un chronometre de 15min, à l'issue de ce chrono, les joueurs seront bloqués sur leurs enigmes en cours, ou s'il ne sont pas sur une enigmes, ils ne peuvent plus ouvre de nouvelles enigmes, meme celles en pause. ceux qui sont sur une enigmes auront 3 minutes pours la finir. quand les trois minutes sont finis.

## **Idée a notée**
- a la fin de chaque ctf, le classement team est totalement réinitialiser
- le classement joueurs les mais le flag de chaque joueurs sont enregistreer, don ils n'ont pa besoin de les refaires, mais les points de ses flags ne compte pas, 



### **Rate Limiting sur les Flags**
- Max 5 tentatives par minute

### **Événements Thématiques**
- nouvelle secion dans paramètre : "Thématique"
- change le theme, le "style" du ctf : 
    - Halloween CTF 🎃
    - Noël CTF 🎄
    - Pâques CTF

### **Challenges Surprise**
- Challenge mystère qui apparaît aléatoirement par plage de 30min
- Disponible seulement 10min
- Points doublés
- Notification à tous les joueurs

### **ptit évènement**
- un challenge selectionner aléatoirement toute les 30mins après le lancement
- point doublés pendant 10min
- notification a tout les joueurs

### **Profils Utilisateurs Publics**
- Page profil : `/profile/:username`
- Avatar personnalisable
- Biographie courte
- Stats publiques
- Badges obtenus
- Graphique de progression
- Derniers challenges résolus

### **historique test flag**