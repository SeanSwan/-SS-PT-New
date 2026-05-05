# Phase 5 — Codex v1.2 Re-Review Response

**Reviewer:** OpenRouter `openai/gpt-5.5`
**Date:** 2026-05-04
**Tokens:** 28282 in / 6010 out
**Cost:** $0.3217
**Wall time:** 103.1s

---

## VERDICT: APPROVE

## One-paragraph reason

v1.2 closes the v1.1 blocking issues and is implementation-ready for Slice 5.1. The CR-6 partial-fix gaps are now resolved: dedup is status-aware, replay responses no longer leak `clip_id`, and the failure matrix matches the reordered pipeline. The 7 HIGH findings introduced in v1.1 are fixed with concrete plan text and acceptance gates. Remaining issues are minor documentation/test-plan polish or explicitly accepted v1.x backlog items, not blockers under Rule 52 / anti-rework constraints.

## Status of v1.1 review items (12 total):

- **HIGH-1: FIXED** — §6.1 Step 2 now checks terminal-success states only: `pending_merge`, `merged`, `discarded`. Existing `uploading` returns `429 CLIP_INGEST_IN_PROGRESS` with `Retry-After: 300`; existing `failed` is deleted and a fresh attempt proceeds. §8.1/§8.2 now document the post-insert stuck-`uploading` recovery path.

- **HIGH-2: FIXED** — §20 item 4 now requires replay response as `200 { success: true, event_id, status: "already_processed" }` with **NO `clip_id`**. §5.4 also repeats that `clip_id` is only returned on queued success.

- **HIGH-3: FIXED** — §8 has been rewritten to match the v1.1+ pipeline: fetch/probe failures before insert leave no clip row; post-insert failures leave `uploading` and are recovered via retry + stale-uploading reaper. Old “audio fetch creates failed clip” matrix entries are gone.

- **HIGH-4: FIXED** — §4.2 Step 8 now branches on `body.event_type` before URL validation. `audio_ready` requires `audio_url`; `transcript_ready` skips URL validation and is handled as NOOP; unknown event types fail closed with `400 UNKNOWN_EVENT_TYPE`.

- **HIGH-5: FIXED** — §18.2 now explicitly requires one of three raw-body-safe mount strategies: mount-before-global-parser, path-filter exclusion, or route-specific raw parser. It also requires a Slice 5.5 integration test through the actual `backend/server.mjs` middleware chain proving `req.rawBody` is populated.

- **HIGH-6: FIXED** — The stale duplicate §11 sections are removed. v1.2 has one authoritative §11 test plan covering unit, Sequelize regression, integration, schema-drift, staging smoke, and failure-mode smoke.

- **HIGH-7: FIXED** — §13.2 startup validation now calls `resolveWebhookSecret(process.env.PLAUD_APPLAUD_WEBHOOK_KEY_ID)` using the same resolver as signature verification and refuses to mount if the active key does not resolve to a usable secret.

- **M-1: FIXED** — §4.2 Step 1 now validates `sig` with `^[0-9a-f]{64}$` and `nonce` with `^[0-9a-f]{32}$` before `crypto.timingSafeEqual`, preventing malformed input from throwing length-mismatch 500s.

- **M-2: FIXED** — §4.2 Step 9 now requires body `timestamp`/`nonce`, if present, to match the signed header values. Mismatches return `400 BODY_TIMESTAMP_MISMATCH` or `400 BODY_NONCE_MISMATCH`.

- **M-3: PARTIAL / ACCEPTABLE DEFERRAL** — §5.5 still says “per-secret-version” while §18.2 places rate limiting before signature verification, so the precise limiter key remains underspecified. However §0 explicitly moves this to v1.x backlog and the prior review classified it as deferrable. Non-blocking for v1.2 approval.

- **L-1: FIXED** — Duplicate §6.2 heading is gone; only one §6.2 remains.

- **L-2: FIXED** — §13.2 mount-time validation now rejects `PLAUD_APPLAUD_MEDIA_BASE_URL` if it contains credentials via `u.username || u.password`.

## NEW CRITICAL or HIGH findings introduced by v1.2:

- **NONE**

## NEW MEDIUM/LOW findings:

- **MEDIUM — New status-aware recovery paths should get explicit tests during Slice 5.4/5.6.** §6.1 comments say the failed-row retry path is covered by §11.2, but §11.2 does not explicitly list tests for: existing `uploading` row → 429, existing `failed` row → delete + fresh insert, `writeClipToDisk` failure after insert → retry hits `uploading`, and stale-uploading reaper recovery. Add these while implementing; not a plan blocker.

- **LOW — §1.4 still has one stale success-criteria bullet.** It says network failures during audio fetch leave a clip in `'failed'` state, but v1.2’s authoritative §6/§8 behavior is now “no row before fetch/probe success.” Update wording when editing docs.

- **LOW — §12.3 has stale ops wording.** “Clip stuck in `failed`: usually means audio fetch timeout” no longer matches v1.2’s no-row-on-fetch-timeout behavior. Treat as runbook polish.

- **LOW / v1.x — Key-rotation fallback remains lightly specified.** §4.3 says the receiver supports V1/V2 fallback during rotation, while the §4.2 pseudocode shows active-key resolution only unless `kid` exists. Not relevant to initial V1 deployment, but clarify before first real rotation.

## Anti-rework verification: YES

No Phase 3 rework is required. v1.2 remains additive Phase 5 work: new webhook route, additive schema, tests, and operational docs. No unsupported demand is made against shipped Phase 3 flows.

## Next-step recommendation:

**APPROVE: proceed to Slice 5.1 implementation.**

Non-blocking v1.x / implementation-time backlog:
- Clarify concrete rate-limiter key.
- Add explicit tests for `uploading`/`failed` status-aware dedup recovery.
- Clean stale §1.4 and §12.3 wording.
- Clarify key-rotation fallback before first rotation.
