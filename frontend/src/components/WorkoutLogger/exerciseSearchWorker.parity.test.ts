/**
 * Worker/fallback scorer PARITY (lane C finding, receipt 19).
 *
 * The Blob worker cannot import modules, so its fuzzy scorer lives in the
 * WORKER_CODE string while `searchExercisesSync` hand-mirrors it on the main
 * thread. The two had drifted: type matches scored fuzzy*0.5 in the worker but
 * a flat 300 in the fallback, and muscle matches were fuzzy in the worker but
 * substring-only in the fallback — different orders AND different match sets
 * depending on whether the worker booted. This suite executes the REAL worker
 * source (evaluated with a stub `self`) and locks behavioral parity.
 */
import { describe, expect, it, vi } from 'vitest';
import { __testing__, searchExercisesSync, type ExerciseSlim } from './exerciseSearchWorker';

const ex = (over: Partial<ExerciseSlim>): ExerciseSlim => ({
  id: over.id ?? over.exerciseKey ?? 'x',
  name: 'Unnamed',
  exerciseKey: 'unnamed',
  exerciseType: 'strength_training',
  bodyPartCategory: 'full_body',
  primaryMuscles: [],
  difficulty: 500,
  ...over,
});

const CORPUS: ExerciseSlim[] = [
  ex({ id: '1', name: 'Bench Press', exerciseKey: 'bench_press', primaryMuscles: ['Pectorals'] }),
  ex({ id: '2', name: 'Squat', exerciseKey: 'back_squat', primaryMuscles: ['Quadriceps'], exerciseType: 'strength_training' }),
  ex({ id: '3', name: 'Quadriceps Stretch', exerciseKey: 'quad_stretch', primaryMuscles: ['Quadriceps'], exerciseType: 'flexibility' }),
  ex({ id: '4', name: 'Push Up', exerciseKey: 'push_up', primaryMuscles: ['Pectorals'], exerciseType: 'strength_training' }),
  ex({ id: '5', name: 'Plank', exerciseKey: 'plank', primaryMuscles: ['Abdominals'], exerciseType: 'core_stability' }),
];

interface WorkerResultsPayload {
  type: string;
  exercises: ExerciseSlim[];
  query: string;
}

function runWorkerSearch(query: string, category: string | null, corpus: ExerciseSlim[]): ExerciseSlim[] {
  const self = { postMessage: vi.fn() } as unknown as {
    postMessage: (msg: { type: string; exercises?: ExerciseSlim[] }) => void;
    onmessage: (event: { data: unknown }) => void;
  };
  // Execute the REAL blob-worker source against a stub self.
  new Function('self', __testing__.WORKER_CODE)(self);
  self.onmessage({ data: { type: 'CACHE', exercises: corpus } });
  self.onmessage({ data: { type: 'SEARCH', query, category, sequence: 1 } });
  const payloads = (self as unknown as { postMessage: ReturnType<typeof vi.fn> }).postMessage.mock.calls
    .map(([payload]) => payload as WorkerResultsPayload);
  const results = payloads.find(payload => payload.type === 'RESULTS');
  return results?.exercises ?? [];
}

describe('worker vs fallback scorer parity', () => {
  const QUERIES: Array<[string, string | null]> = [
    ['press', null],       // name substring
    ['bp', null],          // name initials
    ['bench press', null], // name substring multi-word
    ['flexibility', null], // exerciseType match — the drifted branch
    ['str', null],         // exerciseType fuzzy prefix — the drifted branch
    ['quadriceps', null],  // muscle substring
    ['pecs', null],        // muscle fuzzy — the drifted branch
    ['qdr', null],         // muscle fuzzy walk
    ['', 'Chest'],         // category-only pass-through
    ['press', 'chest'],    // category + query
  ];

  for (const [query, category] of QUERIES) {
    it(`returns identical results for query "${query || '(empty)'}" / category "${category ?? 'null'}"`, () => {
      const workerResults = runWorkerSearch(query, category, CORPUS);
      const fallbackResults = searchExercisesSync(CORPUS, query, category);
      expect(fallbackResults.map(item => item.id)).toEqual(workerResults.map(item => item.id));
    });
  }

  it('runs the real worker source, not a re-implementation', () => {
    expect(__testing__.WORKER_CODE).toContain('fuzzyScore');
    expect(__testing__.WORKER_CODE).toContain('onmessage');
  });
});
