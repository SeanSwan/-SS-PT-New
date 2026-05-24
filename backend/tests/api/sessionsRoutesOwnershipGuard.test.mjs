import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');
const serviceSource = readFileSync(resolve(__dirname, '../../services/sessions/session.service.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

const routeSlice = (startMarker, endMarker) => {
  const start = routeSource.indexOf(startMarker);
  const end = routeSource.indexOf(endMarker, start + startMarker.length);
  return routeSource.slice(start, end);
};

describe('unified sessions route ownership guards', () => {
  it('keeps the unified sessions router as the mounted /api/sessions surface', () => {
    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(coreRoutesSource).toContain("REMOVED: app.use('/api/sessions', sessionRoutes)");
  });

  it('uses type-safe self/trainer/admin session record checks for session utility routes', () => {
    expect(routeSource).toContain('const canAccessSessionRecord = (user, session, { allowClient = true, allowTrainer = true } = {}) => {');
    expect(routeSource).toContain('if (user.role === \'admin\') return true;');
    expect(routeSource).toContain("user.role === 'client' && Number(session.userId) === requesterId");
    expect(routeSource).toContain("user.role === 'trainer' && Number(session.trainerId) === requesterId");

    const feedbackRoute = routeSlice('router.post("/:id/feedback"', 'router.get("/:id/cancel-warning"');
    expect(feedbackRoute).toContain('const sessionId = parseStrictPositiveInteger(req.params.id);');
    expect(feedbackRoute).toContain('const rating = parseBoundedPositiveInteger(req.body.rating, 5);');
    expect(feedbackRoute).toContain('canAccessSessionRecord(req.user, session, { allowClient: true, allowTrainer: false })');
    expect(feedbackRoute).not.toContain('session.userId !== req.user.id');

    const cancelWarningRoute = routeSlice('router.get("/:id/cancel-warning"', 'router.get("/:id/client-package-price"');
    expect(cancelWarningRoute).toContain('const sessionId = parseStrictPositiveInteger(req.params.id);');
    expect(cancelWarningRoute).toContain('canAccessSessionRecord(req.user, session, { allowClient: true, allowTrainer: true })');

    const packagePriceRoute = routeSlice('router.get("/:id/client-package-price"', 'router.post("/:sessionId/charge-cancellation"');
    expect(packagePriceRoute).toContain('const sessionId = parseStrictPositiveInteger(req.params.id);');
    expect(packagePriceRoute).toContain('canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: true })');

    const attendanceRoute = routeSlice('router.patch("/:id/attendance"', 'router.post("/:id/feedback"');
    expect(attendanceRoute).toContain('const sessionId = parseStrictPositiveInteger(req.params.id);');
    expect(attendanceRoute).toContain('canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: true })');
  });

  it('allows client self upcoming/history reads with string JWT IDs and clamps list limits', () => {
    const upcomingRoute = routeSlice('router.get("/upcoming/:userId"', 'router.get("/history/:userId"');
    const historyRoute = routeSlice('router.get("/history/:userId"', '// ==================== SESSION ALLOCATION COMPATIBILITY ENDPOINTS');

    for (const source of [upcomingRoute, historyRoute]) {
      expect(source).toContain('const targetUserId = parseStrictPositiveInteger(req.params.userId);');
      expect(source).toContain('const requesterId = Number(req.user.id);');
      expect(source).toContain('requesterId !== targetUserId');
      expect(source).toContain('const limit = parseBoundedPositiveInteger(req.query.limit, 50) || 10;');
      expect(source).not.toContain('Number(req.query.limit) || 10');
    }
  });

  it('uses numeric ownership comparisons inside the unified session service', () => {
    expect(serviceSource).toContain('const isOwnSession = Number(session.userId) === Number(user.id);');
    expect(serviceSource).toContain("const isTrainerSession = user.role === 'trainer' && Number(session.trainerId) === Number(user.id);");
    expect(serviceSource).toContain("const isTrainer = user.role === 'trainer' && Number(session.trainerId) === Number(user.id);");
    expect(serviceSource).toContain('const isOwner = Number(session.userId) === Number(user.id);');
    expect(serviceSource).toContain("if (user.role === 'trainer' && Number(session.trainerId) !== Number(user.id))");
    expect(serviceSource).not.toContain('session.trainerId === user.id');
    expect(serviceSource).not.toContain('session.userId === user.id');
    expect(serviceSource).not.toContain('session.trainerId !== user.id');
  });
});
