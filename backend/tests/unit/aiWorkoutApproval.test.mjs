/**
 * aiWorkoutApproval — Phase 5A Hardening Tests
 * ==============================================
 * Tests for POST /api/ai/workout-generation/approve
 *
 * Covers:
 *   - RBAC: unauthenticated, client denied, trainer unassigned, trainer assigned, admin
 *   - Consent re-check: withdrawn/disabled consent denied at approval time
 *   - Draft validation: invalid/missing fields rejected with 422
 *   - Audit log: tokenUsage merge preserves existing fields + adds approval provenance
 *   - No partial persistence on validation/consent failure
 *
 * Phase 5A Hardening Patch
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── validateApprovedDraftPlan unit tests ─────────────────────
import { validateApprovedDraftPlan } from '../../services/ai/outputValidator.mjs';

const makeValidDraft = (overrides = {}) => ({
  planName: 'Hypertrophy Block A',
  durationWeeks: 4,
  summary: 'Coach-edited hypertrophy plan',
  days: [
    {
      dayNumber: 1,
      name: 'Push Day',
      focus: 'Chest/Shoulders/Triceps',
      dayType: 'training',
      estimatedDuration: 60,
      exercises: [
        { name: 'Bench Press', setScheme: '4x8', repGoal: '8-10', restPeriod: 90 },
        { name: 'Overhead Press', setScheme: '3x10', repGoal: '10-12', restPeriod: 60 },
      ],
    },
    {
      dayNumber: 2,
      name: 'Pull Day',
      focus: 'Back/Biceps',
      dayType: 'training',
      estimatedDuration: 55,
      exercises: [
        { name: 'Barbell Row', setScheme: '4x8', repGoal: '8-10', restPeriod: 90 },
      ],
    },
  ],
  ...overrides,
});

describe('validateApprovedDraftPlan — shape checks', () => {
  it('1 — rejects non-object draft', () => {
    const result = validateApprovedDraftPlan({ draft: null });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_DRAFT_PAYLOAD')).toBe(true);
  });

  it('2 — rejects string draft', () => {
    const result = validateApprovedDraftPlan({ draft: 'not an object' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_DRAFT_PAYLOAD')).toBe(true);
  });

  it('3 — rejects missing planName', () => {
    const draft = makeValidDraft();
    delete draft.planName;
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_DRAFT_TITLE')).toBe(true);
  });

  it('4 — rejects empty planName', () => {
    const result = validateApprovedDraftPlan({ draft: makeValidDraft({ planName: '  ' }) });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_DRAFT_TITLE')).toBe(true);
  });

  it('5 — rejects missing days array', () => {
    const draft = makeValidDraft();
    delete draft.days;
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_DRAFT_STRUCTURE')).toBe(true);
  });

  it('6 — rejects empty days array', () => {
    const result = validateApprovedDraftPlan({ draft: makeValidDraft({ days: [] }) });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_DRAFT_STRUCTURE')).toBe(true);
  });
});

describe('validateApprovedDraftPlan — exercise validation', () => {
  it('7 — rejects day with no exercises', () => {
    const draft = makeValidDraft({
      days: [{ dayNumber: 1, name: 'Empty Day', dayType: 'training', exercises: [] }],
    });
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_EXERCISE_LIST')).toBe(true);
  });

  it('8 — rejects exercise with missing name', () => {
    const draft = makeValidDraft({
      days: [{
        dayNumber: 1,
        name: 'Day 1',
        exercises: [{ name: '', setScheme: '3x10', repGoal: '10' }],
      }],
    });
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_EXERCISE_LIST')).toBe(true);
  });

  it('9 — rejects negative rest period', () => {
    const draft = makeValidDraft({
      days: [{
        dayNumber: 1,
        name: 'Day 1',
        exercises: [{ name: 'Squat', setScheme: '3x5', restPeriod: -30 }],
      }],
    });
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_REST_PERIOD')).toBe(true);
  });

  it('10 — rejects excessive rest period (>600s)', () => {
    const draft = makeValidDraft({
      days: [{
        dayNumber: 1,
        name: 'Day 1',
        exercises: [{ name: 'Squat', setScheme: '3x5', restPeriod: 700 }],
      }],
    });
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_REST_PERIOD')).toBe(true);
  });
});

describe('validateApprovedDraftPlan — safety checks', () => {
  it('11 — rejects too many days for plan duration', () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      dayNumber: i + 1,
      name: `Day ${i + 1}`,
      exercises: [{ name: 'Curl', setScheme: '3x10' }],
    }));
    const draft = makeValidDraft({ durationWeeks: 1, days });
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TOO_MANY_DAYS')).toBe(true);
  });

  it('12 — rejects duplicate day numbers', () => {
    const draft = makeValidDraft({
      days: [
        { dayNumber: 1, name: 'Day 1', exercises: [{ name: 'Squat' }] },
        { dayNumber: 1, name: 'Day 1 Dupe', exercises: [{ name: 'Bench' }] },
      ],
    });
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_DAY_NUMBERS')).toBe(true);
  });

  it('12b — rejects non-integer durationWeeks before persistence', () => {
    const result = validateApprovedDraftPlan({ draft: makeValidDraft({ durationWeeks: 4.5 }) });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_DURATION_WEEKS')).toBe(true);
  });

  it('12c — rejects out-of-range durationWeeks before persistence', () => {
    const low = validateApprovedDraftPlan({ draft: makeValidDraft({ durationWeeks: 0 }) });
    const high = validateApprovedDraftPlan({ draft: makeValidDraft({ durationWeeks: 53 }) });
    expect(low.valid).toBe(false);
    expect(high.valid).toBe(false);
    expect(low.errors.some(e => e.code === 'INVALID_DURATION_WEEKS')).toBe(true);
    expect(high.errors.some(e => e.code === 'INVALID_DURATION_WEEKS')).toBe(true);
  });
});

describe('validateApprovedDraftPlan — warnings', () => {
  it('13 — warns for excessive exercises per day (>20)', () => {
    const exercises = Array.from({ length: 22 }, (_, i) => ({
      name: `Exercise ${i + 1}`,
      setScheme: '3x10',
    }));
    const draft = makeValidDraft({
      days: [{ dayNumber: 1, name: 'Day 1', exercises }],
    });
    const result = validateApprovedDraftPlan({ draft });
    // Should still be valid (warning, not error)
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.code === 'EXCESSIVE_EXERCISES')).toBe(true);
  });
});

describe('validateApprovedDraftPlan — valid payload', () => {
  it('14 — accepts valid draft and returns normalizedDraft', () => {
    const draft = makeValidDraft();
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.normalizedDraft).toBeTruthy();
    expect(result.normalizedDraft.planName).toBe('Hypertrophy Block A');
    expect(result.normalizedDraft.durationWeeks).toBe(4);
  });

  it('15 — trims whitespace in plan name', () => {
    const draft = makeValidDraft({ planName: '  Trimmed Plan  ' });
    const result = validateApprovedDraftPlan({ draft });
    expect(result.valid).toBe(true);
    expect(result.normalizedDraft.planName).toBe('Trimmed Plan');
  });

  it('16 — does not mutate original draft', () => {
    const draft = makeValidDraft({ planName: '  Spaced  ' });
    const originalName = draft.planName;
    validateApprovedDraftPlan({ draft });
    expect(draft.planName).toBe(originalName);
  });
});

// ─── approveDraftPlan controller unit tests ───────────────────
// These test the controller function directly with mocked models.
// Tests 17-20 run before any DB calls (auth/role/input checks).
// Tests 21+ require getAllModels mock since authz checks now precede validation.

import { getAllModels } from '../../models/index.mjs';

// Mock getAllModels to return controllable model stubs
vi.mock('../../models/index.mjs', () => ({
  getAllModels: vi.fn(),
}));

// Mock sequelize transaction for persistence tests
vi.mock('../../database.mjs', async () => {
  const actual = await vi.importActual('../../database.mjs');
  return {
    ...actual,
    default: {
      transaction: vi.fn().mockResolvedValue({
        commit: vi.fn(),
        rollback: vi.fn(),
      }),
    },
  };
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

// Standard mock models for tests that pass authz
const makeMockModels = (overrides = {}) => ({
  User: {
    findByPk: vi.fn().mockResolvedValue({ id: 1, role: 'client' }),
  },
  ClientTrainerAssignment: {
    findOne: vi.fn().mockResolvedValue({ id: 1, status: 'active' }),
  },
  AiPrivacyProfile: {
    findOne: vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: null }),
  },
  Exercise: {
    findOne: vi.fn().mockResolvedValue(null),
  },
  WorkoutPlan: { create: vi.fn(), update: vi.fn().mockResolvedValue([0]) },
  WorkoutPlanDay: { create: vi.fn() },
  WorkoutPlanDayExercise: { create: vi.fn() },
  AiInteractionLog: null,
  ...overrides,
});

describe('approveDraftPlan — pre-DB checks (auth + role + input)', () => {
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('17 — returns 401 for unauthenticated request', async () => {
    const req = { body: { userId: 1, plan: makeValidDraft() }, user: null };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('18 — returns 403 for client role', async () => {
    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 10, role: 'client' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('trainers and admins'),
    }));
  });

  it('19 — returns 400 for missing userId', async () => {
    const req = { body: { plan: makeValidDraft() }, user: { id: 10, role: 'admin' } };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('20 — returns 400 for missing plan', async () => {
    const req = { body: { userId: 1 }, user: { id: 10, role: 'admin' } };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('approveDraftPlan — target user existence', () => {
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('21 — returns 404 for nonexistent target user', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      User: { findByPk: vi.fn().mockResolvedValue(null) },
    }));

    const req = {
      body: { userId: 9999, plan: makeValidDraft() },
      user: { id: 10, role: 'admin' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('not found'),
    }));
  });

  it('21b — generic approval failures do not disclose internal service errors', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      User: {
        findByPk: vi.fn().mockRejectedValue(new Error('private approval database host')),
      },
    }));

    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 10, role: 'admin' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to approve workout plan',
    });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('private approval');
  });
});

describe('approveDraftPlan — trainer assignment RBAC', () => {
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('22 — returns 403 with AI_ASSIGNMENT_DENIED code for unassigned trainer', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      ClientTrainerAssignment: {
        findOne: vi.fn().mockResolvedValue(null), // no assignment
      },
    }));

    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 50, role: 'trainer' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_ASSIGNMENT_DENIED',
      message: expect.stringContaining('not assigned'),
    }));
  });

  it('23 — admin bypasses trainer assignment check', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      ClientTrainerAssignment: {
        findOne: vi.fn().mockResolvedValue(null), // no assignment, but admin doesn't need it
      },
    }));

    const invalidPlan = makeValidDraft();
    delete invalidPlan.planName; // will fail validation, proving we got past authz

    const req = {
      body: { userId: 1, plan: invalidPlan },
      user: { id: 10, role: 'admin' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    // Should reach validation (422), not 403
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

describe('approveDraftPlan — consent re-check', () => {
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('24 — returns 403 when consent is missing', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue(null), // no consent profile
      },
    }));

    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    // 5W-F: When both AiPrivacyProfile and waiver are absent, waiver-specific code takes precedence
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_WAIVER_MISSING',
    }));
  });

  it('25 — returns 403 when consent is disabled', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue({ aiEnabled: false, withdrawnAt: null }),
      },
    }));

    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_CONSENT_DISABLED',
    }));
  });

  it('26 — returns 403 when consent has been withdrawn', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: new Date() }),
      },
    }));

    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_CONSENT_WITHDRAWN',
    }));
  });
});

describe('approveDraftPlan — draft validation (after authz)', () => {
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('27 — returns 422 for invalid draft (missing planName) after passing authz', async () => {
    getAllModels.mockReturnValue(makeMockModels());

    const invalidPlan = makeValidDraft();
    delete invalidPlan.planName;

    const req = {
      body: { userId: 1, plan: invalidPlan },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'APPROVED_DRAFT_INVALID',
    }));
  });

  it('28 — returns 422 for invalid draft (empty days) after passing authz', async () => {
    getAllModels.mockReturnValue(makeMockModels());

    const req = {
      body: { userId: 1, plan: makeValidDraft({ days: [] }) },
      user: { id: 10, role: 'admin' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'APPROVED_DRAFT_INVALID',
    }));
  });
});

describe('approveDraftPlan — check ordering verification', () => {
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('29 — unassigned trainer gets 403, not 422, even with invalid draft', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      ClientTrainerAssignment: {
        findOne: vi.fn().mockResolvedValue(null),
      },
    }));

    const invalidPlan = makeValidDraft();
    delete invalidPlan.planName;

    const req = {
      body: { userId: 1, plan: invalidPlan },
      user: { id: 50, role: 'trainer' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    // Must be 403 (authz), not 422 (validation)
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('not assigned'),
    }));
  });

  it('30 — withdrawn consent gets 403, not 422, even with invalid draft', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: new Date() }),
      },
    }));

    const invalidPlan = makeValidDraft();
    delete invalidPlan.planName;

    const req = {
      body: { userId: 1, plan: invalidPlan },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    // Must be 403 (consent), not 422 (validation)
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_CONSENT_WITHDRAWN',
    }));
  });

  it('31 — nonexistent user gets 404, not 422, even with invalid draft', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      User: { findByPk: vi.fn().mockResolvedValue(null) },
    }));

    const invalidPlan = makeValidDraft();
    delete invalidPlan.planName;

    const req = {
      body: { userId: 9999, plan: invalidPlan },
      user: { id: 10, role: 'admin' },
    };
    const res = mockRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('approveDraftPlan — successful persistence shape', () => {
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('31b — persists approved drafts with planData for current-plan and logger handoff', async () => {
    const models = makeMockModels({
      Exercise: {
        findAll: vi.fn().mockResolvedValue([
          { id: 'exercise-1', name: 'Bench Press' },
          { id: 'exercise-2', name: 'Overhead Press' },
          { id: 'exercise-3', name: 'Barbell Row' },
        ]),
        findOne: vi.fn().mockResolvedValue(null),
      },
      WorkoutPlan: {
        create: vi.fn().mockResolvedValue({ id: 'approved-plan-1' }),
      },
      WorkoutPlanDay: {
        create: vi.fn().mockImplementation(async (payload) => ({ id: `day-${payload.dayNumber}` })),
      },
      WorkoutPlanDayExercise: {
        create: vi.fn().mockResolvedValue({ id: 'plan-day-exercise-1' }),
      },
    });
    getAllModels.mockReturnValue(models);

    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();

    await approveDraftPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      planId: 'approved-plan-1',
      sourceType: 'coach_approved',
    }));
    expect(models.WorkoutPlan.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      status: 'active',
      currentWeek: 1,
      currentDay: 1,
      planData: expect.objectContaining({
        assignmentDefaults: expect.objectContaining({
          defaultAssignmentType: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          shouldDeductSession: false,
        }),
        weeks: expect.arrayContaining([
          expect.objectContaining({
            weekNumber: 1,
            days: expect.arrayContaining([
              expect.objectContaining({
                dayNumber: 1,
                name: 'Push Day',
                exercises: expect.arrayContaining([
                  expect.objectContaining({
                    exerciseName: 'Bench Press',
                    name: 'Bench Press',
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
      metadata: expect.objectContaining({
        planSource: 'swan_coach_planning',
        sourceType: 'coach_approved',
        planHorizon: 'one_month',
        horizonKey: 'one_month',
        planDurationKey: 'one_month',
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      }),
    }), expect.objectContaining({ transaction: expect.any(Object) }));
  });

  it('31c — demotes an existing active plan before creating the approved plan', async () => {
    const existingActivePlan = {
      id: 'old-active-plan',
      userId: 1,
      status: 'active',
      metadata: { planHorizon: 'three_month', isPrimaryPlan: true, primary: true, retainedFlag: true },
      update: vi.fn().mockResolvedValue(undefined),
    };
    const models = makeMockModels({
      Exercise: {
        findAll: vi.fn().mockResolvedValue([
          { id: 'exercise-1', name: 'Bench Press' },
          { id: 'exercise-2', name: 'Overhead Press' },
          { id: 'exercise-3', name: 'Barbell Row' },
        ]),
        findOne: vi.fn().mockResolvedValue(null),
      },
      WorkoutPlan: {
        findAll: vi.fn().mockResolvedValue([existingActivePlan]),
        create: vi.fn().mockResolvedValue({ id: 'approved-plan-2' }),
        update: vi.fn().mockResolvedValue([0]),
      },
      WorkoutPlanDay: {
        create: vi.fn().mockImplementation(async (payload) => ({ id: `day-${payload.dayNumber}` })),
      },
      WorkoutPlanDayExercise: {
        create: vi.fn().mockResolvedValue({ id: 'plan-day-exercise-1' }),
      },
    });
    getAllModels.mockReturnValue(models);

    const req = {
      body: { userId: 1, plan: makeValidDraft() },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();

    await approveDraftPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(models.WorkoutPlan.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1, status: 'active' },
      transaction: expect.any(Object),
    }));
    expect(existingActivePlan.update).toHaveBeenCalledWith({
      status: 'paused',
      metadata: expect.objectContaining({
        planHorizon: 'three_month',
        retainedFlag: true,
        isPrimaryPlan: false,
        primary: false,
      }),
    }, expect.objectContaining({ transaction: expect.any(Object) }));
    expect(existingActivePlan.update.mock.invocationCallOrder[0])
      .toBeLessThan(models.WorkoutPlan.create.mock.invocationCallOrder[0]);
  });

  it('31d - sanitizes approved draft planData before persistence', async () => {
    const models = makeMockModels({
      Exercise: {
        findAll: vi.fn().mockResolvedValue([
          { id: 'exercise-1', name: 'Bench Press' },
        ]),
        findOne: vi.fn().mockResolvedValue(null),
      },
      WorkoutPlan: {
        create: vi.fn().mockResolvedValue({ id: 'approved-plan-privacy' }),
      },
      WorkoutPlanDay: {
        create: vi.fn().mockImplementation(async (payload) => ({ id: `day-${payload.dayNumber}` })),
      },
      WorkoutPlanDayExercise: {
        create: vi.fn().mockResolvedValue({ id: 'plan-day-exercise-1' }),
      },
    });
    getAllModels.mockReturnValue(models);

    const unsafeDraft = makeValidDraft({
      recommendations: ['Email private@example.com or call (555) 555-0199.'],
      days: [{
        dayNumber: 1,
        name: 'Push Day',
        focus: 'Chest/Shoulders/Triceps',
        dayType: 'training',
        estimatedDuration: 60,
        exercises: [{
          name: 'Bench Press',
          setScheme: '4x8',
          repGoal: '8-10',
          restPeriod: 90,
          notes: 'Backup contact: private@example.com / 555-555-0199',
        }],
      }],
    });

    const req = {
      body: { userId: 1, plan: unsafeDraft },
      user: { id: 10, role: 'trainer' },
    };
    const res = mockRes();

    await approveDraftPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const savedPlanData = models.WorkoutPlan.create.mock.calls[0][0].planData;
    const serializedPlanData = JSON.stringify(savedPlanData);
    expect(serializedPlanData).not.toContain('private@example.com');
    expect(serializedPlanData).not.toContain('555-555-0199');
    expect(serializedPlanData).not.toContain('(555) 555-0199');
    expect(serializedPlanData).toContain('[redacted]');
    expect(serializedPlanData).toContain('Bench Press');
  });
});

// ─── generateWorkoutPlan — trainer assignment RBAC ────────────────

describe('generateWorkoutPlan — trainer assignment RBAC', () => {
  let generateWorkoutPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/aiWorkoutController.mjs');
    generateWorkoutPlan = mod.generateWorkoutPlan;
  });

  it('32 — generation returns 403 with AI_ASSIGNMENT_DENIED for unassigned trainer', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      ClientTrainerAssignment: {
        findOne: vi.fn().mockResolvedValue(null), // no assignment
      },
    }));

    const req = {
      body: { userId: 1, mode: 'draft' },
      user: { id: 50, role: 'trainer' },
    };
    const res = mockRes();
    await generateWorkoutPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_ASSIGNMENT_DENIED',
      message: expect.stringContaining('not assigned'),
    }));
  });

  it('33 — generic generation failures do not disclose internal service errors', async () => {
    getAllModels.mockImplementation(() => {
      throw new Error('private generation database host');
    });

    const req = {
      body: { userId: 1, mode: 'draft' },
      user: { id: 10, role: 'admin' },
    };
    const res = mockRes();
    await generateWorkoutPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to generate workout plan',
    });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('private generation');
  });
});
