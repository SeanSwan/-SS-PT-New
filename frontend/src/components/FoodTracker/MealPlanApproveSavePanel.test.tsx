
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MealPlanApproveSavePanel from './MealPlanApproveSavePanel';

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    post: apiMocks.post,
  },
}));

const samplePlan = {
  planName: 'Strength day meal plan',
  dailyTargets: { calories: 2000, protein: 160, carbs: 220, fat: 60, fiber: 25 },
  meals: [
    {
      mealType: 'breakfast',
      time: '7:00 AM',
      name: 'Eggs and oats',
      foods: [
        { name: 'Eggs', serving: '2 whole', calories: 140, protein: 12, carbs: 1, fat: 10 },
        { name: 'Oats', serving: '1 cup', calories: 300, protein: 10, carbs: 54, fat: 5 },
      ],
      totalCalories: 440,
      prepTime: '10 min',
    },
  ],
};

const twoMealPlan = {
  planName: 'Two meal plan',
  dailyTargets: { calories: 1000, protein: 80, carbs: 100, fat: 30, fiber: 12 },
  meals: [
    { mealType: 'breakfast', time: '7:00 AM', name: 'Eggs', foods: [{ name: 'Eggs', serving: '2', calories: 140, protein: 12, carbs: 1, fat: 10 }], totalCalories: 140, prepTime: '5 min' },
    { mealType: 'lunch', time: '12:00 PM', name: 'Salad', foods: [{ name: 'Salad', serving: '1 bowl', calories: 200, protein: 8, carbs: 20, fat: 10 }], totalCalories: 200, prepTime: '5 min' },
  ],
};

const localDateString = (date = new Date()) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

