# Phase 5 — PLAUD Auto-Ingestion Plan v1

**Created:** 2026-05-04
**Owner:** Sean Swan + Claude Opus 4.7
**Status:** DRAFT — pre-Village, pre-Codex
**Predecessor:** Phase 3 (manual merge UI shipped 2026-05-04, commit `4eac08739`)

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

**V1.4: Audio-URL side-channel.** Webhook payload includes a URL (`audio_url`). Attacker forges a webhook with a URL pointing at an internal service (`http://localhost:8080/admin`) — SSRF. Mitigation: validate `audio_url` against allowlist of expected Applaud URL patterns (Cloudflare Tunnel hostname OR ngrok hostname OR the configured `PLAUD_APPLAUD_MEDIA_BASE_URL`). Reject any URL not matching.

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

### 4.2 Verification steps (in order, fail-closed at each)

```
function verify(req):
  # Step 1: Signature header present and well-formed
  parts = parse(req.headers['plaud-webhook-signature'])
  if not parts.t or not parts.nonce or not parts.sig:
    return reject 401 SIGNATURE_MALFORMED

  # Step 2: Timestamp within ±300 seconds
  now = unix_seconds()
  if abs(now - int(parts.t)) > 300:
    return reject 401 SIGNATURE_EXPIRED

  # Step 3: Body sha256
  body_hash = sha256_hex(req.raw_body)

  # Step 4: Build expected canonical payload
  payload = parts.t + '\n' + parts.nonce + '\n'
          + parsed.event_type + '\n' + parsed.recording_id + '\n'
          + body_hash

  # Step 5: HMAC compute + constant-time compare
  expected = hmac_sha256(PLAUD_APPLAUD_WEBHOOK_SECRET_V1, payload)
  if not constant_time_eq(expected, parts.sig):
    return reject 401 SIGNATURE_INVALID

  # Step 6: Nonce replay check (DB + in-memory LRU)
  if nonce_already_seen(parts.nonce):
    return ok 200 ALREADY_PROCESSED   (NOT 4xx — Applaud should consider this a success)
  record_nonce(parts.nonce, expire_in=600s)

  # Step 7: HTTPS check (defense-in-depth — Render terminates TLS but verify)
  if req.headers['x-forwarded-proto'] != 'https':
    return reject 400 HTTPS_REQUIRED

  # Step 8: Audio URL allowlist
  if not audio_url_matches_allowlist(parsed.audio_url):
    return reject 400 AUDIO_URL_NOT_ALLOWED

  return ok
```

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
  "clip_id": "<existing-uuid>",
  "status": "already_processed"
}
```

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

**503 — PLAUD_AUTO_INGEST_DISABLED** (returned when the route IS mounted but the feature flag is off — but per D6 the route shouldn't be mounted at all when off; this code is for the rotation window where we may temporarily mount-but-disable)

### 5.5 Rate limiting

Per-secret-version rate limit: 60 events per minute. Realistic upper bound is ~10/min from a single trainer using Plaud actively. 60 leaves headroom for backfill bursts and protects against runaway Applaud retries. Exceeding the limit returns 429 with `Retry-After` header set to seconds-until-window-reset.

### 5.6 Webhook source pin

`Plaud-Webhook-Source` header is logged and used for version-pinning detection. If Sean upgrades Applaud and the new version emits a different payload shape, the version pin in logs lets us trace breakage to the upgrade event.

---

## §6. Data Flow End-to-End

(See §2.1 ASCII diagram. This section adds the SQL- and code-level detail.)

### 6.1 Webhook handler pseudocode

```js
async function applaudWebhookHandler(req, res) {
  try {
    // §4.2 verification (steps 1-8)
    const verified = await verifyWebhookSignature(req);
    if (!verified.ok) return jsonError(res, verified.status, verified.code, verified.message);

    const { recording_id, audio_url, audio_size_bytes, audio_mimetype } = verified.parsed;

    // Optimistic dedup by clip_external_id
    const existing = await sequelize.query(
      `SELECT clip_id, status FROM plaud_clips
       WHERE clip_external_id = :rid AND user_id = :uid LIMIT 1`,
      { replacements: { rid: recording_id, uid: APPLAUD_USER_ID } }
    );
    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        event_id: verified.parsed.event_id,
        clip_id: existing[0].clip_id,
        status: 'already_processed'
      });
    }

    // Insert plaud_clips row, status='uploading', clip_source='applaud_webhook'
    const clipId = randomUUID();
    await sequelize.query(
      `INSERT INTO plaud_clips
        (clip_id, user_id, status, clip_source, clip_external_id, applaud_event_id,
         storage_ext, mimetype, expected_bytes, created_at, expires_at)
       VALUES (:clipId, :uid, 'uploading', 'applaud_webhook', :rid, :eid,
         :ext, :mime, :size, NOW(), NOW() + INTERVAL '24 hours')`,
      { replacements: { clipId, uid: APPLAUD_USER_ID, rid: recording_id,
        eid: verified.parsed.event_id, ext: pickExtFromMimetype(audio_mimetype),
        mime: audio_mimetype, size: audio_size_bytes } }
    );

    // Fetch audio from Applaud's URL (timeout 30s, max 25 MB)
    const audio = await fetchAudioWithCaps(audio_url, audio_size_bytes);
    if (audio.error) {
      await markClipFailed(clipId, audio.errorCode);
      return jsonError(res, audio.errorStatus, audio.errorCode, audio.message);
    }

    // Stage to tmp, run probe (reuse audioProbeService)
    const tmpPath = await stageAudioToTmp(audio.bytes, ext);
    let meta;
    try {
      meta = await probeFile(tmpPath);
      const silence = await detectSilence(tmpPath);
      if (silence.isSilent) {
        await markClipFailed(clipId, 'CLIP_TOO_SILENT');
        return jsonError(res, 422, 'CLIP_TOO_SILENT', 'Clip rejected: silence threshold');
      }
    } catch (err) {
      if (err instanceof ClipCorruptError) {
        await markClipFailed(clipId, 'CLIP_CORRUPT');
        return jsonError(res, 422, 'CLIP_CORRUPT', 'Clip rejected: corrupt audio');
      }
      throw err;
    }

    // Reuse plaudClipStorageDualTier write path (same as manual upload phase B)
    await writeClipToDisk({ clipId, userId: APPLAUD_USER_ID, audioBytes: audio.bytes, ext });

    // Transactional flip status='pending_merge' + insert mirror_job (same as manual upload phase C)
    await sequelize.transaction(async (tx) => {
      await sequelize.query(
        `UPDATE plaud_clips
         SET status='pending_merge', codec=:codec, sample_rate=:sr,
             channels=:ch, duration_sec=:dur
         WHERE clip_id=:clipId AND status='uploading'`,
        { replacements: { clipId, codec: meta.codec, sr: meta.sampleRate,
          ch: meta.channels, dur: meta.durationSec }, transaction: tx }
      );
      await sequelize.query(
        `INSERT INTO plaud_clip_mirror_jobs (clip_id, status, attempt_count, created_at)
         VALUES (:clipId, 'pending', 0, NOW())`,
        { replacements: { clipId }, transaction: tx }
      );
    });

    return res.status(200).json({
      success: true,
      event_id: verified.parsed.event_id,
      clip_id: clipId,
      status: 'queued'
    });

  } catch (err) {
    logger.error('[plaudApplaudWebhook] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Webhook handler error');
  }
}
```

### 6.2 Why we reuse `plaudClipStorageDualTier` directly

The manual upload pipeline goes:
```
multer.memoryStorage → req.files[i] → ffprobe → writeClipToDisk → status flip → mirror_job
```

The webhook pipeline goes:
```
HTTP fetch → audio bytes in memory → ffprobe → writeClipToDisk → status flip → mirror_job
```

Same downstream from `writeClipToDisk` onward. Zero changes to that service or anything beyond it. The webhook handler is purely an alternate "front door" for clip arrival.

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

### 7.2 New table `plaud_webhook_nonces`

```sql
CREATE TABLE plaud_webhook_nonces (
  nonce VARCHAR(64) PRIMARY KEY,
  source VARCHAR(32) NOT NULL,    -- 'applaud_webhook'
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL  -- received_at + 600s
);

