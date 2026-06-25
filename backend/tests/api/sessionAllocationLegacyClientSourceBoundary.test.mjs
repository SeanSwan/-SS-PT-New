import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceSource = readFileSync(resolve(__dirname, '../../services/SessionAllocationService.mjs'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');
const apiRouteSource = readFileSync(resolve(__dirname, '../../routes/api.mjs'), 'utf8');

describe('legacy session allocation clientSource boundary', () => {
  it('blocks legacy manual paid-session additions for non-deducting client sources', () => {
    const start = serviceSource.indexOf('async addSessionsToUser');
    const end = serviceSource.indexOf('async getUserSessionSummary', start);
    const source = serviceSource.slice(start, end);

    expect(apiRouteSource).toContain("router.use('/sessions', sessionRoutes)");
    expect(routeSource).toContain("router.post('/add-to-user', protect, adminOnly");
    expect(serviceSource).toContain("import { isNonDeductingClient } from './sessionBillingPolicy.mjs';");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(user)');
    expect(source).toContain('Manual paid-session allocation is disabled for free-tracking clients');
    expect(source.indexOf('isNonDeductingClient(user)'))
      .toBeLessThan(source.indexOf('user.availableSessions ='));
  });
});
