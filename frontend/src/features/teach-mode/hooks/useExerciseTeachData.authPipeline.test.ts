import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const hookSource = stripComments(read('./useExerciseTeachData.ts'));
const routeComponentsSource = read('../../../components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const dashboardRoutesSource = read('../../../components/DashBoard/UniversalDashboardLayout.routes.tsx');
const workoutPlannerSource = read('../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx');
const workoutPlannerLayoutSource = read('../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPageLayout.tsx');
const plannerSidebarSource = read('../../../components/DashBoard/Pages/admin-workout-planner/TeachModeSidebar.tsx');
const coachPageSource = read('../../../components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx');
const coachPanelSource = read('../../../components/DashBoard/Pages/coach-assistant/CoachTeachModePanel.tsx');
const backendMountSource = read('../../../../../backend/core/routes.mjs');
const exerciseRoutesSource = read('../../../../../backend/routes/exerciseRoutes.mjs');

describe('useExerciseTeachData auth pipeline', () => {
  it('is consumed by active workout planner and legacy coach teach-mode surfaces', () => {
    expect(routeComponentsSource).toMatch(/export const WorkoutPlannerPage = React\.lazy\(\(\) => import\('\.\/Pages\/admin-workout-planner\/WorkoutPlannerPage'\)\)/);
    expect(routeComponentsSource).toMatch(/export const CoachCommandCenterPage = React\.lazy\(\(\) => import\('\.\/Pages\/coach-assistant\/CoachCommandCenterPage'\)\)/);
    expect(dashboardRoutesSource).toMatch(/path: '\/workout-planner', component: WorkoutPlannerPage/);
    expect(dashboardRoutesSource).toMatch(/path: '\/coach-assistant', component: CoachCommandCenterPage/);
    // S15 contexts cutover: teach-mode wiring moved from the page shell into the layout.
    expect(workoutPlannerLayoutSource).toMatch(/exercise=\{selectedExercise\} phaseNumber=\{phaseNumber\} onPhaseChange=\{act\.setters\.setPhaseNumber\}/);
    expect(workoutPlannerLayoutSource).toMatch(/import TeachModeSidebar from '\.\/TeachModeSidebar'/);
    expect(workoutPlannerLayoutSource).toMatch(/<TeachModeSidebar exercise=\{selectedExercise\}[\s\S]*onClose=\{act\.pageActions\.handleTeachModeToggle\} \/>/);
    expect(plannerSidebarSource).toMatch(/useExerciseTeachData\(\s*exercise\?\.id \?\? null/);
    expect(coachPageSource).toMatch(/<CoachTeachModePanel teachMode=\{teachMode\} \/>/);
    expect(coachPanelSource).toMatch(/useExerciseTeachData\(\s*teachMode\.selectedExercise\?\.id \?\? null/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/exercises', exerciseRoutes\)/);
  });

  it('uses shared apiService transport without a local bearer-token lane', () => {
    expect(hookSource).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/\.\.\/services\/api\.service['"]/);
    expect(hookSource).toMatch(/apiService\.get[\s\S]{0,220}`\/api\/exercises\/\$\{id\}\/teach-mode`/);
    expect(hookSource).toMatch(/signal:\s*abortRef\.current\.signal/);
    expect(hookSource).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
    expect(hookSource).not.toMatch(/Authorization\s*:/);
    expect(hookSource).not.toMatch(/\bfetch\s*\(/);
  });

  it('keeps teach-mode exercise details available to any authenticated dashboard user', () => {
    const routeIdx = exerciseRoutesSource.indexOf("router.get('/:id/teach-mode'");
    expect(routeIdx).toBeGreaterThan(-1);
    const routeLine = exerciseRoutesSource.slice(routeIdx, exerciseRoutesSource.indexOf('async (req, res)', routeIdx));
    expect(routeLine).toMatch(/\bprotect\b/);
    expect(routeLine).toMatch(/\bapiLimiter\b/);
    expect(routeLine).not.toMatch(/\btrainerOrAdminOnly\b/);
  });
});
