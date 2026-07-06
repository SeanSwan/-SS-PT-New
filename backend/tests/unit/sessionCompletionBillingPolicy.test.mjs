/**
 * sessionCompletionBillingPolicy unit tests (Slice 0.1)
 *
 * Locks the server-side completion billing policy primitives: flag gate,
 * waive-request validation, non-deducting skip, dedup lookup, and the
 * immutable waive audit payload shape.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SERVER_COMPLETION_BILLING_FLAG,
  WAIVE_PAYMENT_METHOD,
  WAIVE_REASON_MIN_LENGTH,
  buildWaiveAuditPayload,
  findSameDayBilledWorkoutForm,
  isServerCompletionBillingEnabled,
  resolveCompletionBillingAction
} from '../../services/sessions/sessionCompletionBillingPolicy.mjs';

const BILLABLE_CLIENT = { clientSource: 'swanstudios', sessionBillingMode: 'paid_sessions' };

afterEach(() => {
  delete process.env[SERVER_COMPLETION_BILLING_FLAG];
});

describe('isServerCompletionBillingEnabled', () => {
  it('is OFF when unset and for any value other than the string true', () => {
    expect(isServerCompletionBillingEnabled()).toBe(false);
    process.env[SERVER_COMPLETION_BILLING_FLAG] = 'TRUE';
    expect(isServerCompletionBillingEnabled()).toBe(false);
    process.env[SERVER_COMPLETION_BILLING_FLAG] = '1';
    expect(isServerCompletionBillingEnabled()).toBe(false);
    process.env[SERVER_COMPLETION_BILLING_FLAG] = 'true';
    expect(isServerCompletionBillingEnabled()).toBe(true);
  });
});

describe('resolveCompletionBillingAction', () => {
  it('deducts by default when the flag owner omits deductSessionCredit (kills the fail-open default)', () => {
    expect(resolveCompletionBillingAction({ client: BILLABLE_CLIENT })).toEqual({ action: 'deduct' });
    expect(resolveCompletionBillingAction({ deductSessionCredit: true, client: BILLABLE_CLIENT }))
      .toEqual({ action: 'deduct' });
  });

  it('skips non-deducting clients before any waive validation', () => {
    const result = resolveCompletionBillingAction({
      deductSessionCredit: false,
      client: { clientSource: 'move_fitness' }
    });
    expect(result).toEqual({ action: 'skip', reason: 'non_deducting_client_account' });
  });

  it('rejects an explicit waive without a reason', () => {
    expect(() => resolveCompletionBillingAction({ deductSessionCredit: false, client: BILLABLE_CLIENT }))
      .toThrow(/invalid waive request/i);
  });

  it('rejects short or whitespace-padded waive reasons', () => {
    expect(() => resolveCompletionBillingAction({
      deductSessionCredit: false,
      waiveReason: 'abcd',
      client: BILLABLE_CLIENT
    })).toThrow(/invalid waive request/i);
    expect(() => resolveCompletionBillingAction({
      deductSessionCredit: false,
      waiveReason: '  ab  ',
      client: BILLABLE_CLIENT
    })).toThrow(/invalid waive request/i);
    expect(WAIVE_REASON_MIN_LENGTH).toBe(5);
  });

  it('accepts a valid waive request and trims the reason', () => {
    const result = resolveCompletionBillingAction({
      deductSessionCredit: false,
      waiveReason: '  comp session for referral  ',
      client: BILLABLE_CLIENT
    });
    expect(result).toEqual({
      action: 'waive',
      reason: 'waived_by_manager',
      waiveReason: 'comp session for referral'
    });
  });
});

describe('findSameDayBilledWorkoutForm', () => {
  it('queries by client, server-local date, and sessionDeducted=true', async () => {
    const findOne = vi.fn().mockResolvedValue({ id: 9 });
    const sessionDate = new Date(2026, 6, 5, 18, 30); // local 2026-07-05
    const row = await findSameDayBilledWorkoutForm({
      DailyWorkoutForm: { findOne },
      clientId: 301,
      sessionDate,
      transaction: 'txn'
    });
    expect(row).toEqual({ id: 9 });
    expect(findOne).toHaveBeenCalledWith({
      where: { clientId: 301, date: '2026-07-05', sessionDeducted: true },
      attributes: ['id', 'date'],
      transaction: 'txn'
    });
  });

  it('fails open (null) on missing model, client, or unparseable date', async () => {
    expect(await findSameDayBilledWorkoutForm({ DailyWorkoutForm: null, clientId: 1, sessionDate: new Date() })).toBeNull();
    expect(await findSameDayBilledWorkoutForm({ DailyWorkoutForm: { findOne: vi.fn() }, clientId: null, sessionDate: new Date() })).toBeNull();
    expect(await findSameDayBilledWorkoutForm({ DailyWorkoutForm: { findOne: vi.fn() }, clientId: 1, sessionDate: 'not-a-date' })).toBeNull();
  });
});

describe('buildWaiveAuditPayload', () => {
  it('builds an amount-0 succeeded row with a machine-readable metadata discriminator', () => {
    const payload = buildWaiveAuditPayload({
      session: { id: 77, userId: 301 },
      actorUserId: 42,
      actorRole: 'trainer',
      waiveReason: 'comp session for referral',
      creditsWaived: 1
    });
    expect(payload.userId).toBe(301);
    expect(payload.amount).toBe(0);
    expect(payload.status).toBe('succeeded');
    expect(payload.paymentMethod).toBe(WAIVE_PAYMENT_METHOD);
    expect(payload.description).toContain('session 77');
    expect(payload.description).toContain('user 42');
    const metadata = JSON.parse(payload.metadata);
    expect(metadata).toMatchObject({
      type: WAIVE_PAYMENT_METHOD,
      sessionId: 77,
      actorUserId: 42,
      actorRole: 'trainer',
      reason: 'comp session for referral',
      creditsWaived: 1
    });
    expect(payload.processedAt).toBeInstanceOf(Date);
  });
});
