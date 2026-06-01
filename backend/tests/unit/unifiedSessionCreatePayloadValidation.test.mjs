/**
 * UnifiedSessionService create payload validation tests
 *
 * Locks /api/sessions create payloads to Session model integer identity
 * fields before transaction/DB writes. This protects the canonical schedule
 * create path even when a caller bypasses the frontend ID normalizers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();

vi.mock('../../models/Session.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: {} }));
vi.mock('../../database.mjs', () => ({
  default: {
    transaction: mockTransaction
  }
}));
vi.mock('../../services/automationService.mjs', () => ({
  triggerSequence: vi.fn().mockResolvedValue({ success: true })
}));
vi.mock('../../services/realTimeScheduleService.mjs', () => ({
  default: {
    emitSessionUpdate: vi.fn(),
    broadcastScheduleUpdate: vi.fn()
  }
}));
vi.mock('../../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn().mockResolvedValue({})
}));
vi.mock('../../utils/notification.mjs', () => ({
  sendEmailNotification: vi.fn(),
  sendSmsNotification: vi.fn(),
  notifySessionBooked: vi.fn(),
  notifyAdminSessionBooked: vi.fn(),
  notifySessionCancelled: vi.fn(),
  processSessionDeduction: vi.fn(),
  sendDeductionNotification: vi.fn(),
  notifyLowSessionsRemaining: vi.fn(),
  sendSessionReminder: vi.fn()
}));
vi.mock('../../models/index.mjs', () => ({
  getUser: vi.fn(() => ({})),
  getOrder: vi.fn(() => ({})),
  getOrderItem: vi.fn(() => ({})),
  getStorefrontItem: vi.fn(() => ({})),
  getSession: vi.fn(() => ({})),
  getSessionType: vi.fn(() => ({})),
  getFinancialTransaction: vi.fn(() => ({})),
  getClientTrainerAssignment: vi.fn(() => ({}))
}));

const { UnifiedSessionService } = await import('../../services/sessions/session.service.mjs');

const buildService = () => {
  const service = new UnifiedSessionService();
  const transaction = {
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined)
  };
  const sessionModel = {
    bulkCreate: vi.fn().mockResolvedValue([
      {
        get: vi.fn(() => ({
          id: 91,
          sessionDate: new Date('2026-06-01T16:00:00.000Z'),
          endDate: new Date('2026-06-01T17:00:00.000Z'),
          duration: 60,
          userId: 301,
          trainerId: 42,
          sessionTypeId: 7,
          status: 'scheduled'
        }))
      }
    ])
  };

  mockTransaction.mockResolvedValue(transaction);
  service._Session = sessionModel;
  service._User = { findByPk: vi.fn().mockResolvedValue({ id: 42 }) };
  service._SessionType = { findOne: vi.fn().mockResolvedValue({ id: 7 }) };
  service.createSessionTitle = vi.fn(() => 'Scheduled session');
  service.broadcastSessionCreated = vi.fn().mockResolvedValue({ success: true });
  service.detectAndBroadcastConflicts = vi.fn().mockResolvedValue(undefined);
  service.notifyTrainersAboutNewSessions = vi.fn();

  return { service, sessionModel };
};

const validSession = {
  start: '2026-06-01T16:00:00.000Z',
  duration: 60,
  location: 'Main Studio'
};

describe('UnifiedSessionService.createAvailableSessions payload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects malformed identity payloads before opening a transaction', async () => {
    const invalidPayloads = [
      { userId: 'fixture-301' },
      { trainerId: 'trainer-42' },
      { sessionTypeId: 'strength-7' },
      { userId: 0 },
      { trainerId: 4.5 },
      { sessionTypeId: Number.NaN }
    ];

    for (const invalidFields of invalidPayloads) {
      const { service } = buildService();

      await expect(service.createAvailableSessions([
        { ...validSession, ...invalidFields }
      ], { id: 42, role: 'admin' })).rejects.toThrow(/must be a positive integer/);
    }

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('coerces valid string identity payloads to numeric Session fields', async () => {
    const { service, sessionModel } = buildService();

    await service.createAvailableSessions([
      {
        ...validSession,
        userId: '301',
        trainerId: '42',
        sessionTypeId: '7'
      }
    ], { id: '42', role: 'admin' });

    expect(sessionModel.bulkCreate).toHaveBeenCalledTimes(1);
    const [rows] = sessionModel.bulkCreate.mock.calls[0];
    expect(rows[0]).toMatchObject({
      userId: 301,
      trainerId: 42,
      sessionTypeId: 7,
      status: 'scheduled'
    });
  });
});
