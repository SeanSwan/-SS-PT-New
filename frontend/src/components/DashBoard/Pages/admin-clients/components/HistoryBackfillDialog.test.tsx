/**
 * HistoryBackfillDialog — charter v3 H UI locks
 * =============================================
 * Locks: grounding form → preview call shape, honest preview summary
 * (pool size + conflict skips), the 10-char attestation gate on commit,
 * commit payload (days + attestation + grounding), and one-tap run undo.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ post: mockPost }));
vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'admin' }, authAxios: mockAuthAxios }),
}));

import HistoryBackfillDialog from './HistoryBackfillDialog';

const previewResponse = {
  data: {
    success: true,
    exercisePoolSize: 9,
    conflictDates: ['2026-04-03'],
    days: [
      { date: '2026-04-01', exercises: [{ exerciseName: 'Squat' }, { exerciseName: 'Bench Press' }] },
      { date: '2026-04-02', exercises: [{ exerciseName: 'TRX Row' }] },
    ],
  },
};

const fillRange = async () => {
  await userEvent.type(screen.getByLabelText('Backfill start date'), '2026-04-01');
  await userEvent.type(screen.getByLabelText('Backfill end date'), '2026-04-14');
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue(previewResponse);
});

describe('HistoryBackfillDialog', () => {
  it('previews with the grounding answers and reports the honest summary', async () => {
    render(<HistoryBackfillDialog open clientId={42} onClose={vi.fn()} onCommitted={vi.fn()} />);
    await fillRange();
    await userEvent.type(screen.getByLabelText('Exercises the client focused on in this period'), 'Squat, Bench Press');
    await userEvent.click(screen.getByRole('button', { name: 'Preview backfill' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/clients/42/workouts/backfill/preview',
      { startDate: '2026-04-01', endDate: '2026-04-14', sessionsPerWeek: 3, dominantExercises: ['Squat', 'Bench Press'] },
    ));
    expect(await screen.findByText(/2 sessions will be created/)).toBeInTheDocument();
    expect(screen.getByText(/grounded in 9 logged exercises/)).toBeInTheDocument();
    expect(screen.getByText(/1 date\(s\) skipped/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-01: Squat, Bench Press/)).toBeInTheDocument();
  });

  it('gates commit behind a 10+ character attestation, then posts days + grounding', async () => {
    const onCommitted = vi.fn();
    render(<HistoryBackfillDialog open clientId={42} onClose={vi.fn()} onCommitted={onCommitted} />);
    await fillRange();
    await userEvent.click(screen.getByRole('button', { name: 'Preview backfill' }));
    await screen.findByText(/2 sessions will be created/);

    const commitButton = screen.getByRole('button', { name: 'Commit 2 sessions' });
    expect(commitButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Trainer attestation'), 'Client trained with me through April.');
    expect(commitButton).toBeEnabled();

    mockPost.mockResolvedValueOnce({ data: { success: true, runId: 5, created: [1, 2], skipped: [] } });
    await userEvent.click(commitButton);

    await waitFor(() => expect(mockPost).toHaveBeenLastCalledWith(
      '/api/admin/clients/42/workouts/backfill/commit',
      expect.objectContaining({
        attestation: 'Client trained with me through April.',
        grounding: { sessionsPerWeek: 3, dominantExercises: [] },
        days: previewResponse.data.days,
      }),
    ));
    expect(await screen.findByText(/Run #5 committed: 2 created, 0 skipped/)).toBeInTheDocument();
    expect(onCommitted).toHaveBeenCalledTimes(1);
  });

  it('undoes a committed run in one tap and refreshes the history', async () => {
    const onCommitted = vi.fn();
    render(<HistoryBackfillDialog open clientId={42} onClose={vi.fn()} onCommitted={onCommitted} />);
    await fillRange();
    await userEvent.click(screen.getByRole('button', { name: 'Preview backfill' }));
    await screen.findByText(/2 sessions will be created/);
    await userEvent.type(screen.getByLabelText('Trainer attestation'), 'Client trained with me through April.');
    mockPost.mockResolvedValueOnce({ data: { success: true, runId: 5, created: [1, 2], skipped: [] } });
    await userEvent.click(screen.getByRole('button', { name: 'Commit 2 sessions' }));
    await screen.findByText(/Run #5 committed/);

    mockPost.mockResolvedValueOnce({ data: { success: true } });
    await userEvent.click(screen.getByRole('button', { name: 'Undo run #5' }));

    await waitFor(() => expect(mockPost).toHaveBeenLastCalledWith('/api/admin/backfill-runs/5/undo', {}));
    expect(await screen.findByText(/Run undone/)).toBeInTheDocument();
    expect(onCommitted).toHaveBeenCalledTimes(2);
  });

  it('surfaces backend rejections honestly (e.g. range cap)', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { message: 'Backfill range is capped at 120 days per run' } } });
    render(<HistoryBackfillDialog open clientId={42} onClose={vi.fn()} onCommitted={vi.fn()} />);
    await fillRange();
    await userEvent.click(screen.getByRole('button', { name: 'Preview backfill' }));
    expect(await screen.findByText('Backfill range is capped at 120 days per run')).toBeInTheDocument();
  });
});
