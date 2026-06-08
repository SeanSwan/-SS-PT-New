import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const routeSource = readBackend('../../routes/mealPlanRoutes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('meal plan routes security hardening', () => {
  it('locks the mounted meal-plan API and active frontend consumer', () => {
    const mealPlanTabSource = readFrontend('src/components/FoodTracker/MealPlanTab.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/meal-plans', mealPlanRoutes)");
    expect(mealPlanTabSource).toContain("apiService.post('/api/meal-plans/generate'");
    expect(mealPlanTabSource).toContain("apiService.post('/api/meal-plans/analyze-photo'");
    expect(routeSource).toContain("router.post('/generate'");
    expect(routeSource).toContain("router.post('/analyze-photo'");
  });

  it('does not echo provider or upload exception details to nutrition clients', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error';");
    expect(routeSource).toContain('const uploadMealPhoto =');
    expect(routeSource).toContain("sendMealPlanError(res, 500, 'Meal plan generation failed')");
    expect(routeSource).toContain("'Photo analysis is temporarily unavailable'");
    expect(routeSource).not.toContain('message: err.message');
    expect(routeSource).not.toContain("err.message || 'Meal plan generation failed'");
    expect(routeSource).not.toContain("err.message || 'Photo analysis failed'");
    expect(routeSource).not.toContain("upload.single('photo'), async");
  });
});
