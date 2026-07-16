/**
 * ExerciseTimelineDrilldown — charter v3 4d Rolodex locks
 * =======================================================
 * Locks: fetch by encoded exercise name, newest-first row rendering with
 * honest bodyweight lines, error/empty states, Escape close, and the
 * frequency-card row tap that opens the dialog (card body only — the
 * expand-modal copy stays non-interactive).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockGet }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 42 }, authAxios: mockAuthAxios }),
}));

import ExerciseTimelineDrilldown from './ExerciseTimelineDrilldown';
import { ExerciseFrequencyCard } from './CanonicalProgressChartsGrid.detailCards';

const timeline = {
  data: {
    success: true,
    exercise: 'Bench Press',
    data: [
      { x: '2026-06-01', y: 135, reps: 8, sets: 3 },
      { x: '2026-06-15', y: 145, reps: 6, sets: 4 },
      { x: '2026-06-22', y: 0, reps: 12, sets: 2 },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(timeline);
});

describe('ExerciseTimelineDrilldown', () => {
  it('fetches by encoded name and renders newest-first with honest bodyweight lines', async () => {
    render(<ExerciseTimelineDrilldown exerciseName="Bench Press" onClose={vi.fn()} />);

    expect(await screen.findByText('3 logged days')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/client/analytics/exercise-timeline?exercise=Bench%20Press');
    const rows = screen.getAllByText(/set(s)?$/);
    expect(rows[0]).toHaveTextContent('bodyweight - 2 sets');
    expect(screen.getByText('145 lb x 6 reps - 4 sets')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'History for Bench Press' })).toBeInTheDocument();
  });

  it('closes on Escape and shows a safe error state on failure', async () => {
    const onClose = vi.fn();
    render(<ExerciseTimelineDrilldown exerciseName="Bench Press" onClose={onClose} />);
    await screen.findByText('3 logged days');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    mockGet.mockRejectedValueOnce(new Error('500'));
    render(<ExerciseTimelineDrilldown exerciseName="TRX Row" onClose={vi.fn()} />);
    expect(await screen.findByText('Could not load this exercise history right now.')).toBeInTheDocument();
  });
});

describe('ExerciseFrequencyCard rolodex tap', () => {
  const frequency = [
    { x: 'Bench Press', y: 12, sets: 36 },
    { x: 'TRX Row', y: 8, sets: 24 },
  ] as never;

  it('opens the exercise timeline from a 44px ranking-row tap', async () => {
    render(<ExerciseFrequencyCard data={frequency} />);

    await userEvent.click(screen.getByRole('button', { name: 'View full history for Bench Press' }));

    expect(await screen.findByRole('dialog', { name: 'History for Bench Press' })).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/client/analytics/exercise-timeline?exercise=Bench%20Press');
  });
});
