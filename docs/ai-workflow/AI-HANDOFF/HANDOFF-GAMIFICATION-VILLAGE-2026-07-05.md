# Session Handoff — Gamification Progression Fix + AI Village/Fable Upgrade (2026-07-05)

> For the next AI (Claude/Codex/Fable) picking this up. GitHub `main` has the verified,
> deploying work; branch `wip/handoff-2026-07-05` preserves ALL uncommitted work (nothing lost).
>
> **ENV NOTE:** the local `.git` was OS write-locked this session — every local `git add`/`commit`/
> `config` failed with `Invalid argument` on lock-file creation (an antivirus / cloud-sync / IDE
> holding `.git`). All commits were made via the **GitHub REST API** (token from the local
> credential store, never logged). Before normal git works again, Sean must clear that lock (close
> VS Code / its Source-Control panel; pause OneDrive/Dropbox on `@Projects`; or add an AV exclusion),
> then `git fetch`.

## THE FULL GOAL
Fix SwanStudios gamification progression. Two root problems:
1. **Absurd curve:** `level=floor(0.1*sqrt(points))` → Level 25 needed 62,500 points (L100=1M).
2. **Level driven by the SPENDABLE balance:** `recordLedgerEntry` + `awardWorkoutXP` +
   `gamificationController.recordWorkoutCompletion` computed `level=calculateLevel(user.points)` where
   `points` is the wallet balance → spending / redeeming / admin deductions LOWERED level AND rank
   title. Rank-title eligibility + leaderboard sort keyed off the balance too.

Intended model: **lifetime-earned XP drives level+rank; spendable points are wallet-only; spending
never lowers level.** Public rank titles unlock every 10 levels (cadence already exists).

## DONE + DEPLOYING (GitHub main: e09b11ea → 5e190ea → 6a747554)
### Sub-slice 1 — the curve (VERIFIED, production)
- New curve: `pointsForLevel(L)=floor(80*(L-1)^1.6)`; `calculateLevel` is its exact inverse (round-trip
  proven for all 1000 levels). Targets: L10≈2,690 · L25≈12,930 · L50≈40,520 · L100≈124,880.
- Files: `backend/utils/levelingAlgorithm.mjs`, `frontend/src/types/gamification.ts` (mirror), both admin
  formula panels. Added a backend↔frontend curve-constant **parity test guard** (prevents re-drift).
- Tests green: leveling 12/12, frontend 16/16, awardWorkoutXP+services 41/41.
- NOTE: level is still **balance-derived** in sub-slice 1 (curve only). Decoupling = sub-slice 2.
### AI Village / Fable orchestrator (dev tooling)
- `scripts/validation-orchestrator.mjs`, `scripts/lib/cost-gate.mjs`(+test), `scripts/lib/fusion-synthesis.mjs`,
  `config/MODEL_VERSIONS.md`.
- **Fable 5** (`anthropic/claude-fable-5`, $10/$50 per M) = standing `FUSION_JUDGE`; runs **LAST** after
  debates, judging Phase-1 + debate verdicts. Debates ON by default (other AIs, never Fable;
  `SWAN_VILLAGE_DEBATES=off`). Fable permission gate (`SWAN_VILLAGE_FABLE_CONFIRM=yes` or interactive y/N;
  fail-closed). Judge token cap 12000 (`SWAN_FUSION_JUDGE_MAX_TOKENS`) + completeness warning. **$8 default
  hard cap** (`SWAN_VILLAGE_MAX_USD`). Nothing-to-judge → no spend.
- Run: `SWAN_VILLAGE_FABLE_CONFIRM=yes node scripts/validation-orchestrator.mjs --mode plan --document <packet>`
  (needs `OPENROUTER_API_KEY` + `GEMINI_API_KEY` in `.env`/`backend/.env`).

## AI VILLAGE VERDICT (drives sub-slice 2)
Full 15-brain Village on the sub-slice-2 plan: 17/19 brains + 3 debates + **Fable judge**, $1.15. Consensus:
1. Do NOT use on-the-fly ledger `SUM` (one-award-behind, O(N), unsortable, race-prone).
2. Add denormalized `User.lifetimePointsEarned` column (additive, NOT NULL, default 0) + atomic `+= delta`.
3. One-time **backfill of existing users' levels is MANDATORY** (else "violent snap" on next login).
4. Criticals: opt-in leaderboard (GDPR), point expiration (liability), level-up celebration, WCAG 2.2.

## IN PROGRESS — SUB-SLICE 2 (column-backed decoupling) — on the wip branch, ~half-built, NOT tested/deployed
**Done (working tree / wip branch):**
- `backend/migrations/20260705010000-add-lifetime-points-earned-to-users.cjs` — adds `lifetimePointsEarned`
  (INT NOT NULL 0) + `leaderboardOptIn` (BOOL true) to `"Users"`, backfills lifetime from ledger
  (`SUM(points) WHERE transactionType NOT IN ('spend','expire')`).
