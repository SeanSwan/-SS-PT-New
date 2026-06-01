import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher(createdBaseline = {}, questionnaire = null, users = [], userRecord = null) {
  vi.resetModules();

  const create = vi.fn(async (payload) => ({ id: 501, ...payload, ...createdBaseline }));
  const createQuestionnaire = vi.fn(async (payload) => ({ id: 801, ...payload }));
  const findQuestionnaire = vi.fn(async () => questionnaire);
  const findBaseline = vi.fn(async () => (
    Object.keys(createdBaseline).length ? { id: 601, ...createdBaseline } : null
  ));
  const findAndCountAll = vi.fn(async () => ({ count: users.length, rows: users }));
  const findByPk = vi.fn(async () => userRecord);
  const User = { findAndCountAll, findByPk };
  const ClientBaselineMeasurements = { create };
  const ClientOnboardingQuestionnaire = { create: createQuestionnaire, findOne: findQuestionnaire };
  ClientBaselineMeasurements.findOne = findBaseline;
  const Package = {};
  const WorkoutSession = {};
  const WorkoutLog = {};

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      User,
      ClientBaselineMeasurements,
      ClientOnboardingQuestionnaire,
      Package,
      WorkoutSession,
      WorkoutLog,
    }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    create,
    createQuestionnaire,
    findQuestionnaire,
    findBaseline,
    findAndCountAll,
    findByPk,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('Swan Coach onboarding command dispatchers', () => {
  it('wires fill_baseline_measurements to canonical baseline fields', async () => {
    const { dispatch, hasDispatcher, create } = await loadDispatcher();

    expect(hasDispatcher('fill_baseline_measurements')).toBe(true);

    const result = await dispatch('fill_baseline_measurements', {
      clientId: 42,
      weight: 187.5,
      bodyFat: 18,
      restingHeartRate: 62,
      bloodPressure: '118/76',
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      recordedBy: 7,
      bodyWeight: 187.5,
      bodyFatPercentage: 18,
      restingHeartRate: 62,
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 76,
    }));
    expect(result).toEqual({
      baselineId: 501,
      clientId: 42,
      bodyWeight: 187.5,
      bodyFatPercentage: 18,
      restingHeartRate: 62,
      bloodPressure: '118/76',
    });
  });

  it('wires view_onboarding_status to latest questionnaire progress', async () => {
    const updatedAt = new Date('2026-05-31T18:30:00.000Z');
    const { dispatch, hasDispatcher, findQuestionnaire, findBaseline } = await loadDispatcher(
      { nasmAssessmentScore: 82 },
      {
        id: 901,
        userId: 42,
        status: 'completed',
        responsesJson: {
          fullName: 'Ava',
          email: 'ava@example.test',
          primaryGoal: 'strength',
          currentWeight: 187,
        },
        primaryGoal: 'strength',
        trainingTier: 'Elite',
        healthRisk: 'low',
        updatedAt,
        createdAt: new Date('2026-05-30T18:30:00.000Z'),
      },
    );

    expect(hasDispatcher('view_onboarding_status')).toBe(true);

    const result = await dispatch('view_onboarding_status', {
      clientId: 42,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(findQuestionnaire).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: [['createdAt', 'DESC']],
    });
    expect(findBaseline).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: [['takenAt', 'DESC']],
    });
    expect(result).toEqual({
      clientId: 42,
      questionnaireId: 901,
      status: 'completed',
      completionPercentage: 5,
      primaryGoal: 'strength',
      trainingTier: 'Elite',
      healthRisk: 'low',
      movementScreenStatus: 'completed',
      baselineRecorded: true,
      lastUpdatedAt: '2026-05-31',
    });
  });

  it('wires view_orientation_queue to a client-safe onboarding summary', async () => {
    const users = [
      {
        id: 100,
        questionnaires: [{ status: 'completed', completionPercentage: 100, primaryGoal: 'strength' }],
        baselineMeasurements: [{ nasmAssessmentScore: 84 }],
        packages: [{ status: 'active', name: 'Swan Studios' }],
      },
      {
        id: 101,
        questionnaires: [{ status: 'in_progress', completionPercentage: 35, primaryGoal: 'fat_loss' }],
        baselineMeasurements: [],
        packages: [],
      },
      {
        id: 102,
        questionnaires: [],
        baselineMeasurements: [],
        packages: [],
      },
    ];
    const { dispatch, hasDispatcher, findAndCountAll } = await loadDispatcher({}, null, users);

    expect(hasDispatcher('view_orientation_queue')).toBe(true);

    const result = await dispatch('view_orientation_queue', {
      limit: 10,
    }, {
      user: { id: 7, role: 'trainer' },
    });

    expect(findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      offset: 0,
      distinct: true,
    }));
    expect(result).toEqual({
      totalCount: 3,
      returnedCount: 3,
      completeCount: 1,
      draftCount: 1,
      notStartedCount: 1,
      archivedCount: 0,
      movementPendingCount: 2,
      firstActionClientId: 101,
      page: 1,
      limit: 10,
    });
  });

  it('wires start_onboarding without overwriting an existing questionnaire', async () => {
    const existingQuestionnaire = {
      id: 702,
      userId: 42,
      status: 'completed',
      responsesJson: { fullName: 'Ava', email: 'ava@example.test', primaryGoal: 'strength' },
      createdAt: new Date('2026-05-30T18:30:00.000Z'),
    };
    const { dispatch, hasDispatcher, createQuestionnaire, findQuestionnaire } = await loadDispatcher(
      {},
      existingQuestionnaire,
    );

    expect(hasDispatcher('start_onboarding')).toBe(true);

    const result = await dispatch('start_onboarding', {
      clientId: 42,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(findQuestionnaire).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: [['createdAt', 'DESC']],
    });
    expect(createQuestionnaire).not.toHaveBeenCalled();
    expect(result).toEqual({
      clientId: 42,
      questionnaireId: 702,
      status: 'completed',
      alreadyStarted: true,
      completionPercentage: 4,
    });
  });

  it('creates an in-progress questionnaire when start_onboarding has no existing draft', async () => {
    const { dispatch, createQuestionnaire } = await loadDispatcher();

    const result = await dispatch('start_onboarding', {
      clientId: 42,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(createQuestionnaire).toHaveBeenCalledWith({
      userId: 42,
      createdBy: 7,
      questionnaireVersion: '3.0',
      status: 'in_progress',
      responsesJson: {},
    });
    expect(result).toEqual({
      clientId: 42,
      questionnaireId: 801,
      status: 'in_progress',
      alreadyStarted: false,
      completionPercentage: 0,
    });
  });

  it('wires submit_onboarding to complete questionnaire and user master prompt', async () => {
    const updateQuestionnaire = vi.fn(async (payload) => payload);
    const updateUser = vi.fn(async (payload) => payload);
    const questionnaire = {
      id: 901,
      userId: 42,
      status: 'in_progress',
      responsesJson: {
        fullName: 'Ava Strong',
        email: 'ava@example.test',
        primaryGoal: 'strength',
        currentWeight: '187',
        heightFeet: '5',
        heightInches: '10',
        phone: '555-0100',
        gender: 'female',
      },
      update: updateQuestionnaire,
    };
    const userRecord = {
      id: 42,
      phone: null,
      gender: null,
      weight: null,
      height: null,
      fitnessGoal: null,
      update: updateUser,
    };
    const { dispatch, hasDispatcher, findByPk } = await loadDispatcher(
      {},
      questionnaire,
      [],
      userRecord,
    );

    expect(hasDispatcher('submit_onboarding')).toBe(true);

    const result = await dispatch('submit_onboarding', {
      clientId: 42,
      status: 'submitted',
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42, firstName: 'Ava' },
    });

    expect(updateQuestionnaire).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      primaryGoal: 'strength',
      completedAt: expect.any(Date),
    }));
    expect(findByPk).toHaveBeenCalledWith(42);
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({
      spiritName: 'Client #42',
      isOnboardingComplete: true,
      phone: '555-0100',
      gender: 'female',
      weight: 187,
      height: 70,
      fitnessGoal: 'strength',
    }));
    expect(result).toMatchObject({
      clientId: 42,
      questionnaireId: 901,
      status: 'completed',
      submitted: true,
      masterPromptCreated: true,
    });
  });
});
