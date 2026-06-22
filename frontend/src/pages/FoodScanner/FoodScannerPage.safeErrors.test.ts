import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('FoodScannerPage safe client error copy', () => {
  it('does not render raw backend API messages into visible nutrition scanner errors', () => {
    const source = readSource('src/pages/FoodScanner/FoodScannerPage.tsx');
    const routes = readSource('src/routes/main-routes.tsx');

    expect(routes).toContain("path: 'food-scanner'");
    expect(source).not.toContain('setError(response.data?.message');
    expect(source).not.toContain('setError(productResponse.data?.message');
    expect(source).not.toContain('setError(error.response?.data?.message');
    expect(source).not.toContain('description: error.response?.data?.message');
    expect(source).toContain('SCAN_ERROR_COPY');
    expect(source).toContain('SEARCH_ERROR_COPY');
    expect(source).toContain('LOG_PRODUCT_ERROR_COPY');
  });

  it('lets the scanner log endpoint resolve the display date instead of sending a UTC client date', () => {
    const source = readSource('src/pages/FoodScanner/FoodScannerPage.tsx');
    const logCall = source.match(/authAxios\.post\('\/api\/food-scanner\/log-scan'[\s\S]*?\}\);/)?.[0] ?? '';

    expect(logCall).toContain("barcode: scannedProduct.barcode");
    expect(logCall).toContain('mealType');
    expect(logCall).toContain('servingSizeGrams: 100');
    expect(logCall).not.toContain('date:');
    expect(logCall).not.toContain('toISOString().split');
  });
});