describe('MealPlanApproveSavePanel', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the local calendar date for the generated meal-plan log date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 45));

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={vi.fn()} />);

    expect(screen.getByLabelText(/log date/i)).toHaveAttribute('max', '2026-01-05');
    expect(screen.getByLabelText(/log date/i)).toHaveValue('2026-01-05');
  });

  it('resets a manually changed log date when a new generated plan arrives', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 45));
    const { rerender } = render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/log date/i), { target: { value: '2026-01-01' } });
    expect(screen.getByLabelText(/log date/i)).toHaveValue('2026-01-01');
    rerender(<MealPlanApproveSavePanel plan={twoMealPlan} onSaved={vi.fn()} />);
    expect(screen.getByLabelText(/log date/i)).toHaveValue('2026-01-05');
  });

  it('lets the user edit and save generated meal-plan macros through /api/macros', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true, entry: { id: 11 } } });
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText('Breakfast description'));
    await user.type(screen.getByLabelText('Breakfast description'), 'Edited eggs and oats');
    await user.clear(screen.getByLabelText('Breakfast calories'));
    await user.type(screen.getByLabelText('Breakfast calories'), '455');
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(1));
    expect(apiMocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      mealType: 'breakfast',
      description: 'Edited eggs and oats',
      calories: 455,
      protein: 22,
      carbs: 55,
      fat: 15,
      source: 'ai-chat',
      verified: false,
    }));
    expect(onSaved).toHaveBeenCalledWith(true);
    expect(await screen.findByText(/1 meal saved to My Macros/i)).toBeInTheDocument();
  });

  it('shows safe save failure copy without leaking raw API errors', async () => {
    apiMocks.post.mockRejectedValue(new Error('database token leaked from lower layer'));
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={onSaved} />);

    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    expect(await screen.findByText('Meal plan could not be saved. Review My Macros before retrying.')).toBeInTheDocument();
    expect(screen.queryByText(/database token leaked/i)).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(false);
  });

  it('reports an honest partial-save result (some saved, some failed) without leaking errors', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('raw lower-layer failure'));
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={twoMealPlan} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    expect(await screen.findByText(/Saved 1 of 2 meals/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw lower-layer failure/i)).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(true); // partial success still refreshes macros
  });

  it('is idempotent - a second attempt after full success does not re-post to /api/macros', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={twoMealPlan} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(2));

    const savedButton = await screen.findByRole('button', { name: /saved to my macros/i });
    expect(savedButton).toBeDisabled();
    await user.click(savedButton);
    expect(apiMocks.post).toHaveBeenCalledTimes(2); // no duplicate macro writes
  });

  it('blocks concurrent rapid saves before React can rerender the disabled state', async () => {
    const pendingPosts: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingPosts.push(() => resolve({ data: { success: true } }));
    }));

    render(<MealPlanApproveSavePanel plan={twoMealPlan} onSaved={vi.fn()} />);
    const button = screen.getByRole('button', { name: /approve and save meal plan/i });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(2);
    pendingPosts.forEach((resolve) => resolve());
    await waitFor(() => expect(screen.getByRole('button', { name: /saved to my macros/i })).toBeDisabled());
  });

  it('releases the save guard after an unexpected synchronous API failure', async () => {
    apiMocks.post.mockImplementation(() => {
      throw new Error('raw synchronous token failure');
    });
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    expect(await screen.findByText('Meal plan could not be saved. Review My Macros before retrying.')).toBeInTheDocument();
    expect(screen.queryByText(/raw synchronous token/i)).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(false);

    apiMocks.post.mockResolvedValue({ data: { success: true } });
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    await screen.findByText(/1 meal saved to My Macros/i);
    expect(apiMocks.post).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenLastCalledWith(true);
  });

  it('retries ONLY the previously-failed row after a partial failure', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('transient'));
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={twoMealPlan} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));
    await screen.findByText(/Saved 1 of 2 meals/i);
    expect(apiMocks.post).toHaveBeenCalledTimes(2);

    apiMocks.post.mockResolvedValue({ data: { success: true } });
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));
    await screen.findByText(/2 meals saved to My Macros/i);
    expect(apiMocks.post).toHaveBeenCalledTimes(3); // only the 1 failed row re-posted, not both
  });

  it('locks successfully-saved rows after a partial save so skipped retry rows cannot imply editable changes were saved', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('transient'));
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={twoMealPlan} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));
    await screen.findByText(/Saved 1 of 2 meals/i);

    expect(screen.getByLabelText('Meal 1 type')).toBeDisabled();
    expect(screen.getByLabelText('Breakfast description')).toBeDisabled();
    expect(screen.getByLabelText('Breakfast calories')).toBeDisabled();
    expect(screen.getByLabelText('Meal 2 type')).toBeEnabled();
    expect(screen.getByLabelText('Lunch description')).toBeEnabled();
  });

  it('lets each generated meal carry its own meal type and caps the log date at today', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={twoMealPlan} onSaved={vi.fn()} />);

    expect(screen.getByLabelText(/log date/i)).toHaveAttribute('max', localDateString());
    await user.selectOptions(screen.getByLabelText('Meal 1 type'), 'dinner');
    await user.selectOptions(screen.getByLabelText('Meal 2 type'), 'snack');
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(2));
    expect(apiMocks.post).toHaveBeenNthCalledWith(1, '/api/macros', expect.objectContaining({ mealType: 'dinner' }));
    expect(apiMocks.post).toHaveBeenNthCalledWith(2, '/api/macros', expect.objectContaining({ mealType: 'snack' }));
  });

  it('blocks manually-entered future log dates before posting to /api/macros', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/log date/i), { target: { value: '2999-01-01' } });
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    expect(await screen.findByText('Choose today or an earlier log date before saving.')).toBeInTheDocument();
    expect(apiMocks.post).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(false);
  });

  it('does not turn exponent or hex edits into credible macro payload numbers', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Breakfast calories'), { target: { value: '1e2' } });
    fireEvent.change(screen.getByLabelText('Breakfast protein'), { target: { value: '0x10' } });
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(1));
    expect(apiMocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      calories: null,
      protein: null,
    }));
  });

  it('marks the save button busy and announces save status through a live region', async () => {
    const pendingPosts: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingPosts.push(() => resolve({ data: { success: true } }));
    }));

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    expect(await screen.findByRole('button', { name: /saving/i })).toHaveAttribute('aria-busy', 'true');
    pendingPosts.forEach((resolve) => resolve());

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/1 meal saved to My Macros/i);
  });

  it('announces safe save errors through a live region', async () => {
    apiMocks.post.mockRejectedValue(new Error('raw sync api detail'));
    const user = userEvent.setup();

    render(<MealPlanApproveSavePanel plan={samplePlan} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /approve and save meal plan/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Meal plan could not be saved. Review My Macros before retrying.');
    expect(status).not.toHaveTextContent(/raw sync api detail/i);
  });
});
