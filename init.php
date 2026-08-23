
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

// Réinitialiser l'état CTF à chaque démarrage du conteneur.
// ON DUPLICATE KEY UPDATE garantit que les valeurs sont remises à zéro même si les lignes existent déjà
// (évite le brouillage ou le podium résiduels d'une session précédente).
$pdo->prepare(
    "INSERT INTO ctf_state (state_key, state_value) VALUES
     ('game_started', '0'),
     ('scramble_started_at', ''),
     ('podium_visible', '0'),
     ('podium_revealed', '0'),
     ('event_theme', '')
     ON DUPLICATE KEY UPDATE state_value = VALUES(state_value), updated_at = NOW()"
)->execute();
echo "[init] État CTF réinitialisé.\n";

// ─── Vues SQL (idempotentes) ──────────────────────────────────────────────────
// CREATE OR REPLACE VIEW s'exécute à chaque démarrage du conteneur, ce qui
// garantit que les vues existent même sur une DB créée avant leur introduction
// (les scripts docker-entrypoint-initdb.d ne s'exécutent qu'à la création).
$pdo->exec("CREATE OR REPLACE VIEW v_solo_ranking AS
SELECT
    u.id                                                                    AS user_id,
    u.username,
    COUNT(s.id)                                                             AS flags_found,
    COALESCE(SUM(c.points), 0) +
        COALESCE((SELECT SUM(bm.points) FROM bonus_malus bm WHERE bm.user_id = u.id), 0)
                                                                            AS total_points
FROM users u
LEFT JOIN submissions s ON s.user_id = u.id
LEFT JOIN challenges  c ON c.id      = s.challenge_id
WHERE u.is_admin = 0
  AND u.play_mode = 'solo'
GROUP BY u.id, u.username
ORDER BY total_points DESC, flags_found DESC");

$pdo->exec("CREATE OR REPLACE VIEW v_team_ranking AS
SELECT
    t.id                            AS team_id,
    t.name                          AS team_name,
    t.emoji,
    t.is_public,
    t.owner_id,
    t.created_at,
    COUNT(DISTINCT ts.challenge_id) AS flags_found,
    COALESCE(SUM(c.points), 0)      AS total_points,
    COUNT(DISTINCT tm.user_id)      AS member_count
FROM teams t
LEFT JOIN team_submissions ts ON ts.team_id     = t.id
LEFT JOIN challenges        c  ON c.id           = ts.challenge_id
LEFT JOIN team_members      tm ON tm.team_id     = t.id
GROUP BY t.id, t.name, t.emoji, t.is_public, t.owner_id, t.created_at
ORDER BY total_points DESC, flags_found DESC");

$pdo->exec("CREATE OR REPLACE VIEW v_most_flags AS
SELECT
    u.id       AS user_id,
    u.username,
    u.play_mode,
    CASE
        WHEN u.play_mode = 'solo' THEN
            (SELECT COUNT(*) FROM submissions WHERE user_id = u.id)
        ELSE
            (SELECT COUNT(*) FROM team_submissions ts
             JOIN team_members tm ON tm.team_id = ts.team_id
             WHERE tm.user_id = u.id)
    END AS flags_found
FROM users u
WHERE u.is_admin = 0
ORDER BY flags_found DESC");

$pdo->exec("CREATE OR REPLACE VIEW v_ranking AS
SELECT * FROM v_solo_ranking");

echo "[init] Vues SQL recréées.\n";

echo "[init] Initialisation terminée.\n";

