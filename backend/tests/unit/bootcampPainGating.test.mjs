/**
 * Cortex P0 Safety Truth — bootcamp pain-aware gating regression tests.
 *
 * Directive: docs/ai-workflow/AI-HANDOFF/SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12.md §5.5
 * Eval-suite test 6: a severe-pain-flagged movement cannot land on Board 1 unmodified.
 *
 * Also locks the two verified production defects:
 *  - the pain query filtered on a `status` column that does not exist on
 *    ClientPainEntry (model has `isActive`) — every call threw into a silent
 *    catch, so painAlerts was permanently empty in production;
 *  - the roster was `createdById: trainerId` (entries the trainer AUTHORED),
 *    not the trainer's active clients.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  painFindAll: vi.fn(),
  assignmentFindAll: vi.fn(),
  getModel: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getClientPainEntry: () => ({ findAll: mocks.painFindAll }),
  getModel: mocks.getModel,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: mocks.loggerWarn },
}));

const { applyPainAwareGating } = await import('../../services/bootcamp/painAwareGating.mjs');

function mainExercise(overrides = {}) {
  return {
    exerciseName: 'Jump Squat',
    muscleTargets: 'Quadriceps, Glutes',
    board: 'main',
    kneeMod: 'Box Squat to Bench',
    easyVariation: 'Bodyweight Squat',
    ...overrides,
  };
}

describe('bootcamp applyPainAwareGating (Cortex P0 §5.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModel.mockReturnValue({ findAll: mocks.assignmentFindAll });
    mocks.assignmentFindAll.mockResolvedValue([{ clientId: 101 }, { clientId: 102 }]);
    mocks.painFindAll.mockResolvedValue([]);
  });

  it('queries isActive (NOT the nonexistent status column) scoped to the active-client roster', async () => {
    await applyPainAwareGating({ trainerId: 7, allExercises: [mainExercise()], explanations: [] });

    const where = mocks.painFindAll.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where).not.toHaveProperty('status');
    expect(where).not.toHaveProperty('createdById');
    expect(where.userId).toBeDefined();
    expect(mocks.assignmentFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { trainerId: 7, status: 'active' },
    }));
  });

  it('test 6: severe pain (>=7) auto-routes the flagged Board-1 exercise to its region-matched alternative', async () => {
    mocks.painFindAll.mockResolvedValue([
      { bodyRegion: 'left_knee', side: 'left', painLevel: 8, painType: 'sharp', userId: 101 },
    ]);
    const ex = mainExercise();
    const explanations = [];

    const alerts = await applyPainAwareGating({ trainerId: 7, allExercises: [ex], explanations });

    expect(ex.exerciseName).toBe('Box Squat to Bench');
    expect(ex.painSwap).toEqual(expect.objectContaining({ from: 'Jump Squat', region: 'left_knee', severity: 8 }));
    expect(alerts[0]).toEqual(expect.objectContaining({
      region: 'left_knee',
      severity: 8,
      swappedExercises: ['Box Squat to Bench'],
    }));
    expect(explanations.some(e => e.type === 'pain_alert')).toBe(true);
  });

  it('severe pain with NO available alternative marks the exercise CAUTION instead of leaving it silently unmodified', async () => {
    mocks.painFindAll.mockResolvedValue([
      { bodyRegion: 'left_knee', side: 'left', painLevel: 9, painType: 'sharp', userId: 101 },
    ]);
    const ex = mainExercise({ kneeMod: null, easyVariation: null });
    const alerts = await applyPainAwareGating({ trainerId: 7, allExercises: [ex], explanations: [] });

    expect(ex.exerciseName).toBe('Jump Squat');
    expect(ex.painCaution).toEqual(expect.objectContaining({ region: 'left_knee', severity: 9 }));
    expect(alerts[0].cautionExercises).toEqual(['Jump Squat']);
  });

  it('moderate pain (5-6) annotates with a Board 2/3 recommendation without swapping', async () => {
    mocks.painFindAll.mockResolvedValue([
      { bodyRegion: 'left_knee', side: 'left', painLevel: 5, painType: 'aching', userId: 102 },
    ]);
    const ex = mainExercise();
    const alerts = await applyPainAwareGating({ trainerId: 7, allExercises: [ex], explanations: [] });

    expect(ex.exerciseName).toBe('Jump Squat');
    expect(ex.painSwap).toBeUndefined();
    expect(alerts[0].recommendation).toMatch(/Board 2|Board 3/);
  });

  it('privacy: alerts never carry userId or participant identity', async () => {
    mocks.painFindAll.mockResolvedValue([
      { bodyRegion: 'left_knee', side: 'left', painLevel: 8, painType: 'sharp', userId: 101 },
    ]);
    const explanations = [];
    const alerts = await applyPainAwareGating({ trainerId: 7, allExercises: [mainExercise()], explanations });

    const serialized = JSON.stringify({ alerts, explanations });
    expect(serialized).not.toMatch(/userId|101|102/);
  });

  it('failure is VISIBLE: a query error produces a pain_alert_unavailable explanation, never silence', async () => {
    mocks.painFindAll.mockRejectedValue(new Error('column does not exist'));
    const explanations = [];

    const alerts = await applyPainAwareGating({ trainerId: 7, allExercises: [mainExercise()], explanations });

    expect(alerts).toEqual([]);
    expect(explanations).toEqual([
      expect.objectContaining({ type: 'pain_alert_unavailable' }),
    ]);
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });

  it('roster unavailable → falls back to trainer-authored entries with an honest scope label', async () => {
    mocks.getModel.mockReturnValue(null);
    mocks.painFindAll.mockResolvedValue([
      { bodyRegion: 'left_knee', side: 'left', painLevel: 5, painType: 'aching', userId: 101 },
    ]);
    const explanations = [];

    await applyPainAwareGating({ trainerId: 7, allExercises: [mainExercise()], explanations });

    const where = mocks.painFindAll.mock.calls[0][0].where;
    expect(where.createdById).toBe(7);
    expect(explanations[0].message).toMatch(/roster unavailable/i);
  });
});
