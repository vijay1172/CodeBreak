# BrokenRepo backend on AWS EC2 (Ubuntu 24.04 ARM64, t4g.small) via Cloudflare Tunnel

Target architecture (no Elastic IP, no A record for the API):

```text
brokenrepo.tech (Vercel frontend)
        |
        v  /api/backend proxy route
api.brokenrepo.tech  (Cloudflare edge TLS, CNAME managed by the tunnel)
        |
Cloudflare Tunnel (outbound-only from the VM, survives IP changes)
        |
cloudflared -> http://localhost:3000 (Node/Express + PM2)

{sessionId}.preview.brokenrepo.tech (live previews)
        |
A record *.preview -> VM public IP (DNS only / grey)
        |
Nginx :443 (Let's Encrypt wildcard, DNS-01 via Cloudflare token)
        |
http://localhost:3000
```

Why the split: Cloudflare's free Universal SSL certificate covers
`brokenrepo.tech` and `*.brokenrepo.tech` - ONE label deep. Preview hosts are
two labels deep (`abc.preview.brokenrepo.tech`), so routing them through the
tunnel would require Advanced Certificate Manager ($10/month). Keeping
previews on a DNS-only A record with a free Let's Encrypt wildcard (issued by
DNS-01, which never depends on the IP) costs nothing. The Express preview
proxy routes on the Host header, so both paths land on the same process.

Cost honesty: AWS bills ALL public IPv4 addresses (~$0.005/hr) - the
auto-assigned public IP costs the same as an Elastic IP would. The tunnel
removes the *dependence* on a stable IP (and every A record except
`*.preview`), not that charge; SSH and the preview path still need the public
interface. Credits absorb roughly $3.6/month.

## Migration audit (verified against the repository)

| Item | Finding |
|------|---------|
| Entrypoint / start | `server/src/index.js` (`npm start`); monorepo - backend is `server/` |
| Node version | 22 (Node 20 is EOL; Render ran `NODE_VERSION=22`) |
| Env vars | All in `server/.env.example`; secrets: MONGODB_URI, DAYTONA_API_KEY, PREVIEW_PROXY_SECRET |
| Render-specific code | None. No RENDER_* variables or URLs in backend code |
| Hardcoded Render URLs | Only the two frontend fallbacks - flipped at cutover |
| CORS | `CLIENT_ORIGINS` env. Auth is Bearer-token; no cookies, so no cross-subdomain cookie work |
| Streaming | SSE (runtime logs) + streaming preview proxy. Cloudflare supports both through tunnels; nginx keeps `proxy_buffering off` + long timeouts for the preview path |
| Port / bind | `PORT` env (3000 here); binds `0.0.0.0`, reached on loopback by cloudflared and nginx |
| ARM64 | All dependencies pure JS (express, mongodb, zod, @daytona/sdk; transitive @grpc/grpc-js is the pure-JS implementation). No native builds |
| Health check | `GET /health` -> `{status:"ok", ok:true, service, timestamp, environment}` |
| Filesystem | Read-only challenge fixtures under `server/challenges/` |
| Background jobs | 60s idle-session reaper + Mongo TTL indexes; unref'd, SIGTERM-safe |

## One-time setup, in order

1. **EC2 instance** (already done): ap-south-1, Ubuntu 24.04 ARM64,
   `t4g.small`, 12 GB gp3, key pair saved, auto-assign public IP enabled.
   Security group: SSH 22 = My IP; HTTP 80 + HTTPS 443 = Anywhere
   (80/443 only for the preview path + issuance; tightened in step 9).
2. **SSH in** using the temporary public IP:
   `ssh -i brokenrepo.pem ubuntu@<EC2_PUBLIC_IP>`
3. **Deploy the backend**:
   ```bash
   scp -i brokenrepo.pem ops/aws/setup.sh ubuntu@<EC2_IP>:~
   scp -i brokenrepo.pem ~/Desktop/Debunkker/aws-ec2-env.txt ubuntu@<EC2_IP>:~/env.txt
   ssh -i brokenrepo.pem ubuntu@<EC2_IP>
   bash setup.sh          # prints a GitHub deploy key to add
   cp ~/env.txt ~/brokenrepo-backend/server/.env && rm ~/env.txt
   pm2 restart brokenrepo-api
   ```
4. **Verify locally**:
   ```bash
   curl http://localhost:3000/health     # {"status":"ok",...}
   pm2 logs brokenrepo-api --lines 30
   ```
