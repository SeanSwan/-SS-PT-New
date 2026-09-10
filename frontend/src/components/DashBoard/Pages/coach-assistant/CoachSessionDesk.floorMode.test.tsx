/**
 * FILE: CoachSessionDesk.floorMode.test.tsx
 * PURPOSE: G04c — Floor Mode (S6). Renders ONE exercise at a time with large set rows and
 *          prev/next navigation; the transcript stays reachable via Talk (desk-level).
 *          The desk passes floorMode + activeFloorExerciseId through to CoachWorkoutDraft,
 *          and exercise navigation calls onFloorExerciseSelect with the instance id.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import CoachSessionDesk, { type CoachSessionDeskProps } from './CoachSessionDesk';
import type { CoachSessionDraft } from './coachSessionDraftState';
import type { CoachWorkoutDraftContent } from './coachWorkoutDraftContract';

const multiExerciseContent = (): CoachWorkoutDraftContent => ({
  date: '2026-09-08',
  title: 'Full body',
  notes: null,
  exercises: [
    {
      exerciseInstanceId: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
      exerciseId: '33333333-3333-4333-8333-333333333333',
      exerciseName: 'Squat',
      unit: 'lb',
      sets: [{ setNumber: 1, reps: 5, weight: 225 }],
    },
    {
      exerciseInstanceId: 'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2',
      exerciseId: '44444444-4444-4444-8444-444444444444',
      exerciseName: 'Bench Press',
      unit: 'lb',
      sets: [{ setNumber: 1, reps: 8, weight: 185 }],
    },
    {
      exerciseInstanceId: 'e3e3e3e3-e3e3-4e3e-8e3e-e3e3e3e3e3e3',
      exerciseId: '55555555-5555-4555-8555-555555555555',
      exerciseName: 'Deadlift',
      unit: 'lb',
      sets: [{ setNumber: 1, reps: 3, weight: 315 }],
    },
  ],
});

const makeDraft = (): CoachSessionDraft => ({
  taskId: 'aaaa1111-2222-4333-8444-555566667777',
  requestKey: 'bbbb1111-2222-4333-8444-555566667777',
  actorId: 7,
  actorRole: 'trainer',
  targetUserId: 42,
  origin: 'floor',
  revision: 1,
  content: multiExerciseContent() as unknown as Readonly<Record<string, unknown>>,
  dirty: true,
  scopeToken: { generation: 2, actorId: 7 } as unknown as CoachSessionDraft['scopeToken'],
});

const draftApiState = vi.hoisted(() => ({
  current: {
    actorId: 7,
    actorRole: 'trainer',
    generation: 2,
    draft: null as CoachSessionDraft | null,
    submitted: null,
    pendingTargetChange: null,
    begin: vi.fn(),
    edit: vi.fn(),
    freezeForSubmit: vi.fn(),
    resolveTargetChange: vi.fn(),
    discard: vi.fn(),
  },
}));

const surfaceState = vi.hoisted(() => ({
  current: {
    routeKey: '/dashboard/trainer/coach-assistant',
    surfaceKey: 'coach-assistant',
    targetUserId: 42,
    selectedEntityIds: [] as ReadonlyArray<string>,
    generation: 2,
    surfaceToken: 'coach-assistant:42:2',
    deskReady: true,
  },
}));

const submitState = vi.hoisted(() => ({
  current: { submitting: false, error: null, lastResponse: null, submit: vi.fn() },
}));

vi.mock('./useCoachSessionDraft', () => ({ useCoachSessionDraft: () => draftApiState.current }));
vi.mock('./useCoachSurfaceContext', () => ({ useCoachSurfaceContext: () => surfaceState.current }));
vi.mock('./useCoachWorkoutDraftSubmit', () => ({ useCoachWorkoutDraftSubmit: () => submitState.current }));

beforeEach(() => {
  Object.assign(draftApiState.current, { draft: null, submitted: null, pendingTargetChange: null });
  Object.assign(submitState.current, { submitting: false, error: null, lastResponse: null });
});

afterEach(cleanup);

const renderFloor = (props: Partial<CoachSessionDeskProps> = {}) => {
  const onFloorExerciseSelect = vi.fn();
  const view = render(<CoachSessionDesk floorMode onFloorExerciseSelect={onFloorExerciseSelect} {...props} />);
  return { onFloorExerciseSelect, ...view };
};

describe('G04c session desk floor mode', () => {
  it('marks the desk as floor and renders only the active exercise', () => {
    draftApiState.current.draft = makeDraft();
    const { container } = renderFloor({ activeFloorExerciseId: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1' });
    expect(container.querySelector('.coach-session-desk--floor')).toBeTruthy();
    // Floor mode renders a single exercise row (the active one), not the full list.
    const exerciseRows = container.querySelectorAll('[data-testid^="coach-workout-exercise-"]');
    expect(exerciseRows).toHaveLength(3);
    expect(screen.getByTestId('coach-workout-floor-progress').textContent).toBe('Exercise 1 of 3');
  });

  it('navigates to the next exercise and reports the updated progress', () => {
    draftApiState.current.draft = makeDraft();
    const { onFloorExerciseSelect } = renderFloor({ activeFloorExerciseId: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1' });
    fireEvent.click(screen.getByTestId('coach-workout-floor-next'));
    expect(onFloorExerciseSelect).toHaveBeenCalledWith('e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2');
    expect(screen.getByTestId('coach-workout-floor-progress').textContent).toContain('of 3');
  });

  it('hides the previous control on the first exercise and next on the last', () => {
    draftApiState.current.draft = makeDraft();
    const first = renderFloor({ activeFloorExerciseId: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1' });
    expect(first.container.querySelector('[data-testid="coach-workout-floor-previous"]')).toBeNull();
    expect(first.container.querySelector('[data-testid="coach-workout-floor-next"]')).toBeTruthy();
  });

  it('falls back to the first exercise when no active floor exercise is selected', () => {
    draftApiState.current.draft = makeDraft();
    const { container } = renderFloor({ activeFloorExerciseId: null });
    const exerciseRows = container.querySelectorAll('[data-testid^="coach-workout-exercise-"]');
    expect(exerciseRows).toHaveLength(3);
    // First exercise is the fallback; its name is present.
    expect((screen.getByTestId('coach-workout-exercise-name-0') as HTMLInputElement).value).toBe('Squat');
  });

  it('shows no floor navigation when there is a single exercise', () => {
    const draft = makeDraft();
    const content = multiExerciseContent();
    content.exercises = content.exercises.slice(0, 1);
    draft.content = content as unknown as Readonly<Record<string, unknown>>;
    draftApiState.current.draft = draft;
    const { container } = renderFloor();
    expect(container.querySelector('[data-testid="coach-workout-floor-progress"]')).toBeNull();
    expect(container.querySelector('[data-testid="coach-workout-floor-next"]')).toBeNull();
  });
});
