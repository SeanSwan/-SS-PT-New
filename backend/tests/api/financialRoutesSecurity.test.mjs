import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/financialRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('financial routes security', () => {
  it('keeps the financial availability check authenticated', () => {
    expect(coreRoutesSource).toContain("app.use('/api/financial', financialRoutes)");
    expect(routeSource).toContain("router.get('/test', protect");
    expect(routeSource).not.toContain('EXCEPT test endpoint');
  });

  it('does not expose deployment marker strings from the availability check', () => {
    const testRouteBody = routeSource.slice(
      routeSource.indexOf("router.get('/test'"),
      routeSource.indexOf('// Apply authentication to all financial routes.')
    );

    expect(testRouteBody).not.toContain('NEW_CODE_DEPLOYED');
    expect(testRouteBody).not.toContain('endpoint:');
    expect(testRouteBody).not.toContain('deployment confirmed');
    expect(testRouteBody).not.toContain('console.log');
    expect(testRouteBody).toContain("message: 'Financial routes are available'");
  });

  it('does not log or echo raw checkout-start payment metadata', () => {
    const checkoutRouteBody = routeSource.slice(
      routeSource.indexOf("router.post('/track-checkout-start'"),
      routeSource.indexOf("router.post('/log-transaction'")
    );

    expect(checkoutRouteBody).not.toContain('console.log');
    expect(checkoutRouteBody).not.toContain('body: req.body');
    expect(checkoutRouteBody).not.toContain('sessionIdValue');
    expect(checkoutRouteBody).not.toContain('cartIdValue');
    expect(checkoutRouteBody).not.toContain('amountValue');
    expect(checkoutRouteBody).not.toContain('received:');
    expect(checkoutRouteBody).toContain('hasSessionId: !!req.body.sessionId');
  });

  it('does not expose raw financial route errors to clients', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).toContain('function sendInternalError(res, message)');
    expect(routeSource).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
    expect(routeSource).not.toContain('error: error.message');
  });

  it('strictly parses checkout tracking cart and amount inputs', () => {
    const checkoutRouteBody = routeSource.slice(
      routeSource.indexOf("router.post('/track-checkout-start'"),
      routeSource.indexOf("router.post('/log-transaction'")
    );

    expect(routeSource).toContain('function parsePositiveInteger(value)');
    expect(routeSource).toContain('function parsePositiveAmount(value)');
    expect(checkoutRouteBody).toContain('const normalizedCartId = parsePositiveInteger(cartId)');
    expect(checkoutRouteBody).toContain('const normalizedAmount = parsePositiveAmount(amount)');
    expect(checkoutRouteBody).not.toContain('cartId: parseInt(cartId)');
    expect(checkoutRouteBody).not.toContain('amount: parseFloat(amount)');
  });

  it('does not treat adminView=false as admin view and bounds analytics day ranges', () => {
    expect(routeSource).toContain("const wantsAdminView = adminView === true || adminView === 'true'");
    expect(routeSource).toContain('if (!wantsAdminView || req.user.role !==');
    expect(routeSource).toContain('const dayCount = Math.min(parsePositiveInteger(days) || 30, 365)');
    expect(routeSource).toContain('startDate.setDate(endDate.getDate() - dayCount)');
  });

  it('gates GET /metrics with the adminOnly middleware, not a client-supplied flag', () => {
    // Regression 2026-08-04: the gate was `if (adminOnly && role !== 'admin')` where
    // `adminOnly` came from req.query and defaulted to false — so any authenticated
    // user who omitted the param received company-wide financials. It must be gated by
    // the same middleware its siblings use, and must NOT read the flag from the query.
    expect(routeSource).toContain("router.get('/metrics', adminOnly,");
    expect(routeSource).not.toContain('adminOnly = false');
    expect(routeSource).not.toMatch(/if \(adminOnly && req\.user\.role !== 'admin'\)/);
  });
});
