import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const apiRoutesSource = readFileSync(resolve(__dirname, '../../routes/api.mjs'), 'utf8');
const unifiedRouteSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');
const legacyRouteSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');
const unifiedServiceSource = readFileSync(resolve(__dirname, '../../services/sessions/session.service.mjs'), 'utf8');

/**
 * Comments must be stripped before ANY mount-order indexOf. core/routes.mjs carries a
 * NOTE that quotes "the `app.use('/api', apiRoutes)` fallback", and that comment sits
 * ABOVE the exact /api/sessions mount while the real aggregate mount sits far BELOW
 * it — so a raw indexOf resolves the aggregate to the comment and the ordering check
 * fails while the mounts are in fact correctly ordered. Same defect fixed in
 * tests/unit/supportIssueSchemaContract.test.mjs.
 *
 * No line numbers on purpose: editing that comment block shifts every line after it,
 * which already invalidated the numbers an earlier version of this note quoted.
 */
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');
const coreRoutesCode = stripComments(coreRoutesSource);

describe('session allocation clientSource boundary', () => {
  it('keeps manual allocation on the unified sessions router ahead of the legacy aggregate fallback', () => {
    const unifiedMount = coreRoutesCode.indexOf("app.use('/api/sessions', sessionsRoutes)");
    const aggregateMount = coreRoutesCode.indexOf("app.use('/api', apiRoutes)");
    const unifiedAllocation = unifiedRouteSource.indexOf('router.post("/add-to-user", protect, adminOnly');
    const legacyAllocation = legacyRouteSource.indexOf("router.post('/add-to-user', protect, adminOnly");

    expect(unifiedMount).toBeGreaterThan(-1);
    expect(aggregateMount).toBeGreaterThan(unifiedMount);
    expect(apiRoutesSource).toContain("router.use('/sessions', sessionRoutes)");
    expect(unifiedAllocation).toBeGreaterThan(-1);
    expect(legacyAllocation).toBeGreaterThan(-1);
  });

  it('blocks manual paid-session allocation for non-deducting client sources', () => {
    const start = unifiedRouteSource.indexOf('router.post("/add-to-user"');
    const end = unifiedRouteSource.indexOf('router.get("/user-summary/:userId"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(unifiedRouteSource).toContain("import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';");
    expect(source).toContain("attributes: ['id', 'firstName', 'lastName', 'availableSessions', 'clientSource', 'sessionBillingMode']");
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain('Manual paid-session allocation is disabled for no-pay/free-tracking clients');
  });

  it('writes an append-only audit row for manual session grants without blocking the grant', () => {
    const start = unifiedRouteSource.indexOf('router.post("/add-to-user"');
    const end = unifiedRouteSource.indexOf('router.get("/user-summary/:userId"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(unifiedRouteSource).toContain(
      'import AdminAccountAuditLog from "../models/AdminAccountAuditLog.mjs";'
    );
    expect(source).toContain('const previousAvailableSessions = Number(user.availableSessions || 0);');
    expect(source).toContain("action: 'manual_session_grant'");
    expect(source).toContain('previousState: { availableSessions: previousAvailableSessions }');
    expect(source).toContain('nextState: { availableSessions }');
    // Snapshot must be captured BEFORE the atomic increment mutates the row.
    expect(source.indexOf('const previousAvailableSessions'))
      .toBeLessThan(source.indexOf("user.increment('availableSessions'"));
    // Audit write is fail-soft: wrapped in its own try/catch that only warns.
    expect(source).toContain('Manual session grant audit write failed:');
    expect(source.indexOf('AdminAccountAuditLog.create'))
      .toBeLessThan(source.indexOf('broadcastAllocationUpdated'));
  });

  it('masks user-summary paid inventory for non-deducting client sources', () => {
    const start = unifiedRouteSource.indexOf('router.get("/user-summary/:userId"');
    const end = unifiedRouteSource.indexOf('router.get("/allocation-health"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("attributes: ['id', 'availableSessions', 'clientSource', 'sessionBillingMode']");
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain('const available = isNonDeductingClient(user)');
    expect(source.indexOf('isNonDeductingClient(user)'))
      .toBeLessThan(source.indexOf('return res.status(200).json'));
  });

  it('converts paid order allocation users to SwanStudios before future deductions', () => {
    const routeStart = unifiedRouteSource.indexOf('router.post("/allocate"');
    const routeEnd = unifiedRouteSource.indexOf('router.patch("/:id/attendance"', routeStart);
    const routeSource = unifiedRouteSource.slice(routeStart, routeEnd);
    const serviceStart = unifiedServiceSource.indexOf('async updateUserSessionBalance');
    const serviceEnd = unifiedServiceSource.indexOf('async createFinancialTransactionRecord', serviceStart);
    const source = unifiedServiceSource.slice(serviceStart, serviceEnd);

    expect(routeStart).toBeGreaterThan(-1);
    expect(routeEnd).toBeGreaterThan(routeStart);
    expect(routeSource).toContain('unifiedSessionService.allocateSessionsFromOrder(orderId, userId)');
    expect(unifiedServiceSource).toContain("import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';");
    expect(serviceStart).toBeGreaterThan(-1);
    expect(serviceEnd).toBeGreaterThan(serviceStart);
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain("{ clientSource: 'swanstudios', sessionBillingMode: 'paid_sessions' }");
    expect(source).toContain('await user.update(billingPolicyUpdate, { transaction });');
    expect(source.indexOf('isNonDeductingClient(user)'))
      .toBeLessThan(source.indexOf('user.availableSessions ='));
  });
});
