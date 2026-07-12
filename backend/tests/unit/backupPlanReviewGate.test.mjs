/**
 * Backup-plan × safety-gate review contract — regression tests
 * ============================================================
 * Cortex P0 made the deterministic safety gate BLOCK generatePlan with a
 * 409 acknowledged-review contract. The backup-plan path was missed in the
 * caller sweep: generateBackupPlan called generatePlan without the
 * acknowledgement passthrough, and its route mapped the review block to a
 * generic 500 "Failed to generate backup plan" — bricking backup generation
 * for every client whose gate is red (any active pain entry) with no way
 * through and the safety block disguised as a server error.
 *
 * Locks: (1) the service forwards planningReviewAcknowledged/Reason to
 * generatePlan and lets SwanCoachPlanningReviewError propagate untouched;
 * (2) the route maps that error to the same 409/400 contract the builder
 * routes use (code SWAN_COACH_REVIEW_REQUIRED — the shape SafetyGateModal
 * already parses), instead of a 500.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const generatePlanMock = vi.fn();

vi.mock('../../services/workoutBuilderService.mjs', () => ({
  generatePlan: (...args) => generatePlanMock(...args),
}));

vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../models/index.mjs', () => ({
  getWorkoutPlan: vi.fn(),
  getWorkoutSession: vi.fn(),
}));

const { generateBackupPlan } = await import('../../services/backupPlanService.mjs');

class FakeReviewError extends Error {
  constructor() {
    super('Safety review required');
    this.name = 'SwanCoachPlanningReviewError';
    this.status = 409;
    this.code = 'SWAN_COACH_REVIEW_REQUIRED';
    this.reviewRequiredSignals = ['active_pain_review_required'];
    this.missingCriticalData = [];
  }
}

describe('generateBackupPlan × safety-gate review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards the acknowledged-review contract to generatePlan', async () => {
    generatePlanMock.mockRejectedValueOnce(new FakeReviewError());

    await expect(generateBackupPlan({
      userId: 7,
      trainerId: 3,
      planningReviewAcknowledged: true,
      planningReviewReason: 'Reviewed knee-pain exclusions with the client',
    })).rejects.toMatchObject({ name: 'SwanCoachPlanningReviewError' });

    expect(generatePlanMock).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 7,
      trainerId: 3,
      planningReviewAcknowledged: true,
      planningReviewReason: 'Reviewed knee-pain exclusions with the client',
    }));
  });

  it('defaults to unacknowledged and lets the review block propagate (no swallow)', async () => {
    generatePlanMock.mockRejectedValueOnce(new FakeReviewError());

    await expect(generateBackupPlan({ userId: 7, trainerId: 3 }))
      .rejects.toMatchObject({ status: 409, code: 'SWAN_COACH_REVIEW_REQUIRED' });

    expect(generatePlanMock).toHaveBeenCalledWith(expect.objectContaining({
      planningReviewAcknowledged: false,
    }));
  });
});

describe('backup route review-contract mapping (source contract)', () => {
  const routeSource = readFileSync(
    resolve(__dirname, '../../routes/workoutPlanRoutes.mjs'), 'utf8');

  it('maps SwanCoachPlanningReviewError to the builder 409/400 contract, not a 500', () => {
    const start = routeSource.indexOf("router.post('/backup/:userId/generate'");
    const end = routeSource.indexOf('router.', start + 10);
    const slice = routeSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(slice).toContain("err.name === 'SwanCoachPlanningReviewError'");
    expect(slice).toContain('reviewRequiredSignals');
    expect(slice).toContain('planningReviewAcknowledged');
  });
});
