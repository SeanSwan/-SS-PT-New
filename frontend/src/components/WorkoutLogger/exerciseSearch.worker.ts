/**
 * exerciseSearch.worker.ts — Vite module-Worker entry (S03 / R-H13)
 * ──────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Dedicated module Worker entry point for exercise search. It owns no
 *   matching logic: every message is delegated to the shared pure core so the
 *   Worker and the main-thread fallback can never disagree.
 *
 * HOW IT IS LOADED:
 *   exerciseSearchWorker.createExerciseSearchWorker() constructs it with
 *     new Worker(new URL('./exerciseSearch.worker.ts', import.meta.url),
 *                { type: 'module' })
 *   which lets Vite emit a real worker asset in the production build. If the
 *   constructor throws (CSP, SSR, no Worker support) the hook keeps the
 *   synchronous fallback.
 *
 * MESSAGE PROTOCOL:
 *   CACHE   { type:'CACHE', exercises, catalogRevision }        → no reply
 *   SEARCH  { type:'SEARCH', query, category, catalogRevision,
 *             searchSequence }                                  → RESULTS
 *   RESULTS { type:'RESULTS', exercises, query, category,
 *             catalogRevision, searchSequence }
 *
 * KEY DECISION:
 *   `self` is typed through a minimal local scope interface instead of
 *   `DedicatedWorkerGlobalScope`, so this file type-checks under the app's
 *   DOM lib without pulling in a conflicting `webworker` lib.
 */

import { createExerciseSearchWorkerState } from './exerciseSearchCore';
import type { ExerciseSearchResultsMessage } from './exerciseSearchCore';

interface ExerciseSearchWorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: ExerciseSearchResultsMessage) => void;
}

const scope = self as unknown as ExerciseSearchWorkerScope;
const searchState = createExerciseSearchWorkerState();

scope.onmessage = (event: MessageEvent) => {
  const reply = searchState.handle(event?.data);
  if (reply) scope.postMessage(reply);
};
