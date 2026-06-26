import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadRouteHandler(generateWorkoutCandidates = vi.fn(async payload => ({ payload, slots: [] }))) {
  vi.resetModules();
  vi.doMock('../../services/workoutBuilderCandidateService.mjs', () => ({
    candidateCountForMode: vi.fn((mode) => (mode === 'deep_grill' ? 6 : 4)),
    generateWorkoutCandidates,
    normalizeGenerationMode: vi.fn((mode) => (mode === 'deep_grill' ? 'deep_grill' : 'guide_me')),
  }));
  vi.doMock('../../utils/logger.mjs', () => ({
    default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  }));
  return import('../../routes/workoutBuilderCandidateRouteHandler.mjs');
}

function createRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workoutBuilder guided candidate route', () => {
  it('passes a normalized equipment profile id through the candidate route', async () => {
    const generateWorkoutCandidates = vi.fn(async () => ({ slots: [] }));
    const { createWorkoutCandidatesHandler } = await loadRouteHandler(generateWorkoutCandidates);
    const enforceWorkoutGenAccess = vi.fn(async () => null);
    const handler = createWorkoutCandidatesHandler({
      enforceWorkoutGenAccess,
      safeWorkoutBuilderDetails: err => err.message,
    });
    const req = {
      body: {
        clientId: '42',
        category: 'back',
        primaryGoal: 'strength',
        nasmPhase: '3',
        generationMode: 'deep_grill',
        equipmentProfileId: '77',
      },
      user: { id: 7 },
    };
    const res = createRes();

    await handler(req, res);

    expect(enforceWorkoutGenAccess).toHaveBeenCalledWith(req, res, 42);
    expect(generateWorkoutCandidates).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      trainerId: 7,
      category: 'back',
      primaryGoal: 'strength',
      nasmPhase: 3,
      generationMode: 'deep_grill',
      candidateCount: 6,
      equipmentProfileId: 77,
    }));
    expect(res.json).toHaveBeenCalledWith({ success: true, candidates: { slots: [] } });
  });

  it('rejects malformed client ids before access checks or generation', async () => {
    const generateWorkoutCandidates = vi.fn();
    const { createWorkoutCandidatesHandler } = await loadRouteHandler(generateWorkoutCandidates);
    const enforceWorkoutGenAccess = vi.fn(async () => null);
    const handler = createWorkoutCandidatesHandler({
      enforceWorkoutGenAccess,
      safeWorkoutBuilderDetails: err => err.message,
    });
    const res = createRes();

    await handler({ body: { clientId: '42abc' }, user: { id: 7 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Valid clientId is required' });
    expect(enforceWorkoutGenAccess).not.toHaveBeenCalled();
    expect(generateWorkoutCandidates).not.toHaveBeenCalled();
  });

  it('rejects invalid equipment profile ids at the route boundary', async () => {
    const generateWorkoutCandidates = vi.fn();
    const { createWorkoutCandidatesHandler } = await loadRouteHandler(generateWorkoutCandidates);
    const handler = createWorkoutCandidatesHandler({
      enforceWorkoutGenAccess: vi.fn(async () => null),
      safeWorkoutBuilderDetails: err => err.message,
    });
    const res = createRes();

    await handler({ body: { clientId: '42', equipmentProfileId: 'abc' }, user: { id: 7 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Valid equipmentProfileId is required when provided',
    });
    expect(generateWorkoutCandidates).not.toHaveBeenCalled();
  });
});