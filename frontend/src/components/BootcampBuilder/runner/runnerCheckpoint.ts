/**
 * ============================================================================
 * FILE: runner/runnerCheckpoint.ts
 * PURPOSE: Crash-proof resume — checkpoint every state change; reload lands
 *          exactly where the class was. SWA-105 Slice 5 (Kimi R9).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * STORAGE CHOICE, deliberate: localStorage, not IndexedDB. The RunnerState is
 * ~200 bytes and localStorage writes are SYNCHRONOUS — they complete before a
 * tab-crash can lose them, which is the whole point of a checkpoint. The plan
 * (KBs) is written once at class start. Media caching is slice 9's
 * CacheStorage problem, not this file's.
 *
 * Resume semantics: the state stores absolute epochs, so a reload during a
 * live class lands IN PLACE with zero math. If the machine slept while dead,
 * the caller runs reconcile() (shared core) and offers resume/skip/compress —
 * this module only preserves truth, it never decides.
 */

import type { RunnerState } from './runnerProtocol';

const STATE_KEY = 'swan.bootcamp.runner.state.v1';
const PLAN_KEY = 'swan.bootcamp.runner.plan.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function checkpointState(state: RunnerState, storage: StorageLike): void {
  storage.setItem(STATE_KEY, JSON.stringify(state));
}

export function checkpointPlan(plan: object, storage: StorageLike): void {
  storage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export interface ResumePayload {
  state: RunnerState;
  plan: object;
}

/**
 * Load a resumable class, or null. A checkpoint whose parts disagree
 * (state without plan, mismatched planId, unparseable JSON) is treated as
 * ABSENT and cleared — a corrupt resume is worse than a fresh start.
 */
export function loadCheckpoint(storage: StorageLike): ResumePayload | null {
  try {
    const rawState = storage.getItem(STATE_KEY);
    const rawPlan = storage.getItem(PLAN_KEY);
    if (!rawState || !rawPlan) return null;

    const state = JSON.parse(rawState) as RunnerState;
    const plan = JSON.parse(rawPlan) as { planId?: string };
    if (!state?.planId || typeof state.seq !== 'number') return null;
    if (plan?.planId !== state.planId) {
      clearCheckpoint(storage);
      return null;
    }
    return { state, plan };
  } catch {
    clearCheckpoint(storage);
    return null;
  }
}

/** Class complete (or abandoned): a stale checkpoint must not haunt tomorrow. */
export function clearCheckpoint(storage: StorageLike): void {
  storage.removeItem(STATE_KEY);
  storage.removeItem(PLAN_KEY);
}
