#!/usr/bin/env bash
# BrokenRepo backend - AWS EC2 Ubuntu 24.04 (ARM64) one-time setup.
# Cloudflare Tunnel edition: no Elastic IP, no A record for the API.
#
# Routing after this script + setup-tunnel.sh:
#   api.brokenrepo.tech          -> Cloudflare Tunnel (edge TLS) -> cloudflared -> localhost:3000
#   *.preview.brokenrepo.tech    -> DNS-only A record -> this VM's nginx (Let's Encrypt wildcard)
#
# Run as the default "ubuntu" user:  bash setup.sh
# Safe to re-run: every step checks whether it already happened.
#
# Why Node 22 (not 20): Node 20 reached end-of-life in April 2026 and the
# service ran Node 22 on Render. Why port 3000: convention; the port is
# localhost-only behind cloudflared and nginx.
#
# Cost note: the instance's auto-assigned public IPv4 is billed by AWS at the
# same ~$0.005/hr as an Elastic IP. The tunnel removes the DEPENDENCE on a
# stable IP (and the api A record), not that charge itself; SSH and the
# preview path still need the public interface. Credits absorb it.

set -uo pipefail

APP_DIR="$HOME/brokenrepo-backend"
SERVER_DIR="$APP_DIR/server"
REPO_SSH_URL="git@github.com:vijay1172/CodeBreak.git"
PREVIEW_SUFFIX="preview.brokenrepo.tech"
APP_PORT=3000
PM2_NAME="brokenrepo-api"
CERT_EMAIL="vijaysharma11702@gmail.com"
CF_CREDS="/etc/letsencrypt/cloudflare.ini"

say()  { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
ok()   { printf '\033[1;32mOK:\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mFATAL:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] && die "Run as the 'ubuntu' user without sudo; the script calls sudo itself."

# ---------------------------------------------------------------- 1. system
say "1/11 System update"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y git curl
ok "system packages updated"

# ---------------------------------------------------------------- 2. node 22
say "2/11 Node.js 22.x via NodeSource"
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
say "3/11 PM2 (process manager)"
command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2 || die "pm2 install failed"
ok "pm2 $(pm2 -v) ready"

# ---------------------------------------------------------------- 4. nginx
say "4/11 Nginx (TLS termination for the preview wildcard only)"
command -v nginx >/dev/null 2>&1 || sudo apt-get install -y nginx || die "nginx install failed"
ok "nginx ready"

# ---------------------------------------------------------------- 5. certbot
say "5/11 Certbot + Cloudflare DNS plugin (wildcard cert for previews)"
sudo apt-get install -y certbot python3-certbot-dns-cloudflare \
  || die "certbot installation failed"
ok "certbot ready"

# ---------------------------------------------------------------- 6. repo + key
say "6/11 Clone the repository (monorepo; backend lives in server/)"
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

# ---------------------------------------------------------------- 7. deps
say "7/11 Install backend dependencies (npm ci; no native builds on ARM64)"
cd "$SERVER_DIR" || die "missing $SERVER_DIR"
if [ -f package-lock.json ]; then
  npm ci --omit=dev || die "npm ci failed"
else
  npm install --omit=dev || die "npm install failed"
fi
ok "dependencies installed"

# ---------------------------------------------------------------- 8. env file
say "8/11 Environment file"
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

# ---------------------------------------------------------------- 9. pm2 app
say "9/11 PM2 app (ecosystem.config.cjs) + boot persistence"
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

# ------------------------------------------------------- 10. preview TLS + nginx
say "10/11 Wildcard certificate and nginx vhost for previews"
WILDCARD_CERT="/etc/letsencrypt/live/brokenrepo/fullchain.pem"
if [ -f "$CF_CREDS" ] && grep -q "dns_cloudflare_api_token = " "$CF_CREDS" 2>/dev/null \
   && ! grep -q "PASTE" "$CF_CREDS"; then
  sudo certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials "$CF_CREDS" \
    -d "*.$PREVIEW_SUFFIX" \
    --cert-name brokenrepo \
    --non-interactive --agree-tos -m "$CERT_EMAIL" --keep-until-expiring \
    && ok "wildcard certificate issued for *.$PREVIEW_SUFFIX" \
    || warn "DNS-01 issuance failed - check the Cloudflare token in $CF_CREDS"
else
  warn "No Cloudflare token in $CF_CREDS: LIVE PREVIEWS WILL NOT WORK until the wildcard is issued."
  echo "    Enable it with:"
  echo "      sudo tee $CF_CREDS <<< 'dns_cloudflare_api_token = <YOUR_CLOUDFLARE_TOKEN>'"
  echo "      sudo chmod 600 $CF_CREDS"
  echo "    then re-run this script."
fi
sudo rm -f /etc/nginx/sites-enabled/brokenrepo-api /etc/nginx/sites-enabled/default
if [ -f "$WILDCARD_CERT" ]; then
  sudo tee /etc/nginx/sites-available/brokenrepo-preview >/dev/null <<EOF
server {
    listen 443 ssl;
    server_name *.$PREVIEW_SUFFIX;

    ssl_certificate     $WILDCARD_CERT;
    ssl_certificate_key /etc/letsencrypt/live/brokenrepo/privkey.pem;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # Challenge app assets stream through here; buffering adds latency.
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF
  sudo ln -sf /etc/nginx/sites-available/brokenrepo-preview /etc/nginx/sites-enabled/
  ok "nginx serving the preview wildcard"
else
  sudo rm -f /etc/nginx/sites-enabled/brokenrepo-preview
  warn "preview vhost deferred until the wildcard cert exists"
fi
sudo nginx -t || die "nginx config invalid"
sudo systemctl enable --now nginx
sudo systemctl reload nginx

sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null <<'EOF'
#!/bin/sh
systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo systemctl enable --now certbot.timer
ok "certbot.timer enabled; renewed certs reload nginx automatically"

# ---------------------------------------------------------------- 11. cron
say "11/11 Self-healing cron (local health check every 5 minutes)"
CRON_LINE="*/5 * * * * curl -sf -m 10 http://localhost:$APP_PORT/health >/dev/null 2>&1 || (/usr/bin/pm2 restart $PM2_NAME) >> /home/ubuntu/health-check.log 2>&1"
( crontab -l 2>/dev/null | grep -v "health-check.log" ; echo "$CRON_LINE" ) | crontab -
ok "cron installed: pings the app directly (no DNS/cert dependency)"

cat <<DONE

====================================================================
 SETUP COMPLETE (or resumed) - remaining manual steps:

 1. Secrets:                        nano $SERVER_DIR/.env
                                    then:  pm2 restart $PM2_NAME
 2. GitHub deploy key:              add the SSH public key printed above
 3. Cloudflare token (previews):    sudo tee $CF_CREDS <<< 'dns_cloudflare_api_token = <TOKEN>'
                                    sudo chmod 600 $CF_CREDS ; re-run this script
 4. Cloudflare DNS (DNS only/grey): A  *.preview -> this VM's public IP
                                    (api.brokenrepo.tech needs NO record - the
                                    tunnel creates its own CNAME)
 5. Atlas Network Access:           allow this VM's public IP
 6. Cloudflare Tunnel for the API:  bash setup-tunnel.sh <TUNNEL_TOKEN>
                                    (token from Zero Trust -> Networks -> Tunnels)
 7. GitHub Secrets for auto-deploy: DEPLOY_VM_HOST  = VM public IP (SSH only)
                                    DEPLOY_SSH_KEY = private key contents

 Verify: curl http://localhost:3000/health      (on the VM)
         https://api.brokenrepo.tech/health     (after the tunnel step)
====================================================================
DONE
