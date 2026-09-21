
-- ============================================================
-- CTF Arena — Tables v5.0
-- ============================================================
-- Ce fichier est exécuté en premier par Docker au démarrage.
-- Il ne contient que les CREATE TABLE — pas de données, pas de vues.
--
-- Pour repartir d'une base propre :
--   docker compose down -v && docker compose up
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS ctf_arena
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ctf_arena;

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(30)      NOT NULL,
    email         VARCHAR(255)     NULL,
    password_hash VARCHAR(255)     NOT NULL,
    age           TINYINT UNSIGNED NULL,
    gender        ENUM('male','female','other') NULL,
    is_admin      TINYINT(1)       NOT NULL DEFAULT 0,
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email    UNIQUE (email),
    CONSTRAINT ck_users_age      CHECK  (age IS NULL OR (age BETWEEN 13 AND 120)),
    INDEX idx_username (username),
    INDEX idx_email    (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Comptes joueurs et administrateurs de l''arène.';

-- ─── Rate limiting ────────────────────────────────────────────────────────────
-- SMALLINT UNSIGNED (max 65 535) — résiste à un burst sans overflow silencieux.
-- window_start en DATETIME pour cohérence avec les autres horodatages.

CREATE TABLE IF NOT EXISTS rate_limits (
    ip           VARCHAR(45)       NOT NULL,
    attempts     SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    window_start DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Limitation du nombre de tentatives de connexion par adresse IP.';

-- ─── Password resets ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_resets (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token_hash CHAR(64)     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used       TINYINT(1)   NOT NULL DEFAULT 0,
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_id    (user_id),
    CONSTRAINT fk_password_resets_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tokens de réinitialisation de mot de passe (usage unique, TTL géré applicativement).';

-- ─── Catégories ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
    id             VARCHAR(30)       PRIMARY KEY,
    name           VARCHAR(60)       NOT NULL,
    description    TEXT              NOT NULL,
    description_md TEXT              NULL COMMENT 'Description riche en Markdown',
    icon           VARCHAR(10)       NOT NULL,
    color          VARCHAR(7)        NOT NULL,
    sort_order     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catégories des challenges (OSINT, Web, Crypto, etc.).';

-- ─── Challenges ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    category        VARCHAR(30)  NOT NULL,
    points          INT UNSIGNED NOT NULL DEFAULT 100,
    description     TEXT         NOT NULL,
    flag_encrypted  TEXT         NOT NULL COMMENT 'Flag chiffré AES-256-GCM, jamais exposé',
    difficulty_mode ENUM('auto','easy','medium','hard') NOT NULL DEFAULT 'auto',
    difficulty      ENUM('easy','medium','hard') NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT ck_challenges_points CHECK (points > 0),
    INDEX idx_challenges_category (category),
    CONSTRAINT fk_challenges_categories FOREIGN KEY (category) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Épreuves du CTF — un enregistrement = un challenge avec son flag chiffré.';

-- ─── Fichiers challenges ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_files (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT UNSIGNED NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    INDEX idx_cf_challenge_id (challenge_id),
    CONSTRAINT fk_challenge_files_challenges FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Fichiers téléchargeables attachés à un challenge.';

-- ─── Soumissions ─────────────────────────────────────────────────────────────
-- Pas de colonnes dénormalisées — les données sont lues depuis challenges via JOIN.

CREATE TABLE IF NOT EXISTS submissions (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        INT UNSIGNED NOT NULL,
    challenge_id   INT UNSIGNED NOT NULL,
    points_awarded INT UNSIGNED NOT NULL DEFAULT 0
                   COMMENT 'Points gagnés à la résolution — figés, le barème est dégressif',
    solve_time_ms INT UNSIGNED NULL,
    submitted_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_submissions_user_challenge  UNIQUE  (user_id, challenge_id),
    CONSTRAINT ck_submissions_solve_time      CHECK   (solve_time_ms IS NULL OR solve_time_ms >= 0),
    INDEX idx_submissions_challenge_id          (challenge_id),
    INDEX idx_submissions_user_submitted        (user_id, submitted_at DESC),
    CONSTRAINT fk_submissions_users      FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
    CONSTRAINT fk_submissions_challenges FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Flags validés — une ligne = un challenge résolu par un joueur.';

-- ─── Essais de flags ──────────────────────────────────────────────────────────
-- Historique des flags erronés, visible du seul joueur qui les a tapés.
-- Les essais d'un challenge sont effacés dès qu'il est résolu.

CREATE TABLE IF NOT EXISTS flag_attempts (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    challenge_id INT UNSIGNED NOT NULL,
    attempt      VARCHAR(255) NOT NULL,
    submitted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fa_user_challenge (user_id, challenge_id, submitted_at DESC),
    CONSTRAINT fk_flag_attempts_users      FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
    CONSTRAINT fk_flag_attempts_challenges FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Flags erronés tentés par un joueur sur un challenge non résolu.';

-- ─── Achievements ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
    id                 CHAR(36)     PRIMARY KEY,
    title              VARCHAR(200) NOT NULL,
    description        TEXT         NOT NULL,
    icon               VARCHAR(10)  NOT NULL,
    condition_type     VARCHAR(30)  NOT NULL,
    condition_value    INT          NOT NULL DEFAULT 1,
    condition_category VARCHAR(30)  NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Définitions des succès débloquables (trophées).';

CREATE TABLE IF NOT EXISTS user_achievements (
    id             CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    user_id        INT UNSIGNED NOT NULL,
    achievement_id CHAR(36)     NOT NULL,
    unlocked_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_achievements        UNIQUE  (user_id, achievement_id),
    INDEX idx_ua_achievement_id            (achievement_id),
    CONSTRAINT fk_user_achievements_users        FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
    CONSTRAINT fk_user_achievements_achievements FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Association joueur ↔ succès débloqué (horodaté).';

-- ─── Amis ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS friend_requests (
    id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    from_user_id INT UNSIGNED NOT NULL,
    to_user_id   INT UNSIGNED NOT NULL,
    status       ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_friend_requests      UNIQUE (from_user_id, to_user_id),
    INDEX idx_fr_to_user_id            (to_user_id),
    CONSTRAINT fk_friend_requests_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_friend_requests_to   FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Demandes d''amitié entre joueurs (pending / accepted / rejected).';

-- ─── CTF State ────────────────────────────────────────────────────────────────
-- État global du CTF (clé-valeur) : game_started, scramble_started_at, podium_visible.

CREATE TABLE IF NOT EXISTS ctf_state (
    state_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
    state_value VARCHAR(255) NOT NULL DEFAULT '',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='État global du CTF (game_started, scramble_started_at, podium_visible).';

