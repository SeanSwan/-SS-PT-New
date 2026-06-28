import { describe, expect, it, vi } from 'vitest';

const {
  mockSessionModel,
  mockUserModel,
  Op
} = vi.hoisted(() => {
  const Op = {
    in: Symbol('in'),
    lt: Symbol('lt'),
    not: Symbol('not')
  };

  return {
    mockSessionModel: {
      findAll: vi.fn()
    },
    mockUserModel: {},
    Op
  };
});

vi.mock('../../models/index.mjs', () => ({
  getSession: () => mockSessionModel,
  getUser: () => mockUserModel,
  Op
}));

import {
  buildSessionAttentionSummary,
  getSessionDeductionAttentionSummary
} from '../../services/sessions/sessionAttentionService.mjs';

describe('sessionAttentionService', () => {
  const now = new Date('2026-06-28T18:00:00.000Z');

  function makeSession(id, overrides = {}) {
    return {
      id,
      status: 'scheduled',
      sessionDate: new Date('2026-06-27T12:00:00.000Z'),
      duration: 60,
      userId: 100 + id,
      trainerId: 200 + id,
      sessionDeducted: false,
      attendanceStatus: 'present',
      client: {
        id: 100 + id,
        firstName: 'Client',
        lastName: String(id),
        availableSessions: 2,
        clientSource: 'swanstudios',
        sessionBillingMode: 'deduct'
      },
      ...overrides
    };
  }

  it('summarizes ready, deferred, review, and non-deducting settlement attention', () => {
    const summary = buildSessionAttentionSummary([
      makeSession(1),
      makeSession(2, { attendanceStatus: null }),
      makeSession(3, { attendanceStatus: 'no_show' }),
      makeSession(4, {
        sessionDate: new Date('2026-06-28T16:30:00.000Z'),
        attendanceStatus: 'present'
      }),
      makeSession(5, {
        client: {
          id: 105,
          firstName: 'Move',
          lastName: 'Client',
          availableSessions: 0,
          clientSource: 'move_fitness',
          sessionBillingMode: 'tracking_only'
        }
      }),
      makeSession(6, {
        client: {
          id: 106,
          firstName: 'No',
          lastName: 'Credits',
          availableSessions: 0,
          clientSource: 'swanstudios',
          sessionBillingMode: 'deduct'
        }
      })
    ], { now });

    expect(summary.counts).toMatchObject({
      totalCandidates: 6,
      readyToSettle: 3,
      deferred: 3,
      notDue: 1,
      attendanceReview: 1,
      noShowReview: 1,
      trackingOnly: 1,
      pendingPaidCredits: 1,
      paymentRecoveryNeeded: 1
    });

    expect(summary.items.map(item => item.riskCategory)).toEqual([
      'pending_deduction',
      'attendance_review',
      'attendance_review',
      'not_due',
      'tracking_only',
      'payment_recovery_needed'
    ]);
    expect(summary.items.map(item => item.creditImpact)).toEqual([
      'pending_deduction',
      'deferred_review',
      'deferred_review',
      'none',
      'tracking_only',
      'payment_recovery_needed'
    ]);
  });

  it('queries active past unpaid sessions without mutating them', async () => {
    const sessions = [makeSession(7)];
    mockSessionModel.findAll.mockResolvedValue(sessions);

    const summary = await getSessionDeductionAttentionSummary({ now, limit: 25 });

    expect(summary.counts.totalCandidates).toBe(1);
    expect(mockSessionModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
      include: [expect.objectContaining({
        model: mockUserModel,
        as: 'client',
        required: true
      })],
      limit: 25
    }));

    const where = mockSessionModel.findAll.mock.calls[0][0].where;
    expect(where.sessionDeducted).toBe(false);
    expect(where.isBlocked).toBe(false);
    expect(where.userId).toEqual({ [Op.not]: null });
  });
});
