import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createExerciseSearchWorker,
  searchExercisesSync,
  type ExerciseSlim,
} from './exerciseSearchWorker';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

let fakeWorker: { addEventListener: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> };
let WorkerConstructor: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fakeWorker = { addEventListener: vi.fn(), terminate: vi.fn() };
  WorkerConstructor = vi.fn(function () {
    return fakeWorker;
  });
  vi.stubGlobal('Worker', WorkerConstructor);
});

describe('exercise search worker boundary', () => {
  it('constructs the Vite module worker entry with module semantics', () => {
    expect(createExerciseSearchWorker()).toBe(fakeWorker);
    expect(WorkerConstructor).toHaveBeenCalledWith(expect.anything(), { type: 'module' });
  });

  it('returns null when Worker construction is unavailable', () => {
    WorkerConstructor.mockImplementationOnce(() => {
      throw new Error('CSP');
    });
    expect(createExerciseSearchWorker()).toBeNull();
  });

  it('keeps synchronous fallback ranking available to non-worker consumers', () => {
    const rows: ExerciseSlim[] = [{
      id: 'bench',
      name: 'Bench Press',
      exerciseKey: 'bench',
      exerciseType: 'strength',
      bodyPartCategory: 'Chest',
      primaryMuscles: ['Chest'],
      difficulty: 1,
    }];
    expect(searchExercisesSync(rows, 'bench', 'Chest')).toEqual(rows);
  });

  it('creates no Blob URL, so there is nothing to revoke', () => {
    const createObjectURL = vi.fn(() => 'blob:exercise-search');
    const revokeObjectURL = vi.fn();
    const original = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    try {
      createExerciseSearchWorker();
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(revokeObjectURL).not.toHaveBeenCalled();
    } finally {
      URL.createObjectURL = original;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});

describe('one scorer, not two', () => {
  const coreSource = read('./exerciseSearchCore.ts');
  const workerSource = read('./exerciseSearchWorker.ts');
  const entrySource = read('./exerciseSearch.worker.ts');

  it('keeps the only fuzzy scorer in exerciseSearchCore', () => {
    expect(coreSource).toContain('export function fuzzyScore');
    expect(workerSource).not.toContain('function fuzzyScore');
    expect(entrySource).not.toContain('function fuzzyScore');
  });

  it('has the worker entry delegate to the shared core', () => {
    expect(entrySource).toContain("from './exerciseSearchCore'");
    expect(entrySource).toContain('createExerciseSearchWorkerState');
  });

  it('keeps the fallback delegating to the shared core instead of re-implementing', () => {
    expect(workerSource).toContain("from './exerciseSearchCore'");
    expect(workerSource).toContain('return searchExercises(exercises, query, category)');
  });
});
