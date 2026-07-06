/**
 * UnifiedSessionService.completeSession server-side billing tests (Slice 0.1)
 *
 * Locks the SESSION_COMPLETION_SERVER_BILLING_ENABLED flag behavior:
 * - Flag OFF (default): byte-identical legacy triple (undefined -> skip
 *   'deduction_not_requested'; false -> skip 'waived_by_manager'; true -> deduct).
 * - Flag ON: server decides — deduct when eligible even if the flag is
 *   omitted; explicit false requires a >=5-char waiveReason and lands an
 *   immutable FinancialTransaction audit row; same-day workout-log billing
 *   dedups to 'already_billed_via_workout_log'.
 *
 * Harness mirrors unifiedSessionCompleteAttendance.test.mjs (mocked DB).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockTriggerSequence = vi.fn().mockResolvedValue({ success: true });
const mockProcessSessionDeduction = vi.fn();
const mockFinancialTransactionCreate = vi.fn().mockResolvedValue({ id: 'ft-1' });
const mockDailyWorkoutFormFindOne = vi.fn().mockResolvedValue(null);
const mockTransaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../../models/Session.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: {} }));
vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction)
  }
}));
vi.mock('../../services/automationService.mjs', () => ({
  triggerSequence: mockTriggerSequence
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
  processSessionDeduction: mockProcessSessionDeduction,
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
  getFinancialTransaction: vi.fn(() => ({ create: mockFinancialTransactionCreate })),
  getClientTrainerAssignment: vi.fn(() => ({})),
  getDailyWorkoutForm: vi.fn(() => ({ findOne: mockDailyWorkoutFormFindOne }))
}));

const { UnifiedSessionService } = await import('../../services/sessions/session.service.mjs');

const FLAG = 'SESSION_COMPLETION_SERVER_BILLING_ENABLED';

const buildSession = (overrides = {}) => {
  const session = {
    id: 77,
    userId: 301,
    trainerId: 42,
    status: 'scheduled',
    sessionDate: new Date('2026-05-26T18:00:00.000Z'),
    endDate: null,
    duration: 60,
    notes: null,
    rating: null,
    feedback: null,
    feedbackProvided: false,
    attendanceStatus: null,
    checkInTime: null,
    noShowReason: null,
    markedPresentBy: null,
    attendanceRecordedAt: null,
    sessionDeducted: false,
    client: {
      id: 301,
      firstName: 'Client',
      lastName: 'One',
      email: 'client@example.test',
      availableSessions: 4,
      clientSource: 'swanstudios'
    },
    trainer: {
      id: 42,
      firstName: 'Trainer',
      lastName: 'One',
      email: 'trainer@example.test'
    },
    save: vi.fn().mockResolvedValue(undefined),
    get: vi.fn()
  };
  Object.assign(session, overrides);
  session.get.mockImplementation(() => ({
    id: session.id,
    userId: session.userId,
    trainerId: session.trainerId,
    status: session.status,
    sessionDate: session.sessionDate,
    endDate: session.endDate,
    duration: session.duration,
    notes: session.notes,
    rating: session.rating,
    feedback: session.feedback,
    feedbackProvided: session.feedbackProvided,
    attendanceStatus: session.attendanceStatus,
    checkInTime: session.checkInTime,
    noShowReason: session.noShowReason,
    markedPresentBy: session.markedPresentBy,
    attendanceRecordedAt: session.attendanceRecordedAt
  }));
  return session;
};

describe('UnifiedSessionService.completeSession server-side billing flag', () => {
  let service;
  let sessionModel;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env[FLAG];
    mockProcessSessionDeduction.mockResolvedValue({
      success: true,
      deducted: true,
      creditsDeducted: 1,
      remainingSessions: 3
    });
    mockDailyWorkoutFormFindOne.mockResolvedValue(null);
    mockFinancialTransactionCreate.mockResolvedValue({ id: 'ft-1' });
    service = new UnifiedSessionService();
    sessionModel = { findByPk: vi.fn() };
    service._Session = sessionModel;
    service._User = {};
    service.sendCompletionNotifications = vi.fn();
    service.createSessionTitle = vi.fn(() => 'Completed training session');
  });

  afterEach(() => {
    delete process.env[FLAG];
  });

  const complete = (payload) =>
    service.completeSession(77, { id: '42', role: 'trainer' }, {
      completeWithoutLog: true,
      ...payload
    });

  describe('flag OFF (legacy, regression lock)', () => {
    it('undefined -> no deduction, deduction_not_requested', async () => {
      sessionModel.findByPk.mockResolvedValue(buildSession());
      const result = await complete({});
      expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
      expect(result.deduction.reason).toBe('deduction_not_requested');
    });

    it('false -> no deduction, legacy waived_by_manager label, NO audit row, NO reason required', async () => {
      sessionModel.findByPk.mockResolvedValue(buildSession());
      const result = await complete({ deductSessionCredit: false });
      expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
      expect(mockFinancialTransactionCreate).not.toHaveBeenCalled();
      expect(result.deduction.reason).toBe('waived_by_manager');
    });

    it('true -> deducts via processSessionDeduction', async () => {
      const session = buildSession();
      sessionModel.findByPk.mockResolvedValue(session);
      await complete({ deductSessionCredit: true });
      expect(mockProcessSessionDeduction).toHaveBeenCalledWith(session, session.client, mockTransaction);
    });
  });

  describe('flag ON (server decides)', () => {
    beforeEach(() => {
      process.env[FLAG] = 'true';
    });

    it('deducts when eligible even when deductSessionCredit is omitted (kills the fail-open default)', async () => {
      const session = buildSession();
      sessionModel.findByPk.mockResolvedValue(session);
      await complete({});
      expect(mockProcessSessionDeduction).toHaveBeenCalledWith(session, session.client, mockTransaction);
    });

    it('rejects an explicit waive without a reason (no silent waived_by_manager)', async () => {
      sessionModel.findByPk.mockResolvedValue(buildSession());
      await expect(complete({ deductSessionCredit: false })).rejects.toThrow(/invalid waive request/i);
      expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('accepts a valid waive: no deduction, FinancialTransaction audit row inside the txn, notes annotated', async () => {
      const session = buildSession({ notes: 'existing note' });
      sessionModel.findByPk.mockResolvedValue(session);
      const result = await complete({ deductSessionCredit: false, waiveReason: ' comp for referral ' });
      expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
      expect(mockFinancialTransactionCreate).toHaveBeenCalledTimes(1);
      const [payload, options] = mockFinancialTransactionCreate.mock.calls[0];
      expect(options).toEqual({ transaction: mockTransaction });
      expect(payload.paymentMethod).toBe('session_credit_waive');
      expect(JSON.parse(payload.metadata)).toMatchObject({
        sessionId: 77,
        actorUserId: 42,
        actorRole: 'trainer',
        reason: 'comp for referral'
      });
      expect(session.notes).toContain('existing note');
      expect(session.notes).toContain('comp for referral');
      expect(result.deduction.reason).toBe('waived_by_manager');
      expect(result.deduction.waiveReason).toBe('comp for referral');
    });

    it('skips non-deducting clients without requiring a waive reason', async () => {
      const session = buildSession({
        client: { id: 301, availableSessions: 0, clientSource: 'move_fitness' }
      });
      sessionModel.findByPk.mockResolvedValue(session);
      const result = await complete({ deductSessionCredit: false });
      expect(result.deduction.reason).toBe('non_deducting_client_account');
      expect(mockFinancialTransactionCreate).not.toHaveBeenCalled();
    });

    it('dedups against a same-day billed workout form instead of double-deducting', async () => {
      mockDailyWorkoutFormFindOne.mockResolvedValue({ id: 9, date: '2026-05-26' });
      const session = buildSession();
      sessionModel.findByPk.mockResolvedValue(session);
      const result = await complete({ deductSessionCredit: true });
      expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
      expect(result.deduction.reason).toBe('already_billed_via_workout_log');
      expect(mockDailyWorkoutFormFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: 301, sessionDeducted: true }),
          transaction: mockTransaction
        })
      );
    });

    it('surfaces insufficient credits as an error (route maps to 400)', async () => {
      mockProcessSessionDeduction.mockResolvedValue({
        success: false,
        deducted: false,
        message: 'Insufficient session credits (need 1, have 0)'
      });
      sessionModel.findByPk.mockResolvedValue(buildSession());
      await expect(complete({})).rejects.toThrow(/insufficient session credits/i);
    });

    it('never touches billing for an already-deducted session (waive validation not reached)', async () => {
      sessionModel.findByPk.mockResolvedValue(buildSession({ sessionDeducted: true }));
      const result = await complete({ deductSessionCredit: false });
      expect(result.deduction).toBeNull();
      expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
      expect(mockFinancialTransactionCreate).not.toHaveBeenCalled();
    });
  });
});
