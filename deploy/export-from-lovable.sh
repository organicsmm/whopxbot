#!/usr/bin/env bash
# =============================================================================
# Export auth users + password hashes + public data from Lovable Cloud
# to files that the self-hosted VPS import scripts expect.
#
# Run this on the VPS (or any machine with curl/jq) AFTER you have:
#   1. Set MIGRATION_TOKEN in your Lovable Cloud edge-function secrets.
#   2. Deployed the export-auth-hashes edge function to Lovable Cloud.
#
# Usage:
#   bash /opt/smmpanel/deploy/export-from-lovable.sh
# =============================================================================
set -euo pipefail

SECRETS="${SECRETS_FILE:-/etc/smmpanel.secrets}"
OUT_DIR="${OUT_DIR:-/root}"
mkdir -p "$OUT_DIR"

log()  { echo -e "\n\033[1;32m==>\033[0m $*"; }
die()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

# Read source credentials from /etc/smmpanel.secrets
SOURCE_URL=''
SOURCE_ANON=''
MIGRATION_TOKEN=''
if [ -f "$SECRETS" ]; then
  while IFS='=' read -r k v; do
    [ -z "${k// }" ] && continue
    case "$k" in \#*) continue;; esac
    case "$k" in
      SOURCE_SUPABASE_URL) SOURCE_URL="$v" ;;
      SOURCE_SUPABASE_ANON_KEY) SOURCE_ANON="$v" ;;
      MIGRATION_TOKEN) MIGRATION_TOKEN="$v" ;;
    esac
  done < "$SECRETS"
fi

: "${SOURCE_URL:?SOURCE_SUPABASE_URL missing in $SECRETS}"
: "${SOURCE_ANON:?SOURCE_SUPABASE_ANON_KEY missing in $SECRETS}"
: "${MIGRATION_TOKEN:?MIGRATION_TOKEN missing in $SECRETS}"

command -v curl >/dev/null || die "curl not installed"
command -v jq >/dev/null || { apt-get update -qq && apt-get install -y jq >/dev/null; }

EXPORT_FN="${SOURCE_URL%/}/functions/v1/export-auth-hashes"

log "Calling export-auth-hashes from Lovable Cloud..."
HTTP=$(curl -s -o "$OUT_DIR/.export.json" -w '%{http_code}' \
  -X POST "$EXPORT_FN" \
  -H "apikey: $SOURCE_ANON" \
  -H "Authorization: Bearer $MIGRATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

[ "$HTTP" = "200" ] || die "export-auth-hashes returned HTTP $HTTP:\n$(cat "$OUT_DIR/.export.json" | head -c 500)"

jq '.users' "$OUT_DIR/.export.json" > "$OUT_DIR/auth-users.json"
jq -r '.password_sql' "$OUT_DIR/.export.json" > "$OUT_DIR/auth-passwords.sql"
USERS=$(jq '.users | length' "$OUT_DIR/.export.json")
HASHES=$(grep -c '^UPDATE' "$OUT_DIR/auth-passwords.sql" || true)
rm -f "$OUT_DIR/.export.json"
log "Exported $USERS users and $HASHES password hashes."
echo "  -> $OUT_DIR/auth-users.json"
echo "  -> $OUT_DIR/auth-passwords.sql"

log "Next steps:"
echo "  bash /opt/smmpanel/deploy/import-auth-users.sh $OUT_DIR/auth-users.json"
echo "  bash /opt/smmpanel/deploy/import-auth-passwords.sh $OUT_DIR/auth-passwords.sql"
echo ""
echo "For full data migration, provide a SQL dump or CSV archive and run:"
echo "  bash /opt/smmpanel/deploy/import-data.sh /root/dump.sql"
echo "  # or"
echo "  bash /opt/smmpanel/deploy/import-data.sh /root/dump.tar.gz"
