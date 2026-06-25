/**
 * UnifiedSessionService complete-session attendance tests
 *
 * Locks the schedule "Mark complete" workflow to the same attendance truth fields
 * used by the manual attendance route. A completed training session must also be
 * visible as attended in downstream progress, billing, and schedule reporting.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTriggerSequence = vi.fn().mockResolvedValue({ success: true });
const mockProcessSessionDeduction = vi.fn();
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
  getFinancialTransaction: vi.fn(() => ({})),
  getClientTrainerAssignment: vi.fn(() => ({}))
}));

const { UnifiedSessionService } = await import('../../services/sessions/session.service.mjs');

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
    noShowReason: 'previously missed',
    markedPresentBy: null,
    attendanceRecordedAt: null,
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

describe('UnifiedSessionService.completeSession attendance truth', () => {
  let service;
  let sessionModel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessSessionDeduction.mockResolvedValue({
      success: true,
      deducted: true,
      creditsDeducted: 1,
      remainingSessions: 3
    });
    mockTransaction.commit.mockResolvedValue(undefined);
    mockTransaction.rollback.mockResolvedValue(undefined);
    service = new UnifiedSessionService();
    sessionModel = { findByPk: vi.fn() };
    service._Session = sessionModel;
    service._User = {};
    service.sendCompletionNotifications = vi.fn();
    service.createSessionTitle = vi.fn(() => 'Completed training session');
  });

  it('marks a completed scheduled session present with recorder audit fields', async () => {
    const session = buildSession();
    sessionModel.findByPk.mockResolvedValue(session);
    const beforeComplete = Date.now();

    const result = await service.completeSession(77, { id: '42', role: 'trainer' }, {
      notes: '  strong session  ',
      trainerRating: 5,
      completeWithoutLog: true
    });

    const afterComplete = Date.now();
    expect(session.status).toBe('completed');
    expect(session.attendanceStatus).toBe('present');
    expect(session.noShowReason).toBeNull();
    expect(session.markedPresentBy).toBe(42);
    expect(session.checkInTime).toBeInstanceOf(Date);
    expect(session.attendanceRecordedAt).toBeInstanceOf(Date);
    expect(session.checkInTime.getTime()).toBeGreaterThanOrEqual(beforeComplete);
    expect(session.attendanceRecordedAt.getTime()).toBeLessThanOrEqual(afterComplete);
    expect(session.notes).toBe('strong session');
    expect(session.rating).toBe(5);
    expect(sessionModel.findByPk).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE
      })
    );
    expect(session.save).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(service.sendCompletionNotifications).toHaveBeenCalledWith(session);
    expect(result.session).toMatchObject({
      id: '77',
      status: 'completed',
      attendanceStatus: 'present',
      markedPresentBy: 42,
      noShowReason: null
    });
  });

  it('deducts a paid SwanStudios credit when direct no-log completion is used', async () => {
    const session = buildSession();
    sessionModel.findByPk.mockResolvedValue(session);
    mockProcessSessionDeduction.mockResolvedValue({
      success: true,
      deducted: true,
      creditsDeducted: 1,
      remainingSessions: 3
    });

    const result = await service.completeSession(77, { id: 42, role: 'trainer' }, {
      completeWithoutLog: true,
      deductSessionCredit: true
    });

    expect(mockProcessSessionDeduction).toHaveBeenCalledWith(session, session.client, mockTransaction);
    expect(result.deduction).toMatchObject({
      deducted: true,
      creditsDeducted: 1,
      remainingSessions: 3
    });
  });

  it('does not deduct a paid SwanStudios credit when direct completion omits the billing decision', async () => {
    const session = buildSession();
    sessionModel.findByPk.mockResolvedValue(session);

    const result = await service.completeSession(77, { id: 42, role: 'trainer' }, {
      completeWithoutLog: true
    });

    expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
    expect(result.deduction).toMatchObject({
      deducted: false,
      creditsDeducted: 0,
      remainingSessions: 4,
      reason: 'deduction_not_requested'
    });
  });

  it('does not deduct a Move Fitness tracking client when direct no-log completion is used', async () => {
    const session = buildSession({
      client: {
        id: 301,
        firstName: 'Client',
        lastName: 'One',
        email: 'client@example.test',
        availableSessions: 0,
        clientSource: 'move_fitness'
      }
    });
    sessionModel.findByPk.mockResolvedValue(session);

    const result = await service.completeSession(77, { id: 42, role: 'trainer' }, {
      completeWithoutLog: true
    });

    expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
    expect(result.deduction).toMatchObject({
      deducted: false,
      creditsDeducted: 0,
      reason: 'non_deducting_client_account'
    });
  });

  it('allows a manager to waive paid-credit deduction for direct no-log completion', async () => {
    const session = buildSession();
    sessionModel.findByPk.mockResolvedValue(session);

    const result = await service.completeSession(77, { id: 42, role: 'trainer' }, {
      completeWithoutLog: true,
      deductSessionCredit: false
    });

    expect(mockProcessSessionDeduction).not.toHaveBeenCalled();
    expect(result.deduction).toMatchObject({
      deducted: false,
      creditsDeducted: 0,
      remainingSessions: 4,
      reason: 'waived_by_manager'
    });
  });

  it('preserves an existing check-in timestamp when completion closes a late session', async () => {
    const existingCheckInTime = new Date('2026-05-26T18:07:00.000Z');
    const session = buildSession({
      status: 'confirmed',
      attendanceStatus: 'late',
      checkInTime: existingCheckInTime,
      attendanceRecordedAt: existingCheckInTime,
      noShowReason: null
    });
    sessionModel.findByPk.mockResolvedValue(session);

    await service.completeSession(77, { id: 42, role: 'trainer' }, {
      completeWithoutLog: true
    });

    expect(session.status).toBe('completed');
    expect(session.attendanceStatus).toBe('present');
    expect(session.checkInTime).toBe(existingCheckInTime);
    expect(session.attendanceRecordedAt).toBe(existingCheckInTime);
    expect(session.markedPresentBy).toBe(42);
    expect(session.save).toHaveBeenCalledTimes(1);
  });

  it('rejects direct completion when a manager did not explicitly choose the no-log fallback', async () => {
    const session = buildSession();
    sessionModel.findByPk.mockResolvedValue(session);

    await expect(
      service.completeSession(77, { id: '42', role: 'trainer' }, {
        notes: 'forgot to log the workout'
      })
    ).rejects.toThrow(/completeWithoutLog/i);

    expect(session.status).toBe('scheduled');
    expect(session.save).not.toHaveBeenCalled();
  });
});
