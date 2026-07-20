import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  transaction,
  sequelize,
  Session,
  User,
} = vi.hoisted(() => {
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
  return {
    transaction,
    sequelize: {
      transaction: vi.fn().mockResolvedValue(transaction),
    },
    Session: {
      findByPk: vi.fn(),
    },
    User: {
      findByPk: vi.fn(),
    },
  };
});

vi.mock('../../database.mjs', () => ({ default: sequelize }));
vi.mock('../../models/index.mjs', () => ({
  getSession: () => Session,
  getUser: () => User,
  getSessionType: () => ({ findByPk: vi.fn() }),
}));
vi.mock('../../utils/notification.mjs', () => ({
  sendEmailNotification: vi.fn().mockResolvedValue(undefined),
  sendSmsNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../utils/emailTemplates.mjs', () => ({
  sessionCancelledEmail: vi.fn(() => ({})),
  trainerSessionNotificationEmail: vi.fn(() => ({})),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { cancelSessionForAI } = await import('../../services/sessions/sessionCancelService.mjs');

function buildSession(overrides = {}) {
  return {
    id: 44,
    status: 'scheduled',
    userId: 301,
    trainerId: 99,
    sessionDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    sessionDeducted: true,
    creditsDeducted: 2,
    sessionCreditRestored: false,
    client: {
      id: 301,
      email: null,
      phone: null,
    },
    trainer: {
      id: 99,
      email: null,
    },
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildClient() {
  return {
    id: 301,
    availableSessions: 0,
    clientSource: 'swanstudios',
    sessionBillingMode: 'paid_sessions',
    increment: vi.fn().mockResolvedValue(undefined),
  };
}

describe('cancelSessionForAI credit transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sequelize.transaction.mockResolvedValue(transaction);
  });

  it('row-locks cancellation and restores the exact immutable credit receipt atomically', async () => {
    const initialSession = buildSession();
    const lockedSession = buildSession({ client: null, trainer: null });
    const client = buildClient();
    Session.findByPk
      .mockResolvedValueOnce(initialSession)
      .mockResolvedValueOnce(lockedSession);
    User.findByPk.mockResolvedValue(client);

    const result = await cancelSessionForAI(44, { id: 1, role: 'admin' });

    expect(Session.findByPk).toHaveBeenLastCalledWith(44, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    expect(client.increment).toHaveBeenCalledWith('availableSessions', {
      by: 2,
      transaction,
    });
    expect(lockedSession.status).toBe('cancelled');
    expect(lockedSession.sessionCreditRestored).toBe(true);
    expect(lockedSession.save).toHaveBeenCalledWith({ transaction });
    expect(transaction.commit).toHaveBeenCalledOnce();
    expect(transaction.rollback).not.toHaveBeenCalled();
    expect(result.refundIssued).toBe(true);
  });

  it('rolls back without restoring when the row was cancelled by a concurrent request', async () => {
    Session.findByPk
      .mockResolvedValueOnce(buildSession())
      .mockResolvedValueOnce(buildSession({ status: 'cancelled' }));

    await expect(cancelSessionForAI(44, { id: 1, role: 'admin' }))
      .rejects.toThrow('no longer available for cancellation');

    expect(User.findByPk).not.toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalledOnce();
  });

  it('derives late-cancellation policy from the row-locked session snapshot', async () => {
    const initialSession = buildSession({
      sessionDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    const lockedSession = buildSession({
      sessionDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      client: null,
      trainer: null,
    });
    const client = buildClient();
    Session.findByPk
      .mockResolvedValueOnce(initialSession)
      .mockResolvedValueOnce(lockedSession);
    User.findByPk.mockResolvedValue(client);

    const result = await cancelSessionForAI(44, { id: 99, role: 'trainer' });

    expect(lockedSession.cancellationReason).toBe('Late cancellation (via Swan Coach)');
    expect(lockedSession.cancellationDecision).toBe('pending');
    expect(result.isLateCancellation).toBe(true);
    expect(result.requiresAdminReview).toBe(true);
  });
});
