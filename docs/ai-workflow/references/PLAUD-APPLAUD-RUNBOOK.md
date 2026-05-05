# PLAUD Auto-Ingestion Runbook

**Phase 5 Slice 5.8** — operational setup for Sean's home machine + Cloudflare Tunnel + Render env vars + verification.

> Plan reference: `docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md`
>
> Confidence tag: every step below is `[VERIFIED]` against the v1.2 plan and the shipped slices 5.1–5.5. Steps that depend on external tools (Plaud, Cloudflare, Applaud) are `[VERIFIED]` against the upstream docs as of 2026-05-04 and may require adjustment if those vendors change behavior.

---

## What this runbook does

Auto-ingest your Plaud recordings into the SwanStudios merge queue. When you come home with your Plaud, the recordings:

1. Sync from your Plaud device → Plaud cloud (handled by Plaud's mobile app, normal Plaud workflow)
2. Get pulled by Applaud running locally on your home machine (every 10 min poll)
3. Get POSTed to a webhook on `sswanstudios.com` by Applaud
4. Land in your `/dashboard/plaud-merge` queue automatically — no manual upload step

You open the dashboard, see the new clip(s), pick which ones to merge, and proceed exactly like manual upload from there.

---

## Prerequisites (one-time, ~20 min total)

You need:

- A Plaud account you're logged into in Chrome (or Brave/Edge — any Chromium browser)
- Node.js ≥ 20 + pnpm ≥ 9 OR Docker on your home machine
- Cloudflare account (free tier is fine — you have one already, used for the SwanStudios DNS)
- 5 minutes to generate a webhook secret + AES-equivalent key
- 1 hour-ish during the first staging smoke (Slice 5.9) to verify end-to-end

---

## Step 1 — Install Applaud on your home machine

Applaud is the open-source bridge between Plaud's cloud and SwanStudios. It runs locally and reads your Plaud session JWT from your Chrome browser's LocalStorage.

```bash
git clone https://github.com/rsteckler/applaud
cd applaud
git checkout v0.5.10   # PIN to the version we tested against; do NOT use latest
pnpm install
pnpm build
```

**Why we pin v0.5.10:** Applaud's auth uses a reverse-engineered Plaud session JWT. If a future Applaud release ships a breaking change in payload shape or signature canonicalization, our SwanStudios receiver could start rejecting valid webhooks. Pin tested versions; upgrade after testing the new version against the staging webhook.

If you prefer Docker:

```bash
git clone https://github.com/rsteckler/applaud
cd applaud
git checkout v0.5.10
docker compose up -d
```

---

## Step 2 — Generate the webhook secret

Open a terminal (not the same one you'll paste output anywhere):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

You'll get a 128-character hex string. **Save this to your password manager immediately** under an entry named something like `SwanStudios — PLAUD Applaud Webhook Secret V1 — 2026-05-04`.

This secret is the proof-of-identity between Applaud (running on your machine) and the SwanStudios webhook receiver (running on Render). Anyone with this secret can forge webhooks to your SwanStudios account.

**DO NOT (per CLAUDE.md Rule 44 + Rule 59):**
- Paste it into chat with any AI
- Save it to a `.txt` / `.md` file in any repo
- Email it to yourself
- Screenshot the terminal that contains it

---

## Step 3 — Configure Applaud's `.env`

In the Applaud directory:

```ini
# Applaud's local server
APPLAUD_PORT=3030
APPLAUD_DATA_DIR=~/applaud-data

# Webhook target (SwanStudios)
APPLAUD_WEBHOOK_URL=https://sswanstudios.com/api/plaud/webhook/applaud
APPLAUD_WEBHOOK_SECRET=<paste the 128-char secret from Step 2>

# Polling
APPLAUD_POLL_INTERVAL_MIN=10
```

**Important — fresh nonce on retry (Codex §4.2.5):** verify Applaud regenerates its `(timestamp, nonce, signature)` triplet on retry attempts. If your Applaud version reuses the same nonce on retry, the SwanStudios receiver will return `200 already_processed` for retries even when the previous attempt failed mid-pipeline — recordings could be silently dropped.

To verify, watch Applaud's logs during a forced retry. If retries reuse the nonce, set `APPLAUD_RETRY_REGENERATE_NONCE=true` in the `.env` (this option is verified to exist in v0.5.10's source).

---

## Step 4 — Set up Cloudflare Tunnel

Applaud runs on your home machine but its media URLs (where audio bytes live) need to be reachable from Render's network when SwanStudios fetches them. Cloudflare Tunnel exposes your local Applaud server publicly via a stable HTTPS URL — no port forwarding, no DDNS, free tier.

Install `cloudflared`:

```bash
# macOS
brew install cloudflared
# Linux (Debian/Ubuntu)
sudo apt install cloudflared
# Windows
choco install cloudflared
```

Authenticate + create the tunnel:

```bash
cloudflared tunnel login                                    # opens browser, picks your CF account
cloudflared tunnel create applaud-sean-home
cloudflared tunnel route dns applaud-sean-home applaud-tunnel.sswanstudios.com
```

(Use any subdomain you control on Cloudflare — `applaud-tunnel.sswanstudios.com` is suggested but not required.)

Configure `~/.cloudflared/config.yml`:

```yaml
tunnel: applaud-sean-home
credentials-file: /home/sean/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: applaud-tunnel.sswanstudios.com
    service: http://localhost:3030
  - service: http_status:404
```

Start the tunnel:

```bash
cloudflared tunnel run applaud-sean-home
```

To make it run automatically on boot, install as a service:

```bash
# Linux
sudo cloudflared service install
# macOS
sudo cloudflared --config ~/.cloudflared/config.yml service install
```

Verify the tunnel is reachable from outside your network:

```bash
curl -I https://applaud-tunnel.sswanstudios.com
# Should return a 200/404 from Applaud's HTTP server, NOT a Cloudflare 503/521
```

---

## Step 5 — Set Render environment variables

Render dashboard → `-SS-PT-New` service → **Environment** tab → **Add Environment Variable** for each:

| Key | Value | Sensitive? |
|---|---|---|
| `PLAUD_APPLAUD_WEBHOOK_ENABLED` | `true` | No |
| `PLAUD_APPLAUD_WEBHOOK_SECRET_V1` | *(paste the 128-char hex from Step 2)* | **YES — mark Secret/Encrypted** |
| `PLAUD_APPLAUD_WEBHOOK_KEY_ID` | `V1` | No |
| `PLAUD_APPLAUD_USER_ID` | *(your trainer/admin user id — query "SELECT id FROM \"Users\" WHERE email = 'ogpswan@yahoo.com'" if unsure)* | No |
| `PLAUD_APPLAUD_MEDIA_BASE_URL` | `https://applaud-tunnel.sswanstudios.com` (must match your Cloudflare Tunnel hostname EXACTLY) | No |

Optional overrides (defaults are sensible):

| Key | Default | Purpose |
|---|---|---|
| `PLAUD_APPLAUD_MAX_CONCURRENCY` | `5` | Concurrent webhook handler cap (Codex CR-6 DoS mitigation) |
| `PLAUD_APPLAUD_RATE_LIMIT_PER_MIN` | `60` | Per-process rate limit |

After saving, Render auto-redeploys. The redeploy log should now show:

```
[plaudApplaudWebhook] route mounting for user_id=<N>
```

If you see any of these instead, the route is NOT mounted (and the webhook URL will return 404):

```
[plaudApplaudWebhook] PLAUD_APPLAUD_WEBHOOK_ENABLED != "true" — route not mounted
[plaudApplaudWebhook] missing env: <key> — route NOT mounted
[plaudApplaudWebhook] PLAUD_APPLAUD_MEDIA_BASE_URL must be HTTPS — route NOT mounted
[plaudApplaudWebhook] PLAUD_APPLAUD_USER_ID invalid (got "...") — route NOT mounted
[plaudApplaudWebhook] webhook secret resolution failed for KEY_ID=... — route NOT mounted
```

Fix the flagged config and Render auto-redeploys (or click Manual Deploy).

---

## Step 6 — Stay logged into Plaud's web app

Open https://web.plaud.ai/ in **the same browser profile Applaud reads its session JWT from** (Chrome / Brave / Edge / Arc / Vivaldi by default). Log in. Keep the tab open or just stay logged in — Applaud reads your JWT from LocalStorage on every poll cycle.

If your Plaud session expires (the cookie/JWT TTLs out), Applaud will silently stop receiving new clips. The fix is to re-log into the web app; Applaud picks up the new JWT on next poll.

**Operational risk:** there's no monitoring yet that warns you when Plaud sessions expire. v1.x will add a "no clips received in 24h" banner. For v1, manually verify clips are arriving every few days; if they stop, re-log into Plaud's web app.

---

## Step 7 — Start Applaud + verify it's polling

```bash
cd applaud
pnpm start
# OR
docker compose logs -f
```

You should see:

```
applaud: starting on port 3030
applaud: reading Plaud JWT from Chrome LocalStorage
applaud: polling Plaud cloud every 10 min
applaud: webhook URL: https://sswanstudios.com/api/plaud/webhook/applaud
```

To make Applaud run on boot (so you don't have to remember to start it):

- macOS: use `launchd` (`~/Library/LaunchAgents/`)
- Linux: `systemd --user enable applaud`
- Windows: NSSM (`nssm install applaud "C:\path\to\applaud" "start"`) or Windows Service via `node-windows`
- Docker: `restart: unless-stopped` in `docker-compose.yml` (already in upstream `compose.yml`)

---

## Step 8 — Send a test recording end-to-end

1. Make a short Plaud recording (10–30 seconds; trivial content like "hello, this is a test recording")
2. Wait for your Plaud device to sync to Plaud cloud (normal Plaud workflow — usually <1 min when device is in BT range of mobile app)
3. Wait up to 10 minutes for Applaud's poll cycle to detect it
4. Watch the Render `-SS-PT-New` Logs tab for:
   ```
   info: 🌐 INCOMING REQUEST: POST /api/plaud/webhook/applaud
   info: [plaudApplaudWebhook] queued clip_id=<uuid>
   ```
5. Open https://sswanstudios.com/dashboard/plaud-merge — your test clip should appear in the queue with metadata (duration, file size, codec)
6. Multi-select the test clip + any dummy clip + click **Merge**
7. Verify merge → review → confirm flow works exactly like manual upload (it should — Phase 5 reuses the entire Phase 3 pipeline downstream of clip arrival)

If the clip doesn't appear in 10–15 minutes, see **Troubleshooting** below.

---

## Troubleshooting

### Clip never appears in the queue

- **Check Render logs first.** No `INCOMING REQUEST: POST /api/plaud/webhook/applaud` entries means Applaud isn't successfully POSTing. Look at Applaud's local logs for sig errors / DNS errors / config errors.
- **Check `cloudflared` is running.** If the tunnel is down, Render can't fetch the audio URL; you'll see `[plaudApplaudWebhook]` logs with `AUDIO_FETCH_TIMEOUT` or `AUDIO_FETCH_FAILED`.
- **Check the webhook secret matches** between Applaud's `.env` and Render's `PLAUD_APPLAUD_WEBHOOK_SECRET_V1`. Mismatch → `401 SIGNATURE_INVALID` repeated in Render logs. Re-paste the secret and confirm both ends are identical.
- **Check Plaud session.** Re-log into web.plaud.ai in your browser. Applaud's logs should show "Plaud JWT detected". If not, the session expired.
- **Check Applaud version.** If you accidentally upgraded past v0.5.10, downgrade: `git checkout v0.5.10 && pnpm install`.

### Clip appears with `'failed'` status

This shouldn't happen in v1.2 — the new pipeline (Codex CR-6 reorder) doesn't insert a clip row until audio fetch + probe succeed. If you see a failed clip:

- The fetch succeeded but the audio is corrupt or silent → re-record on your Plaud (the silence/corrupt detection is identical to manual upload's)
- A bug somewhere → check Render logs for the exact error code, paste it back to the AI assistant.

### `429 CLIP_INGEST_IN_PROGRESS` repeated

A previous webhook ingest crashed mid-pipeline and left a row in `'uploading'` state. The stale-uploading TTL cron will reap it within 5 minutes; Applaud's retry will then succeed. If it persists past ~10 minutes, check the Render logs for what crashed.

### `429 WEBHOOK_CONCURRENCY_LIMIT`

You've sent 6+ simultaneous webhooks. Either Applaud is in a runaway retry loop (kill + restart Applaud) or you genuinely have a backlog of 6+ recent recordings (wait the Retry-After window and Applaud retries naturally).

### `429 RATE_LIMITED`

You've sent 60+ webhooks in a 60-second window. Same diagnosis as above. Real legitimate use should never hit this.

### `400 AUDIO_URL_NOT_ALLOWED`

Applaud's audio URL doesn't match `PLAUD_APPLAUD_MEDIA_BASE_URL`. Verify:
- Cloudflare Tunnel hostname matches the env exactly
- HTTPS scheme (not HTTP)
- No credentials in URL

### `400 HTTPS_REQUIRED`

Your Cloudflare Tunnel is misconfigured and the request reached Render over HTTP. Check `~/.cloudflared/config.yml` and verify Cloudflare's TLS settings on the hostname (should be Full or Full (strict)).

### Disabled the feature for emergency rollback

Render dashboard → `-SS-PT-New` → Environment → set `PLAUD_APPLAUD_WEBHOOK_ENABLED=false` → Save. Render auto-restarts in ~30 seconds. The webhook URL returns 404. Manual upload continues working unchanged. No data loss.

---

## Day-2 ops

### Applaud version upgrade

1. Test the new version locally (`git fetch && git checkout v0.5.X && pnpm install && pnpm start`)
2. Send 1 test recording, verify it ingests cleanly (Step 8 abbreviated)
3. If green for 1 day, update the runbook here with the new pinned version
4. If red, downgrade: `git checkout v0.5.10`

### Webhook secret rotation

1. Generate new key (Step 2 procedure)
2. Set `PLAUD_APPLAUD_WEBHOOK_SECRET_V2=<new>` on Render (don't remove V1 yet)
3. Set `PLAUD_APPLAUD_WEBHOOK_KEY_ID=V2` on Render
4. Render redeploys
5. Update Applaud's `.env` to use V2 secret + restart Applaud
6. Verify clips still ingesting cleanly for 24 hours
7. Remove `PLAUD_APPLAUD_WEBHOOK_SECRET_V1` from Render

The receiver supports both V1 and V2 simultaneously during the rotation window via the `kid=V2` field that Applaud can include in the signature header. Pre-rotation the active key is whatever `PLAUD_APPLAUD_WEBHOOK_KEY_ID` points at.

### Plaud session expired

Re-log into https://web.plaud.ai/ in your Chromium-based browser. Wait one Applaud poll cycle (≤10 min). Done.

### Plaud account credentials compromised

Re-secure your Plaud account upstream (change Plaud password, log out other sessions). Then re-log into web.plaud.ai. The webhook secret is independent of your Plaud credentials so you don't need to rotate it for this incident — but you DO need to verify the attacker didn't inject any audio into Plaud's cloud while they had access (any unrecognized clip in `/dashboard/plaud-merge` should be discarded, not merged).

### Cloudflare Tunnel down

If `cloudflared` crashes on your home machine, recordings stop ingesting until you restart it. Manual upload continues working in the meantime. Set up `cloudflared` as a system service (Step 4) so it restarts automatically on boot.

### Home machine offline

Same as above: recordings will queue in Plaud's cloud and Applaud will pick them all up on the next poll cycle once your machine + tunnel are back online. No data loss as long as Plaud's cloud retains them (Plaud's TTL is generous; check their docs for current value).

---

## Verification checklist (run before declaring v1 production-ready)

- [ ] Applaud installed at v0.5.10
- [ ] Cloudflare Tunnel up + reachable from public internet
- [ ] Webhook secret saved in password manager + pasted into Render env (Sensitive flag set)
- [ ] All 5 Render env vars set (Step 5)
- [ ] Render boot log shows `[plaudApplaudWebhook] route mounting for user_id=<N>`
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" https://sswanstudios.com/api/plaud/webhook/applaud` returns `400` HTTPS_REQUIRED (not 404 — that means route isn't mounted)
- [ ] One test recording ingests end-to-end through `/dashboard/plaud-merge` (Step 8)
- [ ] Forced sig mismatch (paste wrong secret into Applaud `.env` temporarily) returns `401 SIGNATURE_INVALID` in logs
- [ ] Replay same recording (force Applaud retry) returns `200 already_processed` for the second event
- [ ] Manual upload at `/dashboard/plaud-merge` still works unchanged
- [ ] Optional: configure `PLAUD_APPLAUD_WEBHOOK_ENABLED=false`, verify route returns `404` immediately, then re-enable

When all 10 boxes are checked, Phase 5 v1 is production-active. Slice 5.10 (production activation) is just the deploy after this checklist completes on staging.

---

## What's NOT in v1 — deferred to v1.x or later

Per the v1.2 plan §1.2 + Codex APPROVE conditions:

- **Multi-trainer support.** v1 is single-trainer (Sean). v2 will add per-instance secret routing.
- **Official Plaud OAuth API.** Applaud uses reverse-engineered session auth. When Plaud's official OAuth opens up publicly, v2 will swap the source from Applaud → Plaud's official webhook with the same receiver shape.
- **Cloud-hosted Applaud.** Currently runs on Sean's home machine.
- **"Source: Applaud" badge UI** in the merge queue (Slice 5.7 — explicitly optional).
- **Operational alerting** — banner if no clips received in N hours. Manual queue-check is the v1 monitoring.
- **Daily forensic audit log** — every webhook receipt logged to a separate `plaud_webhook_audit` table for forensic trail. Currently in-process logger only.
- **Health endpoint** — `GET /api/plaud/webhook/applaud/health`. Adds attack surface; not justified by current value.
- **Multi-source `PLAUD_APPLAUD_MEDIA_BASE_URL`** for failover (Cloudflare Tunnel → ngrok). Single-value only in v1; failover requires manual env update.
- **Detailed rate-limiter key clarification** — currently per-process global; v1.x will scope per-source if multi-source is added.

---

## Questions for v1.x review

After running v1 in production for ~1 month:
- Are concurrent webhook ingests rare enough that the 5-handler semaphore is overkill?
- Does Applaud's reverse-engineered auth break across Plaud server-side changes?
- Is the 25 MB audio cap appropriate, or do real Plaud recordings ever exceed it?
- Should v1.1 add the "no clips in N hours" monitoring banner?

Track answers in the Phase 5 audit record (Rule 48 artifact at `docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-AUDIT-RECORD-<DATE>.md`, written at phase close).
