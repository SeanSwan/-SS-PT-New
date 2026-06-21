import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'NutritionTodayPanel.tsx'), 'utf8');

describe('NutritionTodayPanel structure', () => {
  it('keeps the mounted Today diary panel under the project line cap', () => {
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
