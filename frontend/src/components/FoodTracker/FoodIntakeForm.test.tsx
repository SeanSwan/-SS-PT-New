import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FoodIntakeForm from './FoodIntakeForm';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  logFoodIntake: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    post: mocks.post,
    patch: mocks.patch,
    delete: mocks.delete,
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'client-7' } }),
}));

vi.mock('../../hooks/useMcpIntegration', () => ({
  default: () => ({ logFoodIntake: mocks.logFoodIntake }),
}));

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn() },
}));

const fillMeal = async (user: ReturnType<typeof userEvent.setup>, name = 'Eggs', portion = '2 whole') => {
  await user.type(screen.getByLabelText('Food Name'), name);
  await user.type(screen.getByLabelText('Portion/Serving Size'), portion);
  await user.clear(screen.getByLabelText('Calories'));
  await user.type(screen.getByLabelText('Calories'), '300');
  await user.clear(screen.getByLabelText('Protein'));
  await user.type(screen.getByLabelText('Protein'), '24');
  await user.clear(screen.getByLabelText('Carbs'));
  await user.type(screen.getByLabelText('Carbs'), '4');
  await user.clear(screen.getByLabelText('Fat'));
  await user.type(screen.getByLabelText('Fat'), '20');
};

describe('FoodIntakeForm edit-after-save flow', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.patch.mockReset();
    mocks.delete.mockReset();
    mocks.logFoodIntake.mockReset();
    mocks.logFoodIntake.mockResolvedValue({ success: true });
  });

  it('does not frame food quality as a gamification points reward', () => {
    render(<FoodIntakeForm onDataSent={vi.fn()} />);

    expect(screen.queryByText(/gamification points/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/food quality/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /low quality/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /medium quality/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /high quality/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/processing context/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /whole \/ minimally processed/i })).toBeInTheDocument();
    expect(screen.getByText(/consistency beats perfect tracking/i)).toBeInTheDocument();
  });

  it('hands a new manual meal to the shared review contract without writing first', async () => {
    const user = userEvent.setup();
    const onReviewDraft = vi.fn();

    render(<FoodIntakeForm onDataSent={vi.fn()} onReviewDraft={onReviewDraft} />);
    await fillMeal(user);
    await user.click(screen.getByRole('button', { name: /review meal/i }));

    expect(onReviewDraft).toHaveBeenCalledWith(expect.objectContaining({
      contractVersion: '1.0',
      source: 'manual',
      foods: [expect.objectContaining({
        description: 'Eggs',
        mealType: 'breakfast',
        serving: expect.objectContaining({ basis: 'household', label: '2 whole' }),
        nutrients: expect.objectContaining({ calories: 300, protein: 24, carbs: 4, fat: 20 }),
      })],
    }));
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.logFoodIntake).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Food Name')).toHaveValue('Eggs');
    expect(screen.getByLabelText('Portion/Serving Size')).toHaveValue('2 whole');
  });

  it('creates a manual macro row, lets the client edit it, and updates through /api/macros/:id', async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        success: true,
        entry: {
          id: 42,
          date: '2026-06-20',
          mealType: 'breakfast',
          description: 'Eggs (2 whole)',
          calories: 300,
          protein: 24,
          carbs: 4,
          fat: 20,
          items: [{ id: '1', name: 'Eggs', portion: '2 whole', calories: 300, protein: 24, carbs: 4, fat: 20, quality: 'medium' }],
        },
      },
    });
    mocks.patch.mockResolvedValueOnce({
      data: {
        success: true,
        entry: {
          id: 42,
          date: '2026-06-20',
          mealType: 'lunch',
          description: 'Greek yogurt (1 cup)',
          calories: 160,
          protein: 18,
          carbs: 12,
          fat: 4,
          items: [{ id: '1', name: 'Greek yogurt', portion: '1 cup', calories: 160, protein: 18, carbs: 12, fat: 4, quality: 'high' }],
        },
      },
    });
    const user = userEvent.setup();
    const onDataSent = vi.fn();

    render(<FoodIntakeForm onDataSent={onDataSent} />);
    await fillMeal(user);
    await user.click(screen.getByRole('button', { name: /log food intake/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      mealType: 'breakfast',
      description: 'Eggs (2 whole)',
      calories: 300,
      protein: 24,
      carbs: 4,
      fat: 20,
      source: 'manual',
      verified: false,
    }));
    expect(await screen.findByRole('button', { name: /edit saved meal/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit saved meal/i }));
    await user.selectOptions(screen.getByLabelText(/meal type/i), 'lunch');
    await user.clear(screen.getByLabelText('Food Name'));
    await user.type(screen.getByLabelText('Food Name'), 'Greek yogurt');
    await user.clear(screen.getByLabelText('Portion/Serving Size'));
    await user.type(screen.getByLabelText('Portion/Serving Size'), '1 cup');
    await user.clear(screen.getByLabelText('Calories'));
    await user.type(screen.getByLabelText('Calories'), '160');
    await user.clear(screen.getByLabelText('Protein'));
    await user.type(screen.getByLabelText('Protein'), '18');
    await user.clear(screen.getByLabelText('Carbs'));
    await user.type(screen.getByLabelText('Carbs'), '12');
    await user.clear(screen.getByLabelText('Fat'));
    await user.type(screen.getByLabelText('Fat'), '4');

    await user.click(screen.getByRole('button', { name: /update saved meal/i }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledTimes(1));
    expect(mocks.patch).toHaveBeenCalledWith('/api/macros/42', expect.objectContaining({
      date: '2026-06-20',
      mealType: 'lunch',
      description: 'Greek yogurt (1 cup)',
      calories: 160,
      protein: 18,
      carbs: 12,
      fat: 4,
      verified: false,
    }));
    expect(onDataSent).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(screen.getAllByText(/saved meal updated in my macros/i).length).toBeGreaterThan(0);
    });
    const updateToastText = screen.getAllByText(/saved meal updated in my macros/i)
      .find((element) => element.closest('[role="status"]')?.getAttribute('aria-atomic') === 'true');
    expect(updateToastText).toBeTruthy();
    const updateToast = updateToastText!.closest('[role="status"]');
    expect(updateToast).toHaveAttribute('aria-live', 'polite');
    expect(updateToast).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByLabelText('Food Name')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /log food intake/i }));
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('shows safe update failure copy without leaking raw API errors', async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        success: true,
        entry: { id: 42, mealType: 'breakfast', description: 'Eggs (2)', calories: 300, protein: 24, carbs: 4, fat: 20 },
      },
    });
    mocks.patch.mockRejectedValueOnce(new Error('database token leaked from transport layer'));
    const user = userEvent.setup();

    render(<FoodIntakeForm onDataSent={vi.fn()} />);
    await fillMeal(user);
    await user.click(screen.getByRole('button', { name: /log food intake/i }));
    await screen.findByRole('button', { name: /edit saved meal/i });

    await user.click(screen.getByRole('button', { name: /edit saved meal/i }));
    await user.click(screen.getByRole('button', { name: /update saved meal/i }));

    expect(await screen.findByText('Saved meal could not be updated. Review My Macros before retrying.')).toBeInTheDocument();
    expect(screen.queryByText(/database token leaked/i)).not.toBeInTheDocument();
  });

  it('shows safe create failure copy without leaking raw API errors', async () => {
    mocks.post.mockRejectedValueOnce(new Error('postgres password leaked from transport layer'));
    const user = userEvent.setup();
    const onDataSent = vi.fn();

    render(<FoodIntakeForm onDataSent={onDataSent} />);
    await fillMeal(user);
    await user.click(screen.getByRole('button', { name: /log food intake/i }));

    expect(await screen.findByText('Food intake could not be saved. Review My Macros before retrying.')).toBeInTheDocument();
    expect(screen.queryByText(/postgres password leaked/i)).not.toBeInTheDocument();
    expect(onDataSent).toHaveBeenCalledWith(false);
  });

  it('does not turn exponent or hex manual macro edits into credible payload numbers', async () => {
    mocks.post.mockResolvedValueOnce({ data: { success: true, entry: { id: 42 } } });
    const user = userEvent.setup();

    render(<FoodIntakeForm onDataSent={vi.fn()} />);
    await user.type(screen.getByLabelText('Food Name'), 'Eggs');
    await user.type(screen.getByLabelText('Portion/Serving Size'), '2 whole');
    fireEvent.change(screen.getByLabelText('Calories'), { target: { value: '1e2' } });
    fireEvent.change(screen.getByLabelText('Protein'), { target: { value: '0x10' } });
    await user.click(screen.getByRole('button', { name: /log food intake/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      description: 'Eggs (2 whole)',
      calories: 0,
      protein: 0,
      verified: false,
    }));
  });

  it('removes a saved macro row through /api/macros/:id with safe failure copy', async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        success: true,
        entry: { id: 42, mealType: 'breakfast', description: 'Eggs (2)', calories: 300, protein: 24, carbs: 4, fat: 20 },
      },
    });
    mocks.delete.mockResolvedValueOnce({ data: { success: true } });
    const user = userEvent.setup();
    const onDataSent = vi.fn();

    render(<FoodIntakeForm onDataSent={onDataSent} />);
    await fillMeal(user);
    await user.click(screen.getByRole('button', { name: /log food intake/i }));
    await screen.findByRole('button', { name: /remove saved meal/i });

    await user.click(screen.getByRole('button', { name: /remove saved meal/i }));

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith('/api/macros/42'));
    await waitFor(() => {
      expect(screen.getAllByText(/saved meal removed from my macros/i).length).toBeGreaterThan(0);
    });
    expect(onDataSent).toHaveBeenCalledWith(true);

    mocks.post.mockResolvedValueOnce({
      data: {
        success: true,
        entry: { id: 43, mealType: 'breakfast', description: 'Eggs (2)', calories: 300, protein: 24, carbs: 4, fat: 20 },
      },
    });
    mocks.delete.mockRejectedValueOnce(new Error('raw database failure'));
    await fillMeal(user);
    await user.click(screen.getByRole('button', { name: /log food intake/i }));
    await screen.findByRole('button', { name: /remove saved meal/i });
    await user.click(screen.getByRole('button', { name: /remove saved meal/i }));

    expect(await screen.findByText('Saved meal could not be removed. Review My Macros before retrying.')).toBeInTheDocument();
    expect(screen.queryByText(/raw database failure/i)).not.toBeInTheDocument();
  });
});
