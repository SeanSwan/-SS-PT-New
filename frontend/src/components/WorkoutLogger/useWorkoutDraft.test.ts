/**
 * useWorkoutDraft.test.ts
 * =========================
 * Phase 3c.1 (launch charter): autosave/draft-restore for the workout logger.
 * Locks the draft lifecycle: debounced persist → remount offer → restore/discard/clear,
 * plus stale-draft purging. The in-gym failure mode this kills: tab backgrounded or
 * crashed mid-log = every set lost (P1-6).
 */
import { renderHook, act } from '@testing-library/react';
import type { ExerciseEntry } from '../../services/nasmApiService';
import {
  buildWorkoutDraftKey,
  parseWorkoutDraft,
  purgeStaleWorkoutDrafts,
  WORKOUT_DRAFT_PREFIX,
  WORKOUT_DRAFT_DEBOUNCE_MS,
  WORKOUT_DRAFT_MAX_AGE_MS,
  hasStoredWorkoutDraft,
  useWorkoutDraft,
} from './useWorkoutDraft';

const exercise = (name: string): ExerciseEntry => ({
  loggerExerciseId: `ex-${name}`,
  exerciseId: `id-${name}`,
  exerciseName: name,
  sets: [
    {
      loggerSetId: `set-${name}-1`,
      setNumber: 1,
      weight: 135,
      reps: 8,
      rpe: null,
      restTime: 90,
      formQuality: null,
    },
  ],
  formRating: null,
  painLevel: 0,
});

const KEY = buildWorkoutDraftKey(7, 42, '2026-07-07');

const baseOptions = {
  userId: 7,
  clientId: 42,
  date: '2026-07-07',
  exercises: [] as ExerciseEntry[],
  sessionNotes: '',
  overallIntensity: null as number | null,
  enabled: true,
};

describe('workout draft helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a user+client+date scoped key under the draft prefix', () => {
    expect(KEY).toBe(`${WORKOUT_DRAFT_PREFIX}7:42:2026-07-07`);
    expect(buildWorkoutDraftKey(undefined, 42, '2026-07-07')).toBeNull();
    expect(buildWorkoutDraftKey(7, undefined, '2026-07-07')).toBeNull();
  });

  it('round-trips a valid draft and rejects garbage, wrong version, and stale drafts', () => {
    const payload = {
      v: 1,
      savedAt: new Date().toISOString(),
      exercises: [exercise('Squat')],
      sessionNotes: 'felt strong',
      overallIntensity: 7,
    };
    expect(parseWorkoutDraft(JSON.stringify(payload))?.exercises[0].exerciseName).toBe('Squat');
    expect(parseWorkoutDraft(null)).toBeNull();
    expect(parseWorkoutDraft('not-json')).toBeNull();
    expect(parseWorkoutDraft(JSON.stringify({ ...payload, v: 2 }))).toBeNull();
    expect(parseWorkoutDraft(JSON.stringify({ ...payload, exercises: 'nope' }))).toBeNull();
    const stale = {
      ...payload,
      savedAt: new Date(Date.now() - WORKOUT_DRAFT_MAX_AGE_MS - 1000).toISOString(),
    };
    expect(parseWorkoutDraft(JSON.stringify(stale))).toBeNull();
  });

  it('purges stale and corrupt drafts but keeps fresh drafts and foreign keys', () => {
    const fresh = {
      v: 1,
      savedAt: new Date().toISOString(),
      exercises: [exercise('Row')],
      sessionNotes: '',
      overallIntensity: null,
    };
    const stale = {
      ...fresh,
      savedAt: new Date(Date.now() - WORKOUT_DRAFT_MAX_AGE_MS - 1000).toISOString(),
    };
    localStorage.setItem(`${WORKOUT_DRAFT_PREFIX}7:42:2026-07-07`, JSON.stringify(fresh));
    localStorage.setItem(`${WORKOUT_DRAFT_PREFIX}7:42:2026-01-01`, JSON.stringify(stale));
    localStorage.setItem(`${WORKOUT_DRAFT_PREFIX}7:42:2026-01-02`, 'corrupt{{');
    localStorage.setItem('ss-hydration-2026-07-07', '{"glasses":3}');

    purgeStaleWorkoutDrafts();

    expect(localStorage.getItem(`${WORKOUT_DRAFT_PREFIX}7:42:2026-07-07`)).not.toBeNull();
    expect(localStorage.getItem(`${WORKOUT_DRAFT_PREFIX}7:42:2026-01-01`)).toBeNull();
    expect(localStorage.getItem(`${WORKOUT_DRAFT_PREFIX}7:42:2026-01-02`)).toBeNull();
    expect(localStorage.getItem('ss-hydration-2026-07-07')).not.toBeNull();
  });
});

