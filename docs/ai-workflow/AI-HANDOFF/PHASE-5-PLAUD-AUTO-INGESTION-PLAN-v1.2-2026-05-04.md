# Phase 5 — PLAUD Auto-Ingestion Plan v1.2

**Created:** 2026-05-04
**Owner:** Sean Swan + Claude Opus 4.7
**Status:** POST-CODEX-ROUND-2 (v1.1 REVISE → v1.2 integrated). Awaiting v1.2 final review.
**Predecessor plan:** Phase 3 (manual merge UI shipped 2026-05-04, commit `4eac08739`)
**Supersedes:** `PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.1-2026-05-04.md` (which superseded v1)

---

## §0.0 CHANGELOG (v1.1 → v1.2)

v1.1 went to Codex review (gpt-5.5 via OpenRouter, $0.36, 107s). Verdict: REVISE.

Codex confirmed FIXED on 10 of 11 v1 must-fix items. CR-6 was PARTIALLY-FIXED. v1.1 introduced **7 new HIGH findings** in the rewrite. v1.2 closes ALL of them.

### v1.1 → v1.2 fixes integrated

- **HIGH-1 (CR-6 partial → fixed):** §6.1 step 2 dedup is now status-AWARE. Only terminal-success states (`pending_merge`, `merged`, `discarded`) trigger `ALREADY_PROCESSED`. `'uploading'` rows return 429 CLIP_INGEST_IN_PROGRESS with Retry-After 300s. `'failed'` rows are deleted and the retry runs fresh.
- **HIGH-2 (CR-6 partial → fixed):** §20 acceptance item 4 corrected to specify NO `clip_id` in replay response (was contradicting §5.4).
- **HIGH-3 (CR-6 partial → fixed):** §8 failure mode matrix completely rewritten to match v1.1+ pipeline. Old "audio fetch creates failed clip" paths removed. New matrix includes the v1.2 recovery semantics for crashes after atomic insert.
- **HIGH-4 (transcript_ready broken → fixed):** §4.2 step 8 now branches on `event_type` BEFORE running `validateAudioUrl`. `transcript_ready` events skip URL validation; `audio_ready` requires it; unknown event types fail closed with 400.
- **HIGH-5 (raw-body parser mount-order ambiguous → fixed):** §18.2 (a) now spells out three concrete options (mount-before-global-parser / path-filter exclusion / route-specific raw parser) and requires Slice 5.5 to ship an integration test that confirms `req.rawBody` is populated through the actual app middleware chain.
- **HIGH-6 (duplicate stale §11 sections → fixed):** stale duplicate §11.2/§11.3/§11.4 from v1 (left behind after v1.1 edit) deleted. Authoritative test plan at lines 874-1008 only.
- **HIGH-7 (key_id resolution unverified → fixed):** §13.2 startup validation now calls the same `resolveWebhookSecret()` function used at sig-verify time. Refuses to mount if the active KEY_ID doesn't resolve to a valid secret.

### MEDIUM/LOW fixes integrated

- **M-1:** §4.2 step 1 adds explicit `^[0-9a-f]{64}$` hex format check on sig and `^[0-9a-f]{32}$` on nonce BEFORE `crypto.timingSafeEqual` (prevents 500 crash on malformed sig).
- **M-2:** §4.2 step 9 (NEW) — body `timestamp`/`nonce` (if present in the body) MUST equal the header values. Mismatch returns 400.
- **L-1:** Duplicate §6.2 heading deleted (only one §6.2 now).
- **L-2:** §13.2 mount-time validation rejects `PLAUD_APPLAUD_MEDIA_BASE_URL` containing credentials.

### Items deferred to v1.x backlog (Codex agreed)

- **M-3** rate-limiter key clarification (currently underspecified at §5.5; v1.x can resolve when implementing).

### Anti-rework verification

Codex re-confirmed: NO Phase 3 rework demanded. v1.2 only changes:
- New v1.2 dedup/recovery semantics (within Phase 5's scope)
- Failure matrix and acceptance criteria (within Phase 5's scope)
- Two new validations in step 1 (sig hex format) and step 9 (body/header consistency)

---

## §0. CHANGELOG (v1 → v1.1) — kept for v1.1 → v1.2 reviewers

Plan v1 went through:
1. AI Village 14-brain validation (cost $0.68, 10:28 wall)
2. Claude Opus 4.7 hostile self-review (4 CRITICAL, 7 HIGH, 10 MEDIUM, 10 LOW)
3. Codex equivalent gate review via OpenRouter `openai/gpt-5.5` (cost $0.47, verdict: REVISE)

**v1.1 integrates all of the following Codex-confirmed required changes.**

### CRITICAL fixes integrated (CR-1 through CR-6)

- **CR-1:** §6.1 pseudocode now uses Sequelize ORM methods OR `QueryTypes.SELECT` with proper destructuring. Eliminates the `[rows, metadata]` 2-tuple bug class that crashed production an hour before this review.
- **CR-2:** Nonce dedup in §4.2 + §7.2 now uses `INSERT ... ON CONFLICT DO NOTHING RETURNING` atomic pattern. Source-scoped composite primary key `(source, nonce)`. Retry semantics resolved (see §4.2.5).
- **CR-3:** `clip_external_id` dedup now uses atomic `INSERT ... ON CONFLICT DO NOTHING RETURNING` with explicit fallback `SELECT` and `200 ALREADY_PROCESSED` response.
- **CR-4:** Q2 (SSRF allowlist regex vs exact) closed. §3.3 V1.4 + §4.2 Step 8 now require: exact URL parser hostname/port match, HTTPS-only, no credentials in URL, `redirect: 'error'`, DNS-resolved private/loopback/link-local IP rejection, Content-Length cap during fetch.
- **CR-5:** §5.4 no longer lists `503 PLAUD_AUTO_INGEST_DISABLED`. D6 retained as "route literally absent (404) when feature flag off."
- **CR-6:** §6.1 pipeline reordered. New order: verify sig → atomic nonce claim → cheap dedup read → fetch audio → probe → atomic insert (ON CONFLICT) → write to disk → status flip + mirror job. Per-route concurrency semaphore (default max 5) added. `clip_id` removed from `ALREADY_PROCESSED` response shape (IDOR oracle mitigation).

### Independent CRITICAL findings from Codex (ICR-1, ICR-2)

- **ICR-1:** §18 expanded with new §18.2 — full Rule 26 Canonical Surface Receipt for the new BACKEND webhook route (mount chain, middleware order, raw-body parser, controller, services, tests). v1's §18 only covered the optional frontend badge.
- **ICR-2:** §4.1 + §13 Slice 5.5 now explicitly specify the Express `verify` hook for raw-body capture. HMAC verification requires the raw bytes BEFORE JSON parsing — without explicit `verify`, Express discards the buffer and HMAC computation fails.

### Upgraded-to-CRITICAL findings (Rule 50, Rule 58, Rule 42)

- **Rule 50 / Tier-A QA:** §11 now includes explicit regression tests for the Sequelize 2-tuple bug class + the `ANY(:array::type[])` bug class (both caught the production crash an hour ago).
- **Rule 58 / Schema-Drift:** Slice 5.1 now includes mandatory schema-drift detection (real Postgres up + introspect columns + verify partial unique index + verify model-to-column mapping + down migration test).
- **Rule 42 / Pre-Push Backend Audit:** Slices 5.4 and 5.5 now have explicit Rule 42 audit checklists.

### Other fixes integrated

- Startup env validation: webhook route refuses to mount unless `PLAUD_APPLAUD_USER_ID` resolves to a real `trainer`/`admin` user.
- Logger redaction: `PLAUD_APPLAUD_WEBHOOK_SECRET_*` added to redaction list.
- Source-scoped nonce uniqueness adopted now (low cost, prevents v2 footgun) per Codex recommendation, while explicitly NOT shipping multi-trainer support in v1.
- `200 ALREADY_PROCESSED` response no longer includes `clip_id` (IDOR oracle mitigation).

### Findings rejected (correctly per Codex)

- Multi-trainer support in v1 (out of scope §1.2)
- Official Plaud OAuth in v1 (out of scope §1.2)
- Cloud-hosted Applaud (out of scope §1.2)
- styled-components migration (out of scope; not a v1 concern)
- Marketing/competitive recommendations (not implementation requirements)
- Mobile UX touch-target findings as backend-slice blockers (slice 5.7 is optional)
- Daily alerting as v1 ship-blocker (deferred to v1.x per §9.3, §16)

### Anti-rework verification

Codex confirmed: NO Phase 3 rework demanded without failing-test/file:line evidence. v1.1 only changes:
- Phase 5 new code (the webhook receiver path)
- Additive schema (3 columns + 1 table) that Phase 3's existing queries are unaffected by
- Test additions that prove the manual upload flow remains unchanged

---

## §1. Objective, Scope, Non-Goals

### 1.1 Objective

Eliminate the manual-upload step from the trainer-PLAUD workflow. When Sean (or any future trainer running this on their machine) returns home with their PLAUD device, recordings automatically arrive in the SwanStudios PLAUD merge queue without trainer interaction. The trainer opens `/dashboard/plaud-merge`, sees clips already in the queue, and proceeds straight to multi-clip merge → review → confirm.

### 1.2 Scope (v1)

**In scope:**
- New backend route `POST /api/plaud/webhook/applaud` that accepts webhook events from Applaud (the open-source local Plaud bridge at `github.com/rsteckler/applaud`)
- HMAC-SHA256 signature verification on every webhook request
- Replay-attack protection via timestamped signed payloads + nonce cache
- Per-event idempotency (same `event_id` arriving twice produces one clip row, not two)
- Audio fetch from Applaud's media-server URLs into the existing `plaud_clips` storage pipeline
- Reuse of existing `plaudClipStorageDualTier` write path + R2 mirror worker (zero changes to those services)
- New `clip_source` enum column on `plaud_clips` (`'manual_upload' | 'applaud_webhook'`) for observability
- New `clip_external_id` column on `plaud_clips` to dedupe by Applaud's recording ID
- Operational runbook for Sean to install + run Applaud locally + expose to internet via Cloudflare Tunnel
- Optional UI: small "Source: Applaud" badge on clip rows in the merge queue (clip_source-driven)
- Feature flag `PLAUD_APPLAUD_WEBHOOK_ENABLED=false` (default off; flip to true after staging smoke)

**Out of scope (v1) — explicitly deferred:**
- **Official Plaud OAuth API integration.** Plaud's Developer Platform is still private beta with no public timeline. v1 uses Applaud as the source. v2 swaps source to official Plaud once their OAuth opens up. The webhook receiver shape we ship in v1 is designed to accept either source with a thin adapter layer — no rewrite when v2 lands.
- **Cloud-hosted Applaud.** Applaud is a local server by design (reads JWT from Sean's browser session). v1 ships expecting Sean's home machine to run it. Cloud-hosting Applaud would require either a Plaud OAuth client (gated by their beta) or a headless browser harness (security minefield) — punted.
- **Multi-trainer support.** v1 supports ONE trainer (Sean) running ONE Applaud instance. v2 supports multiple trainers each running their own Applaud, distinguished by Applaud's per-instance webhook secret.
- **Real-time push from Plaud device.** PLAUD-NotePin → Plaud cloud sync is on Plaud's timing (BT sync from device → cloud). Applaud polls cloud every 10 min. Real-time would require firmware changes to the device, well out of our control.
- **Transcript-level webhook handling.** Applaud emits both `audio_ready` and `transcript_ready`. v1 only handles `audio_ready` — we ingest the audio, then SwanStudios' merge pipeline runs its own transcribe via the existing audioMergeService → LLM transcribe path. Applaud's transcript is discarded. Reason: SwanStudios has its own fitness-vocab transcription tuning; using Applaud's generic transcript would reduce parse-quality for fitness-domain workouts. v2 may revisit if audio re-transcribe cost becomes meaningful.

### 1.3 Non-goals

- Not a replacement for the manual upload flow. Manual upload at `/dashboard/plaud-merge` continues to work. Webhook is purely additive.
- Not a Plaud-account-replacement. Sean still uses Plaud's mobile app for device → cloud sync. Applaud just bridges Plaud cloud → SwanStudios.
- Not a direct device-to-SwanStudios path. The chain is: PLAUD device → BT → Plaud mobile app → Plaud cloud → Applaud poll → SwanStudios webhook.
- Not changing the existing merge/transcribe/parse logic. Phase 5 only changes how clips ARRIVE in the queue.

### 1.4 Success criteria

- ✅ A clip recorded on Sean's PLAUD device appears in `/dashboard/plaud-merge` queue within 15 minutes of its upload to Plaud cloud (10 min Applaud poll + ≤5 min webhook + audio fetch)
- ✅ The clip is indistinguishable from a manually-uploaded clip downstream — same merge pipeline, same review state, same workout log output
- ✅ The webhook endpoint cannot be called by an unauthenticated party (HMAC verification fails closed)
- ✅ Replay attacks (replaying a captured webhook) are rejected
- ✅ Network failures during audio fetch leave the clip in `'failed'` state (not orphaned in `'uploading'`)
- ✅ Feature flag off = no webhook routes mounted (zero attack surface added when disabled)
- ✅ Zero changes to Phase 3's merge/review/confirm/discard flow

---

## §2. Architecture

### 2.1 End-to-end data flow

```
[Sean's PLAUD-NotePin device]
         │
         │  Bluetooth sync (Plaud-controlled timing)
         ▼
[Plaud mobile app]
         │
         │  HTTPS upload to Plaud cloud (Plaud-controlled)
         ▼
[Plaud cloud — recordings.plaud.ai]
         │
         │  Applaud polls every 10 min (configured interval)
         │  Auth: JWT from Sean's Chrome browser LocalStorage (no OAuth)
         ▼
[Sean's home machine — Applaud (local Node.js server)]
         │
         │  1. Detects new recording via diff vs. local SQLite cache
         │  2. Downloads audio file to Applaud's local media dir
         │  3. Computes HMAC-SHA256 signature over canonical payload
         │  4. POSTs JSON payload to webhook URL with sig header
         │
         │  HTTPS through Cloudflare Tunnel (or ngrok during dev)
         ▼
[https://sswanstudios.com/api/plaud/webhook/applaud]
         │
         │  Layer 1: HMAC-SHA256 sig verify → fail closed = 401 SIGNATURE_INVALID
         │  Layer 2: Timestamp window check → fail closed = 401 SIGNATURE_EXPIRED
         │  Layer 3: Nonce dedupe → fail closed = 200 ALREADY_PROCESSED (idempotent)
         │  Layer 4: clip_external_id dedupe → fail closed = 200 ALREADY_PROCESSED
         │  Layer 5: User mapping (Applaud-instance-secret → SwanStudios user_id)
         │  Layer 6: Audio fetch from Applaud's media URL with timeout + size cap
         │  Layer 7: ffprobe + silence detect (reuse audioProbeService)
         │  Layer 8: Insert plaud_clips row (status='uploading', clip_source='applaud_webhook')
         │  Layer 9: writeClipToDisk via plaudClipStorageDualTier
         │  Layer 10: Transactional flip status='pending_merge' + insert mirror_job
         │  Layer 11: Return 200 { event_id, clip_id, status: 'queued' }
         ▼
[plaud_clips row created — same shape as manual upload]
         │
         │  Existing R2 mirror worker picks up mirror_job row, uploads to R2
         │  Existing merge UI sees the new clip in queue (polling every 5s)
         ▼
[Sean opens /dashboard/plaud-merge]
         │
         │  Sees new clip (with "Source: Applaud" badge)
         │  Multi-selects clips, enters client ID, clicks Merge
         │  Existing merge → review → confirm flow takes over (Phase 3)
         ▼
[Workout logged in client dashboard]
```

### 2.2 Key architectural decisions

**D1: Webhook receiver, not OAuth client.** SwanStudios's role is purely receive-side. Applaud (local on Sean's machine) handles the Plaud-side complexity. SwanStudios has no Plaud credentials, no Plaud session, no Plaud client code. This means: when Plaud's official OAuth API opens up in the future, we add a SECOND source endpoint (`/api/plaud/webhook/plaud-cloud`) that accepts the official format, and the existing Applaud receiver keeps working. No rewrite.

**D2: Reuse the existing upload pipeline.** The webhook handler does NOT bypass Phase 3's pipeline. It calls the same `writeClipToDisk` → status flip → mirror_job pattern that the manual uploader uses. The only difference is the audio bytes come from a remote URL fetch instead of multer's `req.files`. This means: zero risk of bifurcating the storage/encryption/cipher logic, zero new attack surface in the storage layer, zero new test surface for those components.

**D3: Audio fetch is fire-and-respond, not deferred.** The webhook handler synchronously fetches audio from Applaud's media URL (with a 30-second timeout + 25 MB size cap), runs ffprobe, writes to disk, returns 200. We do NOT 200-OK immediately and process async. Reason: keeping it sync makes failure modes simple — Applaud sees a 5xx, Applaud retries (per its retry policy), no orphaned `'uploading'` rows from our side. If audio fetch is slow enough that we hit gateway timeouts (Render's is 60s), we'd switch to async + status callback in v2 — but per Applaud's behavior (small files, local network, fast media server) this hasn't been observed.

**D4: Clip dedup at TWO levels.**
- Nonce-based (request-level): every webhook request carries a `nonce` in its signed payload. Replaying the exact same request body+sig is rejected with `200 ALREADY_PROCESSED` (not 400/401, because we want Applaud to consider it a success and stop retrying).
- External-ID-based (semantic-level): if Applaud retries with a DIFFERENT nonce but the same `recording_id`, the `clip_external_id` UNIQUE constraint on `plaud_clips` rejects it at the DB layer. Same `200 ALREADY_PROCESSED` response.

**D5: Single trainer in v1.** The Applaud instance secret maps to ONE SwanStudios user_id via env config: `PLAUD_APPLAUD_USER_ID=<sean's user_id>`. Multi-trainer requires per-instance secret routing — deferred to v2.

**D6: Feature flag default off.** `PLAUD_APPLAUD_WEBHOOK_ENABLED=false` by default. When off, the webhook route is NOT mounted on the Express app at all (not just gated by a 503 inside the handler). This minimizes attack surface — the URL returns 404 entirely until Sean explicitly enables it.

**D7: HTTPS-only, hard-coded.** The webhook receiver rejects ANY request that didn't come over HTTPS (we check `req.secure` AND `X-Forwarded-Proto`). Render's load balancer terminates TLS, so this works. No fallback to HTTP — webhooks carry potential audio metadata + signed payloads, no exception.

### 2.3 Why Applaud and not the alternatives

| Option | Why not v1 | Possible v2/v3 |
|---|---|---|
| **Official Plaud OAuth API** | Still private beta, no timeline. We're not blocked on building today, but we ARE blocked on shipping today if we wait. | v2 — swap source when public |
| **plaud-toolkit (sergivalverde)** | TypeScript library, but no webhook emitter. Manual/CLI-driven only. Would require us to build the polling loop too. | If we wanted to embed the polling logic into SwanStudios's backend instead of running Applaud separately, this would be the building block. Adds complexity (we'd need to manage Plaud session lifecycle) and isn't as well-maintained. |
| **openplaud (openplaud)** | A Plaud-app *replacement* (its own UI), not a bridge. AGPL-3.0 also a copyleft concern if we tried to embed it. | Not relevant to our use case |
| **Direct device USB** | Plaud devices use proprietary BT sync, not USB mass-storage. No public USB protocol. | Not feasible |

