/**
 * ============================================================================
 * FILE: workoutPlanLifecycleHandlers.test.mjs
 * PURPOSE: Verify lifecycle HTTP handlers return safe conflicts and receipts.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import { describe, expect, it, vi } from 'vitest';
import { createWorkoutPlanLifecycleHandlers } from '../../routes/workoutPlanLifecycleHandlers.mjs';

const response = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('workout plan lifecycle handlers', () => {
  it('returns the transitioned plan, derivative summary, and durable receipt', async () => {
    const transition = vi.fn().mockResolvedValue({
      plan: { id: 'plan-1', userId: 42, status: 'paused' },
      plans: [{ id: 'plan-1', userId: 42, status: 'paused' }],
      pdfDerivative: null,
      lifecycleReceipt: { id: 'receipt-1', fromStatus: 'active', toStatus: 'paused' },
    });
    const { statusHandler } = createWorkoutPlanLifecycleHandlers({
      transition,
      getWorkoutPlan: () => ({ modelName: 'WorkoutPlan' }),
    });
    const req = { params: { id: 'plan-1' }, body: { action: 'pause' }, user: { id: 7 } };
    const res = response();

    await statusHandler(req, res);

    expect(transition).toHaveBeenCalledWith(expect.objectContaining({
      planId: 'plan-1', action: 'pause', actorId: 7,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      plan: expect.objectContaining({ status: 'paused' }),
      lifecycleReceipt: expect.objectContaining({ id: 'receipt-1' }),
    }));
  });

  it('maps lifecycle conflicts without exposing internal errors', async () => {
    const transition = vi.fn().mockRejectedValue(Object.assign(new Error('internal details'), {
      code: 'WORKOUT_PLAN_LIFECYCLE_CONFLICT',
      statusCode: 409,
    }));
    const logger = { error: vi.fn() };
    const { statusHandler } = createWorkoutPlanLifecycleHandlers({
      transition,
      logger,
      getWorkoutPlan: () => ({ modelName: 'WorkoutPlan' }),
    });
    const res = response();

    await statusHandler({ params: { id: 'plan-1' }, body: { action: 'activate' }, user: { id: 7 } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'WORKOUT_PLAN_LIFECYCLE_CONFLICT',
      message: 'Workout plan cannot make that lifecycle transition.',
    });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('internal details');
  });

  it('forces the legacy activate handler onto the canonical activate action', async () => {
    const transition = vi.fn().mockResolvedValue({
      plan: { id: 'plan-1', userId: 42, status: 'active' }, plans: [],
      lifecycleReceipt: { id: 'receipt-1' }, pdfDerivative: { enabled: true, state: 'pending' },
    });
    const { activateHandler } = createWorkoutPlanLifecycleHandlers({
      transition,
      getWorkoutPlan: () => ({ modelName: 'WorkoutPlan' }),
    });
    const res = response();
    await activateHandler({ params: { id: 'plan-1' }, user: { id: 7 } }, res);
    expect(transition).toHaveBeenCalledWith(expect.objectContaining({ action: 'activate' }));
  });
});