- `backend/models/User.mjs` — added both fields; fixed misleading `points` comment.
- `backend/services/gamification/GamificationPointsService.mjs` — `recordLedgerEntry` derives level/tier from
  LIFETIME (`currentLifetime + delta`, race-safe under existing row lock), increments `lifetimePointsEarned`,
  returns `newLifetime`. Single authority, no SUM.
- `backend/services/awardWorkoutXP.mjs` + `backend/controllers/gamificationController.mjs` — stripped
  `calculateLevel(balance)` clobbering; consume service `newLevel/newTier`. Controller has `workoutLeveledUp`.

**REMAINING to finish sub-slice 2:**
1. Profile endpoint (~`gamificationController:1080`) → return `lifetimePointsEarned`; feed it (not `user.points`)
   to `buildRankTitleSelectionPayload` + `validateSelectedRankTitleKey` (`gamificationRankTitles.getEffectiveGamificationLevel`
   derives level from `points`).
2. Wire `workoutLeveledUp`/`levelUp` flag into the workout-completion response (celebration overlay).
3. Leaderboard (`getLeaderboard` ~1115) → `ORDER BY lifetimePointsEarned` + `WHERE leaderboardOptIn=true`.
4. Frontend: `useGamificationData.ts:167` + `gamificationMappers.buildLegacyProfile` →
   `getLevelProgress(lifetimePointsEarned ?? points)`.
5. **Level backfill script** for existing users' `level`/`tier` (migration backfills the column; a JS script
   using the real `calculateLevel` sets level/tier from lifetime — SQL can't do the power-curve inverse cleanly).
6. Tests: "spending does not lower level", backfill correctness, concurrent-award safety. Update
   `awardWorkoutXP.test.mjs` mocks to return `newLevel/newTier` (currently return only `{pointsAwarded,newBalance}`
   → the test FAILS until updated).
7. Deferred (Village F-06..F-15): point expiration, WCAG bar, wearable XP, quests, AI-context XP, FHIR export.
   `leaderboardOptIn` default is `true` (opt-out); privacy opt-in (default false + consent UI) is a product call.

**Then:** triangle-fusion review → deploy (migration + backfill run on Render).

## OTHER UNCOMMITTED WORK (Codex's lanes — preserved on wip branch, NOT deployed)
A **Marketing + Specials** workstream (untested-by-me, another agent's lane, includes payment-path changes):
- Backend: `marketingReadinessService.mjs`(+test), `MarketingCalendarItem.mjs`, `MarketingCampaign.mjs`(new),
  `adminMarketingCampaignRoutes.mjs`(new), `specialOfferService.mjs`(new), `associations.mjs`, `core/routes.mjs`,
  `leadRoutes.mjs`, marketing migrations (20260704120000, 20260705000000, 20260704000000), `backend/__tests__/*`.
- Frontend: `workspaces/marketing/*` (MarketingReadinessCockpit, LeadPipelinePanel, CampaignForm/Manager,
  MarketingCommandOverview), `admin-specials/*` (AdminCreateSpecialManager, SpecialDealPreviewCard, specialPricing),
  `pages/shop/StoreV3.tsx` + `YourSpecialCard.tsx`, `UniversalDashboardLayout.routes*`.
- Storefront/payment: `CustomPackage.mjs`, `StorefrontItem.mjs`, `cartRoutes.mjs`, `customPackageRoutes.mjs`,
  `storeFrontRoutes.mjs`, `v2PaymentRoutes.mjs`, `SessionGrantService.mjs`.
- Docs: `SPECIAL-PRICING-*`, `OPUS-CODEX-DEBATE-MARKETING-OS-BATCH-*`, brainstorms.

## WHERE TO CONTINUE (priority)
1. **Clear the local `.git` lock** (env note at top), then `git fetch`.
2. **Finish sub-slice 2** (remaining list) → test → triangle review → deploy. Completes the gamification fix.
3. Codex: reconcile/finish Marketing+Specials from the wip branch.
4. Follow-up sprint: Village F-06..F-15.

## KEY REFERENCES
- Village packet: `docs/ai-workflow/AI-HANDOFF/GAMIFICATION-PROGRESSION-VILLAGE-PACKET-2026-07-04.md`
- Village output: `AI-Village-Documentation/validation-prompts/latest/` (synthesis.md = Fable verdict;
  architecture-plan.md; strategic-research-gap-analysis.md).
- Coordination lane: `.ai-workflow/coordination/claude.lane.md`
- Governing CLAUDE.md rules: 26/27 (canonical surface), 46 (3-brain), 58 (schema drift), 59 (read-time secret
  prevention), 67 (pair-coding coordination).
