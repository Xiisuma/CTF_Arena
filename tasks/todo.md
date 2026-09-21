
# CTF Arena — Todo

## État actuel
Projet fonctionnel. Toutes les issues CRITIQUE et ÉLEVÉE sont résolues. Refactoring React best practices en cours.

## Issues de sécurité (toutes résolues ✅)
- [x] IDOR `get_user_team` — userId admin-only
- [x] `get_categories` — rendu public (plus de 401)
- [x] `solveTimeMs` borné côté serveur (max 86 400 000 ms)
- [x] Token reset passé en query string — fallback POST body ajouté
- [x] SVG retiré des extensions autorisées en upload
- [x] HSTS ajouté dans nginx.conf
- [x] Content-Disposition attachment sur /uploads
- [x] chmod 755 sur le dossier uploads
- [x] seedCategories() déplacé dans SeedLoader (admin uniquement)

## React Best Practices (REACT_BEST_PRACTICES.md)

### ✅ Point 1 — Custom hooks pour le server state
- [x] useChallenges.ts
- [x] useSolvedChallenges.ts
- [x] useRanking.ts
- [x] useAchievements.ts

### ✅ Point 2 — Splitter db.ts en modules feature
- [x] src/api/client.ts
- [x] src/api/categories.ts
- [x] src/api/challenges.ts
- [x] src/api/teams.ts
- [x] src/api/ranking.ts
- [x] src/api/achievements.ts
- [x] src/api/friends.ts
- [x] src/api/utils.ts
- [x] src/db.ts → barrel re-export (rétrocompatibilité)
- [x] Hooks mis à jour pour importer depuis src/api/*

### ✅ Point 3 — Splitter ProfilePage.tsx (1036 lignes)
- [x] src/components/profile/profileUtils.ts (formatMs)
- [x] src/components/profile/ProfileCharts.tsx (StatCard, StatsContent, graphiques)
- [x] src/components/profile/FlagsSection.tsx
- [x] src/components/profile/FriendsSection.tsx
- [x] src/components/profile/TeamSection.tsx
- [x] ProfilePage.tsx réduit à 149 lignes

### ✅ Point 4 — Types inline dupliqués → déclarer dans types.ts
- [x] RankingRow → types.ts (retiré de ranking.ts)
- [x] TeamRankingRow → types.ts (retiré de ranking.ts)
- [x] PlayerWithPoints (nouveau) → types.ts
- [x] TeamMemberWithStats (nouveau) → types.ts
- [x] UserSearchResult (nouveau) → types.ts
- [x] Consommateurs mis à jour : ranking.ts, teams.ts, friends.ts, useRanking, useAchievements, TeamSection, FriendsSection, TeamSelector, SettingsPage
### ✅ Point 5 — Validation API responses (Zod)
- [x] Zod installé (v4)
- [x] src/api/schemas.ts créé (12 schémas : CategoryInfo, Challenge, FlagSubmission, Achievement, UserAchievement, FriendRequest, Team, TeamMemberWithStats, PlayerWithPoints, RankingRow, UserSearchResult + helper validate())
- [x] validate() intégré dans toutes les fonctions normalize* : categories, challenges, achievements, friends, teams, ranking
- [x] Approche safeParse + log — non-cassant, visible en console si l'API dévie

## React Best Practices — Round 2

### ✅ Point 1 — État error dans les hooks custom
- [x] useChallenges — try/catch/finally + error: string | null
- [x] useRanking — try/catch/finally + error: string | null
- [x] useAchievements — .catch() + error: string | null
- [x] useSolvedChallenges — try/catch + error: string | null
- [x] ErrorMessage.tsx — composant partagé avec bouton Réessayer
- [x] RankingPage, AchievementsPage, HomePage — affichage conditionnel error avant loading

### ✅ Point 2 — SettingsPage.tsx (747 lignes) à splitter
- [x] src/components/settings/settingsUtils.tsx (COLOR_MAP, ROLE_COLORS, ActionButton, SearchBar)
- [x] src/components/settings/PlayersSection.tsx (247 lignes)
- [x] src/components/settings/TeamsSection.tsx (209 lignes)
- [x] src/components/settings/DashboardSection.tsx (215 lignes)
- [x] SettingsPage.tsx réduit à 64 lignes (shell pur)
- [x] Chaque section : try/catch/finally + error state + ErrorMessage
### ✅ Point 3 — Error Boundary racine
- [x] src/components/ErrorBoundary.tsx (classe, getDerivedStateFromError + componentDidCatch)
- [x] App.tsx — <ErrorBoundary> wrapping the entire tree (outside BrowserRouter)
- [x] UI de fallback : message d'erreur + boutons "Réessayer" et "Recharger la page"
### ✅ Point 4 — key={i} → key stable sur listes dynamiques
- [x] AchievementsPage.tsx — DEFAULT_ICONS.map((i) → (emoji), key={emoji} (était déjà stable, nom trompeur)
- [x] LoginPage.tsx — [0,1,2,3].map((i) → colors.map((_,idx), plus explicite
- [x] Nettoyage bonus : suppression handleToggleAchievement inutilisé, imports morts (revokeAchievement, unlockAchievement, useRef, useMemo, isAchievementUnlocked), dead code apiFetch dans AuthContext
- [x] TypeScript : 0 erreurs (build propre)
### ✅ Point 5 — Code splitting des routes (React.lazy)
- [x] 8 pages converties en React.lazy (LoginPage, HomePage, RankingPage, GuidePage, ProfilePage, AchievementsPage, SettingsPage, NotificationsPage)
- [x] <Suspense fallback={<PageSpinner />}> wrapping toutes les routes dans AppRoutes
- [x] PageSpinner extrait en composant partagé (élimine la duplication du spinner loading/auth)
- [x] TypeScript : 0 erreurs

### ✅ Point 5 — Accessibilité (a11y)
- [x] Audit des boutons icon-only sans aria-label (108 buttons scannés → 2 vrais manquants)
- [x] ChallengeCard.tsx — aria-label="Modifier le challenge" et "Supprimer le challenge" ajoutés
- [x] eslint-plugin-jsx-a11y installé (devDependency ^6.10.0)
- [x] eslint.config.js créé (ESLint 9 flat config : @eslint/js + typescript-eslint + jsx-a11y)
- [x] scripts "lint" et "typecheck" ajoutés dans package.json
- [x] TypeScript : 0 erreurs | Tests : 82/82 passants

## Notifs temps réel + Activity Log ✅

### ✅ PARTIE A — Notifications temps réel étendues
- [x] A1. api.php : notify_team_members() + appels join/leave/kick/promote/demote
- [x] A2. types.ts + notifUtils.ts : team_role_change ajouté (label, color, bg)
- [x] A3. NotificationSystem.tsx : détection changement de rôle (prevRoleRef + getUserTeamRole)
- [x] NotificationPopup.tsx : team_role_change ajouté dans les 3 Records

### ✅ PARTIE B — Journal d'activité
- [x] B1. init.php : CREATE TABLE activity_logs
- [x] B2. Dockerfile.backend : mkdir /var/log/ctf_arena
- [x] B3. api.php : fonction log_activity() avec DB + fichier + notify_ws('activity_log')
- [x] B4. api.php : 20 appels log_activity() sur register/login/flag/challenge/achievement/team/ctf/player/bonus/malus/friend
- [x] B5. api.php : endpoint get_activity_logs (admin, LIMIT/OFFSET, filtre type/username)
- [x] B6. src/features/settings/activityLogApi.ts (NOUVEAU)
- [x] B7. src/features/settings/ActivityLogSection.tsx (NOUVEAU)
- [x] B8. log_activity() broadcaster notify_ws('activity_log') — intégré dans B3
- [x] B9. SettingsPage.tsx : onglet Journal + import ActivityLogSection

TypeScript : 0 erreurs ✅ | log_activity calls : 20

## Nouvelles fonctionnalités (2026-05-29) ✅

### A — Rate limiting flags
- [x] FLAG_ATTEMPT_MAX : 10 → 5, FLAG_ATTEMPT_WINDOW : 300s → 60s

### E — Profils publics
- [x] init.php : ALTER TABLE users ADD avatar_emoji + bio (idempotent)
- [x] api.php : get_public_profile (public) + update_profile (auth)
- [x] src/features/profile/publicProfileApi.ts
- [x] src/pages/PublicProfilePage.tsx — route /profile/:username
- [x] App.tsx : route + lazy import PublicProfilePage
- [x] ProfilePage.tsx : onglet "✏️ Mon Profil" + EditProfileSection + avatar picker
- [x] AuthContext : AuthUser.avatarEmoji + AuthUser.bio
- [x] RankingPage : pseudos → liens /profile/:username
- [x] Layout : avatar emoji dans la navbar

### B — Thématiques événementielles
- [x] init.php : event_theme dans ctf_state reset
- [x] api.php : event_theme dans get_ctf_state + set_ctf_state allowed keys
- [x] types.ts + CTFStateContext + api.ts : eventTheme propagé
- [x] App.tsx : EventThemeApplier (data-event sur html)
- [x] index.css : 3 blocs [data-event="halloween/noel/paques"]
- [x] src/features/settings/ThematiqueSection.tsx
- [x] SettingsPage.tsx : onglet "🎨 Thématique"

### C+D — Événements & Challenges Surprise
- [x] init.php : CREATE TABLE active_event
- [x] api.php : trigger_event, trigger_mystery, get_active_event, cancel_event, submit_mystery_flag
- [x] api.php : submit_flag applique le multiplicateur si event actif
- [x] src/features/ctf/activeEventApi.ts
- [x] src/features/ctf/useActiveEvent.ts (hook + WS + auto-expiry timer)
- [x] src/features/ctf/EventBanner.tsx (normal + mystère)
- [x] HomePage.tsx : EventBanner intégré
- [x] DeroulementSection.tsx : boutons admin événements

TypeScript : 0 erreurs ✅

## Prochaines étapes
- `docker compose up --build` pour rebuilder backend (nouvelles tables + colonnes)
- Tester les profils publics après premier login
- Tester un événement/mystère en conditions réelles
- Le vault/ est maintenant présent dans le dossier projet


## Préparation événement — état au 2026-08-25

### Fait
- [x] Chaîne de tests réparée : 82/82 tests, lint 0 erreur 0 warning, typecheck 0 erreur
- [x] `npm audit` : 0 vulnérabilité (react-router 7.18.2, vite 7.3.6)
- [x] `.env.example` créé — un clone neuf démarre sans connaissance préalable
- [x] Sauvegarde et restauration : `scripts/backup-db.sh`, `restore-db.sh`, `backup-db.ps1`
- [x] HTTPS : `docker-compose.tls.yml` + `Caddyfile` (Let's Encrypt automatique)
- [x] nginx relaie le scheme client — cookie de session `Secure` derrière un proxy TLS
- [x] Volume `logs_data` — les journaux survivent aux rebuilds
- [x] Seuils de rate limiting réglables par variable d'environnement
- [x] `ws-server` : sonde `/health` + healthcheck, comparaison du secret à durée constante
- [x] Bug : création/modification/suppression de challenge renvoyait 500 (`$auth` non initialisé)
- [x] Bug : `init.php` remettait `game_started` à 0 à chaque redémarrage du backend
- [x] Libellé du champ de connexion aligné sur ce que le backend accepte
- [x] Parcours complet validé sur une stack neuve : admin, catégorie, challenge, joueur, flag, classement

### Reste à faire avant l'événement
- [ ] Créer les catégories et les challenges (contenu de l'épreuve)
- [ ] Déployer derrière HTTPS avec un vrai domaine, régler `FRONTEND_URL` et `ALLOWED_ORIGINS` en https
- [ ] Planifier la sauvegarde toutes les 15 minutes et vérifier une restauration réelle
- [ ] Décider du seuil `FLAG_ATTEMPT_MAX` (5 par minute est serré pour un joueur qui cherche le format)
- [ ] Répétition générale avec 3 à 5 comptes réels

## Chantier 2026-09-14 — ordre : 2 → 7 → 8 → 1 → 4 → 5 → 3 → 6

- [x] 2. CTF « non démarré » après un rebuild, sans casser la reprise après crash

Renumérotation du 14/09 (ordre d'exécution) :

- [x] 1. Supprimer bonus / malus (API, table, UI, calcul des scores)
- [x] 2. Supprimer tout le système d'équipes (API, tables, UI, mode multijoueur)
- [ ] 3. Points dégressifs selon le nombre de résolutions
- [ ] 4. Historique des flags testés par challenge (visible par le joueur seul)
- [ ] 5. Rôle auteur : gère uniquement les challenges qu'il a créés
- [ ] 6. Événement First Blood
- [ ] 7. Challenge Mii

### Plan — nouveau point 1 (branche `fix-suppression-bonus-malus` → PR vers `fix`)
1. api.php : retirer les cases `add_bonus` / `add_malus`, leurs types de log, le `DELETE` dans
   `reset_user_progress`, et le terme `bonus_malus` des 5 calculs de points
2. init.php + sql/init/03_views.sql : `v_solo_ranking` sans bonus_malus ; init.php supprime la table
   (`DROP TABLE IF EXISTS`) sur les bases existantes — vue recréée avant le DROP
3. sql/init/01_tables.sql : retirer la table
4. Front : `addBonusPoints` / `addMalusPoints`, boutons de PlayersSection, libellés du journal, texte du Guide
5. scripts/smoke-api.py et README
6. Vérifier : typecheck, lint, tests, stack jetable (init OK, table absente, classement et
   `add_bonus` → action inconnue, smoke test sans erreur)

### Vérification — point 1 (stack jetable `-p ctfp1`)
- [x] typecheck, lint, 82/82 tests, `php -l` sur api.php et init.php
- [x] ancien code : joueur à 100 pts + bonus 25 → 125 dans get_players et le classement
- [x] rebuild sur la branche : 100 pts partout (get_players, classement, profil public)
- [x] table `bonus_malus` et entrées de journal supprimées, vue sans référence
- [x] `add_bonus` / `add_malus` refusés, `reset_user_progress` fonctionne sans la table
- [x] redémarrage du backend : init repasse sans erreur (DROP idempotent)
- [x] base neuve : smoke test 98 appels, 0 échec

### Plan — point 2
Problème : depuis le 25/08, `init.php` conserve l'état (`INSERT IGNORE`) pour qu'un crash
relancé par `restart: always` ne mette pas la partie en pause. Effet de bord : un rebuild
repart lui aussi sur un CTF déjà en cours.

Distinction retenue : un rebuild **recrée** le conteneur, un crash le **redémarre**.
Le système de fichiers d'un conteneur survit à un redémarrage, pas à une recréation.

1. `init.php` pose un marqueur hors volume (`/var/lib/ctf_arena/container-initialized`)
2. `CTF_RESET_STATE=auto` (défaut) : pas de marqueur → remise à zéro + marqueur ; marqueur → état conservé
3. `CTF_RESET_STATE=1` : remise à zéro systématique — `0` : jamais (recréer un conteneur en plein événement)
4. Vérifier : restart → conservé ; crash (PID 1 tué) → conservé ; rebuild → remis à zéro ; `0` + rebuild → conservé

### Vérification — point 2 (stack jetable `-p ctfp2`)
- [x] restart → partie conservée
- [x] crash réel (SIGTERM au PID 1, RestartCount +1) → partie conservée
- [x] rebuild (conteneur recréé) → CTF non démarré
- [x] recréation avec `CTF_RESET_STATE=0` → partie conservée
- [x] `CTF_RESET_STATE=1` → remise à zéro même après un crash
- [x] instance principale rebuildée : `gameStarted` true → false, journal « conteneur neuf »

## Correctif 2026-09-15 — challenges visibles avant le lancement

Branche `fix-masquer-challenges-avant-debut` → PR vers `fix`.
Problème : CTF non démarré, les joueurs ouvraient déjà les catégories et parcouraient les challenges.

- [x] api.php : `ctf_game_started()` ; `get_challenges` renvoie une liste vide et `download_file` 403 aux joueurs tant que `game_started` = 0 (l'admin garde tout)
- [x] HomePage : liste des catégories remplacée par la bannière « Le CTF commence bientôt » pour les joueurs
- [x] HomePage : rechargement automatique des challenges quand la phase quitte `not_started`
- [x] Test `HomePage.gate.test.tsx` (4 cas) — échoue sur l'ancien code, passe sur le nouveau
- [x] typecheck, lint, 86/86 tests, `php -l`
- [x] Stack jetable : joueur 0 challenge et fichier refusé avant lancement, admin voit tout, joueur voit tout après lancement

## Point 2 — suppression du système d'équipes (2026-09-15)

Branche `fix-suppression-equipes` → PR vers `fix`. Basée sur les PR #3 et #4 (pas encore mergées)
pour éviter les conflits dans api.php.

- [x] API : 15 actions d'équipe, `update_play_mode`, `get_team_ranking`, branches multijoueur de
      `submit_flag` / `submit_mystery_flag` / `get_user_flags`, place « équipe » du podium, `play_mode` partout
- [x] Base : tables `teams`, `team_members`, `team_bans`, `team_submissions`, vue `v_team_ranking`,
      colonne `users.play_mode` ; `sql/migration_v5.sql` supprimé
- [x] Migration init.php : flags d'équipe rendus au joueur qui les a trouvés, puis suppression (idempotente)
- [x] Interface : pages et onglet admin Teams, onglet Teams du classement, « Ma Team » du profil,
      choix du mode à l'inscription, boîte de notifications Team, règle du guide ; podium à 4 places
- [x] Tests MSW/hook mis à jour, README, smoke-api.py (vérifie que les actions retirées sont refusées)

### Vérification (stack jetable `-p ctfp2t`)
- [x] typecheck, lint, 83/83 tests, `php -l`
- [x] Ancien code : alice + bob en équipe (2 flags d'équipe), carol en solo
- [x] Rebuild sur la branche : « Flags d'équipe rendus à leurs auteurs : 2 », colonne supprimée,
      tables/vue/journaux supprimés ; classement alice 100, bob 200, carol 200
- [x] 8 actions retirées → 404 ; podium sans équipe, `podium_revealed=5` refusé ; inscription sans mode
- [x] Redémarrage : init sans erreur ; base neuve : smoke test 81 appels, 0 échec
- [x] Navigateur : formulaire d'inscription sans choix Solo / Équipe

## Retours du 19/09 (branche `fix-profil-classement-barre` → PR vers `fix`)

- [x] Avatar / bio du profil appliqués sans rechargement : `me`, `login` et `register` renvoient
      `avatarEmoji` et `bio` (ils étaient absents de la réponse), et `AuthContext.refreshUser()`
      relit le compte après la sauvegarde du profil
- [x] Classement progressif : `v_solo_ranking` ne garde que les joueurs avec au moins un flag validé
- [x] Barre de rang masquée tant que le CTF n'est pas lancé, comme les énigmes

### Vérification (stack jetable `-p ctfp4`)
- [x] typecheck, lint, 86/86 tests (2 nouveaux sur la barre, 1 sur `refreshUser`), `php -l`
- [x] Classement vide avant le premier flag, puis alice seule après le sien ; bob absent du podium
      et sans rang sur son profil public
- [x] `login` / `me` renvoient l'avatar et la bio ; après changement, `me` renvoie le nouvel emoji ;
      une inscription repart sur 🎯
- [x] Base neuve : smoke test 81 appels, 0 échec

## Point 3 — points dégressifs (2026-09-21, branche `features-points-degressifs`)

Choix d'Axel : décote lente au début puis de plus en plus rapide, plancher à 25 % de la valeur
de départ, atteint à la 12e résolution, points figés au moment de la résolution.

Courbe : `points(n) = P − (P − P×25 %) × ((n−1)/12)²`, bornée au plancher.
Pour 100 points : 100, 99, 98, 95, 92, 87, 81, 74, 67, 58, 48, 37, puis 25.

- [x] api.php : `dynamic_points()` + `next_challenge_points()`, réglables par
      `SCORING_DECAY_SOLVES` et `SCORING_FLOOR_PERCENT`
- [x] Colonne `submissions.points_awarded` : points figés, migration idempotente dans init.php
      (placée avant les vues, qui la référencent)
- [x] Tous les calculs de score basculés sur `SUM(s.points_awarded)` : vues, classement, liste
      admin, profil public, historique des flags, succès
- [x] `get_challenges` renvoie `currentPoints` et `solves` ; `points` reste la valeur de départ
      éditée par l'admin
- [x] Carte et modale : valeur actuelle + nombre de résolutions ; message de succès basé sur les
      points réellement gagnés

### Vérification (stack jetable `-p ctfp5`)
- [x] typecheck, lint, 86/86 tests, `php -l`
- [x] Base existante : les 2 anciennes soumissions gardent 100 points après migration
- [x] 14 résolutions successives : 100, 99, 98, 95, 92, 87, 81, 74, 67, 58, 48, 37, 25, 25
- [x] Points figés : 1er à 100, 5e à 92, dernier à 25, cohérent dans le classement, l'historique,
      le profil public et la liste admin
- [ ] Redémarrage du backend et smoke test sur base neuve : à refaire, Docker Desktop s'est arrêté

## Point 4 — historique des essais (2026-09-21, branche `features-historique-essais`)

Demande d'Axel : dans le profil, un onglet « Mes Essais » à côté de Flags / Stats / Amis, avec un
sélecteur listant uniquement les challenges commencés mais pas résolus, puis l'historique des flags
tentés sur celui choisi. Les essais d'un challenge disparaissent dès qu'il est résolu.

- [x] Table `flag_attempts` (schéma + migration idempotente dans init.php)
- [x] `submit_flag` : un flag erroné est mémorisé, sauf pour un challenge mystère (ne rien révéler)
- [x] Flag correct : les essais du challenge sont effacés (aussi pour le flag mystère)
- [x] `reset_user_progress` efface également les essais
- [x] Endpoint `get_flag_attempts` : joueur connecté uniquement, jamais ceux d'un autre, groupé par
      challenge et filtré sur les challenges non résolus
- [x] Onglet « 🧪 Mes Essais » + `AttemptsSection` (sélecteur + liste des essais datés)
- [x] Test MSW sur `getFlagAttempts`

### Vérification
- [x] typecheck, lint, 89/89 tests
- [ ] `php -l`, parcours sur stack jetable (essai enregistré, disparition après résolution,
      isolation entre joueurs) : à faire, Docker Desktop est arrêté

