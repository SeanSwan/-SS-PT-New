# Phase 3 — PLAUD Multi-Clip Merge Ingestion Plan (v2 — Sean-decided)
> **Author:** Claude Opus (Phase 3 planning, 2026-05-03)
> **Status:** v2 — Sean's §10 decisions inlined 2026-05-03. AWAITING CODEX REVIEW on this plan, then implementation begins.
> **Owner:** Sean
> **Predecessor phases:** Phase 1 (trainer-logging→client-dashboard, 2026-05-03), Phase 2 (chart truthfulness, 2026-05-03)
> **Successor phase:** Phase 4 — Swan Coach v15 `view_available_slots`
> **Sean directive 2026-05-03:** "Two passes — plan review first, then code review on cumulative Phase 1+2+3 implementation."

---

## 1. The Problem (Sean's Words)

PLAUD wristband records burst clips during a PT session. The PLAUD **mobile app** can merge multiple clips into one before transcription — but the PLAUD **desktop app does NOT have merge**. Sean's actual workflow:

> "I'd say client name + date + time, do an exercise, stop. Press record again, do another exercise, stop. End of session, switch clients — say next client name. The boundary between sessions is the next client's name being spoken."

Each PT session produces **2-N raw audio clips** that all belong to ONE workout for ONE client. Sean needs SwanStudios to:

1. Accept multiple raw clips uploaded individually
2. Provide a queue UI
3. Let Sean **select 2-N clips and click Merge**
4. Server merges audio → transcribes the merged audio as ONE document → AI parses ONE workout
5. Show parsed workout for review
6. On approve → log to client's daily workout form

This unlocks PLAUD wristband as a real revenue tool: **30 seconds of trainer time after the session = full client log + chart update + dashboard visibility**.

---

## 2. What Already Exists (Don't Reinvent)

| File | Purpose | Status |
|---|---|---|
| `backend/routes/workoutLogUploadRoutes.mjs` | `POST /api/workout-logs/upload` — single-clip upload, transcribe, parse, return for review | ✅ live, working |
| `backend/services/voiceTranscriptionService.mjs` | Gemini-backed audio transcription (20MB inline-data cap) | ✅ live |
| `backend/services/workoutLogParserService.mjs` | LLM transcript → structured workout JSON | ✅ live |
| `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useTranscriptIntake.ts` | upload + apply orchestration for transcript-class files in Swan Coach chat | ✅ live |
| `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx` | Coach chat surface with drag-drop transcript intake | ✅ live |
| `frontend/src/components/WorkoutLogger/VoiceMemoUpload.tsx` | Voice memo upload UI in WorkoutLogger | ✅ live |
| `parsedWorkoutToLogPayload.ts` | Maps parser output → canonical log API payload | ✅ live |

**Key insight:** the single-clip path's review→apply contract already does the right thing. Phase 3 adds a **NEW upload mode** (multi-file → merge) that feeds the SAME `transcript + parsedWorkout` review object back into the existing `useTranscriptIntake.applyParsedWorkout()` flow. We do NOT touch the apply step — only add a new front door.

---

## 3. End-to-End User Flow (Phase 3 Addition)

