import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('nutrition hooks auth pipeline', () => {
  it('is consumed by the mounted nutrition workspace and backed by nutrition APIs', () => {
    const layoutSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const workspaceSource = readSource('frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx');
    const hydrationTabSource = readSource('frontend/src/components/DashBoard/workspaces/NutritionHydrationTab.tsx');
    const restaurantTabSource = readSource('frontend/src/components/FoodTracker/RestaurantTab.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const macroRoutesSource = readSource('backend/routes/dailyMacroRoutes.mjs');
    const hydrationRoutesSource = readSource('backend/routes/hydrationRoutes.mjs');
    const restaurantRoutesSource = readSource('backend/routes/restaurantRoutes.mjs');

    expect(layoutSource).toContain("const NutritionWorkspaceLazy = React.lazy(() => import('./workspaces/NutritionWorkspace'))");
    expect(layoutSource).toContain("{ path: '/meal-planner', component: NutritionWorkspaceLazy");
    expect(workspaceSource).toContain('const { summary, loading: macroLoading, refetch: refetchMacroSummary } = useMacroSummary()');
    expect(workspaceSource).toContain("{activeTab === 'restaurant' && <RestaurantTab />}");
    expect(workspaceSource).toContain("{activeTab === 'hydration' && <NutritionHydrationTab />}");
    expect(hydrationTabSource).toContain('const { filled, dailyGoal: DAILY_GOAL, updateFilled } = useHydration()');
    expect(restaurantTabSource).toContain('useRestaurantSearch()');

    expect(coreRoutesSource).toContain("app.use('/api/macros', dailyMacroRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/hydration', hydrationRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/restaurant', restaurantRoutes)");
    expect(macroRoutesSource).toContain("router.get('/summary'");
    expect(hydrationRoutesSource).toContain("router.get('/'");
    expect(hydrationRoutesSource).toContain("router.put('/'");
    expect(restaurantRoutesSource).toContain("router.get('/search'");
    expect(restaurantRoutesSource).toContain("router.get('/food/:id'");
  });

  it('keeps nutrition API calls on the shared API service', () => {
    const macroSource = readSource('frontend/src/hooks/useMacroSummary.ts');
    const hydrationSource = readSource('frontend/src/hooks/useHydration.ts');
    const restaurantSource = readSource('frontend/src/hooks/useRestaurantSearch.ts');
    const combinedApiSource = `${macroSource}\n${hydrationSource}\n${restaurantSource}`;

    expect(macroSource).toContain("import apiService from '../services/api.service'");
    expect(macroSource).toContain('apiService.get(`/api/macros/summary?date=${dateParam}`)');

    expect(hydrationSource).toContain("import apiService from '../services/api.service'");
    expect(hydrationSource).toContain('apiService.get(`/api/hydration?date=${todayStr()}`)');
    expect(hydrationSource).toContain("apiService.put('/api/hydration'");
    expect(hydrationSource).toContain('apiService.isAuthenticated()');
    expect(hydrationSource).toContain('localStorage.getItem(`${LS_KEY_PREFIX}${todayStr()}`)');

    expect(restaurantSource).toContain("import apiService from '../services/api.service'");
    expect(restaurantSource).toContain('apiService.get(`/api/restaurant/search?${params}`');
    expect(restaurantSource).toContain('apiService.get(`/api/restaurant/food/${foodId}`)');

    expect(combinedApiSource).not.toContain("localStorage.getItem('token')");
    expect(combinedApiSource).not.toContain('const API_BASE');
    expect(combinedApiSource).not.toContain('fetch(');
    expect(combinedApiSource).not.toContain('Authorization');
  });
});
