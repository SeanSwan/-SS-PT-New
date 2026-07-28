import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({ default: mocks.logger }));

const { searchFoodCatalog } = await import('../../services/nutrition/foodCatalogSearchService.mjs');

describe('searchFoodCatalog', () => {
  const originalUsdaKey = process.env.USDA_API_KEY;

  beforeEach(() => {
    process.env.USDA_API_KEY = 'server-side-usda-key';
    mocks.logger.error.mockReset();
  });

  afterEach(() => {
    if (originalUsdaKey === undefined) delete process.env.USDA_API_KEY;
    else process.env.USDA_API_KEY = originalUsdaKey;
    vi.unstubAllGlobals();
  });

  it('combines USDA and Open Food Facts results without returning provider secrets', async () => {
    const fetchMock = vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('api.nal.usda.gov')) {
        expect(href).toContain('api_key=server-side-usda-key');
        return {
          ok: true,
          json: async () => ({
            foods: [{
              fdcId: 1001,
              description: 'CHICKEN BREAST',
              brandOwner: 'Acme Farms',
              foodCategory: 'Poultry',
              servingSize: 100,
              servingSizeUnit: 'g',
              foodNutrients: [
                { nutrientNumber: '208', value: 165 },
                { nutrientNumber: '203', value: 31 },
                { nutrientNumber: '204', value: 4 },
                { nutrientNumber: '205', value: 0 },
              ],
            }],
          }),
        };
      }

      expect(href).toContain('world.openfoodfacts.org');
      return {
        ok: true,
        json: async () => ({
          products: [{
            _id: 'off-100',
            product_name: 'Packaged chicken strips',
            brands: 'Market Brand',
            categories: 'Prepared foods, Poultry',
            serving_quantity: '85',
            nutriments: {
              'energy-kcal_100g': 190,
              proteins_100g: 22,
              fat_100g: 7,
              carbohydrates_100g: 8,
            },
          }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchFoodCatalog('chicken', 15);

    expect(result.ok).toBe(true);
    expect(result.foods).toEqual([
      expect.objectContaining({
        id: 'usda-1001',
        name: 'Chicken Breast',
        brand: 'Acme Farms',
        category: 'Poultry',
        calories: 165,
        protein: 31,
        fat: 4,
        carbs: 0,
        servingSize: '100g',
        source: 'USDA',
      }),
      expect.objectContaining({
        id: 'off-off-100',
        name: 'Packaged Chicken Strips',
        brand: 'Market Brand',
        category: 'Prepared foods',
        calories: 190,
        protein: 22,
        fat: 7,
        carbs: 8,
        servingSize: '85g',
        source: 'OFF',
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('server-side-usda-key');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns surviving provider results when one catalog is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('api.nal.usda.gov')) {
        return { ok: false, status: 503, text: async () => 'provider down' };
      }
      return {
        ok: true,
        json: async () => ({
          products: [{
            _id: 'off-200',
            product_name: 'Almond milk',
            nutriments: { 'energy-kcal_100g': 40, proteins_100g: 1, fat_100g: 3, carbohydrates_100g: 2 },
          }],
        }),
      };
    }));

    const result = await searchFoodCatalog('almond milk', 15);

    expect(result.ok).toBe(true);
    expect(result.foods).toHaveLength(1);
    expect(result.foods[0]).toMatchObject({ id: 'off-off-200', source: 'OFF' });
  });
});
