import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('mounted FoodTracker auth pipeline', () => {
  it('covers FoodTracker tabs mounted from the nutrition workspace and backed by mounted APIs', () => {
    const workspaceSource = readSource('frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const macroRoutesSource = readSource('backend/routes/dailyMacroRoutes.mjs');
    const mealPlanRoutesSource = readSource('backend/routes/mealPlanRoutes.mjs');
    const supplementRoutesSource = readSource('backend/routes/supplementRoutes.mjs');
    const gardeningRoutesSource = readSource('backend/routes/gardeningRoutes.mjs');
    const farmRoutesSource = readSource('backend/routes/farmFinderRoutes.mjs');
    const freeRoutesSource = readSource('backend/routes/freeApiRoutes.mjs');

    expect(workspaceSource).toContain("const FoodIntakeForm = lazy(() => import('../../FoodTracker/FoodIntakeForm'))");
    expect(workspaceSource).toContain("const GardeningTab = lazy(() => import('../../FoodTracker/GardeningTab'))");
    expect(workspaceSource).toContain("const FarmFinderTab = lazy(() => import('../../FoodTracker/FarmFinderTab'))");
    expect(workspaceSource).toContain("const SupplementsTab = lazy(() => import('../../FoodTracker/SupplementsTab'))");
    expect(workspaceSource).toContain("const MealPlanTab = lazy(() => import('../../FoodTracker/MealPlanTab'))");
    expect(workspaceSource).toContain("const FoodIntelligenceDashboard = lazy(() => import('../../FoodTracker/FoodIntelligenceDashboard'))");

    expect(coreRoutesSource).toContain("app.use('/api/macros', dailyMacroRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/gardening', gardeningRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/farms', farmFinderRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/supplements', supplementRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/meal-plans', mealPlanRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/free', freeApiRoutes)");
    expect(macroRoutesSource).toContain("router.post('/'");
    expect(mealPlanRoutesSource).toContain("router.get('/golf-presets'");
    expect(mealPlanRoutesSource).toContain("router.post('/generate'");
    expect(mealPlanRoutesSource).toContain("router.post('/analyze-photo'");
    expect(supplementRoutesSource).toContain("router.get('/categories'");
    expect(supplementRoutesSource).toContain("router.get('/products'");
    expect(supplementRoutesSource).toContain("router.get('/gaps'");
    expect(gardeningRoutesSource).toContain("router.get('/zone/:zipCode'");
    expect(gardeningRoutesSource).toContain("router.get('/plants'");
    expect(farmRoutesSource).toContain("router.get('/search'");
    expect(farmRoutesSource).toContain("router.get('/detail/:id'");
    expect(freeRoutesSource).toContain("router.get('/nutrition'");
    expect(freeRoutesSource).toContain("router.get('/food-search'");
    expect(freeRoutesSource).toContain("router.get('/quote'");
  });

  it('keeps mounted FoodTracker backend calls on the shared API service', () => {
    const foodIntakeSource = readSource('frontend/src/components/FoodTracker/FoodIntakeForm.tsx');
    const mealPlanSource = readSource('frontend/src/components/FoodTracker/MealPlanTab.tsx');
    const supplementsSource = readSource('frontend/src/components/FoodTracker/SupplementsTab.tsx');
    const gardeningSource = readSource('frontend/src/components/FoodTracker/GardeningTab.tsx');
    const farmFinderSource = readSource('frontend/src/components/FoodTracker/FarmFinderTab.tsx');
    const intelligenceSource = readSource('frontend/src/components/FoodTracker/FoodIntelligenceDashboard.tsx');
    const combinedSource = [
      foodIntakeSource,
      mealPlanSource,
      supplementsSource,
      gardeningSource,
      farmFinderSource,
      intelligenceSource,
    ].join('\n');

    expect(foodIntakeSource).toContain("import apiService from '../../services/api.service'");
    expect(foodIntakeSource).toContain("apiService.post('/api/macros'");

    expect(mealPlanSource).toContain("import apiService from '../../services/api.service'");
    expect(mealPlanSource).toContain("apiService.get('/api/meal-plans/golf-presets')");
    expect(mealPlanSource).toContain("apiService.post('/api/meal-plans/generate'");
    expect(mealPlanSource).toContain("apiService.post('/api/meal-plans/analyze-photo'");

    expect(supplementsSource).toContain("import apiService from '../../services/api.service'");
    expect(supplementsSource).toContain("apiService.get('/api/supplements/categories')");
    expect(supplementsSource).toContain("apiService.get('/api/supplements/products')");
    expect(supplementsSource).toContain("apiService.get('/api/supplements/gaps?days=7')");

    expect(gardeningSource).toContain("import apiService from '../../services/api.service'");
    expect(gardeningSource).toContain('apiService.get(`/api/gardening/zone/${zipCode}`)');
    expect(gardeningSource).toContain('apiService.get(`/api/gardening/plants?${params}`)');

    expect(farmFinderSource).toContain("import apiService from '../../services/api.service'");
    expect(farmFinderSource).toContain('apiService.get(`/api/farms/search?zip=${zipCode}`)');
    expect(farmFinderSource).toContain('apiService.get(`/api/farms/detail/${marketId}`)');

    expect(intelligenceSource).toContain("import apiService from '../../services/api.service'");
    expect(intelligenceSource).toContain('apiService.get(`/api/free/nutrition?q=${encodeURIComponent(query)}`)');
    expect(intelligenceSource).toContain('apiService.get(`/api/free/food-search?q=${encodeURIComponent(query)}`)');
    expect(intelligenceSource).toContain("apiService.get('/api/free/quote')");

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('fetch(');
    expect(combinedSource).not.toContain('Authorization');
    expect(combinedSource).not.toContain('VITE_API_BASE');
  });
});
