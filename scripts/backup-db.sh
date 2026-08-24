#!/usr/bin/env bash
#
# Sauvegarde la base ctf_arena depuis le conteneur MySQL.
#
# Usage :
#   ./scripts/backup-db.sh [dossier_de_destination]
#
# Le dossier par défaut est ./backups. Chaque sauvegarde est un fichier
# ctf_arena_AAAAMMJJ-HHMMSS.sql.gz. Les 48 plus récentes sont conservées.
#
# Pendant un événement, planifier une exécution toutes les 15 minutes :
#   */15 * * * * cd /chemin/vers/le/projet && ./scripts/backup-db.sh
#
set -euo pipefail

DEST="${1:-./backups}"
KEEP=48
SERVICE="db"
DATABASE="ctf_arena"

cd "$(dirname "$0")/.."

if ! docker compose ps --status running --services | grep -qx "$SERVICE"; then
  echo "Erreur : le service '$SERVICE' n'est pas démarré." >&2
  exit 1
fi

mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$DEST/${DATABASE}_${STAMP}.sql.gz"
TMP="$TARGET.partial"

# --single-transaction : dump cohérent sans verrouiller les écritures des joueurs.
# Le mot de passe est lu dans l'environnement du conteneur, jamais en argument.
docker compose exec -T "$SERVICE" sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers '"$DATABASE" \
  | gzip > "$TMP"

# Renommage final : un fichier .sql.gz présent est toujours un dump complet.
mv "$TMP" "$TARGET"

SIZE="$(du -h "$TARGET" | cut -f1)"
echo "Sauvegarde écrite : $TARGET ($SIZE)"

# Rotation
COUNT="$(ls -1 "$DEST"/${DATABASE}_*.sql.gz 2>/dev/null | wc -l)"
if [ "$COUNT" -gt "$KEEP" ]; then
  ls -1t "$DEST"/${DATABASE}_*.sql.gz | tail -n +$((KEEP + 1)) | while read -r old; do
    rm -f "$old"
    echo "Ancienne sauvegarde supprimée : $old"
  done
fi
