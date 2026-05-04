# Phase 3 — PLAUD Multi-Clip Merge Ingestion Plan (v3.3)
> **Author:** Claude Opus (2026-05-04)
> **Status:** v3.3 — addresses Codex Round 4 REVISE verdict (0 CRIT, 1 HIGH atomicity, 4 MED, 2 LOW = 7 narrow patches applied to v3.2 in place)
> **Predecessor docs:** v1, v2, v3, v3.1, v3.2 — all superseded by this doc
> **Codex review log:** Round 1 (5 CRIT) → v3 → Round 2 (4 CRIT, narrower) → v3.1 → Round 3 (0 CRIT, 4 HIGH) → v3.2 → Round 4 (0 CRIT, 1 HIGH) → v3.3 → Round 5 (pending)
> **Convergence trend:** CRIT 5 → 4 → 0 → 0. HIGH 6 → 6 → 4 → 1. Plan is rapidly stabilizing for APPROVE.
> **Path selected (Sean directive 2026-05-04):** Path A+ — simpler sync merge endpoint, but WITH durable state so failsafe / recovery works
> **Sean directive 2026-05-04:** "Just in case there's an error or I lose the page or there's a power outage we should be able to have backup plans or a fail safe system so that we're not deleting transcripts on accident in the middle of a process"

---

## 1. What changed from v2 → v3

### Path A+ scope (Sean's pick)

