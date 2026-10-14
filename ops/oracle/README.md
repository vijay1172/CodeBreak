# BrokenRepo backend on Oracle Cloud

The backend (the `server/` directory of this monorepo) runs on an Oracle Cloud
Ubuntu 22.04 VM behind Nginx with PM2, serving:

- `https://api.brokenrepo.tech` - the Express API (frontend proxies to it)
- `https://{sessionId}.preview.brokenrepo.tech` - per-session live previews

## One-time setup (in this order)

1. **VCN Security List** (Oracle console, before anything else): add ingress
   rules for TCP 80 and TCP 443 from 0.0.0.0/0. The OS-level iptables rules
   are handled by `setup.sh`, but the VCN list is console-only.

2. **Cloudflare DNS** (the zone that actually serves brokenrepo.tech):

   | Type | Name      | Content            | Proxy     | TTL  |
   |------|-----------|--------------------|-----------|------|
   | A    | `api`     | `<VM public IP>`   | DNS only  | Auto |
   | A    | `*.preview` | `<VM public IP>` | DNS only  | Auto |

   Both records grey-cloud (DNS only). `*.preview` is required for live
   previews; without it only the main API works.

3. **Run the setup script** on the VM:
   ```bash
   scp -i <your-key> ops/oracle/setup.sh ubuntu@<VM_IP>:~
   ssh -i <your-key> ubuntu@<VM_IP>
   bash setup.sh
   ```
   It is idempotent; re-run it after fixing anything it warned about. It
   installs Node 22 (Node 20 is EOL since April 2026), PM2, Nginx, Certbot,
   the Oracle iptables rules for 80/443, clones this repo via a read-only
   GitHub deploy key (it prints the public key to add), and registers the
   self-healing cron.

4. **Add the GitHub deploy key**: the script prints an SSH public key; add it
   under Repo Settings -> Deploy keys (read-only is enough).

5. **Fill in the environment**: `nano /home/ubuntu/brokenrepo-backend/server/.env`
   (created from `server/.env.example`), then `pm2 restart brokenrepo-backend`.
   Secrets come from the Render env export: `MONGODB_URI`, `DAYTONA_API_KEY`,
   `PREVIEW_PROXY_SECRET`. Everything else already carries the production value.

6. **Atlas Network Access**: allow the VM's public IP (egress matches the
   public IP on standard Oracle VCNs).

7. **Wildcard certificate for previews** (required for the Live Preview tab):
   create a Cloudflare API token with `Zone -> DNS -> Edit` for the
   brokenrepo.tech zone, then on the VM:
   ```bash
   sudo tee /etc/letsencrypt/cloudflare.ini <<< 'dns_cloudflare_api_token = <TOKEN>'
   sudo chmod 600 /etc/letsencrypt/cloudflare.ini
   bash ~/setup.sh   # re-run: issues the DNS-01 cert and adds the preview vhost
   ```
   Let's Encrypt cannot issue `*.preview.brokenrepo.tech` over HTTP; DNS-01
   via the Cloudflare token is the supported path. Renewals are automatic
   (certbot.timer + a deploy hook that reloads nginx).

## Auto-deploy

`.github/workflows/deploy.yml` SSHes into the VM on every push to `main`,
pulls, runs `npm ci --omit=dev` in `server/`, and restarts PM2. It skips
itself until both repo secrets exist:

| Secret           | Value                                          |
|------------------|------------------------------------------------|
| `ORACLE_VM_IP`   | the VM's public IP                             |
| `ORACLE_SSH_KEY` | full contents of the private key file (not the path) |

## Self-healing cron

Installed by `setup.sh` (idempotent; the exact line):

```cron
*/5 * * * * curl -sf -m 10 https://api.brokenrepo.tech/health >/dev/null 2>&1 || (/usr/bin/pm2 restart brokenrepo-backend) >> /home/ubuntu/health-check.log 2>&1
```

To add it by hand:
```bash
( crontab -l 2>/dev/null | grep -v health-check.log ; echo '*/5 * * * * curl -sf -m 10 https://api.brokenrepo.tech/health >/dev/null 2>&1 || (/usr/bin/pm2 restart brokenrepo-backend) >> /home/ubuntu/health-check.log 2>&1' ) | crontab -
```

## Verify

`https://api.brokenrepo.tech/health` should return:
```json
{"status":"ok","ok":true,"service":"brokenrepo-orchestrator","timestamp":"...","environment":"production"}
```

Logs: `pm2 logs brokenrepo-backend` | nginx: `sudo tail -f /var/log/nginx/error.log`
