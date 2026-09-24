/** G04C-T01..03 — canonical library identity and nullable/unit-aware editor boundary. */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoachWorkoutDraft from './CoachWorkoutDraft';
import type { CoachWorkoutDraftContent } from './coachWorkoutDraftContract';
import type { ExerciseSlim } from '../../../WorkoutLogger/useExerciseSearch';

const { mockUseExerciseSearch } = vi.hoisted(() => ({ mockUseExerciseSearch: vi.fn() }));

vi.mock('react-window', () => ({
  useListRef: () => ({ current: { scrollToRow: vi.fn() } }),
  List: ({ rowComponent: RowComponent, rowCount, rowHeight, id, role, 'aria-label': ariaLabel }: any) => (
    <div id={id} role={role} aria-label={ariaLabel} style={{ height: rowHeight }}>
      {Array.from({ length: rowCount }).map((_, index) => <RowComponent key={index} index={index} style={{}} />)}
    </div>
  ),
}));

vi.mock('../../../WorkoutLogger/useExerciseSearch', async () => {
  const actual = await vi.importActual<typeof import('../../../WorkoutLogger/useExerciseSearch')>('../../../WorkoutLogger/useExerciseSearch');
  return { ...actual, useExerciseSearch: () => mockUseExerciseSearch() };
});

const canonical: ExerciseSlim = {
  id: '33333333-3333-4333-8333-333333333333',
  exerciseKey: 'barbell-bench-press',
  name: 'Barbell Bench Press',
  exerciseType: 'strength',
  bodyPartCategory: 'Chest',
  primaryMuscles: ['Chest'],
  difficulty: 2,
  equipment: ['Barbell'],
};

const content = (overrides: Partial<CoachWorkoutDraftContent> = {}): CoachWorkoutDraftContent => ({
  date: '2026-09-12',
  title: null,
  notes: null,
  exercises: [],
  ...overrides,
});

