/**
 * FocusFlowSkin contract: rail states, NOW hero, next-up chip, prev/next
 * navigation, rest-aware thumb bar, rolodex entry — all through the
 * RunnerEngine contract (no reach-ins). RunnerCollection fallback: a
 * crashing skin renders the Classic list with the session intact.
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FocusFlowSkin from './FocusFlowSkin';
import RunnerCollection from './RunnerCollection';
import { writeRunnerStyle } from './runnerStyles';
import type { RunnerEngine } from './RunnerEngine.types';

// Logged = reps > 0 (the sessionStats/server-proof contract).
const set = (logged: boolean, n = 1) => ({
  loggerSetId: `s${n}`, setNumber: n, weight: 100, reps: logged ? 8 : 0,
  rpe: null, formQuality: null, restTime: 60,
});

const makeEngine = (overrides: Partial<RunnerEngine> = {}): RunnerEngine => ({
  exercises: [
    { exerciseName: 'Bench Press', exerciseId: 'x1', loggerExerciseId: 'e1', formRating: null, painLevel: 0, sets: [set(true, 1), set(true, 2)] },
    { exerciseName: 'Goblet Squat', exerciseId: 'x2', loggerExerciseId: 'e2', formRating: null, painLevel: 0, sets: [set(true, 1), set(false, 2), set(false, 3)] },
    { exerciseName: 'Plank', exerciseId: 'x3', loggerExerciseId: 'e3', formRating: null, painLevel: 0, sets: [set(false, 1)] },
  ],
  renderExerciseCard: vi.fn((index: number) => <div data-testid={`card-${index}`} />),
  stats: { completedSets: 3, totalSets: 6 },
  rest: { isRunning: false, secondsLeft: 0, stop: vi.fn(), extend: vi.fn() },
  openRolodex: vi.fn(),
  ...overrides,
});

beforeEach(() => window.localStorage.clear());

describe('FocusFlowSkin', () => {
  it('opens on the first incomplete exercise with hero + next-up + its card', () => {
    const engine = makeEngine();
    render(<FocusFlowSkin engine={engine} />);
    expect(screen.getByRole('heading', { name: 'Goblet Squat' })).toBeInTheDocument();
    expect(screen.getByText(/SET 2 OF 3/)).toBeInTheDocument();
    expect(screen.getByTestId('card-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next up: Plank/ })).toBeInTheDocument();
  });

  it('rail chips: done exercise marked completed; tapping a chip navigates', () => {
    const engine = makeEngine();
    render(<FocusFlowSkin engine={engine} />);
    expect(screen.getByRole('tab', { name: 'Bench Press, completed' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Plank' }));
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
  });

  it('prev/next thumb buttons navigate and disable at the ends', () => {
    const engine = makeEngine();
    render(<FocusFlowSkin engine={engine} />);
    const next = screen.getByRole('button', { name: 'Next exercise' });
    fireEvent.click(next);
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
    expect(next).toBeDisabled();
    const prev = screen.getByRole('button', { name: 'Previous exercise' });
    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(screen.getByTestId('card-0')).toBeInTheDocument();
    expect(prev).toBeDisabled();
  });

  it('session meter by default; rest bar (countdown, +15s, skip) while resting', () => {
    const stop = vi.fn();
    const extend = vi.fn();
    const engine = makeEngine({ rest: { isRunning: true, secondsLeft: 83, stop, extend } });
    render(<FocusFlowSkin engine={engine} />);
    expect(screen.getByText('1:23')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add 15 seconds of rest' }));
    expect(extend).toHaveBeenCalledWith(15);
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));
    expect(stop).toHaveBeenCalled();
  });

  it('Add chip and last-exercise next-up both open the Rolodex', () => {
    const engine = makeEngine();
    render(<FocusFlowSkin engine={engine} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add another exercise' }));
    expect(engine.openRolodex).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('tab', { name: 'Plank' }));
    fireEvent.click(screen.getByRole('button', { name: /Last exercise/ }));
    expect(engine.openRolodex).toHaveBeenCalledTimes(2);
  });
});

describe('RunnerCollection', () => {
  it('classic-ledger selection renders the classic list, no skin', () => {
    writeRunnerStyle('classic-ledger');
    render(
      <RunnerCollection
        engine={makeEngine()}
        renderClassicList={() => <div data-testid='classic-list' />}
      />,
    );
    expect(screen.getByTestId('classic-list')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Exercises in this session' })).toBeNull();
  });

  it('a crashing skin falls back to the classic list (session never lost)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const engine = makeEngine({
      renderExerciseCard: () => { throw new Error('skin exploded'); },
    });
    render(
      <RunnerCollection
        engine={engine}
        renderClassicList={() => <div data-testid='classic-list' />}
      />,
    );
    expect(screen.getByTestId('classic-list')).toBeInTheDocument();
    spy.mockRestore();
  });
});
