/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Feature Batch 4 laws — Sean's six picks, end-to-end seams.  │
 * │ A: session clock rides the draft and re-anchors on Restore. │
 * │ B: keypad shows live plate math for weight entry.           │
 * │ D: one-tap warm-up ramp prepends 40/60/80 and renumbers.    │
 * │ E: trend chip reads past top sets from the engine.          │
 * │ F: superset chains mark the Focus Flow rail.                │
 * │ (C — PR toast — is law-tested in sessionTools.diffNewPRs.)  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { parseWorkoutDraft } from '../../useWorkoutDraft';
import ShellNotices from './zones/ShellNotices';
import NumericKeypadSheet from '../../NumericKeypadSheet';
import FocusFlowSkin from '../FocusFlowSkin';
import { useWarmupRamp } from './useSessionPerks';
import type { RunnerEngine } from '../RunnerEngine.types';
import type { ExerciseEntry } from '../../../../services/nasmApiService';

afterEach(cleanup);

const baseDraft = {
  v: 1,
  savedAt: new Date().toISOString(),
  exercises: [{
    exerciseName: 'Bench', exerciseId: 'x1', formRating: null, painLevel: 0,
    sets: [{ setNumber: 1, weight: 100, reps: 8, rpe: null, formQuality: null, restTime: 60 }],
  }],
  sessionNotes: '',
  overallIntensity: null,
};

describe('A — the session clock rides the draft', () => {
  it('sessionStartedAt round-trips; legacy/garbage parse to null', () => {
    const anchor = Date.now() - 120_000;
    expect(parseWorkoutDraft(JSON.stringify({ ...baseDraft, sessionStartedAt: anchor }))?.sessionStartedAt).toBe(anchor);
    expect(parseWorkoutDraft(JSON.stringify(baseDraft))?.sessionStartedAt).toBeNull();
    expect(parseWorkoutDraft(JSON.stringify({ ...baseDraft, sessionStartedAt: 'noon' }))?.sessionStartedAt).toBeNull();
  });

  it('Restore re-anchors the clock (a PAST anchor is the correct one)', () => {
    const onRestoreSessionStart = vi.fn();
    const anchor = Date.now() - 300_000;
    const draft = { ...baseDraft, sessionStartedAt: anchor };
    render(
      <ShellNotices
        isOnline pendingCount={0}
        workoutDraft={{ pendingDraft: draft as never, restore: vi.fn(() => draft as never), discard: vi.fn(), clear: vi.fn() }}
        draftOfferVisible
        setDraftGate={vi.fn()} setExercises={vi.fn()} setSessionNotes={vi.fn()} setOverallIntensity={vi.fn()}
        onRestoreSessionStart={onRestoreSessionStart}
        scheduledSessionId={null} scheduledSessionCreditHint={null} scheduledSessionDate={null} clientSource={null}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Restore/i }));
    expect(onRestoreSessionStart).toHaveBeenCalledWith(anchor);
  });
});

describe('B — live plate math at weight-entry time', () => {
  it('weight keypad shows the per-side stack for the current value', () => {
    render(
      <NumericKeypadSheet
        open label='Set 1 — Weight (lbs)' value={205} allowDecimal showPlateMath
        lastSessionValue={null} onCommit={vi.fn()} onClose={vi.fn()} onUseSystemKeyboard={vi.fn()}
      />,
    );
    expect(screen.getByText('45+35 / side')).toBeInTheDocument();
  });

  it('reps keypad (showPlateMath off) never shows plates', () => {
    render(
      <NumericKeypadSheet
        open label='Set 1 — Reps' value={205} allowDecimal={false}
        lastSessionValue={null} onCommit={vi.fn()} onClose={vi.fn()} onUseSystemKeyboard={vi.fn()}
      />,
    );
    expect(screen.queryByText(/\/ side/)).toBeNull();
  });
});

describe('D — one-tap warm-up ramp', () => {
  it('prepends 40/60/80 as warm-up sets and renumbers the work sets', () => {
    const exercises: ExerciseEntry[] = [{
      loggerExerciseId: 'e1', exerciseId: 'x1', exerciseName: 'Squat', formRating: null, painLevel: 0,
      sets: [{ loggerSetId: 's1', setNumber: 1, weight: 225, reps: 0, rpe: null, formQuality: null, restTime: 120 }],
    } as never];
    let next: ExerciseEntry[] = exercises;
    const setExercises = vi.fn((updater: (prev: ExerciseEntry[]) => ExerciseEntry[]) => { next = updater(exercises); });
    const { result } = renderHook(() => useWarmupRamp(setExercises as never, (p) => `${p}-t1`));
    act(() => result.current(0));

    const sets = next[0].sets;
    expect(sets.map((set) => set.weight)).toEqual([90, 135, 180, 225]);
    expect(sets.map((set) => set.setNumber)).toEqual([1, 2, 3, 4]);
    expect(sets.slice(0, 3).every((set) => set.notes === 'warm-up' && set.reps === 0)).toBe(true);
  });
});

