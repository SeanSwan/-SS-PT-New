import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('mounted FoodTracker auth pipeline', () => {
  it('covers FoodTracker tabs mounted from the nutrition workspace and backed by mounted APIs', () => {
    const workspaceSource = readSource('frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx');
    const captureSource = readSource('frontend/src/components/DashBoard/workspaces/NutritionWorkspace.capture.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const macroRoutesSource = readSource('backend/routes/dailyMacroRoutes.mjs');
    const mealPlanRoutesSource = readSource('backend/routes/mealPlanRoutes.mjs');
    const supplementRoutesSource = readSource('backend/routes/supplementRoutes.mjs');
    const gardeningRoutesSource = readSource('backend/routes/gardeningRoutes.mjs');
    const farmRoutesSource = readSource('backend/routes/farmFinderRoutes.mjs');
    const freeRoutesSource = readSource('backend/routes/freeApiRoutes.mjs');
    const clientNutritionRoutesSource = readSource('backend/routes/clientNutritionRoutes.mjs');

    expect(workspaceSource).toContain("const FoodIntakeForm = lazy(() => import('../../FoodTracker/FoodIntakeForm'))");
    expect(workspaceSource).toContain("const GardeningTab = lazy(() => import('../../FoodTracker/GardeningTab'))");
    expect(workspaceSource).toContain("const FarmFinderTab = lazy(() => import('../../FoodTracker/FarmFinderTab'))");
    expect(workspaceSource).toContain("const SupplementsTab = lazy(() => import('../../FoodTracker/SupplementsTab'))");
    expect(workspaceSource).toContain("const MealPlanTab = lazy(() => import('../../FoodTracker/MealPlanTab'))");
    expect(workspaceSource).toContain("const FoodIntelligenceDashboard = lazy(() => import('../../FoodTracker/FoodIntelligenceDashboard'))");
    expect(workspaceSource).toContain("const FoodSearchPanel = lazy(() => import('../../FoodTracker/FoodSearchPanel'))");

    expect(coreRoutesSource).toContain("app.use('/api/macros', dailyMacroRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/gardening', gardeningRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/farms', farmFinderRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/supplements', supplementRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/meal-plans', mealPlanRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/free', freeApiRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/nutrition', clientNutritionRoutes)");
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
    expect(clientNutritionRoutesSource).toContain("router.get('/food-search'");
  });

  it('keeps mounted FoodTracker backend calls on the shared API service', () => {
    const foodIntakeSource = readSource('frontend/src/components/FoodTracker/FoodIntakeForm.tsx');
    const mealPlanSource = readSource('frontend/src/components/FoodTracker/MealPlanTab.tsx');
    const mealPlanSectionsSource = readSource('frontend/src/components/FoodTracker/MealPlanTab.sections.tsx');
    const mealPlanSaveSource = readSource('frontend/src/components/FoodTracker/MealPlanApproveSavePanel.tsx');
    const supplementsSource = readSource('frontend/src/components/FoodTracker/SupplementsTab.tsx');
    const gardeningSource = readSource('frontend/src/components/FoodTracker/GardeningTab.tsx');
    const farmFinderSource = readSource('frontend/src/components/FoodTracker/FarmFinderTab.tsx');
    const intelligenceSource = readSource('frontend/src/components/FoodTracker/FoodIntelligenceDashboard.tsx');
    const searchPanelLogicSource = readSource('frontend/src/components/FoodTracker/FoodSearchPanel.logic.ts');
    const combinedSource = [
      foodIntakeSource,
      mealPlanSource,
      mealPlanSaveSource,
      supplementsSource,
      gardeningSource,
      farmFinderSource,
      intelligenceSource,
      searchPanelLogicSource,
    ].join('\n');

    expect(foodIntakeSource).toContain("import apiService from '../../services/api.service'");
    expect(foodIntakeSource).toContain("apiService.post('/api/macros'");

    expect(mealPlanSource).toContain("import apiService from '../../services/api.service'");
    expect(mealPlanSource).toContain("apiService.get('/api/meal-plans/golf-presets')");
    expect(mealPlanSource).toContain("apiService.post('/api/meal-plans/generate'");
    expect(mealPlanSource).toContain("apiService.post('/api/meal-plans/analyze-photo'");
    expect(mealPlanSectionsSource).toContain("import MealPlanApproveSavePanel from './MealPlanApproveSavePanel'");
    expect(mealPlanSectionsSource).toContain("import MealPhotoReview from './MealPhotoReview'");
    expect(mealPlanSaveSource).toContain("import apiService from '../../services/api.service'");
    expect(mealPlanSaveSource).toContain("apiService.post('/api/macros'");

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

    expect(searchPanelLogicSource).toContain("import apiService from '../../services/api.service'");
    expect(searchPanelLogicSource).toContain('apiService.get<FoodSearchProxyResponse>');
    expect(searchPanelLogicSource).toContain('/api/nutrition/food-search?q=${encodeURIComponent(query)}&pageSize=15');
    expect(searchPanelLogicSource).not.toContain('VITE_USDA_API_KEY');
    expect(searchPanelLogicSource).not.toContain('nal.usda.gov');
    expect(searchPanelLogicSource).not.toContain('openfoodfacts.org');

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('fetch(');
    expect(combinedSource).not.toContain('Authorization');
    expect(combinedSource).not.toContain('VITE_API_BASE');
  });

  it('keeps generated meal-plan target inputs on strict decimal parsing', () => {
    const mealPlanSource = readSource('frontend/src/components/FoodTracker/MealPlanTab.tsx');

    expect(mealPlanSource).toContain('parseMealPlanTarget');
    expect(mealPlanSource).not.toMatch(/parseInt\(\s*calories/);
    expect(mealPlanSource).not.toMatch(/parseInt\(\s*protein/);
    expect(mealPlanSource).not.toMatch(/parseInt\(\s*carbs/);
    expect(mealPlanSource).not.toMatch(/parseInt\(\s*fat/);
  });

  it('labels Snap-a-Meal photo confidence as an AI estimate, not certainty', () => {
    const sectionsSource = readSource('frontend/src/components/FoodTracker/MealPlanTab.sections.tsx');

    expect(sectionsSource).toContain('AI estimate');
    expect(sectionsSource).not.toContain('% confident</ConfChip>');
  });

  it('honors reduced motion for mounted Nutrition workspace framer-motion surfaces', () => {
    const workspaceSource = readSource('frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx');
    const captureSource = readSource('frontend/src/components/DashBoard/workspaces/NutritionWorkspace.capture.tsx');
    const supplementsSource = readSource('frontend/src/components/FoodTracker/SupplementsTab.tsx');

    expect(workspaceSource).toContain("import { useReducedMotion } from 'framer-motion';");
    expect(workspaceSource).toContain('const reduceMotion = Boolean(useReducedMotion());');
    expect(captureSource).toContain('whileHover={reduceMotion ? undefined : { y: -2 }}');
    expect(captureSource).toContain('whileTap={reduceMotion ? undefined : { scale: 0.98 }}');

    expect(supplementsSource).toContain("import { AnimatePresence, useReducedMotion } from 'framer-motion';");
    expect(supplementsSource).toContain('const reduceMotion = Boolean(useReducedMotion());');
    expect(supplementsSource).toContain('whileHover={reduceMotion ? undefined : { scale: 1.02 }}');
    expect(supplementsSource).toContain('layout={!reduceMotion}');
    expect(supplementsSource).toContain('initial={reduceMotion ? false : { opacity: 0, y: 12 }}');
    expect(supplementsSource).toContain('transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}');
    expect(supplementsSource).not.toContain('whileHover={{ scale: 1.02 }}');
    expect(supplementsSource).not.toContain('whileHover={{ scale: 1.03 }}');
    expect(supplementsSource).not.toContain("initial={{ opacity: 0, y: 12 }}");
    expect(supplementsSource).not.toContain("exit={{ opacity: 0, scale: 0.95 }}");
  });

  it('keeps live FoodTracker source modules split under the line cap', () => {
    const sourceFiles = [
      'frontend/src/components/FoodTracker/FoodIntakeForm.tsx',
      'frontend/src/components/FoodTracker/FoodIntakeForm.logic.ts',
      'frontend/src/components/FoodTracker/FoodIntakeForm.sections.tsx',
      'frontend/src/components/FoodTracker/FoodIntakeForm.styles.ts',
      'frontend/src/components/FoodTracker/MealPlanTab.tsx',
      'frontend/src/components/FoodTracker/MealPlanTab.types.ts',
      'frontend/src/components/FoodTracker/MealPlanTab.motion.ts',
      'frontend/src/components/FoodTracker/MealPlanTab.sections.tsx',
      'frontend/src/components/FoodTracker/MealPlanTab.styles.ts',
      'frontend/src/components/FoodTracker/SupplementsTab.tsx',
      'frontend/src/components/FoodTracker/FoodSearchPanel.tsx',
      'frontend/src/components/FoodTracker/FoodSearchPanel.logic.ts',
      'frontend/src/components/FoodTracker/FoodSearchPanel.styles.ts',
      'frontend/src/components/FoodTracker/FoodIntelligenceDashboard.tsx',
      'frontend/src/components/FoodTracker/FoodIntelligenceDashboard.logic.ts',
      'frontend/src/components/FoodTracker/FoodIntelligenceDashboard.styles.ts',
      'frontend/src/components/FoodTracker/RestaurantTab.tsx',
      'frontend/src/components/FoodTracker/RestaurantTab.logic.ts',
      'frontend/src/components/FoodTracker/RestaurantTab.styles.ts',
    ];

    for (const file of sourceFiles) {
      const lineCount = readSource(file).split(/\r?\n/).length;
      expect(lineCount, file).toBeLessThanOrEqual(300);
    }
  });
});