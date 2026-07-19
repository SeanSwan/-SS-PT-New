import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { processSessionDeduction } from '../../utils/notification.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');
const unifiedRouteSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');
const unifiedServiceSource = readFileSync(resolve(__dirname, '../../services/sessions/session.service.mjs'), 'utf8');

const routeSlice = (startMarker, endMarker) => {
  const start = routeSource.indexOf(startMarker);
  const end = routeSource.indexOf(endMarker, start + startMarker.length);
  return {
    start,
    end,
    source: routeSource.slice(start, end)
  };
};

const unifiedRouteSlice = (startMarker, endMarker) => {
  const start = unifiedRouteSource.indexOf(startMarker);
  const end = unifiedRouteSource.indexOf(endMarker, start + startMarker.length);
  return {
    start,
    end,
    source: unifiedRouteSource.slice(start, end)
  };
};

describe('session booking clientSource boundary', () => {
  it('defines every non-booking client source in one shared boundary', () => {
    expect(routeSource).toContain("import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';");
    expect(routeSource).not.toContain('NON_DEDUCTING_CLIENT_SOURCES');
    expect(routeSource).not.toContain('const NON_BOOKING_CLIENT_SOURCES');
  });

  it('blocks every non-booking client source from the user-id self-service booking route', () => {
    const { start, end, source } = routeSlice('router.post("/book/:userId"', 'router.post("/:sessionId/book"');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(user)');
  });

  it('blocks every non-booking client source from the session-id self-service booking route', () => {
    const { start, end, source } = routeSlice('router.post("/:sessionId/book"', 'router.post("/book-recurring"');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(user)');
  });

  it('blocks every non-booking client source from the unified client booking service', () => {
    const start = unifiedServiceSource.indexOf('async bookSession(sessionId, user, bookingData = {})');
    const end = unifiedServiceSource.indexOf('async cancelSession', start);
    const source = unifiedServiceSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(unifiedServiceSource).toContain("import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';");
    expect(source).toContain('isNonDeductingClient(client)');
    expect(unifiedRouteSource).toContain("normalizedMessage.includes('booking access')");
  });

  it('normalizes client session balance before unified booking credit checks', () => {
    const start = unifiedServiceSource.indexOf('async bookSession(sessionId, user, bookingData = {})');
    const end = unifiedServiceSource.indexOf('async cancelSession', start);
    const source = unifiedServiceSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('const rawAvailableSessions = Number(client.availableSessions ?? 0);');
    expect(source).toContain('const availableSessionCount = Number.isFinite(rawAvailableSessions) ? rawAvailableSessions : 0;');
    expect(source).toContain('availableSessionCount < creditsRequired');
    expect(source).toContain('have ${availableSessionCount}');
    expect(source).not.toContain('!client.availableSessions || client.availableSessions < creditsRequired');
  });

  it('locks the available session and paid client balance before unified booking deducts credits', () => {
    const start = unifiedServiceSource.indexOf('async bookSession(sessionId, user, bookingData = {})');
    const end = unifiedServiceSource.indexOf('async cancelSession', start);
    const source = unifiedServiceSource.slice(start, end);
    const sessionLoad = source.indexOf('const session = await this.Session.findOne({');
    const clientLoad = source.indexOf('const client = await this.User.findByPk(user.id');
    const deduction = source.indexOf('processSessionDeduction(session, client, transaction)');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(sessionLoad).toBeGreaterThan(-1);
    expect(clientLoad).toBeGreaterThan(sessionLoad);
    expect(deduction).toBeGreaterThan(clientLoad);
    expect(source).toMatch(/this\.Session\.findOne\(\{[\s\S]{0,300}status:\s*'available'[\s\S]{0,220}transaction,[\s\S]{0,120}lock:\s*transaction\.LOCK\.UPDATE/);
    expect(source).toMatch(/this\.User\.findByPk\(user\.id,\s*\{[\s\S]{0,160}transaction,[\s\S]{0,120}lock:\s*transaction\.LOCK\.UPDATE/);
  });

  it('serves the active SessionContext user-id booking route from the unified router', () => {
    const start = unifiedRouteSource.indexOf('router.post("/book/:userId", protect');
    const end = unifiedRouteSource.indexOf('router.post("/:id/book"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('const targetUserId = parseStrictPositiveInteger(req.params.userId);');
    expect(source).toContain('const sessionId = parseStrictPositiveInteger(req.body?.sessionId);');
    expect(source).toContain('Number(req.user.id) !== targetUserId');
    expect(source).toContain("req.user.role !== 'admin'");
    expect(source).toContain('const bookingUser = req.user.role === \'admin\'');
    expect(source).toContain('deductSession: false');
    expect(source).toContain('const result = await unifiedSessionService.bookSession(sessionId, bookingUser, bookingData);');
    expect(source).toContain('return res.status(200).json(result);');
    expect(source).toContain("normalizedMessage.includes('booking access')");
  });

  it('blocks every non-booking client source from recurring self-service booking', () => {
    const { start, end, source } = routeSlice('router.post("/book-recurring"', 'let sessionsToBook = []');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(user)');
  });

  it('serves the active client recurring booking route from the unified router', () => {
    const start = unifiedRouteSource.indexOf('router.post("/book-recurring", protect');
    const end = unifiedRouteSource.indexOf('router.post("/:id/book"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('const requestedSessionIds = Array.isArray(req.body?.sessionIds)');
    expect(source).toContain('parseStrictPositiveInteger(sessionId)');
    expect(source).toContain('isNonDeductingClient(client)');
    expect(source).toContain('processSessionDeduction(session, client, transaction)');
    expect(source).toContain('recurringGroupId');
    expect(source).toContain('return res.status(200).json');
  });

  it('blocks every non-booking client source from custom session requests', () => {
    const start = unifiedRouteSource.indexOf('router.post("/request", protect');
    const end = unifiedRouteSource.indexOf('// ==================== UPCOMING', start);
    const source = unifiedRouteSource.slice(start, end);
    const guard = source.indexOf('isNonDeductingClient(client)');
    const createSession = source.indexOf('Session.create({');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(guard).toBeGreaterThan(-1);
    expect(createSession).toBeGreaterThan(guard);
    expect(source).toContain('Use the Workout Logger to track training.');
  });

  it('only sends recurring booking deduction notifications when a credit was actually deducted', () => {
    const start = unifiedRouteSource.indexOf('router.post("/book-recurring", protect');
    const end = unifiedRouteSource.indexOf('router.post("/:id/book"', start);
    const source = unifiedRouteSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('deductionResultsBySessionId.set(session.id, deductionResult)');
    expect(source).toContain('const deductionResult = deductionResultsBySessionId.get(session.id);');
    expect(source).toContain('if (deductionResult?.creditsDeducted > 0)');
    expect(source).toContain('sendDeductionNotification(session, client)');
  });

  it('self-defends processSessionDeduction against non-deducting client sources', async () => {
    const session = {
      sessionDeducted: false,
      save: async () => {},
    };
    const client = {
      clientSource: 'external',
      availableSessions: 9,
      save: async () => {
        throw new Error('free-tracking clients must not save paid-session deductions');
      },
    };

    const result = await processSessionDeduction(session, client);

    expect(result).toMatchObject({
      success: true,
      deducted: false,
      creditsDeducted: 0,
      message: 'No credits required for this client account',
    });
    expect(client.availableSessions).toBe(9);
    expect(session.sessionDeducted).toBe(true);
  });

  it('self-defends processSessionDeduction against malformed paid-session balances', async () => {
    const session = {
      sessionDeducted: false,
      save: async () => {
        throw new Error('session should not be marked deducted without usable credits');
      },
    };
    const client = {
      clientSource: 'swanstudios',
      availableSessions: 'unknown',
      save: async () => {
        throw new Error('malformed balances must not be saved as NaN');
      },
    };

    const result = await processSessionDeduction(session, client);

    expect(result).toMatchObject({
      success: false,
      deducted: false,
      message: 'Insufficient session credits (need 1, have 0)',
    });
    expect(client.availableSessions).toBe('unknown');
    expect(session.sessionDeducted).toBe(false);
  });

  it('retires the duplicate late-reschedule credit path in favor of the unified endpoint', () => {
    const { start, end, source } = routeSlice('router.put("/reschedule/:sessionId"', 'router.delete("/cancel/:sessionId"');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('return res.status(410).json({');
    expect(source).toContain('PUT /api/sessions/:sessionId/reschedule');
    expect(source).not.toContain('availableSessions -= 1');
  });

  it('blocks every non-booking client source from the no-user-id self-service booking route', () => {
    const { start, end, source } = routeSlice('router.post("/book"', 'router.post("/request"');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(client)');
  });

  it('blocks every non-booking client source from admin-created bookings', () => {
    const { start, end, source } = routeSlice('router.post("/admin/book"', '// Parse session date');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(client)');
  });

  it('serves admin-created schedule bookings while only deducting paid SwanStudios clients', () => {
    const { start, end, source } = unifiedRouteSlice('router.post("/admin/book"', 'router.get("/admin/cancelled"');
    const dynamicRoute = unifiedRouteSource.indexOf('router.get("/:id"');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(start).toBeLessThan(dynamicRoute);
    expect(source).toContain('const shouldDeductPaidCredit = !isNonDeductingClient(client);');
    expect(source).not.toContain('This client account does not have session booking. They track training via the Workout Logger.');
    expect(source).toContain('if (shouldDeductPaidCredit && (!client.availableSessions || client.availableSessions <= 0))');
    expect(source).toContain("const trainer = await User.findByPk(parsedTrainerId, { transaction, lock: transaction.LOCK.UPDATE });");
    expect(source.indexOf('lock: transaction.LOCK.UPDATE')).toBeLessThan(source.indexOf('const trainerConflict = await Session.findOne'));
    expect(source).toContain('let deductionResult = null;');
    expect(source).toContain('if (shouldDeductPaidCredit) {');
    expect(source).toContain('processSessionDeduction(session, client, transaction)');
    expect(source).toContain('unifiedSessionService.sendBookingNotifications(session, client).catch');
    expect(source).toContain('if (deductionResult?.creditsDeducted > 0)');
    expect(source).toContain('sendDeductionNotification(session, client)');
    expect(source).toContain('sessionTypeId, notifyClient');
    expect(source).toContain('const parsedSessionTypeId =');
    expect(source).toContain('const parsedNotifyClient =');
    expect(source).toContain('SessionType.findByPk(parsedSessionTypeId');
    expect(source).toContain('sessionTypeId: parsedSessionTypeId');
    expect(source).toContain('notifyClient: parsedNotifyClient');
    expect(source).toContain('Invalid sessionTypeId');
    expect(source).toContain('Session type is unavailable');
    expect(source).not.toContain('error: error.message');
  });

  it('keeps active session money-path logging free of raw exception objects', () => {
    expect(unifiedRouteSource).toContain('const logSessionRouteError =');

    const routeWindows = [
      unifiedRouteSlice('router.post("/admin/book"', 'router.get("/admin/cancelled"'),
      unifiedRouteSlice('router.patch("/:id/cancel"', 'router.patch("/:id/confirm"'),
      unifiedRouteSlice('router.patch("/:id/complete"', 'router.patch("/:id/assign"'),
      unifiedRouteSlice('router.patch("/:id/attendance"', 'router.post("/:id/feedback"'),
      unifiedRouteSlice('router.post("/:sessionId/charge-cancellation"', 'export default router'),
    ];

    for (const { start, end, source } of routeWindows) {
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      expect(source).not.toMatch(/logger\.(error|warn)\([^;]+,\s*(error|err|rollbackError|broadcastError)\)/);
      expect(source).not.toContain('error: error.message');
    }
  });
});
