import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('SessionDetailModal auth pipeline', () => {
  it('covers the mounted schedule detail modal and unified session action APIs', () => {
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const modalStackSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleConnectedModals.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const sessionsRoutesSource = readSource('backend/routes/sessions.mjs');

    expect(scheduleSource).toContain("import ScheduleModals from './components/ScheduleModals'");
    expect(scheduleSource).toContain('<ScheduleModals');
    expect(scheduleSource).toContain('showDetailDialog={showDetailDialog}');
    expect(scheduleSource).toContain('detailSession={detailSession}');
    expect(modalStackSource).toContain("import SessionDetailModal from '../SessionDetailModal'");
    expect(modalStackSource).toContain('<SessionDetailModal');
    expect(modalStackSource).toContain('session={detailSession}');
    expect(modalStackSource).toContain('open={showDetailDialog}');

    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(sessionsRoutesSource).toContain('router.patch("/:id/complete"');
    expect(sessionsRoutesSource).toContain('router.patch("/:id/attendance"');
    expect(sessionsRoutesSource).toContain('router.delete("/recurring/:groupId"');
    expect(sessionsRoutesSource).toContain('router.post("/:id/feedback"');
    expect(sessionsRoutesSource).toContain('router.get("/:id/cancel-warning"');
    expect(sessionsRoutesSource).toContain('router.patch("/:id/cancel"');
    expect(sessionsRoutesSource).toContain('router.get("/:id/client-package-price"');
  });

  it('keeps session detail actions on the shared API service', () => {
    const modalSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx');
    const packagePricingHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionPackagePricing.ts');
    const clientFeedbackHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionClientFeedback.ts');
    const completionHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionCompletion.ts');
    const attendanceHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionAttendance.ts');
    const cancellationHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionCancellation.ts');
    const seriesActionsHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionSeriesActions.ts');

    expect(modalSource).not.toContain("import apiService from '../../services/api.service';");
    expect(modalSource).toContain("from './SessionDetailModal.actions'");
    expect(modalSource).toContain("import { useSessionAttendance } from './hooks/useSessionAttendance';");
    expect(modalSource).toContain("import { useSessionCancellation } from './hooks/useSessionCancellation';");
    expect(modalSource).toContain("import { useSessionCompletion } from './hooks/useSessionCompletion';");
    expect(modalSource).toContain("import { useSessionPackagePricing } from './hooks/useSessionPackagePricing';");
    expect(modalSource).toContain("import { useSessionClientFeedback } from './hooks/useSessionClientFeedback';");
    expect(modalSource).toContain("import { useSessionSeriesActions } from './hooks/useSessionSeriesActions';");
    expect(modalSource).toContain('useSessionAttendance({');
    expect(modalSource).toContain('useSessionCancellation({');
    expect(modalSource).toContain('useSessionCompletion({');
    expect(modalSource).toContain('useSessionPackagePricing({');
    expect(modalSource).toContain('useSessionClientFeedback({');
    expect(modalSource).toContain('useSessionSeriesActions({');
    expect(attendanceHookSource).toContain("import apiService from '../../../services/api.service';");
    expect(attendanceHookSource).toContain('`/api/sessions/${session.id}/attendance`');
    expect(cancellationHookSource).toContain("import apiService from '../../../services/api.service';");
    expect(cancellationHookSource).toContain('`/api/sessions/${session.id}/cancel-warning`');
    expect(cancellationHookSource).toContain('`/api/sessions/${session.id}/cancel`');
    expect(completionHookSource).toContain("import apiService from '../../../services/api.service';");
    expect(completionHookSource).toContain('`/api/sessions/${session.id}/complete`');
    expect(packagePricingHookSource).toContain("import apiService from '../../../services/api.service';");
    expect(packagePricingHookSource).toContain('`/api/sessions/${sessionId}/client-package-price`');
    expect(clientFeedbackHookSource).toContain("import apiService from '../../../services/api.service';");
    expect(clientFeedbackHookSource).toContain('`/api/sessions/${session.id}/feedback`');
    expect(seriesActionsHookSource).toContain("import apiService from '../../../services/api.service';");
    expect(seriesActionsHookSource).toContain('`/api/sessions/recurring/${session.recurringGroupId}`');
    expect(modalSource).not.toContain("apiService.patch(`/api/sessions/${session.id}/complete`, buildCompleteSessionPayload({");
    expect(attendanceHookSource).toContain('buildAttendancePayload(');
    expect(attendanceHookSource).toContain("status === 'no_show' ? deductNoShowSessionCredit : undefined");
    expect(modalSource).not.toContain('buildAttendancePayload(');
    expect(modalSource).not.toContain("apiService.delete(`/api/sessions/recurring/${session.recurringGroupId}`)");
    expect(modalSource).not.toContain("apiService.post(`/api/sessions/${session.id}/feedback`");
    expect(modalSource).not.toContain("apiService.get(`/api/sessions/${session.id}/cancel-warning`)");
    expect(modalSource).not.toContain("apiService.patch(`/api/sessions/${session.id}/cancel`, buildCancelPayload({");

    expect(modalSource).not.toContain("localStorage.getItem('token')");
    expect(modalSource).not.toContain('Authorization');
    expect(modalSource).not.toContain('fetch(');
    expect(attendanceHookSource).not.toContain("localStorage.getItem('token')");
    expect(attendanceHookSource).not.toContain('Authorization');
    expect(attendanceHookSource).not.toContain('fetch(');
    expect(cancellationHookSource).not.toContain("localStorage.getItem('token')");
    expect(cancellationHookSource).not.toContain('Authorization');
    expect(cancellationHookSource).not.toContain('fetch(');
    expect(completionHookSource).not.toContain("localStorage.getItem('token')");
    expect(completionHookSource).not.toContain('Authorization');
    expect(completionHookSource).not.toContain('fetch(');
    expect(packagePricingHookSource).not.toContain("localStorage.getItem('token')");
    expect(packagePricingHookSource).not.toContain('Authorization');
    expect(packagePricingHookSource).not.toContain('fetch(');
    expect(clientFeedbackHookSource).not.toContain("localStorage.getItem('token')");
    expect(clientFeedbackHookSource).not.toContain('Authorization');
    expect(clientFeedbackHookSource).not.toContain('fetch(');
    expect(seriesActionsHookSource).not.toContain("localStorage.getItem('token')");
    expect(seriesActionsHookSource).not.toContain('Authorization');
    expect(seriesActionsHookSource).not.toContain('fetch(');
  });

  it('routes schedule detail logging directly into the workout logger with session context', () => {
    const modalSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx');
    const footerSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailFooterActions.tsx');
    const logicSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.logic.ts');

    expect(modalSource).toContain("from './SessionDetailModal.logic'");
    expect(logicSource).toContain('export const buildScheduleReturnRoute =');
    expect(logicSource).toContain('export const buildScheduleWorkoutLoggerRoute =');
    expect(logicSource).toContain("params.set('clientId', String(session.userId))");
    expect(logicSource).toContain("params.set('sessionId', String(session.id))");
    expect(logicSource).toContain("params.set('sessionDate', String(session.sessionDate))");
    expect(logicSource).toContain("params.set('source', 'master-schedule')");
    expect(logicSource).toContain("params.set('returnTo', buildScheduleReturnRoute(mode))");
    expect(logicSource).toContain("params.set('loadPlan', 'today')");
    expect(logicSource).toContain("params.set('tab', 'training')");
    expect(logicSource).toContain("params.set('trainingSection', 'logger')");
    expect(logicSource).toContain("return `/dashboard/admin/client-management?${params.toString()}`;");
    expect(modalSource).toContain('navigate(buildScheduleWorkoutLoggerRoute(mode, session))');
    expect(footerSource).toContain('Log Workout');
    expect(logicSource).toContain("session.attendanceStatus !== 'no_show'");
    expect(modalSource).not.toContain("session?.status !== 'completed' && (");
    expect(modalSource).not.toContain('Start Logging');
  });

  it('routes schedule detail View Workouts to role-owned workout surfaces', () => {
    const modalSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx');
    const logicSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.logic.ts');

    expect(logicSource).toContain('export const buildScheduleWorkoutsRoute =');
    expect(logicSource).toContain("params.set('clientId', String(session.userId))");
    expect(logicSource).toContain("params.set('tab', 'training')");
    expect(logicSource).toContain("params.set('trainingSection', 'history')");
    expect(logicSource).toContain("return `/dashboard/admin/client-management?${params.toString()}`;");
    expect(logicSource).toContain("return `/dashboard/trainer/client-progress?${params.toString()}`;");
    expect(logicSource).toContain("return '/dashboard/client/workouts';");
    expect(modalSource).toContain('navigate(buildScheduleWorkoutsRoute(mode, session))');
    expect(modalSource).not.toContain('navigate(`/dashboard/${dashPath}/client-management?clientId=${session.userId}&tab=training`)');
  });

  it('sends full-session cancellation charges with the package-derived amount', () => {
    const cancellationHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionCancellation.ts');
    const actionsSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.actions.ts');

    expect(cancellationHookSource).toContain('buildCancelPayload({');
    expect(actionsSource).toContain("payload.chargeAmount = chargeType === 'full'");
    expect(actionsSource).toContain('? defaultFullCharge');
    expect(actionsSource).not.toContain("payload.chargeAmount = chargeType === 'partial' || chargeType === 'late_fee'");
  });

  it('does not show payment-recovery debt for Move Fitness or external free-tracking sessions', () => {
    const modalSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx');
    const bodySource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailBodyPanels.tsx');
    const typesSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.types.ts');
    const calendarDataSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useCalendarData.ts');
    const permissionsHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionDetailPermissions.ts');
    const sessionServiceSource = readSource('backend/services/sessions/session.service.mjs');

    expect(sessionServiceSource).toMatch(/availableSessions', 'clientSource'/);
    expect(calendarDataSource).toContain("const clientSource = (session as any).clientSource ?? (session.client as any)?.clientSource ?? undefined;");
    expect(calendarDataSource).toContain('clientSource,');

    expect(typesSource).toContain('clientSource?: string;');
    expect(modalSource).toContain('useSessionDetailPermissions({');
    expect(permissionsHookSource).toContain('const isNonDeductingClient = isNonDeductingClientSource(session?.clientSource);');
    expect(bodySource).toContain('&& !isNonDeductingClient');
    expect(permissionsHookSource).toContain('isNonDeductingClientSource,');
  });

  it('reuses the shared session-source helper and hides package debt for free-tracking sessions', () => {
    const modalSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx');
    const bodySource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailBodyPanels.tsx');
    const permissionsHookSource = readSource('frontend/src/components/UniversalMasterSchedule/hooks/useSessionDetailPermissions.ts');

    expect(modalSource).toContain("import { useSessionDetailPermissions } from './hooks/useSessionDetailPermissions';");
    expect(permissionsHookSource).toContain("from '../../DashBoard/workspaces/clients-team/clientSessionSignal';");
    expect(permissionsHookSource).toContain('getClientSessionSignal({');
    expect(permissionsHookSource).toContain('const isNonDeductingClient = isNonDeductingClientSource(session?.clientSource);');
    expect(bodySource).toContain('{session.packageInfo && !isNonDeductingClient && (');
    expect(modalSource).not.toContain('const isNonDeductingClientSource = (clientSource?: string)');
  });
});
