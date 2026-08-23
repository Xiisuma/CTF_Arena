# 🛡️ Rapport de Sécurité — Passe #5

**Projet :** CTF Arena  
**Date :** 2026-05-15  
**Fichiers analysés :** 38 (api.php, Dockerfile*, docker-compose.yml, nginx.conf, .env, schema_auth.sql, tous les .ts/.tsx)

---

## Résumé

| Sévérité | Nombre |
|----------|--------|
| 🔴 Critique | 0 |
| 🟠 Élevée | 0 |
| 🟡 Moyenne | 3 |
| 🔵 Faible | 5 |

---

## Problèmes détectés

---

### [🟡 MOYENNE] Upload — SVG XSS via accès URL direct

**Fichier :** `Dockerfile.backend` + `api.php` ligne 388  
**Description :** Les fichiers SVG sont autorisés en upload (`UPLOAD_ALLOWED_EXT`). L'endpoint `download_file` force `application/octet-stream` (sécurisé), mais la route `/uploads` dans nginx proxifie directement vers Apache qui sert les SVG avec `Content-Type: image/svg+xml`. Un SVG contenant du JavaScript (`<script>alert(1)</script>` ou `onload=...`) s'exécuterait si un utilisateur accède à l'URL directe `/uploads/challenges/xxx.svg`.

Seuls les admins peuvent uploader — le risque immédiat est limité — mais la surface existe et va à l'encontre du principe de défense en profondeur.

**Code vulnérable :**
```php
// api.php ligne 385-395
const UPLOAD_ALLOWED_EXT = [
    'zip', 'tar', 'gz', ...
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',  // ← SVG accepté
    ...
];
```

**Correction proposée :**  
Option A (recommandée) — retirer `svg` de la liste blanche :
```php
const UPLOAD_ALLOWED_EXT = [
    'zip', 'tar', 'gz', '7z', 'rar', 'bz2',
    'txt', 'md', 'pdf',
    'png', 'jpg', 'jpeg', 'gif', 'webp',  // SVG retiré
    'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mkv',
    'pcap', 'pcapng', 'bin', 'hex', 'raw', 'img', 'iso',
    'py', 'js', 'c', 'cpp', 'rs', 'go', 'java',
    'html', 'css', 'xml', 'json', 'yaml', 'csv',
    'exe', 'elf', 'so', 'dll', 'apk',
];
```

Option B — ajouter dans nginx un header `Content-Disposition: attachment` sur `/uploads` :
```nginx
location /uploads {
    add_header Content-Disposition "attachment" always;
    add_header X-Content-Type-Options "nosniff" always;
    ...
}
```

---

### [🟡 MOYENNE] IDOR — `get_user_team` accessible sans restriction

**Fichier :** `api.php` ligne 1246–1255  
**Description :** L'endpoint accepte un paramètre `userId` arbitraire sans vérifier si le demandeur est admin. N'importe quel utilisateur connecté peut connaître la team de n'importe qui d'autre.

**Code vulnérable :**
```php
case 'get_user_team': {
    $auth   = require_auth();
    $userId = isset($_GET['userId']) ? (int)$_GET['userId'] : $auth['id'];
    // ← aucune vérification is_admin
```

**Correction proposée :**
```php
case 'get_user_team': {
    $auth   = require_auth();
    $userId = ($auth['is_admin'] && isset($_GET['userId']))
              ? (int)$_GET['userId']
              : $auth['id'];
```

---

### [🟡 MOYENNE] Credential faible — `MYSQL_ROOT_PASSWORD=root` + fallback en dur

**Fichier :** `.env` + `api.php` lignes 17–18 + `docker-compose.yml`  
**Description :** Le mot de passe MySQL root est `root` dans `.env`. L'API PHP a un fallback `?: 'root'` si la variable d'env n'est pas chargée. En cas d'oubli du `.env`, la base est accessible avec le mot de passe `root`.

**Code vulnérable :**
```php
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'root');
```
```env
MYSQL_ROOT_PASSWORD=root
```

**Correction proposée :**  
1. Changer `MYSQL_ROOT_PASSWORD` dans `.env` pour une valeur forte (ex: `openssl rand -hex 24`)  
2. Supprimer le fallback `root` dans api.php :
```php
define('DB_PASSWORD', require_env('DB_PASSWORD'));
```

---

### [🔵 FAIBLE] HSTS absent sur le déploiement ngrok (HTTPS)

