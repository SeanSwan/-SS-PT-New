/**
 * WorkoutDayDrilldown + DurationTrendCard trigger — Slice 8.4 tests
 * =================================================================
 * Locks: fetch by MM/DD, loading/error/empty/ready states, set-level
 * formatting (null-honest), Escape + close-button + overlay dismissal,
 * focus restoration to the opener, and the card's 44px trigger path.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockAxiosGet }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 42 }, authAxios: mockAuthAxios }),
}));

import WorkoutDayDrilldown, { formatSet } from './WorkoutDayDrilldown';
import { DurationTrendCard } from './CanonicalProgressChartsGrid.primaryCards';

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
});

describe('overlay stacking contract', () => {
  it('keeps the dialog overlay above the fixed header/dropdown/toast tokens', () => {
    // Header is --z-header: 1250 (tokens.css); dropdown 1260; toast 1300.
    // The shipped 1200 put the header ON TOP of the open dialog (found in
    // the 2026-07-02 post-deploy hostile review). Lock the house 2200.
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
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
