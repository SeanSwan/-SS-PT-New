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
    expect(productSource).toContain('Lower concern');
    expect(productSource).toContain('shorter, recognizable ingredient lists');

    expect(pageSource).toContain('foodScannerRatingLabel');
    expect(pageSource).not.toContain('scan.product.overallRating.charAt(0).toUpperCase()');
  });
});
