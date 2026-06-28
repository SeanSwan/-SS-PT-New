import { describe, expect, it } from 'vitest';

import {
  SETTLEMENT_GRACE_HOURS,
  getSessionSettlementDecision,
} from '../../services/sessions/sessionSettlementPolicy.mjs';

describe('sessionSettlementPolicy', () => {
  const now = new Date('2026-06-28T18:00:00.000Z');

  it('waits until 24 hours after the scheduled end before settlement is due', () => {
    const decision = getSessionSettlementDecision({
      id: 1,
      status: 'scheduled',
      sessionDate: new Date('2026-06-27T17:30:00.000Z'),
      endDate: new Date('2026-06-27T18:30:00.000Z'),
      duration: 60,
      userId: 3,
      sessionDeducted: false,
      attendanceStatus: 'present',
    }, { now });

    expect(SETTLEMENT_GRACE_HOURS).toBe(24);
    expect(decision.settlementDueAt.toISOString()).toBe('2026-06-28T18:30:00.000Z');
    expect(decision.shouldSettleNow).toBe(false);
    expect(decision.reason).toBe('settlement_not_due');
  });

  it('allows attended sessions to settle after the 24-hour cutoff', () => {
    const decision = getSessionSettlementDecision({
      id: 2,
      status: 'scheduled',
      sessionDate: new Date('2026-06-27T16:00:00.000Z'),
      duration: 60,
      userId: 3,
      sessionDeducted: false,
      attendanceStatus: 'late',
    }, { now });

    expect(decision.sessionEndAt.toISOString()).toBe('2026-06-27T17:00:00.000Z');
    expect(decision.settlementDueAt.toISOString()).toBe('2026-06-28T17:00:00.000Z');
    expect(decision.shouldSettleNow).toBe(true);
    expect(decision.reason).toBe('attended_session_due');
  });

  it('does not blindly deduct sessions with missing attendance after cutoff', () => {
    const decision = getSessionSettlementDecision({
      id: 3,
      status: 'confirmed',
      sessionDate: new Date('2026-06-27T12:00:00.000Z'),
      duration: 60,
      userId: 3,
      sessionDeducted: false,
      attendanceStatus: null,
    }, { now });

    expect(decision.shouldSettleNow).toBe(false);
    expect(decision.needsAttention).toBe(true);
    expect(decision.reason).toBe('attendance_missing_after_cutoff');
    expect(decision.recommendedAction).toBe('open_attendance_review');
  });

  it('flags invalid session times for repair', () => {
    const decision = getSessionSettlementDecision({
      id: 4,
      status: 'scheduled',
      sessionDate: null,
      duration: 60,
      userId: 3,
      sessionDeducted: false,
      attendanceStatus: 'present',
    }, { now });

    expect(decision.shouldSettleNow).toBe(false);
    expect(decision.needsAttention).toBe(true);
    expect(decision.reason).toBe('invalid_session_time');
    expect(decision.recommendedAction).toBe('repair_session_time');
  });

  it('routes no-shows after cutoff to attendance review instead of auto-settlement', () => {
    const decision = getSessionSettlementDecision({
      id: 5,
      status: 'scheduled',
      sessionDate: new Date('2026-06-27T12:00:00.000Z'),
      duration: 60,
      userId: 3,
      sessionDeducted: false,
      attendanceStatus: 'no_show',
    }, { now });

    expect(decision.shouldSettleNow).toBe(false);
    expect(decision.needsAttention).toBe(true);
    expect(decision.reason).toBe('no_show_after_cutoff');
    expect(decision.recommendedAction).toBe('open_attendance_review');
  });

  it('treats already deducted sessions as settled', () => {
    const decision = getSessionSettlementDecision({
      id: 4,
      status: 'completed',
      sessionDate: new Date('2026-06-27T12:00:00.000Z'),
      duration: 60,
      userId: 3,
      sessionDeducted: true,
      attendanceStatus: 'present',
    }, { now });

    expect(decision.shouldSettleNow).toBe(false);
    expect(decision.reason).toBe('already_settled');
  });
});
