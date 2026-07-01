import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const emptyFindAll = vi.fn();
  const emptyFindOne = vi.fn();
  const userFindByPk = vi.fn();
  const baselineFindOne = vi.fn();
  const onboardingFindOne = vi.fn();
  const query = vi.fn();
  const trainingVault = vi.fn();
  const programPlanFindOne = vi.fn();

  const emptyModel = { findAll: emptyFindAll, findOne: emptyFindOne, count: vi.fn() };

  return {
    emptyFindAll,
    emptyFindOne,
    userFindByPk,
    baselineFindOne,
    onboardingFindOne,
    query,
    trainingVault,
    programPlanFindOne,
    emptyModel,
  };
});

vi.mock('../../database.mjs', () => ({
  default: {
    QueryTypes: { SELECT: 'SELECT' },
    query: mocks.query,
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../services/clientTrainingVaultContextService.mjs', () => ({
  buildClientTrainingVaultContext: mocks.trainingVault,
}));

vi.mock('../../models/index.mjs', () => {
  const optionalModels = {
    ClientBaselineMeasurements: { findOne: mocks.baselineFindOne },
    ClientOnboardingQuestionnaire: { findOne: mocks.onboardingFindOne },
    ClientNutritionPlan: { findOne: mocks.emptyFindOne },
    Streak: { findOne: mocks.emptyFindOne },
    WorkoutPlan: mocks.emptyModel,
    DailyWorkoutForm: mocks.emptyModel,
  };

  return {
    getClientPainEntry: () => mocks.emptyModel,
    getFormAnalysis: () => mocks.emptyModel,
    getMovementProfile: () => mocks.emptyModel,
    getEquipmentProfile: () => mocks.emptyModel,
    getEquipmentItem: () => mocks.emptyModel,
    getVariationLog: () => mocks.emptyModel,
    getCustomExercise: () => mocks.emptyModel,
    getDailyWorkoutForm: () => mocks.emptyModel,
    getWorkoutSession: () => mocks.emptyModel,
    getUser: () => ({ findByPk: mocks.userFindByPk }),
    getOrder: () => mocks.emptyModel,
    getOrderItem: () => mocks.emptyModel,
    getStorefrontItem: () => mocks.emptyModel,
    getGoal: () => mocks.emptyModel,
    getClientProgress: () => mocks.emptyModel,
    getBodyMeasurement: () => mocks.emptyModel,
    getLongTermProgramPlan: () => ({ findOne: mocks.programPlanFindOne }),
    getModel: (name) => optionalModels[name] || null,
    Op: { gte: 'gte' },
  };
});

const { getClientContext } = await import('../../services/clientIntelligenceService.mjs');

describe('clientIntelligenceService planning context', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.emptyFindAll.mockResolvedValue([]);
    mocks.emptyFindOne.mockResolvedValue(null);
    mocks.query.mockResolvedValue([]);
    mocks.trainingVault.mockResolvedValue({
      available: true,
      filledHorizonKeys: ['six_month'],
      slots: [{ horizonKey: 'six_month', isFilled: true }],
    });
    mocks.programPlanFindOne.mockResolvedValue({
      id: 'program-42',
      horizonMonths: 6,
      goalProfile: { primaryGoal: 'strength' },
      status: 'active',
      sourceType: 'ai_assisted',
    });
    mocks.userFindByPk.mockImplementation(async (id) => {
      if (Number(id) === 99) return { id: 99, role: 'admin' };
      return {
        id: 42,
        firstName: 'Jane',
        lastName: 'Private',
        email: 'jane.private@example.test',
        role: 'client',
        fitnessGoal: 'strength',
        trainingExperience: 'beginner',
        clientSource: ' Move Fitness ',
        healthConcerns: 'Prior knee surgery. Avoid raw note leakage.',
      };
    });
    mocks.baselineFindOne.mockResolvedValue({
      benchPressWeight: 95,
      benchPressReps: 6,
      squatWeight: null,
      squatReps: null,
      deadliftWeight: null,
      deadliftReps: null,
      overheadPressWeight: null,
      overheadPressReps: null,
      pullUpsReps: null,
      plankDuration: null,
      nasmAssessmentScore: 55,
      correctiveExerciseStrategy: null,
      parqScreening: { medicalClearanceRequired: true },
      medicalClearanceRequired: true,
    });
    mocks.onboardingFindOne.mockResolvedValue({
      primaryGoal: 'strength',
      commitmentLevel: 7,
      trainingTier: 'premium',
      healthRisk: 'high',
      responsesJson: {
        section4_health: {
          pregnancyPostpartum: true,
          current_injuries: ['knee'],
        },
      },
    });
  });

  it('carries client-source and safe health review signals into workout-builder context', async () => {
    const context = await getClientContext(42, 99);
    const clientUserCall = mocks.userFindByPk.mock.calls.find(([id]) => Number(id) === 42);

    expect(clientUserCall?.[1]?.attributes).toEqual(expect.arrayContaining([
      'clientSource',
      'healthConcerns',
    ]));
    expect(context.clientSource).toBe('move_fitness');
    expect(context.sourcePolicy).toEqual(expect.objectContaining({
      clientSource: 'move_fitness',
      isFreeTracking: true,
      shouldDeductPaidSessions: false,
      sessionBalancePolicy: 'free_tracking_no_session_deduction',
    }));
    expect(context.baseline).toEqual(expect.objectContaining({
      medicalClearanceRequired: true,
      parqCleared: false,
    }));
    expect(context.safety).toEqual(expect.objectContaining({
      medicalClearanceRequired: true,
      referralRecommended: true,
      healthReviewRecommended: true,
    }));
    expect(context.health).toEqual(expect.objectContaining({
      hasHealthConcerns: true,
      healthRisk: 'high',
      medicalClearanceRequired: true,
      specialPopulationFlags: expect.arrayContaining(['pregnancy_postpartum']),
    }));
    expect(mocks.programPlanFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, status: 'active' },
      order: [['createdAt', 'DESC']],
    }));
    expect(mocks.programPlanFindOne.mock.calls[0][0].where).not.toHaveProperty('clientId');
    expect(context.activeProgram).toEqual(expect.objectContaining({
      id: 'program-42',
      horizonMonths: 6,
      status: 'active',
      sourceType: 'ai_assisted',
    }));

    const serializedSafeContext = JSON.stringify({
      sourcePolicy: context.sourcePolicy,
      safety: context.safety,
      health: context.health,
    });
    expect(serializedSafeContext).not.toMatch(/Jane|Private|example\.test|knee surgery|raw note/i);
  });
});
