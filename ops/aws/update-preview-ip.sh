#!/usr/bin/env bash
# Repoint the *.preview.brokenrepo.tech A record at this VM's current public
# IP. Run this only after a stop/start changed the EC2 public IP (the IP is
# otherwise stable while the instance runs).
#
# Uses the SAME Cloudflare API token certbot uses (in /etc/letsencrypt/
# cloudflare.ini) - a token with Zone / DNS / Edit for brokenrepo.tech.
#
# Reminder: if the public IP changed, also update MongoDB Atlas
# Network Access with the new IP.

set -uo pipefail
CF_CREDS="/etc/letsencrypt/cloudflare.ini"
ZONE="brokenrepo.tech"
RECORD="*.preview.brokenrepo.tech"

say()  { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
die()  { printf '\033[1;31mFATAL:\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$CF_CREDS" ] || die "missing $CF_CREDS (create it per ops/aws/setup.sh step 10)"
TOKEN=$(grep -E '^dns_cloudflare_api_token' "$CF_CREDS" | head -1 | sed -E 's/^[^=]+=[[:space:]]*//; s/^"//; s/"[[:space:]]*$//')
[ -n "$TOKEN" ] || die "no token found in $CF_CREDS"
[ "$(id -u)" -eq 0 ] || SUDO=sudo

IP=$($SUDO curl -sf -m 10 https://ifconfig.me || $SUDO curl -sf -m 10 https://api.ipify.org)
[ -n "$IP" ] || die "could not determine this VM's public IP"

say "This VM public IP: $IP"
ZONE_ID=$($SUDO curl -sf -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE" \
  -H "Authorization: Bearer $TOKEN" | grep -oE '"id":"[0-9a-f]{32}"' | head -1 | cut -d'"' -f4)
[ -n "$ZONE_ID" ] || die "could not look up zone $ZONE - token may lack Zone/Read"

RECORD_ID=$($SUDO curl -sf -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=$RECORD" \
  -H "Authorization: Bearer $TOKEN" | grep -oE '"id":"[0-9a-f]{32}"' | head -1 | cut -d'"' -f4)

if [ -n "$RECORD_ID" ]; then
  $SUDO curl -sf -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$RECORD\",\"content\":\"$IP\",\"ttl\":1,\"proxied\":false}" >/dev/null \
    || die "record update failed"
  echo "updated $RECORD -> $IP (DNS only)"
else
  $SUDO curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$RECORD\",\"content\":\"$IP\",\"ttl\":1,\"proxied\":false}" >/dev/null \
    || die "record creation failed"
  echo "created $RECORD -> $IP (DNS only)"
fi
echo "Also update Atlas Network Access with $IP if the IP changed."
