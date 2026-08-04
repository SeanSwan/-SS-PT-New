import { readFileSync } from 'fs';
import { resolve } from 'path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('workout generation auth pipeline', () => {
  it('covers mounted trainer/admin workout generation surfaces and backend routes', () => {
    const routeSource = readSource('src/routes/main-routes.tsx');
    const backendMounts = readSource('../backend/core/routes.mjs');
    const customExerciseRoutes = readSource('../backend/routes/customExerciseRoutes.mjs');
    const variationRoutes = readSource('../backend/routes/variationRoutes.mjs');
    const workoutBuilderRoutes = readSource('../backend/routes/workoutBuilderRoutes.mjs');

    expect(routeSource).toContain("path: 'biomechanics-studio'");
    expect(routeSource).toContain('<BiomechanicsStudio />');
    expect(routeSource).toContain("path: 'variation-engine'");
    expect(routeSource).toContain('<VariationEngine />');
    expect(routeSource).toContain("path: 'workout-builder'");
    // Workout-OS C7c retired the legacy authoring surface on purpose — the
    // route is now a role-gated redirect shim to the planner, not <WorkoutBuilder />.
    expect(routeSource).toContain('<LegacyWorkoutRedirect surface="builder" />');

    expect(backendMounts).toContain("app.use('/api/custom-exercises', customExerciseRoutes)");
    expect(backendMounts).toContain("app.use('/api/variation', variationRoutes)");
    expect(backendMounts).toContain("app.use('/api/workout-builder', workoutBuilderRoutes)");
    expect(customExerciseRoutes).toContain('router.use(protect)');
    expect(variationRoutes).toContain("router.use(protect, authorize(['admin', 'trainer']))");
    expect(workoutBuilderRoutes).toContain('router.use(protect)');
  });

  it('keeps workout builder, variation, and custom exercise hooks on apiService', () => {
    const workoutBuilderSource = readSource('src/hooks/useWorkoutBuilderAPI.ts');
    const customExerciseSource = readSource('src/hooks/useCustomExerciseAPI.ts');
    const variationSource = readSource('src/hooks/useVariationAPI.ts');
    const combinedSource = [workoutBuilderSource, customExerciseSource, variationSource].join('\n');

    expect(workoutBuilderSource).toContain("import apiService from '../services/api.service';");
    expect(customExerciseSource).toContain("import apiService from '../services/api.service';");
    expect(variationSource).toContain("import apiService from '../services/api.service';");
    expect(workoutBuilderSource).toContain("apiService.get<T>(url)");
    expect(workoutBuilderSource).toContain("apiService.post<T>(url, parseRequestBody(options?.body))");
    expect(customExerciseSource).toContain("apiService.delete<T>(url)");
    expect(variationSource).toContain("apiService.post<T>(url, parseRequestBody(options?.body))");
    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('Authorization');
    expect(combinedSource).not.toContain('fetch(');
  });
});
