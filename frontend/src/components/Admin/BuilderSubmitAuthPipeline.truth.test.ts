import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');
const layoutSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');
const workoutBuilderSource = readFileSync(resolve(__dirname, './WorkoutPlanBuilder.tsx'), 'utf8');
const nutritionBuilderSource = readFileSync(resolve(__dirname, './NutritionPlanBuilder.tsx'), 'utf8');

describe('admin workout and nutrition builder submit auth pipeline', () => {
  it('covers mounted builder routes and backend mounts', () => {
    expect(layoutSource).toContain("const WorkoutPlanBuilder = React.lazy(() => import('../Admin/WorkoutPlanBuilder'))");
    expect(layoutSource).toContain("{ path: '/workouts/:clientId?', component: WorkoutPlanBuilder");
    expect(layoutSource).toContain("const NutritionPlanBuilder = React.lazy(() => import('../Admin/NutritionPlanBuilder'))");
    expect(layoutSource).toContain("{ path: '/nutrition/:clientId?', component: NutritionPlanBuilder");
    expect(coreRoutes).toContain("app.use('/api/workout/plans', workoutPlanRoutes)");
    expect(coreRoutes).toContain("app.use('/api/nutrition', clientNutritionRoutes)");
  });

  it('submits workout plans through the shared API service instead of direct token fetches', () => {
    expect(workoutBuilderSource).toContain("apiService.post('/api/workout/plans'");
    expect(workoutBuilderSource).toContain("apiService.get(`/api/exercises/search?q=${encodeURIComponent(query.trim())}`)");
    expect(workoutBuilderSource).not.toContain("localStorage.getItem('token')");
    expect(workoutBuilderSource).not.toContain("fetch('/api/workout/plans'");
    expect(workoutBuilderSource).not.toContain('fetch(`/api/exercises/search');
  });

  it('submits nutrition plans through the shared API service instead of direct token fetches', () => {
    expect(nutritionBuilderSource).toContain("apiService.post(`/api/nutrition/${numericClientId}`");
    expect(nutritionBuilderSource).not.toContain("localStorage.getItem('token')");
    expect(nutritionBuilderSource).not.toContain('fetch(`/api/nutrition/${numericClientId}`');
  });
});
