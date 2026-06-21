import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'NutritionWorkspace.tsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, 'NutritionWorkspace.styles.ts'), 'utf8');

describe('NutritionWorkspace style extraction', () => {
  it('keeps the mounted Nutrition workspace under the project line cap', () => {
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps extracted workspace styles tokenized without raw rgba fallbacks', () => {
    expect(componentSource).toContain("from './NutritionWorkspace.styles'");
    expect(stylesSource).toContain('export const WorkspaceRoot');
    expect(stylesSource).not.toMatch(/rgba\(/);
  });
});
