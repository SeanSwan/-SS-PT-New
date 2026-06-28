/**
 * adminClientOnboardingProgressList.test.mjs
 * ==========================================
 * Regression coverage for the Client Hub list API's onboarding progress signal.
 * The canonical admin client grid consumes GET /api/admin/clients, so this test
 * keeps partial questionnaire progress visible without adding a persisted column.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const clientRow = {
    id: 42,
    toJSON: () => ({
      id: 42,
      firstName: 'Client',
      lastName: 'Ready',
      email: 'client-ready@example.test',
      role: 'client',
      isActive: true,
      isOnboardingComplete: false,
      masterPromptJson: null,
      clientSource: 'move_fitness',
      availableSessions: 0,
      clientProgress: null,
      clientSessions: [],
      workoutSessions: []
    })
  };

  const userModel = {
    associations: {},
    findAndCountAll: vi.fn(),
    findOne: vi.fn()
  };
  const questionnaireModel = { findAll: vi.fn() };

  const getAllModels = vi.fn(() => ({
    User: userModel,
    ClientProgress: {},
    Session: {},
    WorkoutSession: {},
    Order: {},
    DailyWorkoutForm: {},
    ClientTrainerAssignment: {},
    ClientOnboardingQuestionnaire: questionnaireModel
  }));

  return {
    clientRow,
    getAllModels,
    questionnaireModel,
    userModel
  };
});

vi.mock('../../models/index.mjs', () => ({
  getAllModels: mocks.getAllModels
}));

vi.mock('../../database.mjs', () => ({
  default: {
    fn: vi.fn(),
    col: vi.fn(),
    transaction: vi.fn()
  }
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../services/sendgridService.mjs', () => ({
  sendGridEmail: vi.fn()
}));

vi.mock('../../services/measurementScheduleService.mjs', () => ({
  getMeasurementStatus: vi.fn(() => ({ status: 'green' }))
}));

vi.mock('../../services/claimTokenService.mjs', () => ({
  generateClaimToken: vi.fn()
}));

vi.mock('../../services/adminClientActivationQueueService.mjs', () => ({
  listPaidClientActivationQueue: vi.fn()
}));

vi.mock('../../services/sessionBillingPolicy.mjs', () => ({
  CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES: Object.freeze([
    'available',
    'assigned',
    'requested',
    'scheduled',
    'confirmed'
  ]),
  NON_DEDUCTING_CLIENT_SOURCES: new Set(['move_fitness', 'external']),
  normalizePaidSessionCount: vi.fn((value) => Number(value ?? 0)),
  parseClientSource: vi.fn((value) => value)
}));

vi.mock('../../services/auth/passwordResetEmailService.mjs', () => ({
  sendPasswordResetEmailForUser: vi.fn()
}));

vi.mock('../../services/clientOnboardIdentityService.mjs', () => ({
  normalizeClientOnboardEmailInput: vi.fn((value) => value)
}));

const { default: adminClientController } = await import('../../controllers/adminClientController.mjs');

const buildResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    })
  };
  return res;
};

describe('admin client list onboarding progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userModel.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [mocks.clientRow]
    });
    mocks.userModel.findOne.mockResolvedValue(mocks.clientRow);
    mocks.questionnaireModel.findAll.mockResolvedValue([
      {
        userId: 42,
        status: 'in_progress',
        responsesJson: Object.fromEntries(
          Array.from({ length: 17 }, (_, index) => [`q${index}`, 'answered'])
        ),
        createdAt: new Date('2026-01-01T00:00:00.000Z')
      }
    ]);
  });

  it('derives partial questionnaire progress for the Client Hub list payload', async () => {
    const res = buildResponse();

    await adminClientController.getClients(
      { query: { page: '1', limit: '10' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.questionnaireModel.findAll).toHaveBeenCalledTimes(1);
    expect(res.body.data.clients[0]).toMatchObject({
      id: 42,
      onboardingComplete: false,
      completionPercentage: 20,
      onboardingCompletionPercentage: 20,
      onboardingPct: 20,
      onboardingFieldLedger: expect.objectContaining({
        version: 'computed-v1',
        summary: expect.objectContaining({ canStartTraining: true })
      }),
      onboardingMissingFields: expect.any(Array)
    });
  });

  it('derives partial questionnaire progress for the Client Hub detail payload', async () => {
    const res = buildResponse();

    await adminClientController.getClientDetails(
      { params: { clientId: '42' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.questionnaireModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: expect.any(Object) })
    }));
    expect(res.body.data.client).toMatchObject({
      id: 42,
      onboardingComplete: false,
      completionPercentage: 20,
      onboardingCompletionPercentage: 20,
      onboardingPct: 20,
      onboardingFieldLedger: expect.objectContaining({
        version: 'computed-v1',
        summary: expect.objectContaining({ canStartTraining: true })
      }),
      onboardingMissingFields: expect.any(Array)
    });
  });
});