Applaud's match for our use case is precise: it polls Plaud cloud, downloads audio, fires webhooks with the exact event shape we need. MIT license. 41 stars but actively maintained (v0.5.10 shipped 2026-04-21). Reverse-engineered auth is the one risk — addressed in §16 risk register.

---

## §3. Threat Model

### 3.1 Assets we're protecting

- **Trainer transcript audio.** Plaud recordings of trainer-client sessions. Contains client names, training plans, sometimes medical context. Same sensitivity as the existing PLAUD merge pipeline.
- **AES-256-GCM transcript cipher key** (`PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1`). Same key Phase 3 uses. Webhook ingestion does NOT add new key material — Phase 3's existing encryption protects the transcript at rest after merge.
- **Trainer's Plaud account credentials.** NOT touched by SwanStudios. Applaud holds these (via Chrome session) on Sean's home machine. Our exposure: zero.
- **The webhook secret** (`PLAUD_APPLAUD_WEBHOOK_SECRET_V1`). NEW secret introduced in v1. Used to sign Applaud → SwanStudios webhook payloads. Compromise enables forging fake webhooks → arbitrary clip injection. Severity: HIGH.

### 3.2 Threat actors

| Actor | Motivation | Realistic? | Mitigation |
|---|---|---|---|
| **Internet-wide attacker** | Forge webhooks to inject malicious audio / spam clip rows / DoS | Yes (URL is publicly reachable once enabled) | HMAC sig verify + timestamp window + IP allowlist (optional) + rate limit |
| **Bad-faith subdomain owner** | If sswanstudios.com DNS is ever hijacked, attacker controls the URL | Low (Cloudflare-protected DNS) | HMAC sig verify (the secret isn't in DNS) |
| **Compromised Sean home machine** | Attacker uses Sean's running Applaud to inject payloads | Real risk (BYOD home setups are softer than prod) | Limited blast radius — can only inject under Sean's user_id; existing merge approval gate catches obvious bad data; clip TTL purges within 24h |
| **Plaud cloud breach** | Plaud is breached, attacker gets Sean's recordings | Out of our control. Affects manual flow too. | Same risk as existing manual flow; PLAUD trust assumption |
| **Applaud malicious update** | Sean updates Applaud and the new version is malicious | Real but low | Pin Applaud version in runbook; verify against known-good hash; audit before update |

### 3.3 Attack vectors specific to v1

**V1.1: Forged webhook injection.** Mitigation: HMAC-SHA256 over canonical payload using `PLAUD_APPLAUD_WEBHOOK_SECRET_V1`. Attacker without secret cannot forge valid sig. Constant-time comparison prevents timing oracle.

**V1.2: Replay attack.** Attacker captures a legitimate webhook in transit (e.g., MITM during Cloudflare Tunnel attack), replays it. Mitigation: every payload includes a `timestamp` field within ±5 minutes of receipt (rejects stale payloads) AND a `nonce` checked against an in-memory + DB-backed `plaud_webhook_nonces` cache. Either gate alone is bypassable; together they cover both timing and identity.

**V1.3: Slowloris / large-body DoS.** Attacker POSTs 10 GB of garbage to the endpoint. Mitigation: Express body parser limit set to 10 KB for this route specifically (webhook payloads are small JSON, no audio inline). Audio is fetched separately by URL.

**V1.4: Audio-URL side-channel (SSRF).** Webhook payload includes a URL (`audio_url`). Attacker (compromised Applaud or sig-leak attacker) forges a payload with a URL pointing at an internal service. Mitigation REQUIRES all of the following — no regex, no substring matches, no shortcuts:

1. Parse with `new URL(audio_url)` — reject if parse throws.
2. **Exact** hostname match: `parsed.hostname === allowedBase.hostname`. No prefix, no suffix, no subdomain wildcards.
3. **Exact** port match: `parsed.port === allowedBase.port`.
4. **HTTPS only:** `parsed.protocol === 'https:'`. Reject `http:`, `file:`, `data:`, `gopher:`, anything else.
5. **No credentials:** reject if `parsed.username || parsed.password` (defeats `https://allowed@evil.com`).
6. **DNS resolution check:** `dns.lookup(parsed.hostname, { all: true })` and reject if ANY resolved address is private (RFC1918), loopback (127.0.0.0/8, ::1), link-local (169.254.0.0/16, fe80::/10), or multicast. This blocks `https://allowed-host.com` resolving to `127.0.0.1` via DNS rebinding or hostile DNS provisioning.
7. **`redirect: 'error'`** on the `fetch()` call — no redirect-following, period. A 3xx response from the allowed host = abort with `AUDIO_URL_REDIRECT_REJECTED`.
8. **Content-Length cap during fetch:** abort if `Content-Length` header > 25 MB; abort if cumulative streamed bytes exceed 25 MB even when `Content-Length` is missing or wrong.

If `PLAUD_APPLAUD_MEDIA_BASE_URL` is unset/empty, the validator MUST throw `AUDIO_URL_ALLOWLIST_UNCONFIGURED` (fail closed — no implicit "any URL ok"). This is the hard gate; without it set, the webhook route MUST not mount.

**Source for this hardening:** Codex Independent CRITICAL CR-4 + Security F-01 (SSRF chain) + Hostile C4. Q2 in §15 is now CLOSED.

**V1.5: Audio-fetch resource exhaustion.** Even from valid Applaud, audio could be 5 GB. Mitigation: HTTP Content-Length cap of 25 MB (matches the existing manual upload limit `PLAUD_MAX_FILE_BYTES`), 30-second fetch timeout, abort on overrun.

**V1.6: clip_external_id collision attack.** Attacker tries to insert clip with a `recording_id` they GUESS Sean might use, hoping to land before the legitimate one. Mitigation: HMAC sig prevents inserts at all without secret; even if defeated, the legit retry from Applaud would also fail dedup (200 ALREADY_PROCESSED) — but the audio content would already be the attacker's. This is pre-empted by V1.1's HMAC gate.

**V1.7: Plaud auth-cookie expiry → Applaud silently stops working.** Not a security threat to SwanStudios but an operational one. Sean wouldn't notice clips stopped arriving. Mitigation: dashboard banner if no clips received in N hours (operational alert, deferred to v1.x polish if Sean wants it).

### 3.4 Out-of-scope threats

- **Plaud cloud is malicious / compromised.** We trust Plaud's cloud as much as the user does — same trust assumption as the manual upload flow. If Plaud is compromised, all PLAUD users are affected; this isn't unique to our auto-ingestion.
- **Applaud is malicious from day 1.** Sean is opting into running Applaud on his home machine. We document the Applaud version we tested against (v0.5.10) and recommend Sean pin to it. Auditing the source of every Applaud release is on Sean.

---

## §4. Authentication + Signature Verification

### 4.1 HMAC-SHA256 signing scheme

Applaud signs each webhook with HMAC-SHA256 over a canonical payload. SwanStudios computes the expected signature and compares constant-time.

**Canonical payload format** (ALL fields included, in this order, separated by `\n`):
```
<timestamp>\n<nonce>\n<event_type>\n<recording_id>\n<sha256_hex_of_request_body>
```

Where:
- `timestamp` = unix epoch seconds at signing time
- `nonce` = random 16-byte hex (32 chars)
- `event_type` = `audio_ready` or `transcript_ready`
- `recording_id` = Plaud's recording UUID
- `sha256_hex_of_request_body` = SHA-256 hex of the raw request body BEFORE JSON parsing

Signing the canonical payload (NOT the raw body alone) prevents body-mutation attacks where two equivalent JSONs (whitespace differences, key reorder) produce the same body hash.

The signature is sent in two headers:
- `Plaud-Webhook-Signature: t=<timestamp>,nonce=<nonce>,sig=<hex_signature>`
- `Plaud-Webhook-Source: applaud-v0.5.10` (informational, used for source-version pinning checks)

**Raw body capture is REQUIRED before sig verification (Codex ICR-2).** Express's default JSON parser discards the raw bytes after parsing. The HMAC is computed over the raw bytes' SHA-256, NOT the parsed JS object's re-serialization. Without explicit raw-body capture, equivalent JSONs with different whitespace produce the same parsed object but different hashes — and the receiver cannot recompute Applaud's signed hash.

The route mount MUST use this exact pattern:

```js
const applaudJsonParser = express.json({
  limit: '10kb',
  type: 'application/json',
  verify: (req, _res, buf) => {
    req.rawBody = Buffer.from(buf);  // capture raw bytes BEFORE JSON.parse runs on buf
  }
});

router.post(
  '/applaud',
  requireHttpsProxy,         // checks X-Forwarded-Proto === 'https'
  applaudJsonParser,         // parses + captures raw bytes
  applaudRateLimiter,        // 60/min per source
  applaudConcurrencyLimiter, // semaphore max 5 concurrent
  applaudWebhookHandler
);
```

Sig verification then uses `req.rawBody` for the `sha256_hex_of_request_body` field, not `JSON.stringify(req.body)`.

### 4.2 Verification steps (in order, fail-closed at each)

**Important changes from v1:** Step 6 (nonce check) is now ATOMIC `INSERT ... ON CONFLICT DO NOTHING RETURNING` — not SELECT-then-INSERT (Codex CR-2). Step 7 (HTTPS check) moved EARLIER in the chain so we don't claim a nonce for a request we'd reject anyway.

```js
async function verify(req) {
  // Step 0: HTTPS check (defense-in-depth — Render terminates TLS but verify)
  // Moved BEFORE nonce claim so we don't burn nonce slots on bad traffic.
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return { ok: false, status: 400, code: 'HTTPS_REQUIRED' };
  }

  // Step 1: Signature header present and well-formed
  const parts = parseSignatureHeader(req.headers['plaud-webhook-signature']);
  if (!parts || !parts.t || !parts.nonce || !parts.sig) {
    return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };
  }
  // v1.2 fix (Codex M1): explicit hex format + length check on sig.
  // crypto.timingSafeEqual throws on length mismatch — without this gate
  // a malformed sig would crash to 500 instead of returning 401.
  if (!/^[0-9a-f]{64}$/i.test(parts.sig)) {
    return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };
  }
  // Same for nonce — must be exactly 32 hex chars (16 bytes per §4.1).
  if (!/^[0-9a-f]{32}$/i.test(parts.nonce)) {
    return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };
  }

  // Step 2: Timestamp within ±300 seconds
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(parts.t)) > 300) {
    return { ok: false, status: 401, code: 'SIGNATURE_EXPIRED' };
  }

  // Step 3: Body sha256 — uses req.rawBody captured by express.json verify hook
  const bodyHash = crypto.createHash('sha256').update(req.rawBody).digest('hex');

  // Step 4: Parse the (already-validated-as-JSON) body
  const body = req.body;  // express.json already parsed
  if (!body || !body.event_type || !body.recording_id) {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD' };
  }

  // Step 5: Build expected canonical payload
  const payload = `${parts.t}\n${parts.nonce}\n${body.event_type}\n${body.recording_id}\n${bodyHash}`;

  // Step 6: HMAC compute + constant-time compare
  const secret = resolveWebhookSecret(parts.kid || process.env.PLAUD_APPLAUD_WEBHOOK_KEY_ID);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts.sig, 'hex'))) {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }

  // Step 7: Atomic nonce claim (CR-2 fix — was SELECT-then-INSERT race in v1)
  const claimed = await sequelize.query(
    `INSERT INTO plaud_webhook_nonces (source, nonce, received_at, expires_at)
     VALUES ('applaud_webhook', :nonce, NOW(), NOW() + INTERVAL '600 seconds')
     ON CONFLICT (source, nonce) DO NOTHING
     RETURNING nonce`,
    { replacements: { nonce: parts.nonce }, type: QueryTypes.SELECT }
  );
  if (claimed.length === 0) {
    // Nonce already claimed → replay (or legitimate retry — see §4.2.5)
    return { ok: true, replayed: true, parsed: body };
  }

  // Step 8: Audio URL allowlist (CR-4 — strict validation; v1's regex Q2 closed)
  // v1.2 fix (Codex HIGH-4): only validate audio_url for audio_ready events.
  // transcript_ready events do not include audio_url; running URL validation
  // on them would 400-reject valid signed transcript_ready events.
  if (body.event_type === 'audio_ready') {
    try {
      await validateAudioUrl(body.audio_url, process.env.PLAUD_APPLAUD_MEDIA_BASE_URL);
    } catch (err) {
      return { ok: false, status: 400, code: err.code || 'AUDIO_URL_NOT_ALLOWED' };
    }
  } else if (body.event_type === 'transcript_ready') {
    // No audio_url required; validation skipped. Handler will return NOOP.
  } else {
    // Unknown event type — fail closed.
    return { ok: false, status: 400, code: 'UNKNOWN_EVENT_TYPE' };
  }

  // Step 9 (v1.2 NEW per Codex M2): verify body timestamp/nonce consistency
  // with header signature parts. Header values are authoritative (those are
  // what was signed); body values are advisory. If they exist and disagree,
  // reject — this would indicate Applaud version skew or manipulation.
  if (body.timestamp != null && Number(body.timestamp) !== Number(parts.t)) {
    return { ok: false, status: 400, code: 'BODY_TIMESTAMP_MISMATCH' };
  }
  if (body.nonce != null && body.nonce !== parts.nonce) {
    return { ok: false, status: 400, code: 'BODY_NONCE_MISMATCH' };
  }

  return { ok: true, replayed: false, parsed: body };
}
```

### 4.2.5 Nonce retry semantics (Codex CR-2 follow-up)

**Question:** if Applaud retries the exact same signed request after a transient 5xx, the nonce was already claimed in step 7 — we'd return `200 ALREADY_PROCESSED` even though processing failed. Is the retry's effect lost?

**v1.1 resolution:** Applaud MUST regenerate `(timestamp, nonce, signature)` on retry. We do NOT support same-nonce retries.

- Verified in staging smoke (slice 5.9): kill audio fetch mid-flight, observe Applaud retry — confirm fresh nonce.
- If Applaud version we deploy against (`v0.5.10`) does NOT regenerate nonces on retry, we add to the runbook: "configure Applaud with `APPLAUD_RETRY_REGENERATE_NONCE=true`" (verified to exist in v0.5.10 source) — slice 5.9 staging gate verifies this.
- This eliminates the need for `claimed/completed/failed` nonce status tracking that Codex offered as an alternative.

If staging smoke proves Applaud reuses nonces: v1.1 BLOCKS deployment and we open a debate file on whether to (a) patch Applaud, (b) add status tracking, or (c) add a SwanStudios-side retry shim.

### 4.3 Key rotation

`PLAUD_APPLAUD_WEBHOOK_SECRET_V1` follows the same versioned-key pattern as `PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1`. To rotate:
1. Generate new key, set as `PLAUD_APPLAUD_WEBHOOK_SECRET_V2`
2. Update `PLAUD_APPLAUD_WEBHOOK_KEY_ID=V2` in Render env
3. Deploy SwanStudios
4. Update Applaud's webhook secret to V2 on home machine
5. Confirm new clips arrive
6. After 24h grace, remove V1 from Render env

Receiver supports BOTH V1 and V2 simultaneously during the rotation window — verifies against `PLAUD_APPLAUD_WEBHOOK_KEY_ID`'s key first, falls back to other versioned keys if present. Same pattern Phase 3 uses for transcript cipher keys.

---

## §5. API Contract

### 5.1 Endpoint

```
POST /api/plaud/webhook/applaud
Content-Type: application/json
Plaud-Webhook-Signature: t=<unix>,nonce=<hex>,sig=<hex>
Plaud-Webhook-Source: applaud-v0.5.10
```

### 5.2 Request body — `audio_ready` event (v1 ONLY handles this)

```json
{
  "event_id": "evt_01HXXXX",
  "event_type": "audio_ready",
  "timestamp": 1714867200,
  "nonce": "a3f7b2c8d9e4f1a6b5c2d8e7f0a1b3c4",
  "recording_id": "rec_a1b2c3d4-...",
  "audio_url": "https://applaud-tunnel.sean.local/media/rec_a1b2c3d4.mp3",
  "audio_size_bytes": 1843200,
  "audio_duration_sec": 95.3,
  "audio_mimetype": "audio/mpeg",
  "audio_filename": "2026-05-04_workout-01.mp3",
  "device_serial": "PLD-NP-XXXX",
  "applaud_instance_id": "applaud-sean-home-v0.5.10"
}
```

Required fields (rejection with 400 INVALID_PAYLOAD if missing):
- `event_id`, `event_type`, `timestamp`, `nonce`, `recording_id`, `audio_url`, `audio_size_bytes`, `audio_mimetype`

Optional fields (logged but not required):
- `audio_duration_sec`, `audio_filename`, `device_serial`, `applaud_instance_id`

### 5.3 Request body — `transcript_ready` event (v1 IGNORES — returns 200 NOOP)

v1 does not consume Applaud's transcripts (we do our own transcription via the existing audioMergeService → LLM transcribe path). Applaud sends `transcript_ready` events; we 200-OK them so Applaud stops retrying, but do nothing else.

```json
{
  "event_id": "evt_01HYYYY",
  "event_type": "transcript_ready",
  "timestamp": 1714867260,
  "nonce": "b4c8d3e9f2a7b1c5d8e3f0a4b6c7d8e9",
  "recording_id": "rec_a1b2c3d4-...",
  "transcript_text": "...",
  "summary_text": "..."
}
```

Response: `200 { acknowledged: true, action: "ignored" }`.

### 5.4 Responses

**200 — clip queued:**
```json
{
  "success": true,
  "event_id": "evt_01HXXXX",
  "clip_id": "<uuid>",
  "status": "queued"
}
```

**200 — already processed (idempotent):**
```json
{
  "success": true,
  "event_id": "evt_01HXXXX",
  "status": "already_processed"
}
```

**Note (Codex CR-6):** the `clip_id` field is NOT returned on `already_processed` responses. v1 leaked clip UUIDs as an IDOR oracle; v1.1 removes it. The original `event_id` is sufficient for Applaud's idempotency.

**400 — INVALID_PAYLOAD:**
```json
{
  "success": false,
  "error": { "code": "INVALID_PAYLOAD", "message": "Missing required field: audio_url" }
}
```

**401 — SIGNATURE_INVALID / SIGNATURE_EXPIRED / SIGNATURE_MALFORMED:**
```json
{
  "success": false,
  "error": { "code": "SIGNATURE_INVALID", "message": "Webhook signature verification failed" }
}
```

**400 — AUDIO_URL_NOT_ALLOWED / HTTPS_REQUIRED**

**413 — AUDIO_TOO_LARGE** (audio_size_bytes > 25 MB OR Content-Length on fetch exceeds cap)

**415 — UNSUPPORTED_AUDIO_TYPE** (mimetype not in allowlist)

**422 — CLIP_REJECTED** (probe-time rejection — silent, corrupt — same as manual upload)

**429 — RATE_LIMITED** (per-secret rate limit hit; 60 events/minute)

**500 — INTERNAL_ERROR** (DB write failed, audio fetch failed, etc.)

**(Codex CR-5: 503 PLAUD_AUTO_INGEST_DISABLED has been REMOVED from the response catalog.)** When `PLAUD_APPLAUD_WEBHOOK_ENABLED !== 'true'`, the webhook route file is NOT mounted at all (per D6). Requests to `/api/plaud/webhook/applaud` then return Express's default 404 with no body. There is no 503 path in v1.1.

### 5.5 Rate limiting

Per-secret-version rate limit: 60 events per minute. Realistic upper bound is ~10/min from a single trainer using Plaud actively. 60 leaves headroom for backfill bursts and protects against runaway Applaud retries. Exceeding the limit returns 429 with `Retry-After` header set to seconds-until-window-reset.

### 5.6 Webhook source pin

`Plaud-Webhook-Source` header is logged and used for version-pinning detection. If Sean upgrades Applaud and the new version emits a different payload shape, the version pin in logs lets us trace breakage to the upgrade event.

---

## §6. Data Flow End-to-End

(See §2.1 ASCII diagram. This section adds the SQL- and code-level detail.)

### 6.1 Webhook handler pseudocode (REWRITTEN per Codex CR-1, CR-3, CR-6)

**Key changes from v1:**
- New pipeline order: verify sig → atomic nonce claim → cheap dedup READ → fetch audio → probe → atomic insert → write disk → transactional status flip + mirror job. NOTE: clip row insertion now happens AFTER successful audio fetch + probe, eliminating the DoS amplification + orphaned-row failure mode.
- All `sequelize.query()` calls explicitly use `type: QueryTypes.SELECT` and proper destructuring, OR use ORM methods. No more `[rows, metadata]` 2-tuple confusion.
- `clip_external_id` dedup uses atomic `INSERT ... ON CONFLICT DO NOTHING RETURNING`.
- Per-route concurrency semaphore (max 5 default) wraps the handler.
- `ALREADY_PROCESSED` response no longer includes `clip_id` (IDOR oracle mitigation).

```js
import { QueryTypes } from 'sequelize';
import { Semaphore } from '../../lib/semaphore.mjs';  // simple counting semaphore
import sequelize from '../../database.mjs';
import { PlaudClip } from '../../models/index.mjs';

const APPLAUD_USER_ID = Number(process.env.PLAUD_APPLAUD_USER_ID);
const MAX_CONCURRENCY = Number(process.env.PLAUD_APPLAUD_MAX_CONCURRENCY ?? 5);

const webhookSemaphore = new Semaphore(MAX_CONCURRENCY);

export async function applaudWebhookHandler(req, res) {
  // CR-6: per-route concurrency cap before doing any DB work
  const release = await webhookSemaphore.tryAcquire();
  if (!release) {
    res.set('Retry-After', '30');
    return jsonError(res, 429, 'WEBHOOK_CONCURRENCY_LIMIT',
      'Too many concurrent webhook ingests');
  }

  try {
    return await handleApplaudWebhookCore(req, res);
  } catch (err) {
    logger.error('[plaudApplaudWebhook] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Webhook handler error');
  } finally {
    release();
  }
}

async function handleApplaudWebhookCore(req, res) {
  // Step 1: §4.2 sig + nonce + URL allowlist (atomic nonce claim happens here)
  const verified = await verifyWebhookSignature(req);
  if (!verified.ok) {
    return jsonError(res, verified.status, verified.code,
      verified.message ?? 'verification failed');
  }
  if (verified.replayed) {
    // Atomic nonce claim returned 0 rows = already processed (CR-2)
    return res.status(200).json({
      success: true,
      event_id: verified.parsed.event_id,
      status: 'already_processed',
      // CR-6: no clip_id leak
    });
  }

  // v1 ignored transcript_ready events here (D7 + §5.3); preserved in v1.1.
  if (verified.parsed.event_type === 'transcript_ready') {
    return res.status(200).json({ acknowledged: true, action: 'ignored' });
  }

  const { recording_id, audio_url, audio_size_bytes, audio_mimetype, event_id }
    = verified.parsed;

  // Step 2: Cheap dedup READ — no DB write yet (CR-6)
  // v1.2 fix (Codex HIGH-1): status-AWARE dedup. Only treat terminal-success
  // states as already_processed. A row in 'uploading' means a previous attempt
  // is in-flight or crashed mid-pipeline — DON'T short-circuit; let the atomic
  // INSERT in step 5 either win the race (if the prior crashed) or hit the
  // unique-conflict and return already_processed legitimately.
  const TERMINAL_DEDUP_STATES = new Set([
    'pending_merge',  // queued successfully
    'merged',         // already merged into a workout
    'discarded',      // trainer chose to discard
  ]);
  // Note: 'uploading' is in-flight; 'failed' means prior attempt failed
  // (e.g. probe rejected) and we want a fresh attempt to be possible —
  // both are NOT in TERMINAL_DEDUP_STATES.
  const existing = await PlaudClip.findOne({
    where: {
      clipSource: 'applaud_webhook',
      clipExternalId: recording_id,
      userId: APPLAUD_USER_ID,
    },
    attributes: ['clipId', 'status'],
  });
  if (existing && TERMINAL_DEDUP_STATES.has(existing.status)) {
    return res.status(200).json({
      success: true,
      event_id,
      status: 'already_processed',
    });
  }
  if (existing && existing.status === 'uploading') {
    // In-flight or stuck (will be reaped by stale-uploading TTL cron at 5min).
    // Return 429 with Retry-After so Applaud retries with fresh nonce after
    // the cron reaper catches up.
    res.set('Retry-After', '300');
    return jsonError(res, 429, 'CLIP_INGEST_IN_PROGRESS',
      'Previous ingest of this recording is in progress or stuck; retry after stale-row reaper');
  }
  if (existing && existing.status === 'failed') {
    // Previous attempt failed (e.g. corrupt audio). Allow retry — fall
    // through to step 3 (fetch audio). The atomic INSERT in step 5 will
    // hit the unique-conflict because the failed row still exists; we
    // explicitly handle that path by treating the conflict as "retry the
    // failed attempt by overwriting." Implementation: DELETE the failed
    // row first, then proceed. Test §11.2 covers this path.
    await PlaudClip.destroy({
      where: { clipId: existing.clipId, status: 'failed' }
    });
    // Fall through to step 3.
  }

  // Step 3: Fetch audio BEFORE inserting any DB row (CR-6)
  // Uses validateAudioUrl() per §3.3 V1.4 (CR-4 hardening)
  const audio = await fetchAudioWithCaps(audio_url, audio_size_bytes);
  if (audio.error) {
    return jsonError(res, audio.errorStatus, audio.errorCode, audio.message);
  }

  // Step 4: Stage + probe (same audioProbeService as manual upload)
  const ext = pickExtFromMimetype(audio_mimetype);
  if (!ext) {
    return jsonError(res, 415, 'UNSUPPORTED_AUDIO_TYPE',
      `mimetype ${audio_mimetype} not allowed`);
  }
  const tmpPath = await stageAudioToTmp(audio.bytes, ext);
  let meta;
  try {
    meta = await probeFile(tmpPath);
    const silence = await detectSilence(tmpPath);
    if (silence.isSilent) {
      return jsonError(res, 422, 'CLIP_TOO_SILENT', 'silence threshold exceeded');
    }
  } catch (err) {
    if (err instanceof ClipCorruptError) {
      return jsonError(res, 422, 'CLIP_CORRUPT', 'corrupt audio');
    }
    throw err;
  }

  // Step 5: Atomic INSERT with ON CONFLICT — wins races (CR-3)
  const clipId = randomUUID();
  const inserted = await sequelize.query(
    `INSERT INTO plaud_clips
       (clip_id, user_id, status, clip_source, clip_external_id, applaud_event_id,
        storage_ext, mimetype, expected_bytes, codec, sample_rate, channels,
        duration_sec, created_at, expires_at)
     VALUES
       (:clipId, :uid, 'uploading', 'applaud_webhook', :rid, :eid,
        :ext, :mime, :size, :codec, :sr, :ch,
        :dur, NOW(), NOW() + INTERVAL '24 hours')
     ON CONFLICT (clip_source, clip_external_id, user_id)
       WHERE clip_external_id IS NOT NULL
     DO NOTHING
     RETURNING clip_id`,
    {
      replacements: {
        clipId, uid: APPLAUD_USER_ID, rid: recording_id, eid: event_id,
        ext, mime: audio_mimetype, size: audio.bytes.length,
        codec: meta.codec, sr: meta.sampleRate, ch: meta.channels,
        dur: meta.durationSec,
      },
      type: QueryTypes.SELECT,
    }
  );
  if (inserted.length === 0) {
    // Race: another concurrent request inserted first. Treat as already processed.
    return res.status(200).json({
      success: true,
      event_id,
      status: 'already_processed',
    });
  }
  const insertedClipId = inserted[0].clip_id;

  // Step 6: Write to disk (same plaudClipStorageDualTier as manual upload)
  await writeClipToDisk({
    clipId: insertedClipId,
    userId: APPLAUD_USER_ID,
    audioBytes: audio.bytes,
    ext,
  });

  // Step 7: Transactional flip status='pending_merge' + insert mirror_job
  await sequelize.transaction(async (tx) => {
    await sequelize.query(
      `UPDATE plaud_clips
       SET status = 'pending_merge'
       WHERE clip_id = :clipId AND status = 'uploading'`,
      { replacements: { clipId: insertedClipId },
        type: QueryTypes.UPDATE,
        transaction: tx }
    );
    await sequelize.query(
      `INSERT INTO plaud_clip_mirror_jobs (clip_id, status, attempt_count, created_at)
       VALUES (:clipId, 'pending', 0, NOW())`,
      { replacements: { clipId: insertedClipId },
        type: QueryTypes.INSERT,
        transaction: tx }
    );
  });

  return res.status(200).json({
    success: true,
    event_id,
    clip_id: insertedClipId,
    status: 'queued',
  });
}
```

### 6.2 Why we reuse `plaudClipStorageDualTier` directly

(unchanged from v1)

The manual upload pipeline goes:
```
multer.memoryStorage → req.files[i] → ffprobe → writeClipToDisk → status flip → mirror_job
```

The webhook pipeline goes:
```
HTTP fetch → audio bytes in memory → ffprobe → writeClipToDisk → status flip → mirror_job
```

Same downstream from `writeClipToDisk` onward. Zero changes to that service or anything beyond it. The webhook handler is purely an alternate "front door" for clip arrival.

### 6.3 Failure modes intentionally eliminated by the v1.1 reorder

- **v1 FM-1 "Audio fetch timeout creates a `'failed'` clip Sean has to manually re-upload"** — GONE. v1.1 doesn't insert a clip row until audio fetch succeeds. Failed fetch = 5xx response, no orphaned row, Applaud retries naturally.
- **v1 DoS amplification (Codex F-02)** — GONE. v1.1 doesn't take a DB write lock on hostile traffic. Concurrency semaphore caps blocked handlers at 5.
- **v1 IDOR oracle via clip_id leak** — GONE. v1.1 omits `clip_id` from `ALREADY_PROCESSED` responses.

---

## §7. Storage + DB Schema

### 7.1 New columns on `plaud_clips`

```sql
ALTER TABLE plaud_clips
  ADD COLUMN clip_source VARCHAR(32) NOT NULL DEFAULT 'manual_upload'
    CHECK (clip_source IN ('manual_upload', 'applaud_webhook')),
  ADD COLUMN clip_external_id VARCHAR(128) NULL,
  ADD COLUMN applaud_event_id VARCHAR(128) NULL;

-- Unique-on-source-id to dedupe per-source
CREATE UNIQUE INDEX idx_plaud_clips_external_id_source
  ON plaud_clips (clip_source, clip_external_id, user_id)
  WHERE clip_external_id IS NOT NULL;
```

- `clip_source`: `manual_upload` (existing) or `applaud_webhook` (new). Default `manual_upload` for backfill compatibility.
- `clip_external_id`: Applaud's `recording_id` (Plaud's UUID). NULL for manual uploads. Used for V1.6 dedup.
- `applaud_event_id`: Applaud's per-event ID. Used for forensic tracing only.

