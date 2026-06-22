import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadNutritionCommandSchemas() {
  vi.resetModules();
  const base = await import('../../services/ai/commandRegistry/baseSchemas.mjs');
  const nutrition = await import('../../services/ai/commandRegistry/nutritionCommands.mjs');
  const clientSelfService = await import('../../services/ai/commandRegistry/clientSelfService.mjs');

  nutrition.register();
  clientSelfService.register();

  return {
    logMealsSchema: base.getCommand('log_meals').inputSchema,
    logMyNutritionSchema: base.getCommand('log_my_nutrition').inputSchema,
  };
}

afterEach(() => {
  vi.resetModules();
});

describe('nutrition command meal-type schemas', () => {
  it('normalizes trainer command meal-type casing before validation', async () => {
    const { logMealsSchema } = await loadNutritionCommandSchemas();

    const parsed = logMealsSchema.safeParse({
      clientId: 42,
      meals: [{ description: 'rice bowl', mealType: ' Lunch ' }],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data.meals[0].mealType).toBe('lunch');
  });

  it('normalizes client self-service six-slot meal types before validation', async () => {
    const { logMyNutritionSchema } = await loadNutritionCommandSchemas();

    const parsed = logMyNutritionSchema.safeParse({
      meals: [{ description: 'protein shake', mealType: ' POST_WORKOUT ' }],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data.meals[0].mealType).toBe('post_workout');
  });

  it('does not broaden trainer log-meals beyond its existing four-slot contract', async () => {
    const { logMealsSchema } = await loadNutritionCommandSchemas();

    const parsed = logMealsSchema.safeParse({
      clientId: 42,
      meals: [{ description: 'pre-session snack', mealType: 'pre_workout' }],
    });

    expect(parsed.success).toBe(false);
  });
});
