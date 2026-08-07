#!/usr/bin/env bash
# Deploy ALL edge functions from the repo into the self-hosted Supabase stack,
# and copy required secrets into the stack env so the functions can run.
#
# Usage:  bash deploy/deploy-edge-functions.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/smmpanel}"
SUPA_DIR="${SUPA_DIR:-/opt/supabase}"
SRC="$REPO_DIR/supabase/functions"
DST="$SUPA_DIR/volumes/functions"

[ -d "$SRC" ] || { echo "[error] $SRC not found"; exit 1; }
[ -f "$SUPA_DIR/docker-compose.yml" ] || { echo "[error] Supabase stack not found at $SUPA_DIR"; exit 1; }

echo "[1/4] Copying functions -> $DST"
mkdir -p "$DST"
# keep the stack's own main/ router if present, replace everything else
find "$DST" -mindepth 1 -maxdepth 1 ! -name main -exec rm -rf {} +
cp -r "$SRC"/. "$DST"/
COUNT=$(find "$DST" -mindepth 1 -maxdepth 1 -type d ! -name main ! -name _shared | wc -l)
echo "      $COUNT functions copied"

echo "[2/4] Ensuring function secrets in $SUPA_DIR/.env"
ENVF="$SUPA_DIR/.env"
set_env() {
  local k="$1" v="$2"
  [ -n "$v" ] || return 0
  if grep -qE "^${k}=" "$ENVF"; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$ENVF"
  else
    printf '%s=%s\n' "$k" "$v" >> "$ENVF"
  fi
}

# Secrets you must provide once (leave blank to keep existing values).
# Edit /etc/smmpanel.secrets with KEY=value lines and this script will pick them up.
SECRETS_FILE="${SECRETS_FILE:-/etc/smmpanel.secrets}"
if [ -f "$SECRETS_FILE" ]; then
  # shellcheck disable=SC1090
  while IFS='=' read -r k v; do
    [ -z "${k// }" ] && continue
    case "$k" in \#*) continue;; esac
    set_env "$k" "$v"
  done < "$SECRETS_FILE"
  echo "      merged secrets from $SECRETS_FILE"
else
  cat > "$SECRETS_FILE" <<'EOF'
# Fill these in, then rerun deploy/deploy-edge-functions.sh
OXAPAY_MERCHANT_API_KEY=
ZAPUPI_ZAP_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_CHAT_ID=
APIFY_API_TOKEN=
RAZORPAY_WEBHOOK_SECRET=
LOVABLE_API_KEY=
# Source Lovable Cloud credentials (used only by export-from-lovable.sh)
SOURCE_SUPABASE_URL=
SOURCE_SUPABASE_ANON_KEY=
MIGRATION_TOKEN=
EOF
  chmod 600 "$SECRETS_FILE"
  echo "      created template $SECRETS_FILE (fill it and rerun)"
fi

echo "[3/4] Restarting edge runtime"
cd "$SUPA_DIR"
docker compose up -d functions >/dev/null 2>&1 || docker compose up -d edge-functions >/dev/null 2>&1 || true
docker compose restart functions >/dev/null 2>&1 || docker compose restart edge-functions >/dev/null 2>&1 || true

echo "[4/4] Health check"
API_URL="$(grep -E '^API_EXTERNAL_URL=' "$ENVF" | cut -d= -f2- | tr -d '"')"
ANON="$(grep -E '^ANON_KEY=' "$ENVF" | cut -d= -f2- | tr -d '"')"
sleep 6
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/functions/v1/cron-status" -H "apikey: $ANON" || true)
echo "      GET /functions/v1/cron-status -> HTTP $CODE"
[ "$CODE" = "000" ] && echo "[warn] edge runtime not reachable; check: docker compose logs functions --tail=50"

echo "[done] Edge functions deployed."
echo "[next] Point provider webhooks to: $API_URL/functions/v1/oxapay-webhook and .../zapupi-webhook"