5. **Cloudflare token for the preview wildcard** (also used later for IP
   updates): My Profile -> API Tokens -> Create Token
   (`Zone / DNS / Edit`, zone = brokenrepo.tech), then on the VM:
   ```bash
   sudo tee /etc/letsencrypt/cloudflare.ini <<< 'dns_cloudflare_api_token = <TOKEN>'
   sudo chmod 600 /etc/letsencrypt/cloudflare.ini
   bash ~/setup.sh        # re-run: issues *.preview cert + adds the nginx vhost
   ```
6. **Preview DNS**: one record, Cloudflare dashboard, **DNS only (grey)**:
   `A  *.preview  ->  <current EC2 public IP>`.
   There must be NO A record for `api` - the tunnel creates its own CNAME.
7. **Cloudflare Tunnel for the API**:
   - Zero Trust dashboard -> Networks -> Tunnels -> Create tunnel ->
     name `brokenrepo-api` -> copy the token.
   - On the VM: `bash setup-tunnel.sh <TUNNEL_TOKEN>`
   - Back in the tunnel's Public Hostname tab, add:
     hostname `api.brokenrepo.tech`, service `HTTP://localhost:3000`.
   - `cloudflared` runs as a systemd service and auto-starts on reboot.
8. **Verify externally**:
   ```bash
   curl https://api.brokenrepo.tech/health
   ```
   Then exercise the real flows (see Verification below).
9. **Tighten the security group** (only after the tunnel + preview both
   verify): remove the HTTP 80 rule. HTTPS 443 must STAY - preview traffic
   terminates directly on nginx. SSH 22 stays restricted to your IP.

## Atlas

Network Access: allow the current EC2 public IP `/32`. If the instance is
ever stopped/started (IP changes), also run
`bash ~/update-preview-ip.sh` and update the Atlas entry.

## Verification (before cutover)

Through the API/browser: signup/login, challenge list, sandbox creation,
editor save, run tests (passing + failing), live preview load + route
navigation, runtime logs streaming (SSE), network inspector, browser console
capture, stopwatch persistence, admin gate (404 for non-admins).
Specifically confirm SSE stays connected through the tunnel during idle
periods: Cloudflare's edge drops idle proxied connections (~100s); the
browser's EventSource reconnects automatically, but if reconnect flashes
bother users, a 30s keepalive comment on the SSE channel is the follow-up.

## Cutover (after verification)

1. Vercel: `NEXT_PUBLIC_BROKENREPO_API_URL` = `https://api.brokenrepo.tech`,
   redeploy.
2. Repo: flip the two fallback URLs (`app/api/backend/[...path]/route.ts`,
   `app/admin/page.tsx`) to `https://api.brokenrepo.tech`.
3. Watch production 24-48h, then retire Render.

Rollback (any time): set the Vercel var back to
`https://codebreak-api.onrender.com`, redeploy, revert the fallback commit.

## Auto-deploy

`.github/workflows/deploy.yml` SSHes in on every push to `main`, pulls,
`npm ci --omit=dev`, restarts PM2 (`brokenrepo-api`). Skips until:

| Secret           | Value                                            |
|------------------|--------------------------------------------------|
| `DEPLOY_VM_HOST` | the EC2 public IP (SSH only; traffic does not depend on it) |
| `DEPLOY_SSH_KEY` | full contents of the `.pem` private key (not the path) |

## Day-2 operations

```bash
pm2 status && pm2 logs brokenrepo-api --lines 100
systemctl status cloudflared                  # the tunnel
sudo tail -f /var/log/nginx/error.log         # preview path only
curl -s localhost:3000/health                 # bypass tunnel + nginx
bash ~/update-preview-ip.sh                   # after a stop/start changed the IP
```

Update procedure: push to `main` (the workflow does it), or by hand:
`cd ~/brokenrepo-backend && git pull && cd server && npm ci --omit=dev && pm2 restart brokenrepo-api`.
Rollback: `git checkout <last-good-sha> && npm ci --omit=dev && pm2 restart brokenrepo-api`.

Self-healing cron (installed by setup.sh; local, so DNS/certs cannot break it):
```cron
*/5 * * * * curl -sf -m 10 http://localhost:3000/health >/dev/null 2>&1 || (/usr/bin/pm2 restart brokenrepo-api) >> /home/ubuntu/health-check.log 2>&1
```
