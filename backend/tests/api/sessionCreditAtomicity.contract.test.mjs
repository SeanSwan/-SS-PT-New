import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Session-credit mutation atomicity (2026-06-13).
 * ============================================================================
 * Session credits are what clients PAY for — mutating them with read-then-write
 * (read balance, compute, save) can lose an update or double-spend under
 * concurrency. The canonical sessionDeductionService already uses atomic
 * decrement/increment under a row lock; this locks the secondary paths
 * (notification deduction + session refund/grant) to the same atomic DB
 * arithmetic so the whole credit ledger is race-safe.
 */
const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('session credit mutation atomicity', () => {
  it('notification deduction uses atomic decrement (not read-then-write)', () => {
    const src = read('utils/notification.mjs');
    expect(src).toContain("decrement('availableSessions'");
  });

  it('session service refund + grant use atomic increment', () => {
    const src = read('services/sessions/session.service.mjs');
    const incrementCount = (src.match(/increment\('availableSessions'/g) || []).length;
    expect(incrementCount).toBeGreaterThanOrEqual(2);
  });

  it('canonical deduction service stays atomic + row-locked', () => {
    const src = read('services/sessionDeductionService.mjs');
    expect(src).toContain("decrement('availableSessions'");
    expect(src).toContain('LOCK.UPDATE');
  });
});