CREATE INDEX idx_plaud_webhook_nonces_expires_at ON plaud_webhook_nonces(expires_at);
```

Cleanup cron (every 60s): `DELETE FROM plaud_webhook_nonces WHERE expires_at < NOW()`.

In-memory LRU layer in front of the DB nonce check (size 10000) for speed — DB is the source of truth, in-memory is an optimization.

### 7.3 Migration sequencing

Migration filename: `20260504-plaud-applaud-source-columns.cjs` (Sequelize migration).

- Phase 5.1: ship migration, code paths still use only `manual_upload` source. Zero behavior change.
- Phase 5.2: ship webhook handler with feature flag OFF.
- Phase 5.3: enable feature flag in staging (Sean's home), run smoke tests.
- Phase 5.4: enable feature flag in production.

---

## §8. Failure Modes + Retries

### 8.1 Failure mode matrix

| Failure point | Symptom | SwanStudios state | Applaud retry? | User-visible? |
|---|---|---|---|---|
| Sig verify fails | 401 | No clip row | Applaud retries with same nonce → still 401 → eventually gives up | No |
| Timestamp expired | 401 | No clip row | Applaud regenerates timestamp, retries → 200 | No |
| Audio URL not allowlisted | 400 | No clip row | Applaud doesn't retry (4xx is terminal) | No (logs only) |
| Audio fetch timeout | 500 + clip status='failed' | clip row in 'failed' state | Applaud retries → existing clip_external_id dedup → 200 already_processed → Applaud thinks it succeeded but clip stays 'failed' | YES — clip in queue with 'failed' badge. Sean would see and manually re-upload. |
| Audio fetch returns 5xx | 500 + clip status='failed' | Same as above | Same as above | Same as above |
| Audio Content-Length > 25 MB | 413 | No clip row (rejected before insert) | Applaud doesn't retry | No |
| Probe rejects (silent/corrupt) | 422 | clip status='failed' with error_code | Applaud doesn't retry (4xx) | YES — failed clip in queue |
| DB write fails | 500 | Either no row or row stuck in 'uploading' | Applaud retries → may insert duplicate ON the 2nd attempt if first insert succeeded but flip didn't | Depends — TTL cron cleans 'uploading' after 5 min |

### 8.2 Specific concerns

**FM-1: Audio fetch timeout creates a `'failed'` clip that Applaud thinks succeeded.** This is a known UX gap. Sean sees the failed clip in the queue, has to manually re-upload from his Plaud library. We document this in the runbook. v1 does NOT auto-retry from our side — that would require asynchronous reprocessing logic that's not justified for the rare case.

**FM-2: Stuck `'uploading'` row.** If the handler crashes after insert but before status flip, the row is stuck. Phase 3's existing stale-uploading TTL cron (5 min reaper) handles this — same cron that already handles manual upload crashes. Zero new code.

**FM-3: Applaud sends a malformed but signed payload.** Sig passes (correct secret), but body is missing required fields. Returns 400 INVALID_PAYLOAD. Not a security issue.

**FM-4: Silent → wait. **Plaud cloud sync is non-deterministic; Applaud poll interval is 10 min. Worst case clip arrives 12 min after recording. Documented in user-facing UX.

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
- Sig verification — correct payload + correct secret = pass
- Sig verification — wrong secret = SIGNATURE_INVALID
- Sig verification — malformed header = SIGNATURE_MALFORMED
- Sig verification — expired timestamp = SIGNATURE_EXPIRED
- Sig verification — replayed nonce = ALREADY_PROCESSED
- Sig verification — modified body = SIGNATURE_INVALID (body hash mismatch)
- Constant-time comparison — measure timing variance is negligible (statistical test)
- Audio URL allowlist — matching URL = pass; mismatching URL = AUDIO_URL_NOT_ALLOWED
- Body parser cap — 11 KB body = 413 by Express limit
- Audio Content-Length cap — fetch with 26 MB = AUDIO_TOO_LARGE
- Audio fetch timeout — slow fetch = AUDIO_FETCH_TIMEOUT after 30s
- Mimetype allowlist — unsupported = UNSUPPORTED_AUDIO_TYPE
- ClipCorruptError → 422 + clip status='failed'
- Silent clip detect → 422 + clip status='failed'
- Successful path — happy case clip_id created, mirror_job inserted, status='pending_merge'
- Idempotency — same event_id twice → both return same clip_id, ALREADY_PROCESSED on 2nd
- HTTPS check — http (X-Forwarded-Proto) → 400 HTTPS_REQUIRED
- Rate limit — 61st request in 60s window → 429
- Feature flag off — route returns 404 (not 503)

### 11.2 Integration tests

`backend/tests/integration/plaudApplaudWebhook.integration.test.mjs` (against real Postgres):
- End-to-end: signed payload → handler → clip row created → mirror_job inserted
- Same `recording_id` from two sources (manual upload + applaud_webhook) — both rows coexist (different `clip_source`)
- Concurrent inserts with same external_id — DB constraint enforces only one survives
- Nonce table cleanup — old nonces cleaned by cron; receiver still rejects within window

### 11.3 End-to-end smoke (manual)

After deploy:
1. Set up Applaud locally on Sean's machine
2. Configure Cloudflare Tunnel to expose Applaud's media server
3. Configure Applaud's webhook URL to point at staging SwanStudios (`/api/plaud/webhook/applaud`)
4. Sync 1 short Plaud recording to Plaud cloud
5. Wait 10 min for Applaud poll
6. Verify in Render logs: receipt → sig OK → fetch → queued
7. Verify in `/dashboard/plaud-merge` UI: clip appears with "Source: Applaud" badge
8. Multi-select clip + dummy clip + merge → review → confirm
9. Verify workout logged in client dashboard

### 11.4 Failure-mode smoke

- Disable Applaud (kill the local server) — verify no clips arrive (negative test)
- Send a forged webhook (script with wrong sig) — verify 401 SIGNATURE_INVALID logged
- Send a webhook with `audio_url` pointing at `http://127.0.0.1` — verify AUDIO_URL_NOT_ALLOWED
- Send 70 webhooks in 60s — verify rate limit kicks in at 60th

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

