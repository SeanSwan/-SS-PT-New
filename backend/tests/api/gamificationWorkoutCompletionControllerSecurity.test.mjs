import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/gamificationController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');
const rewardsServiceSource = readFrontend('src/services/gamificationRewardsService.ts');
const clientDashboardServiceSource = readFrontend('src/services/enhancedClientDashboardService.ts');
const mcpIntegrationSource = readFrontend('src/hooks/useMcpIntegration.ts');
const scheduleHandlersSource = readFrontend('src/components/UniversalMasterSchedule/hooks/useCalendarHandlers.ts');

const functionSource = (name, nextName) => {
  const startMarker = `  ${name}: async`;
  const endMarker = `\n  ${nextName}: async`;
  const start = controllerSource.indexOf(startMarker);
  const end = controllerSource.indexOf(endMarker, start + startMarker.length);

  expect(start, `${name} start marker`).toBeGreaterThan(-1);
  expect(end, `${nextName} end marker`).toBeGreaterThan(start);

  return controllerSource.slice(start, end);
};

const routeBlock = (startText, endText) => {
  const start = routeSource.indexOf(startText);
  const end = routeSource.indexOf(endText, start + startText.length);

  expect(start, `${startText} start marker`).toBeGreaterThan(-1);
  expect(end, `${endText} end marker`).toBeGreaterThan(start);

  return routeSource.slice(start, end);
};

const recordWorkoutSource = functionSource('recordWorkoutCompletion', 'markNotificationAsRead');
const recordWorkoutRoute = routeBlock("'/record-workout'", "router.patch('/notifications/:notificationId/read'");

describe('gamification workout completion controller security hardening', () => {
  it('locks the active record-workout route wiring and frontend callers', () => {
    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(recordWorkoutRoute).toContain("'/record-workout'");
    expect(recordWorkoutRoute).toContain("authorizeResourceAccess('userId')");
    expect(recordWorkoutRoute).toContain('gamificationController.recordWorkoutCompletion');
    expect(rewardsServiceSource).toContain("'/api/gamification/record-workout'");
    expect(clientDashboardServiceSource).toContain('`/api/gamification/record-workout`');
    expect(clientDashboardServiceSource).toContain('userId: this.userId');
    expect(mcpIntegrationSource).toContain('userId: user.id');
    expect(scheduleHandlersSource).toContain('userId: clientId');
    expect(scheduleHandlersSource).toContain('gamificationRewardsService.recordWorkoutCompletion(gamificationPayload)');
  });

  it('keeps workout completion client-facing failures stable', () => {
    expect(recordWorkoutSource).toContain("return sendGamificationError(res, 'Failed to record workout completion');");
    expect(recordWorkoutSource).not.toContain('error: error.message');
    expect(recordWorkoutSource).not.toContain('safeError(req, error)');
  });

  it('strictly normalizes user ownership and workout metrics before writes', () => {
    expect(recordWorkoutSource).toContain('const normalizedUserId = parsePositiveInteger(targetUserId);');
    expect(recordWorkoutSource).toContain('const normalizedDuration = duration === undefined ? 0 : parseBoundedNumber(duration, 0, 1440);');
    expect(recordWorkoutSource).toContain('const normalizedExercisesCompleted = exercisesCompleted === undefined ? 0 : parseNonNegativeInteger(exercisesCompleted);');
    expect(recordWorkoutSource).toContain('const normalizedCaloriesBurned = caloriesBurned === undefined ? undefined : parseNonNegativeInteger(caloriesBurned);');
    expect(recordWorkoutSource).toContain('const normalizedNotes = normalizeBoundedString(notes, 500);');
    expect(recordWorkoutSource).toContain('if (!normalizedUserId)');
    expect(recordWorkoutSource).toContain('User.findByPk(normalizedUserId');
    expect(recordWorkoutSource).toContain('userId: normalizedUserId,');
    expect(recordWorkoutSource).toContain('where: { userId: normalizedUserId }');
    expect(recordWorkoutSource).not.toContain('Number(targetUserId)');
    expect(recordWorkoutSource).not.toContain('exercisesCompleted * settings.pointsPerExercise');
  });
});
