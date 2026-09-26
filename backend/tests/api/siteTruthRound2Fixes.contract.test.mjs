import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Round-2 hostile-review fix contracts (2026-09-26).
 * ============================================================================
 * Grep contracts pinning the fix shape for findings that came out of the
 * hostile re-review of the C1/H1-H5 commits plus the site-truth fixes shipped
 * in the same pass. House style: moneyPathInvariants.contract.test.mjs.
 */
const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');

describe('follow feature: notification type enum drift', () => {
  it('the model allowlist exports NOTIFICATION_TYPES and includes new_follower', () => {
    const model = read('models/Notification.mjs');
    expect(model).toMatch(/export const NOTIFICATION_TYPES/);
    expect(model).toMatch(/'new_follower'/);
    expect(model).toMatch(/args:\s*\[NOTIFICATION_TYPES\]/);
  });

  it('admin test-broadcast pre-validates the type instead of 500-ing', () => {
    const admin = read('routes/admin.mjs');
    const section = admin.slice(admin.indexOf('/test-notifications'));
    expect(section).toMatch(/NOTIFICATION_TYPES\.includes\(type\)/);
  });
});

describe('client onboarding: raw INSERT column names match the real schema', () => {
  it('assignments INSERT uses quoted camelCase columns (snake_case names do not exist)', () => {
    const source = read('routes/clientOnboardRoutes.mjs');
    expect(source).toMatch(/INSERT INTO client_trainer_assignments \("clientId", "trainerId", "assignedBy", "status", "createdAt", "updatedAt"\)/);
    expect(source).not.toMatch(/INSERT INTO client_trainer_assignments \(client_id/);
  });

  it('client notes INSERT uses quoted camelCase columns', () => {
    const source = read('routes/clientOnboardRoutes.mjs');
    expect(source).toMatch(/INSERT INTO client_notes \("userId", "trainerId", "noteType", "content", "createdAt", "updatedAt"\)/);
    expect(source).not.toMatch(/INSERT INTO client_notes \(user_id/);
  });
});

describe('credential logging: Layer-1 request log redacts the URL', () => {
  it('app.mjs routes the INCOMING REQUEST line through redactRequestUrl', () => {
    const app = read('core/app.mjs');
    expect(app).toMatch(/import\s*\{\s*setupMiddleware,\s*redactRequestUrl\s*\}/);
    expect(app).toMatch(/INCOMING REQUEST.*\$\{redactRequestUrl\(url\)\}/);
  });
});

describe('unified session service: allocation claim (sibling of H4/H5)', () => {
  it('locks the order row and no-ops when the marker is set', () => {
    const svc = read('services/sessions/session.service.mjs');
    const alloc = svc.slice(svc.indexOf('allocateSessionsFromOrder(orderId, userId)'));
    expect(alloc).toMatch(/paymentAppliedAt/);
    expect(alloc).toMatch(/alreadyAllocated:\s*true/);
    // row lock in validateOrderAndUser
    const validate = svc.slice(svc.indexOf('async validateOrderAndUser(orderId, userId, transaction)'));
    expect(validate.slice(0, 900)).toMatch(/lock:\s*\{/);
  });

  it('financial record is best-effort POST-commit (an INSERT failure must not poison the grant)', () => {
    const svc = read('services/sessions/session.service.mjs');
    const alloc = svc.slice(
      svc.indexOf('allocateSessionsFromOrder(orderId, userId)'),
      svc.indexOf('catch (error)', svc.indexOf('allocateSessionsFromOrder(orderId, userId)'))
    );
    const claimIdx = alloc.indexOf('paymentAppliedAt: order.paymentAppliedAt');
    const commitIdx = alloc.indexOf('await transaction.commit()');
    const ftIdx = alloc.indexOf('createFinancialTransactionRecord(order, sessionData);');
    expect(claimIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(claimIdx);
    expect(ftIdx).toBeGreaterThan(commitIdx);
  });
});

describe('frontend: cross-user and withheld-grant states', () => {
  it('logout clears the persisted active client (stale cross-user state)', () => {
    const auth = readFileSync(resolve(root, '../frontend/src/context/AuthContext.tsx'), 'utf8');
    const logout = auth.slice(auth.indexOf('const logout'), auth.indexOf('const register'));
    expect(logout).toMatch(/sessionStorage\.removeItem\('ss-active-client'\)/);
  });

  it('SuccessPage routes AMOUNT_MISMATCH to the support-review state, not success', () => {
    const page = readFileSync(resolve(root, '../frontend/src/components/NewCheckout/SuccessPage.tsx'), 'utf8');
    expect(page).toMatch(/requiresSupportReview\s*\|\|\s*responseError\?\.code\s*===\s*'AMOUNT_MISMATCH'/);
  });
});
