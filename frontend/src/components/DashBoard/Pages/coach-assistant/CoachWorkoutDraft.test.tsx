/**
 * FILE: CoachWorkoutDraft.test.tsx
 * PURPOSE: G04c — editable canonical workout-draft surface (S6 "CoachWorkoutDraft").
 *          Covers: owner-content echo, meta edits pushed via onContentChange, exercise/set
 *          add+remove, the bodyweight explicit-zero rule, kg unsupported-for-save hint,
 *          draft vs review validation (REPS_REQUIRED/WEIGHT_REQUIRED/UNIT_MAPPING), disabled
 *          (frozen preview) state, and client-generated instance UUIDs.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CoachWorkoutDraft, { type CoachWorkoutDraftProps } from './CoachWorkoutDraft';
import type { CoachWorkoutDraftContent } from './coachWorkoutDraftContract';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const baseContent = (): CoachWorkoutDraftContent => ({
  date: '2026-09-08',
  title: 'Push day',
  notes: null,
  exercises: [
    {
      exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
      exerciseId: '33333333-3333-4333-8333-333333333333',
      exerciseName: 'Bench Press',
      unit: 'lb',
      sets: [{ setNumber: 1, reps: 8, weight: 185 }],
    },
  ],
});

const renderDraft = (props: Partial<CoachWorkoutDraftProps> = {}) => {
  const onContentChange = vi.fn();
  const utils = render(
    <CoachWorkoutDraft content={baseContent()} onContentChange={onContentChange} {...props} />,
  );
  return { onContentChange, ...utils };
};

describe('G04c editable workout draft', () => {
  afterEach(cleanup);
  it('echoes owner content and pushes meta edits through onContentChange', () => {
    const { onContentChange } = renderDraft();
    expect(screen.getByTestId('coach-workout-draft-date')).toHaveValue('2026-09-08');
    expect(screen.getByTestId('coach-workout-draft-title')).toHaveValue('Push day');
    fireEvent.change(screen.getByTestId('coach-workout-draft-title'), { target: { value: 'Push day v2' } });
    expect(onContentChange).toHaveBeenCalledTimes(1);
    expect(onContentChange.mock.calls[0]?.[0]).toMatchObject({
      title: 'Push day v2',
      date: '2026-09-08',
      exercises: expect.arrayContaining([expect.objectContaining({ exerciseName: 'Bench Press' })]),
    });
  });

  it('adds a client-generated exercise instance (UUID, not a library id)', () => {
    const { onContentChange } = renderDraft();
    fireEvent.click(screen.getByTestId('coach-workout-add-exercise'));
    const next = onContentChange.mock.calls[0]?.[0] as CoachWorkoutDraftContent;
    expect(next.exercises).toHaveLength(2);
    const added = next.exercises[1];
    expect(added.exerciseInstanceId).toMatch(UUID);
    expect(added.unit).toBe('lb');
    expect(added.sets).toEqual([]);
  });

  it('adds a set with the next ordinal and removes sets', () => {
    const { onContentChange } = renderDraft();
    fireEvent.click(screen.getByTestId('coach-workout-add-set-0'));
    const withTwoSets = onContentChange.mock.calls[0]?.[0] as CoachWorkoutDraftContent;
    expect(withTwoSets.exercises[0].sets.map((set) => set.setNumber)).toEqual([1, 2]);
    // New set for a loaded unit starts with null load.
    expect(withTwoSets.exercises[0].sets[1].weight).toBeNull();
    // Remove set 1 — fresh render from the updated content (the component is a pure
    // echo of its content prop, so owner updates are modeled by re-rendering).
    cleanup();
    const { onContentChange: removeSpy } = renderDraft({ content: withTwoSets });
    fireEvent.click(screen.getByTestId('coach-workout-remove-set-0-1'));
    const removed = removeSpy.mock.calls[0]?.[0] as CoachWorkoutDraftContent;
    expect(removed.exercises[0].sets.map((set) => set.setNumber)).toEqual([2]);
  });

  it('forces explicit zero load and disables weight input for bodyweight', () => {
    const content: CoachWorkoutDraftContent = {
      ...baseContent(),
      exercises: [
        {
          exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
          exerciseName: 'Push-ups',
          unit: 'bodyweight',
          sets: [{ setNumber: 1, reps: 10, weight: 0 }],
        },
      ],
    };
    const { onContentChange } = renderDraft({ content });
    expect(screen.getByTestId('coach-workout-set-weight-0-1')).toBeDisabled();
    expect(screen.getByText('Load (0)')).toBeTruthy();
    // Switch a loaded exercise to bodyweight zeros all existing set loads.
    cleanup();
    const { onContentChange: unitSpy } = renderDraft();
    fireEvent.change(screen.getByTestId('coach-workout-exercise-unit-0'), { target: { value: 'bodyweight' } });
    const next = unitSpy.mock.calls[0]?.[0] as CoachWorkoutDraftContent;
    expect(next.exercises[0].unit).toBe('bodyweight');
    expect(next.exercises[0].sets.every((set) => set.weight === 0)).toBe(true);
  });

  it('shows the kg not-yet-saveable hint (no invented conversion)', () => {
    const content: CoachWorkoutDraftContent = {
      ...baseContent(),
      exercises: [
        {
          exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
          exerciseId: '33333333-3333-4333-8333-333333333333',
          exerciseName: 'Bench Press',
          unit: 'kg',
          sets: [{ setNumber: 1, reps: 8, weight: 84 }],
        },
      ],
    };
    render(<CoachWorkoutDraft content={content} onContentChange={vi.fn()} validationMode="review" />);
    expect(screen.getByTestId('coach-workout-kg-hint')).toBeTruthy();
  });

  it('reports strict validation errors in review mode and accepts incomplete rows in draft mode', () => {
    const incomplete: CoachWorkoutDraftContent = {
      ...baseContent(),
      exercises: [
        {
          exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
          exerciseId: '33333333-3333-4333-8333-333333333333',
          exerciseName: 'Bench Press',
          unit: 'lb',
          sets: [{ setNumber: 1, reps: null, weight: null }],
        },
      ],
    };
    const review = render(
      <CoachWorkoutDraft content={incomplete} onContentChange={vi.fn()} validationMode="review" />
    );
    expect(review.getByTestId('coach-workout-error-REPS_REQUIRED')).toBeTruthy();
    cleanup();
    const draft = render(
      <CoachWorkoutDraft content={incomplete} onContentChange={vi.fn()} validationMode="draft" />,
    );
    expect(draft.queryByTestId(/coach-workout-error-/)).toBeNull();
  });

  it('disables every control on a frozen preview (disabled) and hides add/remove', () => {
    const { container } = renderDraft({ disabled: true });
    expect(screen.getByTestId('coach-workout-draft-title')).toBeDisabled();
    expect(screen.getByTestId('coach-workout-set-reps-0-1')).toBeDisabled();
    expect(container.querySelector('[data-testid="coach-workout-add-exercise"]')).toBeNull();
    expect(container.querySelector('[data-testid^="coach-workout-remove-"]')).toBeNull();
    expect(container.querySelector('[data-testid^="coach-workout-add-set-"]')).toBeNull();
  });

  it('removes an exercise through onContentChange', () => {
    const { onContentChange } = renderDraft();
    fireEvent.click(screen.getByTestId('coach-workout-remove-exercise-0'));
    const next = onContentChange.mock.calls[0]?.[0] as CoachWorkoutDraftContent;
    expect(next.exercises).toHaveLength(0);
  });
});
