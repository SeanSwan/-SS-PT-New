/**
 * ============================================================================
 * FILE: WorkoutPlannerRolodexPanelV2.undoToast.test.tsx — finding F6.
 *
 * THE DEFECT
 *   The panel offers a 5-second Undo after a single-tap add. The effect that arms
 *   it is keyed on `[planExercises]`, so React runs the PREVIOUS run's cleanup —
 *   which clears that run's timer — before every re-run.
 *
 *   When a change produced `added.length !== 1` (a removal, or several rows
 *   arriving at once) the effect returned early WITHOUT touching `undoTarget`.
 *   Its timer had already been cancelled, so nothing remained to dismiss the
 *   toast — and the toast has no close button. It stayed on screen permanently.
 *
 * THE INVARIANT: a standing Undo offer always has a live timer behind it, and
 * any change that is not a single tap retires the offer.
 *
 * NOTE ON WHAT COUNTS AS A "TAP"
 *   `[a] -> [a, b]` IS a single tap (b was added) and legitimately arms a NEW
 *   toast. The stranding case needs a change where the added count is not one:
 *   `[a] -> [a, b, c]` (two arrive together) or `[a] -> []` (a removal).
 *
 * Harness mirrors WorkoutPlannerRolodexPanelV2.recovery.test.tsx — the panel
 * reads from PlannerDataContext/PlannerActionsContext, not props.
 * ============================================================================
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutPlannerRolodexPanelV2 from './WorkoutPlannerRolodexPanelV2';
import { PlannerDataContext } from './plannerContexts/PlannerDataContext';
import { PlannerActionsContext } from './plannerContexts/PlannerActionsContext';
import type {
  PlannerActionsValue,
  PlannerDataValue,
} from './plannerContexts/WorkoutPlannerProvider';

vi.mock('react-window', () => ({
  List: ({ rowCount }: any) => <div data-testid="planner-rolodex-v2-list">{rowCount} rows</div>,
}));

const buildRolodex = () => ({
  filteredExerciseCount: 0,
  activeFilterCount: 0,
  exercisesLoading: false,
  searchQuery: '',
  filterCategory: null,
  sourceFilter: null,
  exerciseTypeFilter: null,
  equipmentFilter: null,
  impactFilter: null,
  exerciseRowRenderer: (() => null) as any,
  exercisesLoadState: 'ready',
  exercisesLoadError: null,
  exercisesRefreshError: null,
  exerciseCatalogCount: 0,
  exercisesSearching: false,
  refreshExercises: vi.fn(),
  setSearchQuery: vi.fn(),
  setFilterCategory: vi.fn(),
  setSourceFilter: vi.fn(),
  setExerciseTypeFilter: vi.fn(),
  setEquipmentFilter: vi.fn(),
  setImpactFilter: vi.fn(),
  clearRolodexFilters: vi.fn(),
});

const row = (id: string, name: string) => ({
  id,
  exerciseSlim: { id, name, exerciseType: 'strength', bodyPartCategory: 'Chest', primaryMuscles: ['Chest'] },
});

const A = row('a', 'Alpha Press');
const B = row('b', 'Bravo Row');
const C = row('c', 'Charlie Squat');

type Plan = ReturnType<typeof row>[];

const tree = (planExercises: Plan) => (
  <PlannerDataContext.Provider
    value={{ rolodex: buildRolodex(), local: { planExercises, generatedPlan: null } } as unknown as PlannerDataValue}
  >
    <PlannerActionsContext.Provider
      value={{ rolodex: buildRolodex(), pageActions: { removeExercise: vi.fn() } } as unknown as PlannerActionsValue}
    >
      <WorkoutPlannerRolodexPanelV2 />
    </PlannerActionsContext.Provider>
  </PlannerDataContext.Provider>
);

/**
 * The Undo TOAST element, not the Undo button inside it.
 *
 * Review finding 7: the earlier probe was `screen.queryByText(/undo/i)`, which by
 * DTL's getNodeText matches the BUTTON's own text node — so it asserted the wrong
 * element and would have passed with the toast container absent. `role="status"`
 * and the testid are on the toast itself (WorkoutPlannerRolodexPanelV2.tsx).
 */
const undoToast = () => screen.queryByTestId('planner-rolodex-undo');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the Undo toast always has a live timer behind it (F6)', () => {
  it('arms on a single tap and dismisses when the window elapses', () => {
    const { rerender } = render(tree([]));
    expect(undoToast()).toBeNull();

    rerender(tree([A]));
    expect(undoToast()).not.toBeNull();

    act(() => { vi.advanceTimersByTime(6000); });
    expect(undoToast()).toBeNull();
  });

  it('THE F6 CASE: several rows arriving at once retires the standing offer', () => {
    const { rerender } = render(tree([]));
    rerender(tree([A]));
    expect(undoToast()).not.toBeNull();

    // Two rows arrive together: `added.length` is 2, not 1. The previous
    // timer was cancelled by the effect cleanup, so unless the offer is
    // retired here it can never be dismissed.
    rerender(tree([A, B, C]));
    expect(undoToast()).toBeNull();
  });

  it('a removal retires the standing offer', () => {
    const { rerender } = render(tree([]));
    rerender(tree([A]));
    expect(undoToast()).not.toBeNull();

    rerender(tree([]));
    expect(undoToast()).toBeNull();
  });

  it('a one-for-one REPLACEMENT does not masquerade as a tap (review finding 9)', () => {
    const { rerender } = render(tree([]));
    // Arm a standing offer with a genuine single tap.
    rerender(tree([A]));
    expect(undoToast()).not.toBeNull();

    // [A] -> [C]: exactly ONE new id (C) while A is dropped. This is the ONLY
    // shape that exercises `|| droppedRows` — `added.length === 1` alone calls it
    // a tap. (A previous version used [A,B,C] -> [C], where added is EMPTY, so it
    // tested the `added.length !== 1` clause and left droppedRows unprotected.)
    rerender(tree([C]));
    expect(undoToast()).toBeNull();
  });

  it('an in-place edit does not masquerade as a tap (review finding 8)', () => {
    const { rerender } = render(tree([A]));

    // Same ids, new array identity — the shape an edit produces. Undo would
    // discard the edit, so the offer is retired rather than left standing.
    rerender(tree([{ ...A, exerciseSlim: { ...A.exerciseSlim, name: 'Alpha Press (edited)' } }]));
    expect(undoToast()).toBeNull();
  });

  it('a later single tap re-arms a FULL window rather than inheriting the old one', () => {
    const { rerender } = render(tree([]));
    rerender(tree([A]));

    // Almost all of the first window elapses...
    act(() => { vi.advanceTimersByTime(4500); });

    // ...then a second single tap arrives; it must get its own full window.
    rerender(tree([A, B]));
    expect(undoToast()).not.toBeNull();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(undoToast()).not.toBeNull();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(undoToast()).toBeNull();
  });
});
