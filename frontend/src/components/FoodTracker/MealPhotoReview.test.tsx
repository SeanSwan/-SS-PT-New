/**
 * MealPhotoReview.test — Slice 1.4 photo-confirm save + idempotency.
 * Locks: each analyzed food saves once to /api/macros; a rapid double-tap cannot
 * double-write (savingRef guard, hostile-review parity with MealPlanApproveSavePanel);
 * onSaved fires on success.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MealPhotoReview from './MealPhotoReview';

const apiMocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: { post: apiMocks.post } }));

const analysis = {
  mealType: 'lunch',
  foods: [
    { name: 'Chicken', calories: 200, protein: 30, carbs: 0, fat: 5, confidence: 0.8 },
    { name: 'Rice', calories: 250, protein: 5, carbs: 50, fat: 1, confidence: 0.7 },
  ],
};

describe('MealPhotoReview (Slice 1.4)', () => {
  beforeEach(() => { apiMocks.post.mockReset(); });

  it('saves each analyzed food once and refreshes on success', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const onSaved = vi.fn();

    render(<MealPhotoReview analysis={analysis} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText(/saved 2 items to today's log/i)).toBeInTheDocument();
    expect(apiMocks.post).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalled();
  });

  it('blocks a rapid double-tap from double-writing (savingRef guard)', async () => {
    const pending: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => { pending.push(() => resolve({ data: { success: true } })); }));

    render(<MealPhotoReview analysis={analysis} onSaved={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /approve .*save to today/i });
    fireEvent.click(btn);
    fireEvent.click(btn); // second tap before the first batch resolves

    expect(apiMocks.post).toHaveBeenCalledTimes(2); // 2 foods, ONE batch, not 4
    pending.forEach((resolve) => resolve());
    expect(await screen.findByText(/saved 2 items to today's log/i)).toBeInTheDocument();
  });

  it('releases the save guard after an unexpected synchronous API failure', async () => {
    apiMocks.post.mockImplementation(() => {
      throw new Error('raw synchronous api failure');
    });

    render(<MealPhotoReview analysis={analysis} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText('Could not save that meal. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/raw synchronous api/i)).not.toBeInTheDocument();

    apiMocks.post.mockResolvedValue({ data: { success: true } });
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText(/saved 2 items to today's log/i)).toBeInTheDocument();
    expect(apiMocks.post).toHaveBeenCalledTimes(3);
  });

  it('on partial failure removes saved rows so a retry re-posts ONLY the failed food', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce(new Error('transient'));

    render(<MealPhotoReview analysis={analysis} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText(/saved 1 of 2/i)).toBeInTheDocument();
    expect(apiMocks.post).toHaveBeenCalledTimes(2);

    apiMocks.post.mockResolvedValue({ data: { success: true } });
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText(/saved 1 item to today's log/i)).toBeInTheDocument();
    expect(apiMocks.post).toHaveBeenCalledTimes(3); // only the 1 failed row re-posted, not both
  });

  it('reports a failed save when every reviewed food fails to save', async () => {
    apiMocks.post.mockRejectedValue(new Error('SQLSTATE raw macro insert trace'));
    const onSaved = vi.fn();

    render(<MealPhotoReview analysis={analysis} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText(/saved 0 of 2/i)).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE raw/i)).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(false);
  });

  it('marks the save button busy and announces save status through a live region', async () => {
    const pending: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => { pending.push(() => resolve({ data: { success: true } })); }));

    render(<MealPhotoReview analysis={analysis} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByRole('button', { name: /saving/i })).toHaveAttribute('aria-busy', 'true');
    pending.forEach((resolve) => resolve());

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/saved 2 items to today's log/i);
  });

  it('labels confidence as an AI estimate instead of a bare percentage', () => {
    render(<MealPhotoReview analysis={analysis} onSaved={vi.fn()} />);

    expect(screen.getByText(/AI estimate 80%/i)).toBeInTheDocument();
    expect(screen.getByText(/AI estimate 70%/i)).toBeInTheDocument();
  });

  it('lets each reviewed photo food save with its own meal type', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });

    render(<MealPhotoReview analysis={analysis} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/meal type for chicken/i), { target: { value: 'breakfast' } });
    fireEvent.change(screen.getByLabelText(/meal type for rice/i), { target: { value: 'dinner' } });
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText(/saved 2 items to today's log/i)).toBeInTheDocument();
    expect(apiMocks.post).toHaveBeenNthCalledWith(1, '/api/macros', expect.objectContaining({ description: 'Chicken', mealType: 'breakfast' }));
    expect(apiMocks.post).toHaveBeenNthCalledWith(2, '/api/macros', expect.objectContaining({ description: 'Rice', mealType: 'dinner' }));
  });

  it('does not render malformed confidence values as estimate percentages', () => {
    render(<MealPhotoReview analysis={{
      mealType: 'lunch',
      foods: [
        { name: 'Soup', calories: 120, protein: 8, carbs: 12, fat: 4, confidence: Number.NaN },
        { name: 'Toast', calories: 90, protein: 3, carbs: 15, fat: 2, confidence: Number.POSITIVE_INFINITY },
      ],
    } as any} onSaved={vi.fn()} />);

    expect(screen.queryByText(/AI estimate NaN%/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI estimate Infinity%/i)).not.toBeInTheDocument();
  });

  it('does not turn exponent or hex edits into credible macro payload numbers', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });

    render(<MealPhotoReview analysis={analysis} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/calories for chicken/i), { target: { value: '1e2' } });
    fireEvent.change(screen.getByLabelText(/protein for chicken/i), { target: { value: '0x10' } });
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    expect(await screen.findByText(/saved 2 items to today's log/i)).toBeInTheDocument();
    expect(apiMocks.post).toHaveBeenNthCalledWith(
      1,
      '/api/macros',
      expect.objectContaining({
        description: 'Chicken',
        calories: null,
        protein: null,
      }),
    );
  });

  it('tells the client unnamed rows are skipped and only saves named rows', async () => {
    apiMocks.post.mockResolvedValue({ data: { success: true } });
    const withBlankRow = {
      mealType: 'snack',
      foods: [
        { name: '', calories: 999, protein: 0, carbs: 0, fat: 0, confidence: 0.4 },
        { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0, confidence: 0.9 },
      ],
    };

    render(<MealPhotoReview analysis={withBlankRow} onSaved={vi.fn()} />);

    const warning = screen.getByText(/1 unnamed row will be skipped/i).closest('[role="status"]');
    expect(warning).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(screen.getByRole('button', { name: /approve .*save to today/i }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/saved 1 item to today's log/i));
    expect(screen.getByRole('status')).toHaveTextContent(/1 unnamed row was skipped and was not saved/i);
    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(apiMocks.post).toHaveBeenCalledWith('/api/macros', expect.objectContaining({ description: 'Banana' }));
  });

  it('does not offer a save action when every analyzed row is unnamed', () => {
    const blankOnly = {
      mealType: 'snack',
      foods: [{ name: '', calories: 999, protein: 0, carbs: 0, fat: 0, confidence: 0.4 }],
    };

    render(<MealPhotoReview analysis={blankOnly} onSaved={vi.fn()} />);

    expect(screen.getByText(/1 unnamed row will be skipped/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve .*save to today/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/food 1 name/i), { target: { value: 'Banana' } });
    expect(screen.getByRole('button', { name: /approve .*save to today/i })).not.toBeDisabled();
  });
});
