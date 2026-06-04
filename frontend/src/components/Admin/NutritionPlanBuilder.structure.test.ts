import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSource = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');
const MAIN_SOURCE = readSource('./NutritionPlanBuilder.tsx');

const SPLIT_FILES = [
  './NutritionPlanBuilder.tsx',
  './NutritionPlanBuilder.logic.ts',
  './NutritionPlanBuilder.sections.tsx',
  './NutritionPlanBuilder.styles.ts',
  './NutritionPlanBuilder.types.ts',
];

describe('NutritionPlanBuilder structure', () => {
  it('keeps the mounted nutrition builder split into focused files under the project line cap', () => {
    expect(MAIN_SOURCE).toContain("from './NutritionPlanBuilder.logic'");
    expect(MAIN_SOURCE).toContain("from './NutritionPlanBuilder.sections'");
    expect(MAIN_SOURCE).toContain("from './NutritionPlanBuilder.styles'");
    expect(MAIN_SOURCE).toContain("from './NutritionPlanBuilder.types'");

    SPLIT_FILES.forEach((fileName) => {
      const absolutePath = resolve(__dirname, fileName);
      expect(existsSync(absolutePath), `${fileName} should exist`).toBe(true);
      expect(readSource(fileName).split(/\r?\n/).length, `${fileName} should stay under 300 lines`).toBeLessThanOrEqual(300);
    });
  });

  it('keeps success text and nutrition heading colors on theme variables', () => {
    const combined = SPLIT_FILES.map(readSource).join('\n');
    expect(combined).toContain('var(--feedback-success, #10b981)');
    expect(combined).toContain('var(--text-primary, #E0ECF4)');
    expect(combined).not.toContain('color: #ffffff');
    expect(combined).not.toContain('color: #10b981');
  });
});
