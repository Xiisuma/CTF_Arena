
<?php
/**
 * init.php — Initialisation CTF Arena v3.0
 * Crée le compte ALPHATEN si inexistant.
 */

$host = getenv('DB_HOST') ?: 'db';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: 'root';
$name = getenv('DB_NAME') ?: 'ctf_arena';

echo "[init] Attente de la base de données...\n";
sleep(10);

$pdo = null;
for ($i = 0; $i < 30; $i++) {
    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$name;charset=utf8mb4",
            $user, $pass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        echo "[init] Connexion établie.\n";
        break;
    } catch (PDOException $e) {
        echo "[init] Tentative " . ($i + 1) . " : " . $e->getMessage() . "\n";
        sleep(3);
        $pdo = null;
    }
}

if (!$pdo) {
    echo "[init] Impossible de se connecter à la base.\n";
    exit(1);
}

// Mot de passe admin — obligatoirement fourni via variable d'environnement.
// Ne jamais définir de valeur par défaut ici.
$admin_password = getenv('ADMIN_PASSWORD');
if (!$admin_password) {
    echo "[init] ERREUR : la variable ADMIN_PASSWORD n'est pas définie.\n";
    echo "[init] Définissez-la dans votre fichier .env avant de lancer le conteneur.\n";
    echo "[init] Exemple : openssl rand -base64 24\n";
    exit(1);
}
$hash = password_hash($admin_password, PASSWORD_BCRYPT, ['cost' => 12]);

// Créer ALPHATEN (pas d'email, pas d'âge, pas de genre)
$stmt = $pdo->prepare(
    'INSERT IGNORE INTO users (username, password_hash, age, gender, is_admin, created_at)
     VALUES (?, ?, NULL, NULL, 1, NOW())'
);
$stmt->execute(['ALPHATEN', $hash]);

if ($stmt->rowCount() > 0) {
    echo "[init] Compte ALPHATEN créé.\n";
} else {
    // Vérifier si le hash doit être mis à jour (ou si ADMINSYS existe encore)
    $check = $pdo->prepare('SELECT id, password_hash FROM users WHERE username = ? LIMIT 1');
    $check->execute(['ALPHATEN']);
    $admin = $check->fetch(PDO::FETCH_ASSOC);
    if ($admin && !password_verify($admin_password, $admin['password_hash'])) {
        $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([$hash, $admin['id']]);
        echo "[init] Mot de passe ALPHATEN mis à jour.\n";
    } else {
        echo "[init] Compte ALPHATEN déjà à jour.\n";
    }
}

// Migrer l'ancien compte ADMINSYS si présent
$old = $pdo->prepare('SELECT id FROM users WHERE username = ? AND is_admin = 1 LIMIT 1');
$old->execute(['ADMINSYS']);
$oldAdmin = $old->fetch(PDO::FETCH_ASSOC);
if ($oldAdmin) {
    // Supprimer l'ancien compte admin (les FK CASCADE nettoient le reste)
    $pdo->prepare('DELETE FROM users WHERE username = ? AND is_admin = 1')->execute(['ADMINSYS']);
    echo "[init] Ancien compte ADMINSYS supprimé.\n";
}


