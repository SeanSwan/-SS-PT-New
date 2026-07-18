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

## 2. Per-role save-path attachment — SAVE-PATH RECEIPT (2026-07-18, corrects the blueprint)
**The canonical `WorkoutSession`-creating save is `POST /api/workout/sessions`** (`workoutSessionRoutes.mjs:270`, mounted `backend/core/routes.mjs:361`) → `workoutSessionController` (`WorkoutSession.create`). Gated `protect` + **`assertAssignmentOrAdmin(req.user.id, req.user.role, sessionData.userId)`** = self / admin / assigned-trainer. Clients CAN self-create (self allowed).
- **CORRECTION (Rule 55/58):** `POST /api/workout-summaries` — the Kimi A4 assumed target — is actually the **summary-generation/email** endpoint (`useWorkoutSubmit.ts`, `isGeneratingSummary`, "sent to client!"), `trainerOrAdminOnly`. Do NOT attach the handoff there; it would fire on the email action, not the save.
- **Attach the handoff assembly inside `workoutSessionController`'s create handler, AFTER `WorkoutSession.create` commits** — one endpoint serves all three roles.
- **IDOR authz already solved:** reuse `assertAssignmentOrAdmin` (the endpoint's existing gate) for the proof/handoff `targetUserId` — satisfies Round-1 security finding #3 with no new authz code.
- **Still to trace before wiring:** the client logger's exact call into `POST /api/workout/sessions` (a WorkoutLogger-dir grep found no direct literal — it likely routes via a hook/service; the `/api/workout-summaries` call is only the summary step). Rule 31 shadow note: `/api/workout/sessions`, `/api/workout-summaries`, and legacy `/api/workout/plans` are overlapping `/api/workout*` mounts — verify mount order.
- **Money-path (Fable R3, fail-closed):** handoff assembly best-effort AFTER commit — never block, duplicate, or roll back the save, never double-deduct; `clientRequestId` idempotency on the create (§3).

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

---
## KIMI REVISE (2026-07-18) — BINDING REVISIONS + STEP-0 RESULTS
Kimi solo review verdict = **REVISE** (full: `KIMI-SLICE2-PLAN-REVIEW-2026-07-18.md`; workout-section enhancements: `KIMI-WORKOUT-SECTION-ENHANCEMENTS-2026-07-18.md`). These are binding:

**STEP-0 (traced, [VERIFIED]):**
- Client hero save = **`POST /api/workout-forms`** (`dailyWorkoutFormRoutes` → creates WorkoutSession + `WorkoutLog.bulkCreate`). MCP/structured save = `POST /api/workout/sessions` (`workoutSessionController` → WorkoutExercise/Set). **The assembler MUST fire from BOTH** (shared `assembleHandoff`), or the client hero moment never shows.
- `assertAssignmentOrAdmin` → `backend/middleware/verifyClientAccess.mjs` (confirm bool-vs-throw at build). Analytics sink = **`useAnalytics`** hook. `SafeChart` = `frontend/src/components/Charts/SafeChart.tsx`.

**DATA-SOURCE FIX (headline — corrects Slice 1):** new `workoutProofLoader.mjs` reads BOTH `logs` (WorkoutLog) + `exercises→sets`, maps to `{sessionId, performedAt, nameKey, displayName, setNumber, weight, reps, source}`. Identity = `normalizeExerciseName` (trim→lowercase→collapse spaces, **exact match, NO fuzzy** — false-merge fabricates PRs). Precedence: within `(sessionId,nameKey)`, **if any `logs` rows exist prefer `logs`, else `exercises→sets`** (Set rows can be plan/template placeholders → never render planned as performed). Dedupe by `setNumber`. Guards: drop `weight<=0|null`, `reps<=0|null|>36`. Proof identity keys on `nameKey` (not exerciseId); display = latest raw name. `isFirstEver` = first session with ≥1 eligible set (either source), + empty-series headline guard.

**MONEY-PATH:** catch-and-replay on `SequelizeUniqueConstraintError` (assemble handoff on replay too, return 200 deduplicated); deduction stays INSIDE the create tx; **server-side kill switch `ENABLE_POST_SAVE_HANDOFF` env (default false)** — assembler returns null when off (VITE flag alone insufficient on a money path). Assembler per-zone best-effort (proof/nba/share each try/catch → null; never blocks the save).

**OTHER BINDING:** re-entry route re-keyed to `GET /api/workout/sessions/:id/handoff` (404 for miss AND unauthorized); `pendingSync` moves OUT of the backend assembler INTO the client view-model; analytics contract = `handoff_shown|nba_cta_tapped|proof_share_tapped` with zero-PII payload (roles/headline/ruleId/booleans only — NEVER exerciseName/ids); viewer-role-aware headline copy (trainer "your client hit a PR" vs client "you hit a PR"); migration = fixed index name + down drops index then column + off-peak note + `[Op.ne]:null`; frontend portal + lazy + skeleton min-height (CLS) + body scroll-lock + focus-trap tests against the portal mount. Paste-ready fold-ins F1–F7 in the review doc are the implementation.

**BUILD ORDER (Kimi §e):** Step 0 (done) → backend: exerciseIdentity → migration → workoutProofLoader → proof service edit (nameKey) → assembler → wire controller + dailyWorkoutFormRoutes → re-entry route → backend tests → frontend: types (pendingSync out) → analytics → portal/lazy mount → shells → frontend tests.
