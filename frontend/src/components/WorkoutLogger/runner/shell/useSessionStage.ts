/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ useSessionStage — the SESSION SHELL stage view store (M2).  │
 * │ stage: setup|train|finish is a FREE VIEW — non-gating,      │
 * │ re-enterable, dots-not-checkmarks. It is NOT the lifecycle  │
 * │ (phase: draft|active|saving|saved lives with the submit     │
 * │ path). Landing default = Train, ALWAYS — the store is       │
 * │ in-memory per mount, deliberately unpersisted, so a cold    │
 * │ load can never land anywhere else (Law 0).                  │
 * │ Also owns per-stage scroll memory: first entry = top,       │
 * │ re-entry = restored (anti-jump law 3). Stage changes push   │
 * │ NO history (anti-jump law 4) — there is no history code     │
 * │ here by design.                                             │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 M2/M3.          │
 * └─────────────────────────────────────────────────────────────┘
 */
import { useMemo, useSyncExternalStore } from 'react';

export type SessionStage = 'setup' | 'train' | 'finish';

export const SESSION_STAGES: readonly SessionStage[] = Object.freeze(['setup', 'train', 'finish']);

export interface SessionStageStore {
  getStage(): SessionStage;
  /** Free transition — every stage→stage move is legal, no gating, ever. */
  setStage(next: SessionStage): void;
  subscribe(listener: () => void): () => void;
  /** Record a stage's canvas scroll position on exit. */
  rememberScroll(stage: SessionStage, top: number): void;
  /** Where the canvas lands on entry: 0 on FIRST entry, remembered after. */
  scrollTopFor(stage: SessionStage): number;
}

export function createSessionStageStore(initial: SessionStage = 'train'): SessionStageStore {
  let stage: SessionStage = initial;
  const scrollMemory = new Map<SessionStage, number>();
  const listeners = new Set<() => void>();

  return {
    getStage: () => stage,
    setStage(next: SessionStage): void {
      if (next === stage) return;
      stage = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    rememberScroll(target: SessionStage, top: number): void {
      scrollMemory.set(target, top);
    },
    scrollTopFor(target: SessionStage): number {
      return scrollMemory.get(target) ?? 0;
    },
  };
}

/** React binding — one store per shell mount (passed down, never a module singleton). */
export function useSessionStage(store: SessionStageStore): [SessionStage, (next: SessionStage) => void] {
  const stage = useSyncExternalStore(store.subscribe, store.getStage, store.getStage);
  return useMemo(() => [stage, store.setStage], [stage, store]);
}

/**
 * The ONE way to change stage from UI: saves the outgoing stage's scroll
 * position BEFORE the swap (anti-jump law 3), then flips the view.
 * Restore + focus + announce live in StageCanvas. Stage changes push NO
 * history (law 4) — there is deliberately no history code here.
 */
export function switchSessionStage(store: SessionStageStore, next: SessionStage): void {
  if (store.getStage() === next) return;
  const scrollTop = typeof document !== 'undefined' ? document.documentElement.scrollTop : 0;
  store.rememberScroll(store.getStage(), scrollTop);
  store.setStage(next);
}
