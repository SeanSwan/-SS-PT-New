import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');
const layoutSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const routeComponentsSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
  'utf8',
);
const dashboardRoutesSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');
const nutritionBuilderSource = readFileSync(resolve(__dirname, './NutritionPlanBuilder.tsx'), 'utf8');

describe('admin workout and nutrition builder route contracts', () => {
  it('redirects the legacy raw-client-id workout route into the canonical planner flow', () => {
    expect(layoutSource).toContain("from './UniversalDashboardLayout.routes'");
    expect(routeComponentsSource).not.toContain("import('../Admin/WorkoutPlanBuilder')");
    expect(routeComponentsSource).toContain('export const AdminWorkoutPlansRedirect');
    expect(dashboardRoutesSource).toContain("{ path: '/workouts/:clientId?', component: AdminWorkoutPlansRedirect");
    expect(routeComponentsSource).toContain('to="/dashboard/admin/client-management?intent=plan_next"');
    expect(routeComponentsSource).toContain("`/dashboard/admin/workout-planner?${params.toString()}`");
  });

  it('covers mounted nutrition builder route and backend mounts', () => {
    expect(routeComponentsSource).toContain(
      "export const NutritionPlanBuilder = React.lazy(() => import('../Admin/NutritionPlanBuilder'))",
    );
    expect(dashboardRoutesSource).toContain("{ path: '/nutrition/:clientId?', component: NutritionPlanBuilder");
    expect(coreRoutes).toContain("app.use('/api/workout/plans', workoutPlanRoutes)");
    expect(coreRoutes).toContain("app.use('/api/nutrition', clientNutritionRoutes)");
  });

  it('submits nutrition plans through the shared API service instead of direct token fetches', () => {
    expect(nutritionBuilderSource).toContain("apiService.post(`/api/nutrition/${numericClientId}`");
    expect(nutritionBuilderSource).not.toContain("localStorage.getItem('token')");
    expect(nutritionBuilderSource).not.toContain('fetch(`/api/nutrition/${numericClientId}`');
  });
});
