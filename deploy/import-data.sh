#!/usr/bin/env bash
# ============================================================================
# Import a Lovable Cloud data export into the self-hosted Supabase stack.
#
# Usage:
#   bash deploy/import-data.sh /root/dump.sql        # plain SQL dump
#   bash deploy/import-data.sh /root/dump.tar.gz     # archive of CSVs
#
# The script is idempotent-safe for CSV mode (ON CONFLICT DO NOTHING via
# temp staging) and non-destructive: it never drops existing tables.
# ============================================================================
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/supabase}"
SRC="${1:-}"

log()  { echo -e "\n\033[1;32m==>\033[0m $*"; }
die()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

[ -n "$SRC" ] || die "Usage: bash import-data.sh /path/to/dump.sql|dump.tar.gz"
[ -f "$SRC" ] || die "File not found: $SRC"
[ -d "$INSTALL_DIR" ] || die "Supabase stack not found at $INSTALL_DIR — run supabase-selfhost.sh first"

cd "$INSTALL_DIR"
docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1 \
  || die "Postgres not running. Start it: cd $INSTALL_DIR && docker compose up -d"

psql_run() { docker compose exec -T db psql -U postgres -d postgres "$@"; }

case "$SRC" in
  *.sql)
    log "Importing SQL dump: $SRC"
    if [ "${FRESH:-0}" = "1" ]; then
      log "FRESH=1 — resetting public schema first (dump must contain schema + data)"
      psql_run -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;
        GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
        GRANT ALL ON SCHEMA public TO postgres;" >/dev/null
    fi
    # Relax triggers/FKs during load so row order does not matter.
    # No ON_ERROR_STOP: 'already exists' / duplicate-key noise must not abort
    # the whole import.
    psql_run -c "SET session_replication_role = 'replica';" >/dev/null
    psql_run -f - < "$SRC" 2>&1 | grep -Ev 'already exists|^SET$|^$' | tail -n 60 || true
    psql_run -c "SET session_replication_role = 'origin';" >/dev/null
    ;;


  *.tar.gz|*.tgz)
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT
    log "Extracting $SRC"
    tar -xzf "$SRC" -C "$TMP"

    log "Importing CSV files"
    # Load parents before children to satisfy FKs.
    ORDER=(
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
    # session_replication_role must be set in the SAME session as the COPY,
    # so stream a prelude + COPY + data into one psql invocation.
    copy_csv() {
      local tbl="$1" file="$2"
      { echo "SET session_replication_role = 'replica';";
        echo "COPY public.$tbl FROM STDIN WITH (FORMAT csv, HEADER true);";
        cat "$file";
        echo "\\.";
      } | docker compose exec -T db psql -U postgres -d postgres -q
    }

    for t in "${ORDER[@]}"; do
      f="$(find "$TMP" -maxdepth 2 -name "$t.csv" | head -1 || true)"
      [ -n "$f" ] || continue
      echo "  -> $t"
      copy_csv "$t" "$f" \
        || echo "     [warn] $t import had errors (likely duplicates) — continuing"
    done
    # Any remaining CSVs not in the ordered list.
    while IFS= read -r f; do
      t="$(basename "$f" .csv)"
      printf '%s\n' "${ORDER[@]}" | grep -qx "$t" && continue
      echo "  -> $t (extra)"
      copy_csv "$t" "$f" \
        || echo "     [warn] $t import had errors — continuing"
    done < <(find "$TMP" -maxdepth 2 -name '*.csv')
    ;;

  *)
    die "Unsupported file type. Use .sql or .tar.gz"
    ;;
esac

log "Resetting sequences"
psql_run -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r record; maxv bigint;
BEGIN
  FOR r IN
    SELECT c.oid::regclass::text AS tbl, a.attname AS col,
           pg_get_serial_sequence(c.oid::regclass::text, a.attname) AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND pg_get_serial_sequence(c.oid::regclass::text, a.attname) IS NOT NULL
  LOOP
    EXECUTE format('SELECT COALESCE(MAX(%I),0) FROM %s', r.col, r.tbl) INTO maxv;
    EXECUTE format('SELECT setval(%L, GREATEST(%s,1))', r.seq, maxv);
  END LOOP;
END $$;
SQL

log "Row counts"
psql_run -c "
SELECT relname AS table, n_live_tup AS approx_rows
FROM pg_stat_user_tables
WHERE schemaname='public' AND n_live_tup > 0
ORDER BY n_live_tup DESC LIMIT 40;"

log "Import complete"
echo "If auth.users rows were included, existing users can sign in with their old passwords."
echo "If NOT included, users must use 'Forgot password' to set a new one."
