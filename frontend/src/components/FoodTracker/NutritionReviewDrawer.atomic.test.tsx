import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionReviewDrawer from './NutritionReviewDrawer';
import { restaurantFoodToNutritionDraft } from './nutritionDraft.adapters';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: { post: mocks.post },
}));

const baseDraft = restaurantFoodToNutritionDraft({
  name: 'Turkey Sandwich',
  brandName: 'Panera',
  calories: 510,
  protein: 32,
  carbs: 54,
  fat: 18,
  portion: '1 sandwich',
  mealSource: 'restaurant',
}, {
  draftId: 'draft-panera-atomic',
  foodId: 'food-panera',
  mealType: 'lunch',
});

const twoFoodDraft = {
  ...baseDraft,
  title: 'Review restaurant lunch',
  foods: [
    baseDraft.foods[0],
    { ...baseDraft.foods[0], id: 'food-apple', description: 'Apple', displayName: 'Apple' },
  ],
};

describe('NutritionReviewDrawer atomic review contract', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ data: { success: true, entries: [{ id: 1 }, { id: 2 }], replayed: false } });
  });

  it('submits a multi-food review as one idempotent draft request', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    render(<NutritionReviewDrawer draft={twoFoodDraft} onClose={vi.fn()} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: /approve and save 2 items/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith('/api/macros/drafts', expect.objectContaining({
      contractVersion: '1.0',
      draftId: 'draft-panera-atomic',
      foods: expect.arrayContaining([
        expect.objectContaining({ description: 'Panera Turkey Sandwich' }),
        expect.objectContaining({ description: 'Apple' }),
      ]),
    }));
    expect(onSaved).toHaveBeenCalledWith(true, { closeDrawer: true });
  });

  it('retries the same draft id after a transport failure without splitting rows', async () => {
    mocks.post
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ data: { success: true, entries: [{ id: 1 }, { id: 2 }], replayed: true } });
    const user = userEvent.setup();

    render(<NutritionReviewDrawer draft={twoFoodDraft} onClose={vi.fn()} />);
    const save = screen.getByRole('button', { name: /approve and save 2 items/i });
    await user.click(save);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);

    await user.click(save);
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
    expect(mocks.post.mock.calls[0][1].draftId).toBe('draft-panera-atomic');
    expect(mocks.post.mock.calls[1][1].draftId).toBe('draft-panera-atomic');
  });

  it('blocks close, cancel, and Escape while an atomic save is in flight', async () => {
    let resolveSave!: (value: unknown) => void;
    mocks.post.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<NutritionReviewDrawer draft={baseDraft} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /approve and save 1 item/i }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));

    expect(screen.getByRole('button', { name: /close nutrition review/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    resolveSave({ data: { success: true, entries: [{ id: 1 }] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /close nutrition review/i })).toBeEnabled());
  });

  it('keeps serving quantity, unit, label, and scaled nutrients coherent', async () => {
    const user = userEvent.setup();
    render(<NutritionReviewDrawer draft={baseDraft} onClose={vi.fn()} />);

    const quantity = screen.getByLabelText(/serving quantity for turkey sandwich/i);
    await user.clear(quantity);
    await user.type(quantity, '2');
    await user.click(screen.getByRole('button', { name: /approve and save 1 item/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post.mock.calls[0][1]).toMatchObject({
      foods: [expect.objectContaining({
        serving: expect.objectContaining({ quantity: 2, unit: 'sandwich', label: '2 sandwich' }),
        nutrients: expect.objectContaining({ calories: 1020, protein: 64 }),
      })],
    });
  });

  it('does not reset focus when a parent rerenders with the same open draft', async () => {
    const { rerender } = render(<NutritionReviewDrawer draft={baseDraft} onClose={() => undefined} />);
    const close = screen.getByRole('button', { name: /close nutrition review/i });
    await waitFor(() => expect(close).toHaveFocus());
    const quantity = screen.getByLabelText(/serving quantity for turkey sandwich/i);
    quantity.focus();
    expect(quantity).toHaveFocus();

    rerender(<NutritionReviewDrawer draft={baseDraft} onClose={() => undefined} />);
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(quantity).toHaveFocus();
  });

  it('shows full nutrient labels and serving controls', () => {
    render(<NutritionReviewDrawer draft={baseDraft} onClose={vi.fn()} />);

    for (const label of ['Protein', 'Carbs', 'Fat', 'Fiber', 'Sugar', 'Sodium']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/serving basis for turkey sandwich/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/serving quantity for turkey sandwich/i)).toBeInTheDocument();
    expect(screen.getByText(/atwater/i)).toBeInTheDocument();
  });

  it('traps keyboard focus inside the dialog and restores the opener on close', async () => {
    const user = userEvent.setup();
    const opener = document.createElement('button');
    opener.textContent = 'Open review';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(<NutritionReviewDrawer draft={baseDraft} onClose={vi.fn()} />);
    const close = await screen.findByRole('button', { name: /close nutrition review/i });
    await waitFor(() => expect(close).toHaveFocus());

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();

    rerender(<NutritionReviewDrawer draft={null} onClose={vi.fn()} />);
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