### 7.2 New table `plaud_webhook_nonces` (v1.1: source-scoped composite key per Codex CR-2)

```sql
CREATE TABLE plaud_webhook_nonces (
  source VARCHAR(32) NOT NULL,
  nonce VARCHAR(64) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,  -- received_at + 600s
  PRIMARY KEY (source, nonce)
);

CREATE INDEX idx_plaud_webhook_nonces_expires_at ON plaud_webhook_nonces(expires_at);
```

**Why composite key over `nonce PRIMARY KEY`:** v1's design used a global nonce key. v1.1 scopes the uniqueness to `(source, nonce)` per Codex CR-2 sub-recommendation. Cost: zero (same query plan, same insert atomicity). Benefit: when v2 adds a second source (e.g. official Plaud OAuth), nonce collisions across sources don't lock each other out.

**Insertion is ALWAYS atomic via `ON CONFLICT DO NOTHING RETURNING`** — see §4.2 step 7. The check-then-act pattern from v1 is forbidden (Codex CR-2).

**Cleanup cron** scheduled in `backend/jobs/plaudCronJobs.mjs` (existing PLAUD cron infra), runs every 60s:
```sql
DELETE FROM plaud_webhook_nonces WHERE expires_at < NOW();
```
This is a NEW cron task added in Slice 5.1, not a v1.x deferral.

