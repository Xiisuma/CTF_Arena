
-- ============================================================
-- fix_encoding.sql — Répare le mojibake UTF-8/Latin-1
--
-- QUAND L'UTILISER :
--   Si ta base tourne déjà et que les catégories affichent des
--   caractères corrompus (ex : "StÃ©ganographie", "ðŸ•µ")
--
-- COMMENT L'APPLIQUER (depuis le dossier du projet) :
--   docker compose exec db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ctf_arena \
--     < sql/fix_encoding.sql
--
-- POURQUOI ÇA FONCTIONNE :
--   Le bug vient d'un INSERT exécuté avec charset=latin1.
--   Les octets UTF-8 de "é" (C3 A9) ont été traités comme deux
--   caractères Latin-1 (Ã + ©) puis re-encodés en UTF-8 → "Ã©".
--   La conversion inverse :
--     CONVERT(BINARY CONVERT(colonne USING latin1) USING utf8mb4)
--   re-interprète les mauvais octets comme du vrai UTF-8.
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ctf_arena;

-- ─── Catégories ───────────────────────────────────────────────────────────────
-- Répare uniquement les lignes dont le nom contient le pattern mojibake
-- (Ã, ð, Å, etc.) pour ne pas toucher aux lignes déjà correctes.

UPDATE categories
SET
    name           = CONVERT(BINARY CONVERT(name           USING latin1) USING utf8mb4),
    description    = CONVERT(BINARY CONVERT(description    USING latin1) USING utf8mb4),
    description_md = IF(
        description_md IS NULL,
        NULL,
        CONVERT(BINARY CONVERT(description_md USING latin1) USING utf8mb4)
    ),
    icon           = CONVERT(BINARY CONVERT(icon           USING latin1) USING utf8mb4)
WHERE
    -- Détecte les marqueurs typiques du mojibake UTF-8→Latin-1
    name        REGEXP '[Ã\Å\Ã\ð\â\Ã\Ãœ\ï]'
    OR icon     REGEXP '[ðŸ\â]';

-- ─── Vérification visuelle ────────────────────────────────────────────────────

SELECT id, name, icon FROM categories ORDER BY sort_order;