// Créer la table ctf_state si elle n'existe pas (migration idempotente)
$pdo->exec("CREATE TABLE IF NOT EXISTS ctf_state (
    state_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
    state_value VARCHAR(255) NOT NULL DEFAULT '',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "[init] Table ctf_state vérifiée.\n";

// Créer la table activity_logs (journal d'audit)
$pdo->exec("CREATE TABLE IF NOT EXISTS activity_logs (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type        VARCHAR(50)     NOT NULL,
    user_id     INT NULL,
    username    VARCHAR(50)     NULL,
    data        JSON            NULL,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_type (type),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "[init] Table activity_logs vérifiée.\n";

// ─── Table active_event ───────────────────────────────────────────────────────
$pdo->exec("CREATE TABLE IF NOT EXISTS active_event (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT UNSIGNED NOT NULL,
    multiplier   TINYINT UNSIGNED NOT NULL DEFAULT 2,
    is_mystery   TINYINT(1) NOT NULL DEFAULT 0,
    started_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at      DATETIME NOT NULL,
    INDEX idx_ae_ends_at (ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "[init] Table active_event vérifiée.\n";

// ─── Colonnes profil public (idempotentes) ────────────────────────────────────
try { $pdo->exec("ALTER TABLE users ADD COLUMN avatar_emoji VARCHAR(10) NOT NULL DEFAULT '🎯'"); echo "[init] Colonne avatar_emoji ajoutée.\n"; } catch (Exception $e) { echo "[init] avatar_emoji déjà présente.\n"; }
try { $pdo->exec("ALTER TABLE users ADD COLUMN bio VARCHAR(200) NOT NULL DEFAULT ''"); echo "[init] Colonne bio ajoutée.\n"; } catch (Exception $e) { echo "[init] bio déjà présente.\n"; }

// La clé de rate_limits n'est plus seulement une IP mais un préfixe + IP
// ("reg:2001:db8::1" fait 49 caractères) : la colonne doit tenir 64.
try {
    $pdo->exec("ALTER TABLE rate_limits MODIFY ip VARCHAR(64) NOT NULL");
    echo "[init] Colonne rate_limits.ip élargie.
";
} catch (Exception $e) {
    echo "[init] rate_limits.ip déjà au bon format.
";
}

// ─── État du CTF ──────────────────────────────────────────────────────────────
// Deux situations à ne pas confondre :
//   - un rebuild (docker compose up --build) RECRÉE le conteneur : on repart
//     sur un CTF non démarré ;
//   - un crash relancé par restart:always REDÉMARRE le même conteneur : on
//     conserve l'état, sinon la partie se met en pause en plein événement.
// Le système de fichiers d'un conteneur survit à un redémarrage mais pas à une
// recréation : un marqueur posé hors volume suffit à les distinguer.
$stateRows = [
    ['game_started', '0'],
    ['scramble_started_at', ''],
    ['podium_visible', '0'],
    ['podium_revealed', '0'],
    ['event_theme', ''],
];

// CTF_RESET_STATE : auto (défaut) | 1 = toujours remettre à zéro | 0 = jamais.
// 0 sert à recréer un conteneur en plein événement (changement de .env) sans
// arrêter la partie.
// Pas de ?: ici : en PHP, "0" est falsy et retomberait silencieusement sur auto.
$rawResetMode = getenv('CTF_RESET_STATE');
$resetMode = ($rawResetMode === false || trim($rawResetMode) === '')
    ? 'auto'
    : strtolower(trim($rawResetMode));
$marker = '/var/lib/ctf_arena/container-initialized';
$freshContainer = !file_exists($marker);

$forceReset = match ($resetMode) {
    '1', 'always' => true,
    '0', 'never'  => false,
    default       => $freshContainer,
};

$sql = $forceReset
    ? "INSERT INTO ctf_state (state_key, state_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE state_value = VALUES(state_value), updated_at = NOW()"
    : "INSERT IGNORE INTO ctf_state (state_key, state_value) VALUES (?, ?)";

$stateStmt = $pdo->prepare($sql);
foreach ($stateRows as [$key, $value]) {
    $stateStmt->execute([$key, $value]);
}

// Le marqueur n'est posé qu'une fois l'état écrit : si l'init échoue avant,
// le prochain démarrage retentera la remise à zéro.
if ($freshContainer) {
    @mkdir(dirname($marker), 0755, true);
    @file_put_contents($marker, date('c') . "\n");
}

if ($forceReset) {
    echo "[init] État CTF réinitialisé (" . ($freshContainer ? "conteneur neuf" : "CTF_RESET_STATE=$resetMode") . ").\n";
} else {
    echo "[init] État CTF conservé (" . ($freshContainer ? "CTF_RESET_STATE=$resetMode" : "redémarrage du conteneur") . ").\n";
}

// ─── Points dégressifs ────────────────────────────────────────────────────────
// La valeur d'un challenge baisse au fil des résolutions, et les points gagnés
// sont figés à la résolution : ils sont donc stockés sur la soumission. Sur une
// base créée avant ce changement, les anciennes soumissions reçoivent la valeur
// de départ de leur challenge.
$hasAwarded = (bool) $pdo->query(
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'submissions'
       AND column_name = 'points_awarded'"
)->fetchColumn();
if (!$hasAwarded) {
    $pdo->exec(
        "ALTER TABLE submissions
         ADD COLUMN points_awarded INT UNSIGNED NOT NULL DEFAULT 0
         COMMENT 'Points gagnés à la résolution — figés, le barème est dégressif'
         AFTER challenge_id"
    );
    $filled = $pdo->exec(
        "UPDATE submissions s JOIN challenges c ON c.id = s.challenge_id
         SET s.points_awarded = c.points"
    );
    echo "[init] Colonne submissions.points_awarded ajoutée ($filled soumissions reprises).\n";
}

// ─── Essais de flags ──────────────────────────────────────────────────────────
// Historique des flags erronés, visible du seul joueur concerné. Effacé pour un
// challenge dès qu'il le résout.
$pdo->exec("CREATE TABLE IF NOT EXISTS flag_attempts (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    challenge_id INT UNSIGNED NOT NULL,
    attempt      VARCHAR(255) NOT NULL,
    submitted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fa_user_challenge (user_id, challenge_id, submitted_at DESC),
    CONSTRAINT fk_flag_attempts_users      FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
    CONSTRAINT fk_flag_attempts_challenges FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "[init] Table flag_attempts vérifiée.\n";

// ─── Vues SQL (idempotentes) ──────────────────────────────────────────────────
// CREATE OR REPLACE VIEW s'exécute à chaque démarrage du conteneur, ce qui
// garantit que les vues existent même sur une DB créée avant leur introduction
// (les scripts docker-entrypoint-initdb.d ne s'exécutent qu'à la création).
$pdo->exec("CREATE OR REPLACE VIEW v_solo_ranking AS
SELECT
    u.id                                                                    AS user_id,
    u.username,
    COUNT(s.id)                                                             AS flags_found,
    COALESCE(SUM(s.points_awarded), 0)                                      AS total_points
FROM users u
LEFT JOIN submissions s ON s.user_id = u.id
WHERE u.is_admin = 0
GROUP BY u.id, u.username
HAVING flags_found > 0
ORDER BY total_points DESC, flags_found DESC");

$pdo->exec("CREATE OR REPLACE VIEW v_most_flags AS
SELECT
    u.id       AS user_id,
    u.username,
    (SELECT COUNT(*) FROM submissions WHERE user_id = u.id) AS flags_found
FROM users u
WHERE u.is_admin = 0
ORDER BY flags_found DESC");

$pdo->exec("CREATE OR REPLACE VIEW v_ranking AS
SELECT * FROM v_solo_ranking");

echo "[init] Vues SQL recréées.\n";

// ─── Retrait du bonus/malus ───────────────────────────────────────────────────
// Les scores ne dépendent plus que des flags. Sur une base créée avant ce
// retrait, la table et ses entrées de journal sont supprimées ; les vues
// ci-dessus ne la référencent plus, le DROP passe donc sans erreur.
$pdo->exec("DROP TABLE IF EXISTS bonus_malus");
$pdo->exec("DELETE FROM activity_logs WHERE type IN ('bonus_added', 'malus_added')");

// ─── Retrait du système d'équipes ─────────────────────────────────────────────
// Tous les joueurs jouent désormais seuls. Sur une base créée avant ce retrait :
//   1. les flags validés en équipe sont rendus au joueur qui les a trouvés,
//      pour qu'il garde ses points ;
//   2. la vue, les tables d'équipe et la colonne play_mode sont supprimées,
//      ainsi que les entrées de journal liées aux équipes.
// Chaque étape est idempotente : un redémarrage ne refait rien.
$hasTeamSubmissions = (bool) $pdo->query(
    "SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'team_submissions'"
)->fetchColumn();
if ($hasTeamSubmissions) {
    $moved = $pdo->exec(
        "INSERT IGNORE INTO submissions
             (user_id, challenge_id, points_awarded, solve_time_ms, submitted_at)
         SELECT ts.solved_by, ts.challenge_id, c.points, ts.solve_time_ms, ts.submitted_at
         FROM team_submissions ts JOIN challenges c ON c.id = ts.challenge_id"
    );
    echo "[init] Flags d'équipe rendus à leurs auteurs : $moved.\n";
}
$pdo->exec("DROP VIEW IF EXISTS v_team_ranking");
$pdo->exec("DROP TABLE IF EXISTS team_submissions, team_bans, team_members, teams");
$hasPlayMode = (bool) $pdo->query(
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'play_mode'"
)->fetchColumn();
if ($hasPlayMode) {
    $pdo->exec("ALTER TABLE users DROP COLUMN play_mode");
    echo "[init] Colonne users.play_mode supprimée.\n";
}
$pdo->exec("DELETE FROM activity_logs WHERE type LIKE 'team\\_%'");

echo "[init] Initialisation terminée.\n";

