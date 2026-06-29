/**
 * FoodSearchPanel.addToLog.test - Nutrition search proxy
 * Locks searched-food logging through the backend-owned provider proxy and
 * /api/macros write path.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FoodSearchPanel from './FoodSearchPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: { get: apiMocks.get, post: apiMocks.post } }));

const chickenFood = {
  id: 'usda-1',
  name: 'Chicken Breast',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 4,
  servingSize: '100g',
  source: 'USDA',
};

const mockFoodSearch = (foods = [chickenFood]) => {
  apiMocks.get.mockResolvedValue({ data: { ok: true, data: { foods } } });
};

describe('FoodSearchPanel add-to-log (Nutrition search proxy)', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    mockFoodSearch();
  });

  it('queries the backend food-search proxy instead of browser provider APIs', async () => {
    const user = userEvent.setup();

    render(<FoodSearchPanel onDataSent={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/search foods/i), 'chicken');

    await screen.findByRole('button', { name: /add chicken breast to snack/i }, { timeout: 2000 });
    expect(apiMocks.get).toHaveBeenCalledWith('/api/free/food-search?q=chicken&pageSize=15');
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

    await user.click(added);
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
    mockFoodSearch([{
      id: 'usda-2',
      name: 'Odd Chicken',
      calories: '1e3',
      protein_g: ['45'],
      fat: '4.5',
      carbohydrates_total_g: '0x10',
      serving_size_g: '1e2',
      source: 'USDA',
    }, {
      id: 'off-zero',
      name: 'Zero Packaged Chicken',
      calories: 90,
      protein: 18,
      fat: 2,
      carbs: 3,
      serving_size_g: '0',
      source: 'OFF',
    }]);
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
    mockFoodSearch([{
      name: 'Mystery Packaged Chicken',
      calories: 90,
      protein: 18,
      fat: 2,
      carbs: 3,
      source: 'OFF',
    }]);
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
    fireEvent.click(addBtn);

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /adding chicken breast to snack/i })).toHaveAttribute('aria-busy', 'true');
    pending.forEach((resolve) => resolve());
    await screen.findByRole('button', { name: /chicken breast added to snack/i });
  });

  it('shows safe copy and does not mark added when the save fails', async () => {
    apiMocks.post.mockRejectedValue(new Error('raw lower-layer detail'));
    const onDataSent = vi.fn();
    const user = userEvent.setup();

    render(<FoodSearchPanel onDataSent={onDataSent} />);
    await user.type(screen.getByPlaceholderText(/search foods/i), 'chicken');

    const addBtn = await screen.findByRole('button', { name: /add chicken breast to snack/i }, { timeout: 2000 });
    await user.click(addBtn);

    expect(await screen.findByText(/could not add that food/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw lower-layer detail/i)).not.toBeInTheDocument();
    expect(onDataSent).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: /add chicken breast to snack/i })).toBeEnabled();
  });
});
