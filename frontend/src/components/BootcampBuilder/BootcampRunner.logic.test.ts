import { describe, expect, it } from 'vitest';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import {
  advanceRunnerState,
  buildBootcampRunnerSegments,
  createRunnerState,
  getRunnerTotalDurationMs,
  pauseRunnerState,
  resumeRunnerState,
  skipRunnerSegment,
} from './BootcampRunner.logic';

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

describe('Bootcamp Runner absolute-deadline engine', () => {
  it('derives warmup, simultaneous station work, rest, rotation, and completion segments', () => {
    const segments = buildBootcampRunnerSegments(plan());

    expect(segments[0]).toMatchObject({
      phase: 'warmup',
      durationSec: 60,
      label: 'Warm-Up',
      cue: 'Coach Demo',
    });
    expect(segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        phase: 'work',
        round: 1,
        exerciseSlot: 1,
        durationSec: 40,
        stationCues: ['Push-Up', 'Row'],
      }),
      expect.objectContaining({
        phase: 'rest',
        round: 1,
        durationSec: 15,
      }),
      expect.objectContaining({
        phase: 'transition',
        round: 1,
      }),
    ]));
    expect(segments.filter((segment) => segment.phase === 'work')).toHaveLength(8);
    expect(segments.filter((segment) => segment.phase === 'transition')).toHaveLength(3);
    expect(segments[segments.length - 2]).toMatchObject({
      phase: 'warmup',
      label: 'Cooldown',
      cue: 'Clear Floor',
      durationSec: 60,
    });
    expect(getRunnerTotalDurationMs(segments)).toBe(620_000);
    expect(segments[segments.length - 1]?.phase).toBe('complete');
  });

  it('advances against the prior absolute deadline after background throttling', () => {
    const segments = [
      { id: 'a', phase: 'work' as const, label: 'A', cue: 'Work', durationSec: 10, stationCues: [] },
      { id: 'b', phase: 'rest' as const, label: 'B', cue: 'Rest', durationSec: 5, stationCues: [] },
      { id: 'c', phase: 'work' as const, label: 'C', cue: 'Work', durationSec: 20, stationCues: [] },
      { id: 'done', phase: 'complete' as const, label: 'Complete', cue: 'Complete', durationSec: 0, stationCues: [] },
    ];
    const initial = createRunnerState(segments, 1_000);
    const advanced = advanceRunnerState(initial, segments, 17_000);

    expect(advanced.segmentIndex).toBe(2);
    expect(advanced.segmentEndsAt).toBe(36_000);
    expect(advanced.remainingMs).toBe(19_000);
  });

  it('pauses with exact remaining time and resumes from a new deadline', () => {
    const segments = buildBootcampRunnerSegments(plan({ stretches: [] }));
    const running = createRunnerState(segments, 2_000);
    const paused = pauseRunnerState(running, 12_000);
    const resumed = resumeRunnerState(paused, 50_000);

    expect(paused.status).toBe('paused');
    expect(paused.segmentEndsAt).toBeNull();
    expect(resumed.status).toBe('running');
    expect(resumed.segmentEndsAt).toBe(50_000 + paused.remainingMs);
  });

  it('skips from the current moment instead of inheriting a stale deadline', () => {
    const segments = buildBootcampRunnerSegments(plan({ stretches: [] }));
    const running = createRunnerState(segments, 1_000);
    const skipped = skipRunnerSegment(running, segments, 7_000);

    expect(skipped.segmentIndex).toBe(1);
    expect(skipped.segmentEndsAt).toBe(7_000 + segments[1].durationSec * 1_000);
  });

  it('finishes safely when the plan has no runnable exercises', () => {
    const segments = buildBootcampRunnerSegments(plan({ exercises: [], stretches: [] }));
    const state = createRunnerState(segments, 1_000);

    expect(segments).toEqual([
      {
        id: 'complete',
        phase: 'complete',
        label: 'Class Complete',
        cue: 'Class complete',
        durationSec: 0,
        stationCues: [],
      },
    ]);
    expect(state.status).toBe('complete');
  });
});
