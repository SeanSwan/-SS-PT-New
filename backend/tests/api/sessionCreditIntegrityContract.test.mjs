/**
 * sessionCreditIntegrityContract.test.mjs
 * =======================================
 * Source-contract locks for the two CRITICAL session-credit money bugs (hostile review
 * round 5, 2026-07-11). These paths carry heavy transaction/row-lock machinery, so they
 * are pinned as source contracts (the same style as storefrontPublicSpecialHiddenContract)
 * to guarantee the specific fix can't silently regress; runtime behavior is covered by the
 * existing session suites.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const legacyBook = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');
const unified = readFileSync(resolve(__dirname, '../../services/sessions/session.service.mjs'), 'utf8');

describe('F1 — the legacy /:sessionId/book handler records the deduction on the session', () => {
  // The invariant the whole money system trusts: a credit was taken <=> sessionDeducted===true.
  // completeSession + the settlement sweep only deduct when it's FALSE; cancelSession only
  // restores when it's TRUE. The book handler took the credit but left the flag false ->
  // double-deduct at completion/settlement + lost credit on cancel.
  it('sets session.sessionDeducted = true in the same block that decrements the balance', () => {
    const start = legacyBook.indexOf('router.post("/:sessionId/book"');
    expect(start).toBeGreaterThan(-1);
    const body = legacyBook.slice(start, start + 4000);
    // The deduction and the flag must both be present in the handler.
    expect(body).toMatch(/user\.availableSessions\s*-=\s*1/);
    expect(body).toMatch(/session\.sessionDeducted\s*=\s*true/);
  });
});

describe('F2 — allocateSessionsFromOrder is idempotent for ALL callers', () => {
  // The webhook guarded on order.paymentAppliedAt BEFORE calling, but the admin route
  // POST /allocate-from-order called the service directly with no guard -> a re-click
  // double-granted sessions and inserted a duplicate FinancialTransaction for the same amount.
  it('checks for an existing FinancialTransaction on the order before granting', () => {
    const start = unified.indexOf('async allocateSessionsFromOrder(');
    expect(start).toBeGreaterThan(-1);
    const body = unified.slice(start, start + 1600);
    // Natural-key idempotency: findOne on FinancialTransaction by orderId, then early return.
    expect(body).toMatch(/FinancialTransaction\.findOne\(\s*\{[\s\S]*orderId/);
    expect(body).toMatch(/alreadyAllocated:\s*true/);
  });

  it('row-locks the order so concurrent allocations serialize', () => {
    const start = unified.indexOf('async validateOrderAndUser(');
    const body = unified.slice(start, start + 900);
    expect(body).toMatch(/lock:\s*\{[\s\S]*of:\s*this\.Order/);
  });
});
