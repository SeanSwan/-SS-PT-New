/**
 * WorkoutPlannerCommandPanelV2 advice — S05 / R-H22 rendered tests
 * ==============================================================
 * H22-T1 (B selected, B active: no A absence, no client-changing action),
 * H22-T2 (ready-empty B never invokes client selection),
 * H22-T3 (every unknown state) and H22-T6 (guarded draft, no auto-generate).
 *
 * The REAL command panel is rendered inside the REAL planner contexts with a
 * minimal typed fixture. Only the two child sections that are not under test are
 * mocked. Full authenticated orchestration is NOT covered here and not claimed.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutPlannerCommandPanelV2, { durationForScope } from './WorkoutPlannerCommandPanelV2';
import { PlannerDataContext } from './plannerContexts/PlannerDataContext';
import { PlannerActionsContext } from './plannerContexts/PlannerActionsContext';
import type {
  PlannerActionsValue,
  PlannerDataValue,
} from './plannerContexts/WorkoutPlannerProvider';

vi.mock('./WorkoutPlannerGenerationModeSection', () => ({ default: () => null }));
vi.mock('./WorkoutPlannerTrainingStyleSection', () => ({ default: () => null }));

const CLIENTS = [
  { id: 1, firstName: 'Amy', lastName: 'Adams' },
  { id: 2, firstName: 'Ben', lastName: 'Brown' },
];

const handleClientSelectionChange = vi.fn();
const handlePlanDurationChange = vi.fn();
const fetchSavedPlans = vi.fn();
const requestPlanGenerate = vi.fn();
const requestSwanCoachWorkout = vi.fn();

const renderPanel = (savedPlansOver: Record<string, unknown> = {}, localOver: Record<string, unknown> = {}) => {
  const savedPlansState = {
    savedPlans: [],
    savedPlansClientId: 2,
    savedPlansStatus: 'ready',
    savedPlansLoading: false,
    fetchSavedPlans,
    ...savedPlansOver,
  };

  const data = {
    local: {
      phaseNumber: 1,
      category: 'full_body',
      goal: 'strength',
      planDuration: 'single',
      generationMode: 'guided',
      sessionsPerWeek: 3,
      ...localOver,
    },
    clientState: {
      clients: CLIENTS,
      clientsLoading: false,
      selectedClientId: 2,
      clientGenBlocked: false,
      isViewerClient: false,
    },
    generation: { generating: false, generatingPlan: false },
    savedPlansState,
  } as unknown as PlannerDataValue;

  const actions = {
    savedPlansState,
    setters: { setPhaseNumber: vi.fn(), setGoal: vi.fn() },
    clientState: { handleClientSelectionChange },
    pageActions: { handlePlanDurationChange },
    requestPlanGenerateForSelectedClient: requestPlanGenerate,
    requestSwanCoachWorkoutForSelectedClient: requestSwanCoachWorkout,
  } as unknown as PlannerActionsValue;

  return render(
    <PlannerDataContext.Provider value={data}>
      <PlannerActionsContext.Provider value={actions}>
        <WorkoutPlannerCommandPanelV2 />
      </PlannerActionsContext.Provider>
    </PlannerDataContext.Provider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WorkoutPlannerCommandPanelV2 selected-client advice', () => {
  // ── H22-T1 ────────────────────────────────────────────────────────────────
  it('reports the selected client as current without inventing another client\'s absence', () => {
    renderPanel({
      savedPlans: [{ id: 'b-plan', status: 'active' }],
      savedPlansClientId: 2,
      savedPlansStatus: 'ready',
    });

    const status = screen.getByTestId('planner-advice-status');
    expect(status).toHaveTextContent('Current plan available');
    // Client A's absence is never asserted, and the advice is not a control.
    expect(screen.queryByText(/AA has no active plan/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('planner-advice-action')).not.toBeInTheDocument();
  });

  it('offers no client-changing action anywhere in the advice', () => {
    renderPanel({ savedPlans: [], savedPlansClientId: 2, savedPlansStatus: 'ready' });

    const action = screen.getByTestId('planner-advice-action');
    fireEvent.click(action);
    expect(handleClientSelectionChange).not.toHaveBeenCalled();
  });

  // ── H22-T2 ────────────────────────────────────────────────────────────────
  it('reports an identified empty list as the selected client\'s missing plan', () => {
    renderPanel({ savedPlans: [], savedPlansClientId: 2, savedPlansStatus: 'ready' });

    expect(screen.getByTestId('planner-advice-action')).toHaveTextContent('BB has no active plan');
  });

  // ── H22-T3 ────────────────────────────────────────────────────────────────
  it('never reads a failed read as absence and offers a real retry', () => {
    renderPanel({ savedPlans: [], savedPlansClientId: null, savedPlansStatus: 'error' });

    const action = screen.getByTestId('planner-advice-action');
    expect(action).toHaveTextContent('Saved plans unavailable');
    expect(screen.queryByText(/has no active plan/)).not.toBeInTheDocument();

    fireEvent.click(action);
    expect(fetchSavedPlans).toHaveBeenCalledWith(2);
  });

  it.each([
    ['loading', { savedPlansStatus: 'loading', savedPlansClientId: null }],
    ['idle', { savedPlansStatus: 'idle', savedPlansClientId: null }],
    ['mismatched client', { savedPlansStatus: 'ready', savedPlansClientId: 1 }],
    ['unidentified ready list', { savedPlansStatus: 'ready', savedPlansClientId: null }],
  ])('never reads %s as absence', (_label, over) => {
    renderPanel({ savedPlans: [], ...over });

    expect(screen.getByTestId('planner-advice-status')).toHaveTextContent('Checking saved plans');
    expect(screen.queryByText(/has no active plan/)).not.toBeInTheDocument();
    expect(screen.queryByText('Current plan available')).not.toBeInTheDocument();
  });

  // ── H22-T6 ────────────────────────────────────────────────────────────────
  it('uses the existing guarded duration action and never auto-generates', () => {
    renderPanel({ savedPlans: [], savedPlansClientId: 2, savedPlansStatus: 'ready' }, { planDuration: 'single' });

    fireEvent.click(screen.getByTestId('planner-advice-action'));

    expect(handlePlanDurationChange).toHaveBeenCalledWith(durationForScope('multi_week'));
    expect(requestPlanGenerate).not.toHaveBeenCalled();
    expect(requestSwanCoachWorkout).not.toHaveBeenCalled();
    expect(handleClientSelectionChange).not.toHaveBeenCalled();
  });

  it('does not re-apply the duration change when multi-week is already selected', () => {
    renderPanel({ savedPlans: [], savedPlansClientId: 2, savedPlansStatus: 'ready' }, { planDuration: 'multi_week' });

    fireEvent.click(screen.getByTestId('planner-advice-action'));
    expect(handlePlanDurationChange).not.toHaveBeenCalled();
  });
});