## §13. Slice Breakdown

Following Phase 3's slice convention.

- **Slice 5.1 — DB foundation:** migration adding `clip_source`, `clip_external_id`, `applaud_event_id`, plus `plaud_webhook_nonces` table. Default values backfill correctly. Tests: schema check + migration up/down.
- **Slice 5.2 — Webhook signature service:** `backend/services/plaudWebhookSignature.mjs` — sign/verify/canonicalize/nonce-cache. Standalone, unit-tested in isolation.
- **Slice 5.3 — Audio URL allowlist + fetch service:** `backend/services/applaudAudioFetcher.mjs` — fetch with timeout/size cap, URL allowlist. Standalone, unit-tested with mocked HTTP.
- **Slice 5.4 — Webhook controller:** `backend/controllers/plaud/plaudApplaudWebhookController.mjs` — uses 5.2 + 5.3 + reuses Phase 3's storage + probe.
- **Slice 5.5 — Route mounting + feature flag:** `backend/routes/plaud/plaudWebhookRoutes.mjs` mounts the route conditionally on `PLAUD_APPLAUD_WEBHOOK_ENABLED`. Body parser limit set per route.
- **Slice 5.6 — Integration tests:** real-Postgres tests covering end-to-end happy path, dedup, and failure modes.
- **Slice 5.7 — Frontend `Source: Applaud` badge:** small UI add to `PlaudClipQueue` component. Optional.
- **Slice 5.8 — Operational runbook + Cloudflare Tunnel docs:** `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md`.
- **Slice 5.9 — Staging activation + smoke:** Sean runs the smoke against staging with real Plaud device.
- **Slice 5.10 — Production activation:** flip flag in prod, run real-world smoke.

