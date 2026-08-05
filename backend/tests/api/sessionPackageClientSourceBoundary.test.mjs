import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRouteSource = readFileSync(resolve(__dirname, '../../routes/sessionPackageRoutes.mjs'), 'utf8');
const packageManualGrantRouteSource = readFileSync(
  resolve(__dirname, '../../routes/sessionPackageManualGrantRoutes.mjs'),
  'utf8',
);
const packageFulfillmentSource = readFileSync(
  resolve(__dirname, '../../services/sessionPackageCheckoutFulfillmentService.mjs'),
  'utf8',
);
const adminClientControllerSource = readFileSync(resolve(__dirname, '../../controllers/adminClientController.mjs'), 'utf8');

describe('session package clientSource boundary', () => {
  it('blocks manual package credit grants for non-deducting client sources', () => {
    const start = packageManualGrantRouteSource.indexOf("router.post('/add-sessions'");
    const end = packageManualGrantRouteSource.indexOf("router.post('/add-test-sessions'", start);
    const source = packageManualGrantRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(packageManualGrantRouteSource).toContain("import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';");
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain('Manual paid-session grants are disabled for free-tracking clients');
  });

  it('returns clientSource in admin billing overview and masks paid credits for free-tracking clients', () => {
    const start = adminClientControllerSource.indexOf('async getBillingOverview');
    const end = adminClientControllerSource.indexOf('async getMCPStatus', start);
    const source = adminClientControllerSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(adminClientControllerSource).toContain('normalizePaidSessionCount');
    expect(source).toContain("attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'clientSource', 'sessionBillingMode']");
    expect(source).toContain('const clientIsNonDeducting = isNonDeductingClient(client);');
    expect(source).toContain('const sessionsRemaining = normalizePaidSessionCount(client.availableSessions);');
    expect(source).toContain('clientSource: client.clientSource');
    expect(source).toContain('sessionsRemaining: clientIsNonDeducting ? 0 : sessionsRemaining');
    expect(source).not.toContain('sessionsRemaining: clientIsNonDeducting ? 0 : (client.availableSessions || 0)');
  });

  it('blocks production test-session grants for non-deducting client sources', () => {
    const start = packageManualGrantRouteSource.indexOf("router.post('/add-test-sessions'");
    const end = packageManualGrantRouteSource.indexOf('export default router', start);
    const source = packageManualGrantRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("router.post('/add-test-sessions', protect, adminOnly");
    expect(source).toContain("ENABLE_TEST_SESSION_GRANTS"); // F3: allowlist gate (was a NODE_ENV===production blacklist)
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain('Test session grants are disabled for free-tracking clients');
  });

  it('converts legacy Stripe package grants to SwanStudios paid source before future deductions', () => {
    expect(packageRouteSource).toContain('await fulfillSessionPackageCheckoutSession(session);');
    expect(packageFulfillmentSource).toContain('const userPackageUpdate = {');
    expect(packageFulfillmentSource).toContain('hasPurchasedBefore: true');
    expect(packageFulfillmentSource).toContain('completedAt: fulfilledAt');
    expect(packageFulfillmentSource).toContain('paymentAppliedAt: fulfilledAt');
    expect(packageFulfillmentSource).toContain('lastPurchaseDate: fulfilledAt');
    expect(packageFulfillmentSource).toContain("userPackageUpdate.role = 'client';");
    expect(packageFulfillmentSource).toContain("userPackageUpdate.clientSource = 'swanstudios';");
    expect(packageFulfillmentSource).toContain("userPackageUpdate.sessionBillingMode = 'paid_sessions';");
    expect(packageFulfillmentSource).toContain('isNonDeductingClient(user)');
    expect(packageFulfillmentSource).toContain('await user.update(userPackageUpdate, { transaction });');
  });
});
