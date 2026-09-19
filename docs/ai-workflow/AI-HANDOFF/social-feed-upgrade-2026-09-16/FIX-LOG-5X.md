# FIX LOG — hostile review ×5 remediation

**Date:** 2026-09-18 · **Scope:** S1 Coach Signal hardening, S1.5 dock wiring, S2 Proof Card,
S3 Spotlight receive side · **Rule basis:** 17, 20, 42, 56, 58, 61

Every fix below traces to a finding in `HOSTILE-REVIEW-5X.md`. Verification commands and their
real output are recorded at the bottom.

---

## S1 — Coach Signal

### F2.1 (CRITICAL) Self-signal guard was dead code
`req.user.id` is a **string** (`toStringId`, `backend/middleware/authMiddleware.mjs:357`) while
`post.userId` is an INTEGER → JS **number**. `post.userId === req.user.id` was therefore
**always false**, so a coach could signal their own post.
**Fix:** added `sameId()` and used it for the guard; every id comparison in the route now
normalizes both sides (`backend/routes/social/coachSignalRoutes.mjs`).
**Locked by:** `coach signal route security contract › compares ids by normalized value`.

### F2.3 (MED) NULL-status assignment denied legitimate coaches
`ClientTrainerAssignment.status` is `STRING allowNull:true default 'active'`. The route demanded
exactly `'active'`, so a legacy raw-SQL row with NULL status produced a 403 for a real coach.
**Fix:** `[Op.or]: [{ status: 'active' }, { status: { [Op.is]: null } }]` — SQL NULL never matches
`IN (...)`, so NULL is expressed with `Op.is`.
**Locked by:** `treats a NULL assignment status as active instead of denying a legitimate coach`.

### F2.4 (MED) Note over-length was silently truncated
`note.trim().slice(0, 120)` mutated user input without telling anyone.
**Fix:** over-length now returns **422** with a clear message; blank still 422.
**Locked by:** `rejects an over-length note with 422 instead of silently truncating it`.

### F2.5 (LOW) Dead `Op.or: ['approved', null]` moderation filter
`moderationStatus` is `ENUM NOT NULL default 'approved'`, so NULL can never occur and
`IN ('approved', NULL)` can never match NULL in SQL.
**Fix:** simplified to `moderationStatus: 'approved'` with a comment explaining why only approved
posts are signalable.

### F3.1 (MED) Model/migration `updatedAt` drift (rule 58)
The migration creates `updatedAt NOT NULL DEFAULT NOW()`; the model declared `updatedAt: false`.
**Fix:** aligned the **model** to the deployed schema (removed `updatedAt: false`) rather than
changing a column that may already exist in a database. Immutability is enforced at the route layer
(there is no PUT/PATCH), not by an ORM flag.
**Locked by:** `coach signal schema contract › keeps the model in step with the migration on timestamps`.

### F3.4 (MED) `CASCADE` erased recognition history
Deleting a post permanently destroyed the member's record of coach recognition.
**Fix:** `onDelete: 'SET NULL'` on the `postId` FK — the column was already nullable and the model
comment anticipates postId-less signals.
**Locked by:** `preserves signal history when a post is deleted (SET NULL, not CASCADE)`.
**⚠️ If this migration was already applied locally**, it must be re-run
(`npm run migrate:undo` then `npm run migrate`) for the FK change to take effect. It is untracked
and undeployed, so no production impact.

### F4.1 (HIGH) `SIGNALABLE_TYPES` did not match the real post ENUM
The picker filtered on `transformation` and `progress` (**neither exists** in
`SocialPost.type`) and omitted `general` — the **default type of every post**. Result: the
candidate list was starved.
**Fix:** aligned to the real ENUM (`general, workout, achievement, challenge, milestone`) with a
label for each, plus a comment naming the full ENUM so future drift is obvious.
**Locked by:** `post-type drift guard › filters ONLY on types that exist in the real SocialPost.type ENUM`
and `› can signal the default post type`.

### F4.3 (MED) Inline hardcoded colors contradicted the file's stated posture
`rgba(3,7,18,0.55)` / `rgba(198,168,75,0.4)` inline, while the header claimed it reused the
dock's style vocabulary.
**Fix:** extracted `SignalNoteField` into `InlineChallengeFinder.styles.ts` using tokens
(`color-mix` over `var(--accent-gold)` / `var(--bg-base)`), 44px target preserved.

### F4.4 (MED) Undocumented `MAX_CANDIDATES = 2`
**Fix:** raised to 3 with a documented rationale (a scan surface, not a feed).

### New defect found by the new tests
`Number(candidate.postId)` produced **`NaN`** for a non-numeric id, which serializes to `null` and
surfaces as a confusing 422 from the server.
**Fix:** the picker now validates locally, fails honestly, and never POSTs `NaN`.
**Locked by:** `never POSTs NaN for a non-numeric post id`.

### F1.4 / F4.4 (HIGH) Zero frontend test coverage for S1
**Fix:** added `CoachSignalBanner.test.tsx` (**8 tests**) and `InlineSignalPicker.test.tsx`
(**9 tests**), including the cross-repo ENUM drift guard.

### F1.1 (HIGH) S1's coach action was unreachable
`SocialCoachDock` was imported only by its own test; its mount point (`DashboardFeedTab`) has no
live consumer.
**Fix (S1.5):** mounted `SocialCoachDock` on the live Home feed via a new `SocialDockSlot`
(`ClientDashboardHome.tsx`, `ClientDashboardHome.cardStyles.ts`). Coach chips self-gate by role
inside the dock, so client surfaces are unchanged.
**Locked by:** `SocialDockWiring.contract.test.ts` (**5 tests**) — fails if the dock is orphaned again.

