/**
 * H23 / frontend repair contract §7 — "leaving Run pauses the run at the exact
 * command time".
 *
 * Regression for the fast-forward defect: the stage-exit checkpoint stored the
 * live state unchanged, so a runner that was 'running' was restored as
 * 'running' with its ORIGINAL absolute segmentEndsAt. Because
 * advanceRunnerState() drains every segment whose deadline has passed
 * (`while (nowMs >= segmentEndsAt)`), all the wall-clock time the coach spent
 * on another stage was consumed as class time: returning to Run could land on a
 * later segment, or on DONE, for a class that was never actually run.
 *
 * The test drives the real hook. It advances the clock by an hour while the
 * hook is unmounted — far longer than this fixture's 620s total — so the
 * pre-fix behaviour reports `complete` and the fixed behaviour reports `paused`
 * at the same segment it left.
 */
import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { useBootcampRunner } from './useBootcampRunner';

// The runner only consumes the cue chime; keep jsdom audio out of the test.
vi.mock('./bootcampRunAcquisition', () => ({ playBootcampRunnerCue: vi.fn() }));

const T0 = Date.parse('2026-09-14T10:00:00Z');

const plan = (overrides: Partial<GeneratedBootcamp> = {}): GeneratedBootcamp => ({
  name: 'Clocked Circuit',
  classFormat: 'custom',
  dayType: 'full_body',
  stationCount: 2,
  exercisesPerStation: 2,
  rounds: 2,
  exerciseDurationSec: 40,
  targetDuration: 20,
  totalWorkoutMin: 12,
  demoDuration: 1,
  clearDuration: 1,
  totalClassMin: 15,
  expectedParticipants: 8,
  stations: [1, 2].map((stationNumber) => ({
    stationNumber,
    stationName: `Station ${stationNumber}`,
    equipmentNeeded: null,
    sortOrder: stationNumber,
  })),
  exercises: [
    ['Push-Up', 0, 0, 40, 10],
    ['Row', 1, 0, 45, 15],
    ['Squat', 0, 1, 35, 10],
    ['Carry', 1, 1, 35, 10],
  ].map(([exerciseName, stationIndex, sortOrder, durationSec, restSec]) => ({
    exerciseName: String(exerciseName),
    durationSec: Number(durationSec),
    restSec: Number(restSec),
    sortOrder: Number(sortOrder),
    isCardioFinisher: false,
    muscleTargets: 'full_body',
    easyVariation: null,
    mediumVariation: null,
    hardVariation: null,
    kneeMod: null,
    shoulderMod: null,
    ankleMod: null,
    wristMod: null,
    elbowMod: null,
    footMod: null,
    hipMod: null,
    backMod: null,
    description: null,
    equipmentRequired: null,
    stationIndex: Number(stationIndex),
  })),
  stretches: [{
    exerciseName: 'Worlds Greatest Stretch',
    targetMuscles: 'full_body',
    durationSec: 30,
    sortOrder: 1,
  }],
  overflowPlan: null,
  flowData: [],
  explanations: [],
  aiGenerated: false,
  ...overrides,
});

describe('useBootcampRunner stage-exit pause', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores the run paused at the exit segment instead of fast-forwarding', () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const bootcamp = plan();

    const first = renderHook(() => useBootcampRunner({ bootcamp }));
    expect(first.result.current.state.status).toBe('running');
    const exitIndex = first.result.current.state.segmentIndex;
    const exitRemainingMs = first.result.current.state.remainingMs;
    expect(exitIndex).toBe(0);

    // Five seconds of real class time, then the coach leaves the Run stage.
    act(() => {
      vi.setSystemTime(T0 + 5_000);
    });
    first.unmount();

    // One hour elsewhere — far longer than the 620s fixture.
    vi.setSystemTime(T0 + 60 * 60 * 1_000);

    const second = renderHook(() => useBootcampRunner({ bootcamp }));

    expect(second.result.current.state.status).toBe('paused');
    expect(second.result.current.state.segmentIndex).toBe(exitIndex);
    expect(second.result.current.state.remainingMs).toBeGreaterThan(0);
    expect(second.result.current.state.remainingMs).toBeLessThanOrEqual(exitRemainingMs);
  });

  it('stays put while paused, and only resumes from the frozen position', () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const bootcamp = plan();

    const first = renderHook(() => useBootcampRunner({ bootcamp }));
    act(() => {
      vi.setSystemTime(T0 + 5_000);
    });
    first.unmount();
    vi.setSystemTime(T0 + 30 * 60 * 1_000);

    const second = renderHook(() => useBootcampRunner({ bootcamp }));
    const frozen = second.result.current.state;
    expect(frozen.status).toBe('paused');

    // Still paused a further ten minutes later — a paused run must not drift.
    vi.setSystemTime(T0 + 40 * 60 * 1_000);
    act(() => {
      second.result.current.resume();
    });
    expect(second.result.current.state.status).toBe('running');
    expect(second.result.current.state.segmentIndex).toBe(frozen.segmentIndex);
    expect(second.result.current.state.segmentEndsAt).toBe((T0 + 40 * 60 * 1_000) + frozen.remainingMs);
  });

  // React StrictMode is enabled in frontend/src/main.jsx and replays every
  // effect as mount -> cleanup -> mount. The stage-exit checkpoint writes a
  // PAUSED snapshot from its cleanup, so an unguarded restore effect read that
  // snapshot back and a freshly opened Run stage showed PAUSED.
  it('starts a brand-new run RUNNING under StrictMode effect replay', () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const bootcamp = plan();

    const { result } = renderHook(() => useBootcampRunner({ bootcamp }), {
      wrapper: StrictMode,
    });

    expect(result.current.state.status).toBe('running');
    expect(result.current.state.segmentIndex).toBe(0);
  });
});
