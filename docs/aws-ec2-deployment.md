# BrokenRepo backend on AWS EC2 (Ubuntu 24.04 ARM64, t4g.small)

Target architecture:

```text
brokenrepo.tech (Vercel frontend)
        |
        v  /api/backend proxy route
api.brokenrepo.tech  (Cloudflare DNS, DNS-only A record)
        |
        v
EC2 t4g.small - Nginx :80/:443 -> Node/Express + PM2 on localhost:3000
        |
        +-- MongoDB Atlas   (unchanged)
        +-- Daytona API     (unchanged, sandboxes still run remotely)
        +-- *.preview.brokenrepo.tech -> same Nginx (live previews)
```

## Migration audit (verified against the repository)

| Item | Finding |
|------|---------|
| Entrypoint / start | `server/src/index.js` (`npm start`); monorepo - backend is `server/` |
| Node version | 22 (Node 20 is EOL; Render ran `NODE_VERSION=22`; engines allows >=20) |
| Env vars | All in `server/.env.example`; secrets: MONGODB_URI, DAYTONA_API_KEY, PREVIEW_PROXY_SECRET |
| Render-specific code | None. No RENDER_* variables or URLs in backend code; env file via dotenv (`server/.env`) |
| Hardcoded Render URLs | Only the two frontend fallbacks (API proxy route + admin page) - flipped at cutover |
| CORS | `CLIENT_ORIGINS` env (comma list). Auth is Bearer-token, no cookies, so no cross-subdomain cookie work |
| Streaming | SSE (runtime logs) + streaming reverse proxy. Nginx needs `proxy_buffering off` + long read timeouts (in setup.sh) |
| Port / bind | `PORT` env (default 4000); binds `0.0.0.0` - AWS setup uses 3000, localhost-only behind Nginx |
| ARM64 | All dependencies pure JS (express, mongodb, zod, @daytona/sdk; transitive @grpc/grpc-js is the pure-JS implementation). No native builds |
| Health check | `GET /health` -> `{status:"ok", ok:true, service, timestamp, environment}` |
| Filesystem | Read-only challenge fixtures under `server/challenges/`; no local persistence |
| Background jobs | 60s idle-session reaper + TTL indexes; unref'd, SIGTERM-safe |

## One-time setup (in this order)

1. **EC2 instance** (AWS console):
   - Region `ap-south-1` (Mumbai), Launch instance
   - OS: Ubuntu Server 24.04 LTS, 64-bit (Arm)
   - Type: `t4g.small` (750 free hrs/month through 2026 for new accounts)
   - Key pair: create + download `.pem` (keep it; never share it)
   - Storage: 12 GB gp3
   - Security group: SSH 22 = My IP; HTTP 80 = Anywhere; HTTPS 443 = Anywhere
   - After launch: **Elastic IPs -> Allocate -> Associate** with the instance
     (free while attached; avoids the public IP changing on stop/start)
2. **Budgets** (AWS Billing -> Budgets): alerts at $1 / $5 actual spend.
   Credits cover charges, but alerts catch accidents (e.g. a second T4g).
3. **Cloudflare DNS** (grey cloud / DNS only, both records):

   | Type | Name      | Content          | Proxy    | TTL  |
   |------|-----------|------------------|----------|------|
   | A    | `api`     | `<EC2 Elastic IP>` | DNS only | Auto |
   | A    | `*.preview` | `<EC2 Elastic IP>` | DNS only | Auto |

4. **Run the setup script**:
   ```bash
   chmod 400 brokenrepo.pem
   scp -i brokenrepo.pem ops/aws/setup.sh ubuntu@<EC2_IP>:~
   ssh -i brokenrepo.pem ubuntu@<EC2_IP>
   bash setup.sh
   ```
   Idempotent - re-run after fixing anything it warns about. Installs Node 22,
   PM2, Nginx, Certbot, clones this repo via a read-only GitHub deploy key
   (prints the public key to add), and registers the self-healing cron.
