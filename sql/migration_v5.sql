
-- ============================================================
-- CTF Arena — Migration v5.0
-- Solo vs Multiplayer + CTF state + Team submissions
-- ============================================================

USE ctf_arena;

-- 1. play_mode sur users (modifiable tant que game_started=0)
ALTER TABLE users
    ADD COLUMN play_mode ENUM('solo','multiplayer') NOT NULL DEFAULT 'solo'
    AFTER gender;

-- 2. Table team_submissions (flags au niveau équipe pour les joueurs multiplayer)
CREATE TABLE IF NOT EXISTS team_submissions (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    team_id       CHAR(32)     NOT NULL,
    challenge_id  INT UNSIGNED NOT NULL,
    solved_by     INT UNSIGNED NOT NULL  COMMENT 'user_id du membre qui a soumis le flag',
    solve_time_ms INT UNSIGNED NULL,
    submitted_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_submissions_team_challenge UNIQUE (team_id, challenge_id),
    CONSTRAINT ck_team_submissions_solve_time CHECK (solve_time_ms IS NULL OR solve_time_ms >= 0),
    INDEX idx_ts_team_id       (team_id),
    INDEX idx_ts_challenge_id  (challenge_id),
    INDEX idx_ts_solved_by     (solved_by),
    CONSTRAINT fk_team_submissions_teams      FOREIGN KEY (team_id)      REFERENCES teams(id)      ON DELETE CASCADE,
    CONSTRAINT fk_team_submissions_challenges FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_submissions_users      FOREIGN KEY (solved_by)    REFERENCES users(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Flags validés au niveau équipe — une ligne = un challenge résolu par une équipe.';

-- 3. Table ctf_state (état du CTF, clé-valeur)
CREATE TABLE IF NOT EXISTS ctf_state (
    state_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
    state_value TEXT         NOT NULL DEFAULT '',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='État global du CTF (game_started, scramble_started_at, podium_visible).';

-- Valeurs initiales
INSERT IGNORE INTO ctf_state (state_key, state_value) VALUES
    ('game_started',      '0'),
    ('scramble_started_at', ''),
    ('podium_visible',    '0');

