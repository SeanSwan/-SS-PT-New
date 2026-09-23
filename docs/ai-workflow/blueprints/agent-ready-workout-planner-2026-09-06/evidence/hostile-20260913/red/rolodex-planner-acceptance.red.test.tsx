import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { buildPlanData } from '../../../frontend/src/components/DashBoard/Pages/admin-workout-planner/planDataBuilder';
import {
  buildLoadedPlanHydration,
  hydrateLoadedPlanExercises,
} from '../../../frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerLoadPlanHydration';
import {
  buildEquipmentProfileTokens,
  exerciseMatchesEquipmentProfile,
} from '../../../frontend/src/components/BootcampBuilder/BootcampEquipmentProfileFilter';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../../frontend/src/services/api.service', () => ({
  ApiService: class {
    get(...args: unknown[]) {
      return apiMock.get(...args);
    }
  },
}));

import { useExerciseSearch } from '../../../frontend/src/components/WorkoutLogger/useExerciseSearch';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

type WorkerMessage = { type: string; query?: string; exercises?: unknown[] };

class SyntheticSearchWorker {
  static instances: SyntheticSearchWorker[] = [];

  readonly messages: WorkerMessage[] = [];
  readonly errorListeners: EventListener[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor() {
    SyntheticSearchWorker.instances.push(this);
  }

  postMessage(message: WorkerMessage) {
    this.messages.push(message);
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === 'error') this.errorListeners.push(listener);
  }

  terminate() {
    this.terminated = true;
  }

  emitResults(query: string, exercises: unknown[]) {
    this.onmessage?.({ data: { type: 'RESULTS', query, exercises } } as MessageEvent);
  }

  emitError() {
    const event = new ErrorEvent('error', { message: 'synthetic worker failure' });
    this.errorListeners.forEach((listener) => listener(event));
    this.onerror?.(event);
  }
}

const exercises = [
  {
    id: 'squat',
    name: 'Back Squat',
    exerciseKey: 'squat',
    exerciseType: 'strength',
    bodyPartCategory: 'Legs',
    primaryMuscles: ['Quadriceps'],
    difficulty: 2,
  },
  {
    id: 'bench',
    name: 'Bench Press',
    exerciseKey: 'bench',
    exerciseType: 'strength',
    bodyPartCategory: 'Chest',
    primaryMuscles: ['Chest'],
    difficulty: 2,
  },
];

const urlWithBlobMethods = URL as typeof URL & {
  createObjectURL?: (value: Blob) => string;
  revokeObjectURL?: (value: string) => void;
};
const originalCreateObjectURL = urlWithBlobMethods.createObjectURL;
const originalRevokeObjectURL = urlWithBlobMethods.revokeObjectURL;

