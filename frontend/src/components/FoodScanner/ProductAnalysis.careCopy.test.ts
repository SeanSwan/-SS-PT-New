import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

describe('ProductAnalysis care-first scanner copy', () => {
  it('avoids medicalized safe/good verdicts on the mounted public scanner', () => {
    const productSource = readSource('ProductAnalysis.tsx');
    const pageSource = readSource('../../pages/FoodScanner/FoodScannerPage.tsx');

    expect(productSource).not.toContain("label: 'Safe'");
    expect(productSource).not.toContain('{goodIngredients} safe');
    expect(productSource).not.toMatch(/good for health/i);
    expect(productSource).not.toMatch(/healthy choice/i);
    expect(productSource).not.toMatch(/clean, simple ingredients/i);
    expect(productSource).not.toMatch(/confirmed carcinogen/i);
    expect(productSource).not.toMatch(/probably carcinogenic/i);
    expect(productSource).not.toMatch(/possibly carcinogenic/i);
    expect(productSource).not.toContain('<DetailLabel>Risks</DetailLabel>');
    expect(productSource).not.toContain('<SectionTitle>Health Concerns</SectionTitle>');
    expect(productSource).not.toContain("ingredient.healthRating === 'good' ? '✓'");
    expect(productSource).not.toContain("ingredient.healthRating === 'bad' ? '✗'");
    expect(productSource).not.toContain('content: "✓";');
    expect(productSource).toContain('Lower concern');
    expect(productSource).toContain('IARC category');
    expect(productSource).toContain('<DetailLabel>Notes</DetailLabel>');
    expect(productSource).toContain('<SectionTitle>Ingredient Notes</SectionTitle>');
    expect(productSource).toContain('content: "+";');
    expect(productSource).toContain('shorter, recognizable ingredient lists');

    expect(pageSource).toContain('foodScannerRatingLabel');
    expect(pageSource).not.toContain('scan.product.overallRating.charAt(0).toUpperCase()');
  });
});
