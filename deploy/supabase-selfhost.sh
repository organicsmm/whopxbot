#!/usr/bin/env bash
# ============================================================================
# OrganicSMM Pro — Full Supabase Self-Host Installer (Option B)
#
# Installs a complete Supabase stack (Postgres + Auth + Data API + Storage +
# Realtime + Edge Runtime + Studio) on a fresh Ubuntu VPS, then applies all
# project migrations so the schema/RLS/functions match Lovable Cloud 1:1.
#
# Usage (as root):
#   curl -fsSL https://raw.githubusercontent.com/xbhisofy/whopxbot/main/deploy/supabase-selfhost.sh | bash
#
# Optional env:
#   DOMAIN=api.example.com   -> enables auto-HTTPS via Caddy
#   INSTALL_DIR=/opt/supabase
# ============================================================================
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/supabase}"
REPO_DIR="${REPO_DIR:-/opt/smmpanel}"
REPO_URL="https://github.com/xbhisofy/whopxbot.git"
DOMAIN="${DOMAIN:-}"

log()  { echo -e "\n\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn]\033[0m $*"; }
die()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root (or with sudo)."

# ---------------------------------------------------------------------------
log "1/8 Installing base packages (docker, git, openssl, jq)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git openssl jq apache2-utils

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

# ---------------------------------------------------------------------------
log "2/8 Fetching Supabase docker stack"
if [ ! -d "$INSTALL_DIR/.git" ]; then
  rm -rf "$INSTALL_DIR"
  git clone --depth 1 https://github.com/supabase/supabase "$INSTALL_DIR-src"
  mkdir -p "$INSTALL_DIR"
  cp -r "$INSTALL_DIR-src/docker/." "$INSTALL_DIR/"
  rm -rf "$INSTALL_DIR-src"
fi
cd "$INSTALL_DIR"

