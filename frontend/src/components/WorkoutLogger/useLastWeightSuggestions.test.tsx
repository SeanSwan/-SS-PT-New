/**
 * Last-weight suggestions — blueprint S5 frontend acceptance suite.
 * Covers: chip renders only for names in the map, tap fills the input through
 * the EXISTING onUpdateSet handler, untouched inputs keep submitting as
 * before, chip disappears once a weight is set, and the hook fetches once +
 * fails silent.
 */
import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseSet, ExerciseEntry } from '../../services/nasmApiService';
import ExerciseSetRowComponent from './ExerciseSetRowComponent';
import { useLastWeightSuggestions, type LastWeightSuggestion } from './useLastWeightSuggestions';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('../../services/api.service', () => ({
  default: { get: mockGet, post: vi.fn() },
  ApiService: class {},
}));

const set = (weight = 0): ExerciseSet => ({
  loggerSetId: 'set-1', setNumber: 2, weight, reps: 0, rpe: null, tempo: '',
  restTime: 60, formQuality: null, notes: '',
} as unknown as ExerciseSet);

const rowProps = (overrides: Partial<React.ComponentProps<typeof ExerciseSetRowComponent>> = {}) => ({
  exerciseName: 'Leg Press',
  exerciseIndex: 0,
  set: set(),
  setIndex: 1,
  showDetails: false,
  isLogged: false,
  canRemove: true,
  onToggleLogged: vi.fn(),
  onUpdateSet: vi.fn(),
  onRemoveSet: vi.fn(),
  ...overrides,
});

const legPressSuggestion: LastWeightSuggestion = { weight: 90, reps: 11, at: '2026-07-10' };

describe('last-weight chip in the set row (blueprint S5)', () => {
  it('renders the chip + placeholder only when a suggestion exists for the name', () => {
    const getLastWeight = (name: string) => (name === 'Leg Press' ? legPressSuggestion : null);
    const { rerender } = render(<ExerciseSetRowComponent {...rowProps()} getLastWeight={getLastWeight} />);
    expect(screen.getByRole('button', { name: 'Use last weight 90 pounds' })).toHaveTextContent('last: 90 lbs · Jul 10');
    expect(screen.getByRole('spinbutton', { name: /set 2 weight/i })).toHaveAttribute('placeholder', '90');

    rerender(<ExerciseSetRowComponent {...rowProps({ exerciseName: 'Box Squat' })} getLastWeight={getLastWeight} />);
    expect(screen.queryByRole('button', { name: /use last weight/i })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /set 2 weight/i })).toHaveAttribute('placeholder', '0');
  });

  it('tap fills the weight through the existing set-update handler', () => {
    const onUpdateSet = vi.fn();
    render(
      <ExerciseSetRowComponent
        {...rowProps({ onUpdateSet })}
        getLastWeight={() => legPressSuggestion}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use last weight 90 pounds' }));
    expect(onUpdateSet).toHaveBeenCalledWith(0, 1, 'weight', 90);
  });

  it('never auto-commits: an untouched row makes no update calls and typing still works', () => {
    const onUpdateSet = vi.fn();
    render(
      <ExerciseSetRowComponent
        {...rowProps({ onUpdateSet })}
        getLastWeight={() => legPressSuggestion}
      />,
    );
    expect(onUpdateSet).not.toHaveBeenCalled(); // suggestion alone commits nothing
    fireEvent.change(screen.getByRole('spinbutton', { name: /set 2 weight/i }), { target: { value: '95' } });
    expect(onUpdateSet).toHaveBeenCalledWith(0, 1, 'weight', 95);
  });

  it('hides the chip once the weight is set (typed or filled)', () => {
    render(
      <ExerciseSetRowComponent
        {...rowProps({ set: set(90) })}
        getLastWeight={() => legPressSuggestion}
      />,
    );
    expect(screen.queryByRole('button', { name: /use last weight/i })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /set 2 weight/i })).toHaveValue(90);
  });
});

describe('useLastWeightSuggestions hook (blueprint S5)', () => {
  beforeEach(() => { mockGet.mockReset(); });

  const exercises = [
    { exerciseName: 'Leg Press' },
    { exerciseName: 'Chest Press Machine' },
    { exerciseName: 'Leg Press' }, // duplicate — must dedupe in the query
  ] as unknown as ExerciseEntry[];

  it('fetches once per name-set and exposes normalized lookups', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, weights: { 'leg press': { weight: 100, reps: 11, at: '2026-07-10' } } },
    });
    const { result, rerender } = renderHook(() => useLastWeightSuggestions({ clientId: 84, exercises }));
    await waitFor(() => expect(result.current.suggestions.size).toBe(1));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet.mock.calls[0][0]).toContain('clientId=84');
    expect(mockGet.mock.calls[0][0]).toContain(encodeURIComponent('Chest Press Machine,Leg Press'));
    expect(result.current.getLastWeight('LEG   PRESS')).toEqual({ weight: 100, reps: 11, at: '2026-07-10' });
    expect(result.current.getLastWeight('Box Squat')).toBeNull();
    rerender();
    expect(mockGet).toHaveBeenCalledTimes(1); // fetch-once per plan load
  });

  it('fails silent: a network error leaves the logger suggestion-free', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLastWeightSuggestions({ clientId: 84, exercises }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.suggestions.size).toBe(0);
    expect(result.current.getLastWeight('Leg Press')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not fetch without a client or exercises', () => {
    renderHook(() => useLastWeightSuggestions({ clientId: null, exercises }));
    renderHook(() => useLastWeightSuggestions({ clientId: 84, exercises: [] }));
    expect(mockGet).not.toHaveBeenCalled();
  });
});
