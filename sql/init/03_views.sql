
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
    (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id)             AS flags_found,
    (SELECT COALESCE(SUM(s.points_awarded), 0) FROM submissions s WHERE s.user_id = u.id)
      + (SELECT COALESCE(SUM(ua.points_awarded), 0) FROM user_achievements ua WHERE ua.user_id = u.id)
                                                                            AS total_points
FROM users u
WHERE u.is_admin = 0
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

