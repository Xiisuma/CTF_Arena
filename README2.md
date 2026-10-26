<div align="center">

# 🏴 CTF Arena

**Plateforme de Capture The Flag prête pour un événement, à monter en une commande.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Version](https://img.shields.io/badge/version-1.5.4-8b5cf6)](#)

</div>

---

## Ce que c'est

Une plateforme de CTF autonome : les joueurs s'inscrivent, découvrent les challenges au lancement de la partie, soumettent des flags, montent au classement et débloquent des succès. L'organisateur crée les catégories et les challenges, pilote le déroulement et révèle le podium à la fin.

Tout tourne en local derrière Docker. Rien n'est hébergé ailleurs, à une exception près : l'envoi de courriel, qui passe par un fournisseur SMTP.

**Conçu pour un événement sur site** : une cinquantaine de joueurs derrière une seule adresse IP publique, deux heures de jeu, pas de temps pour déboguer le jour J.

---

## Table des matières

1. [Démarrage](#démarrage)
2. [Configuration](#configuration)
3. [Courriel](#courriel)
4. [Déroulement d'une partie](#déroulement-dune-partie)
5. [Score et progression](#score-et-progression)
6. [Rôles](#rôles)
7. [Les pages](#les-pages)
8. [Architecture](#architecture)
9. [Base de données](#base-de-données)
10. [API](#api)
11. [Sécurité](#sécurité)
12. [Développement](#développement)
13. [Exploitation](#exploitation)
14. [Avant l'événement](#avant-lévénement)

---

## Démarrage

**Prérequis** : Docker Desktop, et Node 20+ seulement si vous développez.

```bash
git clone https://github.com/Xiisuma/CTF_Arena.git
cd CTF_Arena
cp .env.example .env
```

Renseignez les quatre secrets obligatoires dans `.env` (voir [Configuration](#configuration)), puis :

```bash
docker compose up -d --build
```

L'application répond sur **http://localhost:3000**. Le compte administrateur est **ALPHATEN**, avec le mot de passe défini par `ADMIN_PASSWORD`.

> `--build` n'est pas optionnel après une mise à jour du code : le PHP et le frontend compilé sont copiés dans les images. Un simple `up -d` relancerait les anciennes.

---

## Configuration

Tout passe par `.env`, jamais commité. `.env.example` sert de modèle.

### Obligatoire

| Variable | Rôle | Générer |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | mot de passe MySQL | `openssl rand -base64 24` |
| `FLAG_ENCRYPT_KEY` | chiffrement AES-256-GCM des flags | `openssl rand -hex 32` |
| `RESET_SECRET` | signature HMAC des jetons de réinitialisation | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | mot de passe du compte ALPHATEN | `openssl rand -base64 24` |
| `NOTIFY_SECRET` | secret partagé avec le service WebSocket | `openssl rand -hex 32` |

> **`FLAG_ENCRYPT_KEY` ne se change jamais après le premier lancement.** Les flags déjà en base deviendraient illisibles.

### Réglages courants

| Variable | Défaut | Effet |
|---|---|---|
| `PORT` | `3000` | port d'écoute du frontend |
| `FRONTEND_URL` | `http://localhost:3000` | utilisé dans les liens des courriels |
| `ALLOWED_ORIGINS` | localhost | origines acceptées par l'API |
| `CTF_RESET_STATE` | `auto` | `auto` remet l'état du jeu à zéro quand le conteneur est recréé, le conserve après un simple redémarrage ; `1` force, `0` interdit |
| `EMAIL_VERIFICATION` | `soft` | `off`, `soft` ou `strict` (voir [Courriel](#courriel)) |

### Limites anti-abus

| Variable | Défaut | Ce que ça borne |
|---|---|---|
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | 5 / 300 s | connexions ratées par IP |
| `FLAG_ATTEMPT_MAX` / `FLAG_ATTEMPT_WINDOW` | 5 / 60 s | flags erronés par joueur |
| `REGISTER_MAX` / `REGISTER_WINDOW` | 200 / 3600 s | inscriptions par IP |
| `SCORING_DECAY_SOLVES` | 12 | rang de résolution où le plancher de points est atteint |
| `SCORING_FLOOR_PERCENT` | 25 | plancher, en pourcentage de la valeur de départ |

> `REGISTER_MAX` compte **la salle entière**, pas une personne : sur place, tout le monde sort par la même adresse IP publique. Un plafond trop bas refuse les derniers inscrits.

---

## Courriel

L'image backend n'embarque aucun agent de mail. Les courriels partent par **SMTP authentifié** (`mailer.php`) : sans `SMTP_USER` ni `SMTP_PASSWORD`, rien n'est envoyé — la panne est écrite dans `misc.log` et l'inscription se poursuit normalement.

Un compte gratuit Brevo (≈300 courriels par jour) ou Mailjet suffit largement.

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=tls          # tls (STARTTLS) | ssl (port 465) | none
SMTP_USER=xxxxxx@smtp-brevo.com
SMTP_PASSWORD=votre_cle_smtp
SMTP_FROM=adresse_validee_chez_le_fournisseur
```

Vérification en une commande :

```bash
docker compose exec backend php /usr/local/bin/ctf-test-mail.php vous@exemple.fr
```

Le script emprunte exactement le chemin d'envoi de l'application : si ce message arrive, les codes de confirmation arriveront aussi.

### Confirmation de l'adresse

À l'inscription, un code à six chiffres part vers le joueur. Il est stocké **uniquement sous forme d'empreinte HMAC**, valable 15 minutes, 5 essais, 60 secondes entre deux envois, 5 envois par heure.

| `EMAIL_VERIFICATION` | Effet |
|---|---|
| `off` | aucune vérification |
| `soft` *(défaut)* | code envoyé, compte marqué non confirmé, **rien n'est bloqué** |
| `strict` | pas de soumission de flag tant que l'adresse n'est pas confirmée |

> N'activez `strict` qu'après avoir testé l'envoi **depuis le lieu de l'événement**. Un code qui n'arrive pas bloque un joueur.

---

## Déroulement d'une partie

Tout se pilote depuis **Paramètres → Déroulement**.

| Phase | Ce que voient les joueurs |
|---|---|
| **Avant le lancement** | ni catégories ni challenges — l'API ne les renvoie pas |
| **En jeu** | tout est ouvert, classement en temps réel |
| **Brouillage** (15 min) | les classements sont masqués, le jeu continue |
| **Grâce** (3 min) | dernière ligne droite |
| **Terminé** | soumissions fermées, podium révélé emplacement par emplacement |

Le podium compte **cinq emplacements**, dévoilés de bas en haut : le plus de succès, le plus de flags, 3ᵉ, 2ᵉ, puis le vainqueur.

---

## Score et progression

### Points dégressifs

Un challenge vaut moins cher à mesure qu'il est résolu : lentement au début, de plus en plus vite, jusqu'à un plancher de 25 %.

```
points(n) = P − (P − plancher) × ((n − 1) / D)²
```

`n` est le rang de résolution, `D` vaut `SCORING_DECAY_SOLVES` (12 par défaut). **Les points sont figés au moment de la validation** : personne ne perd ce qu'il a déjà gagné.

### Succès

**19 succès intégrés**, dont 6 cachés qui n'apparaissent qu'une fois débloqués — jusqu'à **750 points** au total. Ils sont attribués automatiquement : First Blood (dégressif à chaque nouveau challenge : 25, 21, 18, 14, 10), Rafale, Éclaireur, Complétiste, Touche-à-tout, Du premier coup, Tête dure, Podium précoce, Remontada…

### Rangs

Sept rangs suivent le nombre de flags trouvés : **Starter, Beginner, Intermediate, Advanced, Expert, Master, Terminator**. Une barre de progression les affiche sur l'accueil et le profil.

---

## Rôles

| Rôle | Peut |
|---|---|
| **Joueur** | jouer, voir son historique d'essais, ses succès, ses amis |
| **Auteur** | créer, modifier et supprimer **ses** challenges. Il valide les siens en dernier : il doit d'abord avoir résolu tous ceux des autres |
| **Administrateur** | tout gérer : catégories, challenges, joueurs, déroulement, succès |

L'administrateur dispose d'un **aperçu de la vue joueur** (bouton 👁️ dans la barre du haut) : l'interface devient celle d'un joueur, succès cachés masqués compris. C'est un affichage seul — aucun droit serveur n'est accordé ni retiré.

---

## Les pages

| Page | Contenu |
|---|---|
| 🏴 **Challenges** | catégories dépliables, cartes de challenges, 1 à 4 par ligne |
| 🏆 **Classement** | solo, temps réel, masqué pendant le brouillage |
| 🎖️ **Succès** | 1 à 3 cartes par ligne, cachés rangés en fin de liste |
| 📜 **Règles** | règles du jeu et présentation des catégories |
| 🧰 **Aide** | CyberChef, Aperi'Solve, CrackStation, dCode — à quoi ils servent et quand y penser |
| 👤 **Profil** | flags, essais, stats, amis, édition |
| ⚙️ **Paramètres** | réservé à l'administrateur |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  frontend — nginx + React 19 (port 3000)                 │
│  sert les bundles, proxifie /api.php et /ws              │
└───────────────┬──────────────────────────┬───────────────┘
                │                          │
┌───────────────▼──────────────┐  ┌────────▼───────────────┐
│  backend — PHP 8.4 + Apache  │  │  ws-server — Node       │
│  api.php, init.php, mailer   │  │  diffusion temps réel   │
└───────────────┬──────────────┘  └────────▲───────────────┘
                │                          │ /notify
┌───────────────▼──────────────┐           │
│  db — MySQL 8                │───────────┘
└──────────────────────────────┘
```

- **init.php** s'exécute à chaque démarrage du conteneur : migrations idempotentes, vues SQL, semis des succès. L'ordre compte — colonnes et tables **avant** les vues qui les lisent.
- **ws-server** ne parle qu'au backend, authentifié par `NOTIFY_SECRET`. Il n'est pas exposé.
- **nginx** pose les en-têtes de sécurité et les règles de cache : `immutable` sur `/assets/`, `no-cache` sur `index.html`.

---

## Base de données

13 tables, 3 vues.

| Table | Contenu |
|---|---|
| `users` | comptes (bcrypt coût 12), rôles, avatar, adresse confirmée |
| `categories` / `challenges` / `challenge_files` | contenu du CTF, flags chiffrés |
| `submissions` | validations, avec les points figés (`points_awarded`) |
| `flag_attempts` | flags erronés, visibles du seul joueur concerné |
| `achievements` / `user_achievements` | catalogue et déblocages |
| `email_verifications` | codes à six chiffres, hachés et expirables |
| `friend_requests` | relations entre joueurs |
| `ctf_state` | état de la partie |
| `rate_limits`, `password_resets` | anti-abus et réinitialisations |

Vues : `v_solo_ranking` (flags + succès), `v_most_flags`, `v_ranking`.

---

## API

Un point d'entrée unique, `api.php`, **62 actions** en `?action=`. Réponses JSON, toujours `{"ok": true, …}` ou `{"ok": false, "error": "…"}`.

Familles : authentification et session · challenges et catégories · soumission de flags · classement et podium · succès · essais de flags · social · administration · état du CTF · confirmation d'adresse.

---

## Sécurité

- **Flags chiffrés** en AES-256-GCM, jamais renvoyés au client ; comparaison par `hash_equals`
- **Sessions PHP** HttpOnly, SameSite, régénérées à la connexion ; aucun jeton en `localStorage`
- **CSRF** sur toutes les mutations, en-tête `X-CSRF-Token`
- **Rate limiting** par usage : connexions, tentatives de flag, inscriptions, envois de code
- **CSP stricte** et en-têtes nginx : `default-src 'self'`, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS
- **Uploads** confinés, extensions filtrées, servis en `Content-Disposition: attachment`
- **Contenu avant lancement** protégé côté API, pas seulement masqué dans l'interface
- **Codes de confirmation** stockés en empreinte HMAC, expirables, essais comptés avant comparaison
- **Derrière un proxy** (ngrok, reverse proxy), `set_real_ip_from` est limité aux plages privées : sans ça, tous les joueurs partagent le même compteur

---

## Développement

```bash
npm install
docker compose up -d db backend ws-server   # backend seul
npm run dev                                  # Vite sur 5173
```

| Commande | Effet |
|---|---|
| `npm run typecheck` | TypeScript strict, zéro `any` implicite |
| `npm run lint` | ESLint, `--max-warnings 0` |
| `npm test` | Vitest + MSW — **124 tests** |
| `npm run build` | bundles de production dans `dist/` |

Le code suit quelques règles de maison : hooks pour l'état serveur (`useChallenges`, `useAchievements`…), schémas Zod sur chaque réponse API, modules par domaine sous `src/features/`.

---

## Exploitation

```bash
docker compose logs -f backend      # journaux
docker compose restart backend      # redémarrage sans perte d'état
docker compose down                 # arrêt
docker compose down -v              # ⚠️ efface la base
```

**Sauvegarde** :

```bash
./scripts/backup-db.sh              # dump gzippé dans ./backups
./scripts/restore-db.sh <archive>   # restauration, avec confirmation
```

**Journaux d'activité** : `/var/log/ctf_arena/` dans le conteneur backend, répartis en `auth`, `gameplay`, `social`, `admin`, `misc` et `all`.

---

## Avant l'événement

Liste à dérouler la veille, pas le matin même.

- [ ] `.env` complet, secrets générés, `FLAG_ENCRYPT_KEY` définitive
- [ ] `docker compose up -d --build`, puis « Initialisation terminée » dans les journaux
- [ ] SMTP testé **depuis le lieu**, avec `ctf-test-mail.php`
- [ ] `EMAIL_VERIFICATION` choisi en connaissance de cause (`soft` par défaut)
- [ ] `REGISTER_MAX` dimensionné sur le nombre de joueurs attendus
- [ ] catégories créées, challenges créés, flags vérifiés un par un
- [ ] parcours complet rejoué sur une pile neuve : inscription, flag faux, flag bon, classement, succès
- [ ] partie **non démarrée** au moment où les joueurs arrivent
- [ ] sauvegarde de la base juste avant le lancement

---

<div align="center">

**CTF Arena** — version 1.5.4

</div>
