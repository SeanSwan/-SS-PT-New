import { describe, expect, it } from 'vitest';
import {
  SETTLEMENT_GRACE_HOURS,
  buildSessionCommandState,
} from './SessionDetailCommandPanel.logic';
import type { SessionDetail } from './SessionDetailModal.types';

const now = new Date('2026-06-28T18:00:00.000Z');

const baseSession: SessionDetail = {
  id: 72,
  sessionDate: '2026-06-27T12:00:00.000Z',
  duration: 60,
  status: 'confirmed',
  userId: 44,
  trainerId: 9,
  clientName: 'Client Alpha',
  trainerName: 'Coach Swan',
  clientAvailableSessions: 2,
  attendanceStatus: 'present',
  sessionDeducted: false,
};

describe('SessionDetailCommandPanel logic', () => {
  it('surfaces ready settlement for attended sessions after the grace window', () => {
    const state = buildSessionCommandState({
      session: baseSession,
      mode: 'admin',
      now,
      isNonDeductingClient: false,
    });

    expect(SETTLEMENT_GRACE_HOURS).toBe(24);
    expect(state.outcomeLabel).toBe('Ready for settlement');
    expect(state.riskLevel).toBe('medium');
    expect(state.settlementLabel).toBe('Settlement review available now');
    expect(state.paymentLabel).toBe('2 paid credits available');
    expect(state.attentionReasons).toEqual(['Pending credit deduction']);
    expect(state.primaryAction?.label).toBe('Review settlement');
  });

  it('routes missing attendance after cutoff to attention review instead of settlement', () => {
    const state = buildSessionCommandState({
      session: { ...baseSession, attendanceStatus: null },
      mode: 'trainer',
      now,
      isNonDeductingClient: false,
    });

    expect(state.outcomeLabel).toBe('Attendance review');
    expect(state.riskLevel).toBe('high');
    expect(state.attentionReasons).toContain('Missing attendance after cutoff');
    expect(state.primaryAction?.label).toBe('Record attendance');
  });

  it('opens payment review for admin when a paid client has no credits', () => {
    const state = buildSessionCommandState({
      session: { ...baseSession, clientAvailableSessions: 0 },
      mode: 'admin',
      now,
      isNonDeductingClient: false,
    });

    expect(state.outcomeLabel).toBe('Payment review');
    expect(state.paymentLabel).toBe('Payment recovery needed');
    expect(state.attentionReasons).toContain('Payment recovery needed');
    expect(state.primaryAction).toEqual({
      key: 'open_payment_review',
      label: 'Open payment review',
      enabled: true,
    });
  });

  it('keeps tracking-only clients out of payment review', () => {
    const state = buildSessionCommandState({
      session: {
        ...baseSession,
        clientAvailableSessions: 0,
        clientSource: 'move_fitness',
      },
      mode: 'admin',
      now,
      isNonDeductingClient: true,
    });

    expect(state.outcomeLabel).toBe('Tracking only');
    expect(state.paymentLabel).toBe('No paid-credit deduction');
    expect(state.settlementLabel).toBe('Tracking-only session');
    expect(state.attentionReasons).not.toContain('Payment recovery needed');
    expect(state.primaryAction?.key).not.toBe('open_payment_review');
  });

  it('keeps cancelled sessions out of settlement and payment recovery lanes', () => {
    const state = buildSessionCommandState({
      session: { ...baseSession, status: 'cancelled', clientAvailableSessions: 0 },
      mode: 'admin',
      now,
      isNonDeductingClient: false,
    });

    expect(state.outcomeLabel).toBe('Cancelled');
    expect(state.settlementLabel).toBe('No settlement action');
    expect(state.paymentLabel).toBe('No paid-credit deduction');
    expect(state.primaryAction).toBeNull();
  });

  it('shows countdown text before the settlement grace window is due', () => {
    const state = buildSessionCommandState({
      session: {
        ...baseSession,
        sessionDate: '2026-06-28T16:30:00.000Z',
      },
      mode: 'admin',
      now,
      isNonDeductingClient: false,
    });

    expect(state.outcomeLabel).toBe('Awaiting settlement window');
    expect(state.riskLevel).toBe('low');
    expect(state.settlementLabel).toBe('Settlement review opens in 23h 30m');
    expect(state.attentionReasons).toEqual(['Inside settlement grace window']);
  });
});
