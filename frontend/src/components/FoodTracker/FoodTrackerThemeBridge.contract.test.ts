import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('FoodTracker nutrition theme bridge', () => {
  it('keeps live nutrition tracker children on universal theme variables', () => {
    const intakeForm = readSource('src/components/FoodTracker/FoodIntakeForm.tsx');
    const searchPanel = readSource('src/components/FoodTracker/FoodSearchPanel.tsx');
    const restaurantTab = readSource('src/components/FoodTracker/RestaurantTab.tsx');
    const combined = `${intakeForm}\n${searchPanel}`;

    expect(intakeForm).toContain('var(--bg-elevated');
    expect(searchPanel).toContain('var(--bg-elevated');
    expect(restaurantTab).toContain('var(--bg-elevated');
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

    expect(restaurantTab).not.toContain('linear-gradient(135deg, #8B5CF6, #60C0F0)');
    expect(restaurantTab).not.toContain('color: #030712');
    expect(restaurantTab).not.toContain('border: 1px solid rgba(96, 192, 240, 0.35)');
    expect(restaurantTab).not.toContain('background: rgba(0, 32, 96, 0.5)');
    expect(restaurantTab).not.toContain('background: rgba(0, 32, 96, 0.75)');
    expect(restaurantTab).not.toContain('box-shadow: 0 0 12px rgba(96, 192, 240, 0.35)');
    expect(restaurantTab).not.toContain('box-shadow: 0 0 24px rgba(96, 192, 240, 0.55)');
    expect(restaurantTab).not.toContain('box-shadow: 0 0 16px rgba(96, 192, 240, 0.2)');
  });
});
