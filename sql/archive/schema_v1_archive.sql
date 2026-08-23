
-- ============================================================
-- CTF Arena - Base de donnees MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS ctf_arena
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ctf_arena;

CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
    id          VARCHAR(30) PRIMARY KEY,
    name        VARCHAR(60)  NOT NULL,
    description TEXT         NOT NULL,
    icon        VARCHAR(10)  NOT NULL,
    color       VARCHAR(7)   NOT NULL
) ENGINE=InnoDB;

INSERT INTO categories (id, name, description, icon, color) VALUES
('OSINT',     'OSINT',                'Recherche d informations publiques.', '🔍', '#3B82F6'),
('STEGANO',   'Steganographie',       'Dissimulation de donnees.',            '🕵️', '#8B5CF6'),
('CRYPTO',    'Cryptographie',        'Chiffrement et attaque de chiffre.',   '🔐', '#EF4444'),
('WEB',       'Web',                  'Vulnerabilites d applications web.',   '🌐', '#10B981'),
('FORENSIC',  'Forensic',             'Analyse de traces numeriques.',        '🔬', '#14B8A6'),
('MISC',      'Misc',                 'Divers challenges.',                   '🎲', '#6B7280');

CREATE TABLE challenges (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    category    VARCHAR(30)  NOT NULL,
    points      INT UNSIGNED NOT NULL DEFAULT 100,
    description TEXT         NOT NULL,
    flag        VARCHAR(500) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE challenge_files (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT UNSIGNED NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE submissions (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    challenge_id INT UNSIGNED NOT NULL,
    submitted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_solve (user_id, challenge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE VIEW v_ranking AS
SELECT
    u.id AS user_id,
    u.username,
    COUNT(s.id) AS flags_found,
    COALESCE(SUM(c.points), 0) AS total_points
FROM users u
LEFT JOIN submissions s ON s.user_id = u.id
LEFT JOIN challenges c ON c.id = s.challenge_id
WHERE u.is_admin = 0
GROUP BY u.id, u.username
ORDER BY total_points DESC;

CREATE VIEW v_submissions AS
SELECT
    s.id,
    u.username,
    c.title AS challenge_title,
    c.category,
    c.points,
    s.submitted_at
FROM submissions s
JOIN users u ON u.id = s.user_id
JOIN challenges c ON c.id = s.challenge_id
ORDER BY s.submitted_at DESC;

