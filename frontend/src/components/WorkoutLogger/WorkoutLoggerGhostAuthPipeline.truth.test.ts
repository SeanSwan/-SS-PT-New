import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const layout = read('../DashBoard/UniversalDashboardLayout.tsx');
const routeComponentsSource = read('../DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const dashboardRoutesSource = read('../DashBoard/UniversalDashboardLayout.routes.tsx');
const enhancedLogger = read('../TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx');
const enhancedLoggerIdentity = read('../TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.identity.ts');
const enhancedLoggerView = read('../TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.view.tsx');
const workoutLogger = read('./WorkoutLogger.tsx');
const ghostHookRaw = read('./useGhostPreFill.ts');
const ghostRowRaw = read('./GhostDataRow.tsx');
const backendMount = read('../../../../backend/core/routes.mjs');
const adminWorkoutRoutes = read('../../../../backend/routes/adminWorkoutLoggerRoutes.mjs');

const ghostHook = stripComments(ghostHookRaw);
const ghostRow = stripComments(ghostRowRaw);

describe('WorkoutLogger ghost history auth pipeline', () => {
  it('is an active dashboard surface with a mounted admin workout history route', () => {
    expect(layout).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).toMatch(/export const WorkoutLogger = React\.lazy\(\(\) => import\('\.\.\/WorkoutLogger\/WorkoutLogger'\)\)/);
    expect(routeComponentsSource).toMatch(/export const EnhancedWorkoutLogger = React\.lazy\(\(\) => import\('\.\.\/TrainerDashboard\/WorkoutLogging'\)\)/);
    expect(dashboardRoutesSource).toMatch(/path: '\/log-workout', component: EnhancedWorkoutLogger/);
    expect(dashboardRoutesSource).toMatch(/path: '\/log-workout', component: WorkoutLogger/);
    expect(enhancedLogger).toMatch(/import EnhancedWorkoutLoggerView from '\.\/EnhancedWorkoutLogger\.view'/);
    expect(enhancedLogger).toMatch(
      /import\s+\{[\s\S]*normalizeDashboardReturnTo[\s\S]*parseLoggerSessionId[\s\S]*\}\s+from '\.\/EnhancedWorkoutLogger\.logic'/,
    );
    expect(enhancedLogger).toMatch(/import\s+\{\s*resolveLoggerClientId\s*\}\s+from '\.\/EnhancedWorkoutLogger\.identity'/);
    expect(enhancedLoggerIdentity).toMatch(/import\s+\{\s*parseLoggerClientId\s*\}\s+from '\.\/EnhancedWorkoutLogger\.logic'/);
    expect(enhancedLoggerIdentity).toMatch(/parseLoggerClientId\(urlClientId\)/);
    expect(enhancedLoggerIdentity).toMatch(/parseLoggerClientId\(activeClientId\)/);
    expect(enhancedLoggerView).toMatch(/import WorkoutLogger from '\.\.\/\.\.\/WorkoutLogger\/WorkoutLogger'/);
    expect(enhancedLoggerView).toMatch(/<WorkoutLogger[\s\S]*?clientId=\{client\.id\}/);
    expect(enhancedLoggerView).not.toMatch(/clientId=\{parseInt\(client\.id\)/);
    expect(workoutLogger).toMatch(/useGhostPreFill\(hookClientId, \{ skip: isClientSelfMode \}\)/);
    // 2026-07-30 Runner Styles: the card render (and its ghostSkip pass-through)
    // moved into runner/useRunnerEngine.tsx; WorkoutLogger feeds the engine deps.
    expect(workoutLogger).toMatch(/ghostSkip: isClientSelfMode/);
    expect(read('./runner/useRunnerEngine.tsx')).toMatch(/ghostSkip=\{ghostSkip\}/);
    expect(backendMount).toMatch(/app\.use\('\/api\/admin', adminWorkoutLoggerRoutes\)/);
    expect(adminWorkoutRoutes).toMatch(/router\.get\('\/clients\/:clientId\/workouts', getClientWorkouts\)/);
  });

  it('uses the shared apiService auth pipeline for both ghost history readers', () => {
    for (const source of [ghostHook, ghostRow]) {
      expect(source).toMatch(/apiService/);
      expect(source).toMatch(/\/api\/admin\/clients\/\$\{clientId\}\/workouts\?limit=10/);
      expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
      expect(source).not.toMatch(/Authorization\s*:/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it('preserves the client self-route skip gate before any ghost history request', () => {
    const hookIdx = ghostHook.indexOf('const fetchExerciseHistoryReal');
    expect(hookIdx).toBeGreaterThan(-1);
    const hookBody = ghostHook.slice(hookIdx, hookIdx + 1600);
    expect(hookBody.indexOf('if (skip) return')).toBeGreaterThan(-1);
    expect(hookBody.indexOf('apiService.get')).toBeGreaterThan(-1);
    expect(hookBody.indexOf('if (skip) return')).toBeLessThan(hookBody.indexOf('apiService.get'));

    const rowEffectIdx = ghostRow.indexOf('useEffect(() =>');
    expect(rowEffectIdx).toBeGreaterThan(-1);
    const rowBody = ghostRow.slice(rowEffectIdx, rowEffectIdx + 1600);
    expect(rowBody.indexOf('if (skip) return')).toBeGreaterThan(-1);
    expect(rowBody.indexOf('apiService.get')).toBeGreaterThan(-1);
    expect(rowBody.indexOf('if (skip) return')).toBeLessThan(rowBody.indexOf('apiService.get'));
  });

  it('keeps the active ghost history row on shared Crystalline Swan tokens', () => {
    expect(ghostRowRaw).toMatch(/import \{ CS, withAlpha \} from '\.\/WorkoutLoggerCS';/);
    expect(ghostRow).not.toMatch(/rgba\((96, 192, 240|224, 236, 244)/);
    expect(ghostRow).not.toMatch(/var\(--text-muted, rgba/);
  });
});
