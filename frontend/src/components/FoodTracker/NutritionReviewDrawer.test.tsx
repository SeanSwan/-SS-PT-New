import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionReviewDrawer from './NutritionReviewDrawer';
import { restaurantFoodToNutritionDraft } from './nutritionDraft.adapters';

const mocks = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue({ data: { success: true } }),
}));

vi.mock('../../services/api.service', () => ({
  default: { post: mocks.post },
}));

const draft = restaurantFoodToNutritionDraft({
  name: 'Turkey Sandwich',
  brandName: 'Panera',
  calories: 510,
  protein: 32,
  carbs: 54,
  fat: 18,
  portion: '1 sandwich',
  mealSource: 'restaurant',
}, {
  draftId: 'draft-panera',
  foodId: 'food-panera',
  mealType: 'lunch',
});

const twoFoodDraft = {
  ...draft,
  id: 'draft-two-foods',
  title: 'Review restaurant lunch',
  foods: [
    draft.foods[0],
    {
      ...draft.foods[0],
      id: 'food-panera-apple',
      description: 'Panera Apple',
      displayName: 'Apple',
      calories: 80,
      protein: 0,
      carbs: 22,
      fat: 0,
    },
  ],
};

describe('NutritionReviewDrawer', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ data: { success: true } });
  });

  it('requires review and saves provider estimates to /api/macros as unverified rows', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(<NutritionReviewDrawer draft={draft} onClose={onClose} onSaved={onSaved} />);

    expect(screen.getByRole('dialog', { name: /review turkey sandwich/i })).toBeInTheDocument();
    expect(screen.getByText(/Provider estimate - review before saving/i)).toBeInTheDocument();
    expect(screen.getByText(/FatSecret/i)).toBeInTheDocument();

    const calories = screen.getByLabelText(/calories for turkey sandwich/i);
    await user.clear(calories);
    await user.type(calories, '525');
    await user.click(screen.getByRole('button', { name: /approve and save 1 item/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      description: 'Panera Turkey Sandwich',
      mealType: 'lunch',
      calories: 525,
      source: 'usda_lookup',
      verified: false,
      items: [expect.objectContaining({ provider: 'FatSecret', source: 'restaurant' })],
    })));
    expect(onSaved).toHaveBeenCalledWith(true, { closeDrawer: true });
  });

  it('keeps the review drawer open when only some rows save', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    mocks.post
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('network failed'));

    render(<NutritionReviewDrawer draft={twoFoodDraft} onClose={vi.fn()} onSaved={onSaved} />);

    await user.click(screen.getByRole('button', { name: /approve and save 2 items/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/saved 1 of 2/i);
    expect(screen.getByRole('dialog', { name: /review restaurant lunch/i })).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(true, { closeDrawer: false });
  });

  it('does not save blank review rows', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    render(<NutritionReviewDrawer draft={draft} onClose={vi.fn()} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText(/food 1 description/i));
    await user.click(screen.getByRole('button', { name: /approve and save/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/add at least one food/i);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(false, { closeDrawer: false });
  });
});
