
# 🏴 CTF Arena

> **Plateforme Capture The Flag complète et moderne**
> React 19 · TypeScript · Tailwind CSS 4 · PHP 8.2 · MySQL 8 · Docker

<div align="center">

![Version](https://img.shields.io/badge/version-4.2.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC.svg?logo=tailwind-css)
![PHP](https://img.shields.io/badge/PHP-8.2-777BB4.svg?logo=php)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?logo=mysql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker)
![License](https://img.shields.io/badge/license-MIT-green.svg)

[🚀 Démarrage rapide](#-démarrage-rapide) · [⚙️ Configuration](#️-configuration) · [🏗️ Architecture](#️-architecture) · [📡 API](#-api) · [🎖️ Fonctionnalités](#️-fonctionnalités)

</div>

---

## Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Démarrage rapide](#-démarrage-rapide)
- [Configuration](#️-configuration)
- [Architecture](#️-architecture)
- [Structure du projet](#-structure-du-projet)
- [Base de données](#️-base-de-données)
- [API](#-api)
- [Fonctionnalités](#️-fonctionnalités)
- [Sécurité](#-sécurité)
- [Déploiement production](#-déploiement-production)
- [Roadmap](#-roadmap)

---

## 🎯 Vue d'ensemble

**CTF Arena** est une plateforme web full-stack de type *Capture The Flag* permettant aux joueurs de résoudre des énigmes en 6 catégories, d'accumuler des points, de progresser dans un système de rangs, de se chronométrer et de débloquer des achievements. Les données sont persistées côté serveur dans MySQL via une API PHP sécurisée.

### Points forts

- **Stack moderne** — React 19 + TypeScript strict + Tailwind CSS 4 + Vite 7 + Zod 4
- **Backend sécurisé** — PHP 8.2, sessions HTTP-only, CSRF, rate limiting, CORS whitelist
- **Flags chiffrés** — AES-256-GCM côté serveur, le flag en clair n'est jamais exposé
- **Déploiement one-command** — `docker compose up -d` lance les 3 services (DB, backend, frontend)
- **Catégories dynamiques** — CRUD complet depuis l'admin, tri personnalisé, descriptions Markdown
- **Gestion des équipes** — création, invitation, rôles (owner / admin / member), bannissement
- **Achievements automatiques** — 11 conditions évaluées à chaque validation de flag
- **2 thèmes** — Violet (sombre) et Clair, persistés en `localStorage`, sans rechargement

---

## 🚀 Démarrage rapide

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Docker + Docker Compose | 24+ |
| Node.js (dev seulement) | 20+ |
| npm (dev seulement) | 8+ |

### Production — Docker (recommandé)

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd ctf-arena

# 2. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env : changer les clés et mots de passe (voir section Configuration)

# 3. Lancer les 3 services
docker compose up -d

# 4. Ouvrir l'application
open http://localhost:3000
```

### Développement — Vite + API locale

```bash
# Dépendances frontend
npm install

# Lancer le backend Docker seul (DB + PHP)
docker compose up -d db backend

# Lancer Vite en mode dev
npm run dev
# → http://localhost:5173
```

### Build frontend standalone

```bash
npm run build
# Produit dist/ — bundles JS statiques + index.html (compatible CSP strict)
```

### Compte administrateur par défaut

| Champ | Valeur |
|-------|--------|
| Identifiant | `ALPHATEN` |
| Mot de passe | Défini dans `ADMIN_PASSWORD` (`.env`) |

> ⚠️ **Changez absolument `ADMIN_PASSWORD` avant toute mise en production.**

---

## ⚙️ Configuration

Toute la configuration passe par le fichier `.env` à la racine. Ne jamais commiter ce fichier (il est dans `.gitignore`).

```dotenv
# ─── Base de données ───────────────────────────────────────────
MYSQL_ROOT_PASSWORD=changeme_strong_password

# ─── Chiffrement des flags (AES-256-GCM) ──────────────────────
# Générer : openssl rand -hex 32
# ⚠️ Ne JAMAIS changer après le premier lancement (les flags en BDD
#    ne pourraient plus être déchiffrés)
FLAG_ENCRYPT_KEY=<64 caractères hexadécimaux>

# ─── Tokens de reset de mot de passe (HMAC-SHA256) ────────────
# Générer : openssl rand -hex 32
RESET_SECRET=<64 caractères hexadécimaux>

# ─── Mot de passe administrateur ──────────────────────────────
# Générer : openssl rand -base64 24
ADMIN_PASSWORD=<mot de passe fort>

# ─── URLs et CORS ─────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
PORT=3000

# ─── Build Vite ───────────────────────────────────────────────
VITE_API_URL=/api.php

# ─── SMTP (optionnel — reset de mot de passe par email) ───────
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=votre@email.com
# SMTP_PASSWORD=mot_de_passe_app
# SMTP_FROM=noreply@ctf-arena.local
```

### Générer des clés sécurisées

```bash
# Clé FLAG_ENCRYPT_KEY ou RESET_SECRET
openssl rand -hex 32

# Mot de passe admin
openssl rand -base64 24
```

---

## 🏗️ Architecture

### Vue d'ensemble des services Docker

```
┌──────────────────────────────────────────────────────────┐
│  Navigateur  :3000                                       │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTP
┌────────────────────▼─────────────────────────────────────┐
│  frontend  (nginx:alpine)                                │
│  Sert dist/ (SPA React)                                  │
│  Proxy /api.php  ──────────────────────────────────┐     │
│  Proxy /uploads  ──────────────────────────────┐   │     │
└────────────────────────────────────────────────┼───┘     │
                                                 │         │
┌────────────────────────────────────────────────▼───────┐ │
│  backend  (php:8.2-apache)                             │ │
│  api.php  — API REST complète                          │ │
│  init.php — Initialisation BDD au démarrage            │ │
│  uploads/ — Fichiers challenges (volume Docker)        │ │
└────────────────────────┬───────────────────────────────┘ │
                         │ PDO MySQL                       │
┌────────────────────────▼───────────────────────────────┐ │
│  db  (mysql:8)                                         │ │
│  Base : ctf_arena                                      │ │
│  Volume persistant : db_data                           │ │
└────────────────────────────────────────────────────────┘ │
                                                           │
                          uploads_data (volume Docker) ────┘
```

### Communication interne

| Source | Destination | Protocole |
|--------|-------------|-----------|
| Navigateur | `frontend:80` | HTTP(S) |
| Nginx (frontend) | `backend:80/api.php` | HTTP interne |
| Nginx (frontend) | `backend:80/uploads` | HTTP interne |
| PHP (backend) | `db:3306` | PDO MySQL |

### Flux d'une soumission de flag

```
Joueur → POST /api.php?action=submit_flag
  → session PHP vérifiée
  → rate limit vérifié
  → flag soumis comparé au flag déchiffré (AES-256-GCM)
  → soumission INSERT + achievements évalués
  → réponse JSON {ok, points}
```

---

## 📁 Structure du projet

```
ctf-arena/
│
├── 📂 src/                          # Frontend React/TypeScript
│   ├── 📂 api/
│   │   ├── client.ts                # apiFetch — client HTTP centralisé
│   │   ├── schemas.ts               # Schémas Zod + validate()
│   │   ├── challenges.ts            # CRUD challenges
│   │   ├── ranking.ts               # Classements
│   │   └── ...                      # Autres modules API
│   │
│   ├── 📂 components/
│   │   ├── Layout.tsx               # Navigation, thème, rang
│   │   ├── ErrorBoundary.tsx        # Error boundary par route
│   │   ├── CategoriesSection.tsx    # Section catégories dépliables
│   │   └── TeamSelector.tsx         # Sélecteur d'équipe
│   │
│   ├── 📂 context/
│   │   ├── AuthContext.tsx          # Auth (session API, zéro localStorage)
│   │   ├── ChronoContext.tsx        # Chronomètre global
│   │   └── ThemeContext.tsx         # Thèmes violet / clair
│   │
│   ├── 📂 hooks/                    # Hooks custom (useFetch, useRanking…)
│   ├── 📂 pages/
│   │   ├── HomePage.tsx             # Challenges par catégorie + admin
│   │   ├── LoginPage.tsx            # Connexion / Inscription
│   │   ├── RankingPage.tsx          # Classement joueurs + équipes (aria-live)
│   │   ├── ProfilePage.tsx          # Profil : flags, stats, amis, team
│   │   ├── AchievementsPage.tsx     # Achievements + gestion admin
│   │   ├── GuidePage.tsx            # Guide des catégories
│   │   ├── NotificationsPage.tsx    # Notifications
│   │   └── SettingsPage.tsx         # Paramètres admin
│   │
│   ├── App.tsx                      # Routeur + Providers + ErrorBoundary par route
│   ├── NotificationSystem.tsx       # Toasts et notifications
│   ├── db.ts                        # Client API (fetch vers api.php)
│   ├── categories.ts                # Store catégories (mémoire + API)
│   ├── ranks.ts                     # Définition des 7 rangs
│   ├── types.ts                     # Types TypeScript (sans champs sensibles)
│   └── index.css                    # Variables CSS thèmes
│
├── 📂 sql/
│   ├── 📂 init/
│   │   ├── 01_tables.sql            # CREATE TABLE (v4.1 — CHECK, FK nommées, COMMENT)
│   │   ├── 02_seeds.sql             # INSERT catégories par défaut
│   │   └── 03_views.sql             # CREATE VIEW v_ranking
│   └── .htaccess                    # Bloque tout accès HTTP direct au dossier
│
├── 📂 uploads/                      # Placeholder (volume Docker en prod)
│
├── api.php                          # API REST PHP 8.2 complète (v3.1)
├── init.php                         # Bootstrap BDD + compte admin au démarrage
├── nginx.conf                       # Config Nginx (proxy API + SPA fallback)
├── php.ini                          # Config PHP custom
├── Dockerfile                       # Build frontend (node → nginx)
├── Dockerfile.backend               # Build backend (php:8.2-apache)
├── docker-compose.yml               # Orchestration 3 services
├── vite.config.ts                   # Config Vite (singlefile build)
├── tsconfig.json
└── package.json
```

---

## 🗄️ Base de données

### Schéma v4.1 — fichiers d'init

Le schéma est découpé en 3 fichiers dans `sql/init/`, exécutés dans l'ordre alphabétique par Docker au premier démarrage :

| Fichier | Rôle |
|---------|------|
| `sql/init/01_tables.sql` | `CREATE TABLE` uniquement |
| `sql/init/02_seeds.sql` | `INSERT` des 6 catégories par défaut |
| `sql/init/03_views.sql` | `CREATE VIEW v_ranking` |

Pour repartir d'une base propre : `docker compose down -v && docker compose up`

### Tables principales

| Table | Rôle |
|-------|------|
| `users` | Comptes joueurs (bcrypt cost 12, email, genre, âge) |
| `categories` | Catégories dynamiques avec tri et descriptions Markdown |
| `challenges` | Énigmes (flag chiffré AES-256-GCM, difficulté auto/manuelle) |
| `challenge_files` | Fichiers attachés aux challenges |
| `submissions` | Soumissions réussies — pas de dénormalisation, JOIN challenges pour les points |
| `bonus_malus` | Points bonus/malus attribués par l'admin |
| `achievements` | Définitions des succès (11 types de conditions) |
| `user_achievements` | Succès débloqués par joueur |
| `friend_requests` | Demandes d'amis (pending / accepted / rejected) |
| `teams` | Équipes (owner, visibilité, emoji) |
| `team_members` | Membres avec rôle (owner / admin / member) |
| `team_bans` | Bannissements d'équipe |
| `password_resets` | Tokens de reset (HMAC-SHA256, TTL 1h) |
| `rate_limits` | Anti-brute-force par IP (window_start DATETIME) |

### Vue `v_ranking`

Classement calculé automatiquement : `total_points = SUM(c.points via JOIN challenges) + SUM(bonus_malus.points)`, trié par points puis par nombre de flags.

### Difficulté des challenges

| Niveau | Badge | Règle auto |
|--------|-------|-----------|
| Facile | 🟢 | < 100 pts |
| Moyen | 🟡 | 100 – 199 pts |
| Difficile | 🔴 | ≥ 200 pts |

L'admin peut forcer le niveau manuellement (mode `manual` au lieu de `auto`).

---

## 📡 API

Toutes les requêtes passent par `POST /api.php` (ou `GET` pour les lectures) avec un paramètre `action`.

### Authentification et session

| Action | Méthode | Description |
|--------|---------|-------------|
| `register` | POST | Inscription (username, password) |
| `login` | POST | Connexion → session PHP |
| `logout` | POST | Destruction de session |
| `me` | GET | Utilisateur courant |
| `request_password_reset` | POST | Envoi email reset (SMTP) |
| `reset_password` | POST | Validation token + nouveau mot de passe |

### Challenges

| Action | Rôle requis | Description |
|--------|-------------|-------------|
| `get_challenges` | Joueur | Liste tous les challenges |
| `add_challenge` | Admin | Créer un challenge (+ upload fichiers) |
| `update_challenge` | Admin | Modifier un challenge |
| `delete_challenge` | Admin | Supprimer un challenge |
| `submit_flag` | Joueur | Soumettre un flag |
| `upload_challenge_file` | Admin | Attacher un fichier |
| `delete_challenge_file` | Admin | Supprimer un fichier |

### Catégories (nouveauté v3.1)

| Action | Rôle requis | Description |
|--------|-------------|-------------|
| `get_categories` | Public | Liste avec tri personnalisé |
| `add_category` | Admin | Créer une catégorie |
| `update_category` | Admin | Modifier (nom, icône, couleur, description_md) |
| `delete_category` | Admin | Supprimer (cascade challenges) |
| `reorder_categories` | Admin | Réordonner (drag & drop) |

### Classement et stats

| Action | Description |
|--------|-------------|
| `get_ranking` | Classement individuel (vue `v_ranking`) |
| `get_team_ranking` | Classement des équipes |
| `get_user_stats` | Stats détaillées d'un joueur |

### Achievements

| Action | Rôle requis | Description |
|--------|-------------|-------------|
| `get_achievements` | Joueur | Liste + état débloqué |
| `add_achievement` | Admin | Créer un achievement |
| `update_achievement` | Admin | Modifier |
| `delete_achievement` | Admin | Supprimer |
| `set_achievement` | Admin | Attribution/révocation manuelle |
| `reevaluate_achievements` | Admin | Réévaluation globale |

### Social (amis, équipes)

| Action | Description |
|--------|-------------|
| `send_friend_request` | Envoyer une demande d'ami |
| `respond_friend_request` | Accepter / Refuser |
| `remove_friend` | Retirer un ami |
| `get_friends` | Liste des amis |
| `create_team` | Créer une équipe |
| `join_team` | Rejoindre une équipe |
| `leave_team` | Quitter une équipe |
| `kick_member` / `ban_member` | Gérer les membres (owner/admin) |
| `promote_member` / `demote_member` | Changer le rôle |
| `update_team` / `delete_team` | Gérer l'équipe |

### Admin — gestion joueurs

| Action | Description |
|--------|-------------|
| `get_players` | Liste de tous les joueurs |
| `add_bonus` / `add_malus` | ±25 pts |
| `reset_user` | Effacer flags + bonus/malus |
| `delete_user` | Supprimer le compte |
| `set_challenge_solved` | Cocher/décocher manuellement |

### Format des réponses

```json
// Succès
{ "ok": true, "data": { ... } }

// Erreur
{ "ok": false, "error": "Message d'erreur" }
```

---

## 🎖️ Fonctionnalités

### 7 rangs progressifs

| Rang | Icône | Flags requis |
|------|-------|-------------|
| Starter | 🔰 | 0 – 2 |
| Beginner | 🥉 | 3 – 5 |
| Intermediate | 🥈 | 6 – 10 |
| Advanced | 🥇 | 11 – 20 |
| Expert | 💎 | 21 – 30 |
| Master | 👑 | 31 – 50 |
| Terminator | 💀 | 51+ |

Barre de progression entre le rang actuel et le suivant, affichée sur la page d'accueil et dans la navigation.

### 11 types de conditions d'achievement

| Type | Description |
|------|-------------|
| `flags_count` | N flags validés au total |
| `points_total` | Score total atteint |
| `category_flags` | N flags dans une catégorie spécifique |
| `first_blood` | Premier flag soumis sur la plateforme |
| `speed_runner` | N flags en moins de 30 minutes |
| `category_perfect` | Tous les flags d'une catégorie (min. 2 challenges) |
| `night_owl` | Flag soumis entre 00h00 et 05h00 |
| `all_categories` | Au moins 1 flag dans chaque catégorie |
| `top3` | Être dans le top 3 du classement |
| `all_challenges` | Tous les challenges résolus (min. 3) |
| `manual` | Attribution manuelle par l'admin |

Les achievements sont évalués automatiquement après chaque soumission réussie.

### 6 catégories d'énigmes (par défaut)

| Catégorie | Icône | Couleur |
|-----------|-------|---------|
| OSINT | 🔍 | `#3B82F6` |
| Stéganographie | 🕵️ | `#8B5CF6` |
| Cryptographie | 🔐 | `#EF4444` |
| Web | 🌐 | `#10B981` |
| Forensic | 🔬 | `#14B8A6` |
| Misc | 🎲 | `#6B7280` |

Les catégories sont entièrement gérables depuis l'interface admin (ajout, modification, suppression, réordonnancement, descriptions Markdown).

### Chronomètre par challenge

Chaque challenge dispose d'un chrono indépendant : **▶ Start / ⏸ Pause / Reprendre**. À la validation du flag, le temps final est sauvegardé en base et affiché sur la carte.

### Page profil — 4 onglets

- **Mes Flags** — historique avec temps, points, catégorie
- **Mes Stats** — graphiques SVG (barres, radar, scatter, comparaison)
- **Amis** — liste, recherche, demandes, modale profil ami complète
- **Ma Team** — gestion de l'équipe, classement interne

### Modale profil ami — 4 onglets

- **Comparaison** — face-à-face : points, flags, catégories, rang
- **Stats** — tous les graphiques de l'ami
- **Amis** — liste des amis de l'ami
- **Team** — équipe de l'ami avec classement interne

### 2 thèmes

| Thème | Fond | Accent |
|-------|------|--------|
| Violet | `#0a0a1a` (sombre) | `#8b5cf6` |
| Clair | `#ffffff` | `#8b5cf6` |

Persistés dans `localStorage` (`ctf_arena_theme`), appliqués via l'attribut `data-theme` sur `<html>`.

---

## 🔒 Sécurité

### Chiffrement des flags

Les flags sont stockés chiffrés en AES-256-GCM dans la colonne `flag_encrypted`. La clé est fournie uniquement via variable d'environnement (`FLAG_ENCRYPT_KEY`) et n'est jamais exposée au client. Le flag en clair n'apparaît dans aucune réponse API.

```bash
# Générer une clé sécurisée
openssl rand -hex 32
```

> ⚠️ Ne pas changer `FLAG_ENCRYPT_KEY` après le premier lancement : les flags déjà en base ne pourraient plus être déchiffrés.

### Sessions et cookies

```
session.cookie_httponly = 1    # Inaccessible au JavaScript
session.cookie_samesite = Strict
session.use_strict_mode  = 1
session.gc_maxlifetime   = 86400
```

### Protection CSRF

Chaque requête mutante vérifie le header `X-CSRF-Token`.

### Rate limiting

Deux compteurs distincts, stockés dans la table `rate_limits` (horodatage en `DATETIME`, cohérent avec le reste du schéma) :

| Compteur | Clé | Défaut | Variables |
|----------|-----|--------|-----------|
| Tentatives de connexion | par IP | 5 par 5 min | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` |
| Soumissions de flag erronées | `flag:{userId}` | 5 par 1 min | `FLAG_ATTEMPT_MAX`, `FLAG_ATTEMPT_WINDOW` |

Les quatre valeurs se règlent par variable d'environnement, sans rebuild. Pendant un événement, 5 flags par minute est vite atteint par un joueur qui se trompe de format : `FLAG_ATTEMPT_MAX=10` est un réglage plus confortable.

### CORS

Seules les origines listées dans `ALLOWED_ORIGINS` reçoivent le header `Access-Control-Allow-Origin`. En dehors de cette liste, la réponse ne contient pas d'en-tête CORS.

### En-têtes HTTP de sécurité (nginx)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

`script-src 'unsafe-inline'` a été retiré — le build Vite (prod) génère des bundles statiques sans scripts inline.

### Confinement des fichiers uploadés

`download_file` vérifie via `realpath()` que le chemin résolu reste strictement dans `/var/www/html/uploads/challenges/`, même si la base de données était altérée (défense en profondeur contre la traversée de chemin). Le type MIME réel du contenu est également vérifié côté upload (`finfo`) pour bloquer les fichiers PHP déguisés.

### Protection du dossier `sql/`

Doublement protégé : `.htaccess` côté Apache et règle Nginx (`deny all; return 403`). Les fichiers SQL ne sont jamais accessibles via HTTP.

### Reset de mot de passe

Tokens HMAC-SHA256 générés via `RESET_SECRET`, TTL 1 heure, à usage unique (colonne `used`).

### Types côté client

Les interfaces TypeScript `AuthUser` et `Challenge` n'exposent pas de champs sensibles (`password`, `flag`) — ces champs ne sont ni présents dans les réponses API ni définis dans les types frontend.

---

## 🚢 Déploiement production

### Docker Compose

```bash
# Construire et lancer
docker compose up -d --build

# Voir les logs
docker compose logs -f

# Arrêter
docker compose down

# Arrêter et supprimer les volumes (⚠️ efface la BDD)
docker compose down -v
```

### Variables à changer obligatoirement en production

```dotenv
MYSQL_ROOT_PASSWORD=<mot de passe fort>
FLAG_ENCRYPT_KEY=<openssl rand -hex 32>
RESET_SECRET=<openssl rand -hex 32>
ADMIN_PASSWORD=<openssl rand -base64 24>
FRONTEND_URL=https://votre-domaine.com
ALLOWED_ORIGINS=https://votre-domaine.com
```

### HTTPS (obligatoire hors réseau local de confiance)

Sans TLS, le cookie de session circule en clair : quiconque écoute le réseau de l'événement peut récupérer une session. PHP ne pose l'attribut `Secure` que lorsqu'il voit `X-Forwarded-Proto: https`.

Une surcouche Compose prête à l'emploi ajoute Caddy devant le frontend et obtient un certificat Let's Encrypt automatiquement.

```bash
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
```

Prérequis, dans `.env` :

```dotenv
DOMAIN=ctf.mon-domaine.fr
ACME_EMAIL=moi@mon-domaine.fr
FRONTEND_URL=https://ctf.mon-domaine.fr
ALLOWED_ORIGINS=https://ctf.mon-domaine.fr
PORT=127.0.0.1:3000
```

`PORT=127.0.0.1:3000` restreint le frontend à la boucle locale : seul Caddy est joignable de l'extérieur. Le domaine doit pointer sur la machine et les ports 80 et 443 doivent être libres.

Pour un autre terminateur TLS (Traefik, Cloudflare Tunnel, ngrok), la seule exigence est de transmettre `X-Forwarded-Proto: https` : nginx le relaie déjà au backend.

### Sauvegarde et restauration

Le volume `db_data` survit aux redémarrages mais pas à une suppression de volume ni à une corruption. Pendant un événement, une perte de base signifie une perte des scores.

```bash
# Sauvegarde ponctuelle (dump gzippé dans ./backups, 48 archives conservées)
./scripts/backup-db.sh

# Restauration — demande confirmation et sauvegarde l'état courant avant d'écraser
./scripts/restore-db.sh backups/ctf_arena_20260825-143000.sql.gz
```

Sur un hôte Windows sans Git Bash : `scripts\backup-db.ps1`.

Pendant l'épreuve, planifier une sauvegarde toutes les 15 minutes :

```bash
*/15 * * * * cd /chemin/vers/le/projet && ./scripts/backup-db.sh
```

Le dossier `backups/` est ignoré par git : le stocker ailleurs que sur la machine qui héberge la base.

### Volumes persistants

| Volume | Contenu |
|--------|---------|
| `db_data` | Données MySQL (challenges, joueurs, flags…) |
| `uploads_data` | Fichiers attachés aux challenges |
| `logs_data` | Journaux d'activité (`/var/log/ctf_arena`) |

Ces volumes survivent aux redémarrages et aux `docker compose down` (sans `-v`).

---

## 🛠️ Technologies

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 19.2 | Framework UI |
| TypeScript | 5.9 | Typage statique strict |
| Vite | 7.2 | Build tool + dev server |
| Tailwind CSS | 4.1 | Framework CSS (variables CSS) |
| React Router | 7.14 | Routage SPA |
| PHP | 8.2 | API REST backend |
| MySQL | 8.0 | Base de données relationnelle |
| Apache | 2.4 | Serveur PHP (mod_rewrite) |
| Nginx | alpine | Reverse proxy + SPA |
| Docker Compose | 24+ | Orchestration des services |

---

## 🐛 Résolution de problèmes

### `docker compose up` échoue sur le healthcheck MySQL

```bash
# Attendre que MySQL soit prêt (peut prendre 30–60s au premier démarrage)
docker compose logs db
# Retry automatique configuré : interval=10s, retries=10
```

### Le backend ne démarre pas

```bash
docker compose logs backend
# Vérifier que init.php n'a pas renvoyé d'erreur de connexion BDD
# Vérifier que MYSQL_ROOT_PASSWORD correspond dans .env
```

### Flags impossible à valider après changement de `FLAG_ENCRYPT_KEY`

La clé AES-256-GCM doit rester constante. Si vous devez la changer, il faut re-chiffrer tous les flags en base avant de relancer.

### Build Vite échoue

```bash
rm -rf node_modules dist
npm install
npm run build
```

---

## 📈 Roadmap

### ✅ v4.2 (actuel)

**Accessibilité & qualité**
- ESLint 9 (flat config) + jsx-a11y installé — lint + typecheck en CI
- `aria-label` ajouté sur tous les boutons icon-only
- `aria-live` sur le tableau de classement (WCAG 2.1 AA)
- Validation Zod 4 sur toutes les réponses API (12 schémas, safeParse non-cassant)
- React.lazy + Suspense — code splitting sur les 8 routes
- Error boundaries par route (isolation des crashs)
- Hooks custom avec état `error` + composant `ErrorMessage` partagé
- Types partagés centralisés dans `types.ts` (PlayerWithPoints, TeamMemberWithStats…)
- `SettingsPage.tsx` splittée en 4 composants (de 747 → 64 lignes)
- Build Vite standard (chunks séparés) — compatible `script-src 'self'` CSP sans `unsafe-inline`

**SQL — bonnes pratiques**
- `CHECK` constraints sur les invariants métier (`points > 0`, `solve_time_ms >= 0`, `bonus_malus.points != 0`, `age BETWEEN 13 AND 120`)
- FK nommées (`CONSTRAINT fk_<table>_<ref>`) et UNIQUE nommées (`CONSTRAINT uq_<table>_<col>`) sur toutes les tables
- Index composite `submissions(user_id, submitted_at DESC)` pour les classements
- `COMMENT` sur chaque table pour la lisibilité du schéma
- `rate_limits.window_start` en `DATETIME` (cohérence avec le reste du schéma)
- N+1 éliminé dans `category_perfect` et `get_team_ranking` (3 requêtes agrégées)
- Transaction autour du delete + renumérotation dans `delete_category`
- `LIMIT` sur tous les endpoints de listing (`get_all_flags`, etc.)

**React — bonnes pratiques**
- `validate()` retourne `result.data` (coercions Zod appliquées)
- `password` retiré de `AuthUser` et `User` (jamais renvoyé par l'API)
- `flag` retiré de `Challenge` (jamais renvoyé par l'API)
- `ErrorBoundary` par route (isolation des crashs)
- `aria-live` sur le tableau de classement (accessibilité WCAG 2.1 AA)

**Sécurité**
- `download_file` : vérification `realpath()` pour confiner les téléchargements au dossier uploads
- Upload : validation MIME réelle via `finfo` (bloque les PHP déguisés)
- CSP nginx : `script-src 'unsafe-inline'` supprimé
- Headers : ajout `Permissions-Policy`

### ✅ v3.1

- Gestion des catégories depuis l'admin (CRUD + réordonnancement)
- `categories.sort_order` et `categories.description_md` (Markdown)
- Sous-sections amis et team dans la modale profil ami
- Optimisations `useMemo` sur `ProfilePage`

### ✅ v3.0

- Migration full-stack : API PHP + MySQL (remplacement localStorage)
- Chiffrement AES-256-GCM des flags
- Sessions sécurisées HTTP-only + CSRF
- Rate limiting, CORS, en-têtes de sécurité
- Système d'équipes complet (création, rôles, bannissement)
- Reset de mot de passe par email (SMTP)

### ✅ v1.4 — v2.x

- Système de rangs progressif (7 niveaux)
- Système d'achievements (11 conditions, évaluation automatique)
- Chronomètre par challenge
- Page Profil avec graphiques SVG
- Hashage SHA-256 des mots de passe (Web Crypto API)

### 🔄 Prochaine version

- [ ] Hints (indices payants en points, max 3 par challenge)
- [ ] Mode compétition avec timer global et freeze du classement
- [ ] Writeups (après résolution, support Markdown, votes)
- [ ] Notifications en temps réel (WebSocket ou polling)
- [ ] Export CSV du classement

### 🚀 Long terme

- [ ] API REST publique + documentation Swagger
- [ ] Webhooks Discord/Slack (first blood, nouveau challenge)
- [ ] Progressive Web App (PWA)
- [ ] 2FA (TOTP) pour les admins
- [ ] Learning paths par catégorie

---

## 🤝 Contribution

```bash
# Créer une branche
git checkout -b feature/ma-feature

# Commiter
git commit -m 'feat: description courte'

# Pousser et ouvrir une Pull Request
git push origin feature/ma-feature
```

**Guidelines** : TypeScript strict, classes CSS adaptatives (thèmes), tester sur les 2 thèmes, vérifier les logs Docker avant de soumettre.

---

## 📜 Licence

Ce projet est distribué sous licence **MIT**.

---

<div align="center">

**🏴 CTF Arena — Fait pour la communauté CTF**

```bash
git clone <url> && cd ctf-arena && cp .env.example .env && docker compose up -d
```

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php)](https://php.net)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)

</div>

