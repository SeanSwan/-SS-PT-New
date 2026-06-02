import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('FoodTracker nutrition theme bridge', () => {
  it('keeps live nutrition tracker children on universal theme variables', () => {
    const intakeForm = readSource('src/components/FoodTracker/FoodIntakeForm.tsx');
    const searchPanel = readSource('src/components/FoodTracker/FoodSearchPanel.tsx');
    const combined = `${intakeForm}\n${searchPanel}`;

    expect(intakeForm).toContain('var(--bg-elevated');
    expect(searchPanel).toContain('var(--bg-elevated');
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
  });
});
