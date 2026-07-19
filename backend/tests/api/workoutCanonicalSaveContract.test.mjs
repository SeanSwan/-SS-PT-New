/**
 * Canonical POST /api/workout/sessions save contract.
 *
 * The broader /api/workout router mounts before the specialized
 * /api/workout/sessions router, so this suite locks the actual winning
 * controller/service path rather than testing the shadowed implementation.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAccess: vi.fn(),
  createWorkoutSession: vi.fn(),
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mocks.assertAccess,
}));

vi.mock('../../services/workoutService.mjs', () => ({
  default: {
    createWorkoutSession: mocks.createWorkoutSession,
  },
}));

const { createWorkoutSession } = await import('../../controllers/workoutController.mjs');

const buildResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

describe('canonical workout-session save contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAccess.mockResolvedValue(true);
    mocks.createWorkoutSession.mockResolvedValue({ id: 'session-1' });
  });

  it('forwards the retry key and model-backed workout fields to the service', async () => {
    const req = {
      user: { id: 42, role: 'client' },
      body: {
        userId: 42,
        title: 'Strength day',
        sessionDate: '2026-07-19T12:00:00.000Z',
        duration: 45,
        intensity: 8,
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        exercises: [],
      },
    };
    const res = buildResponse();

    await createWorkoutSession(req, res);

    expect(mocks.createWorkoutSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      sessionDate: req.body.sessionDate,
      duration: 45,
      intensity: 8,
      clientRequestId: req.body.clientRequestId,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('persists the same fields and replays only the composite idempotency conflict', () => {
    const serviceSource = readFileSync(
      resolve(process.cwd(), 'services/workoutService.mjs'),
      'utf8',
    );

    expect(serviceSource).toContain('clientRequestId: sessionData.clientRequestId || null');
    expect(serviceSource).toContain('date: sessionData.sessionDate || sessionData.date');
    expect(serviceSource).toContain('duration: sessionData.duration');
    expect(serviceSource).toContain('intensity: sessionData.intensity');
    expect(serviceSource).toContain("const IDEM_INDEX = 'workout_sessions_user_client_request_uidx'");
    expect(serviceSource).toContain('where: { userId: sessionData.userId, clientRequestId }');
  });
});
