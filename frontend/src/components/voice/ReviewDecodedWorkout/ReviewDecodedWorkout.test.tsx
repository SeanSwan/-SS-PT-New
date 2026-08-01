/**
 * ReviewDecodedWorkout.test.tsx — S8 acceptance fence.
 * Locks: rows come from THE canonical mapper (identical to the manual-path
 * mapper — the byte-pinned save body is preserved because commit hands rows
 * to the same logger state, this surface owns no network); nothing
 * auto-commits; every field is editable; low-confidence renders "check
 * this"; pain flags are visible and never silent; Undo appears for 5s.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import ReviewDecodedWorkout from './ReviewDecodedWorkout';
import { mapDecodedWorkoutToRows } from '../../../utils/workout/mapDecodedWorkoutToRows';
import { parsedWorkoutToExerciseEntries } from '../../WorkoutLogger/workoutLoggerVoiceImport';
import type { ParsedWorkout } from '../../WorkoutLogger/VoiceMemoUpload';

const WORKOUT: ParsedWorkout = {
  exercises: [
    { exerciseName: 'Bench Press', sets: [{ setNumber: 1, weight: 185, reps: 8 }] },
    { exerciseName: 'Goblet Squat', sets: [{ setNumber: 1, weight: null, reps: 12 }] },
  ],
  confidence: 0.9,
  painFlags: [{ bodyRegion: 'knee', side: 'right', mention: 'knee felt tight' }],
};

const renderSurface = (overrides: Partial<React.ComponentProps<typeof ReviewDecodedWorkout>> = {}) =>
  render(
    <ReviewDecodedWorkout
      workout={WORKOUT}
      transcript="bench three by eight at one eighty five"
      onCommit={overrides.onCommit ?? vi.fn()}
      onUndo={overrides.onUndo ?? vi.fn()}
      onClose={overrides.onClose ?? vi.fn()}
      {...overrides}
    />,
  );

describe('S8 ReviewDecodedWorkout', () => {
  it('maps through the SAME row shape as the manual voice-import path (byte-pin preserved)', () => {
    const canonical = mapDecodedWorkoutToRows(WORKOUT, 'pin').rows;
    const manual = parsedWorkoutToExerciseEntries(WORKOUT, 'pin');
    expect(canonical).toEqual(manual);
  });

  it('owns no network: commit only fires the callback with the edited rows', () => {
    const src = readFileSync(resolve(__dirname, 'ReviewDecodedWorkout.tsx'), 'utf8');
    expect(src).not.toMatch(/fetch\(|axios|authAxios|apiService/);
    const onCommit = vi.fn();
    renderSurface({ onCommit });
    expect(onCommit).not.toHaveBeenCalled(); // nothing auto-commits, ever
    fireEvent.change(screen.getAllByLabelText('Set 1 weight')[0], { target: { value: '190' } });
    fireEvent.click(screen.getByTestId('review-commit'));
    expect(onCommit).toHaveBeenCalledTimes(1);
    const [rows, meta] = onCommit.mock.calls[0];
    expect(rows[0].sets[0].weight).toBe(190);
    expect(meta.needsReview).toBe(true); // Goblet Squat weight was null → flagged
  });

  it('shows the transcript receipt, pain flags, and the check-this affordance', () => {
    renderSurface();
    expect(screen.getByLabelText('Transcript').textContent).toMatch(/one eighty five/);
    expect(screen.getByTestId('review-pain-flags').textContent).toMatch(/knee \(right\)/);
    expect(screen.getByText(/Check this: set 1 weight/)).toBeTruthy();
  });

  it('offers Undo after commit and routes it through onUndo', () => {
    const onUndo = vi.fn();
    renderSurface({ onUndo });
    fireEvent.click(screen.getByTestId('review-commit'));
    const undoBar = screen.getByTestId('review-undo-bar');
    expect(undoBar).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('draftMode renders draft framing for the History-Import door', () => {
    renderSurface({ draftMode: true });
    expect(screen.getByRole('dialog', { name: /draft/i })).toBeTruthy();
    expect(screen.getByTestId('review-commit').textContent).toBe('Save draft');
  });
});
