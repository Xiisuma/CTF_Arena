
-- ============================================================
-- CTF Arena — Migration v3.1
-- À exécuter si vous avez DÉJÀ une base de données v3.0
-- (nouvelle installation : utiliser schema_auth.sql directement)
-- ============================================================

USE ctf_arena;

-- Ajouter description_md si elle n'existe pas
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS description_md TEXT NULL
        COMMENT 'Description riche en Markdown';

-- Ajouter sort_order si elle n'existe pas
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0;

-- Index sur sort_order
CREATE INDEX IF NOT EXISTS idx_sort_order ON categories(sort_order);

-- Initialiser sort_order pour les catégories existantes dans l'ordre logique
SET @rank = 0;
UPDATE categories
SET sort_order = (@rank := @rank + 1)
ORDER BY FIELD(id,
    'OSINT',
    'Stéganographie',
    'Cryptographie',
    'Web',
    'Forensic',
    'Misc'
);

-- Pour les catégories non listées ci-dessus, leur attribuer un ordre après
UPDATE categories
SET sort_order = sort_order + 100
WHERE sort_order = 0;

-- Renuméroter proprement à partir de 1
SET @i = 0;
UPDATE categories
SET sort_order = (@i := @i + 1)
ORDER BY sort_order ASC, name ASC;

-- Initialiser description_md pour les catégories par défaut existantes
UPDATE categories SET description_md = '## OSINT\nL''**Open Source Intelligence** consiste à collecter et analyser des informations accessibles publiquement.\n\n- Réseaux sociaux\n- Moteurs de recherche\n- Bases de données publiques'
WHERE id = 'OSINT' AND (description_md IS NULL OR description_md = '');

UPDATE categories SET description_md = '## Stéganographie\nL''art de **cacher des données** dans un support anodin.\n\n- Images (LSB, metadata)\n- Audio / Vidéo\n- Texte'
WHERE id = 'Stéganographie' AND (description_md IS NULL OR description_md = '');

UPDATE categories SET description_md = '## Cryptographie\nChiffrement, déchiffrement et **attaques** de systèmes cryptographiques.\n\n- Chiffres classiques\n- RSA, AES\n- Hash et signatures'
WHERE id = 'Cryptographie' AND (description_md IS NULL OR description_md = '');

UPDATE categories SET description_md = '## Web\nExploitation de **vulnérabilités** dans les applications web.\n\n- XSS, SQLi, CSRF\n- LFI / RFI\n- Authentification'
WHERE id = 'Web' AND (description_md IS NULL OR description_md = '');

UPDATE categories SET description_md = '## Forensic\nAnalyse de **traces numériques** pour reconstruire des événements.\n\n- Analyse de logs\n- Mémoire et disques\n- Réseau (PCAP)'
WHERE id = 'Forensic' AND (description_md IS NULL OR description_md = '');

UPDATE categories SET description_md = '## Misc\nCatégorie **fourre-tout** regroupant les épreuves diverses.\n\n- Logique et puzzles\n- Programmation\n- Quiz'
WHERE id = 'Misc' AND (description_md IS NULL OR description_md = '');

SELECT 'Migration v3.1 terminée.' AS status;
SELECT id, name, sort_order FROM categories ORDER BY sort_order;
