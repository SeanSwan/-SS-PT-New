import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('FoodTracker nutrition theme bridge', () => {
  it('keeps live nutrition tracker children on universal theme variables', () => {
    const intakeForm = readSource('src/components/FoodTracker/FoodIntakeForm.tsx');
    const intakeFormStyles = readSource('src/components/FoodTracker/FoodIntakeForm.styles.ts');
    const searchPanelStyles = readSource('src/components/FoodTracker/FoodSearchPanel.styles.ts');
    const intelligenceDashboardStyles = readSource('src/components/FoodTracker/FoodIntelligenceDashboard.styles.ts');
    const restaurantStyles = readSource('src/components/FoodTracker/RestaurantTab.styles.ts');
    const gardeningTab = readSource('src/components/FoodTracker/GardeningTab.tsx');
    const mealPlanTab = readSource('src/components/FoodTracker/MealPlanTab.tsx');
    const mealPlanStyles = readSource('src/components/FoodTracker/MealPlanTab.styles.ts');
    const farmFinderStyles = readSource('src/components/FoodTracker/FarmFinderTab.styles.ts');
    const supplementStyles = readSource('src/components/FoodTracker/SupplementsTab.styles.ts');
    const supplementCatalogStyles = readSource('src/components/FoodTracker/SupplementsTab.catalog.styles.ts');
    const combined = `${intakeForm}\n${intakeFormStyles}\n${searchPanelStyles}\n${intelligenceDashboardStyles}`;

    expect(intakeFormStyles).toContain('var(--bg-elevated');
    expect(searchPanelStyles).toContain('var(--bg-elevated');
    expect(intelligenceDashboardStyles).toContain('var(--bg-elevated');
    expect(restaurantStyles).toContain('var(--bg-elevated');
    expect(restaurantStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(restaurantStyles).toContain('.spin { animation: none; }');
    expect(mealPlanStyles).toContain('var(--bg-elevated');
    expect(mealPlanStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(mealPlanStyles).toContain('.spin { animation: none; }');
    expect((intakeFormStyles.match(/@media \(prefers-reduced-motion: reduce\) \{ animation: none; \}/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((intelligenceDashboardStyles.match(/@media \(prefers-reduced-motion: reduce\) \{ animation: none; \}/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(farmFinderStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect((farmFinderStyles.match(/animation: none;/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(searchPanelStyles).not.toContain('transition: all');
    expect(supplementStyles).toContain('var(--bg-elevated');
    expect(supplementCatalogStyles).toContain('var(--bg-elevated');
    expect(combined).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(combined).toContain('var(--accent-secondary, #8B5CF6)');

    expect(combined).not.toContain('theme.colors.');
    expect(combined).not.toContain('theme.buttons.');
    expect(combined).not.toContain('rgba(0, 32, 96');
    expect(combined).not.toContain('rgba(0,32,96');
    expect(combined).not.toContain('rgba(255, 255, 255');
    expect(combined).not.toContain('rgba(139, 92, 246');
    expect(combined).not.toContain('rgba(139,92,246');
    expect(combined).not.toContain('rgba(96, 192, 240');
    expect(combined).not.toContain('rgba(96,192,240');
    expect(combined).not.toContain('${$color}${');

    expect(restaurantStyles).not.toContain('linear-gradient(135deg, #8B5CF6, #60C0F0)');
    expect(restaurantStyles).not.toContain('color: #030712');
    expect(restaurantStyles).not.toContain('border: 1px solid rgba(96, 192, 240, 0.35)');
    expect(restaurantStyles).not.toContain('background: rgba(0, 32, 96, 0.5)');
    expect(restaurantStyles).not.toContain('background: rgba(0, 32, 96, 0.75)');
    expect(restaurantStyles).not.toContain('box-shadow: 0 0 12px rgba(96, 192, 240, 0.35)');
    expect(restaurantStyles).not.toContain('box-shadow: 0 0 24px rgba(96, 192, 240, 0.55)');
    expect(restaurantStyles).not.toContain('box-shadow: 0 0 16px rgba(96, 192, 240, 0.2)');
    expect(gardeningTab).not.toContain("return '#C6A84B'");
    expect(gardeningTab).not.toContain("return '#C92A54'");

    expect(mealPlanStyles).not.toContain('background: rgba(0, 0, 0, 0.7)');
    expect(mealPlanStyles).not.toContain('color: #fff');
  });
});
