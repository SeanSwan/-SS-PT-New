import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs'), 'utf8');

describe('dailyWorkoutFormRoutes public response hardening', () => {
  it('is mounted at the canonical workout form API path used by workout logging clients', () => {
    const coreRoutes = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
    const nasmApiService = readFileSync(resolve(__dirname, '../../../frontend/src/services/nasmApiService.ts'), 'utf8');
    const workoutLoggerPayload = readFileSync(resolve(__dirname, '../../../frontend/src/components/WorkoutLogger/workoutLoggerSubmitPayload.ts'), 'utf8');

    expect(coreRoutes).toContain("app.use('/api/workout-forms', dailyWorkoutFormRoutes)");
    expect(nasmApiService).toContain("'/api/workout-forms'");
    expect(workoutLoggerPayload).toContain('/api/workout-forms');
  });

  it('does not expose development-only error.message fields in 500 JSON responses', () => {
    expect(routeSource).not.toContain("error: process.env.NODE_ENV === 'development' ? error.message : undefined");
  });

  it('uses the stable internal-error response contract for workout-form 500s', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'INTERNAL_ERROR';");
    expect(routeSource).toContain('const sendInternalError = (res, message) => res.status(500).json({');
    expect(routeSource).toContain('code: INTERNAL_ERROR');
  });

  it('keeps active workout-form logging free of raw exception-message fragments', () => {
    expect(routeSource).toContain('const toWorkoutFormErrorMetadata =');
    expect(routeSource).not.toMatch(/\b(?:error|\w*err(?:or)?)\.message\b/i);
    expect(routeSource).not.toMatch(/logger\.(error|warn)\([^;]+,\s*(?:error|\w*err(?:or)?)\)/i);
    expect(routeSource).not.toContain('error: error.message');
  });

  it('does not echo raw planned-assignment error messages in the workout-form submit path', () => {
    const submitRoute = routeSource.slice(
      routeSource.indexOf("router.post('/', protect, checkTrainerClientRelationship"),
      routeSource.indexOf("router.get('/', protect, trainerOrAdminOnly")
    );

    expect(routeSource).toContain('getPlannedWorkoutAssignmentClientMessage');
    expect(submitRoute).not.toContain('message: error.message');
    expect(submitRoute).toContain('message: getPlannedWorkoutAssignmentClientMessage(error)');
  });

  it('strictly validates workout-form list filters before querying', () => {
    const listRoute = routeSource.slice(
      routeSource.indexOf("router.get('/', protect, trainerOrAdminOnly"),
      routeSource.indexOf("router.get('/:id'", routeSource.indexOf("router.get('/', protect, trainerOrAdminOnly"))
    );

    expect(listRoute).toContain("return res.status(400).json({ success: false, message: 'Invalid page' });");
    expect(listRoute).toContain("return res.status(400).json({ success: false, message: 'Invalid limit' });");
    expect(listRoute).toContain("return res.status(400).json({ success: false, message: 'Invalid clientId' });");
    expect(listRoute).toContain("return res.status(400).json({ success: false, message: 'Invalid trainerId' });");
    expect(listRoute).toContain("return res.status(400).json({ success: false, message: 'Invalid mcpProcessed' });");
    expect(listRoute).toContain("requestingUserRole === 'trainer' && !sameId(parsedTrainerId, requestingUserId)");
    expect(listRoute).not.toMatch(/parseInt\(page|parseInt\(limit|parseInt\(clientId|parseInt\(trainerId/);
    expect(listRoute).not.toContain("mcpProcessed === 'true'");
  });

  it('strictly validates the client workout info route ID before model reads', () => {
    const infoRoute = routeSource.slice(
      routeSource.indexOf("router.get('/client/:clientId/info'"),
      routeSource.indexOf('const checkTrainerPermission', routeSource.indexOf("router.get('/client/:clientId/info'"))
    );

    expect(infoRoute).toContain('const parsedClientId = parseStrictPositiveInteger(clientId);');
    expect(infoRoute).toContain('if (!parsedClientId)');
    expect(infoRoute).toContain('id: parsedClientId');
    expect(infoRoute).toContain('clientId: parsedClientId');
    expect(infoRoute).not.toMatch(/isNaN\(parseInt\(clientId\)|parseInt\(clientId\)/);
  });

  it('exposes clientSource in workout logger info responses so UI can show paid vs courtesy billing state', () => {
    const selfInfoRoute = routeSource.slice(
      routeSource.indexOf("router.get('/my/info'"),
      routeSource.indexOf("router.get('/client/:clientId/info'")
    );
    const clientInfoRoute = routeSource.slice(
      routeSource.indexOf("router.get('/client/:clientId/info'"),
      routeSource.indexOf('const checkTrainerPermission', routeSource.indexOf("router.get('/client/:clientId/info'"))
    );

    expect(selfInfoRoute).toContain("'clientSource'");
    expect(selfInfoRoute).toContain('clientSource: client.clientSource');
    expect(clientInfoRoute).toContain("'clientSource'");
    expect(clientInfoRoute).toContain('clientSource: client.clientSource');
  });

  it('strictly validates the fallback client progress route ID before access checks', () => {
    const progressRoute = routeSource.slice(
      routeSource.indexOf("router.get('/client/:clientId/progress'"),
      routeSource.indexOf("router.get('/client/:clientId/progress-detailed'")
    );

    expect(progressRoute).toContain('const parsedClientId = parseStrictPositiveInteger(clientId);');
    expect(progressRoute).toContain('if (!parsedClientId)');
    expect(progressRoute).not.toMatch(/parseInt\(clientId/);
    expect(progressRoute).not.toContain('isNaN(parsedClientId)');
  });

  it('uses one strict parsed client id through the workout-form submit path', () => {
    const submitRoute = routeSource.slice(
      routeSource.indexOf("router.post('/', protect, checkTrainerClientRelationship"),
      routeSource.indexOf("router.get('/', protect, trainerOrAdminOnly")
    );

    expect(submitRoute).toContain('const userNumericId = parseStrictPositiveInteger(req.user.id);');
    expect(submitRoute).toContain('const parsedClientId = parseStrictPositiveInteger(clientId);');
    expect(submitRoute).toContain("message: 'Valid client ID is required'");
    expect(submitRoute).toContain('isWorkoutSelfLogRole(userRole) && parsedClientId !== userNumericId');
    expect(submitRoute).toContain('clientId: parsedClientId');
    expect(submitRoute).toContain('userId: parsedClientId');
    expect(submitRoute).not.toMatch(/parseInt\(clientId/);
  });

  it('links master-schedule workout logging to the booked Session without double deducting later', () => {
    const submitRoute = routeSource.slice(
      routeSource.indexOf("router.post('/', protect, checkTrainerClientRelationship"),
      routeSource.indexOf("router.get('/', protect, trainerOrAdminOnly")
    );

    expect(routeSource).toContain('getSession,');
    expect(routeSource).toContain('getSessionType,');
    expect(submitRoute).toContain('scheduledSessionId');
    expect(submitRoute).toContain('const parsedScheduledSessionId = parseOptionalPositiveInteger(scheduledSessionId);');
    expect(submitRoute).toContain("message: 'Valid scheduled session ID is required'");
    expect(submitRoute).toContain('const Session = getSession();');
    expect(submitRoute).toContain('linkedScheduledSession = await Session.findByPk(parsedScheduledSessionId');
    expect(submitRoute).toContain('!sameId(linkedScheduledSession.userId, parsedClientId)');
    expect(submitRoute).toContain("linkedScheduledSession.status === 'cancelled'");
    expect(submitRoute).toContain('const workoutDateValue = linkedScheduledSession?.sessionDate');
    expect(submitRoute).toContain("new Date(linkedScheduledSession.sessionDate).toISOString().split('T')[0]");
    expect(submitRoute).toContain('const workoutDateIso = toIsoDateOnly(workoutDateValue);');
    expect(submitRoute).toContain("const workoutDate = new Date(`${workoutDateIso}T00:00:00.000Z`);");
    expect(submitRoute).toContain('date: workoutDateIso');
    expect(submitRoute).toContain('workoutDate: workoutDateIso');
    expect(submitRoute).toContain('sessionId: linkedScheduledSession.id');
    expect(submitRoute).toContain("sessionType: 'trainer-led'");
    expect(submitRoute).toContain('trainerId: linkedScheduledSession.trainerId || attributedTrainerId');
    expect(submitRoute).toContain('await linkedScheduledSession.update({');
    expect(submitRoute).toContain("status: 'completed'");
    expect(submitRoute).toContain("attendanceStatus: 'present'");
    expect(submitRoute).toContain('const SessionType = getSessionType();');
    expect(submitRoute).toContain("attributes: ['id', 'creditsRequired']");
    expect(submitRoute).toContain('scheduledSessionCreditsRequired = sessionType.creditsRequired;');
    expect(submitRoute).toContain('scheduledSessionAlreadyDeducted: linkedScheduledSession?.sessionDeducted === true');
    expect(submitRoute).toContain('creditsRequired: scheduledSessionCreditsRequired');
    expect(submitRoute).toContain('if (billingDecision.shouldDeduct && billingDecision.creditsToDeduct > 0)');
    expect(submitRoute).toContain("await client.decrement('availableSessions', { by: billingDecision.creditsToDeduct");
    expect(submitRoute).toContain('if (billingDecision.sessionDeducted)');
    expect(submitRoute).toContain('await dailyForm.update({ sessionDeducted: true }');
    expect(submitRoute).toContain('const billingReceipt = {');
    expect(submitRoute).toContain('const billingReceiptCreditsRequired = billingDecision.creditsToDeduct > 0');
    expect(submitRoute).toContain('creditsDeducted: billingDecision.creditsToDeduct');
    expect(submitRoute).toContain('creditsRequired: billingReceiptCreditsRequired');
    expect(submitRoute).toContain('remainingSessions: billingReceiptRemainingSessions');
    expect(submitRoute).toContain('billing: billingReceipt');
    expect(submitRoute).toContain('checkInTime: linkedScheduledSession.checkInTime || scheduledSessionCompletionDate');
    expect(submitRoute).toContain('const scheduledSessionAttendanceRecorderId = isSelfWorkoutLogActor');
    expect(submitRoute).toContain('markedPresentBy: scheduledSessionAttendanceRecorderId');
    expect(submitRoute).toContain('attendanceRecordedAt: linkedScheduledSession.attendanceRecordedAt || scheduledSessionCompletionDate');
    expect(submitRoute).toContain('noShowReason: null');
    expect(submitRoute).toContain('sessionDeducted: billingDecision.sessionDeducted');
    expect(submitRoute).toContain('deductionDate: shouldStampScheduledSessionDeduction ? scheduledSessionCompletionDate : linkedScheduledSession.deductionDate');
  });

  it('preserves an already-deducted scheduled session deductionDate when logging the workout later', () => {
    const submitRoute = routeSource.slice(
      routeSource.indexOf("router.post('/', protect, checkTrainerClientRelationship"),
      routeSource.indexOf("router.get('/', protect, trainerOrAdminOnly")
    );

    expect(submitRoute).toContain(
      'const shouldStampScheduledSessionDeduction = billingDecision.shouldDeduct && billingDecision.sessionDeducted;'
    );
    expect(submitRoute).toContain(
      'deductionDate: shouldStampScheduledSessionDeduction ? scheduledSessionCompletionDate : linkedScheduledSession.deductionDate'
    );
  });
});
