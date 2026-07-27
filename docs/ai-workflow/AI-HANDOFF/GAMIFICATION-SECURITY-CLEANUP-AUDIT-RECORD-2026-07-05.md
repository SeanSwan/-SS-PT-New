# Gamification & Companion Security Cleanup — Phase Audit Record (2026-07-05)

> Rule-48 permanent audit artifact. A future reviewer (Codex / Gemini / Village / Sean) should be able to
> re-audit the security posture of this workstream from this file alone. Companion PR = #15; dormant-file
> deletion PR = #19. Neither is merged to production at time of writing.

## 1. Phase header
- **Phase:** Companion V2 PR hardening + gamification legacy-surface security cleanup.
- **Scope:** (a) PR #15 — excise the non-functional companion response-injection layer + refresh the branch; (b) PR #19 — delete the dormant legacy `gamificationRoutes.mjs`; (c) read-only IDOR/ownership sweep of the LIVE gamification surface.
- **Dates:** 2026-07-04 → 2026-07-05.
- **Reviewed by:** Claude (Opus 4.8) builder + hostile self-review + a 6-dimension read-only review workflow; **Codex R7 requested (OPEN)** for both PRs; Sean approvals (option B on #15, option A on #19). Fable/AI-Village review **PARKED** per Sean.
- **Final verdict:** Both PRs OPEN, awaiting Codex R7 + Sean merge. **No production deploy yet** (branch-only).

## 2. Files involved
**PR #15** — branch `feature/companion-v2-goal-loop-2026-07-01` @ `4c30c4f50` (+6 / −185, 8 files):
- Deleted: `backend/middleware/companionEventBridgeResponseMiddleware.mjs` (28L), `backend/tests/unit/companionEventBridgeResponseMiddleware.test.mjs`, `backend/tests/unit/gamificationRoutesCompanionBridge.test.mjs`.
- Reverted to `origin/main`: `backend/routes/gamificationRoutes.mjs`.
- Modified: `backend/services/gamification/CompanionEventBridgeService.mjs` (removed AsyncLocalStorage response-plumbing), `backend/services/gamification/GamificationPointsService.mjs` (dropped unused `result.companionEvents` assignments; kept `scheduleCompanionLedgerEvents` + `metadata`), `backend/tests/unit/companionEventBridgeService.test.mjs`, `backend/tests/unit/gamificationPointsServiceCompanionBridge.test.mjs`.

**PR #19** — branch `claude/remove-dormant-gamification-routes-20260705` @ `defb6e8e3` (+9 / −539, 3 files):
- Deleted: `backend/routes/gamificationRoutes.mjs` (539L).
- Modified: `backend/core/routes.mjs` (removed stale commented `// app.use('/api/gamification', gamificationRoutes)`), `backend/tests/api/gamificationLegacyLeaderboardControllerSecurity.test.mjs` (rewrote to guard the removal).

## 3. Architecture & runtime flow
- **Live gamification API:** `backend/core/routes.mjs` mounts **both** `/api/gamification` (legacy path) and `/api/v1/gamification` to **`gamificationV1Routes.mjs`**. `gamificationRoutes.mjs` was **never mounted** (only a commented `app.use`). This was the crux: the "old" file looked live but wasn't.
- **Companion pet-state bridge (the working feature, retained):** `GamificationPointsService.recordLedgerEntry` → `scheduleCompanionLedgerEvents({result, entry, transaction})` → on `transaction.afterCommit` → `CompanionEventBridgeService.recordCompanionLedgerEvents` → `CompanionPetService.recordActivity(userId, activityType, amount)`. Fires on the live v1 `/record-workout`; `userId` is ownership-validated upstream by `authorizeResourceAccess`.
- **Removed dead path:** the `companionEventBridgeResponseMiddleware` (AsyncLocalStorage context + `res.json` wrap that injected a `companionEvents` summary) was wired **only** to the dormant `gamificationRoutes.mjs`, so it never executed on the live endpoint; the controller never forwarded `companionEvents`; no frontend consumed it (grep-verified). It was excised in PR #15.

## 4. Security logic & posture
- **Live `/record-workout` (v1) chain:** `authenticate → requireUser → (default req.body.userId = req.user.id when omitted) → authorizeResourceAccess('userId') → pointActionLimiter → gamificationController.recordWorkoutCompletion`.
- **`authorizeResourceAccess('userId')` (`authMiddleware.mjs:741`):** allows own data (`Number(req.user.id) === targetId`), admin (any), trainer (**only** with an active `ClientTrainerAssignment` for the target), else **403**. Reads `req.params.userId || req.body.userId`.
  - WHAT it blocks: cross-tenant reads/writes (IDOR).
  - WHY: multi-tenant isolation (Rule 8 / OWASP A01).
  - HOW it breaks: a new `/users/:userId/*` or userId-in-body route that **omits** it — exactly the defect the dormant file embodied.
- **The IDOR finding (context):** a hostile-review subagent flagged a HIGH cross-tenant IDOR at `gamificationRoutes.mjs:317`. Every hop was real **in that file**, but the file is **unmounted** → **refuted for the live/canonical surface** (Rule 28 narrowing). PR #19 deletes the file so it can never be re-armed.
- **Live-surface sweep (read-only, ~55 routes in `gamificationV1Routes.mjs`):** every `/users/:userId/*` resource route carries `authorizeResourceAccess`; `/goals/:id` routes enforce ownership inside `goalController` (`assertGoalAccess` + inline `goal.userId !== req.user.id` + userId-injection whitelist); all companion pet endpoints (`/users/:userId/pet*`) are `authorizeResourceAccess`-guarded; `markNotificationAsRead` is a **no-op stub** (zero DB access). Public routes (`/settings` GET, `/featured`, `/search`) intentional. **Result: no live IDOR.**
- **Zero-PII:** the removed `companionEvents` payload is gone; no PII leaves any surface. Pre-commit secret scans **CLEAN** on both commits (5/0 and 2/0).

## 5. Best practices applied
Rule 3 (surgical), Rule 4 (line caps preserved), Rule 8 (zero-PII), Rule 18 (existing-pattern-first: reused `authorizeResourceAccess`), Rule 20/54 (sibling sweep of live v1 routes with grep evidence), Rule 26/27/30 (canonical-surface discipline — caught the dormant-file false-positive), Rule 34 (no-blind-cleanup: grep gates before any deletion), Rule 42 (backend untracked/modified audit), Rule 44/59 (secret scanning on writes/reads), Rule 52 (respected Codex's prior deliberate retention decision — surfaced before deleting), Rule 56 (baseline/target-suite disclosure), Rule 67 (isolated worktrees + mutual R7 review requests + explicit-path commits). OWASP A01 fail-closed access control.

## 6. Known limitations / non-goals
- `gamificationController.getLeaderboard` is now **orphaned dead code** (its only caller was the deleted route). Deliberately **NOT removed** — removing it ripples into two Codex security tests that use `getLeaderboard` as a `functionSource` boundary marker (`gamificationLegacyLeaderboardControllerSecurity.test.mjs:28` and `gamificationCoreControllerSecurity.test.mjs:28`). Deferred to Codex's R7 decision.
- Neither PR is merged to production.
- **vitest not executed for PR #19** (fresh worktree without `node_modules`); its assertions are pure `existsSync` + source-string checks, grep-verified equivalently; CI executes the suite. PR #15's suites ran 22/22.

## 7. Performance & UX considerations
- No perf/UX change. Companion pet-state gameplay is unchanged (still updates on workout completion via `afterCommit`). Removing the unconsumed `companionEvents` response summary has zero user-facing effect.
- Latency note (future): `authorizeResourceAccess` does a per-request `ClientTrainerAssignment.findOne` for the trainer branch — fine at current scale; revisit if trainer traffic grows.

## 8. Test coverage summary
- **PR #15:** 22/22 across `companionEventBridgeService.test.mjs`, `gamificationPointsServiceCompanionBridge.test.mjs`, `gamificationWorkoutCompletionControllerSecurity.test.mjs`, `gamificationCoreControllerSecurity.test.mjs`. `node --check` clean on both edited runtime files. Zero dangling references to removed symbols (grep).
- **PR #19:** rewritten `gamificationLegacyLeaderboardControllerSecurity.test.mjs` — Test 1 (removal + v1-canonical) grep-verified; Test 2 (controller `getLeaderboard` hardening) reads an **unchanged** controller → passes on identical input. `node --check` clean.
- **Not covered:** live runtime E2E (branch-only); the deferred `getLeaderboard` removal + its test ripple.

## 9. Rollback plan
- **PR #15:** `git revert 4c30c4f50` restores the middleware + ALS layer + tests. Branch is unmerged, so the simplest rollback is: do not merge.
- **PR #19:** `git revert defb6e8e3` restores `gamificationRoutes.mjs`, the old lock test, and the commented mount in `core/routes.mjs`. Branch is unmerged, so the simplest rollback is: do not merge.
- No migrations, env vars, or feature flags are involved in either PR. No Render restart needed.

## 10. Future review hooks
- **Re-verify** that every `/users/:userId/*` mutation route (and every userId-in-body route) in `gamificationV1Routes.mjs` still carries `authorizeResourceAccess` when new gamification routes are added — this is the exact defect class that created the dormant landmine.
- When `gamificationController.getLeaderboard` is finally removed, **handle the `functionSource` boundary-marker ripple** in `gamificationCoreControllerSecurity.test.mjs` (it uses `getLeaderboard` as the *end* marker to slice `getUserProfile`).
- **Confirm** no future work re-introduces an unmounted/legacy gamification route file without ownership guards.
- **Audit** `markNotificationAsRead` if it's ever implemented for real — currently a no-op stub; add ownership scoping at that time.
- **Re-scan** the live surface after any large gamification feature merge (the sweep in §4 was point-in-time 2026-07-05).

## 11. Codex / AI review log
- 6-dimension read-only hostile-review workflow (companion-failsafe, security/privacy, schema-drift, frontend-rules, test-coverage, merge-integration) → 2 confirmed (1 IDOR HIGH [later refuted for the live surface], 1 res.json-guard test-coverage LOW), 2 plausible LOW; 0 refuted-at-review.
- Claude canonical-surface verification (Rule 30) refuted the IDOR for the live surface by proving `gamificationRoutes.mjs` is unmounted and the live v1 route is guarded.
- Codex R7 hostile-review requests posted to `.ai-workflow/coordination/review-queue.md` for both PRs (OPEN). PR #19's request explicitly flags that it undoes Codex's deliberate keep-but-classify decision and offers a fall-back to hardening-in-place.

## 12. Sign-off
- **Sean approvals:** option B (PR #15 excision), option A (PR #19 deletion). Not yet merged.
- **Commits:** PR #15 @ `4c30c4f50`; PR #19 @ `defb6e8e3`; this audit record on the PR #19 branch.
- **Next action:** Codex R7 on both PRs → Sean merges (#15 then #19) → optional `getLeaderboard` dead-code cleanup (handle the test ripple).
