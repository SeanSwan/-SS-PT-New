/**
 * gamificationAwardAbuseContract — economy-exploit locks (gamification sweep 2026-07-15)
 * =====================================================================================
 * (1) POST /api/master-prompt/gamification/process-action awarded points to the
 *     CALLER from a client-supplied action + client-controlled idempotency key,
 *     behind only `protect` while every sibling route required system_monitoring
 *     — an unlimited self-award farm (500-pt streak actions in a loop) that could
 *     drain redeemable-reward stock. It must now carry the same permission gate.
 * (2) Achievement point awards had NO idempotency key, so the lockless
 *     check-then-act unlock could double-award under concurrency. The award now
 *     carries a deterministic key so the ledger dedups it.
 * (3) record-workout's exercisesCompleted was unbounded and multiplied into an
 *     uncapped award — now clamped.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.resolve(here, rel), 'utf8');

describe('process-action is gated (no unlimited self-award)', () => {
  it('requires the system_monitoring permission, like its sibling award-points', () => {
    const src = read('../../routes/masterPrompt/gamification.mjs');
    // The process-action route declaration must be immediately followed by the
    // permission middleware (not just `protect` from the router mount).
    expect(src).toMatch(/router\.post\(\s*'\/process-action',\s*\n\s*requirePermissionWithAccessibility\('system_monitoring'\)/);
  });
});

describe('achievement award is idempotent', () => {
  it('unlockAchievement passes a deterministic idempotencyKey to the ledger', () => {
    const src = read('../../services/gamification/GamificationPersistence.mjs');
    expect(src).toMatch(/idempotencyKey: `achievement:\$\{userId\}:\$\{achievementId\}`/);
  });
});

describe('record-workout exercisesCompleted is clamped', () => {
  it('caps exercisesCompleted so it cannot mint an unbounded award', () => {
    const src = read('../../controllers/gamificationController.mjs');
    expect(src).toMatch(/Math\.min\(parseNonNegativeInteger\(exercisesCompleted, 0\), 100\)/);
  });
});
