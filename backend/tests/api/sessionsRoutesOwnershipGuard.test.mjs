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
    // The legacy router must not take the direct /api/sessions mount. It is
    // still served under the /api fallback via routes/api.mjs (SWA-71's known
    // competing surface) — that is deliberate and tested elsewhere.
    expect(coreRoutesSource).not.toContain("app.use('/api/sessions', sessionRoutes)");
    expect(coreRoutesSource).not.toContain("import sessionRoutes from '../routes/sessionRoutes.mjs';");
    // NOTE: this previously asserted the literal comment
    // "REMOVED: app.use('/api/sessions', sessionRoutes)" existed in
    // core/routes.mjs. SWA-71 corrected that comment on 2026-07-28 because the
    // word REMOVED read as "this router is gone" when it is still reachable, and
    // the assertion broke on the prose change alone. Assert mounts, not comments.
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
    expect(attendanceRoute).toContain('const attendanceRecordedAt = new Date();');
    expect(attendanceRoute).toContain('const attendanceRecorderId = parseStrictPositiveInteger(req.user?.id);');
    expect(attendanceRoute).toContain("message: 'Invalid attendance recorder'");
    expect(attendanceRoute).toContain('markedPresentBy: attendanceRecorderId');
    expect(attendanceRoute).toContain('transaction = await Session.sequelize.transaction();');
    expect(attendanceRoute).toContain('lock: transaction.LOCK.UPDATE');
    expect(attendanceRoute).toContain('const { attendanceStatus, noShowReason, notes, deductSessionCredit } = req.body || {};');
    expect(attendanceRoute).toContain("const trimmedNoShowReason = typeof noShowReason === 'string' && noShowReason.trim()");
    expect(attendanceRoute).toContain("checkInTime: attendanceStatus === 'no_show' ? null : (session.checkInTime || attendanceRecordedAt)");
    expect(attendanceRoute).toContain("noShowReason: attendanceStatus === 'no_show' ? trimmedNoShowReason : null");
    expect(attendanceRoute).toContain("attendanceStatus === 'no_show' && deductSessionCredit === true");
    expect(attendanceRoute).toContain('processSessionDeduction(session, client, transaction)');
    expect(attendanceRoute).toContain('await session.update(updates, { transaction });');
    expect(attendanceRoute).toContain('await transaction.commit();');
    expect(attendanceRoute).toContain('deduction: deductionResult ? {');
  });

  it('forwards cancellation billing choices from the canonical cancel route into the service', () => {
    const cancelRoute = routeSlice('router.patch("/:id/cancel"', 'router.patch("/:id/confirm"');

    expect(cancelRoute).toContain('const { reason, chargeType, chargeAmount, restoreCredit } = req.body || {};');
    expect(cancelRoute).toContain('unifiedSessionService.cancelSession(req.params.id, req.user, reason, {');
    expect(cancelRoute).toContain('chargeType,');
    expect(cancelRoute).toContain('chargeAmount,');
    expect(cancelRoute).toContain('restoreCredit');
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

  it('serves available sessions on the unified router before the id catch-all route', () => {
    const availableRouteIndex = routeSource.indexOf('router.get("/available", protect');
    const idRouteIndex = routeSource.indexOf('router.get("/:id"', availableRouteIndex);
    const availableRoute = routeSlice('router.get("/available"', 'router.get("/:id"');

    expect(availableRouteIndex).toBeGreaterThan(-1);
    expect(idRouteIndex).toBeGreaterThan(availableRouteIndex);
    expect(availableRoute).toContain("status: 'available'");
    expect(availableRoute).toContain('userId: null');
    expect(availableRoute).toContain('[Op.gt]: new Date()');
    expect(availableRoute).toContain("as: 'trainer'");
  });

  it('serves active SessionContext client session reads before the id catch-all route', () => {
    const availableRouteIndex = routeSource.indexOf('router.get("/available", protect');
    const clientRouteIndex = routeSource.indexOf('router.get("/client/:userId", protect');
    const idRouteIndex = routeSource.indexOf('router.get("/:id"', availableRouteIndex);

    expect(clientRouteIndex).toBeGreaterThan(availableRouteIndex);
    expect(clientRouteIndex).toBeLessThan(idRouteIndex);

    const clientRoute = routeSource.slice(clientRouteIndex, idRouteIndex);
    expect(clientRoute).toContain('const targetUserId = parseStrictPositiveInteger(req.params.userId);');
    expect(clientRoute).toContain('const requesterId = Number(req.user.id);');
    expect(clientRoute).toContain("role !== 'admin' && role !== 'trainer' && requesterId !== targetUserId");
    expect(clientRoute).toContain("role === 'trainer'");
    expect(clientRoute).toContain('userId: targetUserId');
    expect(clientRoute).toContain('trainerId: requesterId');
    expect(clientRoute).toContain("order: [['sessionDate', 'DESC']]");
    expect(clientRoute).toContain('return res.status(200).json(clientSessions);');
  });

  it('serves schedule user dropdown routes before the id catch-all route', () => {
    const availableRouteIndex = routeSource.indexOf('router.get("/available", protect');
    const trainerUsersRouteIndex = routeSource.indexOf('router.get("/users/trainers", protect');
    const clientUsersRouteIndex = routeSource.indexOf('router.get("/users/clients", protect');
    const idRouteIndex = routeSource.indexOf('router.get("/:id"', availableRouteIndex);

    expect(trainerUsersRouteIndex).toBeGreaterThan(availableRouteIndex);
    expect(clientUsersRouteIndex).toBeGreaterThan(trainerUsersRouteIndex);
    expect(trainerUsersRouteIndex).toBeLessThan(idRouteIndex);
    expect(clientUsersRouteIndex).toBeLessThan(idRouteIndex);

    const userDropdownRoutes = routeSource.slice(trainerUsersRouteIndex, idRouteIndex);
    // Launch audit 2026-08-03: getTrainers now takes the requesting user so it
    // can withhold trainer/admin contact PII from non-staff callers.
    expect(userDropdownRoutes).toContain('unifiedSessionService.getTrainers(req.user)');
    expect(userDropdownRoutes).toContain('unifiedSessionService.getClients(req.user)');
    expect(userDropdownRoutes).toContain('trainerOrAdminOnly');
  });

  it('serves admin trainer-assignment removal before the id catch-all route', () => {
    const removeRouteIndex = routeSource.indexOf("router.post('/remove-trainer-assignment'");
    const idRouteIndex = routeSource.indexOf('router.get("/:id", protect');

    expect(removeRouteIndex).toBeGreaterThan(-1);
    expect(removeRouteIndex).toBeLessThan(idRouteIndex);

    const removeRoute = routeSource.slice(removeRouteIndex, idRouteIndex);
    expect(removeRoute).toContain('const { sessionIds = [] } = req.body || {};');
    expect(removeRoute).toContain('if (!Array.isArray(sessionIds) || sessionIds.length === 0)');
    expect(removeRoute).toContain('trainerAssignmentService.removeTrainerAssignment(sessionIds, req.user.id)');
    expect(removeRoute).toContain('data: result');
  });

  it('serves trainer and client assignment reads before the id catch-all route', () => {
    const trainerRouteIndex = routeSource.indexOf("router.get('/trainer-assignments/:trainerId'");
    const clientRouteIndex = routeSource.indexOf("router.get('/client-assignments/:clientId'");
    const idRouteIndex = routeSource.indexOf('router.get("/:id", protect');

    expect(trainerRouteIndex).toBeGreaterThan(-1);
    expect(clientRouteIndex).toBeGreaterThan(trainerRouteIndex);
    expect(clientRouteIndex).toBeLessThan(idRouteIndex);

    const assignmentRoutes = routeSource.slice(trainerRouteIndex, idRouteIndex);
    expect(assignmentRoutes).toContain('const trainerId = parseStrictPositiveInteger(req.params.trainerId);');
    expect(assignmentRoutes).toContain("req.user.role !== 'admin'");
    expect(assignmentRoutes).toContain('trainerAssignmentService.getTrainerAssignments(trainerId)');
    expect(assignmentRoutes).toContain('const clientId = parseStrictPositiveInteger(req.params.clientId);');
    expect(assignmentRoutes).toContain('trainerAssignmentService.getClientAssignments(clientId)');
  });

  it('serves client session requests from the unified router before the id catch-all route', () => {
    const requestRouteIndex = routeSource.indexOf('router.post("/request", protect');
    const idRouteIndex = routeSource.indexOf('router.get("/:id", protect');

    expect(requestRouteIndex).toBeGreaterThan(-1);
    expect(requestRouteIndex).toBeLessThan(idRouteIndex);

    const requestRoute = routeSource.slice(requestRouteIndex, idRouteIndex);
    expect(requestRoute).toContain('const { start, end, duration, notes, sessionType, sessionTypeId, location, preferredTrainerId } = req.body || {};');
    expect(requestRoute).toContain('const startDate = new Date(start);');
    expect(requestRoute).toContain('if (Number.isNaN(startDate.getTime())');
    expect(requestRoute).toContain("status: 'requested'");
    expect(requestRoute).toContain('userId: client.id');
    expect(requestRoute).toContain('realTimeScheduleService.broadcastSessionRequest');
  });

  it('serves active SessionContext generic session updates from the unified router', () => {
    const getSessionRouteIndex = routeSource.indexOf('router.get("/:id", protect');
    const updateRouteIndex = routeSource.indexOf('router.put("/:id", protect');
    const createRouteIndex = routeSource.indexOf('router.post("/", protect, adminOnly');

    expect(updateRouteIndex).toBeGreaterThan(getSessionRouteIndex);
    expect(updateRouteIndex).toBeLessThan(createRouteIndex);

    const updateRoute = routeSource.slice(updateRouteIndex, createRouteIndex);
    expect(updateRoute).toContain('const sessionId = parseEditableSessionId(req.params.id);');
    expect(updateRoute).toContain('const session = await Session.findByPk(sessionId);');
    expect(updateRoute).toContain('canAccessSessionRecord(req.user, session, { allowClient: true, allowTrainer: true })');
    expect(updateRoute).toContain("if (req.body?.status === 'completed')");
    expect(updateRoute).toContain('unifiedSessionService.completeSession(sessionId, req.user, {');
    expect(updateRoute).toContain('completeWithoutLog: req.body?.completeWithoutLog === true');
    expect(updateRoute).toContain('const allowedStatusUpdates = new Set');
    expect(updateRoute).toContain("!['admin', 'trainer'].includes(req.user.role)");
    expect(updateRoute).toContain('const editableUpdate = buildEditableSessionUpdate(req.body || {}, session);');
    expect(updateRoute).toContain('if (hasEditableScheduleFields(editableUpdate))');
    expect(updateRoute).toContain('ConflictService.checkConflicts({');
    expect(updateRoute).toContain('session.set(editableUpdate);');
    expect(updateRoute).toContain('await session.save();');
  });

  it('deducts paid credits in the canonical direct-completion fallback', () => {
    const completeRoute = routeSlice('router.patch("/:id/complete"', 'router.patch("/:id/assign"');
    expect(completeRoute).toContain('unifiedSessionService.completeSession(req.params.id, req.user, {');
    expect(completeRoute).toContain('completeWithoutLog: completeWithoutLog === true');
    expect(completeRoute).toContain('deductSessionCredit');

    const completeServiceIndex = serviceSource.indexOf('async completeSession(sessionId, user, completionData = {})');
    const assignServiceIndex = serviceSource.indexOf('async assignTrainer(sessionId, trainerId, user)');
    const completeService = serviceSource.slice(completeServiceIndex, assignServiceIndex);

    expect(completeService).toContain('let deductionResult = null;');
    expect(completeService).toContain('!session.sessionDeducted && session.userId && session.client');
    expect(completeService).toContain('deductSessionCredit === true');
    expect(completeService).toContain('isNonDeductingClient(session.client)');
    expect(completeService).toContain("deductSessionCredit === false ? 'waived_by_manager' : 'deduction_not_requested'");
    expect(completeService).toContain("reason: 'non_deducting_client_account'");
    expect(completeService).toContain('processSessionDeduction(session, session.client, transaction)');
    expect(completeService).toContain('deduction: deductionResult ? {');
  });

  it('serves the active admin sessions single-delete action from the unified router', () => {
    const updateRouteIndex = routeSource.indexOf('router.put("/:id", protect');
    const deleteRouteIndex = routeSource.indexOf('router.delete("/:id", protect, adminOnly');
    const createRouteIndex = routeSource.indexOf('router.post("/", protect, adminOnly');

    expect(deleteRouteIndex).toBeGreaterThan(updateRouteIndex);
    expect(deleteRouteIndex).toBeLessThan(createRouteIndex);

    const deleteRoute = routeSource.slice(deleteRouteIndex, createRouteIndex);
    expect(deleteRoute).toContain('const sessionId = parseStrictPositiveInteger(req.params.id);');
    expect(deleteRoute).toContain('const session = await Session.findByPk(sessionId);');
    expect(deleteRoute).toContain("session.status === 'completed'");
    expect(deleteRoute).toContain('const blockedDeleteStatuses = new Set');
    expect(deleteRoute).toContain('session.sessionDeducted');
    expect(deleteRoute).toContain('canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: false })');
    expect(deleteRoute).toContain('await session.destroy();');
    expect(deleteRoute).toContain("realTimeScheduleService.broadcastEvent('session:deleted'");
  });

  it('serves active admin sessions bulk delete before the single-id delete route', () => {
    const updateRouteIndex = routeSource.indexOf('router.put("/:id", protect');
    const bulkDeleteRouteIndex = routeSource.indexOf('router.delete("/bulk", protect, adminOnly');
    const singleDeleteRouteIndex = routeSource.indexOf('router.delete("/:id", protect, adminOnly');

    expect(bulkDeleteRouteIndex).toBeGreaterThan(updateRouteIndex);
    expect(bulkDeleteRouteIndex).toBeLessThan(singleDeleteRouteIndex);

    const bulkDeleteRoute = routeSource.slice(bulkDeleteRouteIndex, singleDeleteRouteIndex);
    expect(bulkDeleteRoute).toContain('const rawSessionIds = Array.isArray(req.body?.sessionIds)');
    expect(bulkDeleteRoute).toContain('const sessionIds = [...new Set(parsedSessionIds)];');
    expect(bulkDeleteRoute).toContain('const blockedDeleteStatuses = new Set');
    expect(bulkDeleteRoute).toContain('session.sessionDeducted');
    expect(bulkDeleteRoute).toContain('const deletedCount = await Session.destroy');
    expect(bulkDeleteRoute).toContain("realTimeScheduleService.broadcastEvent('session:deleted'");
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
