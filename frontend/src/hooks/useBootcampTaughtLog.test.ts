/**
 * buildTaughtLogPayload unit tests (Slice 0.2)
 *
 * Locks the builder-state → POST /api/bootcamp/log mapping: main-board-only
 * filtering, freshness-required exerciseName on every entry, LOCAL date
 * format (DATEONLY column — never UTC), and null payloads for unteachable
 * states (no class / no main-board exercises).
 */
import { describe, expect, it } from 'vitest';
import { buildTaughtLogPayload, localDateString } from './useBootcampTaughtLog';
import type { GeneratedBootcamp } from './useBootcampAPI';

const exercise = (overrides: Record<string, unknown> = {}) => ({
  exerciseName: 'Goblet Squat',
  durationSec: 45,
  restSec: 15,
  sortOrder: 1,
  isCardioFinisher: false,
  muscleTargets: 'quads',
  easyVariation: null,
  mediumVariation: null,
  hardVariation: null,
  kneeMod: null,
  shoulderMod: null,
  ankleMod: null,
  wristMod: null,
  backMod: null,
  elbowMod: null,
  footMod: null,
  hipMod: null,
  description: null,
  equipmentRequired: null,
  ...overrides,
});

const bootcamp = (overrides: Partial<GeneratedBootcamp> = {}): GeneratedBootcamp => ({
  name: 'Test Class',
  classFormat: 'station_rotation',
  dayType: 'lower_body',
  stationCount: 3,
  targetDuration: 45,
  totalWorkoutMin: 35,
  demoDuration: 5,
  clearDuration: 5,
  totalClassMin: 45,
  expectedParticipants: 12,
  stations: [],
  exercises: [],
  overflowPlan: null,
  explanations: [],
  aiGenerated: false,
  ...overrides,
} as GeneratedBootcamp);

describe('localDateString', () => {
  it('formats local date parts, zero-padded', () => {
    expect(localDateString(new Date(2026, 6, 5, 18, 30))).toBe('2026-07-05');
    expect(localDateString(new Date(2026, 0, 9, 1, 0))).toBe('2026-01-09');
  });
});

describe('buildTaughtLogPayload', () => {
  it('returns null for no class or no main-board exercises', () => {
    expect(buildTaughtLogPayload(null)).toBeNull();
    expect(buildTaughtLogPayload(bootcamp())).toBeNull();
    expect(
      buildTaughtLogPayload(
        bootcamp({ exercises: [exercise({ board: 'alternative' }), exercise({ board: 'lowImpact' })] as GeneratedBootcamp['exercises'] })
      )
    ).toBeNull();
  });

  it('maps main-board exercises only, each carrying exerciseName for the freshness engine', () => {
    const payload = buildTaughtLogPayload(
      bootcamp({
        exercises: [
          exercise({ exerciseName: 'Goblet Squat', stationIndex: 0, board: 'main' }),
          exercise({ exerciseName: 'Kettlebell Swing', stationIndex: 1 }), // board undefined = main
          exercise({ exerciseName: 'Wall Sit', board: 'alternative' }),
        ] as GeneratedBootcamp['exercises'],
      })
    );

    expect(payload).not.toBeNull();
    expect(payload!.exercisesUsed).toEqual([
      { exerciseName: 'Goblet Squat', stationIndex: 0, durationSec: 45 },
      { exerciseName: 'Kettlebell Swing', stationIndex: 1, durationSec: 45 },
    ]);
    expect(payload!.exercisesUsed.every((entry) => typeof entry.exerciseName === 'string' && entry.exerciseName)).toBe(true);
  });

  it('carries dayType, a local YYYY-MM-DD classDate, and an execution summary — never a false attendance claim', () => {
    const payload = buildTaughtLogPayload(
      bootcamp({ exercises: [exercise()] as GeneratedBootcamp['exercises'], dayType: 'cardio', expectedParticipants: 18 })
    );

    expect(payload!.dayType).toBe('cardio');
    // §5 line 222: "expectedParticipants is not actual attendance." The 18 is recorded where
    // it belongs — inside the trainer-attested PRESCRIPTION — and the log asserts no
    // attendance at all, because nothing observed who showed up.
    // Asserted through `in` rather than a direct property read: the payload TYPE does not declare
    // `actualParticipants`, and this repo excludes test files from tsc, so `payload!.actualParticipants`
    // would have compiled while checking a field the contract says must not exist (round 114 F11).
    expect('actualParticipants' in payload!).toBe(false);
    expect(payload!.executionSummary).toEqual({
      kind: 'trainer_attested_prescription',
      // This fixture states no work interval or round count, so the summary reports NULL for
      // them rather than inventing a number the class never carried.
      prescribed: { workSec: null, rounds: null, targetDurationMin: 45 },
      expectedParticipants: 18,
      performedCount: 1,
    });
    expect(payload!.overflowActivated).toBe(false);
    expect(payload!.classDate).toBe(localDateString(new Date()));
    expect(payload!.classDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
