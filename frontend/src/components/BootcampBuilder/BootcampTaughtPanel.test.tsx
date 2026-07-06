/**
 * BootcampTaughtPanel interaction tests (Slice 0.2)
 *
 * Locks: one-tap logClass with the exact payload; double-tap logs once;
 * error path re-enables; success confirms + refetches history; truthful
 * empty state; null-bootcamp renders history only; ClassPreviewPanel wiring.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import BootcampTaughtPanel from './BootcampTaughtPanel';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';

const logClass = vi.fn();
const getHistory = vi.fn();

vi.mock('../../hooks/useBootcampAPI', () => ({
  useBootcampAPI: () => ({ logClass, getHistory }),
}));

const bootcamp = {
  name: 'Test Class',
  classFormat: 'station_rotation',
  dayType: 'lower_body',
  stationCount: 2,
  targetDuration: 45,
  totalWorkoutMin: 35,
  demoDuration: 5,
  clearDuration: 5,
  totalClassMin: 45,
  expectedParticipants: 10,
  stations: [],
  exercises: [
    { exerciseName: 'Goblet Squat', durationSec: 45, restSec: 15, sortOrder: 1, stationIndex: 0, board: 'main' },
    { exerciseName: 'Wall Sit', durationSec: 30, restSec: 15, sortOrder: 2, board: 'alternative' },
  ],
  overflowPlan: null,
  explanations: [],
  aiGenerated: false,
} as unknown as GeneratedBootcamp;

describe('BootcampTaughtPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHistory.mockResolvedValue({ success: true, logs: [], total: 0 });
  });

  it('logs the class once with the exact main-board payload, confirms, and refetches history', async () => {
    logClass.mockResolvedValue(41);

    render(<BootcampTaughtPanel bootcamp={bootcamp} />);
    await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(1));

    const button = screen.getByRole('button', { name: /mark this class as taught/i });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(logClass).toHaveBeenCalledTimes(1));
    const payload = logClass.mock.calls[0][0];
    expect(payload.dayType).toBe('lower_body');
    expect(payload.actualParticipants).toBe(10);
    expect(payload.classDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.exercisesUsed).toEqual([
      { exerciseName: 'Goblet Squat', stationIndex: 0, durationSec: 45 },
    ]);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/class logged/i));
    expect(screen.queryByRole('button', { name: /mark this class as taught/i })).toBeNull();
    expect(getHistory).toHaveBeenCalledTimes(2);
  });

  it('surfaces log errors and re-enables the action', async () => {
    logClass.mockRejectedValue(new Error('Failed to log class'));

    render(<BootcampTaughtPanel bootcamp={bootcamp} />);
    const button = await screen.findByRole('button', { name: /mark this class as taught/i });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to log class'));
    expect(screen.getByRole('button', { name: /mark this class as taught/i })).toBeEnabled();
    expect(screen.queryByText(/class logged/i)).toBeNull();
  });

  it('renders a truthful empty history state and no button without a generated class', async () => {
    render(<BootcampTaughtPanel bootcamp={null} />);

    expect(await screen.findByText(/no classes logged yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark this class as taught/i })).toBeNull();
  });

  it('renders recent history rows with date, day type, and exercise count', async () => {
    getHistory.mockResolvedValue({
      success: true,
      total: 2,
      logs: [
        { id: 1, classDate: '2026-07-04', dayType: 'cardio', exercisesUsed: [{}, {}, {}], classRating: 4 },
        { id: 2, classDate: '2026-07-02', dayType: 'lower_body', exercisesUsed: [{}], classRating: null },
      ],
    });

    render(<BootcampTaughtPanel bootcamp={null} />);

    expect(await screen.findByText(/2026-07-04 · Cardio/)).toBeInTheDocument();
    expect(screen.getByText(/3 exercises · rated 4\/5/)).toBeInTheDocument();
    expect(screen.getByText(/2026-07-02 · Lower Body/)).toBeInTheDocument();
    expect(screen.getByText(/^1 exercises$/)).toBeInTheDocument();
  });

  it('is wired into ClassPreviewPanel (canonical mount truth)', () => {
    const source = readFileSync(resolve(__dirname, 'ClassPreviewPanel.tsx'), 'utf8');
    expect(source).toContain("import BootcampTaughtPanel from './BootcampTaughtPanel'");
    expect(source).toContain('<BootcampTaughtPanel bootcamp={bootcamp ?? null} floorMode={floorMode} />');
  });
});
