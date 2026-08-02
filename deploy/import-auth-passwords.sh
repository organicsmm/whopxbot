#!/usr/bin/env bash
# Applies the exported password hashes to the self-hosted Supabase auth.users.
# Usage: bash deploy/import-auth-passwords.sh /root/auth-passwords.sql
set -euo pipefail

FILE="${1:-/root/auth-passwords.sql}"
STACK_DIR="${STACK_DIR:-/opt/supabase}"

[ -f "$FILE" ] || { echo "[error] File not found: $FILE"; exit 1; }
[ -d "$STACK_DIR" ] || { echo "[error] Supabase stack dir not found: $STACK_DIR"; exit 1; }

DB_PASS=$(grep -E '^POSTGRES_PASSWORD=' "$STACK_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"')
[ -n "$DB_PASS" ] || { echo "[error] POSTGRES_PASSWORD not found in $STACK_DIR/.env"; exit 1; }

echo "[info] Applying password hashes from $FILE"
cd "$STACK_DIR"
docker compose exec -T -e PGPASSWORD="$DB_PASS" db \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$FILE"

echo "[done] Passwords imported. Users can now log in with their original passwords."
rm -f "$FILE"
echo "[info] Removed $FILE from disk."