---

## S2 — Proof Card (built)

`backend/routes/social/proofCardRoutes.mjs` · `frontend/src/components/Social/Feed/components/ProofCard.tsx`
· `ProofCard.styles.ts` · mounted at `/api/social/proof-card`.

Decisions taken where the blueprint was silent:
- **Own-stats only, and 404 — never 403 — for a foreign session.** A 403 would confirm that another
  member's session id exists. Locked by test.
- **The Victory mini-bar is honest.** The blueprint asked for "sets" but sets-per-exercise lives
  behind `workout_exercises` → a set-level join. Rather than draw a decorative chart, the card
  compares this session against the member's **own 30-day average** and renders **no chart at all**
  when there is no history to compare against. Locked by test.
- **"Post to feed" reuses `POST /api/social/posts`** with `workoutSessionId` — no new write path,
  no new table.
- **Export surface uses literal colors** (`#030712` bg, 16px padding, ≥16px type) per the HY3 seat's
  catch that third-party consumers strip CSS variables.

Tests: **13 backend** (incl. 6 pure `computeStreakDays` cases) + **9 frontend**.

---

## S3 — Spotlight receive side (built)

`backend/models/social/SwanSpotlight.mjs` · `backend/migrations/20260916-create-swan-spotlights.cjs`
(top-level — the non-recursive `readdirSync` at `backend/scripts/safe-migrate.mjs:146` means a
subdirectory migration would never run) · `backend/routes/bridge/bridgeIngestRoutes.mjs` ·
`backend/services/swanBridgeSignature.mjs` · `backend/routes/social/spotlightReadRoutes.mjs` ·
`frontend/src/components/Social/Spotlight/SpotlightRail.tsx` + `.styles.ts`.

**Blocking discovery:** the global body parser in `backend/core/middleware/index.mjs` skips only a
whitelist of webhook paths, so `/api/bridge` had to be added to that filter — otherwise
`express.json()` consumes the stream, `req.rawBody` is empty, and HMAC verification can never pass.
The bridge router owns its own raw-aware parser, exactly like the PLAUD precedent.

Ingest order implemented as specified: flag (503) → signature + skew (401) → schema (422) →
banned-terms second gate (422) → idempotent upsert → best-effort R2 re-host → audit log.

- **Signature safety** follows the PLAUD precedent's hard-won properties: hex shape validated
  *before* `timingSafeEqual` (so a malformed signature is 401, not a length-mismatch 500),
  constant-time compare, and a resolver failure that never discloses which env var was consulted.
- **`bannedTerms` was exported from `feedEnrichment.mjs`** rather than duplicated, so the second
  gate can never drift from the first.
- **Image re-host never fails the ingest** — a broken image degrades to a text-only card.
- **The rail is editorial**: no like/comment/share affordance exists (asserted against
  comment-stripped source), ice-cyan chrome only, 44px dismiss/mute targets, renders **nothing**
  when the flag is off, when muted, or when empty.

Tests: **19 backend** (real signed supertest requests: tampered body, wrong secret, stale timestamp,
malformed signature, banned term in headline *and* curator note, replay no-op, older-revision no-op,
higher-revision upsert, retraction, R2 failure, `javascript:` image URL, secret non-disclosure)
+ **12 frontend**.

---

## Blueprint corrections (F1.2 / F1.3 / F1.5 / F5.4)

- **F1.2** — §4.2 cited `scripts/safe-migrate.mjs:146` and `scripts/shadow-delta-audit.mjs:73-76`;
  the real paths are `backend/scripts/…`. The underlying claim was **verified TRUE**.
- **F1.3** — the stale "80/80 (16 files)" figure replaced with the measured result.
- **F1.5** — §4.3's `coachSignal: {coachId, note}` corrected to the real payload.
- **F5.1** — documented that `tsc` needs `NODE_OPTIONS=--max-old-space-size=8192`; at the default
  4 GB heap it dies with an OOM, and piping to `tail` masks the exit code.
- **F5.4** — added `00-README.md` (Builder Contract) and `07-checkpoints.md` so the package matches
  the `fable-blueprint-forge` shape the workstream is supposed to follow.

## F5.2 — still open, and it is Sean's call
Nothing in this workstream is committed. **Rule 42 warning:** `routes/social/index.mjs` (modified)
imports `coachSignalRoutes.mjs` and `proofCardRoutes.mjs` (untracked). If the mount lands without
the files, Render crash-loops with `ERR_MODULE_NOT_FOUND`. No push without Sean.

---

## Verification (run 2026-09-18, real output)

| Command | Result |
|---|---|
| `npx vitest run tests/api/{coachSignalRoutes,proofCardRoutes,swanBridgeIngest,socialRoutesDisclosure}` (backend) | **47 passed / 4 files** |
| `npx vitest run src/components/Social src/components/UserDashboard` (frontend) | **530 passed / 105 files** |
| `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` | **exit 0 — zero errors** |
| module load smoke test (9 changed/new backend files) | all load |

**Baseline disclosure (rule 56):** the frontend TypeScript baseline is **clean** — but only with an
8 GB heap. The `npx tsc --noEmit` form quoted in the original blueprint does **not** run.
