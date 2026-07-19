import { describe, expect, it, vi } from 'vitest';

import {
  getSessionCreditsToRestore,
  resolveSessionCreditCost,
  stampSessionCreditsDeducted,
} from '../../services/sessions/sessionCreditReceiptService.mjs';

describe('session credit receipt service', () => {
  it('uses the immutable deduction receipt even if the session type later changes', async () => {
    const SessionType = {
      findByPk: vi.fn().mockResolvedValue({ creditsRequired: 5 }),
    };

    await expect(getSessionCreditsToRestore({
      sessionDeducted: true,
      creditsDeducted: 2,
      sessionTypeId: 22,
    }, { SessionType })).resolves.toBe(2);
    expect(SessionType.findByPk).not.toHaveBeenCalled();
  });

  it('falls back to the session type for legacy deducted rows without a receipt', async () => {
    const transaction = { id: 'tx' };
    const SessionType = {
      findByPk: vi.fn().mockResolvedValue({ creditsRequired: 3 }),
    };

    await expect(getSessionCreditsToRestore({
      sessionDeducted: true,
      creditsDeducted: null,
      sessionTypeId: 22,
    }, { SessionType, transaction })).resolves.toBe(3);
    expect(SessionType.findByPk).toHaveBeenCalledWith(22, {
      attributes: ['id', 'creditsRequired'],
      transaction,
      paranoid: false,
    });
  });

  it('defaults legacy untyped paid sessions to one credit and never restores undeducted rows', async () => {
    await expect(getSessionCreditsToRestore({
      sessionDeducted: true,
      creditsDeducted: null,
      sessionTypeId: null,
    })).resolves.toBe(1);
    await expect(getSessionCreditsToRestore({
      sessionDeducted: false,
      creditsDeducted: 4,
    })).resolves.toBe(0);
  });

  it('normalizes type costs and stamps exact non-negative integer receipts', async () => {
    const SessionType = {
      findByPk: vi.fn()
        .mockResolvedValueOnce({ creditsRequired: 0 })
        .mockResolvedValueOnce({ creditsRequired: 2 }),
    };
    const zeroCreditSession = { sessionTypeId: 7 };
    const paidSession = { sessionTypeId: 8 };

    await expect(resolveSessionCreditCost(zeroCreditSession, { SessionType })).resolves.toBe(0);
    await expect(resolveSessionCreditCost(paidSession, { SessionType })).resolves.toBe(2);
    expect(stampSessionCreditsDeducted(paidSession, 2)).toBe(2);
    expect(paidSession.creditsDeducted).toBe(2);
    expect(() => stampSessionCreditsDeducted(paidSession, -1)).toThrow('Invalid deducted session credit amount');
  });
});
