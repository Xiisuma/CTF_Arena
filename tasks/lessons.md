
# CTF Arena — Lessons Learned

## Format : [date] | ce qui a mal tourné | règle pour l'éviter

---

2025-05-14 | Write tool échoue avec "File has not been read yet" | Toujours appeler Read sur un fichier avant de le Write, même si on connaît son contenu.

2025-05-14 | UTF-8 mojibake sur les catégories MySQL | Les scripts SQL d'init Docker s'exécutent sans SET NAMES utf8mb4 par défaut. Toujours ajouter SET NAMES utf8mb4 en tête de tout script SQL, et configurer --character-set-server=utf8mb4 dans le service MySQL de docker-compose.

2025-05-14 | Secrets avec fallback hardcodés dans docker-compose | Utiliser ${VAR} sans fallback :-valeur pour les secrets critiques — le service doit refuser de démarrer si la variable est absente, pas silencieusement utiliser une valeur de dev en prod.

2025-05-14 | tasks/todo.md et tasks/lessons.md absents au démarrage de session | Créer ces deux fichiers en tout début de session si ils n'existent pas (consigne CLAUDE.md section DÉMARRAGE DE SESSION).


2026-05-14 | L'Edit tool tronque les fichiers sur les éditions en début de fichier (nginx.conf, docker-compose.yml) | Ne JAMAIS utiliser l'Edit tool pour modifier le début d'un fichier. Utiliser Python (open/read/replace/write) via Bash à la place. Toujours vérifier avec `wc -l` et `tail -5` après toute édition critique.

2026-05-14 | L'Edit tool peut aussi laisser des fichiers .tsx/.ts tronqués après modification | Après tout Edit sur un gros fichier, vérifier systématiquement avec `tail -5` que le fichier n'est pas tronqué avant de continuer.

2026-05-15 | Edit tool laisse des null bytes à la fin des fichiers .tsx/.ts | Toujours utiliser Python (open/read/write) via Bash pour écrire ou modifier des fichiers. Ne jamais utiliser l'Edit tool sur des fichiers importants.

2026-05-15 | str.replace() Python peut matcher plusieurs occurrences si la chaîne n'est pas unique | Toujours vérifier qu'un pattern de remplacement est unique avant d'appliquer, ou tronquer/réécrire le fichier entièrement plutôt que patcher.

2026-05-15 | Splitting un gros fichier : les imports de remplacement peuvent créer des doublons | Après un split, toujours relire le fichier résultant pour vérifier l'absence de doublons d'imports avant de continuer.

