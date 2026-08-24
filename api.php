<?php
/**
 * CTF Arena — API complète v4.0
 *
 * Changements v4.0 :
 *   - Suppression des colonnes dénormalisées de submissions
 *     (challenge_title, category, points) — JOIN challenges systématique
 *   - SELECT * éliminés (get_teams, get_user_team, get_achievements, get_team_ranking)
 *   - compute_ranking_from_db : SUM(c.points) via JOIN challenges
 */

declare(strict_types=1);
// En prod : les erreurs PHP ne sont jamais affichées à l'utilisateur (sécurité),
// mais elles sont loguées côté serveur pour le débogage.
// Configurer log_errors = On + error_log dans php.ini ou docker-compose.
error_reporting(E_ALL);
ini_set("display_errors", "0");
ini_set("log_errors", "1");

// ─── Gestionnaire d'exceptions global ────────────────────────────────────────
// Toute exception non catchée retourne un JSON 500 au lieu d'un body vide.
set_exception_handler(function (Throwable $e): void {
  http_response_code(500);
  echo json_encode(
    [
      "ok" => false,
      "error" => "Erreur serveur interne.",
      "debug" => getenv("APP_ENV") === "dev" ? $e->getMessage() : null,
    ],
    JSON_UNESCAPED_UNICODE,
  );
  exit();
});

// ─── Configuration ────────────────────────────────────────────────────────────

define("DB_HOST", getenv("DB_HOST") ?: "db");
define("DB_USER", getenv("DB_USER") ?: "root");
define("DB_PASSWORD", getenv("DB_PASSWORD") ?: "root");
define("DB_NAME", getenv("DB_NAME") ?: "ctf_arena");

define("RESET_EXPIRY", 3600);

// ─── Secrets obligatoires — échec immédiat si absents ────────────────────────
// Ne jamais mettre de valeur par défaut ici : ces secrets doivent venir
// exclusivement des variables d'environnement (fichier .env → docker-compose).

function require_env(string $name): string
{
  $val = getenv($name);
  if ($val === false || $val === "") {
    http_response_code(500);
    echo json_encode(
      [
        "ok" => false,
        "error" => "Configuration serveur manquante : $name non défini.",
      ],
      JSON_UNESCAPED_UNICODE,
    );
    exit();
  }
  return $val;
}

define("RESET_SECRET", require_env("RESET_SECRET"));
// NOTIFY_SECRET : non bloquant côté API — le ws-server refuse les appels sans secret.
// Si absent (conteneur non rebuilt), l'API fonctionne mais les notifications WS
// ne sont pas authentifiées. Reconstruire le conteneur pour l'activer.
$_notifySecret = getenv("NOTIFY_SECRET") ?: "";
if (!$_notifySecret) {
  error_log("[api] WARNING: NOTIFY_SECRET non défini — reconstruire le conteneur backend.");
}
define("NOTIFY_SECRET", $_notifySecret);
define("FLAG_ENCRYPT_KEY", require_env("FLAG_ENCRYPT_KEY"));

define("SMTP_HOST", getenv("SMTP_HOST") ?: "smtp.gmail.com");
define("SMTP_PORT", (int) (getenv("SMTP_PORT") ?: 587));
define("SMTP_USER", getenv("SMTP_USER") ?: "");
define("SMTP_PASSWORD", getenv("SMTP_PASSWORD") ?: "");
define("SMTP_FROM", getenv("SMTP_FROM") ?: "noreply@ctf-arena.local");
define("SMTP_FROM_NAME", "CTF Arena");
define("FRONTEND_URL", getenv("FRONTEND_URL") ?: "http://localhost:3000");

// Réglables par variable d'environnement : pendant un événement, les seuils
// utiles ne sont pas les mêmes qu'en exploitation normale.
define("RATE_LIMIT_MAX", (int) (getenv("RATE_LIMIT_MAX") ?: 5));
define("RATE_LIMIT_WINDOW", (int) (getenv("RATE_LIMIT_WINDOW") ?: 300)); // 5 minutes
// Tentatives de flag erronées par utilisateur (clé "flag:{userId}" dans rate_limits)
define("FLAG_ATTEMPT_MAX", (int) (getenv("FLAG_ATTEMPT_MAX") ?: 5));
define("FLAG_ATTEMPT_WINDOW", (int) (getenv("FLAG_ATTEMPT_WINDOW") ?: 60)); // 1 minute
// Créations de comptes par IP. Compteur distinct de celui des connexions : sur
// un événement sur site, tous les joueurs partagent l'IP publique du lieu, et
// une limite calquée sur celle du brute-force bloquerait les inscriptions.
define("REGISTER_MAX", (int) (getenv("REGISTER_MAX") ?: 30));
define("REGISTER_WINDOW", (int) (getenv("REGISTER_WINDOW") ?: 3600)); // 1 heure

// ─── Headers ──────────────────────────────────────────────────────────────────

header("Content-Type: application/json; charset=utf-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
// X-XSS-Protection supprimé — déprécié depuis 2019, remplacé par CSP script-src 'self'
header("Referrer-Policy: strict-origin-when-cross-origin");

$allowed_origins = array_filter(
  array_map(
    "trim",
    explode(",", getenv("ALLOWED_ORIGINS") ?: "http://localhost:3000,http://localhost:5173"),
  ),
);
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $allowed_origins, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");
}
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit();
}

// ─── Session ──────────────────────────────────────────────────────────────────

ini_set("session.cookie_httponly", "1");
ini_set("session.cookie_samesite", "Strict");
// Secure uniquement en HTTPS — sur HTTP (dev local) le cookie doit fonctionner sans TLS
$_isHttps =
  (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ||
  (!empty($_SERVER["HTTP_X_FORWARDED_PROTO"]) && $_SERVER["HTTP_X_FORWARDED_PROTO"] === "https");
ini_set("session.cookie_secure", $_isHttps ? "1" : "0");
ini_set("session.use_strict_mode", "1");
ini_set("session.gc_maxlifetime", "86400");
session_start();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json_response(array $data, int $status = 200): never
{
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
  exit();
}
function json_error(string $message, int $status = 400): never
{
  json_response(["ok" => false, "error" => $message], $status);
}
function get_body(): array
{
  $raw = file_get_contents("php://input");
  if (empty($raw)) {
    return [];
  }
  try {
    return json_decode($raw, true, 512, JSON_THROW_ON_ERROR) ?? [];
  } catch (\JsonException) {
    return [];
  }
}
/**
 * Notifie le serveur WebSocket d'un changement de données.
 * Les clients React abonnés reçoivent l'événement et rafraîchissent sans polling.
 * Timeout court (0.3s) pour ne pas bloquer la réponse PHP si ws-server est indisponible.
 *
 * @param string $type  'players' | 'teams' | 'challenges' | 'ctf_state'
 */
function notify_ws(string $type, ?int $targetUserId = null): void
{
  $data = ["type" => $type];
  if ($targetUserId !== null) {
    $data["targetUserId"] = $targetUserId;
  }
  $payload = json_encode($data);
  $ctx = stream_context_create([
    "http" => [
      "method" => "POST",
      "header" => "Content-Type: application/json\r\nX-Notify-Secret: " . NOTIFY_SECRET,
      "content" => $payload,
      "timeout" => 0.3,
      "ignore_errors" => true,
    ],
  ]);
  @file_get_contents("http://ws-server:8080/notify", false, $ctx);
}

/**
 * Notifie chaque membre d'une team via WS (notification ciblée).
 * Utilisé pour les events team : join, role change, kick, etc.
 * @param int $excludeUserId  userId à ne pas notifier (ex: le joueur qui a agi)
 */
function notify_team_members(string $teamId, int $excludeUserId = 0): void
{
  try {
    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT user_id FROM team_members WHERE team_id = ?");
    $stmt->execute([$teamId]);
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $uid) {
      if ((int) $uid !== $excludeUserId) {
        notify_ws("notification", (int) $uid);
      }
    }
  } catch (\Throwable) {
    /* ne jamais bloquer sur la notification */
  }
}

/**
 * Enregistre une action dans la table activity_logs ET dans le fichier de log.
 * Ne bloque jamais (try/catch silencieux).
 *
 * @param string   $type      Ex: 'register_success', 'login_fail', 'flag_correct', etc.
 * @param int|null $userId    ID de l'utilisateur concerné (null si inconnu)
 * @param string   $username  Nom d'affichage ('' si inconnu)
 * @param array    $data      Données contextuelles (raison d'échec, challenge, etc.)
 */