5. **Add the GitHub deploy key** it prints (Repo Settings -> Deploy keys).
6. **Environment**: either edit `nano ~/brokenrepo-backend/server/.env`
   (placeholders from `.env.example`), or scp the prepared file:
   ```bash
   scp -i brokenrepo.pem ~/Desktop/Debunkker/aws-ec2-env.txt ubuntu@<EC2_IP>:~/brokenrepo-backend/server/.env
   ssh -i brokenrepo.pem ubuntu@<EC2_IP> "pm2 restart brokenrepo-api"
   ```
7. **Atlas Network Access**: allow the Elastic IP `/32`.
8. **Wildcard certificate for previews** (Live Preview tab depends on it):
   Cloudflare -> My Profile -> API Tokens -> Create Token
   (`Zone / DNS / Edit`, zone = brokenrepo.tech), then on the VM:
   ```bash
   sudo tee /etc/letsencrypt/cloudflare.ini <<< 'dns_cloudflare_api_token = <TOKEN>'
   sudo chmod 600 /etc/letsencrypt/cloudflare.ini
   bash ~/setup.sh   # re-run: issues the DNS-01 cert + adds the preview vhost
   ```
   Let's Encrypt cannot issue `*.preview.brokenrepo.tech` over HTTP; DNS-01
   via the token is the supported path. Renewals are automatic.

## Verify (before cutover)

```bash
curl https://api.brokenrepo.tech/health
pm2 status && pm2 logs brokenrepo-api --lines 50
sudo nginx -t && sudo systemctl status nginx
```

Then exercise the flows through the API/browser: signup/login, challenge list,
sandbox creation + save + run tests, live preview navigation, runtime logs
streaming, network inspector, console capture, stopwatch persistence, admin
gate (404 for non-admins). Render stays untouched throughout.

## Cutover (after verification)

1. Vercel: `NEXT_PUBLIC_BROKENREPO_API_URL` = `https://api.brokenrepo.tech`, redeploy.
2. Repo: the two fallback URLs (`app/api/backend/[...path]/route.ts`,
   `app/admin/page.tsx`) flip to `https://api.brokenrepo.tech`.
3. Watch production 24-48h (health cron + logs), then retire Render.

Rollback (any time): set the Vercel var back to
`https://codebreak-api.onrender.com`, redeploy, `git revert` the fallback
commit. Render keeps running its last deployed code.

## Auto-deploy

`.github/workflows/deploy.yml` SSHes into the VM on every push to `main`,
pulls, runs `npm ci --omit=dev` in `server/`, and restarts PM2
(`brokenrepo-api`). It skips itself until both secrets exist:

| Secret           | Value                                            |
|------------------|--------------------------------------------------|
| `DEPLOY_VM_HOST` | the EC2 Elastic IP                               |
| `DEPLOY_SSH_KEY` | full contents of the `.pem` private key (not the path) |

## Day-2 operations

```bash
pm2 status                          # is the API up
pm2 logs brokenrepo-api --lines 100 # application logs
pm2 monit                           # live CPU/memory (t4g.small: 2 vCPU / 2 GiB)
sudo tail -f /var/log/nginx/error.log
curl -s localhost:3000/health       # bypass nginx
```

Update procedure: push to `main` (workflow does it), or by hand:
```bash
cd ~/brokenrepo-backend && git pull && cd server && npm ci --omit=dev && pm2 restart brokenrepo-api
```
Rollback procedure: `git log` for the last good commit, then
`git checkout <sha> && npm ci --omit=dev && pm2 restart brokenrepo-api`.

Self-healing cron (installed by setup.sh, exact line):
```cron
*/5 * * * * curl -sf -m 10 https://api.brokenrepo.tech/health >/dev/null 2>&1 || (/usr/bin/pm2 restart brokenrepo-api) >> /home/ubuntu/health-check.log 2>&1
```

Optional external uptime monitoring: point UptimeRobot (free) at
`https://api.brokenrepo.tech/health`.