beforeEach(() => {
  apiMock.get.mockReset();
  SyntheticSearchWorker.instances = [];
  vi.stubGlobal('Worker', SyntheticSearchWorker);

  Object.defineProperty(urlWithBlobMethods, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:synthetic-exercise-search'),
  });
  Object.defineProperty(urlWithBlobMethods, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalCreateObjectURL) {
    Object.defineProperty(urlWithBlobMethods, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete urlWithBlobMethods.createObjectURL;
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(urlWithBlobMethods, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete urlWithBlobMethods.revokeObjectURL;
  }
});

describe('planner manual intensity acceptance (actual save/load exports)', () => {
  const exerciseSlim = {
    id: 'synthetic-squat',
    name: 'Synthetic Squat',
    exerciseKey: 'synthetic-squat',
    exerciseType: 'strength',
    bodyPartCategory: 'Legs',
    primaryMuscles: ['Quadriceps'],
    difficulty: 2,
  };

  it('serializes a non-default manual intensity as a numeric persisted field', () => {
    const planData = buildPlanData({
      mode: 'manual',
      phaseName: 'Maximal Strength',
      phaseNumber: 4,
      category: 'legs',
      categoryLabel: 'Legs',
      goal: 'strength',
      planExercises: [{
        id: 'row-1',
        exerciseSlim,
        sets: 4,
        reps: '5',
        tempo: 'X/0/X',
        restSeconds: 180,
        intensityPercent: 83,
        notes: '',
      }],
    });

    const savedExercise = (planData.weeks as Array<{ days: Array<{ exercises: Array<Record<string, unknown>> }> }>)[0]
      .days[0].exercises[0];

    expect(savedExercise).toHaveProperty('intensityPercent', 83);
  });

  it('round-trips a synthetic non-default manual intensity through actual load hydration', () => {
    const planData = buildPlanData({
      mode: 'manual',
      phaseName: 'Maximal Strength',
      phaseNumber: 4,
      category: 'legs',
      categoryLabel: 'Legs',
      goal: 'strength',
      planExercises: [{
        id: 'row-1',
        exerciseSlim,
        sets: 4,
        reps: '5',
        tempo: 'X/0/X',
        restSeconds: 180,
        intensityPercent: 83,
        notes: '',
      }],
    });
    const hydration = buildLoadedPlanHydration({
      plan: { planData },
      planId: 'synthetic-plan',
      selectedClientId: 7,
    });

    expect(hydration.hydratedExercises[0]).toMatchObject({
      intensityPercent: 83,
    });
  });

  it('hydrates an explicit persisted intensity without falling back to 70%', () => {
    const hydrated = hydrateLoadedPlanExercises('synthetic-plan', [{
      exerciseId: 'synthetic-squat',
      exerciseName: 'Synthetic Squat',
      sets: 4,
      reps: '5',
      restPeriod: 180,
      intensityPercent: 83,
    }]);

    expect(hydrated[0].intensityPercent).toBe(83);
  });
});

describe('Bootcamp equipment profile acceptance (actual filter exports)', () => {
  it('denies an exercise requiring barbell and bench when only barbell is available', () => {
    const profileTokens = buildEquipmentProfileTokens([
      { name: 'Barbell', category: 'barbell' },
    ]);

    expect(exerciseMatchesEquipmentProfile({
      equipmentNeeded: ['Barbell', 'Bench'],
    }, profileTokens)).toBe(false);
  });

  it('denies bodyweight plus external equipment when the external item is missing', () => {
    expect(exerciseMatchesEquipmentProfile({
      equipmentNeeded: ['Bodyweight', 'Dumbbell'],
    }, [])).toBe(false);
  });
});

describe('useExerciseSearch acceptance (actual hook with delayed API and synthetic Worker)', () => {
  it('ends with the current query results when delayed initial loading overlaps query changes', async () => {
    const pending = deferred<{ data: { success: true; exercises: typeof exercises } }>();
    apiMock.get.mockReturnValue(pending.promise);

    const { result } = renderHook(() => useExerciseSearch());
    act(() => result.current.setQuery('squat'));
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/api/exercises/library'));

    await act(async () => {
      pending.resolve({ data: { success: true, exercises } });
      await pending.promise;
    });

    const worker = SyntheticSearchWorker.instances[0];
    act(() => result.current.setQuery('bench'));
    await waitFor(() => expect(worker.messages.some((message) => (
      message.type === 'SEARCH' && message.query === 'bench'
    ))).toBe(true));

    act(() => {
      worker.emitResults('bench', [exercises[1]]);
      worker.emitResults('squat', [exercises[0]]);
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.query).toBe('bench');
    expect(result.current.results.map((exercise) => exercise.id)).toEqual(['bench']);
  });

  it('falls back to synchronous search immediately after Worker onerror', async () => {
    apiMock.get.mockResolvedValue({ data: { success: true, exercises } });
    const { result } = renderHook(() => useExerciseSearch());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const worker = SyntheticSearchWorker.instances[0];

    act(() => result.current.setQuery('squat'));
    await waitFor(() => expect(result.current.isSearching).toBe(true));
    await waitFor(() => expect(worker.messages.some((message) => (
      message.type === 'SEARCH' && message.query === 'squat'
    ))).toBe(true));

    act(() => worker.emitError());

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.results.map((exercise) => exercise.id)).toEqual(['squat']);
  });
});
