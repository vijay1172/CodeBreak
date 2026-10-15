#!/usr/bin/env bash
# Install cloudflared and register this VM with a Cloudflare Tunnel.
#
# Usage:  bash setup-tunnel.sh <TUNNEL_TOKEN>
#
# Get the token: Cloudflare Zero Trust dashboard -> Networks -> Tunnels ->
# Create tunnel -> "brokenrepo-api" -> choose the systemd install option and
# copy the token from the displayed command.
#
# After this script, add the public hostname mapping IN THE DASHBOARD:
#   Networks -> Tunnels -> brokenrepo-api -> Public Hostname -> Add:
#     hostname:  api.brokenrepo.tech
#     service:   HTTP://localhost:3000
# Cloudflare creates/updates the api CNAME automatically - do NOT create an
# A record for api yourself.
#
# The tunnel service auto-starts on boot (systemd). TLS for
# api.brokenrepo.tech terminates at Cloudflare's edge; cloudflared reaches
# the app over loopback, so no local certificate is needed for the API.

set -uo pipefail
TUNNEL_TOKEN="${1:-}"
[ -n "$TUNNEL_TOKEN" ] || { echo "Usage: bash setup-tunnel.sh <TUNNEL_TOKEN>"; exit 1; }

say()  { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
ok()   { printf '\033[1;32mOK:\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mFATAL:\033[0m %s\n' "$*" >&2; exit 1; }

say "1/3 Install cloudflared (ARM64)"
if command -v cloudflared >/dev/null 2>&1; then
  ok "cloudflared $(cloudflared --version | awk '{print $3}') already installed"
else
  curl -fsSL -o /tmp/cloudflared.deb \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb \
    || die "cloudflared download failed"
  sudo dpkg -i /tmp/cloudflared.deb || die "cloudflared install failed"
  rm -f /tmp/cloudflared.deb
  ok "cloudflared installed"
fi

say "2/3 Register the tunnel as a system service"
if systemctl is-active --quiet cloudflared; then
  ok "cloudflared service already running (to re-register: sudo cloudflared service uninstall, then re-run)"
else
  sudo cloudflared service install "$TUNNEL_TOKEN" || die "service install failed - check the token"
  ok "cloudflared service installed and started"
fi
sleep 3
systemctl is-active --quiet cloudflared && ok "service active" || die "cloudflared service not running: systemctl status cloudflared"

say "3/3 Verify"
echo "Dashboard step still needed (one time):"
echo "  Zero Trust -> Networks -> Tunnels -> brokenrepo-api -> Public Hostname"
echo "    hostname: api.brokenrepo.tech   service: HTTP://localhost:3000"
if curl -sf -m 10 https://api.brokenrepo.tech/health >/dev/null 2>&1; then
  ok "https://api.brokenrepo.tech/health is answering"
else
  echo "api.brokenrepo.tech not answering yet - add the Public Hostname mapping above, then retry:"
  echo "  curl https://api.brokenrepo.tech/health"
fi
