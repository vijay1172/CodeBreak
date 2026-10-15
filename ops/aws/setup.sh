#!/usr/bin/env bash
# BrokenRepo backend - AWS EC2 Ubuntu 24.04 (ARM64) one-time setup.
#
# Run as the default "ubuntu" user:  bash setup.sh
# Safe to re-run: every step checks whether it already happened.
#
# Before this script works, the instance must exist with:
#   - Security group: TCP 22 (your IP), TCP 80 + 443 (0.0.0.0/0)
#   - An Elastic IP attached (or accept that a stop/start changes the IP)
#   - Cloudflare DNS: A  api -> VM IP   (DNS only / grey cloud)
# The script handles everything else, including the wildcard certificate
# path for *.preview.brokenrepo.tech (live previews), which Let's Encrypt
# only issues via DNS-01 - see the final output for that optional step.
#
# Why Node 22 (not 20): Node 20 reached end-of-life in April 2026 and the
# service ran Node 22 on Render. Why port 3000: convention; nginx proxies
# localhost only, so the port is never exposed.

set -uo pipefail

APP_DIR="$HOME/brokenrepo-backend"
SERVER_DIR="$APP_DIR/server"
REPO_SSH_URL="git@github.com:vijay1172/CodeBreak.git"
DOMAIN="api.brokenrepo.tech"
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
say "1/12 System update"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y git curl
ok "system packages updated"

# ---------------------------------------------------------------- 2. node 22
say "2/12 Node.js 22.x via NodeSource"
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
say "3/12 PM2 (process manager)"
command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2 || die "pm2 install failed"
ok "pm2 $(pm2 -v) ready"

# ---------------------------------------------------------------- 4. nginx
say "4/12 Nginx"
command -v nginx >/dev/null 2>&1 || sudo apt-get install -y nginx || die "nginx install failed"
ok "nginx ready"

# ---------------------------------------------------------------- 5. certbot
say "5/12 Certbot (+ Cloudflare DNS plugin for the wildcard cert)"
sudo apt-get install -y certbot python3-certbot-nginx python3-certbot-dns-cloudflare \
  || die "certbot installation failed"
ok "certbot ready"

# ---------------------------------------------------------------- 6. repo + key
say "6/12 Clone the repository (monorepo; backend lives in server/)"
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
say "7/12 Install backend dependencies (npm ci; no native builds expected on ARM64)"
cd "$SERVER_DIR" || die "missing $SERVER_DIR"
if [ -f package-lock.json ]; then
  npm ci --omit=dev || die "npm ci failed"
else
  npm install --omit=dev || die "npm install failed"
fi
ok "dependencies installed"

# ---------------------------------------------------------------- 8. env file
say "8/12 Environment file"
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
say "9/12 PM2 app (ecosystem.config.cjs) + boot persistence"
cd "$SERVER_DIR" || die "missing $SERVER_DIR"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  ok "pm2 process '$PM2_NAME' already exists"
else
  pm2 start ecosystem.config.cjs --env production || die "pm2 start failed"
  ok "pm2 process '$PM2_NAME' started (logs: pm2 logs $PM2_NAME)"
fi
# Installs the pm2-ubuntu systemd unit for the ubuntu user specifically.
sudo env PATH="$PATH:/usr/bin" "$(command -v pm2)" startup systemd -u ubuntu --hp /home/ubuntu >/dev/null
pm2 save
ok "pm2 survives reboots via systemd (user: ubuntu)"

# ---------------------------------------------------------------- 10. nginx
say "10/12 Nginx reverse proxy for $DOMAIN"
WILDCARD_CERT="/etc/letsencrypt/live/brokenrepo/fullchain.pem"
write_api_vhost() {
  sudo tee /etc/nginx/sites-available/brokenrepo-api >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Certbot HTTP-01 lands here before TLS exists; afterwards we redirect.
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

$( [ "${1:-}" = "with-tls" ] && echo "server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # SSE (runtime logs) and the streaming preview proxy must not buffer.
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}" )
EOF
}
if sudo certbot certificates 2>/dev/null | grep -q "Domains:.*$DOMAIN"; then
  write_api_vhost with-tls
else
  write_api_vhost
fi
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
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Challenge app assets stream through here; buffering adds latency.
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF
  sudo ln -sf /etc/nginx/sites-available/brokenrepo-preview /etc/nginx/sites-enabled/
else
  warn "Wildcard cert not issued yet - the preview vhost is added when it exists (re-run after step 11b)."
  sudo rm -f /etc/nginx/sites-enabled/brokenrepo-preview
