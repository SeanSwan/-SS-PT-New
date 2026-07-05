# AI Village Review Packet — Gamification Progression Fix (2026-07-04)

> **Review ask:** Pressure-test this two-part gamification fix. Sub-slice 1 (the XP curve) is
> BUILT + tested. Sub-slice 2 (decoupling level from the spendable balance) is DESIGNED, not
> built. Tell us: is the approach correct, what are the correctness/economy/perf risks, and
> what is MISSING (gap analysis). Privacy: no PII in this packet — leveling math + ledger logic only.

## Context

SwanStudios is a production personal-training SaaS. Gamification uses **spendable points** (a
wallet: earn from workouts, spend on rewards) and a **level/rank** ladder (1–1000, public rank
titles every 10 levels). An audit flagged that Level 10–25 were absurdly far away.

### Verified diagnosis (file:line evidence)

There are **four competing progression systems**; the LIVE one is wrong two ways:

1. **Absurd curve.** `backend/utils/levelingAlgorithm.mjs` used `level = floor(0.1·√points)` and
   `pointsForLevel = (level/0.1)² = 100·level²` → **Level 25 = 62,500 points**, L50 = 250k, L100 = 1M.
   Frontend `frontend/src/types/gamification.ts` mirrored it (drift risk).
2. **Level is driven by the SPENDABLE balance.** `GamificationPointsService.recordLedgerEntry`
   (line ~246), `awardWorkoutXP.mjs` (182/212), and `gamificationController.recordWorkoutCompletion`
   (2899) all compute `level = calculateLevel(user.points)` where `user.points` is the *spendable
   wallet balance*. So **spending points, redeeming rewards, or an admin deduction lowers a user's
   level AND rank title.** Rank-title eligibility (`gamificationRankTitles.mjs:24`) and the
   leaderboard sort (`gamificationController:1121`) key off the balance too.
3. **Two orphaned stores:** `Gamification` model has real `totalXP`/`experience` columns (unused by
   the live display); `GamificationEngine.mjs` has a third hardcoded threshold curve (dormant).

Canonical live path (proven): `User.points` (balance) → sqrt curve → `User.level`/`tier`, displayed
by `useGamificationData.ts:167` via `getLevelProgress(points)`.

---

## Sub-slice 1 — THE CURVE (BUILT + TESTED, uncommitted)

Replaced the sqrt curve with a power curve; `pointsForLevel` is the source of truth,
`calculateLevel` its exact inverse (correction-looped so `calculateLevel(pointsForLevel(L))===L`
for all L in 1..1000).

```
pointsForLevel(L) = floor(80 · (L-1)^1.6)     // L>=2; pointsForLevel(1)=0
```

New targets: **L10≈2,690 · L25≈12,930 · L50≈40,520 · L100≈124,880 · L1000≈5.03M** (vs L25=62,500 before).

- Files: `levelingAlgorithm.mjs`, `gamification.ts` (mirror), both admin formula displays.
- Tests: `levelingAlgorithm.test.mjs` **12/12** (round-trip over all 1000 levels + a NEW
  backend↔frontend constant-parity guard so the two curves can't silently drift again — that drift
  was the original root cause). `awardWorkoutXP` + point-service suites **41/41**. Frontend
  gamification + admin settings **16/16**.
- Not executed: DB-integration api tests (they hit the prod DB); statically confirmed they don't
  assert curve values.

**Q for Village:** Is `80·(L-1)^1.6` a good shape (fast early, meaningful late, no multi-year wall)?
Should MAX_LEVEL stay 1000, or is L100 the real cap with 100–1000 as a prestige ladder? Is ~2,690
for L10 too fast / too slow given a workout earns ~50 pts?

---

## Sub-slice 2 — DECOUPLING (DESIGNED, not built)

**Goal:** level & rank must be driven by **lifetime earned XP**, never the spendable balance.
Spending must never lower level/rank/eligibility.

**Mechanism (no DB migration):** lifetime-earned is derivable from the existing ledger —
```
lifetimeEarned = SUM(PointTransaction.points) WHERE transactionType NOT IN ('spend','expire')
```
(`PointTransaction.points` is a positive magnitude; direction is the `transactionType`.)

**Edits:**
- `GamificationPointsService`: new `getLifetimeEarned(userId, tx)`; `recordLedgerEntry` computes
  `level = calculateLevel(lifetimeEarned)` (one authority).
- `awardWorkoutXP.mjs` + `gamificationController.recordWorkoutCompletion`: STOP re-deriving level
  from balance; consume the service's returned `newLevel/newTier`.
- Profile endpoint returns `lifetimePointsEarned`; feed it (not `user.points`) to the rank-title
  eligibility helpers. `useGamificationData.ts` renders progress from lifetime-earned.
- New regression test: "spending points does not lower level."

**Deferred (documented limitation):** the **leaderboard sort** still orders by spendable balance.
Fixing it to rank by lifetime XP needs a denormalized `User.lifetimePointsEarned` column to
`ORDER BY` efficiently in SQL — proposed as a separate follow-up slice.

**Q for Village (the real decisions to pressure-test):**
1. **Ledger-derived vs column.** We chose a per-award/per-read `SUM` over the ledger to avoid a
   migration. Is that the right call, or is a denormalized `User.lifetimePointsEarned` column
   (additive, reversible migration + backfill) better given it also fixes the leaderboard sort and
   avoids repeated SUMs? Where's the break-even?
2. **Correctness risk** in making 3 write paths consume one authority: any race/ordering hazard
   inside the DB transaction (the SUM runs before the new row is inserted; is that always correct
   under the row-lock + idempotency guards already present)?
3. **Economy/liability:** does decoupling change reward-liability math or open any abuse (e.g.
   earn→spend→earn farming to inflate lifetime)? Should `adjustment`-type entries count toward
   lifetime?
4. **Migration-or-not** final call, and is deferring the leaderboard acceptable for a first ship?
5. **Gap analysis (MANDATORY):** what are we NOT addressing that we should — level-up celebration,
   XP vs point separation on the API surface, backfill of existing users' levels after the curve
   change, privacy on leaderboards, admin progression simulator, analytics?

---

## Constraints the Village must respect (CLAUDE.md)
- Rule 8: zero PII to LLMs. Rule 20/54: sibling-sweep — all 3 write paths + all consumers.
- Idempotency keys already guard double-award (`PointTransaction` unique index). Dual `users`/`"Users"`
  table in prod — FK must reference `"Users"`. Rule 58: watch schema drift.
- Victory-only charts, styled-components only, no MUI, dark-first. (Not central here, but binding.)

## Backfill question (important)
After the curve change, existing users' stored `User.level` was computed under the OLD curve/OLD
balance-basis. Sub-slice 2's first award will recompute from lifetime-earned, but dormant accounts
won't. **Do we need a one-time backfill** (`UPDATE users SET level = calculateLevel(lifetimeEarned)`),
and does that count as the migration we were trying to avoid?
