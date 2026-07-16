/**
 * gamificationLifetimeLevelInvariant.test.mjs
 * ===========================================
 * HR-008-F1 regression lock (hostile-review slam): level/rank must be derived from
 * LIFETIME earned XP, never the spendable point balance, so redeeming/spending points
 * never lowers a user's level or rank. Before the fix, the ledger derived level from
 * the post-spend balance, so a user at Level 25 who redeemed a 5,000-pt reward visibly
 * dropped to Level 18.
 *
 * Verified two ways: (1) the arithmetic invariant on the shared level curve, and
 * (2) a source-lock that both award/ledger paths feed LIFETIME XP (not the spendable
 * balance) into the level calculation, so the regression can't silently return.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calculateLevel } from '../../utils/levelingAlgorithm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dirname, p), 'utf8');
const pointsService = read('../../services/gamification/GamificationPointsService.mjs');
const awardXP = read('../../services/awardWorkoutXP.mjs');
const gamController = read('../../controllers/gamificationController.mjs');
const progressController = read('../../controllers/progressController.mjs');

describe('HR-008-F1: spending points never lowers level/rank', () => {
  it('arithmetic invariant: a spend that drops the balance-derived level leaves the lifetime-derived level unchanged', () => {
    const lifetime = 12924; // pointsForLevel(25) -> Level 25
    expect(calculateLevel(lifetime)).toBe(25);

    const spend = 5000;
    const balanceAfterSpend = lifetime - spend; // 7924
    // OLD (buggy) behavior derived level from the spendable balance -> a visible drop:
    expect(calculateLevel(balanceAfterSpend)).toBeLessThan(25);
    // FIX: a spend contributes 0 to lifetime (isSpendLike -> lifetimeDelta 0), so level holds:
    const lifetimeAfterSpend = lifetime + 0;
    expect(calculateLevel(lifetimeAfterSpend)).toBe(25);
  });

  it('source-lock: GamificationPointsService derives level from lifetime, not the spendable balance', () => {
    expect(pointsService).toMatch(/lifetimeDelta\s*=\s*isSpendLike\s*\?\s*0\s*:\s*pointsToRecord/);
    expect(pointsService).toMatch(/calculateLevel\(newLifetime\)/);
    // the buggy balance-derived level must be gone
    expect(pointsService).not.toMatch(/calculateLevel\(Math\.max\(newBalance/);
    // lifetime is only ever incremented (never decremented) on the persist path
    expect(pointsService).toMatch(/if \(lifetimeDelta > 0\) userUpdates\.lifetimePointsEarned = newLifetime/);
  });

  it('source-lock: awardWorkoutXP takes level/tier from the ledger authority, never re-derives from balance', () => {
    expect(awardXP).toMatch(/latestLedger\.newLevel/);
    expect(awardXP).not.toMatch(/calculateLevel\(updatedStats\.points\)/);
    expect(awardXP).not.toMatch(/calculateLevel\(finalBalance\)/);
    // the module no longer needs the raw curve import (level comes from the ledger)
    expect(awardXP).not.toMatch(/import \{ calculateLevel, getTier \}/);
  });

  it('source-lock: gamificationController workout-award path also takes level from the ledger authority', () => {
    expect(gamController).toMatch(/latestLedger\.newLevel/);
    expect(gamController).not.toMatch(/calculateLevel\(updatedStats\.points\)/);
    // the now-unused curve import was removed (no dead import)
    expect(gamController).not.toMatch(/import \{ calculateLevel, getTier \}/);
  });

  it('source-lock: canonical profile, rank-title, and leaderboard reads use lifetime XP', () => {
    expect(gamController).toMatch(/'points', 'lifetimePointsEarned', 'level'/);
    expect(gamController).toMatch(/const progressionPoints = parseNonNegativeInteger\(user\.lifetimePointsEarned, 0\)/);
    expect(gamController).toMatch(/buildRankTitleSelectionPayload\(\{\s*points: progressionPoints/);
    expect(gamController).toMatch(/validateSelectedRankTitleKey\(requestedKey, \{\s*points: progressionPoints/);
    expect(progressController).toContain("['lifetimePointsEarned', 'points']");
    expect(progressController).toContain("orderBy = [['lifetimePointsEarned', 'DESC']]");
    expect(progressController).not.toContain("orderBy = [['points', 'DESC']]");
  });
});
