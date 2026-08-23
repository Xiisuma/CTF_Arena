# 🛡️ Rapport de Sécurité — CTF Arena

**Projet :** CTF Arena v4.2  
**Date :** 2026-05-23  
**Auditeur :** Claude (Cowork)  
**Fichiers analysés :** 107 (api.php, init.php, src/**/*.ts, src/**/*.tsx, sql/init/*, nginx.conf, php.ini, docker-compose.yml, .env, Dockerfile*)

---

## Résumé

| Sévérité | Nombre |
|----------|--------|
| 🔴 Critique | 0 |
| 🟠 Élevée | 1 |
| 🟡 Moyenne | 5 |
| 🔵 Faible | 5 |

**Verdict général : base de code saine.** Les fondations sécurité sont solides — PDO préparé partout, chiffrement AES-256-GCM des flags, CSRF avec `hash_equals`, sessions HTTP-only/SameSite=Strict, rate limiting, CORS whitelist, CSP stricte, DOMPurify sur tout le Markdown. Les problèmes identifiés sont ciblés et corrigeables rapidement.

---

## 🟠 Problème ÉLEVÉ

---

### [ÉLEVÉ] UPLOAD — Blocklist MIME trop étroite

**Fichier :** `api.php`, lignes 484–486  
**Description :** La vérification MIME (`finfo`) bloque uniquement PHP et HTML. Les types `application/javascript`, `text/javascript`, `application/xml`, `image/svg+xml` ne sont pas bloqués. Un fichier JS ou SVG uploadé (si l'extension est autorisée comme `.js`) passe les deux filtres (extension + MIME), est stocké dans `/uploads/`, et est servi avec `Content-Disposition: attachment` — donc non exécutable en contexte navigateur. Mais si la config nginx change un jour, le risque d'XSS stocké remonte immédiatement au niveau critique.

**Code vulnérable :**
```php
$blockedMime = ['text/x-php', 'application/x-httpd-php', 'application/x-php',
                'text/html', 'application/xhtml+xml'];
if ($mimeType !== false && in_array($mimeType, $blockedMime, true)) continue;
// application/javascript, text/javascript, image/svg+xml → passent !
```

**Correction proposée :**
```php
// Passer à une allowlist plutôt qu'une blocklist
$allowedMime = [
    // Archives
    'application/zip', 'application/x-tar', 'application/gzip',
    'application/x-7z-compressed', 'application/x-bzip2',
    // Texte brut
    'text/plain', 'application/pdf', 'text/csv',
    // Images raster uniquement (pas SVG)
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    // Audio / vidéo
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/x-msvideo', 'video/x-matroska',
    // Captures réseau
    'application/vnd.tcpdump.pcap', 'application/octet-stream',
    // JSON / XML avec restrictions (jamais HTML)
    'application/json',
];
if ($mimeType === false || !in_array($mimeType, $allowedMime, true)) continue;
```

**Références :** OWASP File Upload Cheat Sheet

---

## 🟡 Problèmes MOYENS

---

### [MOYEN] PHP — Comparaison de flag non constant-time

**Fichier :** `api.php`, ligne 1000  
**Description :** La comparaison entre le flag soumis et le flag déchiffré utilise l'opérateur `!==` de PHP, qui n'est pas constant-time. En théorie, un attaquant peut mesurer les différences de temps de réponse pour déduire des informations sur le flag. En pratique, le rate limiting (10 tentatives / 5 min) rend cette attaque extrêmement lente, mais le principe de défense en profondeur recommande d'utiliser `hash_equals`.

**Code vulnérable :**
```php
if (strtolower(trim(decrypt_flag($chal['flag_encrypted']))) !== strtolower($flagInput)) {
    increment_flag_rate_limit($auth['id']);
    json_response(['ok' => true, 'correct' => false]);
}
```

**Correction proposée :**
```php
$expectedFlag = strtolower(trim(decrypt_flag($chal['flag_encrypted'])));
$submittedFlag = strtolower(trim($flagInput));
if (!hash_equals($expectedFlag, $submittedFlag)) {
    increment_flag_rate_limit($auth['id']);
    json_response(['ok' => true, 'correct' => false]);
}
```

---

### [MOYEN] ENDPOINT — `get_teams` sans LIMIT de résultats

**Fichier :** `api.php`, lignes 1442–1455  
**Description :** L'endpoint `get_teams` retourne **toutes** les équipes sans pagination. Avec des milliers d'équipes, la réponse JSON peut peser plusieurs Mo et saturer la mémoire PHP (256M configuré dans `php.ini`). Tous les joueurs authentifiés peuvent déclencher cet endpoint.

**Code vulnérable :**
```php
case 'get_teams': {
    require_auth();
    // ...
    $sql .= ' ORDER BY name';
    $stmt = get_pdo()->prepare($sql);
    $stmt->execute($params);
    // Aucun LIMIT — retourne toutes les équipes
```

**Correction proposée :**
```php
$limit  = min(max(1, (int)($_GET['limit']  ?? 50)), 200);
$offset = max(0, (int)($_GET['offset'] ?? 0));
$sql .= ' ORDER BY name LIMIT ? OFFSET ?';
$params[] = $limit;
$params[] = $offset;
```

---

### [MOYEN] SSE — `ctf_state_stream` public et connexion longue durée

**Fichier :** `api.php`, lignes 1907–1961  
**Description :** L'endpoint SSE maintient une connexion ouverte pendant 55 secondes **sans authentification** et sans rate limiting. Apache prefork alloue 1 worker par connexion active. Avec suffisamment de connexions simultanées, le pool de workers est épuisé et toutes les routes renvoient 404/503. Le commentaire dans le code reconnaît ce problème ("SSE saturait le pool Apache prefork") mais l'endpoint reste actif.

**Code vulnérable :**
```php
case 'ctf_state_stream': {
    // Endpoint conservé pour compatibilité, mais le frontend utilise désormais
    // du polling simple (get_ctf_state). SSE saturait le pool Apache prefork.
    // Endpoint public (pas de require_auth)
    set_time_limit(0);
    // ... connexion pendant 55 secondes ...
```

**Correction proposée :**
```php
// Option 1 (recommandée) : supprimer l'endpoint complètement
// Le frontend utilise get_ctf_state en polling depuis mai 2026

// Option 2 : ajouter require_auth() + rate limiting par IP
case 'ctf_state_stream': {
    require_auth();
    $ip = get_client_ip();
    check_rate_limit($ip);
    // ...
```

---

### [MOYEN] API — Message d'erreur DB exposé dans `import_data`

**Fichier :** `api.php`, ligne 1898  
**Description :** En cas d'exception lors de l'import, le message complet de l'exception PDO (qui peut contenir le nom de table, le nom de colonne, ou une contrainte SQL) est renvoyé au client. Même si l'endpoint est admin-only, un log serveur serait plus approprié.

**Code vulnérable :**
```php
} catch (Throwable $e) {
    $pdo->rollBack();
    json_error('Erreur lors de l\'import : ' . $e->getMessage());
}
```

**Correction proposée :**
```php
} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('[import_data] ' . $e->getMessage());
    json_error('Import échoué — vérifiez les logs serveur.', 500);
}
```

---

### [MOYEN] SQL — `ctf_state.state_value` déclarée `TEXT DEFAULT ''` incompatible MySQL 8.4

**Fichier :** `sql/init/01_tables.sql`, ligne de la table `ctf_state`  
**Description :** MySQL 8.4 interdit `DEFAULT` sur les colonnes `TEXT/BLOB` (SQLSTATE 42000 / erreur 1101). Si le volume Docker est vierge, le script d'init échoue silencieusement, la table n'est pas créée, et `api.php?action=get_ctf_state` plante en boucle. `init.php` crée correctement la table avec `VARCHAR(255)`, mais les deux définitions sont incohérentes.

**Code vulnérable** (`sql/init/01_tables.sql`) :
```sql
CREATE TABLE IF NOT EXISTS ctf_state (
    state_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
    state_value TEXT         NOT NULL DEFAULT '',  -- ❌ MySQL 8.4
    ...
```

**Correction proposée :**
```sql
CREATE TABLE IF NOT EXISTS ctf_state (
    state_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
    state_value VARCHAR(255) NOT NULL DEFAULT '',  -- ✅ cohérent avec init.php
    ...
```

---

## 🔵 Problèmes FAIBLES

---

### [FAIBLE] EXPORT — Hash bcrypt des joueurs inclus dans l'export JSON

**Fichier :** `api.php`, lignes 1739–1750  
**Description :** L'export admin inclut `password_hash` (bcrypt cost=12) de tous les joueurs. Si le fichier export est transmis à un tiers ou stocké sans précaution, les hashes peuvent être soumis à des attaques offline (bien que bcrypt cost=12 soit lent ~100ms/hash). Envisager un export sans hash, ou une confirmation explicite avant l'export avec joueurs.

**Correction proposée :**
- Séparer l'export en deux modes : "CTF data only" (catégories, challenges, achievements) et "Full backup avec joueurs"
- Afficher un avertissement UI avant l'export avec joueurs
- Ou supprimer `passwordHash` de l'export et forcer les joueurs à créer un nouveau mot de passe à l'import

---

### [FAIBLE] IMPORT — `passwordHash` non validé comme hash bcrypt

**Fichier :** `api.php`, ligne 1885  
**Description :** Lors de l'import de joueurs, `$player['passwordHash']` est inséré directement dans `password_hash` sans vérifier que c'est un vrai hash bcrypt (format `$2y$12$...`). N'importe quelle chaîne peut être insérée, rendant le compte inaccessible ou avec un hash connu. Admin-only.

**Correction proposée :**
```php
$hash = (string)$player['passwordHash'];
// Vérifier que c'est un hash bcrypt valide
if (!preg_match('/^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9.\/]{53}$/', $hash)) continue;
$stmtPlayer->execute([$username, $email, $hash, $age, $gender, $playMode]);
```

---

### [FAIBLE] DÉPENDANCE — `vite-plugin-singlefile` installée mais inutilisée

**Fichier :** `package.json`, `vite.config.ts`  
**Description :** `vite-plugin-singlefile@2.3.0` est dans `package.json` mais absente de `vite.config.ts` (retirée suite à l'incompatibilité CSP). Elle reste dans `node_modules` et dans la surface d'attaque des dépendances.

**Correction proposée :**
```bash
npm uninstall vite-plugin-singlefile
```

---

### [FAIBLE] HTTP HEADER — `X-XSS-Protection` obsolète

**Fichier :** `api.php`, ligne 80  
**Description :** `X-XSS-Protection: 1; mode=block` est déprécié depuis 2019 et retiré des navigateurs modernes (Chrome 78+, Firefox 1+). Dans des cas rares sur des navigateurs anciens, ce header peut *introduire* des vulnérabilités XSS au lieu d'en bloquer. La CSP `script-src 'self'` remplit déjà ce rôle de façon plus robuste.

**Correction proposée :**
```php
// Supprimer cette ligne dans api.php
header('X-XSS-Protection: 1; mode=block');
```

---

### [FAIBLE] TEAMS — `get_team_members` exposé à tous les membres authentifiés y compris pour les équipes privées

**Fichier :** `api.php`, lignes 1471–1488  
**Description :** Tout joueur authentifié peut appeler `get_team_members?teamId=<id>` pour obtenir la liste des membres, leurs rôles et leurs points d'une équipe — **même si l'équipe est privée** (`is_public = 0`). Aucune vérification de membership ou de visibilité.

**Code vulnérable :**
```php
case 'get_team_members': {
    require_auth();   // ← authentifié, mais aucun check d'appartenance
    $teamId = sanitize_string($_GET['teamId'] ?? '', 36);
    // retourne tous les membres de n'importe quelle team
```

**Correction proposée :**
```php
case 'get_team_members': {
    $auth   = require_auth();
    $teamId = sanitize_string($_GET['teamId'] ?? '', 36);
    if (!$teamId) json_error('teamId manquant');

    $pdo = get_pdo();
    // Vérifier que la team est publique OU que l'appelant en est membre (OU admin)
    $teamStmt = $pdo->prepare('SELECT is_public FROM teams WHERE id = ?');
    $teamStmt->execute([$teamId]);
    $team = $teamStmt->fetch();
    if (!$team) json_error('Team introuvable', 404);

    if (!$team['is_public'] && !$auth['is_admin']) {
        $memberStmt = $pdo->prepare('SELECT id FROM team_members WHERE team_id=? AND user_id=?');
        $memberStmt->execute([$teamId, $auth['id']]);
        if (!$memberStmt->fetch()) json_error('Accès refusé', 403);
    }
    // ... suite inchangée
```

---

## ✅ Ce qui fonctionne bien

Les points suivants ont été explicitement vérifiés et sont sains :

- **Pas d'injection SQL** — toutes les requêtes utilisent PDO avec requêtes préparées et paramètres liés. Aucune concaténation de string avec input utilisateur dans le SQL.
- **Chiffrement des flags** — AES-256-GCM avec nonce aléatoire (`random_bytes(12)`) à chaque chiffrement. La clé ne sort jamais du serveur.
- **CSRF** — token `hash_equals`, régénération de session à chaque login/register, présent sur toutes les mutations POST authentifiées.
- **XSS frontend** — `dangerouslySetInnerHTML` uniquement via `renderMarkdown()` qui sanitize avec DOMPurify (allowlist stricte : h2, h3, strong, em, ul, li, p, br + class seulement).
- **Sessions** — `cookie_httponly=1`, `cookie_samesite=Strict`, `use_strict_mode=1`, `session_regenerate_id(true)` après login.
- **Authentification** — bcrypt cost=12, `password_needs_rehash` pour la mise à jour automatique.
- **CORS** — whitelist stricte via `ALLOWED_ORIGINS`, `X-Forwarded-For` vidé dans nginx pour bloquer l'IP spoofing.
- **CSP nginx** — `script-src 'self'` sans `unsafe-inline`, `frame-ancestors 'none'`, `form-action 'self'`.
- **Confinement des uploads** — `realpath()` check pour path traversal, blocage PHP dans `/uploads/` côté nginx, `Content-Disposition: attachment` forcé.
- **Rate limiting** — 5 tentatives/10 min par IP (login), 10 tentatives/5 min par user (flag), table `rate_limits` en BDD.
- **Secrets** — `FLAG_ENCRYPT_KEY` et `RESET_SECRET` obligatoires via `require_env()`, pas de fallback hardcodé pour les secrets critiques.
- **Pas de SELECT \*** — toutes les requêtes listent explicitement les colonnes ; `password_hash` et `flag_encrypted` n'apparaissent jamais dans les réponses JSON joueur.

---

## Recommandations générales

1. **Supprimer `ctf_state_stream`** — L'endpoint SSE est déjà remplacé par du polling mais reste actif. Supprimer le `case` entier ou renvoyer un 410 Gone.

2. **Unifier les définitions de schéma** — Utiliser `init.php` comme source de vérité pour les migrations DDL (`CREATE OR REPLACE`), ou aligner `sql/init/01_tables.sql` avec les corrections de `init.php` (TEXT → VARCHAR sur `ctf_state`).

3. **Ajouter un rate-limit sur `send_friend_request`** — Aucun mécanisme ne limite le nombre de demandes d'amis envoyées. Un script pourrait spammer des demandes vers un userId cible.

4. **Envisager une bibliothèque SMTP** (ex: PHPMailer, Symfony Mailer) pour remplacer `mail()` — support TLS/STARTTLS, meilleure gestion des encodages et des pièces jointes.

5. **Ajouter un `Content-Security-Policy-Report-Only`** en parallèle de la CSP actuelle pour détecter les violations avant de les bloquer.
