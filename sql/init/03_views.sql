
-- ============================================================
-- CTF Arena — Vues v5.0
-- ============================================================

USE ctf_arena;

-- ─── Classement Solo ──────────────────────────────────────────────────────────
-- Uniquement les joueurs avec play_mode = 'solo'

CREATE OR REPLACE VIEW v_solo_ranking AS
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
ORDER BY total_points DESC, flags_found DESC;

-- ─── Classement Teams (Multiplayer) ──────────────────────────────────────────
-- Basé sur team_submissions (flags au niveau équipe)

CREATE OR REPLACE VIEW v_team_ranking AS
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
ORDER BY total_points DESC, flags_found DESC;

-- ─── Joueur avec le plus de flags (tous modes) ───────────────────────────────
-- Union des flags solo (submissions) + flags équipe attribués à chaque membre

CREATE OR REPLACE VIEW v_most_flags AS
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
ORDER BY flags_found DESC;

-- ─── Vue legacy (alias pour compatibilité) ───────────────────────────────────
CREATE OR REPLACE VIEW v_ranking AS
SELECT * FROM v_solo_ranking;

