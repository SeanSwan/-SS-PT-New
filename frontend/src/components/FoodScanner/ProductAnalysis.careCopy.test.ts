import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const productFiles = [
  'ProductAnalysis.tsx',
  'ProductHeroCard.tsx',
  'IngredientFlagsPanel.tsx',
  'NutritionFactsPanel.tsx',
  'ProductCertificationsPanel.tsx',
  'CleanerAlternativesPanel.tsx',
  'HowItsMadePanel.tsx',
  'ProductCoachActions.tsx',
  'productAnalysis.logic.ts',
];

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

const productSource = () => productFiles.map(readSource).join('\n');

describe('ProductAnalysis care-first scanner copy', () => {
  it('avoids medicalized safe/good verdicts on the mounted public scanner', () => {
    const source = productSource();
    const pageSource = readSource('../../pages/FoodScanner/FoodScannerPage.tsx');

    expect(source).not.toContain("label: 'Safe'");
    expect(source).not.toContain('{goodIngredients} safe');
    expect(source).not.toMatch(/good for health/i);
    expect(source).not.toMatch(/healthy choice/i);
    expect(source).not.toMatch(/clean, simple ingredients/i);
    expect(source).not.toMatch(/confirmed carcinogen/i);
    expect(source).not.toMatch(/probably carcinogenic/i);
    expect(source).not.toMatch(/possibly carcinogenic/i);
    expect(source).not.toContain('<DetailLabel>Risks</DetailLabel>');
    expect(source).not.toContain('<SectionTitle>Health Concerns</SectionTitle>');
    expect(source).not.toContain("ingredient.healthRating === 'good' ?");
    expect(source).not.toContain("ingredient.healthRating === 'bad' ?");
    expect(source).not.toContain('content: "\\2713";');
    expect(source).toContain('Lower concern');
    expect(source).toContain('IARC category');
    expect(source).toContain('<DetailLabel>Notes</DetailLabel>');
    expect(source).toContain('<SectionTitle>Ingredient Notes</SectionTitle>');
    expect(source).toContain('content: "+";');
    expect(source).toContain('shorter, recognizable ingredient lists');
    expect(source).toContain('Bioengineered/GMO and Non-GMO are shown as sourcing, disclosure, and preference information');

    expect(pageSource).toContain('foodScannerRatingLabel');
    expect(pageSource).not.toContain('scan.product.overallRating.charAt(0).toUpperCase()');
  });
});