function log_activity(string $type, ?int $userId, string $username, array $data = []): void
{
  try {
    $jsonData = !empty($data) ? json_encode($data, JSON_UNESCAPED_UNICODE) : null;
    get_pdo()
      ->prepare("INSERT INTO activity_logs (type, user_id, username, data) VALUES (?, ?, ?, ?)")
      ->execute([$type, $userId, $username ?: null, $jsonData]);
  } catch (\Throwable) {
    /* ne jamais bloquer sur le logging */
  }

  // Routing vers le fichier de log correspondant à la catégorie
  static $TYPE_FILE = [
    "register_success" => "auth",
    "register_fail" => "auth",
    "login_success" => "auth",
    "login_fail" => "auth",
    "logout" => "auth",
    "flag_correct" => "gameplay",
    "flag_wrong" => "gameplay",
    "challenge_created" => "gameplay",
    "challenge_updated" => "gameplay",
    "challenge_deleted" => "gameplay",
    "achievement_unlocked" => "gameplay",
    "ctf_state_change" => "gameplay",
    "team_join" => "teams",
    "team_leave" => "teams",
    "team_kick" => "teams",
    "team_promote" => "teams",
    "team_demote" => "teams",
    "friend_request_sent" => "social",
    "player_deleted" => "admin",
    "bonus_added" => "admin",
    "malus_added" => "admin",
    "progress_reset" => "admin",
    "profile_updated" => "social",
    "event_triggered" => "admin",
    "mystery_triggered" => "admin",
  ];

  try {
    $category = $TYPE_FILE[$type] ?? "misc";
    $ts =
      date("Y-m-d H:i:s") .
      "." .
      str_pad((int) (fmod(microtime(true), 1) * 1000), 3, "0", STR_PAD_LEFT);
    $line =
      "$ts [$type]" .
      ($username ? " user=$username" : "") .
      (!empty($data) ? " " . json_encode($data, JSON_UNESCAPED_UNICODE) : "");
    $dir = "/var/log/ctf_arena";
    // Fichier de catégorie
    @file_put_contents("$dir/$category.log", $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    // Fichier global consolidé
    @file_put_contents("$dir/all.log", "[$category] $line" . PHP_EOL, FILE_APPEND | LOCK_EX);
  } catch (\Throwable) {
    /* silencieux */
  }

  // Broadcaster aux admins connectés (pour ActivityLogSection temps réel)
  notify_ws("activity_log");
}

function sanitize_string(string $s, int $max = 255): string
{
  return mb_substr(trim($s), 0, $max);
}
function get_client_ip(): string
{
  // Nginx est configuré pour passer X-Real-IP = $remote_addr (IP réelle, non
  // falsifiable). On ne lit plus X-Forwarded-For qui peut être injecté par le client.
  if (
    !empty($_SERVER["HTTP_X_REAL_IP"]) &&
    filter_var($_SERVER["HTTP_X_REAL_IP"], FILTER_VALIDATE_IP)
  ) {
    return $_SERVER["HTTP_X_REAL_IP"];
  }
  return $_SERVER["REMOTE_ADDR"] ?? "0.0.0.0";
}

// ─── Chiffrement AES-256-GCM ─────────────────────────────────────────────────

function encrypt_flag(string $flag): string
{
  $key = hex2bin(FLAG_ENCRYPT_KEY);
  $nonce = random_bytes(12);
  $tag = "";
  $cipher = openssl_encrypt($flag, "aes-256-gcm", $key, OPENSSL_RAW_DATA, $nonce, $tag, "", 16);
  if ($cipher === false) {
    throw new \RuntimeException("Échec du chiffrement");
  }
  return base64_encode($nonce . $tag . $cipher);
}
function decrypt_flag(string $encrypted): string
{
  $data = base64_decode($encrypted, true);
  if ($data === false || strlen($data) < 28) {
    return "";
  }
  $key = hex2bin(FLAG_ENCRYPT_KEY);
  $nonce = substr($data, 0, 12);
  $tag = substr($data, 12, 16);
  $cipher = substr($data, 28);
  $plain = openssl_decrypt($cipher, "aes-256-gcm", $key, OPENSSL_RAW_DATA, $nonce, $tag);
  return $plain === false ? "" : $plain;
}

// ─── PDO ─────────────────────────────────────────────────────────────────────

function get_pdo(): PDO
{
  static $pdo = null;
  if ($pdo !== null) {
    return $pdo;
  }
  try {
    $pdo = new PDO(
      sprintf("mysql:host=%s;dbname=%s;charset=utf8mb4", DB_HOST, DB_NAME),
      DB_USER,
      DB_PASSWORD,
      [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
      ],
    );
  } catch (\PDOException) {
    json_error("Erreur de connexion à la base de données", 503);
  }
  return $pdo;
}

// ─── CSRF ─────────────────────────────────────────────────────────────────────

function generate_csrf_token(): string
{
  if (empty($_SESSION["csrf_token"])) {
    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
  }
  return $_SESSION["csrf_token"];
}

/**
 * Vérifie le token CSRF sur toutes les requêtes POST.
 * Le frontend (db.ts) envoie le token dans le header X-CSRF-Token.
 * Les requêtes GET/OPTIONS ne sont pas mutantes : pas de vérification.
 */
function verify_csrf(): void
{
  if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    return;
  }

  // Pas de session active = pas de token à vérifier (login, register)
  if (empty($_SESSION["csrf_token"])) {
    return;
  }

  $incoming = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
  if (!hash_equals($_SESSION["csrf_token"], $incoming)) {
    json_error("Token CSRF invalide ou manquant", 403);
  }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * Vérifie un compteur de tentatives. La clé est libre : "1.2.3.4" pour les
 * connexions, "reg:1.2.3.4" pour les inscriptions. Chaque usage a donc son
 * propre seuil sans se marcher dessus.
 */
function check_rate_limit(
  string $key,
  int $max = RATE_LIMIT_MAX,
  int $window = RATE_LIMIT_WINDOW
): void {
  $pdo = get_pdo();
  // window_start est un DATETIME — comparaison native SQL, pas de timestamp Unix
  $pdo
    ->prepare(
      "DELETE FROM rate_limits WHERE ip = ? AND window_start < DATE_SUB(NOW(), INTERVAL ? SECOND)",
    )
    ->execute([$key, $window]);
  $stmt = $pdo->prepare("SELECT attempts FROM rate_limits WHERE ip = ?");
  $stmt->execute([$key]);
  $row = $stmt->fetch();
  if ($row && $row["attempts"] >= $max) {
    $minutes = max(1, (int) ceil($window / 60));
    json_error("Trop de tentatives. Réessayez dans $minutes minutes.", 429);
  }
}
function increment_rate_limit(string $key): void
{
  get_pdo()
    ->prepare(
      'INSERT INTO rate_limits (ip, attempts, window_start) VALUES (?, 1, NOW())
         ON DUPLICATE KEY UPDATE attempts = attempts + 1',
    )
    ->execute([$key]);
}
function reset_rate_limit(string $key): void
{
  get_pdo()
    ->prepare("DELETE FROM rate_limits WHERE ip = ?")
    ->execute([$key]);
}

/**
 * Rate limiting par utilisateur pour les soumissions de flag erronées.
 * Utilise la même table rate_limits avec la clé "flag:{userId}".
 * Bloque après FLAG_ATTEMPT_MAX mauvaises réponses sur FLAG_ATTEMPT_WINDOW secondes.
 */
function check_flag_rate_limit(int $userId): void
{
  $key = "flag:" . $userId;
  $pdo = get_pdo();
  $pdo
    ->prepare(
      "DELETE FROM rate_limits WHERE ip = ? AND window_start < DATE_SUB(NOW(), INTERVAL " .
        FLAG_ATTEMPT_WINDOW .
        " SECOND)",
    )
    ->execute([$key]);
  $stmt = $pdo->prepare("SELECT attempts FROM rate_limits WHERE ip = ?");
  $stmt->execute([$key]);
  $row = $stmt->fetch();
  if ($row && $row["attempts"] >= FLAG_ATTEMPT_MAX) {
    json_error("Trop de tentatives incorrectes. Réessayez dans 5 minutes.", 429);
  }
}
function increment_flag_rate_limit(int $userId): void
{
  $key = "flag:" . $userId;
  get_pdo()
    ->prepare(
      'INSERT INTO rate_limits (ip, attempts, window_start) VALUES (?, 1, NOW())
         ON DUPLICATE KEY UPDATE attempts = attempts + 1',
    )
    ->execute([$key]);
}

// ─── Token reset ─────────────────────────────────────────────────────────────

function generate_reset_token(int $user_id): string
{
  $expires = time() + RESET_EXPIRY;
  $sig = hash_hmac("sha256", "$user_id:$expires", RESET_SECRET);
  return base64_encode("$user_id:$expires:$sig");
}
function verify_reset_token(string $token): ?array
{
  $decoded = base64_decode($token, true);
  if (!$decoded) {
    return null;
  }
  $parts = explode(":", $decoded);
  if (count($parts) !== 3) {
    return null;
  }
  [$user_id, $expires, $sig] = $parts;
  if (!hash_equals(hash_hmac("sha256", "$user_id:$expires", RESET_SECRET), $sig)) {
    return null;
  }
  if ((int) $expires < time()) {
    return null;
  }
  return ["user_id" => (int) $user_id];
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate_email(string $email): bool
{
  return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}
function validate_password(string $password): ?string
{
  if (strlen($password) < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères";
  }
  if (!preg_match("/[A-Z]/", $password)) {
    return "Le mot de passe doit contenir au moins une majuscule";
  }
  if (!preg_match("/[0-9]/", $password)) {
    return "Le mot de passe doit contenir au moins un chiffre";
  }
  return null;
}

// ─── Session helpers ─────────────────────────────────────────────────────────

function require_auth(): array
{
  if (empty($_SESSION["user_id"])) {
    json_error("Non authentifié", 401);
  }
  return [
    "id" => (int) $_SESSION["user_id"],
    "username" => $_SESSION["username"],
    "is_admin" => (bool) ($_SESSION["is_admin"] ?? false),
  ];
}
function require_admin(): array
{
  $user = require_auth();
  if (!$user["is_admin"]) {
    json_error('Accès réservé à l\'administrateur', 403);
  }
  return $user;
}

// ─── Classement ──────────────────────────────────────────────────────────────

function compute_ranking_from_db(PDO $pdo): array
{
  return $pdo
    ->query(
      'SELECT u.id AS user_id, u.username,
                COUNT(s.id) AS flags_found,
                COALESCE(SUM(c.points), 0) +
                COALESCE((SELECT SUM(bm.points) FROM bonus_malus bm WHERE bm.user_id = u.id), 0) AS total_points
         FROM users u
         LEFT JOIN submissions s ON s.user_id = u.id
         LEFT JOIN challenges  c ON c.id      = s.challenge_id
         WHERE u.is_admin = 0
         GROUP BY u.id, u.username
         ORDER BY total_points DESC, flags_found DESC',
    )
    ->fetchAll();
}

// ─── Achievements auto ────────────────────────────────────────────────────────

function evaluate_achievements_for_user(PDO $pdo, int $userId): void
{
  $user = $pdo->prepare("SELECT id, username, is_admin FROM users WHERE id = ?");
  $user->execute([$userId]);
  $u = $user->fetch();
  if (!$u || $u["is_admin"]) {
    return;
  }

  $flagsStmt = $pdo->prepare(
    'SELECT s.id, s.challenge_id, s.submitted_at, c.category, c.points
         FROM submissions s JOIN challenges c ON c.id = s.challenge_id WHERE s.user_id = ?',
  );
  $flagsStmt->execute([$userId]);
  $userFlags = $flagsStmt->fetchAll();

  $totalPoints = (int) array_sum(array_column($userFlags, "points"));
  $bmStmt = $pdo->prepare("SELECT SUM(points) FROM bonus_malus WHERE user_id = ?");
  $bmStmt->execute([$userId]);
  $totalPoints += (int) $bmStmt->fetchColumn();

  $achStmt = $pdo->prepare(
    'SELECT a.* FROM achievements a WHERE a.id NOT IN
         (SELECT achievement_id FROM user_achievements WHERE user_id = ?)',
  );
  $achStmt->execute([$userId]);
  $achievements = $achStmt->fetchAll();

  $totalChallenges = (int) $pdo->query("SELECT COUNT(*) FROM challenges")->fetchColumn();
  $ranking = compute_ranking_from_db($pdo);
  $userRank = 999;
  foreach ($ranking as $i => $row) {
    if ((int) $row["user_id"] === $userId) {
      $userRank = $i + 1;
      break;
    }
  }

  $solvedIds = array_column($userFlags, "challenge_id");
  $categoriesWithFlags = array_unique(array_column($userFlags, "category"));

  // ── Pré-calculs hoistés hors de la boucle ────────────────────────────────
  // Tous les challenges groupés par catégorie (pour category_perfect)
  $allChals = $pdo->query("SELECT id, category FROM challenges")->fetchAll();
  $chalsByCategory = [];
  $allChalIds = [];
  foreach ($allChals as $ch) {
    $chalsByCategory[$ch["category"]][] = (int) $ch["id"];
    $allChalIds[] = (int) $ch["id"];
  }
  // Catégories qui ont au moins un challenge (pour all_categories)
  $categoriesWithChals = array_keys($chalsByCategory);
  // Premier solver (pour first_blood) — une seule requête pour tous les achievements
  $firstBlood = $pdo
    ->query(
      'SELECT s.user_id FROM submissions s JOIN users u ON u.id = s.user_id
         WHERE u.is_admin = 0 ORDER BY s.submitted_at ASC LIMIT 1',
    )
    ->fetch();
  $firstBloodUserId = $firstBlood ? (int) $firstBlood["user_id"] : null;
  // ─────────────────────────────────────────────────────────────────────────

  foreach ($achievements as $achievement) {
    $unlocked = false;
    $cond = $achievement["condition_type"];
    $val = (int) $achievement["condition_value"];
    $cat = $achievement["condition_category"] ?? null;

    switch ($cond) {
      case "flags_count":
        $unlocked = count($userFlags) >= $val;
        break;
      case "points_total":
        $unlocked = $totalPoints >= $val;
        break;
      case "category_flags":
        if ($cat) {
          $unlocked = count(array_filter($userFlags, fn($f) => $f["category"] === $cat)) >= $val;
        }
        break;
      case "manual":
        break;
      case "first_blood":
        $unlocked = $firstBloodUserId !== null && $firstBloodUserId === $userId;
        break;
      case "speed_runner":
        $sorted = $userFlags;
        usort($sorted, fn($a, $b) => strcmp($a["submitted_at"], $b["submitted_at"]));
        $target = max($val, 1);
        for ($i = 0; $i <= count($sorted) - $target; $i++) {
          if (
            strtotime($sorted[$i + $target - 1]["submitted_at"]) -
              strtotime($sorted[$i]["submitted_at"]) <=
            1800
          ) {
            $unlocked = true;
            break;
          }
        }
        break;
      case "category_perfect":
        foreach ($chalsByCategory as $catName => $chalIds) {
          if (count($chalIds) < 2) {
            continue;
          }
          $solvedInCat = array_column(
            array_filter($userFlags, fn($f) => $f["category"] === $catName),
            "challenge_id",
          );
          if (count(array_diff($chalIds, $solvedInCat)) === 0) {
            $unlocked = true;
            break;
          }
        }
        break;
      case "night_owl":
        foreach ($userFlags as $f) {
          if ((int) date("H", strtotime($f["submitted_at"])) < 5) {
            $unlocked = true;
            break;
          }
        }
        break;
      case "all_categories":
        $required = ["OSINT", "Stéganographie", "Cryptographie", "Web", "Forensic", "Misc"];
        $relevant = array_intersect($required, $categoriesWithChals);
        $unlocked =
          count($relevant) >= 3 && count(array_diff($relevant, $categoriesWithFlags)) === 0;
        break;
      case "top3":
        if (count($ranking) >= $val + 1) {
          $unlocked = $userRank <= $val;
        }
        break;
      case "all_challenges":
        if ($totalChallenges >= 3) {
          $unlocked = count(array_diff($allChalIds, $solvedIds)) === 0;
        }
        break;
    }

    if ($unlocked) {
      $pdo
        ->prepare(
          "INSERT IGNORE INTO user_achievements (id, user_id, achievement_id, unlocked_at) VALUES (UUID(), ?, ?, NOW())",
        )
        ->execute([$userId, $achievement["id"]]);
    }
  }
}

// ─── Mail ────────────────────────────────────────────────────────────────────

function send_reset_email(string $to_email, string $to_name, string $token): bool
{
  $reset_url = FRONTEND_URL . "/reset-password?token=" . urlencode($token);
  $safe_name = htmlspecialchars($to_name, ENT_QUOTES, "UTF-8");
  $safe_url = htmlspecialchars($reset_url, ENT_QUOTES, "UTF-8");
  $subject =
    "=?UTF-8?B?" . base64_encode("🔐 Réinitialisation de votre mot de passe CTF Arena") . "?=";
  $headers =
    "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: " .
    SMTP_FROM_NAME .
    " <" .
    SMTP_FROM .
    ">";
  $body =
    "<html><body style='background:#0a0a1a;font-family:system-ui,sans-serif;padding:40px'>" .
    "<div style='max-width:520px;margin:auto;background:#0f0f2a;border:1px solid rgba(139,92,246,0.2);border-radius:16px;padding:32px'>" .
    "<h1 style='color:#fff'>🏴 CTF Arena</h1>" .
    "<p style='color:rgba(196,181,253,0.9)'>Bonjour <strong>$safe_name</strong>,</p>" .
    "<p style='color:rgba(196,181,253,0.7)'>Cliquez ci-dessous pour réinitialiser votre mot de passe.</p>" .
    "<a href='$safe_url' style='display:inline-block;background:#8b5cf6;color:#fff;padding:14px 32px;border-radius:12px;font-weight:700;text-decoration:none;margin:16px 0'>Réinitialiser</a>" .
    "<p style='color:rgba(196,181,253,0.5);font-size:12px'>Ce lien expire dans 1 heure.</p>" .
    "</div></body></html>";
  return mail($to_email, $subject, $body, $headers);
}

// ─── Fichiers challenge ───────────────────────────────────────────────────────

// Extensions autorisées pour les fichiers de challenge.
// PHP, phar, phtml, htaccess, etc. sont volontairement absents.
const UPLOAD_ALLOWED_EXT = [
  "zip",
  "tar",
  "gz",
  "7z",
  "rar",
  "bz2",
  "txt",
  "md",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp", // svg retiré — risque XSS (image/svg+xml exécute du JS)
  "mp3",
  "wav",
  "ogg",
  "mp4",
  "avi",
  "mkv",
  "pcap",
  "pcapng",
  "bin",
  "hex",
  "raw",
  "img",
  "iso",
  "py",
  "c",
  "cpp",
  "rs",
  "go",
  "java", // js retiré — rendu navigateur possible
  // html, css, xml, yaml retirés — types rendus par le navigateur, risque XSS si nginx contourné
  "json",
  "csv",
  "exe",
  "elf",
  "so",
  "dll",
  "apk",
];

// Taille maximale par fichier (10 Mo)
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
// Répertoire de stockage des uploads — utilisé aussi dans download_file pour la
// vérification de confinement (realpath check).
const UPLOAD_DIR = "/var/www/html/uploads/challenges";

function handle_challenge_files(PDO $pdo, int $challengeId, array $files): void
{
  $dir = UPLOAD_DIR . "/";
  if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
  }

  foreach ($files as $file) {
    if (empty($file["name"]) || empty($file["content"])) {
      continue;
    }

    // 1. Décoder le contenu base64 et vérifier la taille
    $decoded = base64_decode($file["content"], true);
    if ($decoded === false || strlen($decoded) > UPLOAD_MAX_BYTES) {
      continue;
    }

    // 2. Extraire l'extension et la valider contre la liste blanche
    $originalName = basename((string) $file["name"]);
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($ext === "" || !in_array($ext, UPLOAD_ALLOWED_EXT, true)) {
      continue;
    }

    // 3. Vérifier le type MIME réel du contenu (défense en profondeur contre
    //    les extensions trompeuses). Les types exécutables sont refusés.
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->buffer($decoded);
    // Allowlist MIME stricte — seuls les types CTF utiles sont acceptés (defense in depth)
    $allowedMime = [
      // Archives
      "application/zip",
      "application/x-tar",
      "application/gzip",
      "application/x-7z-compressed",
      "application/x-bzip2",
      // Texte brut / données
      "text/plain",
      "application/pdf",
      "text/csv",
      "application/json",
      // Images raster uniquement (pas SVG, pas HTML)
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      // Audio / vidéo
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "video/mp4",
      "video/x-msvideo",
      "video/x-matroska",
      // Captures réseau / binaires CTF
      "application/vnd.tcpdump.pcap",
      "application/octet-stream",
    ];
    if ($mimeType === false || !in_array($mimeType, $allowedMime, true)) {
      continue;
    }

    // 4. Construire un nom de stockage sûr (hex aléatoire + base nettoyée + extension)
    $baseName = preg_replace("/[^a-zA-Z0-9\-]/", "_", pathinfo($originalName, PATHINFO_FILENAME));
    $path = $dir . bin2hex(random_bytes(16)) . "_" . $baseName . "." . $ext;

    file_put_contents($path, $decoded);
    $pdo
      ->prepare("INSERT INTO challenge_files (challenge_id, file_name, file_path) VALUES (?, ?, ?)")
      ->execute([$challengeId, $originalName, $path]);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═════════════════════════════════════════════════════════════════════════════

$action = $_GET["action"] ?? "";

// Vérification CSRF sur toutes les requêtes POST authentifiées
verify_csrf();

switch ($action) {
  // ── CSRF ──────────────────────────────────────────────────────────────────
  case "csrf":
    json_response(["ok" => true, "token" => generate_csrf_token()]);

  // ── Inscription ───────────────────────────────────────────────────────────
  case "register":
    $ip = get_client_ip();
    check_rate_limit("reg:$ip", REGISTER_MAX, REGISTER_WINDOW);
    $body = get_body();
    $username = sanitize_string($body["username"] ?? "");
    $email = strtolower(sanitize_string($body["email"] ?? ""));
    $password = $body["password"] ?? "";
    $age = (int) ($body["age"] ?? 0);
    $gender = sanitize_string($body["gender"] ?? "");

    if (strlen($username) < 3 || strlen($username) > 30) {
      log_activity("register_fail", null, $username, ["reason" => "validation"]);
      json_error("Pseudo invalide (3-30 caractères)");
    }
    if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $username)) {
      json_error("Pseudo invalide (lettres, chiffres, _ et -)");
    }
    if (strtoupper($username) === "ALPHATEN") {
      json_error("Ce pseudo est réservé");
    }
    if (!validate_email($email)) {
      json_error("Adresse email invalide");
    }
    if ($err = validate_password($password)) {
      json_error($err);
    }
    if ($age < 13 || $age > 120) {
      json_error("Âge invalide (minimum 13 ans)");
    }
    if (!in_array($gender, ["male", "female", "other"], true)) {
      json_error("Genre invalide");
    }
    $playMode = sanitize_string($body["play_mode"] ?? "solo");
    if (!in_array($playMode, ["solo", "multiplayer"], true)) {
      $playMode = "solo";
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1");
    $stmt->execute([$username, $email]);
    if ($stmt->fetch()) {
      $checkU = $pdo->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
      $checkU->execute([$username]);
      if ($checkU->fetch()) {
        log_activity("register_fail", null, $username, ["reason" => "username_taken"]);
        json_error("Ce pseudo est déjà utilisé");
      } else {
        log_activity("register_fail", null, $username, ["reason" => "email_taken"]);
        json_error("Cette adresse email est déjà utilisée");
      }
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ["cost" => 12]);
    $pdo
      ->prepare(
        "INSERT INTO users (username, email, password_hash, age, gender, play_mode, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())",
      )
      ->execute([$username, $email, $hash, $age, $gender, $playMode]);
    $user_id = (int) $pdo->lastInsertId();

    // Compter chaque inscription réussie pour limiter la création en masse.
    // Compteur "reg:" séparé : une inscription ne consomme pas le quota de
    // connexion, et un joueur bloqué en connexion peut encore s'inscrire.
    increment_rate_limit("reg:$ip");
    session_regenerate_id(true);
    $_SESSION["user_id"] = $user_id;
    $_SESSION["username"] = $username;
    $_SESSION["is_admin"] = false;
    generate_csrf_token();

    log_activity("register_success", (int) $user_id, $username);
    notify_ws("players");
    json_response([
      "ok" => true,
      "user" => [
        "id" => $user_id,
        "username" => $username,
        "email" => $email,
        "age" => $age,
        "gender" => $gender,
        "playMode" => $playMode,
        "isAdmin" => false,
      ],
      "csrf" => $_SESSION["csrf_token"],
    ]);

  // ── Connexion ─────────────────────────────────────────────────────────────
  case "login":
    $body = get_body();
    $ip = get_client_ip();
    check_rate_limit($ip);
    $identifier = sanitize_string($body["identifier"] ?? "");
    $password = $body["password"] ?? "";
    if (empty($identifier) || empty($password)) {
      json_error("Identifiant et mot de passe requis");
    }

    $pdo = get_pdo();

    if (strtoupper($identifier) === "ALPHATEN") {
      $stmt = $pdo->prepare(
        "SELECT id, username, password_hash FROM users WHERE username = ? AND is_admin = 1 LIMIT 1",
      );
      $stmt->execute(["ALPHATEN"]);
      $user = $stmt->fetch();
      if (!$user || !password_verify($password, $user["password_hash"])) {
        increment_rate_limit($ip);
        json_error("Identifiant ou mot de passe incorrect", 401);
      }
      session_regenerate_id(true);
      $_SESSION["user_id"] = (int) $user["id"];
      $_SESSION["username"] = "ALPHATEN";
      $_SESSION["is_admin"] = true;
      reset_rate_limit($ip);
      generate_csrf_token();
      json_response([
        "ok" => true,
        "user" => [
          "id" => (int) $user["id"],
          "username" => "ALPHATEN",
          "email" => null,
          "isAdmin" => true,
        ],
        "csrf" => $_SESSION["csrf_token"],
      ]);
    }

    if (!validate_email($identifier)) {
      json_error("Veuillez entrer une adresse email valide");
    }
    $stmt = $pdo->prepare(
      "SELECT id, username, email, password_hash, age, gender, play_mode FROM users WHERE email = ? AND is_admin = 0 LIMIT 1",
    );
    $stmt->execute([strtolower($identifier)]);
    $user = $stmt->fetch();
    if (!$user) {
      increment_rate_limit($ip);
      log_activity("login_fail", null, $identifier, ["reason" => "not_found"]);
      json_error("Email ou mot de passe incorrect", 401);
    }
    if (!password_verify($password, $user["password_hash"])) {
      increment_rate_limit($ip);
      log_activity("login_fail", (int) $user["id"], $user["username"], [
        "reason" => "wrong_password",
      ]);
      json_error("Email ou mot de passe incorrect", 401);
    }
    if (password_needs_rehash($user["password_hash"], PASSWORD_BCRYPT, ["cost" => 12])) {
      $pdo
        ->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
        ->execute([password_hash($password, PASSWORD_BCRYPT, ["cost" => 12]), $user["id"]]);
    }
    session_regenerate_id(true);
    $_SESSION["user_id"] = (int) $user["id"];
    $_SESSION["username"] = $user["username"];
    $_SESSION["is_admin"] = false;
    reset_rate_limit($ip);
    generate_csrf_token();
    log_activity("login_success", (int) $user["id"], $user["username"]);
    json_response([
      "ok" => true,
      "user" => [
        "id" => (int) $user["id"],
        "username" => $user["username"],
        "email" => $user["email"],
        "age" => (int) $user["age"],
        "gender" => $user["gender"],
        "playMode" => $user["play_mode"],
        "isAdmin" => false,
      ],
      "csrf" => $_SESSION["csrf_token"],
    ]);

  // ── Déconnexion ───────────────────────────────────────────────────────────
  case "logout":
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
      $p = session_get_cookie_params();
      setcookie(
        session_name(),
        "",
        time() - 42000,
        $p["path"],
        $p["domain"],
        $p["secure"],
        $p["httponly"],
      );
    }
    session_destroy();
    json_response(["ok" => true]);

  // ── Utilisateur courant ───────────────────────────────────────────────────
  case "me":
    if (empty($_SESSION["user_id"])) {
      json_response(["ok" => false, "user" => null]);
    }
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
      "SELECT id, username, email, age, gender, play_mode, is_admin FROM users WHERE id = ? LIMIT 1",
    );
    $stmt->execute([$_SESSION["user_id"]]);
    $user = $stmt->fetch();
    if (!$user) {
      session_destroy();
      json_response(["ok" => false, "user" => null]);
    }
    generate_csrf_token();
    json_response([
      "ok" => true,
      "user" => [
        "id" => (int) $user["id"],
        "username" => $user["username"],
        "email" => $user["email"],
        "age" => $user["age"] !== null ? (int) $user["age"] : null,
        "gender" => $user["gender"],
        "playMode" => $user["play_mode"],
        "isAdmin" => (bool) $user["is_admin"],
      ],
      "csrf" => $_SESSION["csrf_token"],
    ]);

  // ── Mot de passe oublié ───────────────────────────────────────────────────
  case "forgot_password":
    $body = get_body();
    $email = strtolower(sanitize_string($body["email"] ?? ""));
    if (!validate_email($email)) {
      json_response(["ok" => true, "message" => "Si un compte existe, un email a été envoyé."]);
    }
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
      "SELECT id, username FROM users WHERE email = ? AND is_admin = 0 LIMIT 1",
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) {
      $check = $pdo->prepare(
        "SELECT created_at FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      );
      $check->execute([$user["id"]]);
      $last = $check->fetch();
      if (!$last || time() - strtotime($last["created_at"]) >= 300) {
        $token = generate_reset_token((int) $user["id"]);
        $pdo
          ->prepare(
            "INSERT INTO password_resets (user_id, token_hash, created_at, used) VALUES (?, ?, NOW(), 0)",
          )
          ->execute([$user["id"], hash("sha256", $token)]);
        send_reset_email($email, $user["username"], $token);
      }
    }
    json_response(["ok" => true, "message" => "Si un compte existe, un email a été envoyé."]);

  case "validate_reset_token":
    // Accepter le token en POST (body) ou GET pour compatibilité email links
    $body = get_body();
    $token = $body["token"] ?? ($_GET["token"] ?? "");
    $data = verify_reset_token($token);
    if (!$data) {
      json_error("Token invalide ou expiré", 400);
    }
    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT used FROM password_resets WHERE token_hash = ? AND user_id = ?");
    $stmt->execute([hash("sha256", $token), $data["user_id"]]);
    $row = $stmt->fetch();
    if (!$row || $row["used"]) {
      json_error("Ce lien a déjà été utilisé", 400);
    }
    json_response(["ok" => true, "valid" => true]);

  case "reset_password":
    $body = get_body();
    $token = $body["token"] ?? "";
    $password = $body["password"] ?? "";
    $data = verify_reset_token($token);
    if (!$data) {
      json_error("Token invalide ou expiré", 400);
    }
    if ($err = validate_password($password)) {
      json_error($err);
    }
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
      "SELECT id, used FROM password_resets WHERE token_hash = ? AND user_id = ?",
    );
    $stmt->execute([hash("sha256", $token), $data["user_id"]]);
    $row = $stmt->fetch();
    if (!$row || $row["used"]) {
      json_error("Ce lien a déjà été utilisé", 400);
    }
    $pdo->beginTransaction();
    try {
      $pdo
        ->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
        ->execute([password_hash($password, PASSWORD_BCRYPT, ["cost" => 12]), $data["user_id"]]);
      $pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ?")->execute([$row["id"]]);
      $pdo->commit();
    } catch (\Throwable) {
      $pdo->rollBack();
      json_error("Erreur lors de la réinitialisation", 500);
    }
    json_response(["ok" => true, "message" => "Mot de passe mis à jour avec succès"]);

  // ════════════════════════════════════════════════════════════════════════
  // CATÉGORIES
  // ════════════════════════════════════════════════════════════════════════

  case "get_categories":
    // Public — pas besoin d'être connecté pour lister les catégories
    $pdo = get_pdo();
    $stmt = $pdo->query(
      'SELECT id, name, description, description_md, icon, color, sort_order
             FROM categories ORDER BY sort_order ASC, name ASC',
    );
    $categories = array_map(
      fn($r) => [
        "id" => $r["id"],
        "name" => $r["name"],
        "description" => $r["description"],
        "descriptionMd" => $r["description_md"] ?? "",
        "icon" => $r["icon"],
        "color" => $r["color"],
        "sortOrder" => (int) $r["sort_order"],
      ],
      $stmt->fetchAll(),
    );
    json_response(["ok" => true, "categories" => $categories]);

  case "add_category":
    require_admin();
    $body = get_body();
    $id = strtoupper(sanitize_string($body["id"] ?? "", 30));
    $name = sanitize_string($body["name"] ?? "", 60);
    $desc = sanitize_string($body["description"] ?? "", 500);
    $md = sanitize_string($body["descriptionMd"] ?? "", 5000);
    $icon = sanitize_string($body["icon"] ?? "🏴", 10);
    $color = sanitize_string($body["color"] ?? "#8b5cf6", 7);

    if (!$id || !$name) {
      json_error("ID et nom requis");
    }
    if (!preg_match('/^[A-ZÀ-Ÿa-z0-9_\-]+$/u', $id)) {
      json_error("ID invalide (lettres, chiffres, _ et -)");
    }
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
      json_error("Couleur invalide (format #RRGGBB)");
    }

    $pdo = get_pdo();
    $check = $pdo->prepare("SELECT id FROM categories WHERE id = ?");
    $check->execute([$id]);
    if ($check->fetch()) {
      json_error("Une catégorie avec cet ID existe déjà");
    }

    $maxOrder = (int) $pdo
      ->query("SELECT COALESCE(MAX(sort_order), 0) FROM categories")
      ->fetchColumn();
    $pdo
      ->prepare(
        "INSERT INTO categories (id, name, description, description_md, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      ->execute([$id, $name, $desc, $md, $icon, $color, $maxOrder + 1]);

    json_response(["ok" => true, "id" => $id]);

  case "update_category":
    require_admin();
    $body = get_body();
    $id = sanitize_string($body["id"] ?? "", 30);
    $name = sanitize_string($body["name"] ?? "", 60);
    $desc = sanitize_string($body["description"] ?? "", 500);
    $md = sanitize_string($body["descriptionMd"] ?? "", 5000);
    $icon = sanitize_string($body["icon"] ?? "🏴", 10);
    $color = sanitize_string($body["color"] ?? "#8b5cf6", 7);

    if (!$id || !$name) {
      json_error("ID et nom requis");
    }
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
      json_error("Couleur invalide (format #RRGGBB)");
    }

    $pdo = get_pdo();
    $check = $pdo->prepare("SELECT id FROM categories WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) {
      json_error("Catégorie introuvable");
    }

    $pdo
      ->prepare(
        "UPDATE categories SET name=?, description=?, description_md=?, icon=?, color=? WHERE id=?",
      )
      ->execute([$name, $desc, $md, $icon, $color, $id]);

    json_response(["ok" => true]);

  case "delete_category":
    require_admin();
    $body = get_body();
    $id = sanitize_string($body["id"] ?? "", 30);
    if (!$id) {
      json_error("ID manquant");
    }

    $pdo = get_pdo();
    $check = $pdo->prepare("SELECT COUNT(*) FROM challenges WHERE category = ?");
    $check->execute([$id]);
    $count = (int) $check->fetchColumn();
    if ($count > 0) {
      json_error("Impossible de supprimer : $count challenge(s) utilisent cette catégorie.");
    }

    // Suppression + renumérotation dans une transaction pour éviter un état incohérent
    $pdo->beginTransaction();
    try {
      $pdo->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
      // Renuméroter sort_order pour combler le trou laissé par la suppression
      $remaining = $pdo
        ->query("SELECT id FROM categories ORDER BY sort_order ASC, name ASC")
        ->fetchAll();
      foreach ($remaining as $i => $row) {
        $pdo
          ->prepare("UPDATE categories SET sort_order = ? WHERE id = ?")
          ->execute([$i + 1, $row["id"]]);
      }
      $pdo->commit();
    } catch (\Throwable) {
      $pdo->rollBack();
      json_error("Erreur lors de la suppression de la catégorie", 500);
    }

    json_response(["ok" => true]);

  case "reorder_categories":
    require_admin();
    $body = get_body();
    $order = $body["order"] ?? [];
    if (!is_array($order) || empty($order)) {
      json_error("Ordre invalide");
    }

    $pdo = get_pdo();
    $pdo->beginTransaction();
    try {
      foreach ($order as $i => $catId) {
        $catId = sanitize_string((string) $catId, 30);
        if (!$catId) {
          continue;
        }
        $pdo
          ->prepare("UPDATE categories SET sort_order = ? WHERE id = ?")
          ->execute([$i + 1, $catId]);
      }
      $pdo->commit();
    } catch (\Throwable) {
      $pdo->rollBack();
      json_error("Erreur lors du réordonnancement", 500);
    }

    json_response(["ok" => true]);

  // ════════════════════════════════════════════════════════════════════════
  // CHALLENGES
  // ════════════════════════════════════════════════════════════════════════

  case "get_challenges":
    require_auth();
    $pdo = get_pdo();
    $stmt = $pdo->query(
      'SELECT c.id, c.title, c.category, c.points, c.description,
                    c.difficulty_mode, c.difficulty, c.created_at
             FROM challenges c
             JOIN categories cat ON cat.id = c.category
             ORDER BY cat.sort_order ASC, c.points ASC',
    );
    $challenges = $stmt->fetchAll();
    // Retourner uniquement les métadonnées — pas de file_get_contents pour éviter le DoS
    // Le contenu est servi à la demande via l'endpoint download_file
    $filesStmt = $pdo->query("SELECT id, challenge_id, file_name FROM challenge_files");
    $filesByChal = [];
    foreach ($filesStmt->fetchAll() as $f) {
      $filesByChal[$f["challenge_id"]][] = [
        "id" => $f["id"],
        "name" => $f["file_name"],
        "url" => "/api.php?action=download_file&id=" . (int) $f["id"],
      ];
    }
    foreach ($challenges as &$ch) {
      $ch["files"] = $filesByChal[$ch["id"]] ?? [];
    }
    json_response(["ok" => true, "challenges" => $challenges]);

  // ── Téléchargement d'un fichier challenge ─────────────────────────────────
  case "download_file":
    require_auth();
    $fileId = (int) ($_GET["id"] ?? 0);
    if (!$fileId) {
      json_error("Identifiant fichier manquant", 400);
    }
    $stmt = get_pdo()->prepare("SELECT file_name, file_path FROM challenge_files WHERE id = ?");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch();
    if (!$file) {
      json_error("Fichier introuvable", 404);
    }

    // Défense en profondeur : vérifier que le chemin résolu reste dans le
    // répertoire uploads autorisé, même si la BDD était altérée.
    $allowed = realpath(UPLOAD_DIR);
    $real = realpath($file["file_path"]);
    if ($real === false || $allowed === false || !str_starts_with($real, $allowed . "/")) {
      json_error("Accès refusé", 403);
    }
    if (!file_exists($real)) {
      json_error("Fichier introuvable", 404);
    }

    header("Content-Type: application/octet-stream");
    header('Content-Disposition: attachment; filename="' . rawurlencode($file["file_name"]) . '"');
    header("Content-Length: " . filesize($real));
    header("X-Content-Type-Options: nosniff");
    readfile($real);
    exit();

  case "add_challenge":
    $auth = require_admin();
    $body = get_body();
    $title = sanitize_string($body["title"] ?? "", 200);
    $category = sanitize_string($body["category"] ?? "", 30);
    $points = max(1, (int) ($body["points"] ?? 100));
    $desc = sanitize_string($body["description"] ?? "", 5000);
    $flag = trim($body["flag"] ?? "");
    $diffMode = in_array($body["difficultyMode"] ?? "auto", ["auto", "easy", "medium", "hard"], true)
      ? ($body["difficultyMode"] ?? "auto")
      : "auto";
    $diff = in_array($body["difficulty"] ?? null, ["easy", "medium", "hard"])
      ? $body["difficulty"]
      : null;
    if (!$title || !$flag || !$desc) {
      json_error("Champs manquants");
    }

    $pdo = get_pdo();
    // Vérifier que la catégorie existe
    $catCheck = $pdo->prepare("SELECT id FROM categories WHERE id = ?");
    $catCheck->execute([$category]);
    if (!$catCheck->fetch()) {
      json_error("Catégorie introuvable");
    }

    $pdo
      ->prepare(
        'INSERT INTO challenges (title, category, points, description, flag_encrypted, difficulty_mode, difficulty, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      )
      ->execute([$title, $category, $points, $desc, encrypt_flag($flag), $diffMode, $diff]);
    $id = (int) $pdo->lastInsertId();
    if (!empty($body["files"]) && is_array($body["files"])) {
      handle_challenge_files($pdo, $id, $body["files"]);
    }
    log_activity("challenge_created", (int) $auth["id"], $auth["username"], ["title" => $title]);
    notify_ws("challenges");
    json_response(["ok" => true, "id" => $id]);

  case "update_challenge":
    $auth = require_admin();
    $body = get_body();
    $id = (int) ($body["id"] ?? 0);
    $title = sanitize_string($body["title"] ?? "", 200);
    $category = sanitize_string($body["category"] ?? "", 30);
    $points = max(1, (int) ($body["points"] ?? 100));
    $desc = sanitize_string($body["description"] ?? "", 5000);
    $flag = trim($body["flag"] ?? "");
    $diffMode = in_array($body["difficultyMode"] ?? "auto", ["auto", "easy", "medium", "hard"], true)
      ? ($body["difficultyMode"] ?? "auto")
      : "auto";
    $diff = in_array($body["difficulty"] ?? null, ["easy", "medium", "hard"])
      ? $body["difficulty"]
      : null;
    if (!$id || !$title || !$flag || !$desc) {
      json_error("Champs manquants");
    }

    $pdo = get_pdo();
    $pdo
      ->prepare(
        "UPDATE challenges SET title=?, category=?, points=?, description=?, flag_encrypted=?, difficulty_mode=?, difficulty=? WHERE id=?",
      )
      ->execute([$title, $category, $points, $desc, encrypt_flag($flag), $diffMode, $diff, $id]);

    // Distinguer fichiers existants à conserver (content vide, id numérique) des nouveaux uploads
    $keepIds = [];
    $newFiles = [];
    foreach ($body["files"] ?? [] as $f) {
      if (empty($f["content"]) && !empty($f["id"]) && ctype_digit((string) $f["id"])) {
        $keepIds[] = (int) $f["id"];
      } elseif (!empty($f["content"])) {
        $newFiles[] = $f;
      }
    }

    // Supprimer uniquement les fichiers retirés par l'admin, pas ceux conservés
    if (!empty($keepIds)) {
      $ph = implode(",", array_fill(0, count($keepIds), "?"));
      $pdo
        ->prepare("DELETE FROM challenge_files WHERE challenge_id = ? AND id NOT IN ($ph)")
        ->execute(array_merge([$id], $keepIds));
    } else {
      $pdo->prepare("DELETE FROM challenge_files WHERE challenge_id = ?")->execute([$id]);
    }

    if (!empty($newFiles)) {
      handle_challenge_files($pdo, $id, $newFiles);
    }
    log_activity("challenge_updated", (int) $auth["id"], $auth["username"], ["challengeId" => $id]);
    notify_ws("challenges");
    json_response(["ok" => true]);

  case "delete_challenge":
    $auth = require_admin();
    $body = get_body();
    $id = (int) ($body["id"] ?? 0);
    if (!$id) {
      json_error("ID manquant");
    }
    $pdo = get_pdo();
    $files = $pdo->prepare("SELECT file_path FROM challenge_files WHERE challenge_id = ?");
    $files->execute([$id]);
    foreach ($files->fetchAll() as $f) {
      if (file_exists($f["file_path"])) {
        unlink($f["file_path"]);
      }
    }
    $pdo->prepare("DELETE FROM challenges WHERE id = ?")->execute([$id]);
    log_activity("challenge_deleted", (int) $auth["id"], $auth["username"], ["challengeId" => $id]);
    notify_ws("challenges");
    json_response(["ok" => true]);

  case "submit_flag":
    $auth = require_auth();
    if ($auth["is_admin"]) {
      json_error("Les admins ne peuvent pas soumettre de flags");
    }
    $body = get_body();
    $challengeId = (int) ($body["challengeId"] ?? 0);
    $flagInput = trim($body["flag"] ?? "");
    $solveTimeMs = isset($body["solveTimeMs"])
      ? max(0, min((int) $body["solveTimeMs"], 86_400_000))
      : null;
    if (!$challengeId || !$flagInput) {
      json_error("Données manquantes");
    }

    // Bloquer le brute-force de flags avant toute requête coûteuse
    check_flag_rate_limit($auth["id"]);

    $pdo = get_pdo();

    // ── Vérifier l'état du CTF ──────────────────────────────────────────
    $stateStmt = $pdo->query("SELECT state_key, state_value FROM ctf_state");
    $ctfState = [];
    foreach ($stateStmt->fetchAll() as $row) {
      $ctfState[$row["state_key"]] = $row["state_value"];
    }
    if (($ctfState["game_started"] ?? "0") !== "1") {
      json_error("Le CTF n'a pas encore commencé");
    }
    // Après 18 min de brouillage (15 min + 3 min de grâce), toutes les soumissions sont bloquées
    if (!empty($ctfState["scramble_started_at"])) {
      $elapsed = time() - strtotime($ctfState["scramble_started_at"]);
      if ($elapsed >= 18 * 60) {
        json_error("Le CTF est terminé, les soumissions ne sont plus acceptées");
      }
    }

    // ── Récupérer le play_mode et l'équipe de l'utilisateur ────────────
    $userStmt = $pdo->prepare("SELECT play_mode FROM users WHERE id = ? LIMIT 1");
    $userStmt->execute([$auth["id"]]);
    $userData = $userStmt->fetch();
    $playMode = $userData["play_mode"] ?? "solo";

    $challenge = $pdo->prepare("SELECT flag_encrypted, points, title FROM challenges WHERE id = ?");
    $challenge->execute([$challengeId]);
    $chal = $challenge->fetch();
    if (!$chal) {
      json_error("Challenge introuvable");
    }

    $expectedFlag = strtolower(trim(decrypt_flag($chal["flag_encrypted"])));
    $submittedFlag = strtolower(trim($flagInput));
    if (!hash_equals($expectedFlag, $submittedFlag)) {
      // Vérifier si c'est un challenge mystère actif (flag soumis via banner mystère)
      $mysteryStmt = $pdo->query(
        'SELECT challenge_id, multiplier FROM active_event
                 WHERE is_mystery = 1 AND ends_at > NOW() ORDER BY id DESC LIMIT 1',
      );
      $mysteryEvent = $mysteryStmt->fetch();
      if ($mysteryEvent && (int) $mysteryEvent["challenge_id"] === $challengeId) {
        // Mauvaise réponse au mystère — on ne révèle pas le titre
        increment_flag_rate_limit($auth["id"]);
        json_response(["ok" => true, "correct" => false]);
      }
      increment_flag_rate_limit($auth["id"]);
      log_activity("flag_wrong", (int) $auth["id"], $auth["username"], [
        "challenge" => $chal["title"] ?? "",
      ]);
      json_response(["ok" => true, "correct" => false]);
    }

    // ── Vérifier si un événement actif booste ce challenge ──────────────
    $eventStmt = $pdo->query(
      'SELECT id, challenge_id, multiplier, is_mystery FROM active_event
              WHERE ends_at > NOW() ORDER BY id DESC LIMIT 1',
    );
    $activeEvent = $eventStmt->fetch();
    $eventBoost = 1;
    $eventId = null;
    if ($activeEvent) {
      // Mystery events : le boost est géré exclusivement par submit_mystery_flag.
      // submit_flag ne doit booste que les événements normaux (is_mystery = 0)
      // ciblant exactement ce challenge.
      $isNormalEventForThisChallenge =
        !(bool) $activeEvent["is_mystery"] && (int) $activeEvent["challenge_id"] === $challengeId;
      if ($isNormalEventForThisChallenge) {
        $eventBoost = (int) $activeEvent["multiplier"];
        $eventId = (int) $activeEvent["id"];
      }
    }
    $finalPoints = $chal["points"] * $eventBoost;

    if ($playMode === "multiplayer") {
      // ── Mode Multiplayer : flag au niveau équipe ────────────────────
      $teamStmt = $pdo->prepare("SELECT team_id FROM team_members WHERE user_id = ? LIMIT 1");
      $teamStmt->execute([$auth["id"]]);
      $teamRow = $teamStmt->fetch();
      if (!$teamRow) {
        json_error("Vous devez appartenir à une équipe pour jouer en mode Multiplayer");
      }

      $teamId = $teamRow["team_id"];

      // Vérifier si l'équipe a déjà résolu ce challenge
      $tsCheck = $pdo->prepare(
        "SELECT id FROM team_submissions WHERE team_id = ? AND challenge_id = ?",
      );
      $tsCheck->execute([$teamId, $challengeId]);
      if ($tsCheck->fetch()) {
        json_error("Challenge déjà résolu par votre équipe");
      }

      $pdo
        ->prepare(
          'INSERT INTO team_submissions (team_id, challenge_id, solved_by, solve_time_ms, submitted_at)
                 VALUES (?, ?, ?, ?, NOW())',
        )
        ->execute([$teamId, $challengeId, $auth["id"], $solveTimeMs]);
    } else {
      // ── Mode Solo : flag individuel ─────────────────────────────────
      $solvedCheck = $pdo->prepare(
        "SELECT id FROM submissions WHERE user_id = ? AND challenge_id = ?",
      );
      $solvedCheck->execute([$auth["id"], $challengeId]);
      if ($solvedCheck->fetch()) {
        json_error("Challenge déjà résolu");
      }

      $pdo
        ->prepare(
          'INSERT INTO submissions (user_id, challenge_id, solve_time_ms, submitted_at)
                 VALUES (?, ?, ?, NOW())',
        )
        ->execute([$auth["id"], $challengeId, $solveTimeMs]);

      evaluate_achievements_for_user($pdo, $auth["id"]);
    }

    log_activity("flag_correct", (int) $auth["id"], $auth["username"], [
      "challenge" => $chal["title"] ?? "",
      "points" => $finalPoints,
      "boost" => $eventBoost,
    ]);
    json_response([
      "ok" => true,
      "correct" => true,
      "points" => $finalPoints,
      "boost" => $eventBoost,
    ]);

  case "get_user_flags":
    $auth = require_auth();
    $userId = isset($_GET["userId"]) ? (int) $_GET["userId"] : $auth["id"];
    if (!$auth["is_admin"] && $userId !== $auth["id"]) {
      json_error("Accès refusé", 403);
    }
    $pdo = get_pdo();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 500)), 1000);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));

    // Déterminer le play_mode de l'utilisateur cible
    $pmStmt = $pdo->prepare("SELECT play_mode FROM users WHERE id = ? LIMIT 1");
    $pmStmt->execute([$userId]);
    $pmRow = $pmStmt->fetch();
    $playMode = $pmRow["play_mode"] ?? "solo";

    if ($playMode === "multiplayer") {
      // Retourner les flags de l'équipe (tous les membres en bénéficient)
      $stmt = $pdo->prepare(
        'SELECT ts.id, ? AS user_id, u_solver.username, ts.challenge_id,
                        c.title AS challenge_title, c.category, c.points,
                        ts.submitted_at, ts.solve_time_ms
                 FROM team_members tm
                 JOIN team_submissions ts ON ts.team_id = tm.team_id
                 JOIN challenges c ON c.id = ts.challenge_id
                 JOIN users u_solver ON u_solver.id = ts.solved_by
                 WHERE tm.user_id = ?
                 ORDER BY ts.submitted_at DESC
                 LIMIT ? OFFSET ?',
      );
      $stmt->execute([$userId, $userId, $limit, $offset]);
    } else {
      $stmt = $pdo->prepare(
        'SELECT s.id, s.user_id, u.username, s.challenge_id, c.title AS challenge_title,
                        c.category, c.points, s.submitted_at, s.solve_time_ms
                 FROM submissions s
                 JOIN users      u ON u.id = s.user_id
                 JOIN challenges c ON c.id = s.challenge_id
                 WHERE s.user_id = ? ORDER BY s.submitted_at DESC
                 LIMIT ? OFFSET ?',
      );
      $stmt->execute([$userId, $limit, $offset]);
    }
    json_response(["ok" => true, "flags" => $stmt->fetchAll()]);

  case "get_all_flags":
    require_admin();
    $pdo = get_pdo();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 500)), 1000);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $stmt = $pdo->prepare(
      'SELECT s.id, s.user_id, u.username, s.challenge_id, c.title AS challenge_title,
                    c.category, c.points, s.submitted_at, s.solve_time_ms
             FROM submissions s
             JOIN users      u ON u.id = s.user_id
             JOIN challenges c ON c.id = s.challenge_id
             ORDER BY s.submitted_at DESC
             LIMIT ? OFFSET ?',
    );
    $stmt->execute([$limit, $offset]);
    json_response(["ok" => true, "flags" => $stmt->fetchAll()]);

  case "get_ranking":
    require_auth();
    $pdo = get_pdo();
    $ranking = $pdo
      ->query(
        'SELECT user_id, username, flags_found, total_points
             FROM v_solo_ranking',
      )
      ->fetchAll();
    // Normaliser pour compatibilité avec le frontend existant
    $normalized = array_map(
      fn($r) => [
        "user_id" => (int) $r["user_id"],
        "username" => $r["username"],
        "flags_found" => (int) $r["flags_found"],
        "total_points" => (int) $r["total_points"],
      ],
      $ranking,
    );
    json_response(["ok" => true, "ranking" => $normalized]);

  case "get_team_ranking":
    require_auth();
    $pdo = get_pdo();
    $teams = $pdo
      ->query(
        'SELECT t.id, t.name, t.description, t.emoji, t.is_public, t.owner_id, t.created_at,
                    COUNT(DISTINCT ts.challenge_id) AS flags_found,
                    COALESCE(SUM(c.points), 0) AS total_points,
                    COUNT(DISTINCT tm.user_id) AS member_count
             FROM teams t
             LEFT JOIN team_submissions ts ON ts.team_id = t.id
             LEFT JOIN challenges c ON c.id = ts.challenge_id
             LEFT JOIN team_members tm ON tm.team_id = t.id
             GROUP BY t.id, t.name, t.description, t.emoji, t.is_public, t.owner_id, t.created_at
             ORDER BY total_points DESC, flags_found DESC',
      )
      ->fetchAll();

    $result = array_map(
      fn($row) => [
        "team" => [
          "id" => $row["id"],
          "name" => $row["name"],
          "description" => $row["description"],
          "emoji" => $row["emoji"],
          "isPublic" => (bool) $row["is_public"],
          "ownerId" => $row["owner_id"],
          "createdAt" => $row["created_at"],
        ],
        "points" => (int) $row["total_points"],
        "solved" => (int) $row["flags_found"],
        "memberCount" => (int) $row["member_count"],
      ],
      $teams,
    );

    json_response(["ok" => true, "ranking" => $result]);

  // ════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENTS
  // ════════════════════════════════════════════════════════════════════════

  case "get_achievements":
    require_auth();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 500)), 1000);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $stmt = get_pdo()->prepare(
      "SELECT id, title, description, icon, condition_type, condition_value, condition_category, created_at FROM achievements ORDER BY created_at LIMIT ? OFFSET ?",
    );
    $stmt->execute([$limit, $offset]);
    json_response([
      "ok" => true,
      "achievements" => array_map(
        fn($r) => [
          "id" => $r["id"],
          "title" => $r["title"],
          "description" => $r["description"],
          "icon" => $r["icon"],
          "condition" => $r["condition_type"],
          "conditionValue" => (int) $r["condition_value"],
          "conditionCategory" => $r["condition_category"],
          "createdAt" => $r["created_at"],
        ],
        $stmt->fetchAll(),
      ),
    ]);

  case "add_achievement":
    require_admin();
    $body = get_body();
    if (!($body["id"] ?? null)) {
      json_error("ID manquant");
    }
    get_pdo()
      ->prepare(
        "INSERT INTO achievements (id, title, description, icon, condition_type, condition_value, condition_category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
      )
      ->execute([
        $body["id"],
        sanitize_string($body["title"] ?? "", 200),
        sanitize_string($body["description"] ?? "", 1000),
        sanitize_string($body["icon"] ?? "🏆", 10),
        sanitize_string($body["condition"] ?? "manual", 30),
        (int) ($body["conditionValue"] ?? 1),
        $body["conditionCategory"] ?? null,
      ]);
    json_response(["ok" => true]);

  case "update_achievement":
    require_admin();
    $body = get_body();
    if (!($body["id"] ?? "")) {
      json_error("ID manquant");
    }
    get_pdo()
      ->prepare(
        "UPDATE achievements SET title=?, description=?, icon=?, condition_type=?, condition_value=?, condition_category=? WHERE id=?",
      )
      ->execute([
        sanitize_string($body["title"] ?? "", 200),
        sanitize_string($body["description"] ?? "", 1000),
        sanitize_string($body["icon"] ?? "🏆", 10),
        sanitize_string($body["condition"] ?? "manual", 30),
        (int) ($body["conditionValue"] ?? 1),
        $body["conditionCategory"] ?? null,
        $body["id"],
      ]);
    json_response(["ok" => true]);

  case "delete_achievement":
    require_admin();
    $body = get_body();
    if (!($body["id"] ?? "")) {
      json_error("ID manquant");
    }
    get_pdo()
      ->prepare("DELETE FROM achievements WHERE id = ?")
      ->execute([$body["id"]]);
    json_response(["ok" => true]);

  case "get_user_achievements":
    $auth = require_auth();
    // Seul l'admin peut interroger un userId arbitraire — les joueurs ne voient que leurs propres achievements
    $userId = $auth["is_admin"] && isset($_GET["userId"]) ? (int) $_GET["userId"] : $auth["id"];
    $limit = min(max(1, (int) ($_GET["limit"] ?? 500)), 1000);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $stmt = get_pdo()->prepare(
      "SELECT id, user_id, achievement_id, unlocked_at FROM user_achievements WHERE user_id = ? LIMIT ? OFFSET ?",
    );
    $stmt->execute([$userId, $limit, $offset]);
    json_response(["ok" => true, "userAchievements" => $stmt->fetchAll()]);

  case "get_all_user_achievements":
    $auth = require_auth();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 500)), 1000);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    // Admin : retourne tout. Joueur : retourne uniquement ses propres achievements.
    // (Le frontend filtre déjà par ua.userId === user.id, donc aucun impact UI.)
    if ($auth["is_admin"]) {
      $stmt = get_pdo()->prepare(
        "SELECT id, user_id, achievement_id, unlocked_at FROM user_achievements LIMIT ? OFFSET ?",
      );
      $stmt->execute([$limit, $offset]);
      $rows = $stmt->fetchAll();
    } else {
      $stmt = get_pdo()->prepare(
        "SELECT id, user_id, achievement_id, unlocked_at FROM user_achievements WHERE user_id = ? LIMIT ? OFFSET ?",
      );
      $stmt->execute([$auth["id"], $limit, $offset]);
      $rows = $stmt->fetchAll();
    }
    json_response(["ok" => true, "userAchievements" => $rows]);

  case "unlock_achievement":
    require_admin();
    $body = get_body();
    $targetUserId = (int) $body["userId"];
    $achId = $body["achievementId"];
    $targetUserStmt = get_pdo()->prepare("SELECT username FROM users WHERE id = ? LIMIT 1");
    $targetUserStmt->execute([$targetUserId]);
    $targetRow = $targetUserStmt->fetch();
    $targetUsername = $targetRow ? $targetRow["username"] : "";
    get_pdo()
      ->prepare(
        "INSERT IGNORE INTO user_achievements (id, user_id, achievement_id, unlocked_at) VALUES (UUID(), ?, ?, NOW())",
      )
      ->execute([$targetUserId, $achId]);
    log_activity("achievement_unlocked", $targetUserId, $targetUsername, ["achievement" => $achId]);
    notify_ws("players");
    json_response(["ok" => true]);

  case "revoke_achievement":
    require_admin();
    $body = get_body();
    get_pdo()
      ->prepare("DELETE FROM user_achievements WHERE user_id = ? AND achievement_id = ?")
      ->execute([(int) $body["userId"], $body["achievementId"]]);
    notify_ws("players");
    json_response(["ok" => true]);

  case "evaluate_achievements":
    $auth = require_auth();
    $userId = isset($_GET["userId"]) ? (int) $_GET["userId"] : $auth["id"];
    if (!$auth["is_admin"] && $userId !== $auth["id"]) {
      json_error("Accès refusé", 403);
    }
    evaluate_achievements_for_user(get_pdo(), $userId);
    notify_ws("players");
    json_response(["ok" => true]);

  // ════════════════════════════════════════════════════════════════════════
  // JOUEURS — ADMIN
  // ════════════════════════════════════════════════════════════════════════

  case "get_players":
    require_admin();
    $stmt = get_pdo()->query(
      'SELECT u.id, u.username, u.email, u.age, u.gender, u.is_admin, u.created_at,
                    COALESCE(SUM(c.points), 0) + COALESCE((SELECT SUM(bm.points) FROM bonus_malus bm WHERE bm.user_id = u.id), 0) AS points,
                    COUNT(s.id) AS solved
             FROM users u
             LEFT JOIN submissions s ON s.user_id = u.id
             LEFT JOIN challenges  c ON c.id      = s.challenge_id
             WHERE u.is_admin = 0
             GROUP BY u.id
             ORDER BY points DESC',
    );
    json_response(["ok" => true, "players" => $stmt->fetchAll()]);

  case "add_bonus":
    $auth = require_admin();
    $body = get_body();
    $userId = (int) $body["userId"];
    get_pdo()
      ->prepare(
        "INSERT INTO bonus_malus (user_id, points, reason, created_at) VALUES (?, ?, ?, NOW())",
      )
      ->execute([$userId, abs((int) $body["points"]), "Bonus admin"]);
    log_activity("bonus_added", (int) $auth["id"], $auth["username"], [
      "targetId" => $userId,
      "points" => 25,
    ]);
    notify_ws("players");
    json_response(["ok" => true]);

  case "add_malus":
    $auth = require_admin();
    $body = get_body();
    $userId = (int) $body["userId"];
    get_pdo()
      ->prepare(
        "INSERT INTO bonus_malus (user_id, points, reason, created_at) VALUES (?, ?, ?, NOW())",
      )
      ->execute([$userId, -abs((int) $body["points"]), "Malus admin"]);
    log_activity("malus_added", (int) $auth["id"], $auth["username"], [
      "targetId" => $userId,
      "points" => 25,
    ]);
    notify_ws("players");
    json_response(["ok" => true]);

  case "reset_user_progress":
    require_admin();
    $userId = (int) (get_body()["userId"] ?? 0);
    $pdo = get_pdo();
    $pdo->prepare("DELETE FROM submissions WHERE user_id = ?")->execute([$userId]);
    $pdo->prepare("DELETE FROM bonus_malus WHERE user_id = ?")->execute([$userId]);
    $pdo->prepare("DELETE FROM user_achievements WHERE user_id = ?")->execute([$userId]);
    notify_ws("players");
    json_response(["ok" => true]);

  case "delete_user":
    require_admin();
    $userId = (int) (get_body()["userId"] ?? 0);
    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $u = $stmt->fetch();
    if (!$u || $u["is_admin"]) {
      json_error("Impossible de supprimer cet utilisateur");
    }
    $pdo->prepare("DELETE FROM users WHERE id = ? AND is_admin = 0")->execute([$userId]);
    notify_ws("players");
    json_response(["ok" => true]);

  case "set_challenge_solved":
    require_admin();
    $body = get_body();
    $userId = (int) $body["userId"];
    $challengeId = (int) $body["challengeId"];
    $solved = (bool) $body["solved"];
    $pdo = get_pdo();
    if ($solved) {
      $stmt = $pdo->prepare("SELECT id FROM challenges WHERE id = ?");
      $stmt->execute([$challengeId]);
      if (!$stmt->fetch()) {
        json_error("Challenge introuvable");
      }
      $pdo
        ->prepare(
          "INSERT IGNORE INTO submissions (user_id, challenge_id, submitted_at) VALUES (?, ?, NOW())",
        )
        ->execute([$userId, $challengeId]);
    } else {
      $pdo
        ->prepare("DELETE FROM submissions WHERE user_id = ? AND challenge_id = ?")
        ->execute([$userId, $challengeId]);
    }
    notify_ws("players");
    json_response(["ok" => true]);

  // ════════════════════════════════════════════════════════════════════════
  // AMIS
  // ════════════════════════════════════════════════════════════════════════

  case "send_friend_request":
    $auth = require_auth();
    $toUserId = (int) (get_body()["toUserId"] ?? 0);
    if ($toUserId === $auth["id"]) {
      json_error("Vous ne pouvez pas vous ajouter vous-même");
    }
    $pdo = get_pdo();
    $stmt = $pdo->prepare(
      "SELECT id FROM friend_requests WHERE (from_user_id=? AND to_user_id=?) OR (from_user_id=? AND to_user_id=?)",
    );
    $stmt->execute([$auth["id"], $toUserId, $toUserId, $auth["id"]]);
    if ($stmt->fetch()) {
      json_error("Une relation existe déjà");
    }
    $pdo
      ->prepare(
        'INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at) VALUES (UUID(), ?, ?, "pending", NOW())',
      )
      ->execute([$auth["id"], $toUserId]);
    log_activity("friend_request_sent", (int) $auth["id"], $auth["username"], [
      "toUserId" => $toUserId,
    ]);
    notify_ws("friend_request", $toUserId); // notifie uniquement le destinataire
    json_response(["ok" => true]);

  case "accept_friend_request":
    $auth = require_auth();
    $reqId = get_body()["requestId"] ?? "";
    get_pdo()
      ->prepare(
        'UPDATE friend_requests SET status="accepted" WHERE id=? AND to_user_id=? AND status="pending"',
      )
      ->execute([$reqId, $auth["id"]]);
    json_response(["ok" => true]);

  case "reject_friend_request":
    $auth = require_auth();
    $reqId = get_body()["requestId"] ?? "";
    get_pdo()
      ->prepare('DELETE FROM friend_requests WHERE id=? AND to_user_id=? AND status="pending"')
      ->execute([$reqId, $auth["id"]]);
    json_response(["ok" => true]);

  case "cancel_friend_request":
    $auth = require_auth();
    $reqId = get_body()["requestId"] ?? "";
    get_pdo()
      ->prepare('DELETE FROM friend_requests WHERE id=? AND from_user_id=? AND status="pending"')
      ->execute([$reqId, $auth["id"]]);
    json_response(["ok" => true]);

  case "remove_friend":
    $auth = require_auth();
    $friendId = (int) (get_body()["friendId"] ?? 0);
    get_pdo()
      ->prepare(
        "DELETE FROM friend_requests WHERE (from_user_id=? AND to_user_id=?) OR (from_user_id=? AND to_user_id=?)",
      )
      ->execute([$auth["id"], $friendId, $friendId, $auth["id"]]);
    json_response(["ok" => true]);

  case "get_friends":
    $auth = require_auth();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 500)), 1000);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $stmt = get_pdo()->prepare(
      'SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at
             FROM friend_requests fr WHERE fr.status="accepted" AND (fr.from_user_id=? OR fr.to_user_id=?)
             LIMIT ? OFFSET ?',
    );
    $stmt->execute([$auth["id"], $auth["id"], $limit, $offset]);
    json_response(["ok" => true, "friends" => $stmt->fetchAll()]);

  case "get_pending_received":
    $auth = require_auth();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 200)), 500);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $stmt = get_pdo()->prepare(
      'SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at FROM friend_requests fr WHERE fr.to_user_id=? AND fr.status="pending" LIMIT ? OFFSET ?',
    );
    $stmt->execute([$auth["id"], $limit, $offset]);
    json_response(["ok" => true, "requests" => $stmt->fetchAll()]);

  case "get_pending_sent":
    $auth = require_auth();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 200)), 500);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $stmt = get_pdo()->prepare(
      'SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at FROM friend_requests fr WHERE fr.from_user_id=? AND fr.status="pending" LIMIT ? OFFSET ?',
    );
    $stmt->execute([$auth["id"], $limit, $offset]);
    json_response(["ok" => true, "requests" => $stmt->fetchAll()]);

  case "search_users":
    $auth = require_auth();
    $query = sanitize_string($_GET["q"] ?? "", 50);
    if (strlen($query) < 2) {
      json_response(["ok" => true, "users" => []]);
    }
    $stmt = get_pdo()->prepare(
      "SELECT id, username FROM users WHERE username LIKE ? AND is_admin=0 AND id!=? LIMIT 8",
    );
    $stmt->execute(["%" . $query . "%", $auth["id"]]);
    json_response(["ok" => true, "users" => $stmt->fetchAll()]);

  // ════════════════════════════════════════════════════════════════════════
  // TEAMS
  // ════════════════════════════════════════════════════════════════════════

  case "create_team":
    $auth = require_auth();
    if ($auth["is_admin"]) {
      json_error("Les admins ne peuvent pas créer de team");
    }
    $body = get_body();
    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT id FROM team_members WHERE user_id = ?");
    $stmt->execute([$auth["id"]]);
    if ($stmt->fetch()) {
      json_error("Vous êtes déjà dans une team");
    }
    $name = sanitize_string($body["name"] ?? "", 40);
    $desc = sanitize_string($body["description"] ?? "", 200);
    $emoji = sanitize_string($body["emoji"] ?? "🛡️", 10);
    $isPublic = (bool) ($body["isPublic"] ?? true);
    if (strlen($name) < 2) {
      json_error("Nom trop court");
    }
    $check = $pdo->prepare("SELECT id FROM teams WHERE name = ?");
    $check->execute([$name]);
    if ($check->fetch()) {
      json_error("Ce nom de team est déjà utilisé");
    }
    $teamId = bin2hex(random_bytes(16));
    $pdo
      ->prepare(
        "INSERT INTO teams (id, name, description, emoji, is_public, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      )
      ->execute([$teamId, $name, $desc, $emoji, $isPublic ? 1 : 0, $auth["id"]]);
    $pdo
      ->prepare(
        'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (UUID(), ?, ?, "owner", NOW())',
      )
      ->execute([$teamId, $auth["id"]]);
    log_activity("team_created", (int) $auth["id"], $auth["username"], [
      "teamId" => $teamId,
      "name" => $name,
    ]);
    notify_ws("teams");
    json_response(["ok" => true, "teamId" => $teamId]);

  case "get_teams":
    require_auth();
    $query = sanitize_string($_GET["q"] ?? "", 50);
    $filter = $_GET["filter"] ?? "all";
    $sql =
      "SELECT id, name, description, emoji, is_public, owner_id, created_at FROM teams WHERE 1=1";
    $params = [];
    if ($query !== "") {
      $sql .= " AND name LIKE ?";
      $params[] = "%" . $query . "%";
    }
    if ($filter === "public") {
      $sql .= " AND is_public = 1";
    }
    if ($filter === "private") {
      $sql .= " AND is_public = 0";
    }
    $limit = min(max(1, (int) ($_GET["limit"] ?? 50)), 200);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $sql .= " ORDER BY name LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $stmt = get_pdo()->prepare($sql);
    $stmt->execute($params);
    $teams = array_map(
      fn($t) => [
        "id" => $t["id"],
        "name" => $t["name"],
        "description" => $t["description"],
        "emoji" => $t["emoji"],
        "isPublic" => (bool) $t["is_public"],
        "ownerId" => $t["owner_id"],
        "createdAt" => $t["created_at"],
      ],
      $stmt->fetchAll(),
    );
    json_response(["ok" => true, "teams" => $teams]);

  case "get_user_team":
    $auth = require_auth();
    // Seul l'admin peut interroger un userId arbitraire
    $userId = $auth["is_admin"] && isset($_GET["userId"]) ? (int) $_GET["userId"] : $auth["id"];
    $stmt = get_pdo()->prepare(
      "SELECT t.id, t.name, t.description, t.emoji, t.is_public, t.owner_id, t.created_at, tm.role FROM teams t JOIN team_members tm ON tm.team_id = t.id WHERE tm.user_id = ?",
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
      json_response(["ok" => true, "team" => null, "role" => null]);
    }
    json_response([
      "ok" => true,
      "team" => [
        "id" => $row["id"],
        "name" => $row["name"],
        "description" => $row["description"],
        "emoji" => $row["emoji"],
        "isPublic" => (bool) $row["is_public"],
        "ownerId" => $row["owner_id"],
        "createdAt" => $row["created_at"],
      ],
      "role" => $row["role"],
    ]);

  case "get_team_members":
    $auth = require_auth();
    $teamId = sanitize_string($_GET["teamId"] ?? "", 36);
    if (!$teamId) {
      json_error("teamId manquant");
    }

    $pdo = get_pdo();
    // Vérifier que la team est publique OU que l'appelant en est membre (OU admin)
    $teamStmt = $pdo->prepare("SELECT is_public FROM teams WHERE id = ?");
    $teamStmt->execute([$teamId]);
    $team = $teamStmt->fetch();
    if (!$team) {
      json_error("Team introuvable", 404);
    }
    if (!$team["is_public"] && !$auth["is_admin"]) {
      $memberStmt = $pdo->prepare("SELECT id FROM team_members WHERE team_id=? AND user_id=?");
      $memberStmt->execute([$teamId, $auth["id"]]);
      if (!$memberStmt->fetch()) {
        json_error("Accès refusé", 403);
      }
    }

    $stmt = $pdo->prepare(
      'SELECT u.id, u.username, tm.role, tm.joined_at,
                    COALESCE(SUM(c.points), 0) + COALESCE((SELECT SUM(bm.points) FROM bonus_malus bm WHERE bm.user_id = u.id), 0) AS points,
                    COUNT(DISTINCT s.challenge_id) AS solved
             FROM team_members tm
             JOIN users u ON u.id = tm.user_id
             LEFT JOIN submissions s ON s.user_id = u.id
             LEFT JOIN challenges  c ON c.id      = s.challenge_id
             WHERE tm.team_id = ?
             GROUP BY u.id, u.username, tm.role, tm.joined_at
             ORDER BY FIELD(tm.role, "owner", "admin", "member"), points DESC',
    );
    $stmt->execute([$teamId]);
    json_response(["ok" => true, "members" => $stmt->fetchAll()]);

  case "join_team":
    $auth = require_auth();
    if ($auth["is_admin"]) {
      json_error("Les admins ne peuvent pas rejoindre de team");
    }
    $teamId = sanitize_string(get_body()["teamId"] ?? "", 36);
    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT id FROM team_members WHERE user_id = ?");
    $stmt->execute([$auth["id"]]);
    if ($stmt->fetch()) {
      json_error("Vous êtes déjà dans une team");
    }
    $stmt = $pdo->prepare("SELECT is_public FROM teams WHERE id = ?");
    $stmt->execute([$teamId]);
    $team = $stmt->fetch();
    if (!$team || !$team["is_public"]) {
      json_error("Team introuvable ou privée");
    }
    $stmt = $pdo->prepare("SELECT id FROM team_bans WHERE team_id=? AND user_id=?");
    $stmt->execute([$teamId, $auth["id"]]);
    if ($stmt->fetch()) {
      json_error("Vous êtes banni de cette team");
    }
    $pdo
      ->prepare(
        'INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (UUID(), ?, ?, "member", NOW())',
      )
      ->execute([$teamId, $auth["id"]]);
    log_activity("team_join", (int) $auth["id"], $auth["username"], ["teamId" => $teamId]);
    notify_ws("teams");
    json_response(["ok" => true]);

  case "leave_team":
    $auth = require_auth();
    $pdo = get_pdo();
    $stmt = $pdo->prepare("SELECT role, team_id FROM team_members WHERE user_id = ?");
    $stmt->execute([$auth["id"]]);
    $member = $stmt->fetch();
    if (!$member) {
      json_error('Vous n\'êtes dans aucune team');
    }
    if ($member["role"] === "owner") {
      json_error("Le propriétaire ne peut pas quitter la team");
    }
    $leaveTeamId = $member["team_id"];
    $pdo->prepare("DELETE FROM team_members WHERE user_id = ?")->execute([$auth["id"]]);
    notify_ws("teams");
    notify_team_members($leaveTeamId, $auth["id"]);
    json_response(["ok" => true]);

  case "kick_member":
    $auth = require_auth();
    $body = get_body();
    $target = (int) $body["targetId"];
    $teamId = sanitize_string($body["teamId"] ?? "", 36);
    $pdo = get_pdo();
    $aStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $aStmt->execute([$auth["id"], $teamId]);
    $actor = $aStmt->fetch();
    $tStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $tStmt->execute([$target, $teamId]);
    $tgt = $tStmt->fetch();
    if (!$actor || !$tgt) {
      json_error("Membre introuvable");
    }
    if ($tgt["role"] === "owner") {
      json_error('Impossible d\'expulser le propriétaire');
    }
    if ($actor["role"] === "admin" && $tgt["role"] !== "member") {
      json_error("Permission insuffisante");
    }
    if (!in_array($actor["role"], ["owner", "admin"])) {
      json_error("Permission insuffisante");
    }
    $pdo
      ->prepare("DELETE FROM team_members WHERE user_id=? AND team_id=?")
      ->execute([$target, $teamId]);
    json_response(["ok" => true]);

  case "ban_member":
    $auth = require_auth();
    $body = get_body();
    $target = (int) $body["targetId"];
    $teamId = sanitize_string($body["teamId"] ?? "", 36);
    $pdo = get_pdo();
    $aStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $aStmt->execute([$auth["id"], $teamId]);
    $actor = $aStmt->fetch();
    $tStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $tStmt->execute([$target, $teamId]);
    $tgt = $tStmt->fetch();
    if (!$actor || !$tgt) {
      json_error("Membre introuvable");
    }
    if ($tgt["role"] === "owner") {
      json_error("Impossible de bannir le propriétaire");
    }
    if ($actor["role"] === "admin" && $tgt["role"] !== "member") {
      json_error("Permission insuffisante");
    }
    if (!in_array($actor["role"], ["owner", "admin"])) {
      json_error("Permission insuffisante");
    }
    $pdo
      ->prepare("DELETE FROM team_members WHERE user_id=? AND team_id=?")
      ->execute([$target, $teamId]);
    $pdo
      ->prepare("INSERT IGNORE INTO team_bans (team_id, user_id) VALUES (?, ?)")
      ->execute([$teamId, $target]);
    json_response(["ok" => true]);
  case "promote_member":
    $auth = require_auth();
    $body = get_body();
    $target = (int) $body["targetId"];
    $teamId = sanitize_string($body["teamId"] ?? "", 36);
    $pdo = get_pdo();
    $aStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $aStmt->execute([$auth["id"], $teamId]);
    $actor = $aStmt->fetch();
    if (!$actor || $actor["role"] !== "owner") {
      json_error("Seul le propriétaire peut promouvoir");
    }
    $tStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $tStmt->execute([$target, $teamId]);
    $tgt = $tStmt->fetch();
    if (!$tgt || $tgt["role"] !== "member") {
      json_error("Cible invalide ou déjà admin/owner");
    }
    $pdo
      ->prepare("UPDATE team_members SET role=? WHERE user_id=? AND team_id=?")
      ->execute(["admin", $target, $teamId]);
    notify_ws("teams");
    notify_ws("notification", $target);
    json_response(["ok" => true]);

  case "demote_member":
    $auth = require_auth();
    $body = get_body();
    $target = (int) $body["targetId"];
    $teamId = sanitize_string($body["teamId"] ?? "", 36);
    $pdo = get_pdo();
    $aStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $aStmt->execute([$auth["id"], $teamId]);
    $actor = $aStmt->fetch();
    if (!$actor || $actor["role"] !== "owner") {
      json_error("Seul le propriétaire peut rétrograder");
    }
    $tStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $tStmt->execute([$target, $teamId]);
    $tgt = $tStmt->fetch();
    if (!$tgt || $tgt["role"] !== "admin") {
      json_error("Cible invalide ou pas admin");
    }
    $pdo
      ->prepare("UPDATE team_members SET role=? WHERE user_id=? AND team_id=?")
      ->execute(["member", $target, $teamId]);
    log_activity("team_demote", (int) $auth["id"], $auth["username"], ["targetId" => $target]);
    notify_ws("teams");
    notify_ws("notification", $target);
    json_response(["ok" => true]);

  case "update_team":
    $auth = require_auth();
    $body = get_body();
    $teamId = sanitize_string($body["teamId"] ?? "", 36);
    $pdo = get_pdo();
    $aStmt = $pdo->prepare("SELECT role FROM team_members WHERE user_id=? AND team_id=?");
    $aStmt->execute([$auth["id"], $teamId]);
    $actor = $aStmt->fetch();
    if (!$actor || $actor["role"] !== "owner") {
      json_error("Seul le propriétaire peut modifier la team");
    }
    $name = sanitize_string($body["name"] ?? "", 50);
    $desc = sanitize_string($body["description"] ?? "", 300);
    $emoji = sanitize_string($body["emoji"] ?? "🛡️", 10);
    $public = isset($body["isPublic"]) ? (bool) $body["isPublic"] : null;
    $sets = [];
    $vals = [];
    if ($name !== "") {
      $sets[] = "name = ?";
      $vals[] = $name;
    }
    if ($desc !== "") {
      $sets[] = "description = ?";
      $vals[] = $desc;
    }
    if ($emoji !== "") {
      $sets[] = "emoji = ?";
      $vals[] = $emoji;
    }
    if ($public !== null) {
      $sets[] = "is_public = ?";
      $vals[] = (int) $public;
    }
    if (empty($sets)) {
      json_error("Aucun champ à mettre à jour");
    }
    $vals[] = $teamId;
    $pdo->prepare("UPDATE teams SET " . implode(", ", $sets) . " WHERE id = ?")->execute($vals);
    json_response(["ok" => true]);

  case "delete_team":
    $auth = require_auth();
    $body = get_body();
    $teamId = sanitize_string($body["teamId"] ?? "", 36);
    $pdo = get_pdo();
    $oStmt = $pdo->prepare("SELECT owner_id FROM teams WHERE id = ?");
    $oStmt->execute([$teamId]);
    $team = $oStmt->fetch();
    if (!$team) {
      json_error("Team introuvable");
    }
    if ((int) $team["owner_id"] !== $auth["id"] && !$auth["is_admin"]) {
      json_error("Non autorisé", 403);
    }
    $pdo->prepare("DELETE FROM teams WHERE id = ?")->execute([$teamId]);
    json_response(["ok" => true]);

  case "search_teams":
    require_auth();
    $query = sanitize_string($_GET["q"] ?? "", 50);
    $filterPublic = ($_GET["filterPublic"] ?? "") === "true";
    $pdo = get_pdo();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 20)), 50);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    if ($filterPublic) {
      $stmt = $pdo->prepare(
        'SELECT id, name, description, emoji, is_public, owner_id, created_at
                 FROM teams WHERE is_public = 1 AND name LIKE ? LIMIT ? OFFSET ?',
      );
      $stmt->execute(["%" . $query . "%", $limit, $offset]);
    } else {
      $stmt = $pdo->prepare(
        'SELECT id, name, description, emoji, is_public, owner_id, created_at
                 FROM teams WHERE name LIKE ? LIMIT ? OFFSET ?',
      );
      $stmt->execute(["%" . $query . "%", $limit, $offset]);
    }
    $teams = array_map(
      fn($t) => [
        "id" => $t["id"],
        "name" => $t["name"],
        "description" => $t["description"],
        "emoji" => $t["emoji"],
        "isPublic" => (bool) $t["is_public"],
        "ownerId" => $t["owner_id"],
        "createdAt" => $t["created_at"],
      ],
      $stmt->fetchAll(),
    );
    json_response(["ok" => true, "teams" => $teams]);

  case "add_team_member_admin":
    require_admin();
    $body = get_body();
    $teamId = sanitize_string($body["teamId"] ?? "", 36);
    $userId = (int) ($body["userId"] ?? 0);
    if (!$teamId || !$userId) {
      json_error("Données manquantes");
    }
    $pdo = get_pdo();
    // Vérifie que l'utilisateur n'est pas déjà dans une team
    $inTeam = $pdo->prepare("SELECT team_id FROM team_members WHERE user_id = ?");
    $inTeam->execute([$userId]);
    if ($inTeam->fetch()) {
      json_error('L\'utilisateur est déjà dans une team');
    }
    $pdo
      ->prepare(
        'INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, \'member\')',
      )
      ->execute([$teamId, $userId]);
    json_response(["ok" => true]);

  case "export_data":
    require_admin();
    $pdo = get_pdo();

    // Catégories
    $catStmt = $pdo->query(
      "SELECT id, name, description, description_md, icon, color, sort_order FROM categories ORDER BY sort_order ASC",
    );
    $categories = array_map(
      fn($c) => [
        "id" => $c["id"],
        "name" => $c["name"],
        "description" => $c["description"],
        "descriptionMd" => $c["description_md"],
        "icon" => $c["icon"],
        "color" => $c["color"],
        "sortOrder" => (int) $c["sort_order"],
      ],
      $catStmt->fetchAll(),
    );

    // Challenges (flag déchiffré — admin uniquement)
    $chalStmt = $pdo->query(
      'SELECT id, title, category, points, description, flag_encrypted, difficulty, difficulty_mode, created_at
             FROM challenges ORDER BY category ASC, title ASC',
    );
    $challenges = array_map(function ($c) {
      return [
        "title" => $c["title"],
        "category" => $c["category"],
        "points" => (int) $c["points"],
        "description" => $c["description"],
        "flag" => decrypt_flag($c["flag_encrypted"]),
        "difficulty" => $c["difficulty"],
        "difficultyMode" => $c["difficulty_mode"],
      ];
    }, $chalStmt->fetchAll());

    // Achievements
    $achStmt = $pdo->query(
      'SELECT id, title, description, icon, condition_type, condition_value, condition_category
             FROM achievements ORDER BY created_at ASC',
    );
    $achievements = array_map(
      fn($a) => [
        "id" => $a["id"],
        "title" => $a["title"],
        "description" => $a["description"],
        "icon" => $a["icon"],
        "condition" => $a["condition_type"],
        "conditionValue" => (int) $a["condition_value"],
        "conditionCategory" => $a["condition_category"],
      ],
      $achStmt->fetchAll(),
    );

    // Joueurs (non-admins) — hash bcrypt inclus pour permettre la restauration
    // complète des comptes sur une autre instance. Export admin uniquement.
    $playerStmt = $pdo->query(
      'SELECT username, email, password_hash, age, gender, play_mode
             FROM users WHERE is_admin = 0 ORDER BY created_at ASC',
    );
    $players = array_map(
      fn($u) => [
        "username" => $u["username"],
        "email" => $u["email"],
        "passwordHash" => $u["password_hash"],
        "age" => $u["age"] !== null ? (int) $u["age"] : null,
        "gender" => $u["gender"],
        "playMode" => $u["play_mode"],
      ],
      $playerStmt->fetchAll(),
    );

    $export = [
      "version" => "1.1",
      "exportedAt" => date("c"),
      "categories" => $categories,
      "challenges" => $challenges,
      "achievements" => $achievements,
      "players" => $players,
    ];

    header("Content-Type: application/json; charset=utf-8");
    header('Content-Disposition: attachment; filename="ctf_export_' . date("Y-m-d") . '.json"');
    echo json_encode($export, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();

  case "import_data":
    require_admin();
    $body = get_body();

    if (
      !isset($body["version"], $body["categories"], $body["challenges"], $body["achievements"]) ||
      !is_array($body["categories"]) ||
      !is_array($body["challenges"]) ||
      !is_array($body["achievements"])
    ) {
      json_error(
        "Format de fichier invalide — version, categories, challenges et achievements requis",
      );
    }

    $pdo = get_pdo();
    $pdo->beginTransaction();
    try {
      $imported = ["categories" => 0, "challenges" => 0, "achievements" => 0];

      // ── Catégories (upsert) ───────────────────────────────────────────
      $stmtCat = $pdo->prepare(
        'INSERT INTO categories (id, name, description, description_md, icon, color, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   name           = VALUES(name),
                   description    = VALUES(description),
                   description_md = VALUES(description_md),
                   icon           = VALUES(icon),
                   color          = VALUES(color),
                   sort_order     = VALUES(sort_order)',
      );
      foreach ($body["categories"] as $cat) {
        if (empty($cat["id"]) || empty($cat["name"])) {
          continue;
        }
        $stmtCat->execute([
          sanitize_string((string) $cat["id"], 50),
          sanitize_string((string) $cat["name"], 100),
          sanitize_string((string) ($cat["description"] ?? ""), 500),
          sanitize_string((string) ($cat["descriptionMd"] ?? ""), 5000),
          sanitize_string((string) ($cat["icon"] ?? "🏴"), 10),
          sanitize_string((string) ($cat["color"] ?? "#8b5cf6"), 10),
          (int) ($cat["sortOrder"] ?? 0),
        ]);
        $imported["categories"]++;
      }

      // ── Challenges (non-destructif : ignore si title+category existe déjà) ─
      $stmtChal = $pdo->prepare(
        'INSERT INTO challenges (title, category, points, description, flag_encrypted, difficulty, difficulty_mode, created_at)
                 SELECT ?, ?, ?, ?, ?, ?, ?, NOW()
                 WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE title = ? AND category = ?)',
      );
      foreach ($body["challenges"] as $chal) {
        if (empty($chal["title"]) || empty($chal["flag"])) {
          continue;
        }
        $title = sanitize_string((string) $chal["title"], 200);
        $category = sanitize_string((string) ($chal["category"] ?? ""), 50);
        $stmtChal->execute([
          $title,
          $category,
          max(1, (int) ($chal["points"] ?? 100)),
          sanitize_string((string) ($chal["description"] ?? ""), 10000),
          encrypt_flag((string) $chal["flag"]),
          sanitize_string((string) ($chal["difficulty"] ?? "medium"), 20),
          sanitize_string((string) ($chal["difficultyMode"] ?? "auto"), 10),
          $title,
          $category,
        ]);
        // rowCount() appartient au PDOStatement, pas au PDO : l'appeler sur
        // l'objet PDO faisait échouer tout l'import.
        if ($stmtChal->rowCount() > 0) {
          $imported["challenges"]++;
        }
      }

      // ── Achievements (upsert) ─────────────────────────────────────────
      $stmtAch = $pdo->prepare(
        'INSERT INTO achievements (id, title, description, icon, condition_type, condition_value, condition_category, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                   title              = VALUES(title),
                   description        = VALUES(description),
                   icon               = VALUES(icon),
                   condition_type     = VALUES(condition_type),
                   condition_value    = VALUES(condition_value),
                   condition_category = VALUES(condition_category)',
      );
      foreach ($body["achievements"] as $ach) {
        if (empty($ach["id"]) || empty($ach["title"])) {
          continue;
        }
        $stmtAch->execute([
          sanitize_string((string) $ach["id"], 50),
          sanitize_string((string) $ach["title"], 200),
          sanitize_string((string) ($ach["description"] ?? ""), 1000),
          sanitize_string((string) ($ach["icon"] ?? "🏆"), 10),
          sanitize_string((string) ($ach["condition"] ?? "manual"), 30),
          (int) ($ach["conditionValue"] ?? 1),
          !empty($ach["conditionCategory"])
            ? sanitize_string((string) $ach["conditionCategory"], 50)
            : null,
        ]);
        $imported["achievements"]++;
      }

      // ── Joueurs (non-destructif : ignore si username existe déjà) ──────
      $imported["players"] = 0;
      if (!empty($body["players"]) && is_array($body["players"])) {
        $stmtPlayer = $pdo->prepare(
          'INSERT IGNORE INTO users
                        (username, email, password_hash, age, gender, play_mode, is_admin, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 0, NOW())',
        );
        foreach ($body["players"] as $player) {
          if (empty($player["username"]) || empty($player["passwordHash"])) {
            continue;
          }
          $username = sanitize_string((string) $player["username"], 30);
          $email = !empty($player["email"])
            ? sanitize_string((string) $player["email"], 255)
            : null;
          $age =
            isset($player["age"]) && $player["age"] !== null
              ? max(13, min(120, (int) $player["age"]))
              : null;
          $gender = in_array($player["gender"] ?? "", ["male", "female", "other"], true)
            ? $player["gender"]
            : null;
          $playMode = in_array($player["playMode"] ?? "", ["solo", "multiplayer"], true)
            ? $player["playMode"]
            : "solo";
          $hash = (string) $player["passwordHash"];
          // Valider le format bcrypt avant insertion (évite l'injection d'un hash arbitraire)
          if (!preg_match('/^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9.\/]{53}$/', $hash)) {
            continue;
          }
          $stmtPlayer->execute([
            $username,
            $email,
            $hash, // hash bcrypt validé
            $age,
            $gender,
            $playMode,
          ]);
          if ($pdo->lastInsertId()) {
            $imported["players"]++;
          }
        }
      }

      $pdo->commit();
      json_response(["ok" => true, "imported" => $imported]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      error_log("[import_data] " . $e->getMessage());
      json_error('Erreur lors de l\'import. Vérifiez le format du fichier et réessayez.');
    }

  // ════════════════════════════════════════════════════════════════════════
  // CTF STATE
  // ════════════════════════════════════════════════════════════════════════

  case "ctf_state_stream":
    // SSE supprimé — saturait le pool Apache prefork (lesson 2026-05-21).
    // Le frontend utilise get_ctf_state en polling depuis 2026-05-21.
    http_response_code(410);
    json_response(
      ["ok" => false, "error" => "Endpoint SSE supprimé. Utilisez get_ctf_state."],
      410,
    );
  case "get_activity_logs":
    require_admin();
    $limit = min(max(1, (int) ($_GET["limit"] ?? 100)), 500);
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $type = sanitize_string($_GET["type"] ?? "", 50);
    $search = sanitize_string($_GET["q"] ?? "", 50);

    $pdo = get_pdo();
    $sql = "SELECT id, type, user_id, username, data, created_at FROM activity_logs WHERE 1=1";
    $params = [];
    if ($type !== "") {
      $sql .= " AND type = ?";
      $params[] = $type;
    }
    if ($search !== "") {
      $sql .= " AND username LIKE ?";
      $params[] = "%" . $search . "%";
    }
    $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();
    foreach ($logs as &$log) {
      $log["data"] = isset($log["data"]) ? json_decode($log["data"], true) : null;
    }
    unset($log);

    // Total pour la pagination
    $countSql = "SELECT COUNT(*) FROM activity_logs WHERE 1=1";
    $countParams = [];
    if ($type !== "") {
      $countSql .= " AND type = ?";
      $countParams[] = $type;
    }
    if ($search !== "") {
      $countSql .= " AND username LIKE ?";
      $countParams[] = "%" . $search . "%";
    }
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($countParams);
    $total = (int) $countStmt->fetchColumn();

    json_response(["ok" => true, "logs" => $logs, "total" => $total]);

  case "get_ctf_state":
    // Endpoint public : l'état du CTF (démarré/brouillage/podium) n'est pas
    // une information sensible. Pas de require_auth() pour éviter les 401
    // en boucle depuis la page de login (CTFStateProvider poll en permanence).
    $pdo = get_pdo();
    $rows = $pdo->query("SELECT state_key, state_value FROM ctf_state")->fetchAll();
    $state = [];
    foreach ($rows as $row) {
      $state[$row["state_key"]] = $row["state_value"];
    }
    json_response([
      "ok" => true,
      "state" => [
        "gameStarted" => ($state["game_started"] ?? "0") === "1",
        "scrambleStartedAt" => $state["scramble_started_at"] ?? "",
        "podiumVisible" => ($state["podium_visible"] ?? "0") === "1",
        "podiumRevealed" => (int) ($state["podium_revealed"] ?? 0),
        "eventTheme" => $state["event_theme"] ?? "",
      ],
    ]);

  case "set_ctf_state":
    $auth = require_admin();
    $body = get_body();
    $key = sanitize_string($body["key"] ?? "", 50);
    $value = sanitize_string($body["value"] ?? "", 100);
    $allowed = [
      "game_started",
      "scramble_started_at",
      "podium_visible",
      "podium_revealed",
      "event_theme",
    ];
    if (!in_array($key, $allowed, true)) {
      json_error("Clé invalide");
    }
    // Valider les valeurs selon la clé
    if ($key === "game_started" && !in_array($value, ["0", "1"], true)) {
      json_error("Valeur invalide");
    }
    if ($key === "podium_visible" && !in_array($value, ["0", "1"], true)) {
      json_error("Valeur invalide");
    }
    if (
      $key === "podium_revealed" &&
      (!ctype_digit($value) || (int) $value < 0 || (int) $value > 5)
    ) {
      json_error("Valeur invalide");
    }
    if ($key === "event_theme" && !in_array($value, ["", "halloween", "noel", "paques"], true)) {
      json_error("Thème invalide");
    }
    get_pdo()
      ->prepare(
        'INSERT INTO ctf_state (state_key, state_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE state_value = VALUES(state_value), updated_at = NOW()',
      )
      ->execute([$key, $value]);
    log_activity("ctf_state_change", (int) $auth["id"], $auth["username"] ?? "admin", [
      "key" => $key,
      "value" => $value,
    ]);
    notify_ws("ctf_state");
    json_response(["ok" => true]);

  case "update_play_mode":
    $auth = require_auth();
    if ($auth["is_admin"]) {
      json_error('Les admins n\'ont pas de mode de jeu');
    }
    $body = get_body();
    $playMode = sanitize_string($body["playMode"] ?? "");
    if (!in_array($playMode, ["solo", "multiplayer"], true)) {
      json_error("Mode invalide");
    }

    $pdo = get_pdo();
    // Vérifier que le jeu n'a pas commencé
    $stateStmt = $pdo->prepare("SELECT state_value FROM ctf_state WHERE state_key = ?");
    $stateStmt->execute(["game_started"]);
    $started = ($stateStmt->fetchColumn() ?? "0") === "1";
    if ($started) {
      json_error("Impossible de changer de mode une fois le jeu commencé");
    }

    $pdo->prepare("UPDATE users SET play_mode = ? WHERE id = ?")->execute([$playMode, $auth["id"]]);
    json_response(["ok" => true, "playMode" => $playMode]);

  case "get_podium":
    require_auth();
    $pdo = get_pdo();

    // 1. Top 3 solo
    $soloTop = $pdo
      ->query("SELECT user_id, username, flags_found, total_points FROM v_solo_ranking LIMIT 3")
      ->fetchAll();

    // 2. 1ère team multiplayer
    $teamTop = $pdo
      ->query(
        'SELECT team_id, team_name, emoji, flags_found, total_points, member_count
             FROM v_team_ranking LIMIT 1',
      )
      ->fetchAll();

    // 3. Joueur avec le plus de flags (tous modes)
    $mostFlags = $pdo
      ->query("SELECT user_id, username, play_mode, flags_found FROM v_most_flags LIMIT 1")
      ->fetch();

    json_response([
      "ok" => true,
      "soloTop3" => array_map(
        fn($r) => [
          "userId" => (int) $r["user_id"],
          "username" => $r["username"],
          "flagsFound" => (int) $r["flags_found"],
          "totalPoints" => (int) $r["total_points"],
        ],
        $soloTop,
      ),
      "teamFirst" => $teamTop
        ? [
          "teamId" => $teamTop[0]["team_id"],
          "teamName" => $teamTop[0]["team_name"],
          "emoji" => $teamTop[0]["emoji"],
          "flagsFound" => (int) $teamTop[0]["flags_found"],
          "totalPoints" => (int) $teamTop[0]["total_points"],
          "memberCount" => (int) $teamTop[0]["member_count"],
        ]
        : null,
      "mostFlags" => $mostFlags
        ? [
          "userId" => (int) $mostFlags["user_id"],
          "username" => $mostFlags["username"],
          "playMode" => $mostFlags["play_mode"],
          "flagsFound" => (int) $mostFlags["flags_found"],
        ]
        : null,
    ]);

  case "get_public_profile":
    // Endpoint public — aucune auth requise
    $username = sanitize_string($_GET["username"] ?? "", 30);
    if ($username === "") {
      json_error("Pseudo requis", 400);
    }
    $pdo = get_pdo();

    $user = $pdo->prepare(
      "SELECT id, username, avatar_emoji, bio, play_mode, created_at FROM users WHERE username = ? AND is_admin = 0",
    );
    $user->execute([$username]);
    $u = $user->fetch();
    if (!$u) {
      json_error("Joueur introuvable", 404);
    }

    $uid = (int) $u["id"];

    // Points + flags (solo)
    $statsStmt = $pdo->prepare('
            SELECT COUNT(s.id) AS solved,
                   COALESCE(SUM(c.points), 0) + COALESCE((SELECT SUM(bm.points) FROM bonus_malus bm WHERE bm.user_id = :uid2), 0) AS points
            FROM submissions s
            JOIN challenges c ON c.id = s.challenge_id
            WHERE s.user_id = :uid
        ');
    $statsStmt->execute([":uid" => $uid, ":uid2" => $uid]);
    $stats = $statsStmt->fetch();

    // Rang solo
    $rankStmt = $pdo->query('
            SELECT user_id, RANK() OVER (ORDER BY total_points DESC) AS rnk
            FROM v_solo_ranking
        ');
    $rank = null;
    while ($row = $rankStmt->fetch()) {
      if ((int) $row["user_id"] === $uid) {
        $rank = (int) $row["rnk"];
        break;
      }
    }

    // 5 derniers flags
    $flagsStmt = $pdo->prepare('
            SELECT c.id, c.title, c.category, c.points, s.submitted_at
            FROM submissions s
            JOIN challenges c ON c.id = s.challenge_id
            WHERE s.user_id = ?
            ORDER BY s.submitted_at DESC
            LIMIT 5
        ');
    $flagsStmt->execute([$uid]);
    $recentFlags = array_map(
      fn($f) => [
        "id" => (int) $f["id"],
        "title" => $f["title"],
        "category" => $f["category"],
        "points" => (int) $f["points"],
        "submittedAt" => $f["submitted_at"],
      ],
      $flagsStmt->fetchAll(),
    );

    // Progression par catégorie
    $catStmt = $pdo->prepare('
            SELECT c.category, COUNT(*) AS solved
            FROM submissions s
            JOIN challenges c ON c.id = s.challenge_id
            WHERE s.user_id = ?
            GROUP BY c.category
        ');
    $catStmt->execute([$uid]);
    $categoryProgress = [];
    foreach ($catStmt->fetchAll() as $row) {
      $categoryProgress[$row["category"]] = (int) $row["solved"];
    }

    // Achievements débloqués
    $achStmt = $pdo->prepare('
            SELECT a.id, a.title, a.icon, ua.unlocked_at
            FROM user_achievements ua
            JOIN achievements a ON a.id = ua.achievement_id
            WHERE ua.user_id = ?
            ORDER BY ua.unlocked_at DESC
        ');
    $achStmt->execute([$uid]);
    $achievements = array_map(
      fn($a) => [
        "id" => $a["id"],
        "title" => $a["title"],
        "icon" => $a["icon"],
        "unlockedAt" => $a["unlocked_at"],
      ],
      $achStmt->fetchAll(),
    );

    json_response([
      "ok" => true,
      "profile" => [
        "id" => $uid,
        "username" => $u["username"],
        "avatarEmoji" => $u["avatar_emoji"],
        "bio" => $u["bio"],
        "playMode" => $u["play_mode"],
        "createdAt" => $u["created_at"],
        "points" => (int) ($stats["points"] ?? 0),
        "solved" => (int) ($stats["solved"] ?? 0),
        "rank" => $rank,
        "recentFlags" => $recentFlags,
        "categoryProgress" => $categoryProgress,
        "achievements" => $achievements,
      ],
    ]);

  case "update_profile":
    $auth = require_auth();
    $body = get_body();
    $pdo = get_pdo();

    $avatarEmoji = sanitize_string($body["avatarEmoji"] ?? "", 10);
    $bio = sanitize_string($body["bio"] ?? "", 200);

    // Valider l'emoji : 1-2 caractères UTF-8 (emoji ou lettre)
    if (mb_strlen($avatarEmoji) < 1) {
      $avatarEmoji = "🎯";
    }

    $pdo
      ->prepare("UPDATE users SET avatar_emoji = ?, bio = ? WHERE id = ?")
      ->execute([$avatarEmoji, $bio, $auth["id"]]);

    log_activity("profile_updated", (int) $auth["id"], $auth["username"]);
    json_response(["ok" => true]);

  case "get_active_event":
    // Endpoint public — retourne l'événement en cours (non expiré)
    $pdo = get_pdo();
    $stmt = $pdo->query(
      'SELECT id, challenge_id, multiplier, is_mystery, started_at, ends_at
             FROM active_event
             WHERE ends_at > NOW()
             ORDER BY id DESC LIMIT 1',
    );
    $event = $stmt->fetch();
    if (!$event) {
      json_response(["ok" => true, "event" => null]);
    }
    $challengeId = (int) $event["challenge_id"];
    $isMystery = (bool) $event["is_mystery"];

    if ($isMystery) {
      // Ne pas révéler le challenge — juste signaler qu'un mystère est actif
      json_response([
        "ok" => true,
        "event" => [
          "id" => (int) $event["id"],
          "isMystery" => true,
          "multiplier" => (int) $event["multiplier"],
          "startedAt" => $event["started_at"],
          "endsAt" => $event["ends_at"],
          "challenge" => null,
        ],
      ]);
    }

    // Événement normal : exposer le challenge (sans flag)
    $cStmt = $pdo->prepare("SELECT id, title, category, points FROM challenges WHERE id = ?");
    $cStmt->execute([$challengeId]);
    $chal = $cStmt->fetch();

    json_response([
      "ok" => true,
      "event" => [
        "id" => (int) $event["id"],
        "isMystery" => false,
        "multiplier" => (int) $event["multiplier"],
        "startedAt" => $event["started_at"],
        "endsAt" => $event["ends_at"],
        "challenge" => $chal
          ? [
            "id" => (int) $chal["id"],
            "title" => $chal["title"],
            "category" => $chal["category"],
            "points" => (int) $chal["points"],
          ]
          : null,
      ],
    ]);

  case "trigger_event":
    $auth = require_admin();
    $pdo = get_pdo();

    // Annuler tout événement en cours
    $pdo->exec("DELETE FROM active_event WHERE ends_at > NOW()");

    // Tirer un challenge au sort
    $stmt = $pdo->query("SELECT id, title FROM challenges ORDER BY RAND() LIMIT 1");
    $chal = $stmt->fetch();
    if (!$chal) {
      json_error("Aucun challenge disponible");
    }

    $pdo
      ->prepare(
        'INSERT INTO active_event (challenge_id, multiplier, is_mystery, started_at, ends_at)
             VALUES (?, 2, 0, NOW(), DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      )
      ->execute([$chal["id"]]);

    log_activity("event_triggered", (int) $auth["id"], $auth["username"], [
      "challenge" => $chal["title"],
    ]);
    notify_ws("event");
    json_response(["ok" => true, "challengeTitle" => $chal["title"]]);

  case "trigger_mystery":
    $auth = require_admin();
    $pdo = get_pdo();

    // Annuler tout événement en cours
    $pdo->exec("DELETE FROM active_event WHERE ends_at > NOW()");

    // Tirer un challenge au sort (mystère — inconnu des joueurs)
    $stmt = $pdo->query("SELECT id, title FROM challenges ORDER BY RAND() LIMIT 1");
    $chal = $stmt->fetch();
    if (!$chal) {
      json_error("Aucun challenge disponible");
    }

    $pdo
      ->prepare(
        'INSERT INTO active_event (challenge_id, multiplier, is_mystery, started_at, ends_at)
             VALUES (?, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      )
      ->execute([$chal["id"]]);

    log_activity("mystery_triggered", (int) $auth["id"], $auth["username"]);
    notify_ws("mystery_challenge");
    json_response(["ok" => true]);

  case "cancel_event":
    require_admin();
    get_pdo()->exec("DELETE FROM active_event WHERE ends_at > NOW()");
    notify_ws("event");
    json_response(["ok" => true]);

  case "submit_mystery_flag":
    $auth = require_auth();
    if ($auth["is_admin"]) {
      json_error("Les admins ne peuvent pas soumettre de flags");
    }
    $body = get_body();
    $flagInput = trim($body["flag"] ?? "");
    $solveTimeMs = isset($body["solveTimeMs"])
      ? max(0, min((int) $body["solveTimeMs"], 86_400_000))
      : null;
    if (!$flagInput) {
      json_error("Flag manquant");
    }

    check_flag_rate_limit($auth["id"]);

    $pdo = get_pdo();

    // Trouver l'événement mystère actif
    $evStmt = $pdo->query(
      'SELECT id, challenge_id, multiplier FROM active_event
             WHERE is_mystery = 1 AND ends_at > NOW()
             ORDER BY id DESC LIMIT 1',
    );
    $event = $evStmt->fetch();
    if (!$event) {
      json_error("Aucun challenge mystère actif");
    }

    $challengeId = (int) $event["challenge_id"];
    $multiplier = (int) $event["multiplier"];

    $cStmt = $pdo->prepare("SELECT flag_encrypted, points, title FROM challenges WHERE id = ?");
    $cStmt->execute([$challengeId]);
    $chal = $cStmt->fetch();
    if (!$chal) {
      json_error("Challenge introuvable");
    }

    $expectedFlag = strtolower(trim(decrypt_flag($chal["flag_encrypted"])));
    $submittedFlag = strtolower(trim($flagInput));

    if (!hash_equals($expectedFlag, $submittedFlag)) {
      increment_flag_rate_limit($auth["id"]);
      json_response(["ok" => true, "correct" => false]);
    }

    $finalPoints = $chal["points"] * $multiplier;
    $userStmt = $pdo->prepare("SELECT play_mode FROM users WHERE id = ? LIMIT 1");
    $userStmt->execute([$auth["id"]]);
    $playMode = $userStmt->fetch()["play_mode"] ?? "solo";

    if ($playMode === "multiplayer") {
      $teamStmt = $pdo->prepare("SELECT team_id FROM team_members WHERE user_id = ? LIMIT 1");
      $teamStmt->execute([$auth["id"]]);
      $teamRow = $teamStmt->fetch();
      if (!$teamRow) {
        json_error("Vous devez appartenir à une équipe pour jouer en mode Multiplayer");
      }
      $teamId = $teamRow["team_id"];
      $tsCheck = $pdo->prepare(
        "SELECT id FROM team_submissions WHERE team_id = ? AND challenge_id = ?",
      );
      $tsCheck->execute([$teamId, $challengeId]);
      if ($tsCheck->fetch()) {
        json_error("Challenge déjà résolu par votre équipe");
      }
      $pdo
        ->prepare(
          'INSERT INTO team_submissions (team_id, challenge_id, solved_by, solve_time_ms, submitted_at)
                 VALUES (?, ?, ?, ?, NOW())',
        )
        ->execute([$teamId, $challengeId, $auth["id"], $solveTimeMs]);
    } else {
      $solvedCheck = $pdo->prepare(
        "SELECT id FROM submissions WHERE user_id = ? AND challenge_id = ?",
      );
      $solvedCheck->execute([$auth["id"], $challengeId]);
      if ($solvedCheck->fetch()) {
        json_error("Challenge déjà résolu");
      }
      $pdo
        ->prepare(
          'INSERT INTO submissions (user_id, challenge_id, solve_time_ms, submitted_at)
                 VALUES (?, ?, ?, NOW())',
        )
        ->execute([$auth["id"], $challengeId, $solveTimeMs]);
      evaluate_achievements_for_user($pdo, $auth["id"]);
    }

    log_activity("flag_correct", (int) $auth["id"], $auth["username"], [
      "challenge" => $chal["title"],
      "mystery" => true,
      "points" => $finalPoints,
      "boost" => $multiplier,
    ]);
    notify_ws("challenges");
    notify_ws("players");
    json_response([
      "ok" => true,
      "correct" => true,
      "points" => $finalPoints,
      "boost" => $multiplier,
      "title" => $chal["title"],
    ]);
}

json_error("Action inconnue : " . htmlspecialchars($action), 404);
