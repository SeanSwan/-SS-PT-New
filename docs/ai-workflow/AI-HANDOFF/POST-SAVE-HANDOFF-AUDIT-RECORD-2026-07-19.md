# POST-SAVE HANDOFF — PHASE COMPLETION AUDIT RECORD (Rule 48)

## 1. Phase header
- **Phase:** Post-Save Handoff (Workout Logger terminal "proof → next-action → share" moment).
- **Scope:** After a workout save, assemble a best-effort handoff (est-1RM proof chart from REAL logged data, a single next-best-action, a share stub) and render it as the terminal state, layered over the existing SaveSuccessPanel.
- **Dates:** built + reviewed 2026-07-18 → shipped to `main` 2026-07-19.
- **Reviewers:** Kimi K3 (Slice-2 plan + wiring + **money-path go-live gate = GO**), plus 13 Claude-family hostile-review passes (Slice-2 R1–R5, Chunk-C review, pre-push review, post-launch sweep + convergence).
- **Final verdict:** SHIPPED (double-gated dark → server flag ON; client flag = Sean's Render setting). Reviewed to convergence (last round DRY/DRY).
- **Ship commits:** `main` `f8b00c143 .. e3042b9a6` (feature branch `feat/logger-post-save-handoff`, merged to main via conflict-free merges).

## 2. Files involved
**Backend (new unless noted):**
- `backend/services/workoutProofLoader.mjs` — dual-source reader (WorkoutLog `logs` + WorkoutExercise→Set `exercises`), unify by normalized name, logs-win precedence. ~120 ln.
- `backend/services/workoutProofSeriesService.mjs` — pure math: Epley e1RM (≤36-rep cap), chartable-first pick, windowed PR, ISO-week streak, honest-null. ~200 ln.
- `backend/services/postSaveHandoffAssembler.mjs` — HandoffData producer; `safeAssemble` never-throws + 2500ms budget; server kill switch. ~72 ln.
- `backend/services/nextBestActionResolverService.mjs` — 4-rule NBA resolver + fail-closed `enforceClientSafety`; subject-scoped calendar lookup. ~177 ln.
- `backend/routes/workoutSessionRoutes.mjs` (mod) — create + per-user idempotency replay + `GET /:id/handoff` re-entry (404-for-both).
- `backend/routes/dailyWorkoutFormRoutes.mjs` (mod) — FORM money-path: post-commit best-effort handoff in the 201.
- `backend/models/WorkoutSession.mjs` (mod) — `clientRequestId STRING(64)` nullable.
- `backend/migrations/20260718120000-add-client-request-id-to-workout-sessions.cjs` — composite partial unique index `(userId, clientRequestId) WHERE clientRequestId IS NOT NULL`, atomic.
- `backend/tests/unit/workoutPostSaveHandoff.test.mjs`, `backend/tests/api/workoutSessionRoutesLegacyIsolation.test.mjs`.

**Frontend (new unless noted):**
- `frontend/src/components/WorkoutLogger/handoff/` — `PostSaveHandoff.tsx` (portal modal, focus-trap, scroll-lock), `PostSaveHandoff.styles.ts`, `ProofChart.tsx` (Victory), `NextBestActionCard.tsx`, `ShareProofButton.tsx`, `handoffRoles.ts`, `postSaveHandoffFlag.ts`, `workoutHandoff.types.ts`, `WorkoutLoggerHandoffMount.tsx` (+ error boundary) — and their `.test.tsx` (29 tests).
- `frontend/src/services/nasmApiService.ts` (mod) — thread server `handoff` sibling onto `DailyWorkoutForm`.
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` (mod) — render `<WorkoutLoggerHandoffMount>` after the panel.

## 3. Architecture & runtime flow
`Client logs workout → POST /api/workout-forms → tx: persist WorkoutLog rows + deduct availableSessions → COMMIT →` (post-commit, best-effort) `safeAssemble({viewer,target,todaySessionId}) → buildProofSeries (loadUnifiedSessions reads logs+exercises→sets, unify by nameKey, logs-win) + resolveNextBestAction + resolveShare → handoff in 201 → nasmApiService maps handoff onto lastSaveResponse → WorkoutLoggerHandoffMount → PostSaveHandoff (portal modal) → Done reveals SaveSuccessPanel beneath.`
Data reality (prod, verified 2026-07-19): all real proof lives in `workout_logs` (`sessionId` FK); the `exercises→sets` path is empty. Associations verified matching real columns.

## 4. Security logic & posture (WHAT it blocks / WHY / HOW it could break)
- **Money-path fail-closed** — handoff assembles strictly AFTER commit; `safeAssemble` = `Promise.race([assemble, 2500ms→null]).catch(()=>null).finally(clearTimeout)`; per-zone `zone()` null-degrade; route-level `try/catch{handoff=null}`. Blocks: a handoff failure 500-ing / rolling back / double-deducting a committed save. Breaks if: any pre-commit coupling is introduced, or `safeAssemble` is bypassed. Frontend mirror: `HandoffErrorBoundary` degrades a render error to null (panel survives).
- **Kill switches (double, default OFF)** — server `ENABLE_POST_SAVE_HANDOFF !== 'true'` returns null on the first line of `assembleHandoff` (no DB read); client `VITE_ENABLE_POST_SAVE_HANDOFF` strict `=== 'true'`. Both must be true to render. Breaks if: a truthy (non-strict) flag check is used.
- **IDOR closed** — `GET /:id/handoff` derives ownership from `session.userId` (never a caller param), gates self ∨ assignment ∨ admin, returns **404 for both miss AND unauthorized** (no existence oracle). Idempotency replay `findOne` is `{clientRequestId, userId}`-scoped; the composite index is PER-USER (a global unique on a client value would be cross-user IDOR).
- **Trainer-indispensability** — server `enforceClientSafety` fail-closed allowlist (only provable trainer/admin gets a trainerOnly action) + UI double-guard (`NextBestActionCard`, `mapRole` unknown→client).
- **Zero-PII (Rule 8)** — free-text `exerciseName` reaches NO log line (loader/NBA log `err.name`+`err.message` only via the real `logger.mjs`), NO analytics event (`handoff_shown`/`nba_cta_tapped`/`proof_share_tapped` carry enums/booleans only), NO LLM. `exerciseName` appears only in on-device `navigator.share`/aria (owner's own data).
- **Open-redirect** — `isInternalHref` rejects `//`, `\`, `javascript:`, absolute; only the guarded NBA CTA reaches `navigate`.
- **OWASP** — A01 access control (fail-closed gates), A04 insecure design (kill switch + best-effort), A09 logging (sanitized).

## 5. Best practices applied
Rules 4 (all new files <300 ln), 6 (token+fallback), 8 (zero PII), 17 (dual-pass), 19 (no speculative success — every claim VERIFIED), 26/29 (canonical-surface + schema cross-check), 42 (pre-push backend audit clean), 43 (`css` helper for keyframes), 46 (multi-brain review; Kimi money-path gate), 56 (baseline disclosure), 58 (schema-drift proactive — column-name/FK verified against prod), 61 (slice-internal hostile review), 67 (worktree + explicit-path staging).

## 6. Known limitations / non-goals (deliberate)
- Proof `pr`/`isFirstEver` are WINDOWED to the newest ≤60 sessions (relabeled "a new best" + "LAST N SESSIONS"; not all-time). Suppressed for non-newest/backdated `today`.
- Create path (`POST /api/workout/sessions`) persists no per-set rows → handoff is proof-null there by construction (form path is the live path).
- Bodyweight/cardio-only sessions → proof null → handoff suppressed (fail-closed; not "renders after EVERY save").
- 2500ms race does not cancel the losing query (accepted; alert on budget-exhaustion).

## 7. Performance & UX
- One extra DB read set on the save 201 when enabled (batched via `separate:true` — no cartesian; 2500ms-bounded). Post-commit → never blocks the money path.
- "Layer over, keep panel" (Sean's call) — additive, reversible; portal to `<body>` + `overscroll-behavior:contain` + body scroll-lock; 44px targets, focus trap/Esc/restore, reduced-motion. Zero extra taps to the terminal proof.

## 8. Test coverage
- Frontend: handoff dir **29/29**; full WorkoutLogger suite **458/458**; frontend `tsc --noEmit` 0 errors on the feature surface (baseline carries 8 pre-existing `video-vnext`/`store-v4` errors — NOT this feature; Vite-ignored).
- Backend: `node --check` clean on all touched; dependency-free logic harness 27/27 (retired once the loader gained the winston logger — CI runs the real vitest suite now).
- NOT run locally: backend vitest (no node_modules in env + linux-pinned dcraw) → CI on Render.

## 9. Rollback plan
1. **Instant (no deploy):** in Render, unset/`false` either `ENABLE_POST_SAVE_HANDOFF` (server) or `VITE_ENABLE_POST_SAVE_HANDOFF` (client) → feature dark. Server flag off = instant; client flag needs a redeploy.
2. **Code:** `git revert f8b00c143..e3042b9a6` on `main` → redeploy. The feature is additive (new files + small mods); revert is clean.
3. **Migration:** `down` drops the index then the `clientRequestId` column. The column is nullable + unused when dark, so leaving it is harmless; only roll back if truly needed.

## 10. Future review hooks (act on these)
- Re-audit the redaction on the NEW `workoutProofLoader.mjs` logger.warn against future Sequelize error shapes (must stay name+message; never `err.sql`/`err.parameters`).
- Verify the `overscroll-behavior`/scroll-lock + portal focus-trap against future modal siblings.
- When >60-session users exist: revisit the windowed-PR honesty (consider a true all-time MAX query) + the non-newest-`today` suppression.
- If the structured `exercises→sets` path ever gets populated in prod, re-verify logs-win precedence + the create-path handoff.
- Load-test the 2500ms assembly budget under connection-pool pressure; add a circuit breaker if p95 of `POST /api/workout-forms` regresses.
- **Deferred LOW backlog (from Kimi + pre-push):** (a) add both flags to `.env.example` (ops discoverability); (b) fix migration comment overstating index lock-safety; (c) add `addIndex` idempotency guard; (d) bodyweight/cardio "session logged" fallback state; (e) 2500ms circuit breaker; (f) throttle `GET /:id/handoff`.

## 11. Codex / AI review log
- Kimi Slice-2 plan review → REVISE (IDOR on global idempotency key; folded to per-user composite). 
- Kimi wiring review → REVISE (F1 camelCase-column = VERIFIED-REJECTED; F2 IDOR = FIXED). 
- Slice-2 R1–R5 hostile loop → 7→4→4→3→0 findings (all fixed): getAllModels guard, migration atomicity, IDOR comment, cartesian `separate:true`, type-drift, 403→404 test, wrong-session proof, per-exercise first-ever copy, windowed-PR copy, money-path latency budget, volume-truth (Epley cap chart-only), window-anchor suppression, grammar.
- Chunk-C review → 3 LOW (scroll-lock, per-save remount, layering) — fixed.
- Pre-push review → GO, 3 LOW (deferred).
- **Kimi money-path go-live gate → GO (conditional)**: 2 MED fixed (loader real-logger observability; NBA subject-scoping) + 4 LOW deferred.
- Post-launch sweep → 1 MED (proof volume dedupe under-count) fixed; convergence round → DRY/DRY.

## 12. Sign-off
- Deploy VERIFIED live 2026-07-19: `clientRequestId` column + partial index present, migration recorded in SequelizeMeta, `/api/health` healthy. Server proof data confirmed (848 eligible `workout_logs`, associations match real columns).
- **Open (post-ship):** client-render confirmation (Sean's UI save / VITE flag) — auth boundary, not headless-verifiable; test-user DB cleanup (prepped + backed up, Sean paused).
- Next action pointer: enable client flag + one UI save → then work the deferred LOW backlog (§10).

---

## ADDENDUM 2026-07-20 — Fable full-power round (post-launch, both flags LIVE)

**Commits:** `42fbec2bb` (round batch) + comment-truth fix; pushed `f63b82181..7fbee8fde` → main; deploy health-verified.
**Trigger:** Sean directive — hostile-review every fix in the arc until dry + close vision gaps. Two fresh reviewers (one with executed probes) → **9 findings (1 HIGH, 3 MED, 5 LOW), all fixed**; confirmation round → **1 LOW (doc-comment only), fixed** → converged.

**Data-truth fixes (update §4/§6):**
- Loader now filters `status IN ('completed','in_progress')` — planned plan-generation rows (dated NOW, default status) no longer inflate `sessionsThisWeek`/streaks or suppress genuine PRs via `isNewestSession`. Prod was 53/53 completed → zero-loss.
- Dual-source precedence is CHARTABLE-AWARE: a bodyweight-only log scribble can no longer suppress same-key weighted Set rows (executed probe had shown a fabricated "A new best"). Logs win outright when they carry any chartable row.
- `priors` counts chartable history only; `isFirstEver` requires the lift never appeared in ANY form (weighted-after-bodyweight = progression, not a first).
- SET-source bodyweight rows dropped (placeholder-with-prefilled-reps indistinguishability); `toWeight` contract (only null/undefined = bodyweight; ''/booleans = junk); deterministic ORDER BY on separate includes; `useSessionStats.completedSets` counts reps>0 (sibling sweep).

**Hardening (update §4):** `safeAssemble` circuit breaker (real in-flight gauge, decrements when WORK settles, sheds at 4 concurrent — kills DB-stress self-amplification); `handoffLimiter` 30/5min per IP mounted BEFORE `protect` on `GET /:id/handoff` (standard 429; count-based keying leaks nothing); winston calls use OBJECT META (no `format.splat()` → trailing primitives were silently dropped — house rule); migration `addIndex` idempotency guard + honest lock comment.

**Vision (update §6 — the bodyweight/cardio non-goal is now CLOSED):** LITE handoff — proof-null saves render declaration + next-best-action + Done (no chart/share fabrication); subline is the activation nudge toward the proof chart; `handoff_shown` gains zero-PII `lite` boolean. Every save now lands a terminal moment.

**Verification:** tsc 0 · WorkoutLogger suite 80 files / **460** tests pass · node --check clean · Rule 42 clean · deploy 200/healthy.
**New review hooks:** breaker cap (4) vs future multi-instance scaling; `POST /start`/`/:id/end` legacy sessions stay 'planned' forever (dormant service — candidate for cleanup); watch `handoff_shown{lite:true}` rate as the bodyweight-experience signal.
