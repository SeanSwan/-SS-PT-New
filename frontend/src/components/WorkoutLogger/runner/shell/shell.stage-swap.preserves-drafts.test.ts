/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — stage store laws (Slice 0, tests-first).    │
 * │ Mandate M2: stage (setup|train|finish) is a FREE VIEW —     │
 * │ non-gating, re-enterable, landing default = Train, always.  │
 * │ Stage-storm: 50 random transitions never throw, never gate, │
 * │ and cannot touch session data by construction (the store    │
 * │ holds no reference to exercises/drafts). Per-stage scroll   │
 * │ memory: reset-to-top only on FIRST entry, remembered after. │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 M2 + anti-jump. │
 * └─────────────────────────────────────────────────────────────┘
 */
import { describe, expect, it, vi } from 'vitest';
import {
  createSessionStageStore,
  SESSION_STAGES,
  type SessionStage,
} from './useSessionStage';

describe('M2 — stage is a free view, never a wizard', () => {
  it('landing default is Train, always', () => {
    expect(createSessionStageStore().getStage()).toBe('train');
  });

  it('every stage→stage transition is legal (no gating, re-enterable)', () => {
    const store = createSessionStageStore();
    for (const from of SESSION_STAGES) {
      for (const to of SESSION_STAGES) {
        store.setStage(from);
        store.setStage(to);
        expect(store.getStage()).toBe(to);
      }
    }
  });

  it('stage-storm: 50 random transitions never throw and session data stays untouched', () => {
    const store = createSessionStageStore();
    // The draft fixture the storm must never be able to reach. The store API
    // holds no session-data reference — this freeze proves any accidental
    // future coupling loudly (a mutation attempt throws in strict mode).
    const draft = Object.freeze({
      exercises: Object.freeze([
        Object.freeze({ exerciseName: 'Bench Press', sets: Object.freeze([{ setNumber: 1, weight: 100, reps: 8 }]) }),
      ]),
      sessionNotes: 'client moving well today',
      overallIntensity: 7,
    });
    const snapshot = JSON.stringify(draft);

    let seed = 42;
    const nextStage = (): SessionStage => {
      seed = (seed * 1103515245 + 12345) % 2147483648; // deterministic LCG — no Math.random in tests
      return SESSION_STAGES[seed % SESSION_STAGES.length];
    };

    for (let i = 0; i < 50; i += 1) {
      const target = nextStage();
      expect(() => store.setStage(target)).not.toThrow();
      expect(store.getStage()).toBe(target);
    }
    expect(JSON.stringify(draft)).toBe(snapshot);
  });

  it('notifies subscribers on change only; unsubscribe stops delivery', () => {
    const store = createSessionStageStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setStage('train'); // no-op — already train
    expect(listener).not.toHaveBeenCalled();
    store.setStage('finish');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setStage('setup');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('per-stage scroll memory (anti-jump law 3)', () => {
  it('first entry lands at top; re-entry restores the remembered position', () => {
    const store = createSessionStageStore();
    expect(store.scrollTopFor('finish')).toBe(0); // never visited → top

    store.rememberScroll('train', 480);
    store.setStage('finish');
    store.setStage('train');
    expect(store.scrollTopFor('train')).toBe(480); // re-entry → restored

    expect(store.scrollTopFor('setup')).toBe(0); // still untouched → top
    store.rememberScroll('setup', 120);
    expect(store.scrollTopFor('setup')).toBe(120);
  });

  it('scroll memory is per-stage — one stage never bleeds into another', () => {
    const store = createSessionStageStore();
    store.rememberScroll('train', 999);
    expect(store.scrollTopFor('finish')).toBe(0);
    expect(store.scrollTopFor('setup')).toBe(0);
  });
});