2026-05-15 | Les hooks (useChallenges, etc.) importaient de ../db au lieu de ../api/* | Après un split de module, toujours mettre à jour tous les fichiers consommateurs pour pointer vers les nouveaux modules spécifiques.

2026-05-15 | Types inline dupliqués (Array<{...}>) dans plusieurs fichiers | Déclarer tous les types partagés dans types.ts dès qu'un même shape apparaît dans 2+ fichiers. Nommer explicitement : PlayerWithPoints, TeamMemberWithStats, UserSearchResult, etc.

2026-05-15 | Après déplacement d'un type dans types.ts, l'ancienne source garde un import inutile | Après chaque migration de type, vérifier les imports sources avec tsc --noEmit et nettoyer immédiatement.

2026-05-15 | Zod v4 installé automatiquement (npm install zod) — vérifier la version dans package.json avant d'écrire les schémas | Zod v4 est compatible avec les patterns v3 de base (z.object, z.coerce, safeParse) — pas de migration nécessaire pour un usage simple.

2026-05-15 | validate() helper avec safeParse + fallback évite de casser l'UI si l'API change | Toujours préférer safeParse + log dans un projet existant ; réserver .parse() (throw) pour du greenfield où on contrôle tout.

2026-05-15 | Hooks sans état error — l'UI reste bloquée en spinner infini si l'API est down | Tout hook qui fait du fetching doit retourner { data, loading, error }. Toujours envelopper les appels async dans try/catch/finally. Créer un composant ErrorMessage partagé pour l'affichage.

2026-05-15 | Les fichiers créés en session précédente (composants settings/) n'ont pas été persistés après résumé de contexte | Après un split multi-fichiers, toujours vérifier avec `ls` que les fichiers existent bien avant de clore la session. Ne pas supposer qu'ils sont sauvegardés.
2026-05-15 | Edit tool introduit des null bytes dans les fichiers existants → TS1127 "Invalid character" | Toujours utiliser Python open/read/write pour modifier des fichiers existants. Après tout Edit sur un fichier .tsx, vérifier avec `file` ou strips b'\x00' si les erreurs TS1127 apparaissent.
2026-05-15 | Migration loading→status : HomePage utilisait à la fois loading (useChallenges) et solvedStatus (useSolvedChallenges) → les deux doivent être vérifiés dans le guard JSX | Quand plusieurs hooks alimentent le même écran, vérifier chaque status indépendamment dans le rendu conditionnel.
2026-05-15 | npm install échoue sur filesystem Windows (ENOTEMPTY rename) | Installer les packages dans /tmp/ctf-test-modules avec npm, puis copier dans node_modules/ avec cp -rn. Toujours utiliser des chemins entre guillemets quand le répertoire contient des espaces.
2026-05-15 | vi.spyOn dans beforeEach sans afterEach(() => vi.restoreAllMocks()) laisse fuiter les appels entre tests | Mettre vi.spyOn dans chaque test individuellement OU ajouter afterEach(() => vi.restoreAllMocks()) dans le describe.
2026-05-15 | heredoc (<<'EOF') dans bash corrompt les fichiers tsx contenant des accolades JSX et des caractères spéciaux (é, …) | Pour écrire du code TSX/JSX via bash, toujours utiliser python3 avec une f-string ou écriture directe — jamais un heredoc shell. Les caractères spéciaux et les accolades JSX passent sans problème dans Python.
2026-05-15 | Edit tool tronque les fichiers LoginPage.tsx lors d'éditions multiples sur le même fichier | Après plus de 2 Edit consécutifs sur un grand fichier, vérifier avec wc -l et tail -20. Si tronqué, réécrire l'intégralité du fichier via Python.
2026-05-15 | Edit tool introduit des null bytes dans CategoriesSection.tsx et GuidePage.tsx | Après tout Edit sur un fichier .tsx existant, systématiquement passer le strip Python (replace b'\x00', b'') avant de lancer tsc --noEmit.
2026-05-15 | Casts `as Array<Record<string, unknown>>` dans les modules API : techniquement sûrs après Array.isArray() mais trompeurs pour TypeScript et non-exhaustifs (items null ou primitifs passent) | Toujours utiliser toRawArray() qui filtre explicitement les non-objets. Créer ce helper dans schemas.ts dès le départ, pas en rattrapage.

2026-05-16 | cp de node_modules depuis /tmp vers le filesystem Windows CIFS tronque silencieusement des fichiers JS (tough-cookie, lz-string, undici, jsdom/api.js…) | Après tout cp en masse vers un mount Windows, vérifier les tailles avec Python en comparant source et destination. Ne jamais supposer qu'un cp s'est bien passé sur un mount CIFS.

2026-05-16 | Comparaison de tailles de fichiers node_modules entre deux installs de versions différentes (vite 7 vs vite 8) → faux positifs de "corruption" | Avant de comparer les tailles, toujours vérifier que les versions des packages sont identiques (package.json). Sinon, installer la même version dans /tmp pour avoir une référence valide.

2026-05-16 | Edit tool tronque api.categories.test.ts en remplaçant une chaîne multi-ligne (3 lignes → 1 ligne) : le closing `});` du describe est perdu | Après tout Edit qui réduit le nombre de lignes d'un fichier, vérifier avec `tail -5` et `wc -l`. Si le fichier est tronqué, utiliser Python pour ajouter les lignes manquantes plutôt que de réécrire tout le fichier.

2026-05-16 | Chaînes multi-lignes (newlines littéraux dans "...") dans les fichiers de test générés | Toujours écrire les strings avec newlines comme "...\n\n..." (séquence d'échappement) ou template literals — jamais de retour chariot littéral à l'intérieur d'un string double-quoté.

2026-05-16 | Edit tool tronque package.json lors de l'ajout de devDependencies en fin de fichier | Ne jamais utiliser Edit tool sur package.json. Toujours réécrire via Python json.dump() pour garantir un JSON valide et complet.

2026-05-16 | Audit a11y : grep "<button" sans aria-label donne 108 faux positifs (boutons avec texte visible) | Pour identifier les vrais manquants, chercher les boutons dont le contenu JSX ne contient que des emojis/icônes sans texte latin. La règle jsx-a11y/interactive-supports-focus le fait automatiquement.

2026-05-18 | viteSingleFile + CSP script-src 'self' = page blanche | viteSingleFile injecte le JS en inline script, bloqué par CSP script-src 'self'. De plus, viteSingleFile est incompatible avec React.lazy (chunks dynamiques). Solution : supprimer viteSingleFile, utiliser le build Vite standard (chunks JS séparés servis depuis /assets/) — compatible script-src 'self' et React.lazy.

2026-05-20 | Apostrophe française non échappée dans une chaîne PHP single-quoted → parse error silencieux | Dans api.php, json_error('Le CTF n'a pas encore…') casse le parsing PHP : tout le fichier retourne du HTML d'erreur. Règle : dans les strings PHP single-quoted, toujours échapper les apostrophes françaises (n\', l\', d\', j\', qu\') OU utiliser des double-quotes. Après toute ajout de message d'erreur en français, vérifier que le nombre de single-quotes sur la ligne est pair.

2026-05-20 | MySQL 8.4 interdit DEFAULT sur les colonnes TEXT/BLOB dans CREATE TABLE | SQLSTATE[42000] 1101 "BLOB, TEXT… can't have a default value". Toujours utiliser VARCHAR(n) au lieu de TEXT quand une valeur DEFAULT est nécessaire. Pour ctf_state, VARCHAR(255) suffit (les valeurs sont '0', '1', '' ou une datetime ISO ≤ 19 chars).

2026-05-20 | init.php plante → docker restart loop → 502 sur toutes les routes | Quand init.php lève une exception non catchée, Apache ne démarre pas, le backend container redémarre en boucle, nginx reçoit "Connection refused" et retourne 502. Toute exception dans init.php doit être catchée ou le script doit exit(1) proprement — dans les deux cas, vérifier `docker compose logs backend` en priorité si toutes les routes retournent 502.

2026-05-20 | INSERT IGNORE ne réinitialise pas les valeurs existantes → état CTF résiduel après redémarrage Docker | INSERT IGNORE n'insert que si la ligne n'existe pas, elle ne met jamais à jour. Résultat : après `docker compose down && up`, podium_visible=1 ou scramble_started_at restaient actifs depuis la session précédente. Règle : utiliser INSERT ... ON DUPLICATE KEY UPDATE state_value = VALUES(state_value) pour garantir un reset à chaque démarrage du conteneur.

2026-05-20 | phase "not_started" bloquait TOUTE la HomePage → les joueurs ne voyaient pas les challenges | L'écran de blocage total était une early return. Correct : afficher les challenges (isBlocked=true bloque uniquement la soumission de flag) + bannière "CTF commence bientôt". Les admins ne sont pas bloqués (isBlocked = ... && !user.isAdmin) pour pouvoir gérer les challenges avant le lancement.

2026-05-20 | Polling temps réel — setInterval dans useEffect doit toujours avoir un cleanup | Toujours stocker le retour de setInterval dans un useRef et appeler clearInterval dans le return du useEffect. Sans cleanup, le composant accumule des intervals à chaque remontage. Cadence recommandée : 15s pour les données sociales (amis, équipes), 20s pour les listes admin (joueurs).

2026-05-21 | SSE (EventSource) avec Apache prefork sature le pool de workers → 404/503 sur toutes les routes | Apache prefork alloue 1 thread par connexion HTTP active. Une connexion SSE dure 55s et occupe ce thread en continu. Avec 2 utilisateurs simultanés et un pool de 5 workers, les 5 workers sont épuisés en quelques minutes et toutes les requêtes suivantes obtiennent 404/503. Règle : ne jamais utiliser SSE (ni WebSocket) avec Apache prefork. Revenir à du polling simple (setInterval) pour les mises à jour d'état côté serveur.

2026-05-21 | Vues SQL non recréées sur une DB existante → 500 sur get_podium | Les scripts docker-entrypoint-initdb.d ne s'exécutent qu'à la création initiale de la DB (volume vide). Si une vue est ajoutée après coup, elle n'existe pas sur les instances existantes. Règle : toujours ajouter CREATE OR REPLACE VIEW dans init.php (qui tourne à chaque démarrage du conteneur) pour les vues critiques. Même logique pour tout DDL ajouté en cours de vie du projet qui n'est pas dans une migration appliquée.

2026-05-21 | Endpoint public vs protégé — get_ctf_state appelé depuis la page de login créait des 401 en boucle | CTFStateProvider se monte au niveau App, donc il poll dès la page de login (avant auth). Si l'endpoint exige require_auth(), chaque poll non-authentifié retourne 401, qui arrive dans les logs et peut déclencher des mécanismes de retry. Règle : les données non-sensibles (état du jeu) doivent être sur un endpoint public. Appliquer require_auth() uniquement aux données personnelles ou admin.

2026-05-23 | ctf_state.state_value déclarée TEXT DEFAULT '' dans 01_tables.sql mais VARCHAR(255) dans init.php → incohérence et potentiel crash MySQL 8.4 | Toujours aligner les deux définitions : utiliser VARCHAR(n) dans 01_tables.sql pour les colonnes qui ont un DEFAULT, cohérent avec init.php.

2026-05-23 | get_teams sans LIMIT — retourne toutes les équipes, DoS potentiel | Tout endpoint de listing doit avoir LIMIT ? OFFSET ? borné (max 200), même derrière require_auth().

2026-05-23 | Comparaison de flag avec !== au lieu de hash_equals → attaque timing théorique | Toujours utiliser hash_equals() pour comparer des secrets ou des flags, même derrière un rate-limit.

2026-05-23 | get_team_members accessible à tout joueur authentifié y compris pour les équipes privées | Vérifier is_public OU membership avant de retourner les membres d'une équipe privée.

2026-05-26 | Python str.replace() sur un fichier modifié en milieu de script (crash avant save) laisse le fichier dans un état partiel — appels à la fonction définie mais pas la définition elle-même | Toujours effectuer un seul write final par script Python, vérifier avec grep que la fonction existe bien après chaque session de modifications avant de continuer.

2026-05-26 | Les Records TypeScript Record<NotifType, string> dans des fichiers autres que notifUtils.ts (ex: NotificationPopup.tsx) échouent aussi si NotifType est étendu | Après ajout d'un variant dans NotifType, chercher avec grep -r "Record<NotifType" pour trouver tous les fichiers à mettre à jour, pas seulement notifUtils.ts.
2026-05-26 | TypeScript narrowing dans un bloc conditionnel : à l'intérieur de `activeTab !== "all" && (...)`, TS narrow le type en excluant "all" — une comparaison `activeTab === "all"` dedans est toujours false | Supprimer le ternaire redondant : utiliser directement la variable déjà narrowée.

2026-05-26 | Tableaux `as const` dans LOG_CATEGORIES : le cast `as string[]` sur un readonly tuple échoue (TS2352) | Utiliser `[...arr] as string[]` (spread) pour créer un tableau mutable avant de caster.
2026-05-26 | ConfirmModal rendu dans un seul des deux blocs return d'un composant → modal invisible sur l'autre branche | Quand un composant a plusieurs return anticipés (early return), vérifier que tous les portails/modals/toasts sont présents dans chaque branche, pas seulement dans le dernier return.

2026-05-26 | apiFetch("add_team_member") ≠ case 'add_team_member_admin' dans api.php → ajout silencieusement ignoré | Toujours vérifier que le nom d'action dans apiFetch() correspond exactement au case PHP. Grepper les deux côtés après ajout d'un endpoint.

2026-05-26 | useEffect dépendant d'un useCallback stable ne se re-déclenche pas quand on appelle ce callback | Si un useEffect doit se re-déclencher après une action (ex: rafraîchir les membres après ajout), utiliser un compteur dédié (membersKey) plutôt que mettre un callback stable en dépendance.

2026-05-29 | Return type TypeScript déclaré sans un champ (boost) ajouté plus tard dans l'API → TS2353 au call site | Quand on ajoute un champ dans une réponse API PHP, mettre à jour le return type TS ET tous les callers au même moment. Ne pas patcher l'un sans l'autre.

2026-05-29 | submitFlag n'existait pas — seul submitFlagWithValue exporté → import cassé silencieux jusqu'au tsc | Toujours grepper l'export exact (grep "^export.*nomFonction") avant d'importer depuis un module feature. Ne jamais deviner le nom.

2026-05-29 | vault/ créé dans le sandbox bash temporaire mais jamais dans le vrai dossier projet Windows | Utiliser l'outil Write (chemins Windows) pour tous les fichiers qui doivent persister dans le workspace. Le sandbox bash (/sessions/...) est temporaire et non synchronisé avec le mount CIFS.


2026-08-25 | vi.mock("../api/categories") alors que le hook importe "../features/categories/api" — le mock ne s'applique jamais, vi.mocked() enveloppe la vraie fonction et échoue sur .mockResolvedValue | Le chemin passé à vi.mock doit être le chemin résolu par le module testé, pas une supposition. Après toute réorganisation de dossiers, grepper vi.mock dans src/__tests__ et vérifier chaque chemin contre les imports réels du module sous test.

2026-08-25 | Règle @typescript-eslint/no-unused-vars avec argsIgnorePattern "^_" placée uniquement dans le bloc files: ["**/*.tsx"] — les paramètres _userId des fichiers .ts remontaient en erreur | Dans un flat config ESLint, vérifier que chaque règle est bien dans un bloc dont le glob couvre tous les fichiers concernés. Les règles TypeScript vont dans le bloc **/*.{ts,tsx}, pas dans le bloc réservé au JSX.

