import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchFoods } from '../../services/freeApiService.mjs';

const originalUsdaKey = process.env.USDA_API_KEY;

const makeResponse = (data, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

describe('freeApiService food search proxy', () => {
  beforeEach(() => {
    process.env.USDA_API_KEY = 'server-only-usda-key';
  });

  afterEach(() => {
    if (originalUsdaKey === undefined) delete process.env.USDA_API_KEY;
    else process.env.USDA_API_KEY = originalUsdaKey;
    vi.unstubAllGlobals();
  });

  it('normalizes USDA and Open Food Facts results without exposing provider keys', async () => {
    const fetchMock = vi.fn(async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('api.nal.usda.gov')) {
        expect(requestUrl).toContain('api_key=server-only-usda-key');
        return makeResponse({
          foods: [{
            fdcId: 123,
            description: 'CHICKEN BREAST',
            brandOwner: 'USDA Test Brand',
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
        });
      }
      return makeResponse({
        products: [{
          _id: 'off-1',
          product_name: 'Packaged Chicken',
          brands: 'OFF Brand',
          categories: 'Prepared foods, Poultry',
          serving_quantity: '100',
          nutriments: {
            'energy-kcal_100g': 190,
            proteins_100g: 20,
            fat_100g: 6,
            carbohydrates_100g: 5,
          },
        }],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchFoods('chicken', 15);

    expect(result.ok).toBe(true);
    expect(result.data.providers).toEqual(['USDA', 'OFF']);
    expect(result.data.foods).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'usda-123',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 4,
        protein_g: 31,
        carbohydrates_total_g: 0,
        fat_total_g: 4,
        servingSize: '100g',
        serving_size_g: 100,
        source: 'USDA',
      }),
      expect.objectContaining({
        id: 'off-off-1',
        name: 'Packaged Chicken',
        calories: 190,
        protein: 20,
        carbs: 5,
        fat: 6,
        source: 'OFF',
      }),
    ]));
    expect(JSON.stringify(result)).not.toContain('server-only-usda-key');
  });

  it('rejects malformed or negative provider macros instead of treating them as credible values', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('api.nal.usda.gov')) {
        return makeResponse({ foods: [] });
      }
      return makeResponse({
        products: [{
          _id: 'odd',
          product_name: 'Odd Packaged Food',
          serving_quantity: '1e2',
          nutriments: {
            'energy-kcal_100g': -25,
            proteins_100g: '-4',
            fat_100g: '4.5',
            carbohydrates_100g: '0x10',
          },
        }],
      });
    }));

    const result = await searchFoods('odd packaged', 15);

    expect(result.ok).toBe(true);
    expect(result.data.foods[0]).toEqual(expect.objectContaining({
      calories: null,
      protein: null,
      carbs: null,
      fat: 5,
      servingSize: '100g',
      serving_size_g: null,
    }));
  });

  it('returns safe failure copy when all providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse({ raw: 'upstream secret detail' }, false, 503)));

    const result = await searchFoods('chicken', 15);

    expect(result).toEqual({ ok: false, error: 'Food lookup is temporarily unavailable.' });
  });
});
