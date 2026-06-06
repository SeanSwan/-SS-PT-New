import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const mocks = vi.hoisted(() => {
  const transaction = {
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined)
  };
  const userModel = { findOne: vi.fn() };
  const sessionModel = { update: vi.fn() };
  const getAllModels = vi.fn(() => ({
    User: userModel,
    ClientProgress: {},
    Session: sessionModel,
    WorkoutSession: {},
    Order: {},
    DailyWorkoutForm: {}
  }));

  return {
    transaction,
    transactionFactory: vi.fn().mockResolvedValue(transaction),
    userModel,
    sessionModel,
    getAllModels
  };
});

vi.mock('../../models/index.mjs', () => ({
  getAllModels: mocks.getAllModels
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: mocks.transactionFactory
  }
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../../services/sendgridService.mjs', () => ({
  sendGridEmail: vi.fn()
}));

vi.mock('../../services/measurementScheduleService.mjs', () => ({
  getMeasurementStatus: vi.fn()
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
  NON_DEDUCTING_CLIENT_SOURCES: new Set(['move_fitness']),
  normalizePaidSessionCount: vi.fn((value) => {
    const parsed = Number(value ?? 0);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  })
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

const buildClient = (overrides = {}) => ({
  id: 301,
  role: 'client',
  availableSessions: 8,
  update: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('admin client lifecycle controller runtime behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.commit.mockResolvedValue(undefined);
    mocks.transaction.rollback.mockResolvedValue(undefined);
    mocks.userModel.findOne.mockReset();
    mocks.sessionModel.update.mockReset();
  });

  it('soft-delete cancels every future client-held non-terminal session status', async () => {
    const client = buildClient({ availableSessions: 11 });
    mocks.userModel.findOne.mockResolvedValue(client);
    mocks.sessionModel.update.mockResolvedValue([5]);
    const res = buildResponse();

    await adminClientController.deleteClient(
      { params: { clientId: '301' }, body: {} },
      res
    );

    expect(mocks.userModel.findOne).toHaveBeenCalledWith({
      where: { id: '301', role: 'client' },
      transaction: mocks.transaction
    });
    expect(mocks.sessionModel.update).toHaveBeenCalledTimes(1);
    const [sessionUpdate, updateOptions] = mocks.sessionModel.update.mock.calls[0];
    expect(sessionUpdate).toMatchObject({
      status: 'cancelled',
      notes: expect.stringContaining('client account deactivated')
    });
    expect(updateOptions.where.userId).toBe('301');
    expect(updateOptions.where.sessionDate[Op.gt]).toBeInstanceOf(Date);
    expect(updateOptions.where.status[Op.in]).toEqual(expect.arrayContaining([
      'available',
      'assigned',
      'requested',
      'scheduled',
      'confirmed'
    ]));
    expect(updateOptions.where.status[Op.in]).not.toEqual(expect.arrayContaining([
      'completed',
      'cancelled',
      'blocked'
    ]));
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        accountDeactivatedAt: expect.any(Date),
        accountRetentionUntil: expect.any(Date)
      }),
      { transaction: mocks.transaction }
    );
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.rollback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({
      clientId: '301',
      cancelledFutureSessions: 5,
      preservedAvailableSessions: 11
    });
  });

  it('restore reactivates the client without mutating retained sessions or credits', async () => {
    const client = buildClient({ availableSessions: 4 });
    mocks.userModel.findOne.mockResolvedValue(client);
    const res = buildResponse();

    await adminClientController.restoreClient(
      { params: { clientId: '301' } },
      res
    );

    expect(client.update).toHaveBeenCalledWith(
      {
        isActive: true,
        accountDeactivatedAt: null,
        accountRetentionUntil: null
      },
      { transaction: mocks.transaction }
    );
    expect(mocks.sessionModel.update).not.toHaveBeenCalled();
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.rollback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({
      clientId: '301',
      isActive: true
    });
  });
});
