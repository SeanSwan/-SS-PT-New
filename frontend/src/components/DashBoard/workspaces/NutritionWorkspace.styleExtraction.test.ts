import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'NutritionWorkspace.tsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, 'NutritionWorkspace.styles.ts'), 'utf8');
const commandStylesSource = readFileSync(resolve(__dirname, '../../FoodTracker/LogFoodCommandCenter.styles.ts'), 'utf8');
const todayStylesSource = readFileSync(resolve(__dirname, 'NutritionTodayPanel.styles.ts'), 'utf8');

describe('NutritionWorkspace style extraction', () => {
  it('keeps the mounted Nutrition workspace under the project line cap', () => {
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps extracted workspace styles tokenized without raw rgba fallbacks', () => {
    expect(componentSource).toContain("from './NutritionWorkspace.styles'");
    expect(stylesSource).toContain('export const WorkspaceRoot');
    expect(stylesSource).not.toMatch(/rgba\(/);
  });

  it('keeps the Nutrition OS responsive across focused desktop and narrow mobile shells', () => {
    expect(stylesSource).toContain('max-width: min(100%, 1680px);');
    expect(stylesSource).toContain('container-type: inline-size;');
    expect(stylesSource).not.toContain('max-width: 1200px;');

    expect(commandStylesSource).toContain('grid-template-columns: repeat(auto-fit, minmax(min(100%, 10.5rem), 1fr));');
    expect(commandStylesSource).toContain('@media (max-width: 1180px)');

    expect(todayStylesSource).toContain('flex-wrap: wrap;');
    expect(todayStylesSource).toContain('flex: 999 1 620px;');
    expect(todayStylesSource).toContain('grid-template-columns: repeat(auto-fit, minmax(min(100%, 145px), 1fr));');
  });
});