| Feature | v2 | v3 |
|---|---|---|
| Cancel-in-flight | Yes | **Deferred to Phase 3.x** (Codex CRIT #1 — sync/async mismatch) |
| Progress polling | Yes | **Deferred to Phase 3.x** (same reason) |
| Re-merge UX (1h badge) | Yes | **Deferred to Phase 3.x** (depends on async polish) |
| Idempotency-Key cache | Yes | **Deferred to Phase 3.x** — trainer-side dedup is sufficient for now |
| Durable `plaud_clips` table | NOT in v2 | **MANDATORY in v3** (Codex CRIT #2) |
| R2 mirror outbox | "async non-blocking" | **MANDATORY in v3 — outbox + retry** (Codex CRIT #3) |
| Audit row approval link | Touched apply flow contradiction | **Resolved — apply flow gets minimal `mergeRequestId` field** (Codex CRIT #5) |
| Draft persistence (browser-close recovery) | NOT in v2 | **MANDATORY in v3 — Sean's failsafe ask** |
| Custom vocab (PLAUD parity) | Not mentioned | **Hooks in Phase 3, vocab loader in 3.x** |
| Speaker diarization (PLAUD parity) | Not mentioned | **Deferred to Phase 3.x** |
| Trainer-client assignment authz | "ownership only" | **MANDATORY — verify assignment** (Codex gap #10) |
| ffmpeg presence smoke + install | Slice 3.2 buried | **Slice 3.1 first action** (Codex HIGH #3) |
| Feature flag default | `true` ships hot | **`false` — manual enable after smoke** (Codex HIGH #4) |
| Rule 50-58 compliance matrix | Not present | **§17 in v3** (Codex rule violation #6) |
| Error code taxonomy | "structured errors" | **20-code spec in §16** (Codex gap #5) |
| Env var checklist | Not present | **§19 in v3** (Codex gap #14) |
| Mobile + desktop UI quality | "responsive" but no ideation | **2-3 concept ideation gate before slice 3.8** (Codex rule violation #3 — `swan-design-router` Rule 40) |
| File 300-line cap | Some files at 300+ | **Files split per controller pattern** (Codex rule violation #2 — Rule 4) |

**Estimated effort change:** v2 was 14-20 hrs / 2,500-3,500 LOC. v3 is **20-26 hrs / 3,200-4,200 LOC** — bigger because of durable storage + safety, but simpler in flow because async polish is deferred.

---

## 2. PLAUD App Feature Research (Sean directive — research before plan finalize)

Sources reviewed:
- [Plaud Note Pro (plaud.ai)](https://www.plaud.ai/pages/plaud-note-pro)
- [Plaud NotePin (plaud.ai)](https://www.plaud.ai/products/plaud-notepin)
- [Merge Audio support article](https://support.plaud.ai/hc/en-us/articles/50609529313561-Merge-Audio)
- [How can I merge recordings?](https://support.plaud.ai/hc/en-us/articles/11091178688143-How-can-I-merge-recordings)
- [AutoFlow](https://support.plaud.ai/hc/en-us/articles/50835520394009-AutoFlow)
- [Plaud Templates blog](https://www.plaud.ai/blogs/news/plaud-templates)
- [Speaker labels + templates updates](https://www.plaud.ai/blogs/news/updates-label-the-speakers-and-create-your-own-templates)
- [Export Files](https://support.plaud.ai/hc/en-us/articles/51023259082393-Export-files)

### PLAUD features mapped to SwanStudios scope

| PLAUD feature | SwanStudios match | Phase |
|---|---|---|
| Swipe-left to merge (mobile gesture) | Multi-select checkbox + Merge button (we use multi-select pattern, more efficient for 3-5 clip batches) | 3 |
| Server-side AutoFlow (transcribe + summarize unattended) | Our merge endpoint is sync but SHORT (10-30s); AutoFlow's "browser can close" maps to our **draft persistence** | 3 |
| Custom vocabulary (industry terms) | Static SwanStudios fitness vocab passed to transcription prompt | 3 (basic) → 3.x (user-uploadable) |
| Speaker labels (Pro feature) | Trainer voice vs client voice diarization | **3.x** (Gemini supports but UX additive) |
| Multimodal input (audio + text + image) | Trainer attaches form-check photo alongside audio | **3.x** |
| Highlight key moments | Trainer marks RPE-spike moments in transcript | **3.x** |
| Export TXT/SRT/DOCX/PDF | Trainer recap email already exists in `workoutSummaryRoutes.mjs` | already shipped |
| Mind maps | Not relevant for workout logs | n/a |
| 10,000+ templates | One template: SwanStudios PT session | n/a |
| 300 min/mo free tier | Gemini cost stays trainer-bounded; defer trainer-tier limits to subscription work | already planned (subscription tiers) |
| Cross-platform (iOS / Android / Web / Desktop) | Mobile-first responsive web (Q2 confirmed); React Native already on Sean's roadmap | 3 |

### What PLAUD does NOT do that we need to be careful about

- **PLAUD does not write directly to a CRM / training platform.** It outputs to email/Notion/Slack via templates. We are the END destination, so our reliability bar is higher than PLAUD's "transcript in inbox" promise.
- **PLAUD's merge has no documented size cap or undo.** Public support pages don't list a max-clip count or how merge failures recover. We are stricter (5 clips max, 20MB cap, 24h TTL on raw audio).

### Conclusion
Sean's failsafe ask (don't lose transcripts on browser close / power outage) is exactly the experience PLAUD AutoFlow advertises ("hands-free, reliable, server delivers"). We match it via durable `plaud_merge_requests` row with encrypted transcript blob (24h TTL).

---

## 3. End-to-End User Flow (v3, with durable state)

```
1.  Trainer offloads PLAUD raw clips to laptop
2.  Opens Swan Coach Assistant OR /dashboard/plaud-merge route
3.  Drag-drops 2-5 clips into upload zone
    → POST /api/plaud/clips/upload (multipart, files[])
    → Backend writes to disk + persists row in plaud_clips
    → Backend enqueues R2 mirror upload (outbox)
    → Returns durable clipId list
4.  Frontend renders queue from GET /api/plaud/clips
    (DB-authoritative, NOT disk listing — survives Render restart)
5.  Trainer checks the clips for ONE workout, picks clientId from dropdown
6.  Click "Merge selected (N) for {clientName}"
    → POST /api/plaud/clips/merge { clipIds, clientId, date? }
    → Backend grabs per-user lock (DB row, not in-memory)
    → Backend authz check: trainer assigned to clientId? else 403
    → Backend reads clips (disk → R2 fallback)
    → Backend ffmpeg concat (timeout 120s, kill on timeout)
    → Backend buffer ≤ 20MB else 422 MERGED_AUDIO_TOO_LARGE
    → Backend transcribe via existing voiceTranscriptionService
    → Backend parse via existing workoutLogParserService
    → Backend boundary check (roster name detection)
    → Backend writes plaud_merge_requests row:
        - mergeRequestId
        - userId, clientId
        - clipIds (JSONB)
        - status: 'completed'
        - transcriptHash (sha256)
        - transcriptCipher (AES-256, 24h TTL)
        - parsedWorkoutCipher (AES-256, 24h TTL)
        - boundaryWarning JSONB
        - createdAt, expiresAt (createdAt + 24h)
    → Releases lock
    → Returns { mergeRequestId, transcript, parsedWorkout, boundaryWarning }
    Wall time: 10-30s typical
7.  Frontend renders TranscriptReviewCard (existing component, unchanged)
    → If browser closes here: state survives.
       Trainer reopens dashboard → GET /api/plaud/merge-requests?status=completed
       → Sees pending review, clicks → reads parsedWorkout from server.
8.  Trainer reviews; edits if needed
9.  Trainer clicks Confirm
    → applyParsedWorkout adds: source: 'plaud_merge', mergeRequestId
    → POST /api/admin/clients/:clientId/workouts (existing endpoint, hooks
       PlaudMergeRequest.markApproved() in afterCreate)
    → status flips to 'approved', cipher blobs DROPPED, hash retained
10. Phase 1 work guarantees the workout appears on client dashboard immediately
    with totalSets, exerciseCount, exerciseNames
11. After 1h post-merge: source clips auto-purged
12. After 24h post-creation: any unapproved plaud_merge_requests have
    transcriptCipher and parsedWorkoutCipher blanked (keep audit row + hash for reporting)
```

**Failsafe matrix:**
| Failure | What survives | Recovery |
|---|---|---|
| Browser close pre-approve | parsedWorkoutCipher in DB (24h) | Trainer reopens, sees pending merges list |
| Browser close mid-merge | clip rows + (if merge completed before close) merge_request row | Trainer reopens, sees merge in queue or completed |
| Power outage on client | server unaffected | Trainer reopens, same recovery |
| Render restart mid-merge | clip rows on R2; merge in flight is lost (FK) | Trainer re-clicks Merge — clipIds still valid (DB metadata + R2 source) |
| Render restart post-merge | merge_request row durable | Trainer reopens, sees completed merge ready for review |
| R2 outage during upload | disk write succeeds, mirror queued | Outbox retries until success |
| Disk eviction post-upload, R2 mirror succeeded | R2 has clip | readClip() falls back to R2, restores to disk |
| Disk eviction post-upload, R2 mirror still pending | clip row with status='lost' | Frontend marks unmergeable, trainer re-uploads |

---

## 4. Database Schema (NEW — Sequelize migrations)

### 4.1 `plaud_clips` (durable clip metadata)

```sql
CREATE TABLE plaud_clips (
  id                BIGSERIAL PRIMARY KEY,
  clip_id           UUID UNIQUE NOT NULL,                 -- public id, used in API
  user_id           INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  client_id         INTEGER REFERENCES "Users"(id),       -- nullable until merge
  filename_original VARCHAR(255) NOT NULL,
  storage_ext       VARCHAR(8) NOT NULL,                  -- 'mp3' | 'wav' | 'm4a' | etc
  mimetype          VARCHAR(64) NOT NULL,
  size_bytes        INTEGER NOT NULL,
  duration_sec      NUMERIC(7,2),                         -- from ffprobe; null if probe pending
  sha256            CHAR(64) NOT NULL,                    -- integrity check; dedup deferred to 3.x
  disk_path         TEXT,                                 -- /tmp/plaud/<userId>/<clipId>.<ext>; nullable if evicted
  r2_key            TEXT,                                 -- nullable if mirror still pending
  r2_mirror_status  VARCHAR(24) NOT NULL DEFAULT 'pending',
                                                          -- 'pending'|'in_flight'|'mirrored'|'failed_retryable'|'failed_terminal'
  status            VARCHAR(24) NOT NULL DEFAULT 'uploading',
                                                          -- v3.2 (Codex Round 3 HIGH #2): 'uploading' state added.
                                                          -- 'uploading' = row inserted, bytes not yet on disk
                                                          -- 'pending_merge' = bytes on disk, mirror_job created, eligible for merge
                                                          -- 'merged' = consumed by a merge_request
                                                          -- 'expired' = past 24h TTL
                                                          -- 'deleted' = soft-deleted by user
                                                          -- 'lost' = abandoned (uploading > 5min, or disk eviction without R2)
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  merged_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- v3.1 (Codex Round 2 CRIT #1 fix): EXCLUDE constraint REMOVED.
  -- It would have prevented 2+ pending_merge clips per user, breaking the
  -- core multi-clip-merge flow. Plain indexes below are sufficient.
);

CREATE INDEX plaud_clips_user_status_uploaded_idx
  ON plaud_clips (user_id, status, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX plaud_clips_expires_idx ON plaud_clips (expires_at) WHERE deleted_at IS NULL;
```

**Notes:**
- `"Users"` (PascalCase) is the canonical user table per CLAUDE.md gotcha
- `r2_mirror_status` matches Codex CRIT #3 outbox pattern (state machine documented in §4.3)
- `expires_at` lets the TTL cron be a single index scan
- `sha256` is INTEGRITY ONLY in Phase 3. Per §14, re-POST creates a duplicate row (accepted cost). Dedup behavior using sha256 is deferred to Phase 3.x. (v3.1 — Codex Round 2 MEDIUM #1 fix)

### 4.2 `plaud_merge_requests` (durable merge state — replaces v2's "merge_audit" idea)

```sql
CREATE TABLE plaud_merge_requests (
  id                       BIGSERIAL PRIMARY KEY,
  merge_request_id         UUID UNIQUE NOT NULL,
  user_id                  INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  client_id                INTEGER NOT NULL REFERENCES "Users"(id),
  clip_ids                 JSONB NOT NULL,                          -- ['uuid1','uuid2',...]
  status                   VARCHAR(24) NOT NULL DEFAULT 'processing',
                                                                    -- v3.1 (Codex Round 2 HIGH #1):
                                                                    -- 'processing' = row inserted before ffmpeg/transcribe/parse
                                                                    -- 'completed'  = parse succeeded, awaiting trainer review
                                                                    -- 'failed'     = ffmpeg/transcribe/parse error, error_code populated
                                                                    -- 'approved'   = trainer confirmed, workout logged, cipher purged
                                                                    -- 'discarded'  = trainer rejected, cipher purged
                                                                    -- 'expired'    = 24h TTL hit, cipher purged
  transcript_hash          CHAR(64),                                -- sha256 of merged transcript; null while processing
  -- v3.1 (Codex Round 2 CRIT #2 fix): single AES-256-GCM payload (Option A from Codex).
  -- Combined JSON `{ transcript: "...", parsedWorkout: {...} }` encrypted with one IV+tag pair.
  -- This avoids the IV-reuse trap of two separate ciphers sharing one IV.
  payload_cipher           BYTEA,                                   -- AES-256-GCM(JSON.stringify({transcript, parsedWorkout}))
  payload_iv               BYTEA,                                   -- 12-byte IV (per row, unique under key)
  payload_tag              BYTEA,                                   -- 16-byte auth tag
  cipher_key_id            VARCHAR(64),                             -- key version for rotation support
  error_code               VARCHAR(48),                             -- when status='failed', from §16 taxonomy
  boundary_warning         JSONB,                                   -- { detectedNames, confidence } or null
  parsed_exercise_count    INTEGER,
  approved_workout_form_id INTEGER REFERENCES "DailyWorkoutForms"(id), -- back-link after approve (table name verified §17.2)
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ,                             -- when status flipped processing→completed
  approved_at              TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  cipher_purged_at         TIMESTAMPTZ                              -- when expires_at hit, payload_cipher cleared, hash retained
);

CREATE INDEX plaud_merge_requests_user_status_idx
  ON plaud_merge_requests (user_id, status, created_at DESC);
CREATE INDEX plaud_merge_requests_expires_idx
  ON plaud_merge_requests (expires_at) WHERE cipher_purged_at IS NULL;
```

**Privacy posture:**
- Raw transcript stored ENCRYPTED with 24h hard TTL — PII risk-accepted in §7.1 (no other tenable way to support draft persistence Sean explicitly asked for)
- Single combined `payload_cipher` blob holds `{ transcript, parsedWorkout }` JSON (v3.1 fix — was two separate ciphers sharing one IV which is GCM-unsafe)
- Encryption key selected by `PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID` (e.g. `V2`); encrypt uses `PLAUD_TRANSCRIPT_ENCRYPTION_KEY_<KEYID>` (e.g. `PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V2`). Decrypt loads `PLAUD_TRANSCRIPT_ENCRYPTION_KEY_<row.cipher_key_id>` based on the row's stored key id. Each key is 32 bytes, base64-encoded. (v3.3 — Codex Round 4 MEDIUM #2 fix: removed unversioned env name reference.)
- `cipher_purged_at` records the TTL purge event for audit trail
- Hash is permanent (audit) — auditable without leaking content
- `processing` status survives crash mid-merge; trainer reopens dashboard, sees the in-flight or recently-failed merge with appropriate UI (v3.1 — Codex HIGH #1 fix)

### 4.3 `plaud_clip_mirror_jobs` (R2 mirror outbox — Codex CRIT #3)

```sql
CREATE TABLE plaud_clip_mirror_jobs (
  id              BIGSERIAL PRIMARY KEY,
  clip_id         UUID NOT NULL UNIQUE REFERENCES plaud_clips(clip_id) ON DELETE CASCADE,
                                                       -- v3.1 (Codex Round 2 MEDIUM #3): UNIQUE prevents duplicate jobs per clip
  attempts        SMALLINT NOT NULL DEFAULT 0,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          VARCHAR(24) NOT NULL DEFAULT 'pending',
                                                       -- v3.1 (Codex Round 2 CRIT #3 fix): full state machine documented:
                                                       -- 'pending'          = freshly created, awaiting first attempt
                                                       -- 'in_flight'        = worker has picked it up, mid-upload
                                                       -- 'mirrored'         = R2 upload succeeded; terminal success
                                                       -- 'failed_retryable' = upload failed, will retry per backoff schedule
                                                       -- 'failed_terminal'  = max attempts hit; will not retry; alert logged
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX plaud_clip_mirror_jobs_next_retry_idx
  ON plaud_clip_mirror_jobs (next_retry_at) WHERE status IN ('pending', 'failed_retryable');
```

**State machine** (v3.1 — Codex CRIT #3 fix):
```
pending           → in_flight (worker picks up)
in_flight         → mirrored OR failed_retryable
failed_retryable  → in_flight (next retry window)
failed_retryable  → failed_terminal (after max 5 attempts)
mirrored          [terminal — no transitions]
failed_terminal   [terminal — alert logged]
```

**Worker query** (v3.1 fix — was polling only `pending`, missed `failed_retryable`):
```sql
SELECT * FROM plaud_clip_mirror_jobs
WHERE status IN ('pending', 'failed_retryable')
  AND next_retry_at <= NOW()
ORDER BY next_retry_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED
```

**Stale `in_flight` recovery** (v3.2 — Codex Round 3 HIGH #1 fix):
The worker runs in-process on Render. If the web service restarts mid-upload, jobs left in `in_flight` would never recover. The worker MUST sweep stale `in_flight` rows on every cycle (and once at startup):

```sql
UPDATE plaud_clip_mirror_jobs
SET status        = 'failed_retryable',
    next_retry_at = NOW(),
    last_error    = 'Recovered stale in_flight after worker restart',
    updated_at    = NOW()
WHERE status     = 'in_flight'
  AND updated_at < NOW() - INTERVAL '5 minutes';
-- In same transaction: align plaud_clips.r2_mirror_status accordingly.
```

`backend/jobs/plaudR2MirrorWorker.mjs` polls every 30s:
1. Sweep stale `in_flight` rows (>5min idle) → `failed_retryable`
2. Claim batch via `SELECT ... FOR UPDATE SKIP LOCKED` (above) and flip to `in_flight`
3. Upload to R2; on success → `mirrored`; on failure → `failed_retryable` (or `failed_terminal` after 5 attempts)
4. On each transition, **also update `plaud_clips.r2_mirror_status` atomically in same transaction** so the two tables stay in sync.

Backoff schedule: 30s, 1m, 5m, 30m, 2h. After 5 attempts → `failed_terminal` + alert log.

### 4.4 Migration rollback (Codex gap #7 + Round 2 HIGH #5 — locks added)

```bash
# Rollback in reverse FK / dependency order:
npx sequelize-cli db:migrate:undo --name <timestamp>-create-plaud-merge-locks.cjs
npx sequelize-cli db:migrate:undo --name <timestamp>-create-plaud-clip-mirror-jobs.cjs
npx sequelize-cli db:migrate:undo --name <timestamp>-create-plaud-merge-requests.cjs
npx sequelize-cli db:migrate:undo --name <timestamp>-create-plaud-clips.cjs
# Plus: clean up R2 bucket objects, /tmp/plaud directories
node scripts/plaud-cleanup-orphans.mjs --dry-run --then-execute
```

---

## 5. API Surface (NEW endpoints — v3 simplified)

All under `/api/plaud/*`. Mounted via `backend/core/routes.mjs`. Auth: `protect + authorize(['admin','trainer'])` for all.

### 5.1 `POST /api/plaud/clips/upload`
Multipart: `files[]` (1-5 clips, total ≤ 30MB raw, per-file ≤ 20MB).
**Steps:**
1. Auth + role + rate-limit (10 files/15min/user)
2. multer memoryStorage with 30MB total limit
3. For each file: ffprobe-validate codec/container/duration, mean/max volume check
4. Reject if `mean_volume < -50dB AND max_volume < -30dB` → `422 CLIP_TOO_SILENT`
5. **Two-phase write to avoid durable-row-without-bytes** (v3.2 — Codex Round 3 HIGH #2 fix, Option B):
   - **Phase 5a:** INSERT plaud_clips with `status='uploading'` (no mirror_job yet, NOT yet eligible for merge)
   - **Phase 5b:** Write file to disk; await `fsync` close
   - **Phase 5c:** Within a Sequelize transaction:
     - UPDATE plaud_clips SET status='pending_merge' WHERE clip_id=$ AND status='uploading'
     - INSERT plaud_clip_mirror_jobs (status='pending')
   - **Crash windows:**
     - Crash between 5a and 5b → row stuck in `uploading`. Cron sweeps `uploading` rows older than 5 min → status='lost'
     - Crash between 5b and 5c → bytes on disk but row still `uploading`. Same cron sweep handles it (loses the bytes — acceptable; trainer re-uploads)
     - Crash during 5c → transaction rolls back, row stays `uploading`. Same cron sweep
   - Workers and merge endpoint NEVER see `uploading` clips, so no premature merge attempt
6. Return durable clip metadata (after Phase 5c commits)
**Response:** `200 { success, clips: [...], rejected: [...] }`

**`plaud_clips.status` enum updated** (v3.2): adds `'uploading'`. Full set: `'uploading' | 'pending_merge' | 'merged' | 'expired' | 'deleted' | 'lost'`. Update §4.1 schema comment + the partial index `WHERE deleted_at IS NULL` already covers all states.

### 5.2 `GET /api/plaud/clips?limit=20&cursor=...`
DB-authoritative listing of trainer's pending clips. Cursor = base64(`uploadedAt|clipId`).
**Response:** `200 { clips, nextCursor, hasMore }`

### 5.3 `DELETE /api/plaud/clips/:clipId`
Owner-only. Soft-delete (status='deleted', deleted_at=NOW()). Mirror job + disk cleanup async.

### 5.4 `POST /api/plaud/clips/merge`
**Body:** `{ clipIds: ['uuid'], clientId, date?, orderMode?: 'provided'|'uploadedAt' }` (default `'provided'` per Codex HIGH #1).
**Cardinality:** 2-5 clips required (v3.1 — Codex Round 2 MEDIUM #2 fix). Single-clip flow uses the existing `/api/workout-logs/upload` endpoint, NOT this one. `clipIds.length < 2` returns `400 TOO_FEW_CLIPS`.

**Pipeline (v3.1 — Codex Round 2 HIGH #1 + HIGH #2 + HIGH #3 fixes):**
1. Auth + role check
2. **Trainer-client assignment check:** verify `req.user.id` has active `ClientTrainerAssignment` to `clientId` (or req.user.role==='admin'). 403 `NOT_ASSIGNED_TO_CLIENT` else.
3. Validate clipIds (2-5 owned, status='pending_merge', not expired). Reject with 400/404/410/403 as applicable BEFORE acquiring lock.
4. **Acquire DB lock atomically with expired-lock takeover** (Codex Round 2 HIGH #2):
   ```sql
   INSERT INTO plaud_merge_locks (user_id, job_id, locked_until)
   VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
   ON CONFLICT (user_id) DO UPDATE
     SET job_id       = EXCLUDED.job_id,
         locked_at    = NOW(),
         locked_until = EXCLUDED.locked_until
     WHERE plaud_merge_locks.locked_until < NOW()
   RETURNING user_id;
   ```
   Empty result (active live lock) → 409 `MERGE_IN_PROGRESS`. Otherwise own the lock.
5. **Insert plaud_merge_requests row with `status='processing'`** (Codex Round 2 HIGH #1 — durable in-progress record). transcript_hash, payload_cipher, payload_iv, payload_tag, completed_at all NULL at this point.
6. Read each clip: disk first → R2 fallback. Any miss → update merge_request status='failed' with error_code, return 410/404.
7. **Audio normalization for mixed containers** (Codex Round 2 HIGH #3): for each clip, ffmpeg-encode to a uniform intermediate (mono 24kHz MP3 64kbit) in `/tmp/plaud/_normalized/<mergeRequestId>/N.mp3`. Then concat the normalized files. Test fixtures must include mixed `.m4a` + `.wav` + `.mp3` batch.
8. ffmpeg concat the normalized files (subprocess.spawn, no shell, 120s timeout, kill on timeout)
9. Buffer ≤ 20MB else 422 `MERGED_AUDIO_TOO_LARGE` (update merge_request status='failed')
10. Transcribe (existing service)
11. Parse (existing service, with custom vocab from `backend/data/plaud-fitness-vocab.json`)
12. Boundary check (roster fuzzy match, Levenshtein ≤ 1 for names ≥ 5 chars only — Codex Round 1 MEDIUM finding)
13. **Encrypt** combined `{ transcript, parsedWorkout }` JSON via AES-256-GCM into single payload_cipher with new IV (Codex Round 2 CRIT #2 fix)
14. **Atomic finalization** (v3.3 — Codex Round 4 HIGH fix: fence + side effects + lock release MUST be one transaction):
    Open a single Sequelize transaction wrapping ALL of:
    - Lock fence (SELECT FOR UPDATE on the lock row — prevents takeover during finalization)
    - Merge request completed-update
    - Clip status update with conditional WHERE
    - Lock release

    ```sql
    BEGIN;

    -- Step 14a: fence with FOR UPDATE
    SELECT 1 FROM plaud_merge_locks
    WHERE user_id = $userId
      AND job_id = $mergeRequestId
      AND locked_until > NOW()
    FOR UPDATE;
    -- If 0 rows: ROLLBACK; in a separate transaction mark this merge_request
    -- status='failed', error_code='MERGE_LOCK_LOST'; return 409.

    -- Step 14b: complete the merge_request
    UPDATE plaud_merge_requests
    SET status                = 'completed',
        transcript_hash       = $hash,
        payload_cipher        = $cipher,
        payload_iv            = $iv,
        payload_tag           = $tag,
        cipher_key_id         = $keyId,
        parsed_exercise_count = $count,
        boundary_warning      = $warning,
        completed_at          = NOW()
    WHERE merge_request_id = $mergeRequestId
      AND status           = 'processing';

    -- Step 14c: mark clips merged with WHERE guard (Codex Round 4 MEDIUM #4)
    UPDATE plaud_clips
    SET status     = 'merged',
        merged_at  = NOW()
    WHERE user_id    = $userId
      AND clip_id    = ANY($clipIds)
      AND status     = 'pending_merge'
      AND deleted_at IS NULL;
    -- Affected row count MUST equal clipIds.length else ROLLBACK and fail with
    -- CLIP_NOT_FOUND / CLIP_EXPIRED / CLIP_NOT_OWNED depending on re-read state.

    -- Step 14d: release lock
    DELETE FROM plaud_merge_locks
    WHERE user_id = $userId
      AND job_id  = $mergeRequestId;

    COMMIT;
    ```

    On any failure within the transaction (fence empty, row count mismatch, DB error) → ROLLBACK + write `MERGE_LOCK_LOST` (or appropriate error code) to merge_request status in a separate write + return 409 to caller. NO partial state leaks (no half-marked clips, no stale lock, no released lock without completion).

15. After transaction commit: return `{ mergeRequestId, transcript, parsedWorkout, boundaryWarning }`

**Heartbeat for long jobs** (Codex Round 1 HIGH #2): during transcribe/parse, every 5 min update `plaud_merge_locks.locked_until = NOW() + INTERVAL '15 minutes'`. If process dies, lock expires within 15 min and cron sweep reclaims; new merge attempt by the same user can take over per the atomic-with-expired-takeover query above.

**Stale `processing` sweeper** (v3.2 — Codex Round 3 HIGH #3 fix):
A new cron `plaudStaleMergeSweeper` runs every 5 min:
```sql
UPDATE plaud_merge_requests mr
SET status     = 'failed',
    error_code = 'MERGE_PROCESSING_STALE'
WHERE mr.status     = 'processing'
  AND mr.created_at < NOW() - INTERVAL '20 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM plaud_merge_locks l
    WHERE l.job_id = mr.merge_request_id
      AND l.locked_until > NOW()
  );
```
This prevents `processing` rows from getting stuck forever after server crash. UI surfaces failed merges with an explicit "Previous merge was interrupted. Please retry." copy.

**Wall time budget:** 30s p95, 60s soft target, ffmpeg subprocess hard cap 120s, transcribe + parse can extend to 5min for large batches (heartbeat keeps lock alive).

**Cleanup of normalized intermediate files:** in `finally` block, regardless of success/failure.

### 5.5 `GET /api/plaud/merge-requests?status=processing,completed,failed&limit=20`
**NEW for v3 — Sean's failsafe ask.**

v3.1 — Codex Round 2 MEDIUM #5 fix: list endpoint returns **METADATA ONLY**, NOT decrypted content. PII surface stays small in list responses.

**List response (per row):**
```
{
  mergeRequestId,
  status,                  // 'processing' | 'completed' | 'failed' | 'expired'
  clientId, clientName,    // resolved client-side from roster
  clipCount,
  parsedExerciseCount,     // null while processing
  boundaryWarning,         // null when processing
  hasCipher,               // boolean
  cipherPurged,            // boolean
  errorCode,               // when status='failed'
  createdAt, completedAt, expiresAt
}
```

### 5.5b `GET /api/plaud/merge-requests/:mergeRequestId` (NEW)
Detail endpoint. Returns decrypted `transcript + parsedWorkout` for ONE merge request only. This is the endpoint the TranscriptReviewCard hits when trainer opens a pending review.
- 404 if not found OR ownership mismatch
- 410 with `{ cipherPurged: true, transcriptHash }` if cipher dropped (24h TTL hit)
- 410 with `{ status: 'expired' }` if expired
- 200 `{ ...full row..., transcript, parsedWorkout }` otherwise

### 5.6 `POST /api/plaud/merge-requests/:mergeRequestId/discard`
Trainer rejects the parsed workout (didn't fit, errored). Marks status='discarded', purges cipher (sets payload_cipher/payload_iv/payload_tag to NULL, sets cipher_purged_at=NOW()).

### 5.7 NO new log endpoint — apply uses existing path with GUARDED approval
Existing `POST /api/admin/clients/:clientId/workouts` augmented to read `source: 'plaud_merge'` + `mergeRequestId` from body.

**v3.1 — Codex Round 2 CRIT #4 fix: guarded UPDATE invariants.**
Hook fires `PlaudMergeRequest.markApproved({ mergeRequestId, formId, actingUserId, actingUserRole, clientId, transaction })` which performs:

```sql
UPDATE plaud_merge_requests
SET status                   = 'approved',
    approved_workout_form_id = $formId,
    approved_at              = NOW(),
    payload_cipher           = NULL,
    payload_iv               = NULL,
    payload_tag              = NULL,
    cipher_purged_at         = NOW()
WHERE merge_request_id = $mergeRequestId
  AND client_id        = $clientId
  AND status           = 'completed'
  AND ($actingUserRole = 'admin' OR user_id = $actingUserId)
  AND approved_workout_form_id IS NULL
RETURNING id;
```

If `RETURNING` is empty, throw `MergeApprovalForbidden` → calling controller MUST roll back the workout-form INSERT (Sequelize transaction wraps both writes) and return 409 `MERGE_NOT_APPROVABLE` to the trainer. This prevents:
- Wrong-trainer approval via stolen/guessed UUID
- Mismatched-client approval (UUID belongs to different client than route params)
- Stale-frontend re-approval of already-approved row
- Approval of `processing`/`failed`/`discarded`/`expired` rows
- Race-double-approval (only first wins because `approved_workout_form_id IS NULL` becomes false)

---

## 6. Authorization model (Codex gap #10)

```
| Action                        | Required role | Plus check                                    |
|-------------------------------|---------------|-----------------------------------------------|
| upload clip                   | trainer/admin | -                                             |
| list own clips                | trainer/admin | -                                             |
| delete own clip               | trainer/admin | clip.user_id === req.user.id                  |
| merge clips → for clientId    | trainer/admin | clip.user_id === req.user.id (all clips)      |
|                               |               | AND active ClientTrainerAssignment(req.user.id, clientId) |
|                               |               | OR req.user.role === 'admin'                  |
| list own merge requests       | trainer/admin | -                                             |
| discard own merge request     | trainer/admin | mergeRequest.user_id === req.user.id          |
| apply (existing endpoint)     | trainer/admin | (existing checks unchanged)                   |
```

`ClientTrainerAssignment.isActive(trainerId, clientId)` helper to be added in `backend/services/clientTrainerAssignmentService.mjs` if not present.

---

## 7. PII / Privacy posture (Codex CRIT #4 + HIGH #5,#6 + Rule violation #1)

### 7.1 Risk acceptance (explicit)
**This feature intentionally sends client-identifying audio to the configured transcription LLM (Gemini) under Sean's approved privacy proxy posture.** Audio contains:
- Client first/last names (Sean speaks them at session start)
- Client physical state references (form quality, pain notes)
- Workout content (exercises, sets, reps, weights, RPE)

This is **NOT** new PII exposure beyond the existing single-clip path (`/api/workout-logs/upload`). Phase 3 inherits the same risk profile.

### 7.2 Storage controls (v3.2 — Codex Round 3 MEDIUM #2 fix: column names match §4.2)
- **Disk:** `/tmp/plaud/<userId>/` mode 0700, files mode 0600
- **R2:** private bucket, server-side AES-256, scoped credentials, object keys are UUIDs (unguessable), 7-day lifecycle backstop (Codex MEDIUM finding — was 30 days)
- **Postgres encryption:** single combined `payload_cipher` column + `payload_iv` + `payload_tag` + `cipher_key_id` AES-256-GCM at app layer; key from `PLAUD_TRANSCRIPT_ENCRYPTION_KEY_<KEYID>` env (NOT in DB)
- **24h hard TTL** on raw audio (R2 + disk) AND on cipher blobs (Postgres)
- **Approval drops cipher** — once trainer approves and workout is logged, `payload_cipher`, `payload_iv`, `payload_tag` set to NULL, `cipher_purged_at` recorded
- **Hash retained** permanently for audit/dispute trail

### 7.3 HIPAA / health-data posture
SwanStudios is NOT under HIPAA (PT services, not covered entity). Family medical context is for Sean's own Hermes (out of scope). However, Phase 3 follows HIPAA-adjacent best practices:
- Encryption at rest (Postgres + R2)
- Encryption in transit (TLS for all)
- Minimum necessary retention (24h)
- Audit log (plaud_merge_requests row + workout_form back-link)
- Access controls (trainer + assignment check)

### 7.4 Logging discipline
- **NEVER log raw transcript text** (only logger.info with mergeRequestId, clipCount, statusCodes)
- **NEVER log cipher blobs**
- ffmpeg stderr captured but PII-scrubbed (file paths only, not content) before logger.warn

---

## 8. File Map (v3 — split per Codex Rule 4 violation #2)

### 8.1 NEW backend files

| File | Purpose | LOC est |
|---|---|---|
| `backend/routes/plaud/plaudClipsRoutes.mjs` | upload + list + delete (3 endpoints, slim) | ~180 |
| `backend/routes/plaud/plaudMergeRoutes.mjs` | merge + list-pending + discard (3 endpoints) | ~190 |
| `backend/controllers/plaud/plaudUploadController.mjs` | upload handler logic | ~140 |
| `backend/controllers/plaud/plaudListController.mjs` | list + cursor pagination | ~110 |
| `backend/controllers/plaud/plaudMergeController.mjs` | merge orchestration | ~220 |
| `backend/controllers/plaud/plaudMergeRequestsController.mjs` | list-pending + discard | ~120 |
| `backend/services/plaudClipStorageDualTier.mjs` | disk + R2 read/write/delete | ~240 |
| `backend/services/plaudR2MirrorService.mjs` | outbox writer (called by upload controller) | ~100 |
| `backend/services/audioMergeService.mjs` | ffmpeg subprocess (spawn, no shell) | ~180 |
| `backend/services/audioProbeService.mjs` | ffprobe wrapper for duration + volume + codec | ~130 |
| `backend/services/clientNameBoundaryDetector.mjs` | roster name detection | ~150 |
| `backend/services/plaudCipherService.mjs` | AES-256-GCM encrypt/decrypt for transcript | ~80 |
| `backend/services/plaudMergeLockService.mjs` | DB-backed lock acquire/release/sweep | ~90 |
| `backend/services/clientTrainerAssignmentService.mjs` | (new helper if missing) `isActive(trainerId, clientId)` | ~60 |
| `backend/services/fitnessTranscriptionVocabService.mjs` | static vocab loader (PLAUD parity) | ~50 |
| `backend/middleware/plaudAuthz.mjs` | trainer-client assignment check | ~80 |
| `backend/jobs/plaudR2MirrorWorker.mjs` | outbox poller (30s interval) | ~140 |
| `backend/jobs/plaudClipTtlCron.mjs` | 24h clip purge + 1h re-merge purge + lock sweep | ~150 |
| `backend/jobs/plaudCipherPurgeCron.mjs` | 24h cipher blob purge | ~80 |
| `backend/models/PlaudClip.mjs` | Sequelize model | ~120 |
| `backend/models/PlaudMergeRequest.mjs` | Sequelize model + markApproved hook | ~140 |
| `backend/models/PlaudClipMirrorJob.mjs` | Sequelize model | ~80 |
| `backend/migrations/<ts>-create-plaud-clips.cjs` | migration | ~80 |
| `backend/migrations/<ts>-create-plaud-merge-requests.cjs` | migration | ~80 |
| `backend/migrations/<ts>-create-plaud-clip-mirror-jobs.cjs` | migration | ~70 |
| `backend/migrations/<ts>-create-plaud-merge-locks.cjs` | migration | ~50 |
| `backend/data/plaud-fitness-vocab.json` | static vocab list (~200 fitness/anatomy terms) | data |
| `backend/utils/plaudClipDiskPaths.mjs` | per-user dir helper, sanitizer | ~60 |

### 8.2 NEW backend tests

| File | Purpose | LOC est |
|---|---|---|
| `backend/__tests__/plaud/plaudClipsRoutes.test.mjs` | upload/list/delete endpoint regression | ~280 |
| `backend/__tests__/plaud/plaudMergeRoutes.test.mjs` | merge + list-pending + discard regression | ~300 |
| `backend/__tests__/plaud/plaudClipStorageDualTier.test.mjs` | disk + R2 fallback + outbox | ~250 |
| `backend/__tests__/plaud/audioMergeService.test.mjs` | ffmpeg success + timeout + cancel + cleanup | ~200 |
| `backend/__tests__/plaud/audioProbeService.test.mjs` | ffprobe duration + silent detection | ~150 |
| `backend/__tests__/plaud/clientNameBoundaryDetector.test.mjs` | name detection edge cases | ~220 |
| `backend/__tests__/plaud/plaudCipherService.test.mjs` | AES-256-GCM round-trip | ~120 |
| `backend/__tests__/plaud/plaudMergeLockService.test.mjs` | lock acquire/conflict/sweep | ~150 |
| `backend/__tests__/plaud/plaudAuthz.test.mjs` | trainer-client assignment middleware | ~120 |

### 8.3 NEW frontend files

| File | Purpose | LOC est |
|---|---|---|
| `frontend/src/components/PlaudClipMerge/PlaudClipUploader.tsx` | multi-file picker + drag-drop | ~180 |
| `frontend/src/components/PlaudClipMerge/PlaudClipQueue.tsx` | DB-authoritative list, multi-select, swipe-left delete on mobile | ~240 |
| `frontend/src/components/PlaudClipMerge/PlaudMergeBoundaryBanner.tsx` | warning banner | ~100 |
| `frontend/src/components/PlaudClipMerge/PlaudClipMergePanel.tsx` | orchestrator state machine | ~280 |
| `frontend/src/components/PlaudClipMerge/PlaudPendingReviewsList.tsx` | "Resume your pending reviews" UI for failsafe | ~160 |
| `frontend/src/hooks/usePlaudClipQueue.ts` | API client hook | ~150 |
| `frontend/src/hooks/usePlaudPendingReviews.ts` | resume-from-server hook | ~100 |
| `frontend/src/services/plaudClipService.ts` | upload/list/delete wrapper | ~140 |
| `frontend/src/services/plaudMergeService.ts` | merge/list-pending/discard wrapper | ~120 |
| `frontend/src/pages/dashboard/PlaudMergePage.tsx` | standalone `/dashboard/plaud-merge` route | ~180 |
| `frontend/src/components/PlaudClipMerge/__tests__/PlaudClipQueue.test.tsx` | queue interaction (touch + mouse) | ~220 |
| `frontend/src/components/PlaudClipMerge/__tests__/PlaudClipMergePanel.test.tsx` | state machine | ~280 |
| `frontend/src/components/PlaudClipMerge/__tests__/PlaudPendingReviewsList.test.tsx` | resume flow | ~160 |

### 8.4 MODIFIED files (small but real touches — Codex CRIT #5 fix)

| File | Why | Approx delta |
|---|---|---|
| `backend/core/routes.mjs` | mount plaud routers | +4 lines |
| `backend/routes/dailyWorkoutFormRoutes.mjs` | accept optional `source` + `mergeRequestId` in POST body, call `PlaudMergeRequest.markApproved()` on successful save | +20 lines |
| `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useTranscriptIntake.ts` | when source==='plaud_merge', include mergeRequestId in apply payload | +10 lines |
| `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx` | add "Merge clips" entry point + show pending reviews badge | +30 lines |
| `frontend/src/components/DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload.ts` | pass through mergeRequestId | +5 lines |
| `package.json` (backend) | NO new deps (child_process built-in) | 0 |

### 8.5 NOT touched
- `voiceTranscriptionService.mjs`
- `workoutLogParserService.mjs`
- `workoutLogUploadRoutes.mjs` (single-clip path stays untouched)

---

## 9. Slice Breakdown (v3 — re-ordered per Codex HIGH #3, tests in each slice per Rule violation #4)

| Slice | Scope | Sliceable artifact |
|---|---|---|
| **3.1** | DB foundation: 4 migrations (plaud_clips, plaud_merge_requests, plaud_clip_mirror_jobs, plaud_merge_locks) + 3 Sequelize models + ffmpeg/ffprobe presence smoke + Render Build Command update if absent + slice tests | green migrations, ffmpeg verified |
| **3.2** | Audio probe service (ffprobe duration + volume + codec) + tests | service unit-tested, used by next slice |
| **3.3** | Dual-tier storage service + R2 mirror service + outbox worker + tests | service unit-tested + worker green |
| **3.4** | Cipher service (AES-256-GCM) + merge lock service + lock sweep cron + tests | privacy primitives ready |
| **3.5** | Upload + list + delete endpoints (`plaudClipsRoutes`) + plaudAuthz middleware + tests | endpoints live, no merge yet |
| **3.6** | Audio merge service (ffmpeg subprocess) + tests | merge primitive ready |
| **3.7** | Merge endpoint + list-pending + discard endpoints + clientNameBoundaryDetector + fitness vocab service + tests | merge endpoint complete + boundary warning |
| **3.8** | Apply path augmentation (dailyWorkoutFormRoutes accepts source + mergeRequestId, markApproved hook) + tests | end-to-end backend |
| **3.9** | TTL cron jobs (clip TTL, cipher TTL) + final backend integration test | green backend regression |
| **3.10** | Frontend: services + hooks + design ideation gate (2-3 concept directions per `swan-design-router` Rule 40) + tests | services wired, design direction approved by Sean |
| **3.11** | Frontend: PlaudClipUploader + PlaudClipQueue + PlaudClipMergePanel (mobile-first responsive: 320/375/414/768/1024/1280/1440/1920) + tests | UI usable on temp test page |
| **3.12** | Frontend: PlaudPendingReviewsList + PlaudMergeBoundaryBanner + integration into TranscriptReviewCard + tests | failsafe + warning surface live |
| **3.13** | Integration: SwanCoachAssistantPage entry point + standalone `/dashboard/plaud-merge` route + Crystalline Swan styling pass | feature shipped |
| **3.14** | Playwright smoke: full viewport matrix (320 / 414 / 1280 / 1920) covering happy path + boundary warning + browser-close-and-resume + R2-fallback | green Playwright on 4 viewports |
| **3.15** | Closeout: Phase 1+2+3 cumulative Codex code review (pass 2) + rule 48 audit record + rule 57 dual-tier session summary | Codex APPROVE → Sean pushes feature flag to true |

---

## 10. Authorization & Concurrency (Codex HIGH #2 — DB-backed lock)

```sql
CREATE TABLE plaud_merge_locks (
  user_id      INTEGER PRIMARY KEY REFERENCES "Users"(id) ON DELETE CASCADE,
  locked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  job_id       UUID NOT NULL                                    -- mergeRequestId being acquired
);
```

**Acquire (atomic with expired-lock takeover — v3.1 Codex Round 2 HIGH #2 fix):**
```sql
INSERT INTO plaud_merge_locks (user_id, job_id, locked_until)
VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
ON CONFLICT (user_id) DO UPDATE
  SET job_id       = EXCLUDED.job_id,
      locked_at    = NOW(),
      locked_until = EXCLUDED.locked_until
  WHERE plaud_merge_locks.locked_until < NOW()
RETURNING user_id;
```
Empty result (active live lock held) → 409 `MERGE_IN_PROGRESS`. Otherwise proceed (either fresh acquire OR took over an expired lock without waiting on the cron sweep).

**Release on success/error:** `DELETE FROM plaud_merge_locks WHERE user_id=$1 AND job_id=$2`.

**Sweep (cron every 60s):** `DELETE FROM plaud_merge_locks WHERE locked_until < NOW()`.

**Heartbeat (long jobs):** during transcribe/parse, update `locked_until=NOW()+15min` every 5 min. If process dies, lock expires within 15 min naturally.

---

## 11. ffmpeg Command Spec (Codex gap #8)

```js
// backend/services/audioMergeService.mjs (excerpt)
import { spawn } from 'node:child_process';
import { join } from 'node:path';

// Note: clipPaths here are ALREADY-NORMALIZED files written by a prior
// per-clip ffmpeg encode step (see §5.4 step 7). They live under
// /tmp/plaud/_normalized/<mergeRequestId>/<index>.mp3.
// The container-heterogeneity issue (Codex Round 2 HIGH #3) is solved
// upstream by normalizing each input to mono 24kHz MP3 64kbit BEFORE
// concat. This function only handles the concat step.

// v3.3 (Codex Round 4 LOW #2 fix): explicit imports for clarity
import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function mergeNormalizedClips(clipPaths, outputPath, { timeoutMs = 120_000 } = {}) {
  // v3.1 (Codex Round 2 LOW #1): ensure list dir exists, mode 0700
  const base = process.env.PLAUD_DISK_BASE || '/tmp/plaud';
  const listDir = join(base, '_lists');
  await fs.mkdir(listDir, { recursive: true, mode: 0o700 });

  // v3.2 (Codex Round 3 MEDIUM #1 fix): path validation against PLAUD_DISK_BASE
  // (was hardcoded /tmp/plaud regex which broke when env override set).
  const normalizedBase = path.resolve(base, '_normalized');
  for (const p of clipPaths) {
    const resolved = path.resolve(p);
    if (!resolved.startsWith(normalizedBase + path.sep)) {
      throw new Error(`Refusing untrusted clip path: ${p}`);
    }
    // Filename pattern check (UUID-segmented dir + numeric file)
    if (!/[0-9a-f-]{36}[\\/]\d+\.mp3$/.test(resolved)) {
      throw new Error(`Refusing malformed clip path: ${p}`);
    }
  }

  // Build concat demuxer file list
  const listFile = join(listDir, `${randomUUID()}.txt`);
  await fs.writeFile(listFile, clipPaths.map(p => `file '${p}'`).join('\n'));

  // v3.1 (Codex Round 2 LOW #2): unified cleanup runs in BOTH exit and error paths
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    try { await fs.unlink(listFile); } catch {}
  };

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y',                      // overwrite output
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c:a', 'copy',            // inputs already normalized, no re-encode needed
      outputPath,
    ], {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
      // NEVER shell:true — that's command injection
    });

    let stderr = '';
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString().slice(0, 8192);  // cap stderr capture
      if (stderr.length > 8192) stderr = stderr.slice(-8192);
    });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      cleanup().finally(() => reject(new Error('FFMPEG_TIMEOUT')));
    }, timeoutMs);

    proc.on('exit', async (code) => {
      clearTimeout(timer);
      await cleanup();
      if (code === 0) resolve(outputPath);
      else reject(new Error(`FFMPEG_FAILED code=${code} stderr=${stderr.slice(0,500)}`));
    });

    proc.on('error', async (err) => {
      clearTimeout(timer);
      await cleanup();
      reject(err);
    });
  });
}

// Per-clip normalize step (v3.1 — Codex Round 2 HIGH #3 fix for mixed containers)
async function normalizeClip(inputPath, outputPath, { timeoutMs = 60_000 } = {}) {
  // Each input clip → mono 24kHz MP3 64kbit. Inputs may be .m4a/.wav/.mp3/.aac/.flac/.ogg.
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-c:a', 'libmp3lame',
      '-b:a', '64k',
      '-ar', '24000',
      '-ac', '1',
      outputPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', c => {
      // v3.2 (Codex Round 3 LOW): cap stderr globally, mirroring concat path
      stderr += c.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      reject(new Error('FFMPEG_NORMALIZE_TIMEOUT'));
    }, timeoutMs);
    proc.on('exit', code => {
      clearTimeout(timer);
      if (code === 0) resolve(outputPath);
      else reject(new Error(`FFMPEG_NORMALIZE_FAILED code=${code} ${stderr.slice(0,300)}`));
    });
    proc.on('error', err => { clearTimeout(timer); reject(err); });
  });
}
```

---

## 12. Rollback Plan (Codex HIGH #4 — flag default false)

### 12.1 Feature flag (v3.1 — Codex Round 2 HIGH #6 fix)
- `PLAUD_MERGE_ENABLED` env var, **default `false`**
- **Router is ALWAYS mounted.** First middleware on every plaud router checks the flag and returns structured `503 PLAUD_DISABLED` when off:
  ```js
  // backend/middleware/plaudFeatureFlag.mjs
  export function plaudFeatureFlag(req, res, next) {
    if (process.env.PLAUD_MERGE_ENABLED !== 'true') {
      return res.status(503).json({
        success: false,
        error: { code: 'PLAUD_DISABLED', message: 'PLAUD merge feature is not enabled in this environment', requestId: req.id }
      });
    }
    next();
  }
  ```
  This makes `PLAUD_DISABLED` from §16 actually reachable instead of returning generic 404 from a missing route.
- Frontend entry point gated separately by reading a `/api/health` exposed `featureFlags.plaudMerge` value (avoids bundling env var at build time).
- Sean enables manually after each environment passes:
  - migrations applied (`db:migrate:status`)
  - R2 bucket reachable (`scripts/plaud-r2-smoke.mjs`)
  - ffmpeg + ffprobe present (`scripts/plaud-ffmpeg-smoke.mjs`)
  - backend route smoke (`scripts/plaud-route-smoke.mjs`)
  - frontend build green
  - Playwright smoke on staging

### 12.2 Code revert
Single revert range covers slices 3.1-3.15. Migrations rollback via `sequelize-cli db:migrate:undo`. R2 bucket can be left in place (cost <$0.01/mo for 0 objects; auto-purges via lifecycle backstop).

### 12.3 Mid-deploy abort
If something detected in slice N, prior slices are independently safe:
- Slices 3.1-3.9 = backend only, no UI exposure
- Slices 3.10-3.13 = UI hidden behind flag
- No code path callable until flag is `true` AND user navigates to PLAUD entry point

---

## 13. Tier-A Test Strategy (Rule violation #4 fix — tests-per-slice)

Each slice 3.1-3.13 includes its own tests in the same commit. Slice 3.14 is Playwright smoke covering 4 viewports.

**Backend test environments:**
- Vitest with `tests/setup.mjs` (existing setup)
- ffmpeg/ffprobe required → CI must have them. If not present locally, skip with `it.skipIf(!hasFfmpeg)` (Codex gap #9)
- Dual-tier storage tests use `mock-aws-s3` or hit a `swanstudios-plaud-clips-test` R2 bucket with separate creds
- Cipher tests use deterministic 32-byte test key

**Frontend test environments:**
- Vitest + jsdom
- Touch event simulation for mobile gesture tests (queue swipe-left)
- Mock fetch with realistic response shapes including `cipherPurged: true` cases

---

## 14. Codex Round 1 + Round 2 + Round 3 — Resolution Map

### 14.0 Codex Round 3 patches applied (v3.1 → v3.2)

| Round 3 finding | v3.2 resolution | Where |
|---|---|---|
| HIGH #1: stale `in_flight` mirror jobs after worker crash | Worker sweeps stale `in_flight` rows (>5min idle) → `failed_retryable` on every cycle + at startup; same transaction updates `plaud_clips.r2_mirror_status` | §4.3 |
| HIGH #2: upload commits durable row before bytes on disk | Two-phase write: `status='uploading'` → write disk → transactional flip to `pending_merge` + insert mirror_job. Cron sweeps stale `uploading` rows → `lost`. Workers/merge endpoint never see `uploading` clips | §5.1, §4.1 status enum |
| HIGH #3: stale `processing` merge requests forever-stuck | New `plaudStaleMergeSweeper` cron (every 5 min) flips `processing` >20min old (without active lock) to `failed` with `MERGE_PROCESSING_STALE` | §5.4 |
| HIGH #4: lock fencing missing before final side effects | Re-verify lock ownership immediately before final completed-update; on fail mark request `failed` with `MERGE_LOCK_LOST`, don't write side effects | §5.4 step 14 |
| MEDIUM #1: PLAUD_DISK_BASE override conflicts with hardcoded path regex | Replaced regex with `path.resolve` based prefix check against env-configured base | §11 |
| MEDIUM #2: §7.2 still names removed cipher columns | §7.2 renamed to `payload_cipher`/`payload_iv`/`payload_tag`/`cipher_key_id` | §7.2 |
| MEDIUM #3: key rotation env story incomplete | §19.1 documents versioned env keys (`PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1`, `_V2`) + rotation runbook + new error code `CIPHER_KEY_VERSION_UNAVAILABLE` | §19.1, §16 |
| LOW: normalize stderr capture not globally capped | Mirrored concat cap pattern (slice to last 4096 chars) | §11 |
| RULE-58 GAP: preflight only checks tables, not columns | Slice 3.1 preflight expanded to `information_schema.columns` covering `Users`, `DailyWorkoutForms`, `ClientTrainerAssignments`. Document exact columns `ClientTrainerAssignment.isActive()` uses | §17 |

### 14.1 Codex Round 2 patches applied (v3 → v3.1)

| Round 2 finding | v3.1 resolution | Where |
|---|---|---|
| CRIT #1: `plaud_clips` exclusion constraint blocks 2+ pending clips | Removed EXCLUDE constraint, kept partial indexes | §4.1 |
| CRIT #2: AES-GCM schema unsafe (one IV/tag for two ciphertexts) | Single combined `payload_cipher` + `payload_iv` + `payload_tag` + `cipher_key_id` | §4.2 |
| CRIT #3: R2 mirror state machine inconsistent (`failed_retryable` not in worker query) | Full state machine documented; worker polls `pending OR failed_retryable`; UNIQUE(clip_id) on outbox | §4.3 |
| CRIT #4: apply path approval needs guarded UPDATE | `markApproved` performs guarded UPDATE with WHERE invariants on owner+client+status+already-approved; transaction rolls back on empty RETURNING | §5.7 |
| HIGH #1: browser-close-mid-merge claim overstated | Added `processing` status — row inserted BEFORE ffmpeg starts, updated to `completed`/`failed` after | §3, §4.2, §5.4 step 5 |
| HIGH #2: lock acquire doesn't atomically replace expired locks | Atomic upsert with `WHERE plaud_merge_locks.locked_until < NOW()` | §10, §5.4 step 4 |
| HIGH #3: mixed audio container support broken with concat demuxer | Per-clip normalize step (mono 24kHz MP3 64k) BEFORE concat; tests must include mixed `.m4a`/`.wav`/`.mp3` | §5.4 step 7, §11 (normalizeClip) |
| HIGH #4: deployment plan missing worker/cron process strategy | Added §19.2 process topology — workers run in-process on web service boot, gated by env flags | §19.2 |
| HIGH #5: migration rollback omits locks | Added locks to rollback list | §4.4 |
| HIGH #6: feature flag conflicts with PLAUD_DISABLED error code | Router always mounted; `plaudFeatureFlag` middleware returns structured 503 PLAUD_DISABLED when off | §12.1 |
| MEDIUM #1: idempotency stance still contradictory (sha256 dedup vs duplicate-row acceptance) | sha256 note rewritten: integrity only in Phase 3, dedup deferred to 3.x | §4.1 |
| MEDIUM #2: 1-vs-2 clip cardinality | Merge requires 2-5; single clips use existing `/workout-logs/upload`; new error `TOO_FEW_CLIPS` | §5.4, §16 |
| MEDIUM #3: mirror jobs no UNIQUE per clip | Added UNIQUE(clip_id) | §4.3 |
| MEDIUM #4: upload transaction boundaries | **(SUPERSEDED by v3.2 two-phase ordering)** Insert clip row as `uploading`; no mirror job yet. After fsync-close succeeds, transactionally update clip to `pending_merge` and insert one mirror job. If disk write fails, mark row `lost` immediately or let stale-uploading cron mark it `lost`. See §5.1 step 5. | §5.1 |
| MEDIUM #5: list endpoint returns decrypted PII for 20 rows | Split into list (metadata-only) + detail endpoint (one merge at a time, decrypts) | §5.5, §5.5b |
| LOW #1: ffmpeg list dir not created | `fs.mkdir(listDir, recursive, mode 0o700)` added | §11 |
| LOW #2: ffmpeg error path leaks list file | Unified `cleanup()` runs in BOTH exit and error paths | §11 |
| LOW #3: error taxonomy missing cipher errors | Added `CIPHER_KEY_MISCONFIGURED`, `CIPHER_DECRYPT_FAILED`, plus normalize-step variants | §16 |
| RULE VIOLATION #1: §17 falsely claims tags throughout doc | Rewrote Rule 51 entry — plan is forward-looking, tags apply to slice receipts and existing-code claims, not design statements | §17 |
| RULE VIOLATION #2: schema-drift incomplete for non-`Users` tables | Slice 3.1 first-action `information_schema` preflight on `Users`, `DailyWorkoutForms`, `ClientTrainerAssignments` | §17 |

### 14.2 Codex Round 1 findings (still resolved as of v3.1)

| Codex finding | v3 resolution | §where |
|---|---|---|
| CRIT #1: sync/async mismatch | Removed cancel + progress + re-merge from Phase 3 (deferred to 3.x). Sync merge endpoint with durable result row. | §1, §3, §5.4 |
| CRIT #2: no durable plaud_clips | Added `plaud_clips` table as source of truth for list endpoint | §4.1, §5.2 |
| CRIT #3: silent R2 mirror failure | Added `plaud_clip_mirror_jobs` outbox + worker with retry/backoff/terminal | §4.3 |
| CRIT #4: idempotency contradiction | Removed idempotency-key from Phase 3. Trainer-side dedup via UI state suffices. Re-POST creates duplicate row, accepted cost. Idempotency moved to 3.x. | §1 |
| CRIT #5: audit approval contradicts "untouched apply" | Apply path **does** get touched minimally (+30 lines). `dailyWorkoutFormRoutes` accepts `source`+`mergeRequestId`, `useTranscriptIntake` passes them through. Honest update to file map. | §8.4 |
| HIGH #1: merge order contradiction | Default `orderMode='provided'`. Backend respects clipIds order. UI doesn't auto-sort. | §5.4 |
| HIGH #2: 60s lock timeout too short | DB-backed lock with 15min TTL + heartbeat every 5min. Sweep cron reaps dead locks. | §10 |
| HIGH #3: silent-clip rejection in 3.2 needs ffmpeg in 3.3 | Slice re-ordered. ffmpeg/ffprobe smoke in 3.1, probe service in 3.2, upload in 3.5. | §9 |
| HIGH #4: feature flag default true | Default **false**. Manual enable per environment after smoke gates. | §12.1 |
| HIGH #5: zero PII overstated | Explicit risk acceptance language in §7.1. No claim of "zero PII" — claim is "no NEW exposure beyond single-clip path." | §7 |
| HIGH #6: 24h R2 PII control | R2 lifecycle 7-day backstop (was 30d). Private bucket, scoped creds, server-side AES-256, UUID keys, access logging. | §7.2 |
| HIGH #7 (boundary segment confidence) | Confidence simplified: `low` (<2 names) | `medium` (2+ names, no segment proof). No `high` claim. | §5.4 step 10 |

---

## 15. PLAUD Parity Additions (Sean directive — research before finalize)

| PLAUD feature | Phase 3 implementation | Phase 3.x deferred |
|---|---|---|
| Multi-clip merge | ✅ Multi-select + Merge button | — |
| Custom vocabulary | ✅ Static fitness vocab JSON loaded into transcribe prompt | User-uploadable terms |
| Speaker labels | — | ✅ Diarization via Gemini |
| AutoFlow (server unattended) | ✅ Sync 30s merge but durable state for browser-close failsafe | Async if >60s ever happens |
| Multimodal input (audio+text+image) | — | ✅ Future enhancement |
| Highlight key moments | — | ✅ Future |
| Templates (10K+) | — (we use one PT template) | ✅ Trainer-customizable templates |
| Export TXT/SRT/DOCX/PDF | — (workout already structured) | ✅ Trainer recap PDF export |

---

## 16. Error Code Taxonomy (Codex gap #5)

```
PLAUD_DISABLED                — feature flag false; structured 503 from plaudFeatureFlag middleware
UPLOAD_TOO_LARGE              — single file > 20MB OR total request > 30MB → 413
TOO_MANY_FILES                — > 5 files in one upload → 400
TOO_FEW_CLIPS                 — merge requested with < 2 clipIds (v3.1 — single clips use /workout-logs/upload) → 400
UNSUPPORTED_AUDIO_TYPE        — ffprobe failed or codec not in allowlist → 415
CLIP_TOO_SILENT               — mean_volume < -50dB AND max_volume < -30dB → 422
CLIP_CORRUPT                  — ffprobe error on validation → 422
CLIP_NOT_FOUND                — clipId doesn't exist or already deleted → 404
CLIP_EXPIRED                  — past 24h TTL → 410
CLIP_NOT_OWNED                — clip.user_id !== req.user.id → 403
NOT_ASSIGNED_TO_CLIENT        — trainer not assigned to clientId → 403
MERGE_IN_PROGRESS             — per-user lock held by an active (non-expired) job → 409
MERGE_NOT_FOUND               — mergeRequestId doesn't exist → 404
MERGE_NOT_APPROVABLE          — guarded UPDATE returned empty (wrong owner/client/status/already-approved) → 409
MERGE_CIPHER_PURGED           — past 24h, cipher dropped → 410 (with transcriptHash for audit)
FFMPEG_MISSING                — ffmpeg binary not installed → 500
FFMPEG_FAILED                 — non-zero exit during concat → 500
FFMPEG_NORMALIZE_FAILED       — non-zero exit during per-clip normalize step (v3.1) → 500
FFMPEG_TIMEOUT                — > 120s on concat → 504
FFMPEG_NORMALIZE_TIMEOUT      — > 60s on per-clip normalize → 504
MERGED_AUDIO_TOO_LARGE        — output > 20MB → 422
TRANSCRIPTION_FAILED          — Gemini call failed → 502
PARSE_FAILED                  — LLM parser returned non-JSON → 502
R2_UNAVAILABLE                — disk + R2 both miss → 503
RATE_LIMITED                  — > 10 files / 15min / user → 429
CIPHER_KEY_MISCONFIGURED      — PLAUD_TRANSCRIPT_ENCRYPTION_KEY missing/malformed at boot → fails health check (v3.1 — Codex Round 2 LOW #3)
CIPHER_DECRYPT_FAILED         — GCM auth tag verification failed (corruption or wrong key) → 500 (v3.1 — Codex Round 2 LOW #3)
CIPHER_KEY_VERSION_UNAVAILABLE — row's cipher_key_id refers to a key not present in env (rotation rollback risk) → 500 (v3.2)
MERGE_LOCK_LOST               — fencing check failed; lock was stolen mid-merge → 409 (v3.2 — Codex Round 3 HIGH #4)
MERGE_PROCESSING_STALE        — merge stuck in 'processing' >20min, swept by cron → status only, surfaced in list response (v3.2 — Codex Round 3 HIGH #3)
```

All errors return shape: `{ success: false, error: { code, message, requestId } }`.

---

## 17. CLAUDE.md Compliance Matrix (Rules 50-58 — Codex Rule violation #6)

| Rule | Compliance plan |
|---|---|
| Rule 50: Three-Layer QA Pipeline | Tier A: vitest + tsc per slice. Tier B: this Codex review pass + post-implementation review. Tier C: not invoked (no triggers fire). |
| Rule 51: Confidence-Tag Discipline | v3.1 — Codex Round 2 RULE VIOLATION #1 fix: this doc is a PLAN (mostly forward-looking design), not a factual claim doc. Confidence tags will be applied to (a) Slice receipts (per-slice file:line evidence), (b) the closeout audit record (Rule 48), (c) any factual claim about existing code paths or schema (e.g. "voiceTranscriptionService.mjs already exists" is a [VERIFIED] claim). Forward-looking design statements ("the merge endpoint will return 202") are NOT factual claims and don't carry tags. |
| Rule 52: Anti-Rework Burden of Proof | Phase 1 + 2 areas (chartDataController, dailyWorkoutFormRoutes formTrends) are recently-passed gates. No re-flagging without failing test. |
| Rule 53: Adjacent-Doc Wording-Class Sweep | If Codex flags a wording-class issue, rg sweep across all docs in `docs/ai-workflow/AI-HANDOFF/2026-05-*` |
| Rule 54: Sibling-Sweep Grep Evidence | Slice 3.8 (apply path touch) requires rg evidence of all callers of `applyParsedWorkout` and `parsedWorkoutToLogPayload` |
| Rule 55: Diagnostic Probe Requirement | Each slice prescription with form "switch from X to Y" needs probe evidence |
| Rule 56: Tier-A Baseline Disclosure | Every slice closeout disclose: backend vitest count, frontend tsc status with explicit "slice files clean / baseline status: ..." |
| Rule 57: Dual-Tier Session Summary | At Phase 3 close, plain-English + technical summary inline |
| Rule 58: Proactive Schema-Drift Detection | New models + raw SQL all checked against information_schema before slice ships. Migration files reviewed for column-name case drift. **v3.2 — Codex Round 3 RULE-58 GAP fix:** Slice 3.1 first-action preflight expanded to TABLE + COLUMN level: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('Users', 'DailyWorkoutForms', 'ClientTrainerAssignments') ORDER BY table_name, ordinal_position`. Document the exact columns `ClientTrainerAssignment.isActive()` will use (likely `trainerId`, `clientId`, `status`, `startDate`, `endDate`). Any drift → migration AND helper service adjusted before the rest of slice 3.1 proceeds. |

---

## 18. Future Review Hooks (Rule 48 — for the Phase 3 audit record)

After Phase 3 ships, per Rule 48 the audit record will be at `docs/ai-workflow/AI-HANDOFF/PHASE-3-PLAUD-MERGE-AUDIT-RECORD-<closing-date>.md`. Rule 48 requires §10 "Future review hooks" — for the next AI/security reviewer:

1. Re-examine ffmpeg subprocess spawn for command injection given current node version. Verify clipPaths regex still matches actual disk format.
2. Audit the cipher service: verify GCM auth tag is checked on decrypt, IV is unique per row, key rotation procedure documented.
3. Verify R2 mirror outbox doesn't unbounded-retry — terminal failures must alert.
4. Test 24h TTL crons actually fired (some Render Pro plans skip cron under load — check logs after 7 days).
5. Verify the boundary detector hasn't grown false-positive over time as roster expands. Run integration check against real PT session transcripts.
6. Verify trainer-client assignment authz still maps correctly after schema changes (drift class per Rule 58).
7. Audit logger calls for accidental PII leakage (ffmpeg stderr capture, transcript text). Run rg sweep for `transcript`, `cipher` in logs/ if any persisted.
8. Confirm the apply path augmentation didn't break single-clip path — single-clip should still work without `source`/`mergeRequestId`.
9. Check storage cost: with N trainers × M merges/day, R2 monthly bill projection.
10. Verify cipher purge actually empties bytea columns in Postgres (NULL not zero-byte) — VACUUM may be needed.

---

## 19. Deployment env vars + topology (Codex gap #14 + Round 2 HIGH #4 — worker process strategy)

### 19.1 Env vars

```bash
# Required
PLAUD_MERGE_ENABLED=false                     # default; flip to true after smoke
# Encryption keys — versioned for rotation (v3.2 — Codex Round 3 MEDIUM #3 fix)
PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1=<base64-32B-old-key>      # historical, MUST stay set as long as any v1-encrypted rows exist
PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V2=<base64-32B-current-key>  # current; new rows get cipher_key_id='V2'
PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID=V2         # tag stored in row.cipher_key_id; encrypt service uses this version
# Generation: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Rotation runbook (v3.3 — Codex Round 4 LOW fix): bump KEY_ID, add new versioned key env, KEEP old versioned key until BOTH conditions hold:
#   (a) 24h has passed AND
#   (b) SELECT COUNT(*) FROM plaud_merge_requests WHERE cipher_key_id='V<old>' AND payload_cipher IS NOT NULL returns 0 in production
# Cron unreliability or paused workers can leave decryptable old-key blobs around; never assume "exactly 24h" is sufficient.
R2_PLAUD_BUCKET=swanstudios-plaud-clips
R2_ACCESS_KEY_ID=<existing>                   # reuses existing R2 creds
R2_SECRET_ACCESS_KEY=<existing>
R2_ENDPOINT=<existing>

# Worker / cron toggles (v3.1 — Codex Round 2 HIGH #4)
PLAUD_WORKER_ENABLED=true                     # plaudR2MirrorWorker boots if true
PLAUD_TTL_CRON_ENABLED=true                   # plaudClipTtlCron + plaudCipherPurgeCron + lock sweep boot if true

# Optional / overrides
PLAUD_FFMPEG_PATH=/usr/bin/ffmpeg             # default uses PATH lookup
PLAUD_FFPROBE_PATH=/usr/bin/ffprobe
PLAUD_DISK_BASE=/tmp/plaud                    # default
PLAUD_MAX_FILES_PER_UPLOAD=5                  # default
PLAUD_MAX_FILE_BYTES=20971520                 # default 20MB
PLAUD_MAX_REQUEST_BYTES=31457280              # default 30MB total per multipart upload
PLAUD_MAX_MERGED_BYTES=20971520               # default 20MB per Q1
PLAUD_MERGE_TIMEOUT_MS=120000                 # ffmpeg concat subprocess timeout
PLAUD_NORMALIZE_TIMEOUT_MS=60000              # per-clip normalize subprocess timeout
PLAUD_LOCK_TTL_MIN=15                         # DB lock TTL
PLAUD_CLIP_TTL_HOURS=24                       # raw audio TTL
PLAUD_CIPHER_TTL_HOURS=24                     # encrypted transcript blob TTL
PLAUD_R2_LIFECYCLE_DAYS=7                     # backstop bucket lifecycle (Codex Round 1 MEDIUM)
```

### 19.2 Process topology (v3.1 — Codex Round 2 HIGH #4 fix)

SwanStudios on Render runs as a single web service (no separate worker dyno). PLAUD workers and cron jobs run **in-process** on web service boot:

- `backend/server.mjs` boots:
  - HTTP listener (existing)
  - **NEW:** if `PLAUD_WORKER_ENABLED === 'true'` → `startPlaudR2MirrorWorker()` (30s setInterval)
  - **NEW:** if `PLAUD_TTL_CRON_ENABLED === 'true'` → `startPlaudCronJobs()` registers:
    - `plaudClipTtlCron` (every 5 min — clips with `expires_at < NOW()` get hard-purged from disk + R2 + status='expired')
    - `plaudCipherPurgeCron` (every 5 min — see explicit purge query below; v3.3 — Codex Round 4 MEDIUM #3 fix):
      ```sql
      UPDATE plaud_merge_requests
      SET status = CASE
            WHEN status IN ('processing', 'completed') THEN 'expired'
            ELSE status   -- 'failed' stays 'failed' for audit; 'approved'/'discarded' already cipher-clean
          END,
          payload_cipher   = NULL,
          payload_iv       = NULL,
          payload_tag      = NULL,
          cipher_purged_at = NOW()
      WHERE expires_at      < NOW()
        AND cipher_purged_at IS NULL
        AND status NOT IN ('approved', 'discarded');
      ```
    - `plaudMergeLockSweepCron` (every 60s — locks with `locked_until < NOW()` deleted; backstop in case atomic-takeover misses)

**Singleton concern:** Render Pro plan doesn't auto-scale this service to multiple instances by default. If/when it does:
- Worker leader election TBD (defer to Phase 3.x — for now document that scaling > 1 instance breaks the workers)
- Add Postgres advisory lock around `startPlaudR2MirrorWorker` if needed
- Document this constraint in operational runbook

**Health checks:**
- `/api/health` returns `featureFlags.plaudMerge` based on `PLAUD_MERGE_ENABLED`
- `/api/health` returns last-success timestamp for each worker/cron (defer to 3.x for full observability — Phase 3 minimum is logger.info on each cycle)

### 19.3 R2 lifecycle config (v3.1)
The `swanstudios-plaud-clips` bucket needs a lifecycle rule:
- Delete objects after 7 days (backstop; primary cleanup is `plaudClipTtlCron`)
- Configured manually in Cloudflare dashboard during Slice 3.1; document the steps in `docs/ai-workflow/references/PLAUD-DEPLOYMENT.md`

### 19.4 Reference doc
Slice 3.1 publishes `docs/ai-workflow/references/PLAUD-DEPLOYMENT.md` covering: env var checklist, R2 bucket setup, ffmpeg/ffprobe verification, encryption-key generation + rotation procedure, worker/cron health checks, smoke command list.

---

## 20. Sign-off

- **Plan author:** Claude Opus
- **Plan review trigger:** Sean ran Codex via `node scripts/consult-codex.mjs --review --file <v2 path>` — returned REVISE on 2026-05-04
- **Plan v3 author:** Claude Opus, addressing all CRITICAL + HIGH + RULE VIOLATIONS + 12 of 15 GAPS (+ explicit defer-to-3.x for the 3 polish gaps)
- **Plan v3 review trigger (next):** Sean re-runs Codex on this v3 doc
- **Implementer:** Claude (slice-by-slice with Rule 26 receipts)
- **Final code gate:** Codex APPROVE on cumulative Phase 1+2+3 implementation review (per Sean's batched-review directive)
- **Production deploy:** Sean pushes to `main` → flips `PLAUD_MERGE_ENABLED=true` after smoke

---

## Sources (PLAUD research)
- [Plaud Note Pro](https://www.plaud.ai/pages/plaud-note-pro)
- [Plaud NotePin](https://www.plaud.ai/products/plaud-notepin)
- [Merge Audio support](https://support.plaud.ai/hc/en-us/articles/50609529313561-Merge-Audio)
- [How can I merge recordings?](https://support.plaud.ai/hc/en-us/articles/11091178688143-How-can-I-merge-recordings)
- [AutoFlow](https://support.plaud.ai/hc/en-us/articles/50835520394009-AutoFlow)
- [Speaker labels + templates updates](https://www.plaud.ai/blogs/news/updates-label-the-speakers-and-create-your-own-templates)
- [Export Files](https://support.plaud.ai/hc/en-us/articles/51023259082393-Export-files)
- [Plaud Templates blog](https://www.plaud.ai/blogs/news/plaud-templates)
