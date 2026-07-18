# Post-Save Handoff — Slice 2 Work Order (Save-Path Wiring)

**Branch:** `feat/logger-post-save-handoff` (off `origin/main c820dec42`) · **Slice 1 commits:** `f8b00c143` (build) · `31ca942a7` (review R1) · `651890fb1` (review R2) — held for push (Sean-gated; push only after ALL slices done).
**Slice 1 = UI + two pure services, feature-flagged DARK (`VITE_ENABLE_POST_SAVE_HANDOFF`, default off), NOT wired to any save path.** Slice 2 wires it. Source: Kimi 4.2 blueprint + Fable ruling §1.5.

---

## 1. The `HandoffData` assembler — MISSING PRODUCER (build this first)
The UI consumes `HandoffData` (`handoff/workoutHandoff.types.ts`) but **nothing produces it** yet. Build a backend assembler (Kimi A4) that, AFTER a successful save, returns:
- `proof` ← `buildProofSeries({ targetUserId, todaySessionId, models })`.
- `nba` ← `resolveNextBestAction({ viewerRole, viewerUserId, targetClientId, models, proofSeries })` (pass proof so `sessionsThisWeek` feeds Rule 3).
- `headline: HeadlineKind` ← resolver: `proof.pr → 'pr'`; else `proof.isFirstEver → 'first'`; else `proof.sessionsThisWeek >= 3 → 'streak'`; else `'default'`. **NOTE: `proof.isFirstEver` is computed but currently unread — this mapping is where it gets consumed.**
- `share: { eligible, reason }` ← ownership resolver: `eligible=true, reason='owner'` ONLY when the summary owner === viewer (client-self OR admin-self). Trainer-logging-for-a-client → `{ eligible:false, reason:'not-owner' }`. (The UI double-guards on `reason==='owner'`.)
- `pendingSync: boolean` ← true when the save was queued offline (from the logger's offline-queue state), else false.

## 2. Per-role save-path attachment (fail-closed, money-path safe)
`POST /api/workout-summaries` is `trainerOrAdminOnly` + takes `clientId` (trainer/admin-logs-for-client). The **client self-log** path is role-gated (`SELF_LOG_WORKOUT_ROLES` in `dailyWorkoutFormRoutes.mjs`) and coupled to session-deduction (`submitGuard`, `isNonDeductingClientSource`); a 2026-04-18 Codex fix removed `trainerOrAdminOnly` there because it 403'd clients. **Verify the exact client save endpoint end-to-end with a probe (Rule 55) before wiring.** Attach the handoff assembly AFTER the DB commit for EACH role's real save path.
- **Money-path (Fable R3, fail-closed):** handoff assembly must be best-effort AFTER commit — a handoff failure must NEVER block, duplicate, or roll back the save, and must never double-deduct a session credit.

## 3. Idempotency migration (Kimi A1)
Add `clientRequestId STRING(64) NULL` + a unique partial index (`WHERE clientRequestId IS NOT NULL`) to `WorkoutSessions`. Save handler: pre-check by `clientRequestId` → replay returns `200 { deduplicated:true }` (no second row); else `201`. This is a schema change to the SHARED `WorkoutSessions` table (4 loggers) — migrate up/down clean on PG + SQLite; existing rows NULL.

## 4. IDOR authz (Round-1 security finding #3 — MUST gate at the route)
`buildProofSeries({ targetUserId })` has NO internal authorization. The route/wiring MUST enforce: `viewerUserId === targetUserId` OR viewer is admin OR viewer is a trainer with an active `ClientTrainerAssignment` to that client — BEFORE calling it. Add a route-level authz test. Same gate for the `GET /api/workout-summaries/:id/handoff` re-entry route (404, not 403 — no existence leak).

## 5. Frontend mount rules
- **Victory lazy-load (repo convention):** mount `PostSaveHandoff` (or at least `ProofChart`) via `React.lazy` behind a `SafeChart` error boundary — do NOT eager-import Victory into the logger bundle.
- **Overlay portal:** render the overlay through a portal to `document.body` so the `--z-post-save-handoff` (10001) z-index isn't capped by an ancestor stacking context. (It already sits above the logger's rest-timer/sticky-bar/toasts/celebration band 9988–9999.)
- Flip `VITE_ENABLE_POST_SAVE_HANDOFF=true` only after wiring + verification.

## 6. Verify end-to-end (Rule 55/58)
- Probe the actual client vs trainer/admin save endpoints; confirm `Session.status` values `'scheduled'`/`'confirmed'` are valid for the column the NBA loader queries (loader test with mocked `models`, or a real-DB check).
- Deferred Slice-1 test coverage to add here: DB-loader tests (mocked models, incl. throw→null), `>12`-session window slice, focus-trap Tab/Shift-Tab + focus-restore, `todayE1rm===null` component render, year-boundary streak, unparseable-date sessions.

## 7. What is already DONE + verified in Slice 1 (do not redo)
Pure proof-series (Epley e1RM, dup-row aggregation, all-time PR, ISO-week streak), NBA 4-rule resolver + fail-CLOSED `enforceClientSafety` allowlist, the `PostSaveHandoff` UI (3 zones, Victory proof, NBA card, share stub) with real modal a11y (focus trap/Esc/restore), Dual-Button-Glow + AA contrast, reduced-motion, tokenized colors, feature-flag-dark. Coverage: backend node-harness green; frontend vitest 25/25; scoped tsc 0 errors. Three hostile-review rounds.
