/**
 * ============================================================================
 * FILE: backupPlanPromotionMutation.test.mjs
 * PURPOSE: Lock backup-to-primary swaps to the canonical mutation boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves backup promotion locks every client plan before
 * applying revision-aware demotion and promotion mutations.
 * HOW IT FITS IN THE APP: Promote route -> backup service -> mutation boundary.
 * KEY DECISIONS: The target cannot archive itself and both primary marker forms
 * move atomically with the active status.
 * NASM PROTOCOL CONTEXT: A plan swap changes lifecycle state, not prescribed
 * content, so content identities remain stable while ownership stays explicit.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  WorkoutPlan: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
  mutateWorkoutPlanRecord: vi.fn(),
  sequelizeTransaction: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: (...args) => fixtures.sequelizeTransaction(...args),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getWorkoutPlan: () => fixtures.WorkoutPlan,
  getWorkoutSession: vi.fn(),
}));

vi.mock('../../services/workoutBuilderService.mjs', () => ({
  generatePlan: vi.fn(),
}));

vi.mock('../../services/workoutPlanMutationService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  createWorkoutPlanRecord: vi.fn(),
  mutateWorkoutPlanRecord: (...args) => fixtures.mutateWorkoutPlanRecord(...args),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { promoteBackupPlan } = await import('../../services/backupPlanService.mjs');

describe('backup plan promotion mutation wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses one all-plan lock and revision-aware primary transition', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const backup = {
      id: 'backup-promote',
      userId: 7,
      status: 'draft',
      contentRevision: 3,
      metadata: { planRole: 'ai_backup', isPrimaryPlan: false, primary: false },
    };
    const prior = {
      id: 'prior-active',
      userId: 7,
      status: 'active',
      contentRevision: 5,
      metadata: { planRole: 'primary', isPrimaryPlan: true, primary: true },
    };
    fixtures.sequelizeTransaction.mockImplementation(async (operation) => operation(transaction));
    fixtures.WorkoutPlan.findByPk.mockResolvedValue(backup);
    fixtures.WorkoutPlan.findAll.mockResolvedValue([backup, prior]);
    fixtures.mutateWorkoutPlanRecord.mockImplementation(async ({ planId }) => ({
      plan: planId === backup.id ? backup : prior,
    }));

    const result = await promoteBackupPlan({ planId: backup.id, trainerId: 3 });

    expect(fixtures.sequelizeTransaction).toHaveBeenCalledTimes(1);
    expect(fixtures.WorkoutPlan.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 7 },
      transaction,
      lock: 'UPDATE',
    }));
    expect(fixtures.mutateWorkoutPlanRecord).toHaveBeenCalledTimes(2);
    const priorMutation = fixtures.mutateWorkoutPlanRecord.mock.calls.find(
      ([input]) => input.planId === prior.id,
    )[0];
    const backupMutation = fixtures.mutateWorkoutPlanRecord.mock.calls.find(
      ([input]) => input.planId === backup.id,
    )[0];

    expect(priorMutation).toMatchObject({
      WorkoutPlan: fixtures.WorkoutPlan,
      expectedRevision: 5,
      transaction,
    });
    expect(priorMutation.updates(prior)).toMatchObject({
      status: 'paused',
      metadata: { isPrimaryPlan: false, primary: false },
    });
    expect(backupMutation).toMatchObject({
      WorkoutPlan: fixtures.WorkoutPlan,
      expectedRevision: 3,
      transaction,
    });
    expect(backupMutation.updates(backup)).toMatchObject({
      status: 'active',
      metadata: {
        planRole: 'primary',
        isPrimaryPlan: true,
        primary: true,
        promotedBy: 3,
      },
    });
expect(result).toEqual({ promoted: backup, archived: [prior.id] });
  });

  it('rejects a non-backup row with a typed client-safe error', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const primary = {
      id: 'primary-plan',
      userId: 7,
      status: 'active',
      metadata: { planRole: 'primary' },
    };
    fixtures.sequelizeTransaction.mockImplementation(async (operation) => operation(transaction));
    fixtures.WorkoutPlan.findByPk.mockResolvedValue(primary);
    fixtures.WorkoutPlan.findAll.mockResolvedValue([primary]);

    await expect(promoteBackupPlan({ planId: primary.id, trainerId: 3 }))
      .rejects.toMatchObject({
        code: 'WORKOUT_PLAN_NOT_BACKUP',
        statusCode: 400,
      });
    expect(fixtures.mutateWorkoutPlanRecord).not.toHaveBeenCalled();
  });
});