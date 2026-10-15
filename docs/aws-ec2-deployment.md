# BrokenRepo backend on AWS EC2 - final architecture (all traffic via Cloudflare Tunnel)

```text
brokenrepo.tech (Vercel frontend)
        |
        v  /api/backend proxy route
api.brokenrepo.tech ──────────┐
                              ├─ Cloudflare edge (Universal SSL)
{sessionId}.brokenrepo.tech ──┤        |
 (live previews, wildcard)    |        v
                              └─ Cloudflare Tunnel -> cloudflared -> http://localhost:3000
                                                       (Node/Express + PM2)
                                                       |-> MongoDB Atlas
                                                       |-> Daytona sandboxes
```

Why this shape:
- TLS terminates at Cloudflare's edge. The free Universal SSL cert covers
  `brokenrepo.tech` and `*.brokenrepo.tech`; preview hosts are one label deep
  (`{sessionId}.brokenrepo.tech`), so no wildcard cert beyond that is needed
  and nothing is issued or renewed on the VM.
- The tunnel is outbound-only: the EC2 security group allows inbound SSH
  (your IP) and nothing else. No Elastic IP is required and nothing depends
  on the instance's public IP for application traffic.
- Express routes by Host header: `sessionIdFromHost` accepts 8-64 character
  `[a-z0-9-]` labels, so `api`/`www` (3 chars) can never be mistaken for
  sessions; non-session labels under the suffix fall through to normal API
  routing.

## Fresh VM setup

1. EC2: ap-south-1, Ubuntu 24.04 ARM64, `t4g.small`, 12 GB gp3, key pair,
   auto-assign public IP. Security group: SSH 22 from your IP only
   (80/443 are never needed).
2. Budgets (AWS Billing -> Budgets): alerts at $1 / $5 actual spend.
3. `scp -i brokenrepo.pem ops/aws/setup.sh ubuntu@<EC2_IP>:~` then run it
   (`bash setup.sh`). It installs Node 22, PM2, clones the repo via a
   read-only GitHub deploy key (prints the public key), and registers the
   local self-healing cron.
4. Add the GitHub deploy key it prints.
5. Fill `server/.env` (placeholders in `server/.env.example`; the real
   values are the historical Render export: MONGODB_URI, DAYTONA_API_KEY,
   PREVIEW_PROXY_SECRET, plus `PREVIEW_PROXY_DOMAIN_SUFFIX=brokenrepo.tech`),
   then `pm2 restart brokenrepo-api`.
6. Cloudflare Zero Trust -> Networks -> Tunnels -> Create tunnel
   (`brokenrepo-api`), copy the token, run `bash setup-tunnel.sh <TOKEN>`,
   then add BOTH public hostnames in the dashboard:
   `api.brokenrepo.tech -> HTTP://localhost:3000` and
   `*.brokenrepo.tech -> HTTP://localhost:3000`.
7. Atlas Network Access: allow the VM's public IP `/32`.

## Verify

```bash
curl https://api.brokenrepo.tech/health          # {"status":"ok",...}
curl https://random-label.brokenrepo.tech/health # falls through to the API
```
Then the full flow through https://brokenrepo.tech: login, challenge list,
session creation, live preview on `{sessionId}.brokenrepo.tech`, save,
Run Tests, runtime logs (SSE), network inspector, console capture.

Note: `brokenrepo.tech/api/backend/health` returns 503 by design - the
Vercel proxy route fetches `/api/health` on the backend, which does not
exist. Probe `/api/backend/challenges` instead.

## Auto-deploy

`.github/workflows/deploy.yml` SSHes in on every push to `main`, pulls,
`npm ci --omit=dev` in `server/`, restarts PM2. Requires repo secrets
`DEPLOY_VM_HOST` (public IP, SSH only) and `DEPLOY_SSH_KEY` (private key
contents).

## Day-2 operations

```bash
pm2 status && pm2 logs brokenrepo-api --lines 100
systemctl status cloudflared                  # the tunnel
curl -s localhost:3000/health                 # bypass the tunnel
```
Update: push to `main` (workflow handles it), or by hand
`cd ~/brokenrepo-backend && git pull && cd server && npm ci --omit=dev && pm2 restart brokenrepo-api`.
Rollback: `git checkout <last-good-sha> && npm ci --omit=dev && pm2 restart brokenrepo-api`.

Self-healing cron (installed by setup.sh):
```cron
*/5 * * * * curl -sf -m 10 http://localhost:3000/health >/dev/null 2>&1 || (/usr/bin/pm2 restart brokenrepo-api) >> /home/ubuntu/health-check.log 2>&1
```
External uptime monitoring: point UptimeRobot (free) at
`https://api.brokenrepo.tech/health`.

## Rollback notes (retired paths, kept here for the record)

The migration passed through two interim designs whose pieces were retired
on 2026-10-16 after 24h of stable production:
- Render backend (`codebreak-api.onrender.com`): service left suspended in
  the Render dashboard; `render.yaml` in the repo root is the historical
  blueprint. A rollback would mean reactivating Render and repointing the
  Vercel env var - viable only when Render's free hours reset.
- Direct-IP preview routing (`*.preview.brokenrepo.tech` DNS-only A record,
  nginx 443 with a Let's Encrypt DNS-01 wildcard, certbot,
  `update-preview-ip.sh`): removed from the repo and the VM; nginx was
  stopped/disabled, not uninstalled. To resurrect: reinstall the wildcard
  cert path, restore the `*.preview` A record, and set
  `PREVIEW_PROXY_DOMAIN_SUFFIX=preview.brokenrepo.tech` on the VM plus
  revert the frontend `PREVIEW_HOST_SUFFIX` constant.
