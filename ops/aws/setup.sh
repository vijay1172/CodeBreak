#!/usr/bin/env bash
# BrokenRepo backend - AWS EC2 Ubuntu 24.04 (ARM64) one-time setup.
# Final architecture: ALL traffic arrives via Cloudflare Tunnel.
#
#   api.brokenrepo.tech        -> tunnel -> localhost:3000
#   {sessionId}.brokenrepo.tech -> tunnel (wildcard public hostname) -> localhost:3000
#
# No nginx, no Let's Encrypt, no inbound 80/443: TLS terminates at the
# Cloudflare edge (Universal SSL covers *.brokenrepo.tech, and preview
# hosts are one label deep). The security group needs SSH only.
#
# After this script, run setup-tunnel.sh and add the two public hostnames
# in the Cloudflare Zero Trust dashboard (api + wildcard).
#
# Run as the default "ubuntu" user:  bash setup.sh   (idempotent).
#
# Node 22, not 20: Node 20 reached end-of-life April 2026; the service
# ran Node 22 on Render.

set -uo pipefail

APP_DIR="$HOME/brokenrepo-backend"
SERVER_DIR="$APP_DIR/server"
REPO_SSH_URL="git@github.com:vijay1172/CodeBreak.git"
APP_PORT=3000
PM2_NAME="brokenrepo-api"

say()  { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
ok()   { printf '\033[1;32mOK:\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mFATAL:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] && die "Run as the 'ubuntu' user without sudo; the script calls sudo itself."

# ---------------------------------------------------------------- 1. system
say "1/7 System update"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y git curl
ok "system packages updated"

# ---------------------------------------------------------------- 2. node 22
say "2/7 Node.js 22.x via NodeSource"
NODE_MAJOR=$(node -v 2>/dev/null | grep -oE '^v[0-9]+' | tr -d v || true)
if [ "${NODE_MAJOR:-0}" -ge 22 ]; then
  ok "Node $(node -v) already installed"
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - \
    && sudo apt-get install -y nodejs \
    || die "Node.js 22 installation failed"
  ok "Node $(node -v) installed"
fi

# ---------------------------------------------------------------- 3. pm2
say "3/7 PM2 (process manager)"
command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2 || die "pm2 install failed"
ok "pm2 $(pm2 -v) ready"

# ---------------------------------------------------------------- 4. repo + key
say "4/7 Clone the repository (monorepo; backend lives in server/)"
if [ ! -d "$SERVER_DIR" ]; then
  if [ ! -f "$HOME/.ssh/id_ed25519" ] && [ ! -f "$HOME/.ssh/id_rsa" ]; then
    ssh-keygen -t ed25519 -N "" -f "$HOME/.ssh/id_ed25519" -C "brokenrepo-aws-vm" >/dev/null
    warn "Generated a new SSH key for GitHub access."
  fi
  PUB=$(cat "$HOME/.ssh/id_ed25519.pub" 2>/dev/null || cat "$HOME/.ssh/id_rsa.pub")
  echo "    Add this deploy key (read-only) to GitHub:"
  echo "    Repo Settings -> Deploy keys -> Add deploy key"
  echo "    $PUB"
  grep -q "github.com" "$HOME/.ssh/known_hosts" 2>/dev/null || ssh-keyscan -t ed25519,rsa github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null
  git clone "$REPO_SSH_URL" "$APP_DIR" || die "clone failed - add the deploy key above, then re-run this script"
  ok "repository cloned"
else
  ok "repository already present at $APP_DIR"
fi

# ---------------------------------------------------------------- 5. deps
say "5/7 Install backend dependencies (npm ci; pure-JS deps, no native builds on ARM64)"
cd "$SERVER_DIR" || die "missing $SERVER_DIR"
if [ -f package-lock.json ]; then
  npm ci --omit=dev || die "npm ci failed"
else
  npm install --omit=dev || die "npm install failed"
fi
ok "dependencies installed"

# ---------------------------------------------------------------- 6. env file
say "6/7 Environment file"
if [ ! -f .env ]; then
  cp .env.example .env
  warn "Created server/.env from the template - FILL IN THE PLACEHOLDERS before the app can boot."
  echo "    Edit with: nano $SERVER_DIR/.env"
else
  ok "server/.env already exists (left untouched)"
fi
if grep -q "PLACEHOLDER" .env 2>/dev/null; then
  warn "server/.env still contains <PLACEHOLDER...> values; the app will refuse to start until they are filled."
fi

# ---------------------------------------------------------------- 7. pm2 app
say "7/7 PM2 app (ecosystem.config.cjs) + boot persistence + health cron"
cd "$SERVER_DIR" || die "missing $SERVER_DIR"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  ok "pm2 process '$PM2_NAME' already exists"
else
  pm2 start ecosystem.config.cjs --env production || die "pm2 start failed"
  ok "pm2 process '$PM2_NAME' started (logs: pm2 logs $PM2_NAME)"
fi
sudo env PATH="$PATH:/usr/bin" "$(command -v pm2)" startup systemd -u ubuntu --hp /home/ubuntu >/dev/null
pm2 save
ok "pm2 survives reboots via systemd (user: ubuntu)"
if curl -sf -m 5 "http://localhost:$APP_PORT/health" >/dev/null 2>&1; then
  ok "app answers on localhost:$APP_PORT/health"
else
  warn "localhost:$APP_PORT/health did not answer - check .env and: pm2 logs $PM2_NAME"
fi
CRON_LINE="*/5 * * * * curl -sf -m 10 http://localhost:$APP_PORT/health >/dev/null 2>&1 || (/usr/bin/pm2 restart $PM2_NAME) >> /home/ubuntu/health-check.log 2>&1"
( crontab -l 2>/dev/null | grep -v "health-check.log" ; echo "$CRON_LINE" ) | crontab -
ok "cron installed: pings the app directly (no DNS/cert dependency)"

cat <<DONE

====================================================================
 SETUP COMPLETE (or resumed) - remaining manual steps:

 1. Secrets:                        nano $SERVER_DIR/.env
                                    then:  pm2 restart $PM2_NAME
 2. GitHub deploy key:              add the SSH public key printed above
 3. Cloudflare Tunnel:              bash setup-tunnel.sh <TUNNEL_TOKEN>
                                    then add BOTH public hostnames in the
                                    Zero Trust dashboard:
                                      api.brokenrepo.tech        -> HTTP://localhost:3000
                                      *.brokenrepo.tech          -> HTTP://localhost:3000
 4. Atlas Network Access:           allow this VM's public IP
 5. Security group (AWS console):   inbound SSH 22 (your IP) ONLY.
                                    No 80/443 needed - all traffic uses the tunnel.
 6. GitHub Secrets for auto-deploy: DEPLOY_VM_HOST  = VM public IP (SSH only)
                                    DEPLOY_SSH_KEY = private key contents

 Verify: curl http://localhost:3000/health      (on the VM)
         https://api.brokenrepo.tech/health     (after the tunnel step)
====================================================================
DONE
