/**
 * UnifiedSessionService client availability tests
 *
 * Locks the client schedule feed to return the client's own sessions plus
 * unassigned available booking slots. This preserves booking UX without
 * leaking other clients' scheduled sessions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const { loggerWarnMock } = vi.hoisted(() => ({
  loggerWarnMock: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: loggerWarnMock,
  },
}));
vi.mock('../../models/Session.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: {} }));
vi.mock('../../database.mjs', () => ({ default: {} }));
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
  createNotification: vi.fn()
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

describe('UnifiedSessionService.getAllSessions client availability', () => {
  let service;
  let sessionModel;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UnifiedSessionService();
    sessionModel = { findAll: vi.fn().mockResolvedValue([]) };
    service._Session = sessionModel;
    service._User = {};
    service._SessionType = {};
  });

  it('returns a client scope of own sessions plus unassigned available slots only', async () => {
    await service.getAllSessions({}, { id: 301, role: 'client' });

    const query = sessionModel.findAll.mock.calls[0][0];
    expect(query.where[Op.or]).toEqual([
      { userId: 301 },
      { status: 'available', userId: null }
    ]);
    expect(query.where.userId).toBeUndefined();
  });

  it('includes non-PII session type credit cost for trainer schedule logger hints', async () => {
    await service.getAllSessions({}, { id: 77, role: 'trainer' });

    const query = sessionModel.findAll.mock.calls[0][0];
    const sessionTypeInclude = query.include.find((include) => include.as === 'sessionType');

    expect(sessionTypeInclude).toEqual(expect.objectContaining({
      model: service._SessionType,
      as: 'sessionType',
      attributes: ['id', 'name', 'duration', 'creditsRequired']
    }));
  });

  it('returns an empty schedule for social users without logging them as unknown roles', async () => {
    const sessions = await service.getAllSessions({}, { id: 104, role: 'user' });

    expect(sessions).toEqual([]);
    expect(sessionModel.findAll).not.toHaveBeenCalled();
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });
});
