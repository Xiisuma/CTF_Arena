#!/usr/bin/env bash
#
# Restaure la base ctf_arena depuis une sauvegarde produite par backup-db.sh.
#
# Usage :
#   ./scripts/restore-db.sh backups/ctf_arena_20260825-143000.sql.gz
#
# ATTENTION : le contenu actuel de la base est écrasé. Scores, comptes et
# soumissions postérieurs à la sauvegarde sont perdus. Une sauvegarde de
# sécurité de l'état courant est prise automatiquement avant l'écrasement.
#
set -euo pipefail

ARCHIVE="${1:-}"
SERVICE="db"
DATABASE="ctf_arena"

cd "$(dirname "$0")/.."

if [ -z "$ARCHIVE" ]; then
  echo "Usage : $0 <fichier.sql.gz>" >&2
  echo "Sauvegardes disponibles :" >&2
  ls -1t ./backups/${DATABASE}_*.sql.gz 2>/dev/null >&2 || echo "  (aucune)" >&2
  exit 1
fi

if [ ! -f "$ARCHIVE" ]; then
  echo "Erreur : fichier introuvable — $ARCHIVE" >&2
  exit 1
fi

if ! gzip -t "$ARCHIVE" 2>/dev/null; then
  echo "Erreur : archive illisible ou tronquée — $ARCHIVE" >&2
  exit 1
fi

if ! docker compose ps --status running --services | grep -qx "$SERVICE"; then
  echo "Erreur : le service '$SERVICE' n'est pas démarré." >&2
  exit 1
fi

echo "La base '$DATABASE' va être écrasée par : $ARCHIVE"
printf "Confirmer ? [oui/N] "
read -r REPLY
if [ "$REPLY" != "oui" ]; then
  echo "Annulé."
  exit 1
fi

echo "Sauvegarde de sécurité de l'état actuel…"
./scripts/backup-db.sh ./backups/pre-restore

echo "Restauration en cours…"
gunzip -c "$ARCHIVE" \
  | docker compose exec -T "$SERVICE" sh -c \
      'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" '"$DATABASE"

echo "Restauration terminée."
echo "Redémarrer le backend pour repartir sur un état propre :"
echo "  docker compose restart backend"
