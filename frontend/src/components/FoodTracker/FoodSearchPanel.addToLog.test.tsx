/**
 * FoodSearchPanel.addToLog.test - Slice 1.5
 * Locks the fix for the dead `food-search:add` event: searching a food and tapping
 * Add now actually logs it to /api/macros (DB macros, no hand-typing), refreshes
 * macros via onDataSent, and is idempotent (no duplicate add of the same food).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FoodSearchPanel from './FoodSearchPanel';

const apiMocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: { post: apiMocks.post } }));

const usdaFood = {
  fdcId: 1,
  description: 'CHICKEN BREAST',
  foodNutrients: [
    { nutrientNumber: '208', value: 165 },
    { nutrientNumber: '203', value: 31 },
    { nutrientNumber: '204', value: 4 },
    { nutrientNumber: '205', value: 0 },
  ],
};

function mockFetch() {
  return vi.fn((url: string | URL) => {
    const u = String(url);
    if (u.includes('nal.usda.gov')) {
      return Promise.resolve({ ok: true, json: async () => ({ foods: [usdaFood] }) } as Response);
    }
    return Promise.resolve({ ok: true, json: async () => ({ products: [] }) } as Response);
  });
}

describe('FoodSearchPanel add-to-log (Slice 1.5)', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
    vi.stubGlobal('fetch', mockFetch());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs a searched food to /api/macros with DB macros (usda_lookup, verified:false) and refreshes macros', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const onDataSent = vi.fn();
    const user = userEvent.setup();

    render(<FoodSearchPanel onDataSent={onDataSent} />);
    await user.type(screen.getByPlaceholderText(/search foods/i), 'chicken');

    const addBtn = await screen.findByRole('button', { name: /add chicken breast to snack/i }, { timeout: 2000 });
    await user.click(addBtn);

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(1));
    expect(apiMocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      description: 'Chicken Breast',
      mealType: 'snack',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 4,
      source: 'usda_lookup',
      verified: false,
    }));
    expect(onDataSent).toHaveBeenCalledWith(true);

    const added = await screen.findByRole('button', { name: /chicken breast added to snack/i });
    expect(added).toBeDisabled();

    await user.click(added); // disabled: no duplicate write
    expect(apiMocks.post).toHaveBeenCalledTimes(1);
  });

  it('uses the selected meal type when adding a searched food', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<FoodSearchPanel onDataSent={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText(/add to/i), 'dinner');
    await user.type(screen.getByPlaceholderText(/search foods/i), 'chicken');

    const addBtn = await screen.findByRole('button', { name: /add chicken breast to dinner/i }, { timeout: 2000 });
    await user.click(addBtn);

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(1));
    expect(apiMocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      mealType: 'dinner',
      verified: false,
    }));
    expect(await screen.findByRole('button', { name: /chicken breast added to dinner/i })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/add to/i), 'breakfast');
    expect(screen.getByRole('button', { name: /chicken breast added to dinner/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /chicken breast added to breakfast/i })).not.toBeInTheDocument();
  });

  it('does not save malformed external macro fields as credible nutrition values', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('nal.usda.gov')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            foods: [{
              fdcId: 2,
              description: 'ODD CHICKEN',
              foodNutrients: [
                { nutrientNumber: '208', value: '1e3' },
                { nutrientNumber: '203', value: ['45'] },
                { nutrientNumber: '204', value: '4.5' },
                { nutrientNumber: '205', value: '0x10' },
              ],
            }],
          }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          products: [{
            _id: 'off-odd',
            product_name: 'Odd Packaged Chicken',
            serving_quantity: '1e2',
            nutriments: {
              'energy-kcal_100g': 120,
              proteins_100g: 20,
              fat_100g: 4,
              carbohydrates_100g: 5,
            },
          }, {
            _id: 'off-zero',
            product_name: 'Zero Packaged Chicken',
            serving_quantity: '0',
            nutriments: {
              'energy-kcal_100g': 90,
              proteins_100g: 18,
              fat_100g: 2,
              carbohydrates_100g: 3,
            },
          }],
        }),
      } as Response);
    }));
    const user = userEvent.setup();

    render(<FoodSearchPanel onDataSent={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/search foods/i), 'odd chicken');
    await user.click(await screen.findByRole('button', { name: /add odd chicken to snack/i }, { timeout: 2000 }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(1));
    expect(apiMocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      calories: null,
      protein: null,
      carbs: null,
      fat: 5,
      verified: false,
    }));
    expect(screen.queryByText(/1e2g/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0g')).not.toBeInTheDocument();
  });

  it('does not render packaged foods without a stable external id', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string | URL) => {
      const u = String(url);
      if (u.includes('nal.usda.gov')) {
        return Promise.resolve({ ok: true, json: async () => ({ foods: [] }) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          products: [{
            product_name: 'Mystery Packaged Chicken',
            nutriments: {
              'energy-kcal_100g': 90,
              proteins_100g: 18,
              fat_100g: 2,
              carbohydrates_100g: 3,
            },
          }],
        }),
      } as Response);
    }));
    const user = userEvent.setup();

    render(<FoodSearchPanel onDataSent={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/search foods/i), 'mystery chicken');

    expect(await screen.findByText(/no foods found/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add mystery packaged chicken/i })).not.toBeInTheDocument();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('blocks a rapid double-tap from double-logging the same searched food', async () => {
    const pending: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => { pending.push(() => resolve({ data: { success: true } })); }));
    const user = userEvent.setup();

    render(<FoodSearchPanel onDataSent={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/search foods/i), 'chicken');
    const addBtn = await screen.findByRole('button', { name: /add chicken breast to snack/i }, { timeout: 2000 });

    fireEvent.click(addBtn);
    fireEvent.click(addBtn); // second tap before the first resolves

    expect(apiMocks.post).toHaveBeenCalledTimes(1); // savingRef guard: no duplicate write
    expect(await screen.findByRole('button', { name: /adding chicken breast to snack/i })).toHaveAttribute('aria-busy', 'true');
    pending.forEach((resolve) => resolve());
    await screen.findByRole('button', { name: /chicken breast added to snack/i });
  });

  it('shows safe copy and does not mark added when the save fails', async () => {
    apiMocks.post.mockRejectedValue(new Error('raw lower-layer detail'));
    const user = userEvent.setup();

    render(<FoodSearchPanel />);
    await user.type(screen.getByPlaceholderText(/search foods/i), 'chicken');

    const addBtn = await screen.findByRole('button', { name: /add chicken breast to snack/i }, { timeout: 2000 });
    await user.click(addBtn);

    expect(await screen.findByText(/could not add that food/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw lower-layer detail/i)).not.toBeInTheDocument();
    // still re-tryable (not marked added)
    expect(screen.getByRole('button', { name: /add chicken breast to snack/i })).toBeEnabled();
  });
});