describe('useWorkoutDraft hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists content after the debounce window', () => {
    renderHook(() =>
      useWorkoutDraft({ ...baseOptions, exercises: [exercise('Squat')], sessionNotes: 'hi' })
    );
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(WORKOUT_DRAFT_DEBOUNCE_MS + 100);
    });
    const stored = parseWorkoutDraft(localStorage.getItem(KEY));
    expect(stored?.exercises).toHaveLength(1);
    expect(stored?.sessionNotes).toBe('hi');
  });

  it('does not persist when disabled or when there is no content', () => {
    renderHook(() =>
      useWorkoutDraft({ ...baseOptions, exercises: [exercise('Squat')], enabled: false })
    );
    act(() => {
      vi.advanceTimersByTime(WORKOUT_DRAFT_DEBOUNCE_MS + 100);
    });
    expect(localStorage.getItem(KEY)).toBeNull();

    renderHook(() => useWorkoutDraft({ ...baseOptions }));
    act(() => {
      vi.advanceTimersByTime(WORKOUT_DRAFT_DEBOUNCE_MS + 100);
    });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('offers the draft on a fresh mount; restore returns it and clears the key', () => {
    const first = renderHook(() =>
      useWorkoutDraft({ ...baseOptions, exercises: [exercise('Bench')], overallIntensity: 6 })
    );
    act(() => {
      vi.advanceTimersByTime(WORKOUT_DRAFT_DEBOUNCE_MS + 100);
    });
    first.unmount();

    const second = renderHook(() => useWorkoutDraft({ ...baseOptions }));
    expect(second.result.current.pendingDraft?.exercises[0].exerciseName).toBe('Bench');

    let restored: ReturnType<typeof second.result.current.restore> = null;
    act(() => {
      restored = second.result.current.restore();
    });
    expect(restored?.overallIntensity).toBe(6);
    expect(second.result.current.pendingDraft).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('clear() cancels an in-flight debounce so a stale write cannot resurrect the draft', () => {
    const hook = renderHook(() =>
      useWorkoutDraft({ ...baseOptions, exercises: [exercise('Squat')] })
    );
    // Edit is pending inside the debounce window; clear (e.g. duplicate-409
    // path) must also kill the queued write.
    act(() => {
      vi.advanceTimersByTime(WORKOUT_DRAFT_DEBOUNCE_MS / 2);
      hook.result.current.clear();
      vi.advanceTimersByTime(WORKOUT_DRAFT_DEBOUNCE_MS * 2);
    });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('discard and clear both drop the stored draft and the offer', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 1,
        savedAt: new Date().toISOString(),
        exercises: [exercise('Deadlift')],
        sessionNotes: '',
        overallIntensity: null,
      })
    );
    const hook = renderHook(() => useWorkoutDraft({ ...baseOptions }));
    expect(hook.result.current.pendingDraft).not.toBeNull();
    act(() => {
      hook.result.current.discard();
    });
    expect(hook.result.current.pendingDraft).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();

    const again = renderHook(() =>
      useWorkoutDraft({ ...baseOptions, exercises: [exercise('OHP')] })
    );
    act(() => {
      vi.advanceTimersByTime(WORKOUT_DRAFT_DEBOUNCE_MS + 100);
    });
    expect(localStorage.getItem(KEY)).not.toBeNull();
    act(() => {
      again.result.current.clear();
    });
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('hasStoredWorkoutDraft (C4a mount-time peek)', () => {
  beforeEach(() => localStorage.clear());

  const KEY = buildWorkoutDraftKey(9, 11, '2026-07-29') as string;
  const payload = (exercises: ExerciseEntry[], savedAt = new Date().toISOString()) =>
    JSON.stringify({ v: 1, savedAt, exercises, sessionNotes: '', overallIntensity: null });

  it('is true only for a fresh draft with exercises', () => {
    localStorage.setItem(KEY, payload([exercise('Squat')]));
    expect(hasStoredWorkoutDraft(9, 11, '2026-07-29')).toBe(true);
  });

  it('is false when absent, empty, stale, or the key is unbuildable', () => {
    expect(hasStoredWorkoutDraft(9, 11, '2026-07-29')).toBe(false);
    localStorage.setItem(KEY, payload([]));
    expect(hasStoredWorkoutDraft(9, 11, '2026-07-29')).toBe(false);
    localStorage.setItem(KEY, payload([exercise('Squat')], new Date(Date.now() - WORKOUT_DRAFT_MAX_AGE_MS - 1000).toISOString()));
    expect(hasStoredWorkoutDraft(9, 11, '2026-07-29')).toBe(false);
    expect(hasStoredWorkoutDraft(undefined, 11, '2026-07-29')).toBe(false);
  });
});
