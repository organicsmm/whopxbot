#!/usr/bin/env bash
# =============================================================================
# OrganicSMM Pro — one-shot VPS installer (Ubuntu 22.04 / 24.04, Hostinger VPS)
#
#   curl -fsSL https://raw.githubusercontent.com/xbhisofy/whopxbot/main/deploy/hostinger-setup.sh | bash
#
# Installs: Node.js 20, pnpm, PostgreSQL, Caddy
# Creates:  /opt/smmpanel (repo), /etc/smmpanel.env (secrets), systemd unit `smmpanel`
# Result:   app on 127.0.0.1:3000, Caddy reverse proxy with automatic HTTPS
# =============================================================================
set -euo pipefail

# ---- configurable via env ---------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/xbhisofy/whopxbot.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/smmpanel}"
ENV_FILE="${ENV_FILE:-/etc/smmpanel.env}"
APP_USER="${APP_USER:-smmpanel}"
APP_PORT="${APP_PORT:-3000}"
DB_NAME="${DB_NAME:-smmpanel}"
DB_USER="${DB_USER:-smmpanel}"
DOMAIN="${DOMAIN:-}"
PROVIDER_API_URL="${PROVIDER_API_URL:-}"
PROVIDER_API_KEY="${PROVIDER_API_KEY:-}"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mxx %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root (use: sudo bash) "

# Interactive prompts only when a TTY exists (piped-to-bash uses env vars/defaults).
if [ -z "$DOMAIN" ] && [ -t 0 ]; then
  read -rp "Domain (e.g. panel.example.com, blank = IP only, no HTTPS): " DOMAIN
fi
# Allow overriding the repo URL interactively or via REPO_URL env var.
if [ "$REPO_URL" = "https://github.com/xbhisofy/whopxbot.git" ] && [ -t 0 ]; then
  read -rp "GitHub repo URL [https://github.com/xbhisofy/whopxbot.git]: " input_repo
  [ -n "$input_repo" ] && REPO_URL="$input_repo"
fi


# -----------------------------------------------------------------------------
log "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg git ufw ttf-mscorefonts-installer >/dev/null 2>&1 || \
  apt-get install -y curl ca-certificates gnupg git ufw

# ---- Node.js 20 -------------------------------------------------------------
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  log "Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
log "Node $(node -v)"

# ---- pnpm -------------------------------------------------------------------
if ! command -v pnpm >/dev/null; then
  log "Installing pnpm"
  npm install -g pnpm@9
fi
log "pnpm $(pnpm -v)"

# ---- PostgreSQL -------------------------------------------------------------
log "Installing PostgreSQL"
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

DB_PASS="$(openssl rand -hex 24)"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  warn "DB role ${DB_USER} exists — resetting its password"
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';"
else
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

# ---- Caddy ------------------------------------------------------------------
if ! command -v caddy >/dev/null; then
  log "Installing Caddy"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

# ---- app user + repo --------------------------------------------------------
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

log "Fetching source into ${APP_DIR}"
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" remote set-url origin "$REPO_URL"
  git -C "$APP_DIR" fetch --depth 1 origin "$REPO_BRANCH"
  git -C "$APP_DIR" reset --hard "origin/${REPO_BRANCH}"
else
  git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
fi
git config --global --add safe.directory "$APP_DIR"

# ---- secrets ----------------------------------------------------------------
if [ -f "$ENV_FILE" ]; then
  warn "${ENV_FILE} already exists — keeping existing secrets"
else
  log "Writing ${ENV_FILE}"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
SESSION_SECRET=$(openssl rand -hex 32)
PORT=${APP_PORT}
PROVIDER_API_KEY=${PROVIDER_API_KEY}
PROVIDER_API_URL=${PROVIDER_API_URL}
PUBLIC_APP_URL=${DOMAIN:+https://$DOMAIN}
NODE_ENV=production
EOF
fi
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

# ---- build ------------------------------------------------------------------
log "Installing dependencies"
cd "$APP_DIR"
pnpm install --prod=false

log "Building frontend"
pnpm run build || warn "frontend build failed — API will still start"

log "Running database migrations"
set -a; . "$ENV_FILE"; set +a
node server/src/migrate.js

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# ---- systemd ----------------------------------------------------------------
log "Creating systemd service smmpanel"
cat > /etc/systemd/system/smmpanel.service <<EOF
[Unit]
Description=OrganicSMM Pro
Documentation=https://github.com
After=network-online.target postgresql.service
Wants=network-online.target postgresql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node ${APP_DIR}/server/src/index.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=smmpanel
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable smmpanel
systemctl restart smmpanel

# ---- Caddy config -----------------------------------------------------------
log "Configuring Caddy"
if [ -n "$DOMAIN" ]; then
  cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
    encode zstd gzip
    reverse_proxy 127.0.0.1:${APP_PORT}
    log {
        output file /var/log/caddy/smmpanel.log
    }
}
EOF
else
  cat > /etc/caddy/Caddyfile <<EOF
:80 {
    encode zstd gzip
    reverse_proxy 127.0.0.1:${APP_PORT}
}
EOF
fi
mkdir -p /var/log/caddy && chown -R caddy:caddy /var/log/caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

# ---- firewall ---------------------------------------------------------------
log "Configuring firewall"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp  >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

# ---- verify -----------------------------------------------------------------
log "Verifying app health"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/healthz" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done

if [ "$ok" -eq 1 ]; then
  log "OrganicSMM Pro is live"
else
  warn "Health check failed. Inspect logs: journalctl -u smmpanel -n 80 --no-pager"
fi

cat <<EOF

--------------------------------------------------------------
  OrganicSMM Pro installed
--------------------------------------------------------------
  URL          : ${DOMAIN:+https://$DOMAIN}${DOMAIN:-http://$(curl -fsS4 ifconfig.me 2>/dev/null || echo YOUR_SERVER_IP)}
  App dir      : ${APP_DIR}
  Secrets      : ${ENV_FILE}
  Service      : systemctl status smmpanel
  Logs         : journalctl -u smmpanel -f
  Update       : bash ${APP_DIR}/deploy/update.sh

  NEXT STEP: open the site and sign up — the FIRST account
  created automatically becomes the admin.

  Set your provider credentials in ${ENV_FILE}
  (PROVIDER_API_URL / PROVIDER_API_KEY) then:
      systemctl restart smmpanel
--------------------------------------------------------------
EOF
