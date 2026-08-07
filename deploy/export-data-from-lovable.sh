#!/usr/bin/env bash
# =============================================================================
# Export public-schema data from Lovable Cloud via the REST API.
# Writes CSV files into a tar.gz that import-data.sh can consume.
#
# Run AFTER setting SOURCE_SUPABASE_URL and SOURCE_SUPABASE_ANON_KEY in
# /etc/smmpanel.secrets.
#
# Usage:
#   bash /opt/smmpanel/deploy/export-data-from-lovable.sh
# Output:
#   /root/lovable-data-export.tar.gz
# Import:
#   bash /opt/smmpanel/deploy/import-data.sh /root/lovable-data-export.tar.gz
# =============================================================================
set -euo pipefail

SECRETS="${SECRETS_FILE:-/etc/smmpanel.secrets}"
OUT_DIR="${OUT_DIR:-/root/.lovable-export}"
ARCHIVE="${ARCHIVE:-/root/lovable-data-export.tar.gz}"
BATCH=1000

log()  { echo -e "\n\033[1;32m==>\033[0m $*"; }
die()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

SOURCE_URL=''
SOURCE_ANON=''
if [ -f "$SECRETS" ]; then
  while IFS='=' read -r k v; do
    [ -z "${k// }" ] && continue
    case "$k" in \#*) continue;; esac
    case "$k" in
      SOURCE_SUPABASE_URL) SOURCE_URL="$v" ;;
      SOURCE_SUPABASE_ANON_KEY) SOURCE_ANON="$v" ;;
    esac
  done < "$SECRETS"
fi

: "${SOURCE_URL:?SOURCE_SUPABASE_URL missing in $SECRETS}"
: "${SOURCE_ANON:?SOURCE_SUPABASE_ANON_KEY missing in $SECRETS}"

command -v curl >/dev/null || die "curl not installed"
command -v jq >/dev/null || { apt-get update -qq && apt-get install -y jq >/dev/null; }

API_BASE="${SOURCE_URL%/}/rest/v1"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Tables to export, in dependency order (parents before children).
TABLES=(
  profiles wallets user_roles subscriptions platform_settings
  providers provider_accounts services service_provider_mapping
  engagement_bundles bundle_items
  orders engagement_orders engagement_order_items organic_run_schedule
  transactions deposits oxapay_deposits zapupi_deposits
  promo_codes promo_redemptions
  instagram_accounts instagram_media instagram_poll_state
  chat_conversations chat_messages support_tickets
  telegram_engagement_links engagement_presets
  drip_feed_campaigns mass_order_batches mass_order_batch_items
  subscription_requests
)

mkdir -p "$OUT_DIR"

fetch_table() {
  local table="$1"
  local offset=0
  local page=1
  local out="$OUT_DIR/$table.csv"
  local headers_file="$TMP/${table}.headers"

  log "Exporting $table ..."

  while true; do
    local resp_file="$TMP/${table}.${page}.json"
    local http
    http=$(curl -s -o "$resp_file" -w '%{http_code}' \
      -H "apikey: $SOURCE_ANON" \
      -H "Authorization: Bearer $SOURCE_ANON" \
      "$API_BASE/$table?select=*&limit=$BATCH&offset=$offset")

    if [ "$http" != "200" ]; then
      echo "  [warn] $table page $page -> HTTP $http (skipping)"
      cat "$resp_file" | head -c 300 >&2 || true
      echo >&2
      return
    fi

    local count
    count=$(jq 'length' "$resp_file")
    if [ "$count" -eq 0 ]; then
      break
    fi

    if [ "$page" -eq 1 ]; then
      # Freeze the column order from the first row and reuse it for EVERY row,
      # otherwise rows with different key order shift values into wrong columns.
      jq -c '.[0] | keys_unsorted' "$resp_file" > "$headers_file"
      jq -r '(.[0] | keys_unsorted) | @csv' "$resp_file" > "$out"
    fi

    # NULL -> unquoted empty field (Postgres CSV reads that as NULL).
    # Objects/arrays -> compact JSON. Everything else -> quoted string.
    jq -r --argjson h "$(cat "$headers_file")" '
      .[] | [ $h[] as $k | (.[$k]
              | if . == null then null
                elif type == "string" then .
                else tojson end) ]
          | map(if . == null then "" else "\"" + (gsub("\"";"\"\"")) + "\"" end)
          | join(",")' "$resp_file" >> "$out"

    echo "  page $page: $count rows"
    [ "$count" -lt "$BATCH" ] && break
    offset=$((offset + BATCH))
    page=$((page + 1))
    sleep 0.2  # be polite to the REST API
  done

  local total=0
  [ -f "$out" ] && total=$(wc -l < "$out" | tr -d ' ')
  if [ "$total" -le 1 ]; then
    echo "  [info] $table empty or not readable — removing CSV"
    rm -f "$out"
  else
    echo "  -> $total total rows (including header) written to $out"
  fi
}

for t in "${TABLES[@]}"; do
  fetch_table "$t" || echo "  [warn] $t export failed, continuing..."
done

log "Packing CSVs into $ARCHIVE"
cd "$OUT_DIR"
tar -czf "$ARCHIVE" *.csv

echo ""
echo "Export complete: $ARCHIVE"
echo "Import with:"
echo "  bash /opt/smmpanel/deploy/import-data.sh $ARCHIVE"
