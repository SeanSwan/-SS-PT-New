/**
 * Safety-review acknowledgement — role restriction
 * ================================================
 * The review-queue REVISE item: the 409 acknowledged-review contract had no
 * role check on the acknowledger, and the generation route allowlist includes
 * client/user (behind ENABLE_CLIENT_PLAN_SELFGEN). A client could acknowledge
 * their OWN safety review and the audit log would record them as the reviewer.
 *
 * Contract: an acknowledgement is honored ONLY from trainer/admin actors.
 * Any other role — or an unthreaded caller that passes no role — fails CLOSED:
 * the 409 review-required contract still throws. All five generateWorkout /
 * generatePlan call sites must thread the actor's role.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { enforceSwanCoachPlanningReview } from '../../services/swanCoachPlanningReviewEnforcementService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const blockingGate = {
  status: 'review_required',
  reviewRequiredSignals: ['active_pain_review_required'],
  missingCriticalData: [],
};

const ackArgs = (overrides = {}) => ({
  safetyGate: blockingGate,
  planningReviewAcknowledged: true,
  planningReviewReason: 'Reviewed exclusions with the client',
  actorUserId: 42,
  clientId: 7,
  ...overrides,
});

describe('enforceSwanCoachPlanningReview — acknowledger role restriction', () => {
  it('honors an acknowledgement from a trainer', () => {
    const result = enforceSwanCoachPlanningReview(ackArgs({ actorRole: 'trainer' }));
    expect(result.required).toBe(true);
    expect(result.acknowledgement).toMatchObject({
      acknowledged: true,
      acknowledgedByUserId: 42,
      acknowledgedByRole: 'trainer',
    });
  });

  it('honors an acknowledgement from an admin', () => {
    const result = enforceSwanCoachPlanningReview(ackArgs({ actorRole: 'admin' }));
    expect(result.acknowledgement.acknowledgedByRole).toBe('admin');
  });

  it('refuses a CLIENT acknowledging their own safety review (409 still thrown)', () => {
    expect(() => enforceSwanCoachPlanningReview(ackArgs({ actorRole: 'client' })))
      .toThrowError(expect.objectContaining({ status: 409, code: 'SWAN_COACH_REVIEW_REQUIRED' }));
  });

  it('refuses a user-role acknowledgement', () => {
    expect(() => enforceSwanCoachPlanningReview(ackArgs({ actorRole: 'user' })))
      .toThrowError(expect.objectContaining({ status: 409 }));
  });

  it('fails CLOSED when a caller does not thread the actor role', () => {
    expect(() => enforceSwanCoachPlanningReview(ackArgs()))
      .toThrowError(expect.objectContaining({ status: 409 }));
  });

  it('still passes untouched when the gate is not blocking', () => {
    const result = enforceSwanCoachPlanningReview({
      safetyGate: { status: 'coach_review_ready' },
      planningReviewAcknowledged: false,
    });
    expect(result).toEqual({ required: false, acknowledgement: null });
  });
});

describe('actor-role threading (source contract — all generation call sites)', () => {
  const read = (p) => readFileSync(resolve(__dirname, p), 'utf8');

  it('workoutBuilderService forwards planningReviewActorRole to enforcement in both generators', () => {
    const source = read('../../services/workoutBuilderService.mjs');
    const matches = source.match(/actorRole: planningReviewActorRole/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('every generateWorkout/generatePlan call site threads the actor role', () => {
    const builderRoutes = read('../../routes/workoutBuilderRoutes.mjs');
    const adminController = read('../../controllers/adminClientController.mjs');
    const backupService = read('../../services/backupPlanService.mjs');
    const planRoutes = read('../../routes/workoutPlanRoutes.mjs');

    expect((builderRoutes.match(/planningReviewActorRole: req\.user\.role/g) || []).length)
      .toBeGreaterThanOrEqual(2);
    expect((adminController.match(/planningReviewActorRole: req\.user\.role/g) || []).length)
      .toBeGreaterThanOrEqual(2);
    expect(backupService).toContain('planningReviewActorRole');
    expect(planRoutes).toContain('planningReviewActorRole: req.user.role');
  });
});
