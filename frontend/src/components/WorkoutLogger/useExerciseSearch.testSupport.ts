/**
 * Shared support for the useExerciseSearch suites.
 *
 * Extracted when useExerciseSearch.test.tsx crossed the 300-line cap. Everything
 * here is either type-only or a pure factory, so the move cannot change
 * behaviour — the test file simply imports what it used to declare.
 */

import { vi } from 'vitest';
import type { ExerciseSlim } from './useExerciseSearch';

/** The subset of the Worker interface the hook actually uses. */
export type FakeWorker = {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

/** The SEARCH envelope the hook posts to the worker. */
export type SearchMessage = {
  type: string;
  query: string;
  category: string | null;
  catalogRevision: number;
  searchSequence: number;
};

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function exercise(overrides: Partial<ExerciseSlim> = {}): ExerciseSlim {
  return {
    id: 'bench-press',
    name: 'Bench Press',
    exerciseKey: 'bench-press',
    exerciseType: 'strength',
    bodyPartCategory: 'Chest',
    primaryMuscles: ['Chest'],
    difficulty: 1,
    ...overrides,
  };
}

export const catalog: ExerciseSlim[] = [
  exercise(),
  exercise({
    id: 'back-squat',
    name: 'Back Squat',
    exerciseKey: 'back-squat',
    bodyPartCategory: 'Legs',
    primaryMuscles: ['Quadriceps'],
  }),
];
