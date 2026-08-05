import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/adminEnterpriseRoutes.mjs'), 'utf8');

describe('admin enterprise route truth contracts', () => {
  it('does not report synthetic system health for unchecked services', () => {
    expect(routeSource).not.toContain("status: 'healthy', // TODO: Test Redis connection");
    expect(routeSource).not.toContain('responseTime: 5');
    expect(routeSource).not.toContain('responseTime: 50');
    expect(routeSource).not.toContain('errorRate: 0.01');
    expect(routeSource).not.toContain('usage: 45');
    expect(routeSource).not.toContain('percentage: 99.9');
    expect(routeSource).toContain("verificationStatus: 'not_checked'");
    expect(routeSource).toContain('healthVerified: false');
  });

  it('does not claim unimplemented admin actions succeeded', () => {
    expect(routeSource).not.toContain('Post ${action}ed successfully');
    expect(routeSource).not.toContain('Alert ${alertId} acknowledged');
    expect(routeSource).toContain('createNotImplementedError');
    expect(routeSource).toContain('statusCode = 501');
  });

  it('does not report unconnected enterprise features as fully available', () => {
    expect(routeSource).not.toContain('allAvailable: true');
    expect(routeSource).not.toContain('socialMediaManagement: true');
    expect(routeSource).not.toContain('realTimeMonitoring: true');
    expect(routeSource).not.toContain('advancedAnalytics: true');
    expect(routeSource).toContain('allAvailable: false');
    expect(routeSource).toContain('verificationStatus');
  });

  it('labels unconnected read-only social endpoints and keeps the alert stub retired', () => {
    expect(routeSource).not.toContain('// TODO: Implement real social media posts fetching');
    expect(routeSource).not.toContain('// TODO: Implement real social media analytics');
    expect(routeSource).not.toContain('// TODO: Implement real alert system');
    expect(routeSource).toContain('providerConnected: false');
    // SWA-138 S4: the never-connected /alerts/active + /alerts/:id/acknowledge
    // stubs are RETIRED — per-admin ack/archive lives at /api/admin/alert-state.
    expect(routeSource).not.toContain("router.get('/alerts/active'");
    expect(routeSource).not.toContain('alertStoreConnected: false');
    expect(routeSource).toContain('adminAlertStateRoutes.mjs');
  });

  it('does not expose raw operational errors in admin enterprise responses', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).toContain('sendFailure');
    expect(routeSource).not.toMatch(/error:\s*error\.message/);
  });

  it('keeps social post pagination strictly bounded', () => {
    expect(routeSource).toContain('parseBoundedInteger');
    expect(routeSource).toContain('max: 100');
    expect(routeSource).toContain('max: 10000');
    expect(routeSource).toContain('Limit and offset must be bounded integers');
    expect(routeSource).not.toContain('pagination: { limit: parseInt(limit), offset: parseInt(offset) }');
  });
});
