/**
 * sessionBookUserIdCreditAtomicity — SWA-129 Kimi call 6 (entitlement race +
 * money-invariant). POST /book/:userId was the un-hardened twin of
 * POST /:sessionId/book: it did a check-then-decrement of availableSessions
 * with NO transaction and NO row lock (concurrent books of two different
 * available sessions with availableSessions=1 both succeed → a client consumes
 * more paid sessions than they hold), AND it never set session.sessionDeducted
 * = true — violating the money invariant "a credit was taken <=> sessionDeducted
 * === true" (double-deduction at completion/settlement, credit silently lost on
 * cancel). This contract pins the fix in place, matching the source-slice style
 * of sessionBookingClientSourceBoundary.test.mjs.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');

const bookUserIdSlice = () => {
  const start = routeSource.indexOf('router.post("/book/:userId"');
  const end = routeSource.indexOf('router.post("/:sessionId/book"', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return routeSource.slice(start, end);
};

describe('POST /book/:userId — credit atomicity + money invariant', () => {
  it('opens a database transaction for the book/deduct', () => {
    expect(bookUserIdSlice()).toMatch(/=\s*await sequelize\.transaction\(\)/);
  });

  it('locks BOTH the session row and the user row with LOCK.UPDATE inside the transaction', () => {
    const slice = bookUserIdSlice();
    // Two lock: transaction.LOCK.UPDATE sites (session findOne + user findByPk)
    const lockSites = slice.match(/lock:\s*transaction\.LOCK\.UPDATE/g) || [];
    expect(lockSites.length).toBeGreaterThanOrEqual(2);
  });

  it('sets session.sessionDeducted = true when a credit is taken (money invariant)', () => {
    expect(bookUserIdSlice()).toContain('session.sessionDeducted = true');
  });

  it('persists the session, the user, and the deduction flag WITHIN the transaction', () => {
    const slice = bookUserIdSlice();
    // save({ transaction }) must appear (session + user writes are transactional)
    const txnSaves = slice.match(/\.save\(\{\s*transaction\s*\}\)/g) || [];
    expect(txnSaves.length).toBeGreaterThanOrEqual(2);
  });

  it('rolls back on every early-exit path (not-available, no-user, non-deducting, no-credits)', () => {
    const slice = bookUserIdSlice();
    const rollbacks = slice.match(/await transaction\.rollback\(\)/g) || [];
    // 4 guarded early returns after the transaction opens
    expect(rollbacks.length).toBeGreaterThanOrEqual(4);
  });

  it('commits before the non-transactional notification side effects', () => {
    const slice = bookUserIdSlice();
    const commitIdx = slice.indexOf('await transaction.commit()');
    const firstNotifyIdx = slice.indexOf('sendEmailNotification');
    expect(commitIdx).toBeGreaterThan(-1);
    expect(firstNotifyIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeLessThan(firstNotifyIdx);
  });

  it('rolls back an uncommitted transaction in the catch (no leaked connection)', () => {
    const slice = bookUserIdSlice();
    expect(slice).toMatch(/if\s*\(transaction\s*&&\s*!transaction\.finished\)/);
  });
});
