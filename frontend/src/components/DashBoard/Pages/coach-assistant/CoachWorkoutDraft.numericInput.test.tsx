/** HR10 native-style typing regression; real controlled component, synthetic local owner. */
import React, { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CoachWorkoutDraft, { validateDraftForDesk } from './CoachWorkoutDraft';
import type { CoachWorkoutDraftContent } from './coachWorkoutDraftContract';

vi.mock('../../../WorkoutLogger/NASMExerciseRolodex', () => ({
  default: () => null, isCanonicalExerciseSelection: () => true,
}));
const initial = (): CoachWorkoutDraftContent => ({
  date: '2026-09-12', title: null, notes: null,
  exercises: [{ exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
    exerciseId: '33333333-3333-4333-8333-333333333333', exerciseKey: 'barbell-bench-press',
    exerciseName: 'Barbell Bench Press', unit: 'lb', sets: [{ setNumber: 1, reps: 8, weight: null }] }],
});
const setup = () => {
  let latest = initial();
  const edits = vi.fn();
  function Probe() {
    const [content, setContent] = useState(latest);
    const [disabled, setDisabled] = useState(false);
    latest = content;
    return <><CoachWorkoutDraft content={content} disabled={disabled} validationMode="review"
      onContentChange={next => { edits(next); setContent(next); }} />
      <button type="button" onClick={() => setDisabled(true)}>Freeze review</button></>;
  }
  render(<Probe />);
  return { user: userEvent.setup(), edits, content: () => latest,
    load: screen.getByTestId('coach-workout-set-weight-0-1') as HTMLInputElement,
    reps: screen.getByTestId('coach-workout-set-reps-0-1') as HTMLInputElement };
};
afterEach(cleanup);

describe('HR10 exact numeric editing', () => {
  it.each(['80.5', '0.5', '2.25', '10'])('preserves sequentially typed load %s through frozen review', async text => {
    const view = setup();
    await view.user.type(view.load, text);
    expect(view.content().exercises[0].sets[0].weight).toBe(Number(text));
    expect(validateDraftForDesk(view.content(), 'review').ok).toBe(true);
    await view.user.click(screen.getByRole('button', { name: 'Freeze review' }));
    expect(view.load).toBeDisabled();
    expect(view.content().exercises[0].sets[0].weight).toBe(Number(text));
    const count = view.edits.mock.calls.length;
    await view.user.type(view.load, '9');
    expect(view.edits).toHaveBeenCalledTimes(count);
  });

  it('clears to null, distinguishes explicit zero and keeps bodyweight disabled at zero', async () => {
    const view = setup();
    await view.user.type(view.load, '0.5');
    await view.user.clear(view.load);
    expect(view.load.value).toBe('');
    expect(view.content().exercises[0].sets[0].weight).toBeNull();
    await view.user.clear(view.reps);
    expect(view.content().exercises[0].sets[0].reps).toBeNull();
    await view.user.type(view.reps, '0');
    await view.user.type(view.load, '0');
    expect(view.content().exercises[0].sets[0]).toMatchObject({ reps: 0, weight: 0 });
    await view.user.selectOptions(screen.getByTestId('coach-workout-exercise-unit-0'), 'bodyweight');
    expect(view.load).toBeDisabled();
    expect(view.content().exercises[0].sets[0].weight).toBe(0);
  });

  it('preserves fractional and negative repetition input so strict review can reject it', async () => {
    const view = setup();
    await view.user.type(view.load, '20');
    await view.user.clear(view.reps);
    await view.user.type(view.reps, '8.5');
    expect(view.content().exercises[0].sets[0].reps).toBe(8.5);
    expect(validateDraftForDesk(view.content(), 'review')).toMatchObject({ ok: false, errors: [{ code: 'REPS_REQUIRED' }] });
    await view.user.clear(view.reps);
    await view.user.type(view.reps, '-1');
    expect(view.content().exercises[0].sets[0].reps).toBe(-1);
    expect(validateDraftForDesk(view.content(), 'review').ok).toBe(false);
  });

  it('preserves a typed negative decimal and refuses review instead of making a positive load', async () => {
    const view = setup();
    await view.user.type(view.load, '-2.25');
    expect(view.content().exercises[0].sets[0].weight).toBe(-2.25);
    expect(validateDraftForDesk(view.content(), 'review')).toMatchObject({ ok: false, errors: [{ code: 'WEIGHT_INVALID' }] });
  });

  it('keeps kg blocked after exact decimal editing', async () => {
    const view = setup();
    await view.user.type(view.load, '2.25');
    await view.user.selectOptions(screen.getByTestId('coach-workout-exercise-unit-0'), 'kg');
    expect(view.content().exercises[0].sets[0].weight).toBe(2.25);
    expect(validateDraftForDesk(view.content(), 'review')).toMatchObject({ ok: false, errors: [{ code: 'UNIT_MAPPING_REQUIRED' }] });
  });

  it.each([NaN, Infinity, -Infinity])('does not admit a nonfinite owner load %s', value => {
    const content = initial(); content.exercises[0].sets[0].weight = value;
    expect(validateDraftForDesk(content, 'review')).toMatchObject({ ok: false, errors: [{ code: 'WEIGHT_INVALID' }] });
  });
});
