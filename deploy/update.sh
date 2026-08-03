#!/usr/bin/env bash
# =============================================================================
# Extips Panel Pro — one-command updater
#
#   bash /opt/smmpanel/deploy/update.sh
#
# Pulls latest code, installs new deps, runs new migrations, restarts service.
# Rolls back to the previous commit automatically if the health check fails.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/smmpanel}"
ENV_FILE="${ENV_FILE:-/etc/smmpanel.env}"
REPO_BRANCH="${REPO_BRANCH:-main}"
APP_USER="${APP_USER:-smmpanel}"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mxx %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root (sudo bash $0)"
[ -d "$APP_DIR/.git" ] || die "$APP_DIR is not a git checkout — run hostinger-setup.sh first"
[ -f "$ENV_FILE" ] || die "$ENV_FILE missing"

set -a; . "$ENV_FILE"; set +a
APP_PORT="${PORT:-3000}"

cd "$APP_DIR"
git config --global --add safe.directory "$APP_DIR"
PREV_COMMIT="$(git rev-parse HEAD)"

log "Pulling latest code (${REPO_BRANCH})"
git fetch origin "$REPO_BRANCH"
git reset --hard "origin/${REPO_BRANCH}"
NEW_COMMIT="$(git rev-parse HEAD)"

if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
  log "Already up to date ($(git rev-parse --short HEAD)) — re-running deps/migrations anyway"
fi

log "Installing dependencies"
pnpm install --prod=false

log "Building frontend"
# Build into a fresh directory first. Publishing only after a successful build
# prevents the server from continuing to serve stale/broken production chunks.
rm -rf dist-new
pnpm exec vite build --outDir dist-new
rm -rf dist-prev
if [ -d dist ]; then mv dist dist-prev; fi
mv dist-new dist

log "Running pending migrations"
node server/src/migrate.js

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

log "Restarting smmpanel"
systemctl restart smmpanel

log "Health check"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/healthz" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done

if [ "$ok" -eq 1 ]; then
  rm -rf dist-prev
  log "Update complete — now on $(git rev-parse --short HEAD)"
else
  warn "Health check failed — rolling back to ${PREV_COMMIT:0:7}"
  git reset --hard "$PREV_COMMIT"
  pnpm install --prod=false
  if [ -d dist-prev ]; then
    rm -rf dist
    mv dist-prev dist
  else
    pnpm run build || true
  fi
  systemctl restart smmpanel
  die "Rolled back. Logs: journalctl -u smmpanel -n 80 --no-pager"
fi

systemctl reload caddy 2>/dev/null || true
