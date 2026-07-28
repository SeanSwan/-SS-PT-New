import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFoodSearchResults } from './FoodSearchPanel.logic';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: { get: apiMocks.get } }));

describe('FoodSearchPanel proxy search contract', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('Food search must use the Swan proxy, not direct external fetch');
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the protected Swan nutrition food-search proxy and never calls browser-side providers', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        foods: [{
          id: 'usda-1001',
          name: 'Chicken Breast',
          brand: 'Acme Farms',
          category: 'Poultry',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 4,
          servingSize: '100g',
          source: 'USDA',
        }],
      },
    });

    const results = await fetchFoodSearchResults('chicken breast');

    expect(apiMocks.get).toHaveBeenCalledWith('/api/nutrition/food-search?q=chicken%20breast&pageSize=15');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(results).toEqual([expect.objectContaining({ id: 'usda-1001', name: 'Chicken Breast', source: 'USDA' })]);
  });

  it('returns an empty result list for proxy failures without leaking transport errors', async () => {
    apiMocks.get.mockRejectedValueOnce(new Error('raw provider outage'));

    await expect(fetchFoodSearchResults('chicken')).resolves.toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
