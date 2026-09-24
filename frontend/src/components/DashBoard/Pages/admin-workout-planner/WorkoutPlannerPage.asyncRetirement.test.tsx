/**
 * WorkoutPlannerPage.asyncRetirement.test.tsx — plan 58 P58-T13 (P58-R7 RED/GREEN).
 *
 * Mounts the REAL provider → orchestration → coach surface → AI_PLANNER_*
 * listeners. Only transport, the exercise library and the dock chrome are
 * mocked; the draft owner, the selected-client controls and the receiver wiring
 * are the production ones. Every assertion is behavioural: no mocked setter,
 * no direct hook-args import, so the same file is valid before and after the
 * repair (a setup/import error would not be valid RED).
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchAIWorkoutEvent } from '../../../../utils/aiWorkoutEvents';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { GeneratedPlan, PlanExercise } from './WorkoutPlannerTypes';
import { AuthContext } from '../../../../context/authContextState';

/** Deferred headless library search — the ONLY override of the real Rolodex hook. */
const searchSync = vi.fn();
const searchResolvers: Array<(results: ExerciseSlim[]) => void> = [];

vi.mock('../../../WorkoutLogger/exerciseSearchWorker', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  searchExercisesSync: (...args: unknown[]) => searchSync(...args),
}));
vi.mock('../../../WorkoutLogger/useExerciseSearch', () => ({
  useExerciseSearch: () => ({
    results: [], allExercises: [], isSearching: false, isLoading: false, loadError: null,
    setQuery: () => {}, setCategory: () => {}, query: '', category: null, refresh: () => {},
  }),
}));
const pushedReceipts: Array<{ ok: boolean; text: string }> = [];
vi.mock('./useWorkoutPlannerCoachDock', () => ({
  pushWorkoutPlannerCoachReceipt: (receipt: { ok: boolean; text: string }) => { pushedReceipts.push(receipt); },
  useWorkoutPlannerCoachDock: () => ({ receipts: [], open: false }),
}));

import WorkoutPlannerProvider from './plannerContexts/WorkoutPlannerProvider';
import { usePlannerData } from './plannerContexts/PlannerDataContext';
import { usePlannerActions } from './plannerContexts/PlannerActionsContext';

const slim = (id: string, name: string): ExerciseSlim => ({
  id, name, exerciseKey: id, exerciseType: 'strength', bodyPartCategory: 'legs',
  primaryMuscles: [], difficulty: 1,
});

const CLIENTS = [
  { id: 42, firstName: 'Ava', lastName: 'Stone', username: 'ava' },
  { id: 43, firstName: 'Ben', lastName: 'Reed', username: 'ben' },
];

interface Probe {
  planExercises: PlanExercise[];
  generatedPlan: GeneratedPlan | null;
  selectedClientId: number | null;
  clientsLoading: boolean;
  selectClient: ((rawClientId: string) => void) | null;
}
const probe: Probe = {
  planExercises: [], generatedPlan: null, selectedClientId: null, clientsLoading: true, selectClient: null,
};

const ProbeView: React.FC = () => {
  const data = usePlannerData();
  const actions = usePlannerActions();
  probe.planExercises = data.local.planExercises;
  probe.generatedPlan = data.local.generatedPlan;
  probe.selectedClientId = data.clientState.selectedClientId;
  probe.clientsLoading = data.clientState.clientsLoading;
  probe.selectClient = actions.clientState.handleClientSelectionChange;
  return null;
};

const renderPlanner = (role: 'admin' | 'client' = 'admin') => {
  const authAxios = {
    get: vi.fn(async (url: string) => (
      url.includes('/clients') || url.includes('client-trainer-assignments')
        ? { data: { success: true, clients: CLIENTS, assignments: [] } }
        : { data: {} }
    )),
    post: vi.fn(async () => ({ data: {} })),
  };
  const user = { id: '7', role, username: 'operator', firstName: 'Op', lastName: 'Erator', email: 'op@example.test' };
  const utils = render(
    <MemoryRouter initialEntries={['/dashboard/admin/workout-planner?clientId=42']}>
      <AuthContext.Provider value={{ user, authAxios } as never}>
        <WorkoutPlannerProvider>
          <ProbeView />
        </WorkoutPlannerProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { ...utils, authAxios };
};

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const successReceipts = () => pushedReceipts.filter((receipt) => receipt.ok === true);
const resolveSearches = async (results: ExerciseSlim[]) => {
  await act(async () => { searchResolvers.splice(0).forEach((resolveSearch) => resolveSearch(results)); });
  await flush();
};

beforeEach(() => {
  pushedReceipts.length = 0;
  searchResolvers.length = 0;
  searchSync.mockReset();
  searchSync.mockImplementation(() => new Promise<ExerciseSlim[]>((resolveSearch) => { searchResolvers.push(resolveSearch); }));
});

describe('mounted Workout Planner — delayed add/swap lifetime (P58)', () => {
  it('P58-R1/R3/R5: a library result resolving after the target changed edits nothing and claims nothing', async () => {
    renderPlanner('admin');
    await waitFor(() => expect(probe.selectedClientId).toBe(42));
    expect(probe.clientsLoading).toBe(false);

    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    await act(async () => { probe.selectClient?.('43'); });
    expect(probe.selectedClientId).toBe(43);

    await resolveSearches([slim('gs1', 'Goblet Squat')]);

    expect(probe.planExercises).toHaveLength(0);
    expect(successReceipts()).toHaveLength(0);
  });

  it('P58-R1: a denied raw role admits nothing — no lookup, no edit, no success', async () => {
    renderPlanner('client');
    await waitFor(() => expect(probe.selectedClientId).toBe(42));

    let handled = true;
    await act(async () => {
      handled = dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' });
    });
    await resolveSearches([slim('gs1', 'Goblet Squat')]);

    expect(handled).toBe(false);
    expect(searchSync).not.toHaveBeenCalled();
    expect(probe.planExercises).toHaveLength(0);
    expect(successReceipts()).toHaveLength(0);
  });

  it('P58-R3/R4: a disposed instance publishes nothing into the re-mounted Planner', async () => {
    const first = renderPlanner('admin');
    await waitFor(() => expect(probe.selectedClientId).toBe(42));
    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    first.unmount();
    pushedReceipts.length = 0;

    renderPlanner('admin');
    await waitFor(() => expect(probe.selectedClientId).toBe(42));

    await resolveSearches([slim('gs1', 'Goblet Squat')]);

    expect(pushedReceipts).toHaveLength(0);
    expect(probe.planExercises).toHaveLength(0);
  });

  it('P58-R4: a second add delivered while the first lookup is pending cannot append twice', async () => {
    renderPlanner('admin');
    await waitFor(() => expect(probe.selectedClientId).toBe(42));

    await act(async () => { dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' }); });
    let secondHandled = true;
    await act(async () => {
      secondHandled = dispatchAIWorkoutEvent('AI_PLANNER_ADD_EXERCISE', { exerciseName: 'Goblet Squat' });
    });

    await resolveSearches([slim('gs1', 'Goblet Squat')]);

    expect(secondHandled).toBe(false);
    expect(probe.planExercises).toHaveLength(1);
    expect(successReceipts()).toHaveLength(1);
  });
});
