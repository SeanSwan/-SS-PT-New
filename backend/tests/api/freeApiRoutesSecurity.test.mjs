import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const routeSource = readBackend('../../routes/freeApiRoutes.mjs');
const serviceSource = readBackend('../../services/freeApiService.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('free API nutrition intelligence route hardening', () => {
  it('locks the mounted free API and FoodTracker intelligence consumer', () => {
    const intelligenceSource = readFrontend('src/components/FoodTracker/FoodIntelligenceDashboard.tsx');
    const workspaceSource = readFrontend('src/components/DashBoard/workspaces/NutritionWorkspace.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/free', freeApiRoutes)");
    expect(workspaceSource).toContain("const FoodIntelligenceDashboard = lazy(() => import('../../FoodTracker/FoodIntelligenceDashboard'))");
    expect(intelligenceSource).toContain('apiService.get(`/api/free/nutrition?q=${encodeURIComponent(query)}`)');
    expect(intelligenceSource).toContain('apiService.get(`/api/free/food-search?q=${encodeURIComponent(query)}`)');
    expect(intelligenceSource).toContain("apiService.get('/api/free/quote')");
    expect(routeSource).toContain("router.get('/nutrition'");
    expect(routeSource).toContain("router.get('/food-search'");
    expect(routeSource).toContain("router.get('/quote'");
    expect(routeSource).toContain('parseFoodSearchPageSize');
    expect(routeSource).toContain('Food search query is too long');
  });

  it('keeps mounted food search provider calls behind the backend proxy', () => {
    const foodSearchLogicSource = readFrontend('src/components/FoodTracker/FoodSearchPanel.logic.ts');

    expect(foodSearchLogicSource).toContain('apiService.get<FoodSearchProxyResponse>');
    expect(foodSearchLogicSource).toContain('/api/nutrition/food-search?q=${encodeURIComponent(query)}&pageSize=15');
    expect(foodSearchLogicSource).not.toContain('VITE_USDA_API_KEY');
    expect(foodSearchLogicSource).not.toContain('api.nal.usda.gov');
    expect(foodSearchLogicSource).not.toContain('openfoodfacts.org');
    expect(foodSearchLogicSource).not.toContain('fetch(');
  });

  it('does not expose provider, env-var, or thrown exception details to clients', () => {
    expect(serviceSource).toContain("const FREE_API_UNAVAILABLE = 'Nutrition intelligence is temporarily unavailable.';");
    expect(serviceSource).toContain('const freeApiFailure =');
    expect(serviceSource).not.toContain('error: err.message');
    expect(serviceSource).not.toContain('CALORIE_NINJAS_KEY not configured');
    expect(serviceSource).not.toContain('API_NINJAS_KEY not configured');
    expect(serviceSource).not.toContain('API returned ${res.status}');
    expect(serviceSource).not.toContain('USDA API returned');
    expect(serviceSource).not.toContain('CalorieNinjas API returned');
    expect(serviceSource).not.toContain('ExerciseDB API returned');
    expect(serviceSource).not.toContain('ZenQuotes API returned');
    expect(serviceSource).not.toContain('Open-Meteo API returned');
  });
});