const searchState = (results: ExerciseSlim[] = [canonical]) => ({
  results,
  allExercises: results,
  isSearching: false,
  isLoading: false,
  loadError: null,
  setQuery: vi.fn(),
  setCategory: vi.fn(),
  query: '',
  category: null,
  refresh: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  mockUseExerciseSearch.mockReturnValue(searchState());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('G04.1 canonical CoachWorkoutDraft connection', () => {
  it('G04C-T01 selects canonical id/key/name and creates a fresh instance UUID for repeats', () => {
    const onContentChange = vi.fn();
    const view = render(<CoachWorkoutDraft content={content()} onContentChange={onContentChange} />);

    fireEvent.click(screen.getByTestId('coach-workout-open-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Workout' }));
    const first = onContentChange.mock.calls.at(-1)?.[0] as CoachWorkoutDraftContent;
    expect(first.exercises[0]).toMatchObject({
      exerciseId: canonical.id,
      exerciseKey: canonical.exerciseKey,
      exerciseName: canonical.name,
    });
    expect(first.exercises[0].exerciseInstanceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    view.rerender(<CoachWorkoutDraft content={first} onContentChange={onContentChange} />);
    expect(screen.getByTestId('coach-workout-exercise-name-0')).toHaveAttribute('readonly');

    fireEvent.click(screen.getByTestId('coach-workout-replace-exercise-0'));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Workout' }));
    const replaced = onContentChange.mock.calls.at(-1)?.[0] as CoachWorkoutDraftContent;
    expect(replaced.exercises).toHaveLength(1);
    expect(replaced.exercises[0]).toMatchObject({ exerciseId: canonical.id, exerciseKey: canonical.exerciseKey, exerciseName: canonical.name });
    expect(replaced.exercises[0].exerciseInstanceId).not.toBe(first.exercises[0].exerciseInstanceId);
    view.rerender(<CoachWorkoutDraft content={replaced} onContentChange={onContentChange} />);

    fireEvent.click(screen.getByTestId('coach-workout-open-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Workout' }));
    const repeated = onContentChange.mock.calls.at(-1)?.[0] as CoachWorkoutDraftContent;
    expect(repeated.exercises).toHaveLength(2);
    expect(repeated.exercises[1]).toMatchObject({ exerciseId: canonical.id, exerciseKey: canonical.exerciseKey, exerciseName: canonical.name });
    expect(repeated.exercises[1].exerciseInstanceId).not.toBe(first.exercises[0].exerciseInstanceId);
  });

  it('G04C-T02 rejects malformed library identity and never installs a free-typed row', () => {
    const malformed = { ...canonical, id: 'bench-press', exerciseKey: '', name: '  ' } as ExerciseSlim;
    mockUseExerciseSearch.mockReturnValue(searchState([malformed]));
    const onContentChange = vi.fn();
    render(<CoachWorkoutDraft content={content()} onContentChange={onContentChange} />);
    fireEvent.click(screen.getByTestId('coach-workout-open-library'));
    expect(screen.queryByRole('button', { name: 'Add to Workout' })).toBeNull();
    expect(screen.getByTestId('coach-workout-library-error')).toHaveTextContent(/canonical exercise/i);
    expect(screen.queryByTestId('coach-workout-exercise-name-0')).toBeNull();
    expect(onContentChange).not.toHaveBeenCalled();
  });

  it('G04C-T02 rejects a non-UUID library id at the Coach installation boundary', () => {
    const malformed = { ...canonical, id: 'bench-press' } as ExerciseSlim;
    mockUseExerciseSearch.mockReturnValue(searchState([malformed]));
    const onContentChange = vi.fn();
    render(<CoachWorkoutDraft content={content()} onContentChange={onContentChange} />);
    fireEvent.click(screen.getByTestId('coach-workout-open-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Workout' }));
    expect(screen.getByTestId('coach-workout-library-error')).toHaveTextContent(/canonical exercise/i);
    expect(screen.queryByTestId('coach-workout-exercise-name-0')).toBeNull();
    expect(onContentChange).not.toHaveBeenCalled();
  });

  it('G04C-T03 keeps nulls and explicit bodyweight zero while review exposes kg and invalid values', () => {
    const existing = content({ exercises: [{
      exerciseInstanceId: '55555555-5555-4555-8555-555555555555',
      exerciseId: canonical.id,
      exerciseKey: canonical.exerciseKey,
      exerciseName: canonical.name,
      unit: 'lb',
      sets: [{ setNumber: 1, reps: null, weight: null }],
    }] });
    const onContentChange = vi.fn();
    const view = render(<CoachWorkoutDraft content={existing} onContentChange={onContentChange} validationMode="review" />);
    expect(screen.getByTestId('coach-workout-set-reps-0-1')).toHaveValue(null);
    expect(screen.getByTestId('coach-workout-set-weight-0-1')).toHaveValue(null);
    fireEvent.change(screen.getByTestId('coach-workout-exercise-unit-0'), { target: { value: 'bodyweight' } });
    const bodyweight = onContentChange.mock.calls.at(-1)?.[0] as CoachWorkoutDraftContent;
    expect(bodyweight.exercises[0].sets[0].weight).toBe(0);
    view.rerender(<CoachWorkoutDraft content={bodyweight} onContentChange={onContentChange} validationMode="review" />);
    fireEvent.change(screen.getByTestId('coach-workout-exercise-unit-0'), { target: { value: 'kg' } });
    const kilogram = onContentChange.mock.calls.at(-1)?.[0] as CoachWorkoutDraftContent;
    view.rerender(<CoachWorkoutDraft content={kilogram} onContentChange={onContentChange} validationMode="review" />);
    expect(screen.getByTestId('coach-workout-kg-hint')).toHaveTextContent(/not yet save-able/i);
    expect(screen.getByTestId('coach-workout-error-REPS_REQUIRED')).toBeInTheDocument();
  });

  it('G04C-T03 blocks a complete kilogram draft before review can proceed', () => {
    const kilogram = content({ exercises: [{
      ...canonical,
      exerciseInstanceId: '77777777-7777-4777-8777-777777777777',
      exerciseId: canonical.id,
      exerciseKey: canonical.exerciseKey,
      exerciseName: canonical.name,
      unit: 'kg',
      sets: [{ setNumber: 1, reps: 8, weight: 80 }],
    }] });
    const view = render(<CoachWorkoutDraft content={kilogram} onContentChange={vi.fn()} validationMode="review" />);
    expect(screen.getByTestId('coach-workout-error-UNIT_MAPPING_REQUIRED')).toHaveTextContent(/before review or save/i);
    expect(view.container.querySelector('[data-testid="coach-workout-kg-hint"]')).toBeTruthy();
  });

  it('G04C-T02 surfaces UUID factory failure without mutating the draft', () => {
    vi.stubGlobal('crypto', { randomUUID: undefined });
    const onContentChange = vi.fn();
    render(<CoachWorkoutDraft content={content()} onContentChange={onContentChange} />);
    fireEvent.click(screen.getByTestId('coach-workout-open-library'));
    fireEvent.doubleClick(screen.getByRole('option', { name: /barbell bench press/i }));
    expect(screen.getByTestId('coach-workout-library-error')).toHaveTextContent(/temporarily unavailable/i);
    expect(onContentChange).not.toHaveBeenCalled();
  });
});