2026-08-25 | Script npm test pointant vers /tmp/ctf-test-modules/... (chemin d'un sandbox temporaire) — suite de tests inexécutable sur la machine de dev | Ne jamais figer un chemin absolu d'environnement d'exécution dans package.json. Utiliser le binaire résolu depuis node_modules (vitest run), et exécuter npm test après toute modification des scripts pour confirmer.

2026-08-25 | Insertion d'une ligne via regex juste après "const [form, setForm] = useState<T>({" — la ligne a atterri au milieu de l'objet littéral, erreur de parsing | Pour insérer du code après une déclaration multi-lignes, ancrer sur la fin réelle de l'instruction (le "});" de fermeture), pas sur sa première ligne. Relancer eslint sur le fichier immédiatement après une édition scriptée.

2026-08-25 | require_admin() appelé sans récupérer son retour, puis $auth["username"] lu plus bas — log_activity() type $username en string, donc TypeError et 500 sur add_challenge / update_challenge / delete_challenge | Un helper qui retourne un tableau doit toujours être assigné : `$auth = require_admin();`. Après ajout d'un appel à log_activity dans un case, vérifier que $auth y est bien initialisé (grep "require_admin();" suivi de "$auth[").

2026-08-25 | init.php réinitialisait ctf_state à chaque démarrage du conteneur — un simple restart du backend remettait game_started à 0 et mettait le CTF en pause sans que personne ne le voie | Un script d'init s'exécute à chaque démarrage, pas une seule fois : il crée ce qui manque (INSERT IGNORE), il n'écrase pas l'état de production. Toute remise à zéro doit être explicite (variable d'environnement ou action admin).

2026-08-25 | Bugs invisibles en local car la base contenait déjà les données ; découverts seulement en clonant le projet à vide et en jouant le parcours complet | Avant un événement, monter une stack neuve depuis .env.example sur un projet Docker séparé (-p) et rejouer le parcours de bout en bout : login admin, création catégorie et challenge, inscription joueur, flag faux, flag bon, rejeu, classement, redémarrage backend.

2026-08-25 | Le champ de connexion était étiqueté "Email ou identifiant" alors que le backend n'accepte que l'email pour les joueurs | Quand un libellé d'interface décrit ce qu'accepte une API, vérifier le contrat côté serveur avant de le rédiger. Un libellé plus large que la validation réelle se paie en questions des utilisateurs le jour J.

2026-08-25 | Passer du code PHP contenant \n dans une chaîne via un heredoc python : le \ est réduit à \ avant python, le remplacement ne matche jamais | Pour patcher du code contenant des séquences d'échappement, découper par numéros de ligne (find sur une ligne-ancre) plutôt que par remplacement de bloc, ou composer le backslash avec chr(92).

2026-08-25 | Derrière ngrok, nginx voyait la passerelle Docker comme client : rate limiting mutualisé, cinq mauvais mots de passe bloquaient tout le monde | Derrière un proxy, toujours vérifier quelle IP arrive réellement en base (SELECT ip FROM rate_limits) avant de considérer un compteur par IP comme fonctionnel. set_real_ip_from limité aux plages privées + real_ip_header X-Forwarded-For.

2026-08-25 | increment_rate_limit appelé sur inscription réussie avec le compteur des connexions : sur un événement sur site, tous les joueurs sortent par une IP publique unique, donc 6e inscription refusée | Un compteur anti-abus doit avoir sa propre clé et son propre seuil par usage. Toujours se demander « combien de personnes partagent cette clé le jour J ? » avant de fixer un seuil par IP.

2026-08-25 | $pdo->rowCount() au lieu de $stmt->rowCount() dans import_data — import de contenu cassé, erreur 500 systématique | rowCount() appartient à PDOStatement. Les erreurs de ce type ne se voient qu'à l'exécution du chemin concerné : tout endpoint jamais joué en test est un endpoint non vérifié.

2026-08-25 | Le harness de test renvoyait des faux positifs (mauvais noms de paramètres, mauvaise clé de réponse) qui masquaient les vrais bugs | Avant d'accuser le code, vérifier le contrat réel côté serveur (grep du case dans api.php). Un échec de test se qualifie d'abord comme bug du test ou bug du code, jamais l'inverse par défaut.