**In-memory LRU optimization layer** (size 10000, per-process) — OPTIONAL. v1.1 acceptably ships WITHOUT the LRU since the DB-atomic gate is the source of truth and the DB query cost is minimal at our request rate (60 RPM cap). If perf becomes a concern in v1.x, add LRU as a pre-flight cache. Not required for v1.1.

### 7.3 Migration sequencing

Migration filename: `20260504-plaud-applaud-source-columns.cjs` (Sequelize migration).

- Phase 5.1: ship migration, code paths still use only `manual_upload` source. Zero behavior change.
- Phase 5.2: ship webhook handler with feature flag OFF.
- Phase 5.3: enable feature flag in staging (Sean's home), run smoke tests.
- Phase 5.4: enable feature flag in production.

---

## §8. Failure Modes + Retries (REWRITTEN per Codex HIGH-3 — v1's matrix described pre-reorder behavior)

### 8.1 Failure mode matrix (v1.2 — matches §6.1 pipeline order)

The v1.1 reorder eliminated the failed-row class entirely for fetch/probe failures. v1.2 makes that explicit and adds new post-insert failure semantics from Codex HIGH-1.

| Failure point | HTTP response | SwanStudios state | Applaud retry? (with FRESH nonce per §4.2.5) | User-visible? |
|---|---|---|---|---|
| HTTPS check fails (X-Forwarded-Proto != https) | 400 HTTPS_REQUIRED | No clip row | Doesn't retry (4xx) | No |
| Sig header malformed / hex format wrong | 401 SIGNATURE_MALFORMED | No clip row | No (4xx terminal) | No |
| Sig timestamp expired | 401 SIGNATURE_EXPIRED | No clip row | Yes — regenerates timestamp, retries | No |
| Sig invalid (wrong secret) | 401 SIGNATURE_INVALID | No clip row | No (4xx terminal) | No |
| Nonce already claimed (replay) | 200 already_processed | No new row | (Not retried; Applaud sees success) | No |
| INVALID_PAYLOAD (missing fields) | 400 | No clip row | No | No (logs only) |
| Body timestamp/nonce mismatch with header | 400 BODY_*_MISMATCH | No clip row | No | No |
| UNKNOWN_EVENT_TYPE | 400 | No clip row | No | No |
| Audio URL not allowlisted | 400 AUDIO_URL_NOT_ALLOWED | No clip row | No | No |
| Concurrency limit (semaphore full) | 429 WEBHOOK_CONCURRENCY_LIMIT + Retry-After | No clip row | Yes — backoff per Retry-After | No |
| Rate limit | 429 RATE_LIMITED + Retry-After | No clip row | Yes — backoff | No |
| Existing 'uploading' row (in-flight or stuck) | 429 CLIP_INGEST_IN_PROGRESS + Retry-After: 300 | No new row inserted | Yes — backoff 5min until stale-uploading reaper completes | No |
| Existing 'failed' row | (handler proceeds) Old failed row deleted, fresh attempt runs | New row inserted on success | Effectively idempotent | No (silent recovery) |
| Audio Content-Length > 25 MB (declared) | 413 AUDIO_TOO_LARGE | No clip row | No | No |
| Audio fetch streamed bytes > 25 MB | 413 AUDIO_TOO_LARGE (abort mid-stream) | No clip row | No | No |
| Audio fetch timeout (>30s) | 500 AUDIO_FETCH_TIMEOUT | No clip row | Yes (5xx) — Applaud retries with fresh nonce | No (silent retry) |
| Audio fetch returns 5xx FROM Applaud | 500 | No clip row | Yes — retry | No |
| Audio fetch returns 3xx redirect | 400 AUDIO_URL_REDIRECT_REJECTED | No clip row | No | No |
| Mimetype not in allowlist | 415 UNSUPPORTED_AUDIO_TYPE | No clip row | No | No |
| Probe rejects (silent/corrupt) | 422 CLIP_TOO_SILENT or CLIP_CORRUPT | No clip row | No | No (logs only) |
| Atomic INSERT conflict (race with concurrent same-recording_id) | 200 already_processed | Existing row stands | (Not retried) | No |
| writeClipToDisk fails AFTER atomic insert | 500 INTERNAL_ERROR | Row stuck in 'uploading' | Yes — retry hits §6.1 step 2 'uploading' branch → 429 backoff → stale-uploading reaper at 5min cleans → next retry succeeds | NO if retry succeeds within ~6 min; YES if reaper fails (escalation: manual cleanup) |
| Status flip transaction fails AFTER disk write | 500 INTERNAL_ERROR | Row stuck in 'uploading' (disk file orphaned) | Same as above — retry recovers | Same as above |
| DB completely unavailable | 500 INTERNAL_ERROR | No clip row | Yes — retry | No |

### 8.2 Specific concerns (v1.2 — replaces v1's stale FM-1/FM-2)

**FM-1 (NEW v1.2): Crash after atomic insert but before disk write or status flip.** This is the only meaningful failure window in v1.2's pipeline. Mitigation: §6.1 step 2 detects the stuck `'uploading'` row and returns 429 CLIP_INGEST_IN_PROGRESS with Retry-After 300s. The existing Phase 3 stale-uploading TTL cron (5 min reaper) clears the stuck row. Applaud retries naturally with fresh nonce. Net effect: ingest delayed ~5-6 minutes after the crash, but eventually succeeds without manual intervention.

**FM-2: Repeated 'failed' attempts.** If audio truly is corrupt or silent, every retry will fail at probe. v1.2 step 2 deletes the failed row before retrying, so this doesn't accumulate failed rows in the queue. But every retry still costs Applaud → SwanStudios traffic. Future v1.x: add an exponential backoff via a `failure_count` column to limit retry storm on permanently-bad audio.

**FM-3: Applaud sends a malformed-but-signed payload.** Sig passes (correct secret), but body is missing required fields. Returns 400 INVALID_PAYLOAD. Not a security issue.

**FM-4: Silent → wait.** Plaud cloud sync is non-deterministic; Applaud poll interval is 10 min. Worst case clip arrives 12 min after recording. Documented in user-facing UX.

**FM-5 (NEW v1.2): Applaud reuses nonce on retry.** Per §4.2.5 we require fresh nonce on retry. If Applaud version we deploy fails this, staging smoke (Slice 5.9) blocks. Mitigation path: §4.2.5 fallback plan (patch Applaud, add status tracking, or add SwanStudios retry shim).

### 8.3 What v1.1's reorder eliminated (kept here for reviewers verifying the rewrite)

- **(GONE) v1 FM-1 "Audio fetch timeout creates a `'failed'` clip Sean has to manually re-upload":** v1.2 doesn't insert the clip row until audio fetch + probe succeed. Failed fetch = 5xx response, no orphaned row.
- **(GONE) v1 stuck-row dedup loophole:** v1's preflight dedup was status-blind, so a crash mid-pipeline would leave a stuck row that subsequent retries would dedup as "already processed" forever. v1.2 step 2 is status-aware (HIGH-1 fix); only terminal-success states short-circuit.
- **(GONE) v1 IDOR oracle via clip_id leak in ALREADY_PROCESSED:** v1.2 omits `clip_id` from those responses.

---

## §9. Observability + Monitoring

### 9.1 Log signals

Every webhook request logs:
- Receipt: `[plaudApplaudWebhook] received event_id=<id> source=<applaud-version>`
- Sig verify: `[plaudApplaudWebhook] sig OK / sig FAILED <reason>`
- Dedup hits: `[plaudApplaudWebhook] dedup hit recording_id=<rid>`
- Audio fetch: `[plaudApplaudWebhook] fetch <bytes> in <ms>ms`
- Final: `[plaudApplaudWebhook] queued clip_id=<uuid>` OR `[plaudApplaudWebhook] failed code=<code>`

### 9.2 Metrics (logged as structured fields, no separate metrics service yet)

- `webhook_receipts_total` — counter, labeled by event_type and result (queued/already_processed/failed)
- `webhook_audio_fetch_duration_ms` — histogram
- `webhook_audio_fetch_bytes` — histogram
- `webhook_sig_failures_total` — counter, labeled by reason (malformed/expired/invalid/source-mismatch)

Future: add Grafana dashboard reading from logs. Out of scope for v1.

### 9.3 Alerting (deferred)

v1 ships without alerting — rely on Sean's manual queue inspection. v1.x adds:
- Stale-source alert: no `audio_ready` events received in 24h while `PLAUD_APPLAUD_WEBHOOK_ENABLED=true` → email to Sean (Applaud may have stopped working)
- Sig failure rate alert: >10 SIGNATURE_INVALID events in 5 min → potential attack → email + auto-disable feature flag

---

## §10. Rollback Plan

### 10.1 Feature flag rollback (instant, zero deploy needed)

```
PLAUD_APPLAUD_WEBHOOK_ENABLED=false  (set in Render dashboard, save → instant restart)
```

Result: webhook route returns 404. Existing clips remain. Manual upload continues to work. Zero impact on Phase 3.

### 10.2 Code rollback (one revert commit)

```
git revert <phase-5-merge-commit>
git push origin main
```

Migration columns (`clip_source`, `clip_external_id`, `applaud_event_id`) remain in the DB — additive, not destructive. They are nullable / defaulted, no existing query breaks. To remove them later requires a separate down migration; v1 does not bundle one (deemed unnecessary risk).

### 10.3 Migration rollback (DESTRUCTIVE — only as last resort)

Down migration drops the columns. Only run if columns themselves cause a problem (extremely unlikely). Documented in `migrations/20260504-plaud-applaud-source-columns.cjs.down.sql`.

---

## §11. Test Plan

### 11.1 Unit tests

`backend/tests/unit/plaudApplaudWebhook.test.mjs`:

**Signature verification:**
- Sig verification — correct payload + correct secret = pass
- Sig verification — wrong secret = SIGNATURE_INVALID
- Sig verification — malformed header = SIGNATURE_MALFORMED
- Sig verification — expired timestamp = SIGNATURE_EXPIRED
- Sig verification — replayed nonce = ALREADY_PROCESSED
- Sig verification — modified body = SIGNATURE_INVALID (body hash mismatch)
- Constant-time comparison — measure timing variance is negligible (statistical test)
- **Body-hash binding (Codex ICR-2):** two JSON bodies with equivalent parsed object but different raw bytes (whitespace differences) MUST produce different body hashes; only the EXACT signed raw body passes verification.
- **Raw-body capture middleware:** request without `req.rawBody` set → handler aborts with INTERNAL_ERROR (defensive; should never happen in practice but tests the misconfiguration case).

**Audio URL allowlist (Codex CR-4):**
- Matching URL = pass; mismatching hostname = AUDIO_URL_NOT_ALLOWED
- Subdomain prefix attack: `https://allowed.com.attacker.com` = REJECT
- Credentials in URL: `https://allowed@evil.com` = REJECT
- HTTP scheme: `http://allowed.com` = REJECT
- Localhost: `https://localhost`, `https://127.0.0.1` = REJECT
- Private IP: hostname resolving to RFC1918 = REJECT
- Link-local: `169.254.0.0/16` = REJECT
- Missing `PLAUD_APPLAUD_MEDIA_BASE_URL` env = AUDIO_URL_ALLOWLIST_UNCONFIGURED
- Wrong port: allowed hostname but different port = REJECT

**Audio fetch:**
- Body parser cap — 11 KB body = 413 by Express limit
- Audio Content-Length cap — fetch with 26 MB declared = AUDIO_TOO_LARGE
- Audio Content-Length lying — declared 1 MB but actual 30 MB streamed = abort + AUDIO_TOO_LARGE
- Audio fetch timeout — slow fetch = AUDIO_FETCH_TIMEOUT after 30s
- 3xx redirect from allowed host = AUDIO_URL_REDIRECT_REJECTED (`fetch` was called with `redirect: 'error'`)
- Mimetype allowlist — unsupported = UNSUPPORTED_AUDIO_TYPE

**Probe & write:**
- ClipCorruptError → 422 + NO clip row inserted (v1.1 reorder: probe before insert)
- Silent clip detect → 422 + NO clip row inserted

**Happy path:**
- Successful path — clip_id created, mirror_job inserted, status='pending_merge', `clip_source='applaud_webhook'`
- Response body contains `clip_id` ONLY when status='queued', NEVER when status='already_processed' (Codex CR-6)

**Idempotency / dedup (Codex CR-2, CR-3):**
- Same event_id twice → first returns 'queued', second returns 'already_processed' WITHOUT clip_id leak
- Same recording_id twice from concurrent requests → exactly one clip row + one mirror_job row (atomic INSERT ON CONFLICT)
- Same nonce twice from concurrent requests → exactly one nonce row claimed, second returns 'already_processed'

**HTTPS / route-mounting:**
- HTTPS check — http (X-Forwarded-Proto) → 400 HTTPS_REQUIRED
- Rate limit — 61st request in 60s window → 429 with `Retry-After` header
- Concurrency semaphore — 6th concurrent in-flight request → 429 WEBHOOK_CONCURRENCY_LIMIT (Codex CR-6)
- **Feature flag off — route returns 404, NOT 503 (Codex CR-5).** This must hit the route-mount conditional, not just the handler.

### 11.1.1 Sequelize raw-query regression tests (Rule 50 / Tier-A QA gap from production crash)

**Why this section exists:** The 2026-05-04 production crash-loop was caused by `ANY(:array::type[])` with `replacements` (invalid SQL) and the `[rows, metadata]` 2-tuple destructuring. Existing PLAUD test suites missed both. v1.1 must add explicit regression coverage.

`backend/tests/unit/plaudWebhookSequelizeRegression.test.mjs`:

- **Static check #1:** parse the webhook controller's source AST, assert NO `sequelize.query()` call inside the webhook handler chain uses `replacements: { ...: <Array> }` with the SQL containing `ANY(:`.
- **Static check #2:** parse the webhook controller's source AST, assert EVERY `sequelize.query()` call either (a) uses an ORM method, OR (b) explicitly passes `type: QueryTypes.SELECT|INSERT|UPDATE` AND destructures the result correctly (no bare `await sequelize.query()` whose result is then `.length`-checked or `[0]`-indexed).
- **Runtime check #3:** mock Sequelize, return `[mockRows, mockMeta]`, verify the handler does NOT crash and does NOT misinterpret the metadata tuple as a row array.
- **Runtime check #4:** mock Sequelize to return an empty `rows` array on `INSERT ... ON CONFLICT DO NOTHING RETURNING` (no row inserted because of conflict) — verify the handler returns `200 ALREADY_PROCESSED` and does NOT throw.
- **Defense-in-depth check #5:** if the global unhandledRejection handler in `server.mjs` is reached during webhook handler execution, the test fails. Webhook handler must NEVER unhandle-reject — try/catch wraps the whole pipeline.

### 11.2 Integration tests

`backend/tests/integration/plaudApplaudWebhook.integration.test.mjs` (against real Postgres):

**Concurrency tests (Codex must-fix-before-staging):**
- Two simultaneous requests with same nonce → exactly one nonce row claimed
- Two simultaneous requests with same `recording_id` → exactly one `plaud_clips` row + exactly one `plaud_clip_mirror_jobs` row
- Conflict path returns idempotent 200 ALREADY_PROCESSED, NOT 500

**SSRF bypass tests (Codex must-fix-before-staging):**
- `https://allowed.example.com.evil.com` → REJECT
- `https://allowed.example.com@evil.com` → REJECT
- `http://allowed.example.com` → REJECT
- `https://localhost`, `https://127.0.0.1` → REJECT
- `https://169.254.169.254` → REJECT (link-local)
- Allowlisted host with DNS resolving to private IP → REJECT
- Allowlisted host returning 302 redirect → REJECT (fetch with redirect:'error')
- Missing `PLAUD_APPLAUD_MEDIA_BASE_URL` env → REJECT (fail closed)

**End-to-end smoke:**
- Signed payload → handler → exactly one clip row created → exactly one mirror_job inserted → `clip_source='applaud_webhook'`
- Same `recording_id` from two sources (manual upload + applaud_webhook) — both rows coexist (different `clip_source`); partial unique index allows this
- Nonce table cleanup — old nonces cleaned by cron; receiver still rejects within window
- **Manual upload regression:** existing manual upload via `/api/plaud/clips/upload` still works unchanged after the migration adds the new columns. Existing rows have `clip_source='manual_upload'` (default). Existing tests still pass.

### 11.3 Schema-drift tests for Slice 5.1 (Rule 58 + Codex must-fix-before-5.1)

`backend/tests/integration/plaudApplaudSchemaDrift.test.mjs`:

- Migrate a real Postgres test DB up via the Slice 5.1 migration
- Introspect `plaud_clips` schema:
  - `clip_source` exists, `VARCHAR(32) NOT NULL DEFAULT 'manual_upload'`, CHECK constraint enforces `IN ('manual_upload', 'applaud_webhook')`
  - `clip_external_id` exists, nullable, no default
  - `applaud_event_id` exists, nullable, no default
- Verify partial unique index `idx_plaud_clips_external_id_source` exists with `WHERE clip_external_id IS NOT NULL`
- Introspect `plaud_webhook_nonces`:
  - composite primary key `(source, nonce)`
  - `received_at`, `expires_at` columns with correct types
  - `idx_plaud_webhook_nonces_expires_at` exists
- Verify `backend/models/PlaudClip.mjs` field declarations map to the actual DB columns:
  - `clipSource` → `clip_source` (snake_case mapping)
  - `clipExternalId` → `clip_external_id`
  - `applaudEventId` → `applaud_event_id`
- Migrate down (test DB only) and verify schema returns to pre-Phase-5 state

### 11.4 End-to-end smoke (manual, on staging)

(unchanged content from v1, plus added items below)

After deploy:
1. Set up Applaud locally on Sean's machine (per §12.1)
2. Configure Cloudflare Tunnel
3. Configure Applaud's webhook URL to point at staging SwanStudios
4. Sync 1 short Plaud recording to Plaud cloud
5. Wait 10 min for Applaud poll
6. Verify Render logs: receipt → sig OK → fetch → queued (in §6.1 step order)
7. Verify clip appears in `/dashboard/plaud-merge` UI with "Source: Applaud" badge (if Slice 5.7 shipped)
8. Multi-select clip + dummy clip + merge → review → confirm
9. Verify workout logged in client dashboard
10. **NEW (Codex must-fix-before-staging): verify Applaud retry behavior — kill audio fetch mid-flight, observe Applaud's retry; confirm retry uses fresh nonce/timestamp/signature (per §4.2.5). If retry reuses, BLOCK staging and resolve per §4.2.5 fallback plan.**

### 11.5 Failure-mode smoke

- Disable Applaud (kill the local server) — verify no clips arrive (negative test)
- Send a forged webhook (script with wrong sig) — verify 401 SIGNATURE_INVALID logged
- Send a webhook with `audio_url` pointing at `http://127.0.0.1` — verify AUDIO_URL_NOT_ALLOWED
- Send 70 webhooks in 60s — verify rate limit kicks in at 60th
- Send 6 simultaneous webhooks — verify concurrency semaphore returns 429 on 6th

---

## §12. Operational Runbook

### 12.1 Sean's home machine setup (one-time)

1. **Install Applaud:**
   ```bash
   git clone https://github.com/rsteckler/applaud
   cd applaud
   git checkout v0.5.10  # PIN to tested version
   pnpm install
   pnpm build
   ```

2. **Generate webhook secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Save to password manager + paste into Render env as `PLAUD_APPLAUD_WEBHOOK_SECRET_V1`.

3. **Configure Applaud's `.env`:**
   ```
   APPLAUD_PORT=3030
   APPLAUD_DATA_DIR=~/applaud-data
   APPLAUD_WEBHOOK_URL=https://sswanstudios.com/api/plaud/webhook/applaud
   APPLAUD_WEBHOOK_SECRET=<same-secret-as-render-env>
   APPLAUD_POLL_INTERVAL_MIN=10
   ```

4. **Start Applaud:**
   ```bash
   pnpm start
   # OR docker compose up -d
   ```

5. **Open Plaud's web app in Chrome and stay logged in** — Applaud reads the JWT session from Chrome's LocalStorage at first poll.

6. **Set up Cloudflare Tunnel:** Applaud's media server (where audio URLs point) must be internet-reachable for SwanStudios to fetch. Use Cloudflare Tunnel (free, no port-forwarding needed):
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create applaud-sean-home
   cloudflared tunnel route dns applaud-sean-home applaud-tunnel.sean.local
   cloudflared tunnel run applaud-sean-home
   ```
   Configure in `~/.cloudflared/config.yml` to forward to `http://localhost:3030`.

7. **Confirm webhook secret matches** between Applaud's `.env` and Render's `PLAUD_APPLAUD_WEBHOOK_SECRET_V1`.

### 12.2 Render env vars (production)

| Key | Value | Sensitive |
|---|---|---|
| `PLAUD_APPLAUD_WEBHOOK_ENABLED` | `true` (after staging) | No |
| `PLAUD_APPLAUD_WEBHOOK_SECRET_V1` | (generated above) | **YES** |
| `PLAUD_APPLAUD_WEBHOOK_KEY_ID` | `V1` | No |
| `PLAUD_APPLAUD_USER_ID` | `<sean's user id>` | No |
| `PLAUD_APPLAUD_MEDIA_BASE_URL` | `https://applaud-tunnel.sean.local` | No |
| `PLAUD_APPLAUD_RATE_LIMIT_PER_MIN` | `60` (default) | No |

### 12.3 Day-2 ops

- **Applaud upgrade:** test new version in dev first, update Render env's `PLAUD_APPLAUD_EXPECTED_VERSION` (used in source-pin logging), confirm webhooks still arrive.
- **Plaud session expired:** Applaud will silently stop receiving new clips. Sean re-logs into Plaud's web app in Chrome → Applaud picks up new JWT on next poll.
- **Clip stuck in 'failed':** check Render logs for the failure reason; usually means audio fetch timeout. Sean re-uploads manually via dashboard.

---

## §13. Slice Breakdown (v1.1: gates added per Codex)

Following Phase 3's slice convention.

- **Slice 5.1 — DB foundation:** migration adding `clip_source`, `clip_external_id`, `applaud_event_id`, plus `plaud_webhook_nonces` table (composite PK `(source, nonce)` per CR-2). Default values backfill correctly. Tests: §11.3 schema-drift tests + migration up/down. Adds nonce-cleanup task to existing `backend/jobs/plaudCronJobs.mjs`.
- **Slice 5.2 — Webhook signature service:** `backend/services/plaudWebhookSignature.mjs` — sign/verify/canonicalize using `req.rawBody`. Atomic nonce claim via `INSERT ON CONFLICT DO NOTHING`. Standalone, unit-tested in isolation.
- **Slice 5.3 — Audio URL allowlist + fetch service:** `backend/services/applaudAudioFetcher.mjs` — fetch with timeout/size cap + DNS-resolved private-IP rejection + `redirect: 'error'` (CR-4). URL parsed via `new URL()`, exact hostname match. Standalone, unit-tested with mocked HTTP + DNS.
- **Slice 5.4 — Webhook controller:** `backend/controllers/plaud/plaudApplaudWebhookController.mjs` — uses 5.2 + 5.3 + reuses Phase 3's storage + probe. Handler order per §6.1 (atomic nonce → fetch → probe → atomic insert). Per-route concurrency semaphore. **Pre-push gate:** Rule 42 backend audit (see §13.1).
- **Slice 5.5 — Route mounting + feature flag + raw-body capture:** `backend/routes/plaud/plaudWebhookRoutes.mjs` mounts the route conditionally on `PLAUD_APPLAUD_WEBHOOK_ENABLED === 'true'` (route file NOT loaded at all when flag off). Body parser uses `verify` hook to capture `req.rawBody` (ICR-2). Middleware order: `requireHttpsProxy` → `applaudJsonParser` → `applaudRateLimiter` → `applaudConcurrencyLimiter` → handler. **Pre-mount gate:** §13.2 startup env validation. **Pre-push gate:** Rule 42 backend audit (see §13.1).
- **Slice 5.6 — Integration tests:** §11.2 + §11.3 real-Postgres tests + concurrency + SSRF bypass + Sequelize regression.
- **Slice 5.7 — Frontend `Source: Applaud` badge:** small UI add to `PlaudClipQueue` component. Optional. Backend §18.1 Canonical Surface Receipt handles this surface.
- **Slice 5.8 — Operational runbook + Cloudflare Tunnel docs:** `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md`.
- **Slice 5.9 — Staging activation + smoke:** Sean runs the smoke against staging with real Plaud device. **Must verify Applaud retry behavior with fresh nonce per §4.2.5 before approving.**
- **Slice 5.10 — Production activation:** flip flag in prod, run real-world smoke.

Each slice gets its own Codex review per Rule 46. Total estimated: 1.5-2 days of focused work after Codex APPROVE on v1.1.

### 13.1 Rule 42 Pre-Push Backend Audit Checklist (Slices 5.4 + 5.5)

Before pushing either Slice 5.4 (webhook controller) or Slice 5.5 (route mount), run this checklist and attach output to the slice review:

```bash
# Untracked + modified-uncommitted check (the categorical Rule 42 gate)
git ls-files --others --exclude-standard backend/
git diff --name-only HEAD backend/
```

Plus the Phase 5-specific manual checks:
- [ ] Verify route file `plaudWebhookRoutes.mjs` is gated by `PLAUD_APPLAUD_WEBHOOK_ENABLED === 'true'` at the conditional mount; route file NOT imported when flag off.
- [ ] Verify `applaudJsonParser` uses `verify` hook to capture `req.rawBody`.
- [ ] Verify middleware order in route definition matches §4.1 (HTTPS check → JSON parser → rate limit → concurrency → handler).
- [ ] Verify NO `sequelize.query()` call in the controller is missing `type: QueryTypes.SELECT|INSERT|UPDATE` — grep the controller file.
- [ ] Verify NO `ANY(:array::type[])` SQL pattern anywhere in the new controller.
- [ ] Verify `clip_id` is NEVER returned in `200 ALREADY_PROCESSED` responses (Codex CR-6).
- [ ] Verify route-off returns Express 404 (no JSON body, no 503).
- [ ] Verify forged signature returns 401, not 500.
- [ ] Verify body-mutation invalidates signature (raw-body binding test passes).
- [ ] Verify `PLAUD_APPLAUD_WEBHOOK_SECRET_*` is in the logger redaction allowlist.

If any check fails: do not push. Fix and re-run the audit.

### 13.2 Startup Env Validation (Slice 5.5 mount-time gate)

The route MUST refuse to mount if any of these env conditions fail. Implementation lives in the route file's conditional mount block:

```js
async function shouldMountApplaudWebhookRoute() {
  if (process.env.PLAUD_APPLAUD_WEBHOOK_ENABLED !== 'true') {
    logger.info('[plaudApplaudWebhook] PLAUD_APPLAUD_WEBHOOK_ENABLED != true — route not mounted');
    return false;
  }

  const required = [
    'PLAUD_APPLAUD_WEBHOOK_SECRET_V1',
    'PLAUD_APPLAUD_WEBHOOK_KEY_ID',
    'PLAUD_APPLAUD_USER_ID',
    'PLAUD_APPLAUD_MEDIA_BASE_URL',
  ];
  for (const k of required) {
    if (!process.env[k]) {
      logger.error('[plaudApplaudWebhook] missing env: %s — route NOT mounted', k);
      return false;
    }
  }

  // Validate MEDIA_BASE_URL is parseable HTTPS, no credentials (Codex LOW-2)
  try {
    const u = new URL(process.env.PLAUD_APPLAUD_MEDIA_BASE_URL);
    if (u.protocol !== 'https:') {
      logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_MEDIA_BASE_URL must be HTTPS — route NOT mounted');
      return false;
    }
    if (u.username || u.password) {
      logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_MEDIA_BASE_URL must not contain credentials — route NOT mounted');
      return false;
    }
  } catch (err) {
    logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_MEDIA_BASE_URL malformed — route NOT mounted');
    return false;
  }

  // v1.2 fix (Codex HIGH-7): verify the configured KEY_ID actually resolves
  // to a usable secret via the same key-resolution function used at sig-verify
  // time. Without this, a typo'd PLAUD_APPLAUD_WEBHOOK_KEY_ID can mount the
  // public route but make every valid webhook fail at runtime.
  try {
    const activeSecret = resolveWebhookSecret(process.env.PLAUD_APPLAUD_WEBHOOK_KEY_ID);
    if (!activeSecret || activeSecret.length < 32) {
      logger.error('[plaudApplaudWebhook] active webhook secret resolved as empty or too short — route NOT mounted');
      return false;
    }
  } catch (err) {
    logger.error('[plaudApplaudWebhook] webhook secret resolution failed for KEY_ID=%s: %s — route NOT mounted',
      process.env.PLAUD_APPLAUD_WEBHOOK_KEY_ID, err.message);
    return false;
  }

  // Validate user_id resolves to a real trainer/admin
  const userId = Number(process.env.PLAUD_APPLAUD_USER_ID);
  if (!Number.isInteger(userId) || userId <= 0) {
    logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_USER_ID invalid — route NOT mounted');
    return false;
  }
  const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
  if (!user) {
    logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_USER_ID=%d does not exist — route NOT mounted', userId);
    return false;
  }
  if (!['trainer', 'admin'].includes(user.role)) {
    logger.error('[plaudApplaudWebhook] PLAUD_APPLAUD_USER_ID=%d role=%s — must be trainer/admin — route NOT mounted', userId, user.role);
    return false;
  }

  logger.info('[plaudApplaudWebhook] route mounting for user_id=%d (role=%s)', userId, user.role);
  return true;
}

// In the route mounting code:
if (await shouldMountApplaudWebhookRoute()) {
  app.use('/api/plaud/webhook', plaudWebhookRoutes);
}
```

This eliminates the H4 finding from the hostile review (no startup user_id sanity check) and prevents misconfigured deploys from accepting webhooks.

---

## §14. Decisions Log

- **D1: Single source (Applaud) in v1.** Decided 2026-05-04 by Sean. Rationale: official Plaud OAuth still gated; Applaud is a 1-day path forward with clean v2 swap-out.
- **D2: Receive-only architecture.** SwanStudios doesn't talk to Plaud. Sean's home machine handles all Plaud auth.
- **D3: Reuse Phase 3 storage pipeline.** No bifurcation of storage/encryption logic.
- **D4: HMAC-SHA256, not OAuth.** Webhook receiver auth is HMAC-only. OAuth-style bearer tokens deferred until official Plaud API.
- **D5: Synchronous audio fetch.** Webhook handler fetches audio inline, returns 200/4xx/5xx based on result. Async deferred until Render gateway timeouts become a real problem.
- **D6: Per-route mount conditional on feature flag.** Default off = route literally absent (404 on URL).
- **D7: Discard Applaud transcripts in v1.** SwanStudios runs its own fitness-tuned transcribe. Avoids dual-source quality issues.
- **D8: One trainer (Sean) in v1.** Multi-trainer routing deferred to v2.
- **D9: 25 MB audio cap.** Matches existing `PLAUD_MAX_FILE_BYTES` to keep storage/cost behavior identical to manual upload.
- **D10: Cloudflare Tunnel over ngrok for production.** Free, more stable, no public ngrok-style hostname rotation. Ngrok acceptable for dev only.

---

## §15. Open Questions — RESOLUTIONS (v1.1)

Most v1 open questions are now CLOSED per Codex review. Resolutions documented below.

- **Q1 — RESOLVED, DEFERRED.** Multi-trainer prep deferred to v2 (per §1.2 explicit out-of-scope). v1.1 ships single-trainer with `PLAUD_APPLAUD_USER_ID` env mapping. Source-scoped nonce composite key `(source, nonce)` adopted now (§7.2) as low-cost forward-compat. Adding a `plaud_webhook_sources` table is v2 work.

- **Q2 — RESOLVED, CLOSED (Codex CR-4).** Audio URL allowlist is **exact-string hostname match** via `new URL()` parser. NO regex. NO substring. Plus HTTPS-only, no credentials, no redirects, DNS-resolved private-IP rejection. Full spec in §3.3 V1.4 + §4.2 step 8.

- **Q3 — RESOLVED.** Dedicated `applaudAudioFetcher.mjs` service (Slice 5.3). More testable + cleaner separation. The existing R2 client is for outbound S3-protocol calls, wrong fit.

- **Q4 — RESOLVED.** `Plaud-Webhook-Source` version pin is **logged + recorded in plaud_clips row** (informational). NOT enforced as a reject gate in v1.1. Reason: Applaud upgrade compatibility — silently failing on a minor version bump would be worse than logging it. Future: if a compat-breaking change ships in Applaud, add an enforce list to the plan in v1.x.

- **Q5 — RESOLVED, REJECTED for v1.** No `GET /api/plaud/webhook/applaud/health` endpoint. Codex agrees: adds public attack surface, low value when Sean can just hit the URL with a no-op POST and observe 401 SIGNATURE_INVALID. If added in v1.x, must be separately threat-modeled and rate-limited.

- **Q6 — RESOLVED.** Audio fetch 5xx FROM Applaud → SwanStudios returns 500 to Applaud → Applaud retries with FRESH nonce/timestamp/signature (verified per §4.2.5). v1.1 does NOT implement local retry shim; Applaud's retry is the recovery path.

- **Q7 — RESOLVED, REJECTED for v1.** No separate `PLAUD_APPLAUD_KILL_SWITCH`. The feature flag already provides this (flip false → restart → route unmounted). Adding a runtime-checked kill switch adds complexity for marginal benefit. If Sean wants a no-restart kill, the env var change can be deployed via Render's "Save Changes → restart" which takes ~30 seconds.

- **Q8 — RESOLVED, CLOSED (Codex ICR-2).** Body parser limit is **per-route 10 KB**, applied via the route-specific `applaudJsonParser` middleware. App-wide default is unchanged (preserves Phase 3's existing limits for manual upload). See §4.1 middleware definition.

### 15.1 New Open Questions for v1.1 → Codex review

- **Q9 (NEW):** Should we add a logger-level audit of every webhook receipt to a separate audit log table (`plaud_webhook_audit`) for forensics, separate from the in-process logger? Cost: +1 small table, +1 insert per webhook. Benefit: forensic trail if attack succeeds. Recommend: defer to v1.x unless Codex asks for it.

- **Q10 (NEW):** Should `PLAUD_APPLAUD_MEDIA_BASE_URL` allow a comma-separated allowlist (e.g. for failover from Cloudflare Tunnel to ngrok)? Or strict single-value? v1.1 plan: strict single-value. Failover requires env update + restart. Consider v1.x feature.

---

## §16. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Applaud breaks due to Plaud session-format change | Medium | High (auto-ingest stops) | Document fallback to manual upload; monitor Applaud release notes; pin to tested version |
| R2 | Webhook secret leak | Low | Critical | Rotation plan documented (§4.3); secret-scan pre-commit hook covers writes (Rule 44) |
| R3 | Rate-limit bypass via distributed sources | Low | Medium | Single-source design (only configured Applaud accepted); other sources require new env config |
| R4 | Sean's home machine offline → no clips | Certain when machine is off | Low | Documented as expected; banner notification (deferred to v1.x) |
| R5 | Applaud's reverse-engineered auth gets blocked by Plaud | Medium | High | Same as R1; would need to wait for official OAuth API |
| R6 | Audio fetch DoS / SSRF via crafted audio_url | Low | High | URL allowlist (V1.4 mitigation); HTTPS-only |
| R7 | Schema drift — new columns conflict with future migrations | Low | Medium | Use prefixed naming (`clip_*`, `applaud_*`); namespace clearly |
| R8 | Replay attack window during clock skew | Low | Medium | ±5min timestamp window matches industry standard; nonce dedup catches |
| R9 | Audio file content malicious (codec exploit) | Very low | Low | ffprobe runs in subprocess (process boundary); existing PLAUD pipeline already exposed to this risk |
| R10 | Cloudflare Tunnel downtime | Very low | Low | Manual upload still works; auto-ingest delayed but not data-lost |

---

## §17. Compliance + PII

- **Trainer transcript audio = PII** (contains client names, sometimes medical context).
- **Encryption-at-rest:** existing Phase 3 AES-256-GCM cipher handles this. Webhook ingestion does NOT add a new encryption surface.
- **In-transit encryption:** HTTPS-only at the webhook receiver (V1.7 / D7). HTTPS during audio fetch from Applaud.
- **Secrets in commits:** Rule 44 — secret-scan covers all writes. The webhook secret never appears in code or docs after generation; it's pasted directly into Render env and Sean's password manager.
- **GDPR/PIPEDA delete-right:** existing Phase 3 TTL crons (24h cipher purge, 7d clip purge) cover webhook-ingested clips identically to manual-uploaded clips. No new compliance surface.
- **Data residency:** Render is in Oregon; Cloudflare is global; Sean's home machine is in California. Plaud's cloud residency is Plaud's concern, not ours. We treat Plaud as a third-party processor in our PIPEDA disclosure (already documented from the manual flow).

---

## §18. Rule 26 Canonical Surface Receipt

### §18.1 — Frontend "Source: Applaud" badge (optional Slice 5.7)

- (a) **Route file mount:** `frontend/src/routes/main-routes.tsx` line 909 — `dashboard/*` → UniversalDashboardLayout. Slice 5.7 doesn't add a new route; it modifies the existing PlaudClipQueue component used by `/dashboard/plaud-merge`. (Note: `/dashboard/plaud-merge` route mount already verified at line 909 of main-routes.tsx, commit `fdd862576`.)
- (b) **Mounted JSX page/component:** `frontend/src/pages/dashboard/PlaudMergePage.tsx` renders `<PlaudClipQueue clips={clips} ... />`. The clip queue component is what Slice 5.7 modifies.
- (c) **Consumer hook/service:** `frontend/src/hooks/usePlaudClips.ts` (existing) — fetches `/api/plaud/clips/`. Slice 5.7 needs the API to return `clip_source` in the row shape; backend Slice 5.4 adds this field.
- (d) **Frontend API path string literal:** `frontend/src/services/plaudClipService.ts:104` — `GET /api/plaud/clips/?limit=50`. No new path needed.
- (e) **Backend route match:** `backend/routes/plaud/plaudClipsRoutes.mjs` mounts `GET /` → `listClipsHandler`. The handler must include `clip_source` in its response.
- (f) **Authoritative model fields:** `backend/models/PlaudClip.mjs` (post-migration) has `clipSource`, `clipExternalId`, `applaudEventId` columns. Migration file: `migrations/20260504-plaud-applaud-source-columns.cjs`.

### §18.2 — Backend Applaud webhook route (Codex ICR-1: NEW in v1.1)

The new public-facing webhook receiver. v1 omitted this receipt entirely.

- (a) **App-level mount:** `backend/server.mjs` (or `backend/core/routes.mjs` if PLAUD routes are mounted there) — mounts `/api/plaud/*` routes. Slice 5.5 adds the conditional mount of `plaudWebhookRoutes` under `/api/plaud/webhook` ONLY if `shouldMountApplaudWebhookRoute()` resolves true (per §13.2 startup env validation).

  **CRITICAL — Codex HIGH-5: raw-body capture must survive app-wide JSON parsing.** The webhook route's `applaudJsonParser` middleware uses a `verify` hook to capture `req.rawBody`. But if `backend/server.mjs` already applies `express.json()` globally BEFORE this route's handler runs, the global parser consumes the body stream first and the route-level parser never sees raw bytes — `req.rawBody` will be missing. Slice 5.5 MUST satisfy ONE of these three options:

  **Option A (recommended):** mount `/api/plaud/webhook` BEFORE the global `express.json()` middleware in `backend/server.mjs`. The webhook route's `applaudJsonParser` then runs first and captures raw bytes; later routes use the global parser as before.
  ```js
  // backend/server.mjs — order matters
  app.use('/api/plaud/webhook', plaudWebhookRoutes);  // FIRST (has its own parser with verify hook)
  app.use(express.json());                            // SECOND (for all other routes)
  app.use('/api/...', otherRoutes);
  ```

  **Option B:** exclude this exact route from the global parser using a path filter:
  ```js
  app.use((req, res, next) => {
    if (req.path === '/api/plaud/webhook/applaud') return next();
    return express.json()(req, res, next);
  });
  ```

  **Option C:** use a route-specific raw-body parser (`express.raw({ type: 'application/json', limit: '10kb' })`) and parse JSON manually in the handler. More work, more failure modes.

  **Slice 5.5 acceptance gate:** an integration test confirming a real request reaches `applaudWebhookHandler` with `req.rawBody` populated as a `Buffer`. Test mounts the route via the actual `backend/server.mjs` middleware chain (NOT a synthetic Express app), sends a request with multi-line JSON (whitespace differences), and confirms the handler computes the expected SHA-256 hash matching what Applaud would have signed. Without this test, the mount-order assumption is unverified.
- (b) **Parent route file:** `backend/routes/plaud/plaudWebhookRoutes.mjs` (NEW in Slice 5.5). Defines `POST /applaud` → `applaudWebhookHandler`. File is NOT imported when `PLAUD_APPLAUD_WEBHOOK_ENABLED !== 'true'`.
- (c) **Middleware order (CRITICAL — must match exactly):**
  1. `requireHttpsProxy` — checks `req.headers['x-forwarded-proto'] === 'https'`; rejects with 400 HTTPS_REQUIRED otherwise
  2. `applaudJsonParser` — `express.json({ limit: '10kb', type: 'application/json', verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); } })` — captures raw bytes BEFORE JSON parse (ICR-2)
  3. `applaudRateLimiter` — 60 events/minute per process, with `Retry-After` header on 429
  4. `applaudConcurrencyLimiter` — semaphore max `PLAUD_APPLAUD_MAX_CONCURRENCY ?? 5`
  5. `applaudWebhookHandler` — main handler per §6.1
- (d) **Controller:** `backend/controllers/plaud/plaudApplaudWebhookController.mjs` (NEW in Slice 5.4). Pseudocode in §6.1.
- (e) **Services consumed (REUSED from Phase 3, no rewrite):**
  - `backend/services/plaudWebhookSignature.mjs` (NEW in Slice 5.2) — sig verify + nonce claim
  - `backend/services/applaudAudioFetcher.mjs` (NEW in Slice 5.3) — URL validation + audio fetch
  - `backend/services/audioProbeService.mjs` (Phase 3, unchanged) — probe + silence detect
  - `backend/services/plaudClipStorageDualTier.mjs` (Phase 3, unchanged) — `writeClipToDisk`
  - `backend/jobs/plaudR2MirrorWorker.mjs` (Phase 3, unchanged) — picks up mirror_jobs created by webhook handler, identical to manual upload behavior
- (f) **Authoritative model + migration:**
  - `backend/models/PlaudClip.mjs` — post-Slice-5.1 includes `clipSource`, `clipExternalId`, `applaudEventId` columns mapping to snake_case DB columns (Rule 58 schema-drift verified by §11.3 tests)
  - `backend/models/PlaudWebhookNonce.mjs` (NEW in Slice 5.1) — composite primary key model
  - Migration: `backend/migrations/20260504-plaud-applaud-source-columns.cjs`
- (g) **Tests:** §11.1, §11.1.1, §11.2, §11.3, §11.4, §11.5
- (h) **Feature flag mount conditional:** `shouldMountApplaudWebhookRoute()` per §13.2 — verifies env presence + format AND verifies `PLAUD_APPLAUD_USER_ID` resolves to a real `trainer`/`admin` user before mounting.
- (i) **Logger redaction:** `PLAUD_APPLAUD_WEBHOOK_SECRET_*` added to the redaction allowlist in `backend/utils/logger.mjs` (or whatever the project's logger redaction config is). Slice 5.5 acceptance includes a unit test confirming the secret never appears in any logger output.

### §18.3 — Sibling-sweep evidence (Rule 20)

Code paths that read `plaud_clips` and might be affected by the new columns:

- `backend/controllers/plaud/plaudListController.mjs` — list handler. Already returns row to frontend. v1.1 adds `clip_source` to the response shape (Slice 5.4). Tested in §11.2 manual-upload regression test.
- `backend/controllers/plaud/plaudUploadController.mjs` — manual upload handler. Default value `'manual_upload'` covers it without code change.
- `backend/controllers/plaud/plaudMergeController.mjs` — merge handler. Reads `plaud_clips` via `loadClipsInOrder`. New columns are nullable + defaulted, query unaffected.
- `backend/controllers/plaud/plaudMergeRequestsController.mjs` — list/detail/discard. Reads `plaud_merge_requests`, not `plaud_clips`. No impact.
- `backend/jobs/plaudCronJobs.mjs` — TTL crons read `plaud_clips`. Same as merge controller — no impact.
- `backend/jobs/plaudR2MirrorWorker.mjs` — reads `plaud_clip_mirror_jobs`, not `plaud_clips` directly. No impact.

**Conclusion:** v1.1 schema additions are non-breaking. Existing Phase 3 callers continue working unchanged. Verified by §11.2 manual-upload regression test as the canonical proof.

---

## §19. Phase Rollout Sequence

```
Day 1 (today, post-Codex APPROVE):
  - Slice 5.1: migration + tests
  - Slice 5.2: signature service + tests
  - Slice 5.3: audio fetch service + tests
  - Slice 5.4: webhook controller
  - Slice 5.5: route mounting + feature flag

Day 2:
  - Slice 5.6: integration tests against real Postgres
  - Slice 5.7: frontend badge (optional, can defer to v1.x)
  - Slice 5.8: runbook docs

Day 3:
  - Slice 5.9: staging activation + Sean smoke at home
  - Slice 5.10: production activation if staging green
  - Phase 5 closeout per Rule 48 (audit record)
```

---

## §20. Acceptance — what "done" looks like

Phase 5 is shipped when ALL of:
1. Sean's home Plaud sync produces a clip in `/dashboard/plaud-merge` queue within 15 min, with no manual intervention
2. Clip carries `clip_source='applaud_webhook'` and a "Source: Applaud" badge in the UI
3. Forged webhook (without secret) returns 401 SIGNATURE_INVALID
4. Replayed webhook (same nonce) returns `200 { success: true, event_id, status: "already_processed" }` — **NO `clip_id`** in the response (Codex CR-6/HIGH-2 fix; v1.1 §20 was contradictory with §5.4 which removes `clip_id` from this path)
5. Feature flag toggle off → route returns 404
6. All Slice 5.x test suites pass + integration tests against real Postgres pass
7. Staging smoke + production smoke complete
8. Codex APPROVE on the plan AND each slice
9. Rule 48 phase audit record landed at `docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-AUDIT-RECORD-2026-05-XX.md`
10. Rolling-last-done.md entry on session close

---

**End of Phase 5 Plan v1.**
