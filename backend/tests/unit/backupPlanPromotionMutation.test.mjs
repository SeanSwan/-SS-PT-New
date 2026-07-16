/**
 * ============================================================================
 * FILE: backupPlanPromotionMutation.test.mjs
 * PURPOSE: Lock backup promotion to the audited lifecycle boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves trainer-chosen backup promotion delegates to one
 * activation transaction, records sibling pauses, and drops metadata primary.
 * HOW IT FITS IN THE APP: Promote route -> backup service -> lifecycle service.
 * KEY DECISIONS: Active status alone means primary; promoted backup provenance
 * remains metadata, while plan identity remains UUID-safe.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  WorkoutPlan: { modelName: 'WorkoutPlan' },
  transitionWorkoutPlanLifecycle: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn() },
}));
vi.mock('../../models/index.mjs', () => ({
  getWorkoutPlan: () => fixtures.WorkoutPlan,
  getWorkoutSession: vi.fn(),
}));
vi.mock('../../services/workoutBuilderService.mjs', () => ({ generatePlan: vi.fn() }));
vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
  transitionWorkoutPlanLifecycle: (...args) => fixtures.transitionWorkoutPlanLifecycle(...args),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { promoteBackupPlan } = await import('../../services/backupPlanService.mjs');
const BACKUP_ID = '6ea7806d-36c8-4307-bd5d-6b04b68be849';
const PRIOR_ID = 'b9e0e94c-a081-4556-a81b-35977cf177a2';

describe('backup plan promotion lifecycle wiring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('activates through one audited lifecycle transition with provenance updates', async () => {
    const promoted = {
      id: BACKUP_ID,
      userId: 7,
      status: 'active',
      metadata: { planRole: 'promoted_backup', promotedBy: 3 },
    };
    fixtures.transitionWorkoutPlanLifecycle.mockResolvedValue({
      plan: promoted,
      lifecycleReceipts: [
        { planId: PRIOR_ID, action: 'activate_sibling_pause' },
        { planId: BACKUP_ID, action: 'activate' },
      ],
    });

    const result = await promoteBackupPlan({ planId: BACKUP_ID, trainerId: 3 });

    expect(fixtures.transitionWorkoutPlanLifecycle).toHaveBeenCalledWith(expect.objectContaining({
      WorkoutPlan: fixtures.WorkoutPlan,
      planId: BACKUP_ID,
      action: 'activate',
      actorId: 3,
      derivativeReason: 'backup_promotion',
      validateTarget: expect.any(Function),
      targetUpdates: expect.any(Function),
    }));
    const input = fixtures.transitionWorkoutPlanLifecycle.mock.calls[0][0];
    expect(input.targetUpdates({
      metadata: { planRole: 'ai_backup', isPrimaryPlan: false, primary: false },
    })).toMatchObject({
      currentWeek: 1,
      currentDay: 1,
      metadata: { planRole: 'promoted_backup', promotedBy: 3 },
    });
    expect(input.targetUpdates({ metadata: { planRole: 'ai_backup' } }).metadata)
      .not.toHaveProperty('isPrimaryPlan');
    expect(result).toEqual({ promoted, archived: [PRIOR_ID] });
  });

  it('uses an in-lock target guard for non-backup rows', async () => {
    const error = Object.assign(new Error('Not an AI backup plan'), {
      code: 'WORKOUT_PLAN_NOT_BACKUP',
      statusCode: 400,
    });
    fixtures.transitionWorkoutPlanLifecycle.mockRejectedValue(error);

    await expect(promoteBackupPlan({ planId: BACKUP_ID, trainerId: 3 }))
      .rejects.toBe(error);
  });
});