**Fichier :** `nginx.conf`  
**Description :** `Strict-Transport-Security` n'est pas envoyé. En production via ngrok (HTTPS), ce header garantit que le navigateur ne retombe jamais sur HTTP.

**Correction proposée :**
```nginx
# Dans le bloc server{}, conditionner à HTTPS si besoin :
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

### [🔵 FAIBLE] `chmod 777` sur le dossier uploads

**Fichier :** `Dockerfile.backend` ligne ~20  
**Description :** Le dossier `/var/www/html/uploads` est world-writable. Si un process compromis s'exécute dans le conteneur, il peut y écrire librement.

**Code vulnérable :**
```dockerfile
RUN mkdir -p /var/www/html/uploads && chmod 777 /var/www/html/uploads
```

**Correction proposée :**
```dockerfile
RUN mkdir -p /var/www/html/uploads \
    && chown www-data:www-data /var/www/html/uploads \
    && chmod 755 /var/www/html/uploads
```

---

### [🔵 FAIBLE] `Options Indexes` activé dans Apache

**Fichier :** `Dockerfile.backend`  
**Description :** La directive `Options Indexes FollowSymLinks` active le listing de répertoire dans Apache. Si `.htaccess` est absent ou mal configuré, les noms de fichiers uploadés sont exposés.

**Correction proposée :**
```dockerfile
RUN echo '<Directory /var/www/html>\n\
    Options -Indexes +FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/ctf.conf
```

---

### [🔵 FAIBLE] Token de reset de mot de passe dans l'URL (GET)

**Fichier :** `api.php` ligne 582  
**Description :** `validate_reset_token` lit `$_GET['token']`. Le token passe dans l'URL → logs serveur, historique navigateur, header `Referer` si la page charge des ressources externes.

**Code vulnérable :**
```php
$token = $_GET['token'] ?? '';
```

**Correction proposée :** Envoyer le token en POST via un formulaire, ou le lire depuis le corps de la requête :
```php
$body  = get_body();
$token = $body['token'] ?? $_GET['token'] ?? '';
// Et faire appeler la validation en POST depuis le frontend
```

---

### [🔵 FAIBLE] `solveTimeMs` non borné

**Fichier :** `api.php` ligne 869  
**Description :** La valeur est castée `(int)` sans validation de borne. Un utilisateur peut envoyer des valeurs négatives ou absurdement grandes, corrompant les stats de temps de résolution.

**Correction proposée :**
```php
$solveTimeMs = isset($body['solveTimeMs'])
    ? max(0, min((int)$body['solveTimeMs'], 86_400_000)) // 0ms à 24h max
    : null;
```

---

## Ce qui est sain ✅

- **Injections SQL** : 100% requêtes préparées, aucune concaténation de chaîne non sanitisée dans les requêtes.
- **Authentification** : session régénérée au login, CSRF token HMAC, bcrypt cost 12, `password_needs_rehash`.
- **Secrets** : `FLAG_ENCRYPT_KEY` et `RESET_SECRET` obligatoirement depuis l'env, aucun fallback.
- **Chiffrement** : AES-256-GCM avec nonce aléatoire pour les flags.
- **CORS** : liste blanche d'origines, pas de wildcard.
- **Rate limiting** : login + register limités à 5 tentatives / 10 min par IP.
- **En-têtes de sécurité** : CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy présents.
- **Uploads** : liste blanche d'extensions, taille limitée à 10 Mo, nom de fichier randomisé, PHP bloqué dans /uploads.
- **IDOR achievements** : corrigé (passe #4) — non-admins limités à leur propre userId.
- **DoS fichiers** : corrigé — `get_challenges` ne lit plus le contenu en mémoire.
- **session.cookie_secure** : conditionnel selon HTTPS/HTTP.

---

## Recommandations générales

1. Créer un utilisateur MySQL dédié avec `GRANT SELECT, INSERT, UPDATE, DELETE ON ctf_arena.*` — ne pas utiliser root pour l'application.
2. Ajouter un `.dockerignore` pour exclure `.env`, `node_modules`, `dist/` des contextes de build.
3. Ajouter `Content-Security-Policy` sur Apache (backend) en plus de nginx — actuellement absent côté PHP.
4. Remplacer les IDs de catégories hardcodés dans `evaluate_achievements_for_user` (`'OSINT','Stéganographie'`…) par une requête dynamique pour que le badge `all_categories` fonctionne si les catégories changent.
