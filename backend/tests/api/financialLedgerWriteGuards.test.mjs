/**
 * ============================================================================
 * FINANCIAL LEDGER WRITE GUARDS  (money-path audit, 2026-07-28, SWA-75)
 * ============================================================================
 *
 * THE DEFECT THIS LOCKS OUT
 * `POST /api/financial/log-transaction` was mounted live at `/api/financial`
 * and guarded by `protect` ONLY — any authenticated user. It:
 *
 *   1. UPDATED an existing FinancialTransaction matched ONLY on
 *      `stripePaymentIntentId`, with NO ownership check. Supplying another
 *      user's payment-intent id let a client overwrite that row's status,
 *      refundAmount, feeAmount, netAmount, processedAt, failureReason and
 *      metadata — marking a real payment refunded/failed or restating amounts.
 *   2. CREATED rows from a client-supplied `amount`, so a user could fabricate
 *      ledger entries attributed to themselves.
 *   3. Accepted client-supplied `ipAddress`/`userAgent`, letting the caller
 *      forge the audit trail of its own write.
 *
 * `POST /api/financial/update-metrics` had the same authn-only gap and writes
 * the BusinessMetrics rows the admin revenue dashboards read. Its sibling
 * `/calculate-metrics` already enforced admin inline — this one was missed.
 *
 * WHY IT SURVIVED EARLIER HARDENING
 * `financialRoutesSecurity.test.mjs` hardened `/track-checkout-start` and error
 * disclosure, and it uses the string "router.post('/log-transaction'" purely as
 * a SLICE BOUNDARY when carving out the checkout handler. The vulnerable
 * endpoint was literally the marker that terminated the audited region.
 *
 * These are source-contract assertions to match the file's existing style; the
 * behavioural equivalents would require booting the financial stack.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(__dirname, '../../routes/financialRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

/** Body of a single route handler, from its declaration to the next one. */
function handlerBody(startMarker) {
  const start = routeSource.indexOf(startMarker);
  expect(start, `${startMarker} not found`).toBeGreaterThan(-1);
  const next = routeSource.indexOf('\nrouter.', start + startMarker.length);
  return routeSource.slice(start, next === -1 ? routeSource.length : next);
}

describe('financial ledger writes are admin-gated', () => {
  it('is mounted where we think it is', () => {
    expect(coreRoutesSource).toContain("app.use('/api/financial', financialRoutes)");
  });

  it('gates log-transaction behind adminOnly', () => {
    expect(routeSource).toContain("router.post('/log-transaction', adminOnly,");
  });

  it('gates update-metrics behind adminOnly', () => {
    expect(routeSource).toContain("router.post('/update-metrics', adminOnly,");
  });

  it('keeps calculate-metrics admin-restricted', () => {
    const body = handlerBody("router.post('/calculate-metrics'");
    expect(body).toMatch(/req\.user\.role\s*!==\s*'admin'/);
  });

  it('imports adminOnly rather than re-implementing a role check', () => {
    expect(routeSource).toMatch(/import\s*\{[^}]*adminOnly[^}]*\}\s*from\s*'\.\.\/middleware\/authMiddleware\.mjs'/);
  });

  // The one financial endpoint the app actually calls must stay reachable to
  // ordinary clients, or checkout tracking breaks.
  it('leaves track-checkout-start reachable by a normal authenticated client', () => {
    expect(routeSource).toContain("router.post('/track-checkout-start', async");
    expect(routeSource).not.toContain("router.post('/track-checkout-start', adminOnly");
  });

  it('still authenticates every financial route at the router level', () => {
    expect(routeSource).toContain('router.use(protect)');
  });
});

describe('ledger audit fields cannot be forged by the caller', () => {
  it('does not destructure ipAddress/userAgent from the request body', () => {
    const body = handlerBody("router.post('/log-transaction'");
    const destructure = body.slice(body.indexOf('const {'), body.indexOf('} = req.body;'));
    expect(destructure).not.toMatch(/\bipAddress\b/);
    expect(destructure).not.toMatch(/\buserAgent\b/);
  });

  it('observes ip and user-agent from the request instead', () => {
    const body = handlerBody("router.post('/log-transaction'");
    expect(body).toContain('ipAddress: req.ip');
    expect(body).toContain("userAgent: req.headers['user-agent']");
    // the old forgeable form must not return
    expect(body).not.toContain('ipAddress: ipAddress ||');
    expect(body).not.toContain('userAgent: userAgent ||');
  });
});

describe('financial reads stay scoped to the caller', () => {
  it('forces a non-admin transactions query to the caller\'s own userId', () => {
    const body = handlerBody("router.get('/transactions'");
    expect(body).toMatch(/if \(!wantsAdminView \|\| req\.user\.role !== 'admin'\)/);
    expect(body).toContain('whereClause.userId = userId');
  });

  it('does not treat the string "false" as an admin view', () => {
    expect(routeSource).toContain("const wantsAdminView = adminView === true || adminView === 'true'");
  });
});
