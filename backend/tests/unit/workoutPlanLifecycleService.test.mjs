/**
 * ============================================================================
 * FILE: workoutPlanLifecycleService.test.mjs
 * PURPOSE: Lock authorized, audited workout-plan lifecycle transitions.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import { describe, expect, it, vi } from 'vitest';
import {
  WorkoutPlanLifecycleError,
  transitionWorkoutPlanLifecycle,
} from '../../services/workoutPlanLifecycleService.mjs';

const row = (values) => ({
  ...values,
  get: () => ({ ...values }),
});

const harness = ({ target, siblings = [target] }) => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const WorkoutPlan = {
    findByPk: vi.fn().mockResolvedValue(target),
    findAll: vi.fn().mockResolvedValue(siblings),
  };
  const sequelize = {
    transaction: vi.fn((operation) => operation(transaction)),
  };
  const mutateRecord = vi.fn(async ({ planId, updates, pdfDerivativeIntent }) => ({
    plan: row({ ...siblings.find((plan) => plan.id === planId), ...updates }),
    pdfDerivative: pdfDerivativeIntent ? { enabled: true, state: 'pending' } : null,
  }));
  const recordReceipt = vi.fn(async ({ fromStatus, toStatus }) => ({
    id: `${fromStatus}-${toStatus}`,
    fromStatus,
    toStatus,
  }));
  return { WorkoutPlan, mutateRecord, recordReceipt, sequelize, transaction };
};

describe('transitionWorkoutPlanLifecycle', () => {
  it('atomically pauses the prior active sibling and activates the requested plan', async () => {
    const target = row({ id: 'plan-draft', userId: 42, status: 'draft', metadata: {} });
    const active = row({ id: 'plan-active', userId: 42, status: 'active', metadata: { isPrimary: true } });
    const deps = harness({ target, siblings: [target, active] });

    const result = await transitionWorkoutPlanLifecycle({
      ...deps,
      planId: target.id,
      action: 'activate',
      actorId: 7,
    });

    expect(deps.WorkoutPlan.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
      lock: 'UPDATE',
      order: [['id', 'ASC']],
    }));
    expect(deps.mutateRecord).toHaveBeenNthCalledWith(1, expect.objectContaining({
      planId: active.id,
      updates: expect.objectContaining({ status: 'paused' }),
    }));
    expect(deps.mutateRecord).toHaveBeenNthCalledWith(2, expect.objectContaining({
      planId: target.id,
      updates: expect.objectContaining({ status: 'active' }),
      pdfDerivativeIntent: expect.objectContaining({ reason: 'activation' }),
    }));
    expect(deps.recordReceipt).toHaveBeenCalledTimes(2);
    expect(result.plan.status).toBe('active');
    expect(result.pdfDerivative).toEqual({ enabled: true, state: 'pending' });
  });

  it('does not mutate paused, completed, or archived history while activating', async () => {
    const target = row({ id: 'plan-draft', userId: 42, status: 'draft', metadata: {} });
    const history = [
      row({ id: 'plan-paused', userId: 42, status: 'paused', metadata: { primary: true } }),
      row({ id: 'plan-completed', userId: 42, status: 'completed', metadata: {} }),
      row({ id: 'plan-archived', userId: 42, status: 'archived', metadata: {} }),
    ];
    const deps = harness({ target, siblings: [target, ...history] });

    await transitionWorkoutPlanLifecycle({
      ...deps,
      planId: target.id,
      action: 'activate',
      actorId: 7,
    });

    expect(deps.mutateRecord).toHaveBeenCalledTimes(1);
    expect(deps.mutateRecord).toHaveBeenCalledWith(expect.objectContaining({ planId: target.id }));
  });

  it('runs an in-lock guard, merges bounded target updates, and returns every receipt', async () => {
    const target = row({ id: 'plan-draft', userId: 42, status: 'draft', metadata: {} });
    const active = row({ id: 'plan-active', userId: 42, status: 'active', metadata: {} });
    const deps = harness({ target, siblings: [target, active] });
    const validateTarget = vi.fn();
    const targetUpdates = vi.fn(() => ({ currentWeek: 1, metadata: { planRole: 'promoted_backup' } }));

    const result = await transitionWorkoutPlanLifecycle({
      ...deps,
      planId: target.id,
      action: 'activate',
      actorId: 7,
      derivativeReason: 'backup_promotion',
      validateTarget,
      targetUpdates,
    });

    expect(validateTarget).toHaveBeenCalledWith(target);
    expect(deps.mutateRecord).toHaveBeenLastCalledWith(expect.objectContaining({
      updates: expect.objectContaining({
        status: 'active',
        currentWeek: 1,
        metadata: { planRole: 'promoted_backup' },
      }),
      pdfDerivativeIntent: expect.objectContaining({ reason: 'backup_promotion' }),
    }));
    expect(result.lifecycleReceipts).toHaveLength(2);
  });
  it('uses a caller-owned transaction without nesting another transaction', async () => {
    const target = row({ id: 'plan-draft', userId: 42, status: 'draft', metadata: {} });
    const deps = harness({ target });

    await transitionWorkoutPlanLifecycle({
      ...deps,
      transaction: deps.transaction,
      planId: target.id,
      action: 'activate',
      actorId: 7,
    });

    expect(deps.sequelize.transaction).not.toHaveBeenCalled();
    expect(deps.mutateRecord).toHaveBeenCalledWith(expect.objectContaining({
      transaction: deps.transaction,
    }));
  });

  it.each([
    ['pause', 'active', 'paused'],
    ['complete', 'paused', 'completed'],
  ])('supports %s with a durable receipt', async (action, fromStatus, toStatus) => {
    const target = row({ id: 'plan-1', userId: 42, status: fromStatus, metadata: { isPrimary: true } });
    const deps = harness({ target });

    const result = await transitionWorkoutPlanLifecycle({
      ...deps,
      planId: target.id,
      action,
      actorId: 7,
    });

    expect(deps.mutateRecord).toHaveBeenCalledWith(expect.objectContaining({
      updates: expect.objectContaining({ status: toStatus }),
    }));
    expect(deps.recordReceipt).toHaveBeenCalledWith(expect.objectContaining({
      fromStatus,
      toStatus,
      actorId: 7,
    }));
    expect(result.lifecycleReceipt.toStatus).toBe(toStatus);
  });

  it('archives without erasing the last derivative and records authoritative audit fields', async () => {
    const target = row({
      id: 'plan-1', userId: 42, status: 'active', metadata: { isPrimary: true },
      pdfFileName: 'last-valid.pdf',
    });
    const deps = harness({ target });
    const now = new Date('2026-07-16T08:00:00.000Z');

    const result = await transitionWorkoutPlanLifecycle({
      ...deps,
      planId: target.id,
      action: 'archive',
      actorId: 7,
      now: () => now,
    });

    expect(deps.mutateRecord).toHaveBeenCalledWith(expect.objectContaining({
      updates: expect.objectContaining({
        status: 'archived',
        archivedAt: now,
        archivedBy: 7,
      }),
      pdfDerivativeIntent: undefined,
    }));
    expect(result.plan.pdfFileName).toBe('last-valid.pdf');
  });

  it('rejects transitions out of archived without writing', async () => {
    const target = row({ id: 'plan-1', userId: 42, status: 'archived', metadata: {} });
    const deps = harness({ target });

    await expect(transitionWorkoutPlanLifecycle({
      ...deps,
      planId: target.id,
      action: 'activate',
      actorId: 7,
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_LIFECYCLE_CONFLICT',
      statusCode: 409,
    });
    expect(deps.mutateRecord).not.toHaveBeenCalled();
  });

  it('rejects unknown lifecycle actions as client errors', async () => {
    const target = row({ id: 'plan-1', userId: 42, status: 'active', metadata: {} });
    const deps = harness({ target });
    await expect(transitionWorkoutPlanLifecycle({
      ...deps,
      planId: target.id,
      action: 'delete-forever',
      actorId: 7,
    })).rejects.toBeInstanceOf(WorkoutPlanLifecycleError);
  });
});