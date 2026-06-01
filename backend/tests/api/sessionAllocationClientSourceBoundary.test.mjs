import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const unifiedRouteSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');
const unifiedServiceSource = readFileSync(resolve(__dirname, '../../services/sessions/session.service.mjs'), 'utf8');

describe('session allocation clientSource boundary', () => {
  it('blocks manual paid-session allocation for non-deducting client sources', () => {
    const start = unifiedRouteSource.indexOf('router.post("/add-to-user"');
    const end = unifiedRouteSource.indexOf('router.get("/user-summary/:userId"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(unifiedRouteSource).toContain("import { NON_DEDUCTING_CLIENT_SOURCES } from '../services/sessionBillingPolicy.mjs';");
    expect(source).toContain("attributes: ['id', 'firstName', 'lastName', 'availableSessions', 'clientSource']");
    expect(source).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(source).toContain('Manual paid-session allocation is disabled for free-tracking clients');
  });

  it('masks user-summary paid inventory for non-deducting client sources', () => {
    const start = unifiedRouteSource.indexOf('router.get("/user-summary/:userId"');
    const end = unifiedRouteSource.indexOf('router.get("/allocation-health"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("attributes: ['id', 'availableSessions', 'clientSource']");
    expect(source).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(source).toContain('const available = NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(source.indexOf('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)'))
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
    expect(unifiedServiceSource).toContain("import { NON_DEDUCTING_CLIENT_SOURCES } from '../sessionBillingPolicy.mjs';");
    expect(serviceStart).toBeGreaterThan(-1);
    expect(serviceEnd).toBeGreaterThan(serviceStart);
    expect(source).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(source).toContain("user.clientSource = 'swanstudios';");
    expect(source.indexOf('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)'))
      .toBeLessThan(source.indexOf('user.availableSessions ='));
  });
});
