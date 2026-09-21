
-- ============================================================
-- CTF Arena — Vues v5.0
-- ============================================================

USE ctf_arena;

-- ─── Classement ────────────────────────────────────────────────────────────────

-- Un joueur n'y entre qu'à partir de son premier flag validé.
CREATE OR REPLACE VIEW v_solo_ranking AS
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
ORDER BY total_points DESC, flags_found DESC;

-- ─── Joueur avec le plus de flags ─────────────────────────────────────────────

CREATE OR REPLACE VIEW v_most_flags AS
SELECT
    u.id       AS user_id,
    u.username,
    (SELECT COUNT(*) FROM submissions WHERE user_id = u.id) AS flags_found
FROM users u
WHERE u.is_admin = 0
ORDER BY flags_found DESC;

-- ─── Vue legacy (alias pour compatibilité) ───────────────────────────────────
CREATE OR REPLACE VIEW v_ranking AS
SELECT * FROM v_solo_ranking;

