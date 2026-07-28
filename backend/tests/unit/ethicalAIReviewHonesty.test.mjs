/**
 * Regression tests for EthicalAIReview — the "a safety check must not lie" contract.
 *
 * WHY THIS FILE EXISTS (incident 2026-07-28, SWA-71):
 * Three defects shipped together on main and were only found by executing the code, not reading it:
 *
 *   1. `calculateEthicalScore` was keyed for the WORKOUT checks only. The nutrition review emits
 *      different keys, so 3 of its 4 checks were silently dropped from the score — capping every
 *      nutrition review at 23/100 against an 85 threshold. Nutrition ethical review could never
 *      pass, for any input, and nothing reported that checks had vanished.
 *   2. All four nutrition checks were stubs returning `{ passed: true, score: 90 }` without
 *      reading their arguments. Correcting (1) alone would have flipped the review from a loud
 *      failure to a SILENT PASS backed by checks that inspect nothing.
 *   3. `piiSafeLogger.trackAIGeneration` did not exist, yet was called at the top of
 *      `reviewWorkoutGeneration` and inside `flagForHumanReview` — so workout review threw
 *      immediately, and the human-review escalation never fired for any plan.
 *
 * The invariant these tests defend: an unimplemented safety check must be structurally incapable
 * of reporting a pass, and a review must distinguish "reviewed and failed" from "never reviewed".
 */
import { describe, it, expect } from 'vitest';
import { ethicalAIReview } from '../../services/ai/EthicalAIReview.mjs';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const nutritionPlan = {
  id: 'test-plan-1',
  content: 'Peanut butter smoothie for breakfast. Skip dinner to accelerate fat loss.'
};
const allergicProfile = {
  userId: 'test-user-1',
  allergies: ['peanuts'],
  dietaryRestrictions: ['vegan']
};

describe('EthicalAIReview — unimplemented checks cannot manufacture assurance', () => {
  it('never reports passed:true while any nutrition check is unimplemented', async () => {
    const result = await ethicalAIReview.reviewNutritionGeneration(nutritionPlan, allergicProfile);
    expect(result.passed).toBe(false);
  });

  it('reports the review as incomplete and names every check that did not run', async () => {
    const result = await ethicalAIReview.reviewNutritionGeneration(nutritionPlan, allergicProfile);

    expect(result.reviewComplete).toBe(false);
    expect(result.unrunChecks).toEqual(
      expect.arrayContaining([
        'inclusivity',
        'bodyPositivity',
        'culturalSensitivity',
        'dietaryRestrictions'
      ])
    );
    expect(result.incompleteReason).toMatch(/NOT an ethical clearance/i);
  });

  it('gives unimplemented checks a null score so they cannot be summed toward a pass', async () => {
    const result = await ethicalAIReview.reviewNutritionGeneration(nutritionPlan, allergicProfile);

    for (const name of ['inclusivity', 'bodyPositivity', 'culturalSensitivity', 'dietaryRestrictions']) {
      expect(result[name].implemented).toBe(false);
      expect(result[name].passed).toBe(false);
      expect(result[name].score).toBeNull();
    }
    // The pre-fix stubs scored 90 each. Nothing unimplemented may contribute to the total.
    expect(result.overallScore).toBe(0);
  });

  it('does not silently claim to have accommodated a declared allergen', async () => {
    const result = await ethicalAIReview.reviewNutritionGeneration(nutritionPlan, allergicProfile);

    // Pre-fix this returned { passed: true, score: 90, issues: [] } for a peanut plan served to a
    // client with a declared peanut allergy. It must now say plainly that it did not check.
    expect(result.dietaryRestrictions.passed).toBe(false);
    expect(result.dietaryRestrictions.issues.join(' ')).toMatch(/not implemented/i);
  });
});