# ---------------------------------------------------------------------------
log "3/8 Generating secrets"
ENV_FILE="$INSTALL_DIR/.env"
if [ ! -f "$ENV_FILE.generated" ]; then
  cp .env.example "$ENV_FILE"

  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 32)"
  DASHBOARD_PASSWORD="$(openssl rand -hex 12)"
  SECRET_KEY_BASE="$(openssl rand -hex 32)"
  VAULT_ENC_KEY="$(openssl rand -hex 16)"

  # Mint anon + service_role JWTs signed with JWT_SECRET (10 year expiry)
  mint_jwt() {
    local role="$1"
    docker run --rm -e JWT_SECRET="$JWT_SECRET" -e ROLE="$role" node:20-alpine sh -c '
      npm i -s jsonwebtoken@9 >/dev/null 2>&1
      node -e "
        const jwt=require(\"jsonwebtoken\");
        const iat=Math.floor(Date.now()/1000);
        console.log(jwt.sign({role:process.env.ROLE,iss:\"supabase\",iat,exp:iat+60*60*24*3650},process.env.JWT_SECRET));
      "'
  }
  ANON_KEY="$(mint_jwt anon)"
  SERVICE_ROLE_KEY="$(mint_jwt service_role)"

  set_env() { # key value
    if grep -q "^$1=" "$ENV_FILE"; then
      sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"
    else
      echo "$1=$2" >> "$ENV_FILE"
    fi
  }

  set_env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
  set_env JWT_SECRET        "$JWT_SECRET"
  set_env ANON_KEY          "$ANON_KEY"
  set_env SERVICE_ROLE_KEY  "$SERVICE_ROLE_KEY"
  set_env DASHBOARD_USERNAME "admin"
  set_env DASHBOARD_PASSWORD "$DASHBOARD_PASSWORD"
  set_env SECRET_KEY_BASE    "$SECRET_KEY_BASE"
  set_env VAULT_ENC_KEY      "$VAULT_ENC_KEY"
  set_env ENABLE_EMAIL_AUTOCONFIRM "true"
  set_env DISABLE_SIGNUP           "false"

  if [ -n "$DOMAIN" ]; then
    set_env API_EXTERNAL_URL "https://$DOMAIN"
    set_env SUPABASE_PUBLIC_URL "https://$DOMAIN"
    set_env SITE_URL "https://$DOMAIN"
  else
    IP="$(curl -fsS4 https://ifconfig.me || hostname -I | awk '{print $1}')"
    set_env API_EXTERNAL_URL "http://$IP:8000"
    set_env SUPABASE_PUBLIC_URL "http://$IP:8000"
    set_env SITE_URL "http://$IP"
  fi

  touch "$ENV_FILE.generated"
fi

# ---------------------------------------------------------------------------
log "4/8 Starting Supabase stack"
docker compose pull
docker compose up -d

log "Waiting for Postgres to accept connections"
for i in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 2
done
docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1 \
  || die "Postgres did not come up. Check: docker compose logs db"

# ---------------------------------------------------------------------------
log "5/8 Cloning project repo (for migrations + edge functions)"
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch --all --prune
  git -C "$REPO_DIR" reset --hard origin/main
else
  git clone "$REPO_URL" "$REPO_DIR"
fi

# ---------------------------------------------------------------------------
log "6/8 Applying all project migrations (schema + RLS + functions)"
MIG_DIR="$REPO_DIR/supabase/migrations"
[ -d "$MIG_DIR" ] || die "No migrations found at $MIG_DIR"

docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public._applied_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

APPLIED=0; SKIPPED=0; FAILED=0
for f in $(ls "$MIG_DIR"/*.sql | sort); do
  name="$(basename "$f")"
  already="$(docker compose exec -T db psql -U postgres -d postgres -tAc \
    "SELECT 1 FROM public._applied_migrations WHERE name='$name'" || true)"
  if [ "$already" = "1" ]; then SKIPPED=$((SKIPPED+1)); continue; fi

  echo "  -> $name"
  if docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < "$f" >/tmp/mig.log 2>&1; then
    docker compose exec -T db psql -U postgres -d postgres -c \
      "INSERT INTO public._applied_migrations(name) VALUES ('$name') ON CONFLICT DO NOTHING" >/dev/null
    APPLIED=$((APPLIED+1))
  else
    FAILED=$((FAILED+1))
    warn "migration failed: $name"
    tail -n 20 /tmp/mig.log
  fi
done
echo "   migrations: applied=$APPLIED skipped=$SKIPPED failed=$FAILED"

# ---------------------------------------------------------------------------
log "7/8 Optional HTTPS reverse proxy"
if [ -n "$DOMAIN" ]; then
  if ! command -v caddy >/dev/null 2>&1; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
      | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
      > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y && apt-get install -y caddy
  fi
  cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
  reverse_proxy 127.0.0.1:8000
}
EOF
  systemctl restart caddy
  echo "   HTTPS ready at https://$DOMAIN"
else
  warn "No DOMAIN set — API exposed on http://<ip>:8000 (Studio on :8000 too)"
fi

# ---------------------------------------------------------------------------
log "8/8 Done — credentials"
grep -E '^(API_EXTERNAL_URL|ANON_KEY|SERVICE_ROLE_KEY|POSTGRES_PASSWORD|DASHBOARD_USERNAME|DASHBOARD_PASSWORD)=' "$ENV_FILE"

cat <<EOF

----------------------------------------------------------------------
NEXT STEPS
----------------------------------------------------------------------
1) Import your data dump (see deploy/DATA-MIGRATION.md):
     bash $REPO_DIR/deploy/import-data.sh /root/dump.sql

2) Point the frontend at this stack — edit $REPO_DIR/.env:
     VITE_SUPABASE_URL=<API_EXTERNAL_URL above>
     VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY above>
   then: cd $REPO_DIR && pnpm install && pnpm run build

3) Deploy edge functions:
     cd $REPO_DIR && npx supabase functions deploy --all

Stack management:
  cd $INSTALL_DIR
  docker compose ps
  docker compose logs -f
  docker compose restart
----------------------------------------------------------------------
EOF