Each slice gets its own Codex review per Rule 46. Total estimated: 1-1.5 days of focused work after Codex APPROVE on the plan.

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

## §15. Open Questions (for Village + Codex review)

- **Q1:** Should we accept multiple Applaud-instance secrets (multi-trainer prep) in v1 even though only one is used? Cost: +1 column on a new `plaud_webhook_sources` table. Benefit: makes v2 multi-trainer trivial.
- **Q2:** Should the audio URL allowlist be a regex pattern or exact-string match? Regex enables wildcards; exact is safer.
- **Q3:** Should we fetch audio using the existing R2 client / fetch helper, or roll a dedicated `applaudAudioFetcher`? Dedicated is more testable; reusing existing reduces surface area.
- **Q4:** Should the `Plaud-Webhook-Source` version pin be enforced (reject if mismatch) or just logged? Logged-only is more permissive but less safe.
- **Q5:** Should we expose a `GET /api/plaud/webhook/applaud/health` for Sean to verify reachability without sending a real webhook? Adds attack surface but useful for troubleshooting.
- **Q6:** What's the right behavior when audio fetch returns 5xx FROM Applaud? Retry locally, or 500 back and let Applaud retry? v1 plan: 500 back, Applaud retries.
- **Q7:** Should we add a kill-switch separate from the feature flag? E.g. `PLAUD_APPLAUD_KILL_SWITCH=true` blocks all incoming requests with 503 even if route is mounted, for emergency response without redeploy. Feature flag already does this on next restart, but kill-switch is instant.
- **Q8:** Should the body parser limit be per-route (10 KB) or app-wide (current default)? Per-route is safer but requires per-route middleware.

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