describe('EthicalAIReview — scoring does not silently discard checks', () => {
  it('ignores checks whose key has no weight rather than counting them', () => {
    const score = ethicalAIReview.calculateEthicalScore(
      { inclusivity: { score: 100 }, someUnknownCheck: { score: 100 } },
      { inclusivity: 1.0 }
    );
    expect(score).toBe(100);
  });

  it('flags an unweighted check as unrun so a vanished check cannot hide', () => {
    const unrun = ethicalAIReview.collectUnrunChecks(
      { inclusivity: { score: 90 }, ghostCheck: { score: 90 } },
      { inclusivity: 0.25 }
    );
    expect(unrun).toContain('ghostCheck');
  });

  it('honors a legitimate 0.0 weight instead of skipping it as falsy', () => {
    const score = ethicalAIReview.calculateEthicalScore(
      { a: { score: 100 }, b: { score: 100 } },
      { a: 1.0, b: 0.0 }
    );
    expect(score).toBe(100);
  });

  it('excludes non-numeric scores from the total', () => {
    const score = ethicalAIReview.calculateEthicalScore(
      { a: { score: 80 }, b: { score: null } },
      { a: 0.5, b: 0.5 }
    );
    expect(score).toBe(40);
  });
});

describe('EthicalAIReview — unrun detection must not produce false positives', () => {
  // Hostile-review round 1 caught this before ship: the first implementation flagged ANY
  // unweighted object as an unrun check, so the workout review's `ethicalCompliance` data blob
  // (wcagCompliant / inclusiveLanguage / positivityScore — not a check) forced
  // `reviewComplete: false` and would have blocked an otherwise-passing workout review.
  it('does not flag sibling data objects that are not check results', () => {
    const unrun = ethicalAIReview.collectUnrunChecks(
      { inclusivity: { score: 90 }, ethicalCompliance: { wcagCompliant: true, positivityScore: 0 } },
      { inclusivity: 1.0 }
    );
    expect(unrun).not.toContain('ethicalCompliance');
  });

  it('still detects a check that carries a score but lost its weight', () => {
    const unrun = ethicalAIReview.collectUnrunChecks(
      { inclusivity: { score: 90 }, driftedCheck: { score: 90 } },
      { inclusivity: 1.0 }
    );
    expect(unrun).toContain('driftedCheck');
  });

  it('detects implemented:false even when the check IS weighted', () => {
    const unrun = ethicalAIReview.collectUnrunChecks(
      { stubbed: { implemented: false, score: null } },
      { stubbed: 1.0 }
    );
    expect(unrun).toContain('stubbed');
  });

  it('leaves the workout review complete with no phantom findings', async () => {
    const result = await ethicalAIReview.reviewWorkoutGeneration(
      { id: 'w1', name: 'Test', description: 'Push day', exercises: [] },
      { userId: 'u1' }
    );
    expect(result.unrunChecks).toEqual([]);
    expect(result.reviewComplete).toBe(true);
    // passed must track the score, not be forced false by a false positive
    expect(result.passed).toBe(result.overallScore >= 85);
  });
});

describe('EthicalAIReview — error handlers must not themselves throw', () => {
  // Both catch blocks dereferenced `plan.id` / `clientProfile.userId` unguarded, so a null
  // argument made the ERROR HANDLER throw — the same "failure path fails" class as the missing
  // logger method. Found by hostile review, not by reading.
  it('survives null arguments on the nutrition path', async () => {
    const result = await ethicalAIReview.reviewNutritionGeneration(null, null);
    expect(result.passed).toBe(false);
  });

  it('survives null arguments on the workout path', async () => {
    const result = await ethicalAIReview.reviewWorkoutGeneration(null, null);
    expect(result.passed).toBe(false);
  });
});

describe('piiSafeLogger.trackAIGeneration — the method whose absence disabled the service', () => {
  it('exists as a callable function', () => {
    expect(typeof piiSafeLogger.trackAIGeneration).toBe('function');
  });

  it('never throws, so an observability call cannot abort a reviewed path', async () => {
    await expect(
      piiSafeLogger.trackAIGeneration('nutrition_planning', 'test-user-1', { reviewStarted: true })
    ).resolves.not.toThrow();
  });

  it('lets the human-review escalation complete instead of throwing', async () => {
    const record = await ethicalAIReview.flagForHumanReview(
      nutritionPlan,
      { overallScore: 23, someCheck: { issues: ['x'] } },
      allergicProfile
    );
    // Pre-fix this threw on the missing logger method and returned undefined — no human was ever
    // flagged for ANY plan, in either the nutrition or the workout path.
    expect(record).toBeDefined();
    expect(record.reviewStatus).toBe('pending');
  });
});
