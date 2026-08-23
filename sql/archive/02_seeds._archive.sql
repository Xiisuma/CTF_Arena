
-- ============================================================
-- CTF Arena — Données initiales v4.0
-- ============================================================
-- Catégories par défaut de l'arène.
-- Modifie ce fichier pour ajouter, retirer ou renommer
-- des catégories sans toucher au schéma.
-- ============================================================

USE ctf_arena;

INSERT IGNORE INTO categories (id, name, description, description_md, icon, color, sort_order) VALUES
('OSINT',
 'OSINT',
 'L''OSINT consiste à collecter et analyser des informations accessibles publiquement.',
 '## OSINT\nL''**Open Source Intelligence** consiste à collecter et analyser des informations accessibles publiquement.\n\n- Réseaux sociaux\n- Moteurs de recherche\n- Bases de données publiques',
 '🔍', '#3B82F6', 1),

('Stéganographie',
 'Stéganographie',
 'La stéganographie cache des données dans un support anodin (image, audio, vidéo, texte).',
 '## Stéganographie\nL''art de **cacher des données** dans un support anodin.\n\n- Images (LSB, metadata)\n- Audio / Vidéo\n- Texte',
 '🕵️', '#8B5CF6', 2),

('Cryptographie',
 'Cryptographie',
 'La cryptographie traite le chiffrement, le déchiffrement, les attaques et les erreurs de conception.',
 '## Cryptographie\nChiffrement, déchiffrement et **attaques** de systèmes cryptographiques.\n\n- Chiffres classiques\n- RSA, AES\n- Hash et signatures',
 '🔐', '#EF4444', 3),

('Web',
 'Web',
 'Les challenges Web exploitent des vulnérabilités applicatives comme XSS, SQLi, LFI et CSRF.',
 '## Web\nExploitation de **vulnérabilités** dans les applications web.\n\n- XSS, SQLi, CSRF\n- LFI / RFI\n- Authentification',
 '🌐', '#10B981', 4),

('Forensic',
 'Forensic',
 'La forensique numérique analyse des traces numériques pour reconstruire des événements.',
 '## Forensic\nAnalyse de **traces numériques** pour reconstruire des événements.\n\n- Analyse de logs\n- Mémoire et disques\n- Réseau (PCAP)',
 '🔬', '#14B8A6', 5),

('Misc',
 'Misc',
 'La catégorie Misc regroupe les épreuves diverses : logique, programmation, quiz et puzzles.',
 '## Misc\nCatégorie **fourre-tout** regroupant les épreuves diverses.\n\n- Logique et puzzles\n- Programmation\n- Quiz',
 '🎲', '#6B7280', 6);

