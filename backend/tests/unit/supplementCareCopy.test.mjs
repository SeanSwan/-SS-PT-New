import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dailyMacroLogMock = vi.hoisted(() => ({
  findAll: vi.fn(),
}));

vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: dailyMacroLogMock,
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(backendRoot, '..');

const readRepoFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('supplement care-first copy', () => {
  beforeEach(() => {
    dailyMacroLogMock.findAll.mockReset();
  });

  it('avoids restriction and deficiency framing on the supplement surface', () => {
    const source = [
      readRepoFile('backend/services/supplementService.mjs'),
      readRepoFile('backend/services/supplementData.mjs'),
      readRepoFile('frontend/src/components/FoodTracker/SupplementsTab.tsx'),
    ].join('\n');

    expect(source).not.toMatch(
      /caloric restriction|wasted macros|nutritional deficiencies|zero sugar|no sugar|zero calories|not ideal for cutting|high processed food intake suggests|covers blind spots|stresses gut health|increases blood pressure|water retention|active individuals benefit/i
    );
    expect(source).toMatch(/possible|pattern|support|hydration|coach/i);
  });

  it('does not render negative percent badges for excess support signals', async () => {
    dailyMacroLogMock.findAll.mockResolvedValue([
      {
        date: '2026-06-20',
        calories: 2100,
        protein: 100,
        carbs: 250,
        fat: 70,
        fiber: 30,
        sugar: 160,
        sodium: 6000,
        flagProcessed: false,
      },
      {
        date: '2026-06-21',
        calories: 2200,
        protein: 105,
        carbs: 260,
        fat: 75,
        fiber: 32,
        sugar: 150,
        sodium: 5900,
        flagProcessed: false,
      },
    ]);

    const { analyzeNutritionGaps } = await import('../../services/supplementService.mjs');
    const result = await analyzeNutritionGaps(42, 7);
    const sugar = result.gaps.find((gap) => gap.nutrient === 'Added Sugar Context');
    const sodium = result.gaps.find((gap) => gap.nutrient === 'Sodium Context');

    expect(sugar?.percentMet).toBe(0);
    expect(sodium?.percentMet).toBe(0);
  });

  it('does not style nutrition support signals as error states', () => {
    const componentSource = readRepoFile('frontend/src/components/FoodTracker/SupplementsTab.tsx');
    const stylesSource = readRepoFile('frontend/src/components/FoodTracker/SupplementsTab.styles.ts');
    const severityColorSource = componentSource.match(/const severityColor[\s\S]*?};/)?.[0] ?? '';
    const gapCardSource = stylesSource.match(/export const GapCard[\s\S]*?`;/)?.[0] ?? '';

    expect(severityColorSource).not.toContain("s === 'high') return 'var(--accent-error");
    expect(gapCardSource).not.toContain("$severity === 'high'     ? 'var(--accent-error-border");
    expect(stylesSource).toMatch(/export const ErrorText[\s\S]*var\(--accent-error/);
  });
});