fi
sudo ln -sf /etc/nginx/sites-available/brokenrepo-api /etc/nginx/sites-enabled/
sudo nginx -t || die "nginx config invalid"
sudo systemctl enable --now nginx
sudo systemctl reload nginx
ok "nginx configured"

# ---------------------------------------------------------------- 11. certs
say "11/12 TLS certificates"
VM_IP=$(curl -sf -m 10 https://ifconfig.me || curl -sf -m 10 https://api.ipify.org)
DOMAIN_IP=$(dig +short "$DOMAIN" @1.1.1.1 | tail -1)
if [ -f "$CF_CREDS" ] && grep -q "dns_cloudflare_api_token = " "$CF_CREDS" 2>/dev/null \
   && ! grep -q "PASTE" "$CF_CREDS"; then
  say "11a DNS-01 wildcard certificate (api + *.$PREVIEW_SUFFIX)"
  sudo certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials "$CF_CREDS" \
    -d "$DOMAIN" -d "*.$PREVIEW_SUFFIX" \
    --cert-name brokenrepo \
    --non-interactive --agree-tos -m "$CERT_EMAIL" --keep-until-expiring \
    && ok "wildcard certificate issued (covers $DOMAIN and *.$PREVIEW_SUFFIX)" \
    || warn "DNS-01 issuance failed - check the Cloudflare token in $CF_CREDS"
elif [ "${DOMAIN_IP:-}" = "${VM_IP:-x}" ]; then
  say "11b HTTP-01 certificate for $DOMAIN only"
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL" \
    && ok "certificate issued for $DOMAIN" \
    || warn "HTTP-01 issuance failed - check that $DOMAIN resolves to $VM_IP"
  warn "No Cloudflare token in $CF_CREDS: LIVE PREVIEWS (*.$PREVIEW_SUFFIX) WILL NOT WORK until the wildcard is issued."
  echo "    Enable it with:"
  echo "      sudo tee $CF_CREDS <<< 'dns_cloudflare_api_token = <YOUR_CLOUDFLARE_TOKEN>'"
  echo "      sudo chmod 600 $CF_CREDS"
  echo "    then re-run this script (issues/renews as cert name 'brokenrepo')."
else
  warn "DNS for $DOMAIN does not point to this VM yet ($DOMAIN_IP vs $VM_IP) - certificate step skipped."
  warn "Add the A record in Cloudflare (DNS only), then re-run this script."
fi
if sudo certbot certificates 2>/dev/null | grep -q "Domains:.*$DOMAIN"; then
  write_api_vhost with-tls
  if [ -f "$WILDCARD_CERT" ]; then
    sudo ln -sf /etc/nginx/sites-available/brokenrepo-preview /etc/nginx/sites-enabled/
  fi
  sudo nginx -t && sudo systemctl reload nginx
  ok "nginx serving TLS for $DOMAIN"
fi

# ---------------------------------------------------------------- 12. cron
say "12/12 Self-healing cron (health check every 5 minutes)"
CRON_LINE="*/5 * * * * curl -sf -m 10 https://$DOMAIN/health >/dev/null 2>&1 || (/usr/bin/pm2 restart $PM2_NAME) >> /home/ubuntu/health-check.log 2>&1"
( crontab -l 2>/dev/null | grep -v "health-check.log" ; echo "$CRON_LINE" ) | crontab -
ok "cron installed: pings /health every 5 min, restarts pm2 on failure"

cat <<DONE

====================================================================
 SETUP COMPLETE (or resumed) - remaining manual steps:

 1. Fill in the secrets:            nano $SERVER_DIR/.env
                                    then:  pm2 restart $PM2_NAME
 2. Security group (AWS console):   inbound TCP 22 (your IP), 80 + 443 (0.0.0.0/0)
 3. Cloudflare DNS (DNS only/grey): A  api        -> $VM_IP
                                    A  *.preview  -> $VM_IP   (for live previews)
 4. Atlas Network Access:           allow this VM's IP ($VM_IP)
 5. Wildcard cert (previews):       put a Cloudflare API token in $CF_CREDS
                                    and re-run this script
 6. GitHub Secrets for auto-deploy: DEPLOY_VM_HOST  = $VM_IP
                                    DEPLOY_SSH_KEY = private key contents
 7. GitHub deploy key:              add the SSH public key printed above

 Verify: https://$DOMAIN/health  ->  {"status":"ok",...}
====================================================================
DONE