For the optional Slice 5.7 frontend "Source: Applaud" badge.

- (a) **Route file mount:** `frontend/src/routes/main-routes.tsx` line 909 — `dashboard/*` → UniversalDashboardLayout. Slice 5.7 doesn't add a new route; it modifies the existing PlaudClipQueue component used by `/dashboard/plaud-merge`. (Note: `/dashboard/plaud-merge` route mount already verified at line 909 of main-routes.tsx, commit `fdd862576`.)
- (b) **Mounted JSX page/component:** `frontend/src/pages/dashboard/PlaudMergePage.tsx` renders `<PlaudClipQueue clips={clips} ... />`. The clip queue component is what Slice 5.7 modifies.
- (c) **Consumer hook/service:** `frontend/src/hooks/usePlaudClips.ts` (existing) — fetches `/api/plaud/clips/`. Slice 5.7 needs the API to return `clip_source` in the row shape; backend Slice 5.4 adds this field.
- (d) **Frontend API path string literal:** `frontend/src/services/plaudClipService.ts:104` — `GET /api/plaud/clips/?limit=50`. No new path needed.
- (e) **Backend route match:** `backend/routes/plaud/plaudClipsRoutes.mjs` mounts `GET /` → `listClipsHandler`. The handler must include `clip_source` in its response.
- (f) **Authoritative model fields:** `backend/models/PlaudClip.mjs` (post-migration) has `clipSource`, `clipExternalId`, `applaudEventId` columns. Migration file: `migrations/20260504-plaud-applaud-source-columns.cjs`.

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
4. Replayed webhook (same nonce) returns 200 ALREADY_PROCESSED with same clip_id
5. Feature flag toggle off → route returns 404
6. All Slice 5.x test suites pass + integration tests against real Postgres pass
7. Staging smoke + production smoke complete
8. Codex APPROVE on the plan AND each slice
9. Rule 48 phase audit record landed at `docs/ai-workflow/AI-HANDOFF/PHASE-5-PLAUD-AUTO-INGESTION-AUDIT-RECORD-2026-05-XX.md`
10. Rolling-last-done.md entry on session close

---

**End of Phase 5 Plan v1.**
