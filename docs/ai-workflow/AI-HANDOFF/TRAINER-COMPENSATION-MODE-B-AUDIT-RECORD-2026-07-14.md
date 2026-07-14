# Trainer Compensation Mode (b) — Employed Flat $/Session — Audit Record (2026-07-14)

## 1. Phase header
- **Scope:** dashboard audit 2026-07-13 §7.3 — the missing half of the trainer revenue model. Mode (a) rev-share existed; mode (b) employed flat per-session pay (~$50) did not.
- **Built/reviewed by:** Claude Fable 5 (Final Decider), solo hostile-review loop (Tier-B cross-review skipped — Sean's "all gloves off" directive; recorded per Rule 46 fallback).
- **Verdict:** SHIPPED (this commit range on main).

## 2. Files involved
**Backend**
- `migrations/20260714000001-trainer-compensation-modes.cjs` (NEW) — assignment columns + trainer_commissions session lane.
- `models/ClientTrainerAssignment.mjs` — +`compensationMode` ('revenue_share' default | 'per_session_flat'), +`flatSessionRate`.
- `models/TrainerCommission.mjs` — `orderId` now nullable, +`sessionId` (unique), +`earningType`.
- `services/trainerSessionEarningService.mjs` (NEW, ~150 lines) — the accrual service.
- `services/sessionDeductionService.mjs` — auto-settlement batch accrues post-commit via `savedCompletedSessions`.
- `services/sessions/session.service.mjs` — `completeSession` accrues post-commit.
- `routes/trainingSessionRoutes.mjs` — `PUT /:id/complete` accrues post-save.
- `routes/sessionRoutes.mjs` — attendance-marking completion accrues post-save.
- `routes/dailyWorkoutFormRoutes.mjs` + `services/workout/aiWorkoutDailyFormService.mjs` — workout-log lanes accrue post-commit for the linked scheduled session.
- `routes/clientTrainerAssignmentRoutes.mjs` — `parseCompensationInput` validator; POST/PUT accept `compensationMode`/`flatSessionRate`.
- `routes/commissionRoutes.mjs` — trainer ledger now returns `sessionId` + `earningType`.
- `cleanup-orders-columns.mjs` — DELETED (orphaned destructive DROP-COLUMN script; grep-checked, only generated indexes referenced it).

**Frontend**
- `components/Admin/ClientTrainerAssignments.compensation.tsx` (NEW) — per-assignment pay control (pill → inline editor).
- `ClientTrainerAssignments.{tsx,panels.tsx,types.ts,logic.ts}` — wiring + parse.
- `trainer-dashboard/TrainerEarningsPage.tsx` + `useTrainerEarnings.ts` — session-flat rows render "Session pay · 1 completed session · flat session rate".

**Tests (NEW)**
- `backend/tests/api/trainerSessionEarning.test.mjs` (9) — accrual invariants.
- `backend/tests/api/assignmentCompensationInput.test.mjs` (6) — API validation.

## 3. Architecture & runtime flow
```
Admin assignment board → pill "Rev-share"/"$50/session" → PUT /api/assignments/:id
                                     │ (compensation_mode, flat_session_rate)
Session completes (ANY of 6 lanes) ──┤
  1 session.service.completeSession  │ post-commit
  2 sessionDeductionService batch    │ post-commit (saved-only list)
  3 trainingSessionRoutes /complete  │ post-save
  4 sessionRoutes attendance present │ post-save
  5 dailyWorkoutFormRoutes log       │ post-commit (linked scheduled session)
  6 aiWorkoutDailyFormService log    │ post-commit (linked scheduled session)
                                     ▼
              accrueFlatSessionEarning({ session })
   assignment(clientId+trainerId, active).compensationMode === 'per_session_flat'?
        no → return null (zero delta for every existing assignment)
        yes → rate = flat_session_rate (>0 required)
              dedupe: findOne(sessionId) + DB unique index
              TrainerCommission.create(orderId:null, sessionId, earning_type:'session_flat',
                trainerCut:rate, businessCut:0, rates 100/0, sessions 1/1)
                                     ▼
   /api/commissions/trainer/:id  (My Earnings)  +  admin Trainer Payouts console
   — both already aggregate trainer_commissions; flat rows flow with NO new payout plumbing.
```

## 4. Security & money-integrity controls
- **Zero-delta default:** every existing assignment is `revenue_share`; accrual self-filters. WHAT: prevents surprise pay rows. BREAKS IF: a migration default other than 'revenue_share' were used.
- **Idempotency (double-pay prevention):** app-level pre-check + DB partial unique index on `trainer_commissions.session_id`; unique-violation race treated as accrued. BREAKS IF: the index is dropped or a lane writes earnings without sessionId.
- **Trainer-match rule:** assignment lookup is `(clientId, trainerId, status=active)` — a reassigned client can't pay the wrong trainer for another trainer's session.
- **Transaction poisoning avoided:** all accruals run AFTER commit/save; a failed accrual can never abort billing. Missed accruals log `[TrainerSessionEarning] accrual failed` and are backfillable (unique index makes replays safe).
- **Saved-only accrual in the batch:** `savedCompletedSessions` (not in-memory status) gates accrual — a thrown `save()` can't produce pay for an unpersisted completion.
- **Input gate:** admin-only routes; `parseCompensationInput` rejects bad modes, rate ≤ 0, rate > 10000; per_session_flat requires a rate (new or existing).
- **Rate misconfiguration fails closed:** invalid/absent rate on a flat assignment refuses to accrue and logs error (no guessed $50).

## 5. Best practices applied
Rules 15 (plan from audit §7.3), 17/61 (hostile pass found + fixed the in-memory-status accrual defect and the missing workout-log lanes), 18 (mirrors CommissionService patterns), 20 (all 6 completion write-sites swept via grep), 26/29 (schema probed live before migration), 58 (drift-checked trainer_commissions/client_trainer_assignments against prod), TDD (RED→GREEN on the service), Rule 42 audit, Karpathy surgical scope.

## 6. Known limitations / non-goals
- Unlinked workout logs (no scheduled Session row) don't accrue — no sessionId anchor exists. Follow-up if employed trainers log without booking.
- ~~No UI yet to bulk-set a trainer-wide default rate~~ — SHIPPED same day (see §10c): per-trainer defaults on "Users" (`defaultCompensationMode`/`defaultFlatSessionRate`, migration 20260714000003), inherited by NEW assignments only; "Default:" pill on each trainer zone header; `PUT /api/assignments/trainer/:trainerId/compensation-default`. A flat default without a valid rate falls back to revenue_share so drag-drop assignment can never 400. Existing assignments are never retro-changed by a default edit.
- No admin alert on accrual failure (warn-log only) — audit §7.3's "alert admin" deferred.
- `leadSource` via Stripe metadata (audit item) — not in this slice.
- Switching a flat assignment back to rev-share keeps the stored rate (harmless; documented in code).

## 7. Performance & UX
- Accrual = 2–3 indexed queries per completed session, post-response-critical-path in batch; negligible.
- Admin control: 2 taps to switch mode (pill → mode → save), 44px targets, tokens + dark-first, inline errors, no modal.
- Earnings page: flat rows labeled "Session pay", no misleading "% rate/gross" copy.

## 8. Test coverage
- `trainerSessionEarning.test.mjs` 9/9: create-row shape, revenue_share zero-delta, no-assignment, idempotency, unique-race, bad-rate refusal, never-throws, identity guards, cents rounding.
- `assignmentCompensationInput.test.mjs` 6/6: validator matrix.
- Full backend sweep 5340/5340; frontend trainer-dashboard + Admin folders 130/130; tsc 0; prod build ✓.
- NOT tested: live end-to-end accrual against prod DB (needs a real flat assignment — see §10).

## 9. Rollback
- Code: `git revert` the commit range; flat assignments stop accruing (existing rows remain payable).
- Data: `down()` migration removes columns + index (drops any session_flat rows' anchor columns — export first if rows exist).
- No feature flag: default-mode gating means rollback risk is confined to assignments explicitly switched by Sean.

## 10. Future review hooks
- After the first real employed assignment: verify exactly ONE `earning_type='session_flat'` row per completed session across a week with mixed lanes (schedule-complete + workout-log same session on the same day).
- Re-check the same-day dedup interplay: a workout-log completion and the 24h settlement sweep hitting the SAME session must dedupe via session_id (they do — verify in prod logs).
- Audit `packageId: 0` sentinel: if any consumer joins commissions→storefront items, 0 must not resolve to a real package.
- Revisit deferred: admin alert on accrual failure, per-trainer default rate, unlinked-log accrual, Stripe leadSource.
- If TrainerCommission gains new NOT NULL columns, the accrual create() must be updated (it enumerates all columns explicitly).

## 10b. Post-ship recursive hostile review (2026-07-14, Sean-directed "review until zero")
- **R1 (runtime probe):** CRITICAL — `associations.mjs` full-setup return literal omitted `TrainerCommission`; `getModel('TrainerCommission')` threw at runtime, silently disabling ALL commission creation (prod probe: **0 trainer_commissions rows ever written**). Fixed + synced the early-return literal (12 models missing there incl. Subscription/Lead/WearableData) + `associationsModelRegistryParity.test.mjs` lock.
- **R2 (self, fresh lens):** zero findings.
- **R3 (independent agent):** 10 findings. CONFIRMED & FIXED:
  - F1 CRITICAL `packageId: 0` violates the NOT NULL FK to storefront_items (prod-probed) → migration `20260714000002` drops NOT NULL; service + CommissionService pass `null`; model relaxed.
  - F6 MED-as-CRITICAL FKs referenced stale lowercase `users` — prod probe: Users ids 35/84/89/108 missing from `users`, their commissions could never insert → migration 002 repoints client_id/trainer_id FKs to `"Users"` (guarded DO-blocks so safe-migrate can't half-stamp; addresses F2's class for the new migration).
  - F3 MED `down()` un-runnable once null order_id rows exist → conditional SET NOT NULL in 001 down + 002 down.
  - F7 LOW trainer `!==` string/int compare 403'd every trainer on legacy /complete → Number() both sides.
  - F10 LOW re-completing a completed session could retro-accrue at today's rate → 409 already-completed guard.
  - F8 LOW validator accepted `true`/arrays via Number coercion → type-checked; tests added.
  - F9 LOW earnings subtitle said "package sale" only → copy now covers per-session pay.
- **R3 items DEFERRED as Sean-gated design calls (not defects):**
  - F4: sweep accrues flat pay for sessions completed with NO client credits (trainer worked → gets paid was the design intent; the session row's `sessionDeducted=false` is the audit marker). Sean may prefer to withhold pay on unbilled sessions — flag to decide.
  - F5: no reversal/void path for an earning once accrued (append-only ledger; admin can only mark paid). Needs a gated "void earning" slice if mistaken completions occur in practice.
- **R4:** re-ran probes + full gates after fixes; zero remaining findings above the two Sean-gated design calls.

## 10c. Per-trainer default compensation (same-day follow-on slice)
- Migration `20260714000003`: `"Users"."defaultCompensationMode"` (NOT NULL, 'revenue_share') + `"defaultFlatSessionRate"` (nullable), each step existence-guarded.
- `resolveInheritedCompensation()` (exported, 5 unit tests): explicit admin input wins → else inherit flat default when its rate is valid → else revenue_share (a misconfigured default can never 400 a drag-drop assignment).
- `PUT /api/assignments/trainer/:trainerId/compensation-default` (adminOnly) — validates against the trainer's EXISTING defaults (re-enabling flat mode doesn't require re-typing the rate).
- `/api/admin/finance/trainers` returns both defaults; assignment board shows a "Default:" pill per trainer zone (generalized CompensationControl; quiet trainer-only refresh after save, no board spinner).
- Semantics: defaults affect NEW assignments only; existing assignments keep their stored mode/rate.

## 11. Review log
- R1 (self, hostile): found (a) in-memory-status accrual defect in the settlement batch → `savedCompletedSessions`; (b) only 2 of 6 completion lanes hooked → all 6 wired; (c) TrainerCommission.orderId NOT NULL latent bug for webhook flow → relaxed in the same migration.
- R2 (self, verify): full gates re-run green after fixes.
- Codex/Gemini cross-review: NOT run (Sean directive "all gloves off, do what you need"; Rule 46 gap recorded here for post-hoc review).

## 12. Sign-off
- Shipped by Fable on Sean's standing "gloves off" go (2026-07-14). Commit SHA in the batch push; deploy auto-runs migration via `scripts/render-start.mjs` → `safe-migrate.mjs`.
- Next action: Sean sets the first employed trainer's assignment to "Flat $/session · 50" on the admin Assignments board, completes one session, and checks My Earnings.