const engineWith = (overrides: Partial<RunnerEngine> = {}): RunnerEngine => ({
  exercises: [
    { exerciseName: 'Bench Press', exerciseId: 'x1', loggerExerciseId: 'e1', formRating: null, painLevel: 0, supersetGroup: 1,
      sets: [{ loggerSetId: 's1', setNumber: 1, weight: 100, reps: 0, rpe: null, formQuality: null, restTime: 60 }] },
    { exerciseName: 'Row', exerciseId: 'x2', loggerExerciseId: 'e2', formRating: null, painLevel: 0, supersetGroup: 1,
      sets: [{ loggerSetId: 's2', setNumber: 1, weight: 80, reps: 0, rpe: null, formQuality: null, restTime: 60 }] },
  ] as never,
  renderExerciseCard: vi.fn((index: number) => <div data-testid={`card-${index}`} />),
  stats: { completedSets: 0, totalSets: 2 },
  rest: { isRunning: false, secondsLeft: 0, stop: vi.fn(), extend: vi.fn() },
  openRolodex: vi.fn(),
  rows: {
    onUpdateSet: vi.fn(), onRemoveSet: vi.fn(), onAddSet: vi.fn(),
    onRemoveExercise: vi.fn(), onSetLogged: vi.fn(),
  },
  ...overrides,
});

describe('E — trend chip from past sessions', () => {
  it('renders oldest→newest with a direction arrow when ≥2 sessions exist', () => {
    const engine = engineWith();
    engine.rows.getTrend = vi.fn(() => [105, 100, 95]); // newest first from cache
    render(<FocusFlowSkin engine={engine} />);
    expect(screen.getByText(/95 → 100 → 105 lbs ↑/)).toBeInTheDocument();
  });

  it('fewer than 2 sessions → no chip (no fake trends)', () => {
    const engine = engineWith();
    engine.rows.getTrend = vi.fn(() => [105]);
    render(<FocusFlowSkin engine={engine} />);
    expect(screen.queryByText(/lbs [↑↓→]/)).toBeNull();
  });
});

describe('D+F — skin chrome guards', () => {
  it('ramp button fires the engine action for the ACTIVE exercise, and hides once work is logged', () => {
    const engine = engineWith();
    engine.rows.onInsertWarmupRamp = vi.fn();
    const { rerender } = render(<FocusFlowSkin engine={engine} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add warm-up ramp sets for Bench Press' }));
    expect(engine.rows.onInsertWarmupRamp).toHaveBeenCalledWith(0);

    const logged = engineWith();
    logged.rows.onInsertWarmupRamp = vi.fn();
    (logged.exercises[0].sets[0] as { reps: number }).reps = 8; // work logged
    rerender(<FocusFlowSkin engine={logged} />);
    expect(screen.queryByRole('button', { name: /Add warm-up ramp/ })).toBeNull();
  });

  it('F: superset-linked exercises are chained on the rail (marker + aria)', () => {
    render(<FocusFlowSkin engine={engineWith()} />);
    expect(screen.getByRole('tab', { name: /Row, superset with previous/ })).toBeInTheDocument();
  });
});

describe('C — PR toast fires ONLY for hand-logged sets (the restore-storm guard)', () => {
  it('bulk arrival (restore/plan load) re-baselines silently; a fresh log celebrates', async () => {
    vi.resetModules();
    const toastSuccess = vi.fn();
    vi.doMock('react-toastify', () => ({ toast: { success: toastSuccess, info: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
    const { usePRToast: mockedUsePRToast } = await import('./useSessionPerks');

    const pr = (value: number) => [{ exerciseName: 'Bench', type: 'weight' as const, value, label: `${value} lbs top set` }];
    const loggedRef = { current: 0 };

    const { rerender } = renderHook(
      ({ prs }) => mockedUsePRToast(prs, loggedRef),
      { initialProps: { prs: [] as ReturnType<typeof pr> } },
    );

    // Restore floods PRs in with NO recent hand-log → silence.
    rerender({ prs: pr(105) });
    expect(toastSuccess).not.toHaveBeenCalled();

    // A set logged moments ago → the improvement celebrates.
    loggedRef.current = Date.now();
    rerender({ prs: pr(110) });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('🏆 PR — Bench: 110 lbs top set');
    vi.doUnmock('react-toastify');
  });
});
