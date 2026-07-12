import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceSource = readFileSync(resolve(__dirname, '../../services/SessionAllocationService.mjs'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');
const apiRouteSource = readFileSync(resolve(__dirname, '../../routes/api.mjs'), 'utf8');
const orderRouteSource = readFileSync(resolve(__dirname, '../../routes/orderRoutes.mjs'), 'utf8');

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

  it('retires the duplicate direct reschedule route without touching credits', () => {
    const start = routeSource.indexOf('router.put("/reschedule/:sessionId"');
    const end = routeSource.indexOf('/**', start + 1);
    const rescheduleSource = routeSource.slice(start, end);

    expect(rescheduleSource).toContain('return res.status(410).json({');
    expect(rescheduleSource).toContain('PUT /api/sessions/:sessionId/reschedule');
    expect(rescheduleSource).not.toContain('availableSessions -= 1');
    expect(rescheduleSource).not.toContain('session.sessionDeducted = true');
  });
  it('rolls back order completion when session allocation fails', () => {
    expect(orderRouteSource).toContain('const previousCompletedAt = order.completedAt;');
    expect(orderRouteSource).toContain('order.status = previousStatus;');
    expect(orderRouteSource).toContain('order.completedAt = previousCompletedAt;');
    expect(orderRouteSource).toContain('throw sessionError;');
  });

  it('routes admin order completion through the transactional unified allocator', () => {
    expect(orderRouteSource).toContain("import unifiedSessionService from '../services/sessions/session.service.mjs';");
    expect(orderRouteSource).toContain('await unifiedSessionService.allocateSessionsFromOrder(orderId, order.userId)');
    expect(orderRouteSource).not.toContain("import sessionAllocationService from '../services/SessionAllocationService.mjs';");
  });
});
