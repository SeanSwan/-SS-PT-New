/**
 * challengeEvidenceGateContract — anti-self-report locks (challenge sweep 2026-07-15)
 * ==================================================================================
 * Fitness/streak/workout challenges must earn progress from VERIFIED workout
 * events, not client-typed numbers (a joiner could otherwise post the goal and
 * collect the full reward without training). Creative/community/habit categories
 * stay self-reportable. (Sean policy 2026-07-15.) Both live manual-progress
 * routes carry the gate:
 *  - social  POST /api/social/challenges/:id/progress  (category 'workout')
 *  - V1      PUT  /api/gamification/challenges/:id/progress  (category 'fitness'|'streak')
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.resolve(here, rel), 'utf8');

// SWA-96 retirement (2026-08-13): the social manual-progress endpoint was REMOVED
// with the PascalCase family, so its evidence gate is vacuously satisfied — there
// is nothing to self-report against. Absence is asserted by
// socialChallengeRetirementContract.test.mjs. The V1 gate below remains live.

describe('V1 challenge manual progress gates fitness + streak', () => {
  const src = read('../../controllers/challengeController.mjs');
  it('defines the evidence-required category set (fitness, streak)', () => {
    expect(src).toMatch(/EVIDENCE_REQUIRED_V1_CATEGORIES = new Set\(\['fitness', 'streak'\]\)/);
  });
  it('rejects manual progress for evidence-required categories with a 409 code', () => {
    expect(src).toMatch(/EVIDENCE_REQUIRED_V1_CATEGORIES\.has\(challenge\.category\)/);
    expect(src).toContain('CHALLENGE_REQUIRES_WORKOUT_EVIDENCE');
  });
});
