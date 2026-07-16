/**
 * WorkoutDayDrilldown + DurationTrendCard trigger — Slice 8.4 tests
 * =================================================================
 * Locks: fetch by MM/DD, loading/error/empty/ready states, set-level
 * formatting (null-honest), Escape + close-button + overlay dismissal,
 * focus restoration to the opener, and the card's 44px trigger path.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockAxiosGet }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 42 }, authAxios: mockAuthAxios }),
}));

import WorkoutDayDrilldown, { formatSet, normalizeDrillPayload } from './WorkoutDayDrilldown';
import { DurationTrendCard, WorkoutFrequencyCard } from './CanonicalProgressChartsGrid.primaryCards';

const dayFixture = {
  date: '2026-07-01',
  sessions: [{
    id: 9,
    duration: 45,
    startTime: '10:00',
    exercises: [
      { name: 'Bench Press', sets: [{ reps: 8, weight: 135, rpe: 7 }, { reps: 8, weight: 140, rpe: null }] },
      { name: 'TRX Row', sets: [{ reps: 12, weight: null, rpe: 6 }] },
    ],
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAxiosGet.mockResolvedValue({ data: { success: true, data: dayFixture } });
});

describe('formatSet', () => {
  it('renders full and null-honest set lines', () => {
    expect(formatSet({ reps: 8, weight: 135, rpe: 7 })).toBe('8 reps x 135 lb  RPE 7');
    expect(formatSet({ reps: 12, weight: null, rpe: null })).toBe('12 reps');
    expect(formatSet({ reps: null, weight: null, rpe: null })).toBe('reps n/a');
  });
});

describe('WorkoutDayDrilldown', () => {
  it('fetches the day by MM/DD and renders set-level truth', async () => {
    render(<WorkoutDayDrilldown md="07/01" onClose={vi.fn()} />);
    expect(await screen.findByText('Bench Press')).toBeInTheDocument();
    expect(mockAxiosGet).toHaveBeenCalledWith('/api/client/analytics/workout-day?md=07%2F01');
    expect(screen.getByText(/8 reps x 135 lb\s+RPE 7/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Workout detail for 07/01' })).toBeInTheDocument();
  });

  it('shows an honest empty note when the day has no detail', async () => {
    mockAxiosGet.mockResolvedValue({ data: { success: true, data: { date: '2026-07-01', sessions: [] } } });
    render(<WorkoutDayDrilldown md="07/01" onClose={vi.fn()} />);
    expect(await screen.findByText('No logged exercise detail for this day.')).toBeInTheDocument();
  });

  it('shows a safe error state on fetch failure', async () => {
    mockAxiosGet.mockRejectedValue(new Error('500'));
    render(<WorkoutDayDrilldown md="07/01" onClose={vi.fn()} />);
    expect(await screen.findByText('Could not load this workout right now.')).toBeInTheDocument();
  });

  it('closes on Escape and on the close button', async () => {
    const onClose = vi.fn();
    render(<WorkoutDayDrilldown md="07/01" onClose={onClose} />);
    await screen.findByText('Bench Press');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Close workout detail' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('focuses the close button on open (focus is trapped at a sane start)', async () => {
    render(<WorkoutDayDrilldown md="07/01" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close workout detail' })).toHaveFocus();
    });
  });

  it('offers the session-PDF export once loaded, and hides it on empty days (P6)', async () => {
    render(<WorkoutDayDrilldown md="07/01" onClose={vi.fn()} />);
    await screen.findByText('Bench Press');
    expect(screen.getByRole('button', { name: 'Download this workout as a PDF' })).toBeInTheDocument();

    mockAxiosGet.mockResolvedValue({ data: { success: true, data: { date: '2026-07-01', sessions: [] } } });
    render(<WorkoutDayDrilldown md="07/02" onClose={vi.fn()} />);
    await screen.findByText('No logged exercise detail for this day.');
    expect(screen.getAllByRole('button', { name: /Download this workout as a PDF/i })).toHaveLength(1);
  });
});

describe('week mode (Slice 9)', () => {
  const weekFixture = {
    weekStart: '2026-06-29',
    days: [
      { date: '2026-06-29', sessions: dayFixture.sessions },
      { date: '2026-07-01', sessions: [{ id: 12, duration: 30, startTime: '18:00', exercises: [] }] },
    ],
  };

  it('normalizes both payload shapes to day blocks', () => {
    expect(normalizeDrillPayload('day', { date: 'd', sessions: [] })).toEqual([{ date: 'd', sessions: [] }]);
    expect(normalizeDrillPayload('week', weekFixture)).toHaveLength(2);
    expect(normalizeDrillPayload('week', { nope: true })).toBeNull();
    expect(normalizeDrillPayload('day', { nope: true })).toBeNull();
  });

  it('fetches the week endpoint and renders per-day headings + session count', async () => {
    mockAxiosGet.mockResolvedValue({ data: { success: true, data: weekFixture } });
    render(<WorkoutDayDrilldown md="06/29" mode="week" onClose={vi.fn()} />);
    expect(await screen.findByText('Week of 06/29')).toBeInTheDocument();
    expect(mockAxiosGet).toHaveBeenCalledWith('/api/client/analytics/workout-week?md=06%2F29');
    expect(screen.getByText('2026-06-29')).toBeInTheDocument();
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();
    expect(screen.getByText('2 sessions logged')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('shows the week-specific honest empty state', async () => {
    mockAxiosGet.mockResolvedValue({ data: { success: true, data: { weekStart: '2026-06-29', days: [] } } });
    render(<WorkoutDayDrilldown md="06/29" mode="week" onClose={vi.fn()} />);
    expect(await screen.findByText('No logged workouts for this week.')).toBeInTheDocument();
  });
});

describe('WorkoutFrequencyCard week trigger (Slice 9)', () => {
  it('opens the week drill-down for the latest bar via the 44px button', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { success: true, data: { weekStart: '2026-06-29', days: [] } },
    });
    render(<WorkoutFrequencyCard data={[{ x: '06/22', y: 3 }, { x: '06/29', y: 2 }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'View week of 06/29' }));
    expect(await screen.findByRole('dialog', { name: 'Workout detail for 06/29' })).toBeInTheDocument();
    expect(mockAxiosGet).toHaveBeenCalledWith('/api/client/analytics/workout-week?md=06%2F29');
  });

  it('renders no trigger when the chart is empty', () => {
    render(<WorkoutFrequencyCard data={[]} />);
    expect(screen.queryByRole('button', { name: /View week/ })).not.toBeInTheDocument();
  });
});

describe('overlay stacking contract', () => {
  it('keeps the dialog overlay above the fixed header/dropdown/toast tokens', () => {
    // Header is --z-header: 1250 (tokens.css); dropdown 1260; toast 1300.
    // The shipped 1200 put the header ON TOP of the open dialog (found in
    // the 2026-07-02 post-deploy hostile review). Lock the house 2200.
    const styles = readFileSync(resolve(__dirname, './WorkoutDayDrilldown.styles.ts'), 'utf8');
    const match = styles.match(/z-index:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(2200);
  });
});

describe('DurationTrendCard drill trigger', () => {
  const chartData = [
    { x: '06/28', y: 40 },
    { x: '07/01', y: 45 },
  ];

  it('opens the drill-down for the latest session via the 44px button and restores focus on close', async () => {
    render(<DurationTrendCard data={chartData} />);
    const trigger = screen.getByRole('button', { name: 'View workout for 07/01' });
    await userEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Workout detail for 07/01' })).toBeInTheDocument();
    expect(mockAxiosGet).toHaveBeenCalledWith('/api/client/analytics/workout-day?md=07%2F01');
    await userEvent.click(screen.getByRole('button', { name: 'Close workout detail' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('renders no trigger when the chart is empty', () => {
    render(<DurationTrendCard data={[]} />);
    expect(screen.queryByRole('button', { name: /View workout/ })).not.toBeInTheDocument();
    expect(screen.getByText('No duration data yet')).toBeInTheDocument();
  });
});
