/**
 * Boundary validation for the winning POST /api/workout/sessions controller.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAccess: vi.fn(),
  createWorkoutSession: vi.fn(),
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mocks.assertAccess,
}));

vi.mock('../../services/workoutService.mjs', () => ({
  default: { createWorkoutSession: mocks.createWorkoutSession },
}));

const { createWorkoutSession } = await import('../../controllers/workoutController.mjs');

const buildResponse = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

describe('canonical workout-session input validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAccess.mockResolvedValue(true);
  });

  it.each([
    ['a'.repeat(65), 'too long'],
    [{ attacker: 'object' }, 'not a string'],
  ])('rejects a retry key that is %s (%s)', async (clientRequestId) => {
    const res = buildResponse();

    await createWorkoutSession({
      user: { id: 42, role: 'client' },
      body: { userId: 42, title: 'Strength day', clientRequestId },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Invalid workout retry key',
    }));
    expect(mocks.createWorkoutSession).not.toHaveBeenCalled();
  });
});