```
┌─────────────────────────────────────────────────────────────────┐
│ DESKTOP / WEB — Sean's workflow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. After PT session, Sean offloads PLAUD clips to laptop        │
│  2. Opens Swan Coach Assistant (or new dedicated PLAUD page)    │
│  3. Drag-drops 2-5 clips into upload zone                        │
│  4. Each clip enters a "Pending Clips Queue" with:               │
│     - filename, duration (parsed from audio header)              │
│     - inferred record-time (file mtime fallback)                 │
│     - per-clip remove [✕]                                        │
│  5. Sean checks the boxes for clips that belong to ONE workout   │
│  6. Clicks "Merge selected (N)" button                           │
│  7. Backend: ffmpeg concatenates audio → one merged file         │
│     - In server memory if total ≤ 20MB                           │
│     - Streamed to Gemini File Upload API if >20MB (deferred —    │
│       see §10 open question Q1)                                  │
│  8. Backend: transcribes merged audio (existing service)         │
│  9. Backend: parses transcript (existing service)                │
│  10. Backend: boundary check — count distinct client names       │
│      mentioned in transcript. If >1, return WARNING in           │
│      response payload (does NOT block).                          │
│  11. Frontend: renders TranscriptReviewCard (existing component) │
│      with the merged transcript + parsed workout                 │
│  12. If boundary warning, banner: "Multiple client names         │
│      detected: 'Sarah', 'Mike'. Did you mean to merge clips      │
│      from different sessions? [Re-select] [Continue anyway]"     │
│  13. Sean reviews/edits exercises if AI misparsed                │
│  14. Sean clicks Confirm                                         │
│  15. Existing applyParsedWorkout() POSTs to                      │
│      /api/admin/clients/:clientId/workouts → saved as            │
│      DailyWorkoutForm + WorkoutSession                           │
│  16. Phase 1 work guarantees this immediately appears on the     │
│      client's dashboard with totalSets, exerciseCount,           │
│      exerciseNames                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Boundary rule (Sean's rule, codified):**
- A merge group is one workout for one client
- Boundary = next distinct client name spoken
- Trainer manually selects which clips go in a group (server doesn't auto-split)
- Server warns when multiple client names appear in merged audio (safety net)
- Trainer can override warning ("Continue anyway") — useful for cases like "Sarah today, then I demo a movement using my own name as reference"

---

## 4. API Surface (NEW endpoints)

All under `/api/plaud/*`. New router file: `backend/routes/plaudClipsRoutes.mjs`. Mounted via `backend/core/routes.mjs`.

### 4.1 `POST /api/plaud/clips/upload` — multi-file clip upload

```
Auth: protect + authorize(['admin', 'trainer'])
Rate-limit: same 10-uploads-per-15-min as existing single-clip path,
            counted per FILE (so 3-file batch = 3 against the limit)
Multipart: files[] (1..N audio files), max 5 per request
Body: clientId? (optional — clients can be picked at merge time too)
```

**Response:**
```json
{
  "success": true,
  "clips": [
    {
      "clipId": "uuid",
      "filename": "rec_2026-05-03_094012.mp3",
      "size": 1234567,
      "mimetype": "audio/mp3",
      "durationSec": 18,
      "uploadedAt": "2026-05-03T09:42:00Z",
      "status": "pending_merge"
    }
  ]
}
```

**Storage:** clips kept in `/tmp/plaud/<userId>/<clipId>.<ext>` on the Render filesystem (ephemeral, fine — clips live ≤ 24h before merge or auto-cleanup). Disk quota concern: see §10 Q3.

### 4.2 `GET /api/plaud/clips` — list pending clips for current user

```
Auth: protect + authorize(['admin', 'trainer'])
Response: { success: true, clips: [...same shape as upload response...] }
```

### 4.3 `DELETE /api/plaud/clips/:clipId` — remove clip from queue

```
Auth: protect + authorize(['admin', 'trainer'])
Owner-only: req.user.id must match clip uploader
Response: { success: true }
```

### 4.4 `POST /api/plaud/clips/merge` — merge selected clips, transcribe, parse

```
Auth: protect + authorize(['admin', 'trainer'])
Body: {
  clipIds: ['uuid1', 'uuid2', 'uuid3'],   // 1..5 clips, ordered by trainer's selection
  clientId: 1234,                          // required at merge time
  date?: '2026-05-03',                     // optional override
}
```

**Pipeline:**
1. Validate ownership of all clipIds (req.user.id matches uploader)
2. Validate clipIds.length in [1, 5]
3. Sort clips by uploadedAt asc (deterministic merge order)
4. Spawn ffmpeg: `ffmpeg -i clip1 -i clip2 ... -filter_complex "concat=...:a=1" merged.mp3`
   - Subprocess with timeout (60s)
   - Failure → 500 with structured error
5. Read merged audio buffer (≤ 20MB enforced — fail-fast if over, see §10 Q1)
6. Transcribe via existing `transcribeAudio(buffer, 'merged.mp3')`
7. Parse via existing `parseWorkoutTranscript({ transcript, clientId, trainerId, date })`
8. **Boundary check (NEW):** scan transcript for distinct client name candidates against trainer's roster
9. Cleanup merged file + (optionally) source clips from disk

**Response:**
```json
{
  "success": true,
  "transcript": "...",
  "parsedWorkout": {
    "exercises": [...],
    "date": "2026-05-03",
    "clientNameDetected": "Sarah Johnson",
    ...
  },
  "metadata": {
    "mergedClipIds": ['uuid1','uuid2','uuid3'],
    "mergedDurationSec": 47,
    "clientId": 1234,
    "trainerId": 5,
    "date": "2026-05-03"
  },
  "boundaryWarning": null  // OR { detectedNames: ['Sarah', 'Mike'], confidence: 'high' }
}
```

The `parsedWorkout` shape is **identical to the single-clip path** so the existing `TranscriptReviewCard` and `applyParsedWorkout()` work unchanged.

### 4.5 No new "log" endpoint
Apply step uses **existing** `POST /api/admin/clients/:clientId/workouts` (`adminClientService.logWorkout`). Phase 1 already proved this writes through to `dailyWorkoutFormRoutes` → `WorkoutSession` and the dashboard renders it. No new code on the apply side.

---

## 5. Boundary Detection — Logic Spec

**Goal:** flag (don't block) when merged audio appears to span multiple clients.

### 5.1 Approach
1. Extract roster: trainer's assigned clients via `req.user.id` → `ClientTrainerAssignment` → `User.firstName + lastName`
2. Build a **name-token bag** from roster: every first name, last name, and full-name string from the trainer's clients (deduped, case-insensitive)
3. Tokenize transcript and find all matches (whole-word, case-insensitive, fuzzy via Levenshtein ≤ 1 for transcription typos)
4. Group matches by client (a "Sarah" match counts toward Sarah Johnson AND Sarah Lee — disambiguation later)
5. Count **distinct** clients matched
6. If count > 1: return `boundaryWarning: { detectedNames: [...], confidence: 'high'|'medium' }`

### 5.2 Confidence classification
- **high**: each name appears ≥ 2 times AND in different segments of the transcript (split by "[stop]", or by inferred clip boundaries)
- **medium**: each name appears ≥ 1 time but only in proximity (could be "Sarah, like Sarah Lee does this exercise" reference rather than session boundary)
- **null**: only one client name detected (no warning)

### 5.3 Why not block
A trainer might legitimately say another client's name in a workout: "this is the same exercise Sarah does" — blocking would be brittle. Warn + let trainer decide.

### 5.4 Phase 3 minimum vs nice-to-have
- **Phase 3 minimum:** detect distinct names, return `boundaryWarning` field, frontend renders banner
- **Deferred:** auto-split UI (offer "merge group A + merge group B" reconciliation) — Phase 3.x or later

---

## 6. File Map

### 6.1 NEW backend files (v2 expanded)
| File | Purpose | Approx LOC |
|---|---|---|
| `backend/routes/plaudClipsRoutes.mjs` | 5 endpoints: upload, list, delete, merge, cancel-merge | ~320 |
| `backend/services/audioMergeService.mjs` | ffmpeg subprocess (child_process.spawn) + cleanup + cancel-in-flight | ~160 |
| `backend/services/clientNameBoundaryDetector.mjs` | name-token boundary detection | ~150 |
| `backend/services/plaudClipStorageDualTier.mjs` | dual-tier disk + R2 read/write/list/delete | ~250 |
| `backend/services/plaudIdempotencyCache.mjs` | per-user 1h idempotency-key cache | ~80 |
| `backend/services/plaudConcurrencyLock.mjs` | per-user merge lock (60s timeout) | ~70 |
| `backend/middleware/idempotencyKey.mjs` | reusable idempotency middleware | ~60 |
| `backend/jobs/plaudClipTtlCron.mjs` | 24h hard TTL + 1h re-merge cleanup | ~120 |
| `backend/models/PlaudMergeAudit.mjs` | Sequelize model for audit table | ~100 |
| `backend/migrations/<timestamp>-create-plaud-merge-audit.cjs` | migration | ~80 |
| `backend/__tests__/plaud/plaudClipsRoutes.test.mjs` | endpoint regression | ~350 |
| `backend/__tests__/plaud/audioMergeService.test.mjs` | merge service unit | ~180 |
| `backend/__tests__/plaud/clientNameBoundaryDetector.test.mjs` | boundary unit | ~200 |
| `backend/__tests__/plaud/plaudClipStorageDualTier.test.mjs` | storage service unit | ~250 |
| `backend/__tests__/plaud/plaudIdempotencyCache.test.mjs` | idempotency cache unit | ~80 |
| `backend/__tests__/plaud/plaudConcurrencyLock.test.mjs` | concurrency lock unit | ~80 |

### 6.2 NEW frontend files (v2 mobile-first)
| File | Purpose | Approx LOC |
|---|---|---|
| `frontend/src/components/PlaudClipMerge/PlaudClipUploader.tsx` | multi-file picker + drag-drop + mobile single-tap select | ~180 |
| `frontend/src/components/PlaudClipMerge/PlaudClipQueue.tsx` | list with checkboxes + swipe-left delete (mobile) + per-clip actions | ~240 |
| `frontend/src/components/PlaudClipMerge/PlaudMergeBoundaryBanner.tsx` | warning banner with `role="alert"` | ~100 |
| `frontend/src/components/PlaudClipMerge/PlaudClipMergePanel.tsx` | orchestrator (state machine) + sticky-footer "Merge selected (N)" on mobile | ~300 |
| `frontend/src/components/PlaudClipMerge/PlaudReMergeBadge.tsx` | "Recently merged (50 min)" badge + re-merge action | ~100 |
| `frontend/src/components/PlaudClipMerge/PlaudCancelMergeButton.tsx` | cancel-in-flight UI | ~80 |
| `frontend/src/hooks/usePlaudClipQueue.ts` | API client hook + idempotency-key generator | ~180 |
| `frontend/src/hooks/usePlaudMergeProgress.ts` | progress polling + cancel signal | ~120 |
| `frontend/src/services/plaudClipService.ts` | upload/list/delete/merge/cancel wrapper | ~150 |
| `frontend/src/components/PlaudClipMerge/PlaudClipMergePanel.test.tsx` | full state machine unit tests | ~350 |
| `frontend/src/components/PlaudClipMerge/PlaudClipQueue.test.tsx` | queue interaction tests (touch + mouse) | ~200 |
| `frontend/src/pages/dashboard/PlaudMergePage.tsx` | standalone `/dashboard/plaud-merge` route | ~150 |

### 6.3 MODIFIED files (small)
| File | Why |
|---|---|
| `backend/core/routes.mjs` | mount `plaudClipsRoutes` at `/api/plaud` |
| `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx` | add "Merge clips" entry point alongside existing single-clip drag-drop |
| `frontend/src/routes/main-routes.tsx` (or wherever) | optional standalone `/dashboard/plaud-merge` route |
| `package.json` (backend) | add `fluent-ffmpeg` (or use `child_process` direct — see §10 Q4) |

### 6.4 NOT touched
- `workoutLogUploadRoutes.mjs` — single-clip path stays as-is
- `voiceTranscriptionService.mjs` — reused
- `workoutLogParserService.mjs` — reused
- `useTranscriptIntake.ts` — reused for the apply step
- `parsedWorkoutToLogPayload.ts` — reused

---

## 7. Slice Breakdown (Implementation Order — v2 with dual-tier storage + gaps)

Same model as Phase 1: small slices, one slice = one shippable commit.

| Slice | Scope | Sliceable artifact |
|---|---|---|
| **3.1** | Backend: dual-tier storage service (`plaudClipStorageDualTier.mjs`) + Sequelize migration for `plaud_merge_audit` table + R2 bucket bootstrap | service unit-tested, no endpoints yet |
| **3.2** | Backend: upload + list + delete endpoints + per-user concurrency lock + idempotency-key middleware + silent-clip rejection | clip queue endpoints live, no merge yet |
| **3.3** | Backend: `audioMergeService.mjs` (child_process.spawn ffmpeg) + ffmpeg presence smoke + Render Build Command update if absent | merge service unit-tested |
| **3.4** | Backend: merge endpoint + cancel-in-flight endpoint + reuse existing transcribe/parse + audit row write | merge endpoint returns `transcript + parsedWorkout` matching single-clip shape |
| **3.5** | Backend: `clientNameBoundaryDetector.mjs` + wire into merge endpoint response | merge endpoint emits `boundaryWarning` field |
| **3.6** | Backend: 24h TTL cron + 1h re-merge window + cleanup of disk + R2 + audit retention rules | cleanup verified via test |
| **3.7** | Backend: full unit + integration tests (storage, merge service, boundary, idempotency, concurrency, cancel) — backend baseline regression | green suite + new test files |
| **3.8** | Frontend: `plaudClipService.ts` + `usePlaudClipQueue.ts` hook + idempotency-key handling + cancel signal | wired to backend, no UI yet |
| **3.9** | Frontend: `PlaudClipUploader.tsx` + `PlaudClipQueue.tsx` + `PlaudClipMergePanel.tsx` (mobile-first responsive: 320/375/414/768/1024/1280/1440/1920) | UI usable on a temp test page; touch + mouse parity |
| **3.10** | Frontend: `PlaudMergeBoundaryBanner.tsx` + re-merge UX (1h badge) + integrate into existing `TranscriptReviewCard` flow | end-to-end warning + re-merge surface |
| **3.11** | Integration: wire entry point into `SwanCoachAssistantPage.tsx` + standalone `/dashboard/plaud-merge` route + Crystalline Swan styling pass per `swan-design-router` | feature shipped to dashboard |
| **3.12** | Tests: frontend unit (per-component) + Playwright smoke covering full-viewport matrix (320 / 414 / 1280 / 1920) | green Playwright on 4 viewports |
| **3.13** | Closeout: Phase 1+2+3 cumulative Codex review per Sean's batched-review directive + rule 48 audit record + rule 57 dual-tier session summary | Codex APPROVE → ship |

**Estimated effort:** 14-20 working hours over 4-6 sessions. ~2,500-3,500 LOC backend + frontend (grew from v1 due to dual-tier storage, idempotency, concurrency, audit, full mobile responsiveness, expanded test coverage).

---

## 8. Privacy & Security

### 8.1 PII surface (CLAUDE.md Rule 8 — zero PII to LLMs)
- **Audio contains client names** (Sean explicitly identifies clients verbally during recording)
- Existing transcribe path uses Gemini Files API (under Sean's privacy proxy posture per `PRIVACY-PROXY.md`)
- Merged audio is the same risk class as single-clip — no new exposure
- Transcript is stored ephemerally in the response, never persisted by the merge endpoint (the apply step persists structured fields, not raw transcript)

### 8.2 Storage hygiene
- Clips on disk: `/tmp/plaud/<userId>/<clipId>.<ext>` — owned mode 0600
- TTL: 24h auto-cleanup cron (deferred slice 3.1 polish — not blocker)
- On merge success: source clips can stay queued (trainer may want re-merge with different selection) OR auto-delete (saves disk). Default: keep until manual delete or TTL — see §10 Q5
- On account deletion: cascade delete (handled by existing user-deletion cleanup if any; otherwise add a hook in Phase 3 closeout)

### 8.3 Auth
- All endpoints `protect + authorize(['admin','trainer'])` — same as existing single-clip path
- Per-clip ownership enforced (`uploaderId === req.user.id`)
- Rate limit: 10 files per 15 min, counted per FILE not per request

### 8.4 Pre-Push Backend Audit (Rule 42)
- Both `git ls-files --others --exclude-standard backend/` and `git diff --name-only HEAD backend/` MUST be clean before each slice push
- New ffmpeg dependency: confirmed installed on Render (see §10 Q4 — verify before merge endpoint goes live)

---

## 9. Dependencies & Infrastructure

| Dependency | Why | Status |
|---|---|---|
| `ffmpeg` system binary | audio concat | Render images include ffmpeg in Node + apt baseline → **verify before slice 3.2 ships** (Q4) |
| `fluent-ffmpeg` npm | optional wrapper, easier API | not in package.json — add or use `child_process.spawn` raw |
| Gemini Files API | for >20MB merged audio | ALREADY in `voiceTranscriptionService.mjs` for inline data — Files API is a separate refactor (Q1) |
| Existing transcribe/parse | reuse | ✅ |
| Existing TranscriptReviewCard / applyParsedWorkout | reuse | ✅ |

---

## 10. Sean's Decisions (resolved 2026-05-03)

**Q1 — Merged audio size:** ✅ DECIDED.
- Phase 3 minimum: hard-cap merged buffer at 20MB. Return structured error if exceeded.
- Phase 3.x: add Gemini Files API support for >20MB merges AND **expose API endpoints for external instances** so other Sean-controlled instances can interact with the data and feed back enhancements (see new §16). This is important — design Phase 3 endpoints so they're cleanly extensible to API-key auth without rework.

**Q2 — UI responsiveness:** ✅ DECIDED — both.
- Desktop must be solid (matches Sean's PLAUD desktop offload workflow)
- AND mobile-first responsive across full CLAUDE.md Rule 24 viewport matrix (320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920)
- Touch targets ≥ 44px (Rule 2) on the multi-select checkboxes
- Multi-select must work with single-tap on mobile, no accidental drag-to-select traps

**Q3 — Storage tier:** ✅ DECIDED — dual-tier disk + R2.
- Primary: Render disk (`/tmp/plaud/<userId>/`) — fast, low-latency for active merge sessions
- Backup mirror: Cloudflare R2 — async upload after disk write succeeds, survives Render filesystem evictions / restarts
- Read order on merge: disk first → R2 fallback if disk evicted
- 24h hard TTL on both tiers
- Sean's reasoning: single-tier `/tmp` will get squeezed under multi-trainer load; R2 already hosts badges/videos for SwanStudios so the infra is proven
- Adds a new service: `plaudClipStorageDualTier.mjs` (see §17 below)

**Q4 — ffmpeg on Render:** ✅ DECIDED — Claude judgment per CLAUDE.md.
- Use `child_process.spawn` directly (no `fluent-ffmpeg` wrapper — keeps dep surface small per CLAUDE.md "avoid abstractions you don't need")
- Slice 3.2 first action: smoke `which ffmpeg` on Render Pro Node 22 image
- If absent: add `apt-get install -y ffmpeg` to Render Build Command. Document in `docs/ai-workflow/references/BUILD-HARDENING.md` so future deploys don't lose it.
- No pure-JS concat fallback — quality matters for transcription, ffmpeg is the right tool

**Q5 — Source clip retention:** ✅ DECIDED — 1h re-merge window + 24h hard TTL.
- After successful merge: keep source clips for 1h (Sean may want to re-merge with different selection if first merge missed a clip or split wrong)
- After 1h post-merge: auto-purge via TTL cron
- Hard ceiling regardless: 24h after upload
- Manual delete via `DELETE /api/plaud/clips/:clipId` always available
- Both tiers (disk + R2) cleaned together by the TTL cron

**Q6 — Codex review timing:** ✅ DECIDED — two passes.
- **Pass 1 (now, plan-only):** Codex reviews this plan doc. Returns APPROVE / REVISE on architecture before any code lands.
- **Pass 2 (after Phase 3 ships):** Codex reviews cumulative Phase 1 + Phase 2 + Phase 3 implementation code together. This satisfies Sean's "every 2 phases" cadence while letting Phase 3 design get caught early.

---

## 11. Test Plan

### 11.1 Backend unit tests (slice 3.4)
- `plaudClipsRoutes.test.mjs` — auth gates, rate limit, ownership enforcement, multipart validation, error states
- `audioMergeService.test.mjs` — ffmpeg success, ffmpeg timeout, missing input, invalid order, cleanup
- `clientNameBoundaryDetector.test.mjs` — single-name, two-name proximity (medium), two-name distant (high), Levenshtein-1 typo match, empty roster, no detection edge

### 11.2 Frontend unit tests (slice 3.7)
- `PlaudClipMergePanel.test.tsx` — empty queue state, partial selection, all-selected state, merge in-flight, merge error, boundary warning render

### 11.3 Playwright smoke (slice 3.9)
End-to-end happy path:
1. Login as trainer
2. Navigate to PLAUD merge surface
3. Upload 2 fixture audio files (small WAVs from `frontend/test-fixtures/`)
4. Verify queue shows both clips
5. Select both → click Merge
6. Wait for review card render
7. Verify transcript text + at least one parsed exercise
8. Click Confirm
9. Verify success toast
10. Navigate to client dashboard
11. Verify the new workout appears with correct totalSets and exerciseNames (Phase 1 work)

Boundary warning path:
1. Upload 2 clips that mention different roster client names (using a fixture transcript)
2. Merge
3. Verify warning banner renders with both names listed
4. Verify "Continue anyway" proceeds; "Re-select" re-opens queue

### 11.4 Tier-A Baseline Disclosure (Rule 56)
- Backend vitest must remain green (currently 2163/2163)
- Frontend tsc may continue OOM at default heap on this machine (pre-existing baseline) — slice files individually pass tsc; if a CI baseline check is desired, add to Phase 3.x

---

## 12. Rollback Plan

If something goes wrong post-deploy:
1. **Feature flag:** wrap the merge endpoint mount + frontend entry point in a `PLAUD_MERGE_ENABLED` env var. Default `true` initially; flip to `false` to disable without code revert.
2. **Single-clip path stays untouched** — disabling merge does NOT affect existing single-clip workflow
3. **Clip queue cleanup:** if disk fills, set TTL to 1m to fast-purge
4. **Git revert:** clean revert of slices 3.1-3.10 via `git revert <sha-range>` — no Phase 1/2 dependencies disturbed (Phase 3 is purely additive)

---

## 13. Future Review Hooks (Rule 48)

For the next AI/security reviewer to look at:
- Re-examine the boundary detector regex against new client names with apostrophes / hyphens / non-ASCII chars
- Audit the ffmpeg subprocess for command injection (clip filenames are server-generated UUIDs — should be safe, but verify)
- Check disk usage telemetry after 30 days of multi-trainer use
- Verify the 24h TTL cron actually runs (some Render services skip cron on free tier — confirm Pro plan supports it)
- Confirm Gemini privacy policy still aligns with Sean's "zero PII to LLMs" posture given audio contains client names
- Re-evaluate whether to switch to AssemblyAI (per `PLAUD-AUDIO-INTELLIGENCE.md` Tier 1) for transcription cost reasons

---

## 14. What Sean Decides Before Codex Review

Sean reads §10 (Q1-Q6) and signs off on each. After that:
1. Claude updates this plan with Sean's decisions inline
2. Claude drafts the Codex review prompt pointing Codex at this single doc
3. Codex returns APPROVE / REVISE / REJECT
4. If REVISE: Claude iterates plan, repeats
5. If APPROVE: Claude begins slice 3.1 implementation

Per CLAUDE.md Rule 46, Codex is the final gate. Codex approves the plan BEFORE code lands.

---

## 15. Sign-off & Ownership

- **Plan author:** Claude Opus (this doc)
- **Plan reviewer (after Sean signs off on §10):** Codex
- **Implementer:** Claude (will draft slice-by-slice receipts per Rule 26)
- **Final gate:** Codex APPROVE on cumulative Phase 1+2+3 review (per Sean's batched-review directive)
- **Production deploy:** Sean pushes to `main` after Playwright smoke green

---

## 16. Phase 3.x — External API Support (deferred, designed-for in Phase 3)

Sean's intent (Q1 follow-up): other Sean-controlled instances should be able to push clips and read merged transcripts via API, enabling future enhancements (Hermes Operator Mode, cross-device sync, AI agents that auto-merge as clips arrive, third-party webhook integrations).

### 16.1 Design constraints Phase 3 must respect now (so Phase 3.x doesn't require rework)

1. **Endpoint shape stays REST-clean.** No session-cookie-only gates that an API client can't replicate. All four endpoints accept `Authorization: Bearer <jwt>` AND will accept `X-Api-Key: <key>` in Phase 3.x — implement auth via existing `protect` middleware which already supports both styles.
2. **No request-body shapes that depend on browser-specific multipart quirks.** Use standard `multipart/form-data` with named `files[]` field — works from `curl`, Python `requests`, etc.
3. **All responses are JSON-first** (no HTML redirects, no sticky-error response patterns). Errors carry `{ success: false, error: { code: '...', message: '...' } }` so external clients can switch on `error.code`.
4. **Idempotency hooks present:** `POST /api/plaud/clips/merge` accepts an optional `Idempotency-Key` header. If two requests arrive with the same key from the same user within 1h, the second returns the cached response from the first. This is Phase 3 minimum (just store last 1h of merge keys per user in memory or DB) — protects against retry storms.
5. **Pagination on list endpoints** ready for the day a power user has 50 pending clips: `GET /api/plaud/clips?limit=20&cursor=...`.

### 16.2 Phase 3.x scope (NOT this phase)

| Feature | Phase 3.x est |
|---|---|
| API key issuance + revocation UI | 1 day |
| Webhook outbound: notify external system on merge complete | 0.5 day |
| Webhook inbound: PLAUD-style auto-upload from external recorder | 1-2 days |
| Gemini Files API for >20MB merge | 0.5 day |
| Per-API-key rate limit tier separate from per-user | 0.5 day |

These all get their own debate file when Sean greenlights Phase 3.x.

---

## 17. Two-Tier Storage Architecture (NEW per Q3 decision)

### 17.1 Topology
```
                    ┌─────────────────┐
upload (multipart)  │  Express        │
─────────────────►  │  multer mem     │
                    │  buffer         │
                    └────────┬────────┘
                             │ write
                             ▼
                    ┌─────────────────┐         ┌──────────────────┐
                    │  Render disk    │  async  │  Cloudflare R2   │
                    │  /tmp/plaud/    │ ───────►│  swanstudios-    │
                    │  <userId>/      │ mirror  │  plaud-clips     │
                    │  <clipId>.<ext> │         │  /<userId>/...   │
                    └────────┬────────┘         └─────────┬────────┘
                             │                            │
                             ▼ read                       ▼ fallback read
                    ┌─────────────────────────────────────────┐
                    │  audioMergeService (ffmpeg)             │
                    │  - tries disk first                     │
                    │  - if missing, streams from R2 to disk  │
                    │  - then runs ffmpeg                     │
                    └─────────────────────────────────────────┘
```

### 17.2 Service: `backend/services/plaudClipStorageDualTier.mjs`

Public API:
```js
async function writeClip(userId, clipId, buffer, mimetype) {
  // 1. Write to /tmp/plaud/<userId>/<clipId>.<ext>      (sync, fast)
  // 2. Spawn async R2 upload (non-blocking)             (async, eventual)
  // 3. Return { diskPath, r2Key, mirrorPending: true }
}

async function readClip(userId, clipId) {
  // 1. Try disk read first
  // 2. If ENOENT, stream from R2 → write to disk → return path
  // 3. If both fail, throw ClipNotFoundError
}

async function deleteClip(userId, clipId) {
  // 1. Unlink disk
  // 2. Delete R2 object (async, non-blocking)
}

async function listClipsForUser(userId, { limit, cursor }) {
  // 1. Read disk listing first (authoritative for "currently active")
  // 2. Annotate with R2 mirror status
}

// Cron-driven cleanup
async function purgeExpired() {
  // Walks both tiers, deletes anything older than 24h.
  // Re-merge window: anything merged & ≥1h ago gets fast-tracked for delete.
}
```

### 17.3 R2 config
- Bucket: `swanstudios-plaud-clips` (NEW — adds to existing badges/videos buckets)
- Auth: existing R2 credentials in env (re-use `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
- Lifecycle: bucket-level 30-day delete policy as backstop (TTL cron is primary cleanup)
- Encryption: server-side AES-256 (R2 default)
- Access: private only, never public-readable

### 17.4 Failure modes & graceful degradation
- **R2 down on upload:** disk write succeeds → response succeeds → R2 mirror queued for retry. Trainer experience unaffected.
- **Disk lost (Render restart):** R2 fallback reads succeed. Slightly slower merge but works.
- **Both lost:** clip is gone. Frontend gets `ClipNotFoundError` from merge endpoint, banner: "One or more clips expired. Please re-upload and try again."
- **R2 mirror falls behind:** non-blocking; doesn't gate merges. Backlog drains via cron.

### 17.5 Cost
- R2 is ~$0.015/GB/month + $0 egress within Cloudflare. 24h TTL keeps storage tiny (<1GB even at 100 trainers).
- ffmpeg subprocess on Render = compute time only, no extra cost.

---

## 18. Gap-Fill (Sean's "make sure to add missing gaps" directive 2026-05-03)

Items not covered in v1 of this plan that I'm adding now:

### 18.1 Idempotency
- Merge endpoint accepts `Idempotency-Key` header
- Server stores last 1h of (userId, key) → response cache (in-memory Map with TTL, or Postgres if scaling)
- Repeat request returns cached response without re-running ffmpeg

### 18.2 Cancel-in-flight
- Frontend merge button shows progress + Cancel button
- Cancel POSTs to `DELETE /api/plaud/clips/merge/:requestId` (NEW endpoint)
- Server kills ffmpeg subprocess + skips downstream transcribe + parse
- Cleans up partial merged file

### 18.3 Audit trail (CLAUDE.md Rule 8 — zero PII to LLMs aware)
- New table `plaud_merge_audit` (Sequelize migration)
- Columns: `id, userId (trainer), clientId, mergeRequestId, clipIds (JSONB array), durationSec, transcriptHash (sha256, NOT raw text), parsedExerciseCount, status, errorCode, createdAt, updatedAt`
- **Stores hash of transcript, NOT transcript itself** — auditable without persisting PII
- Admin can query for trainer accountability without leaking client conversations

### 18.4 Concurrent merge protection
- Per-user lock during merge: at most one active merge per `userId`
- Second concurrent merge attempt returns `409 Conflict { code: 'MERGE_IN_PROGRESS' }`
- Lock released on completion or 60s timeout (whichever first)

### 18.5 Empty / silent / corrupt clip detection
- Pre-flight check on upload: ffmpeg `-i clip -af volumedetect -f null -` → reject if `mean_volume` below threshold (-50 dB)
- Returns `422 Unprocessable Entity { code: 'CLIP_TOO_SILENT' }` — trainer knows to re-record
- Same check pre-merge (defense in depth)

### 18.6 Re-merge UX
- After successful merge, the source clips show a "Recently merged (50 min remaining)" badge in the queue
- Re-merge button on the badge → re-opens selection, can swap clips in/out within the 1h window
- After 1h, clips auto-delete and badge disappears

### 18.7 Telemetry
- Metric: `plaud.merge.success_count`, `plaud.merge.failure_count`, `plaud.merge.duration_ms` (histogram)
- Metric: `plaud.merge.clip_count` (histogram of how many clips per merge)
- Metric: `plaud.merge.boundary_warning_count`
- Existing logger.info/warn already handles structured emission; pipe to whatever telemetry sink Sean has wired (defer to existing pattern)

### 18.8 Admin override (defer to Phase 3.x)
- Sean as admin should be able to query/manage clips for any trainer's queue
- Phase 3 endpoint scope: `protect + authorize(['admin','trainer'])` with ownership filter `req.user.id === clip.uploaderId`
- Phase 3.x: drop ownership filter when `req.user.role === 'admin'` — admin can see all
- Designed-for: ownership check is in middleware, role-bypass is a clean addition

### 18.9 Approval audit (transcript without PII storage)
- When trainer approves the parsed workout and it logs:
  - `plaud_merge_audit.status` flips to `'approved'`
  - `parsedExerciseCount` and `transcriptHash` get committed
  - Raw transcript is NOT persisted (drops out of memory at response end)
- If trainer/client later disputes ("did Sean actually do this exercise?"):
  - Sean can pull the audit row → show the trainer who approved + when + how many exercises were detected → that's enough for accountability without storing the conversation

### 18.10 Notification on log success
- After apply step completes, existing notification path (if wired) sends client SMS/email recap
- No new notification work in Phase 3 — relies on existing `sessionNotifier.mjs` if present, else passes silently
- Phase 3.x add explicit notification toggle UI

### 18.11 Mobile gesture pattern
- Multi-select on touch: tap to select (single tap, NOT long-press) — matches iOS Photos pattern
- "Merge selected (N)" button always visible at bottom on mobile (sticky footer pattern)
- Swipe-left on a clip row to reveal Delete (iOS Mail pattern)
- All confirmed against CLAUDE.md Rule 22 (premium feel) + Rule 25 (motion premium + GPU-safe)

### 18.12 Accessibility
- Each clip row is `role="checkbox" aria-checked={selected}` for screen reader use
- Merge button gets `aria-label="Merge {N} selected clips for {clientName}"`
- Boundary warning is `role="alert"` so AT users hear it before continuing
- All meets WCAG 4.5:1 contrast (Rule 7) using existing Crystalline Swan tokens

---
