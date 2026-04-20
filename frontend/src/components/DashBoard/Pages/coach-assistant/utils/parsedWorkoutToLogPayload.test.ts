/**
 * parsedWorkoutToLogPayload — unit tests
 * =======================================
 * Locks the contract between the Coach Assistant transcript intake and
 * the canonical adminClientService.logWorkout payload shape.
 */
import { describe, expect, it } from 'vitest';
import {
  parsedWorkoutToLogPayload,
  type ParsedWorkout,
} from './parsedWorkoutToLogPayload';

const baseParsed: ParsedWorkout = {
  exercises: [
    {
      exerciseName: 'Back Squat',
      sets: [
        { setNumber: 1, weight: 135, reps: 10 },
        { setNumber: 2, weight: 185, reps: 8 },
        { setNumber: 3, weight: 225, reps: 5 },
      ],
    },
  ],
  sessionNotes: 'Solid lower body session',
  overallIntensity: 7,
  date: '2026-04-12',
};

describe('parsedWorkoutToLogPayload — happy path', () => {
  it('maps a real parsed workout to the canonical logWorkout shape', () => {
    const out = parsedWorkoutToLogPayload(baseParsed);
    expect(out.exercises).toHaveLength(1);
    // Phase 13 (2026-04-15): canonical mapper now stamps every set with a
    // tempo value. Parser-extracted tempo wins; missing tempo falls back to
    // DEFAULT_TEMPO = '1/1/0'. None of these sets had a parser tempo, so all
    // three should carry the default.
    expect(out.exercises[0]).toEqual({
      name: 'Back Squat',
      sets: [
        { setNumber: 1, reps: 10, weight: 135, tempo: '1/1/0' },
        { setNumber: 2, reps: 8, weight: 185, tempo: '1/1/0' },
        { setNumber: 3, reps: 5, weight: 225, tempo: '1/1/0' },
      ],
    });
    expect(out.date).toBe('2026-04-12');
    expect(out.intensity).toBe(7);
    expect(out.notes).toBe('Solid lower body session');
  });

  it('uses caller-supplied fallback title when parser is silent', () => {
    const out = parsedWorkoutToLogPayload(baseParsed, { fallbackTitle: 'Plaud Session' });
    expect(out.title).toBe('Plaud Session');
  });

  it('uses built-in default title when no fallback supplied', () => {
    const out = parsedWorkoutToLogPayload(baseParsed);
    expect(out.title).toBe('Voice Memo Workout');
  });

  it('preserves rpe when present and positive', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench',
        sets: [{ setNumber: 1, weight: 185, reps: 5, rpe: 8 }],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].rpe).toBe(8);
  });

  it('preserves set notes when present and non-blank', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench',
        sets: [{ setNumber: 1, weight: 185, reps: 5, notes: '  paused at chest  ' }],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].notes).toBe('paused at chest');
  });
});

describe('parsedWorkoutToLogPayload — defensive filtering', () => {
  it('drops parsed exercises with empty exerciseName', () => {
    const parsed: ParsedWorkout = {
      exercises: [
        { exerciseName: '', sets: [{ setNumber: 1, weight: 100, reps: 10 }] },
        { exerciseName: '   ', sets: [{ setNumber: 1, weight: 100, reps: 10 }] },
        { exerciseName: 'Real Exercise', sets: [{ setNumber: 1, weight: 100, reps: 10 }] },
      ],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0].name).toBe('Real Exercise');
  });

  it('drops sets with zero reps AND zero weight', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Squat',
        sets: [
          { setNumber: 1, weight: 0, reps: 0 },
          { setNumber: 2, weight: 135, reps: 10 },
          { setNumber: 3, weight: null, reps: 0 },
          { setNumber: 4, weight: 0, reps: 8 }, // bodyweight pushup case — keep
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets).toHaveLength(2);
    expect(out.exercises[0].sets[0]).toEqual({ setNumber: 1, reps: 10, weight: 135, tempo: '1/1/0' });
    expect(out.exercises[0].sets[1]).toEqual({ setNumber: 2, reps: 8, weight: 0, tempo: '1/1/0' });
  });

  it('drops exercises whose sets all get filtered', () => {
    const parsed: ParsedWorkout = {
      exercises: [
        {
          exerciseName: 'Phantom Exercise',
          sets: [
            { setNumber: 1, weight: 0, reps: 0 },
            { setNumber: 2, weight: null, reps: 0 },
          ],
        },
        {
          exerciseName: 'Real Exercise',
          sets: [{ setNumber: 1, weight: 100, reps: 10 }],
        },
      ],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0].name).toBe('Real Exercise');
  });

  it('renumbers setNumber sequentially after filtering', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Squat',
        sets: [
          { setNumber: 1, weight: 0, reps: 0 }, // dropped
          { setNumber: 2, weight: 135, reps: 10 },
          { setNumber: 3, weight: 0, reps: 0 }, // dropped
          { setNumber: 4, weight: 185, reps: 8 },
          { setNumber: 5, weight: 225, reps: 5 },
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });

  it('coerces null weight to 0 in output', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Pushup',
        sets: [{ setNumber: 1, weight: null, reps: 20 }],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].weight).toBe(0);
    expect(out.exercises[0].sets[0].reps).toBe(20);
  });

  it('drops rpe when not positive', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench',
        sets: [
          { setNumber: 1, weight: 135, reps: 5, rpe: 0 },
          { setNumber: 2, weight: 135, reps: 5, rpe: undefined },
          { setNumber: 3, weight: 135, reps: 5, rpe: 7 },
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].rpe).toBeUndefined();
    expect(out.exercises[0].sets[1].rpe).toBeUndefined();
    expect(out.exercises[0].sets[2].rpe).toBe(7);
  });
});

describe('parsedWorkoutToLogPayload — date and intensity fallbacks', () => {
  it('falls back to caller-supplied fallbackDate when parser omits date', () => {
    const out = parsedWorkoutToLogPayload(
      { exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }] },
      { fallbackDate: '2026-04-13' },
    );
    expect(out.date).toBe('2026-04-13');
  });

  it('falls back to today when neither parser nor caller supply a date', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
    });
    // Should be a valid YYYY-MM-DD string
    expect(out.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('clamps valid parser-supplied intensity to [1,10]', () => {
    // Phase 16 (2026-04-16): clamping still applies when the parser
    // returns a valid number, but 0 is no longer treated as a
    // clamp-to-1 signal — 0 falls into the "not extracted" bucket and
    // the field is omitted entirely.
    expect(parsedWorkoutToLogPayload(
      { ...baseParsed, overallIntensity: 15 },
    ).intensity).toBe(10);
    expect(parsedWorkoutToLogPayload(
      { ...baseParsed, overallIntensity: 7.6 },
    ).intensity).toBe(8);
  });

  it('uses caller-supplied fallback intensity when parser is silent', () => {
    const out = parsedWorkoutToLogPayload(
      { exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }] },
      { fallbackIntensity: 6 },
    );
    expect(out.intensity).toBe(6);
  });

  // Phase 16 (2026-04-16): replaces the pre-Phase-16 "uses built-in
  // default intensity (5)" test. The mapper no longer fabricates a
  // neutral 5 when neither the parser nor the caller supplied a value.
  it('T9 Phase 16: omits intensity when parser and caller both silent', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
    });
    expect(out.intensity).toBeUndefined();
    expect('intensity' in out).toBe(false);
  });

  it('T9 Phase 16: omits intensity when parser returns 0 (below clamp range)', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
      overallIntensity: 0,
    });
    expect(out.intensity).toBeUndefined();
  });

  it('T9 Phase 16: omits intensity when parser returns null', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
      overallIntensity: null as any,
    });
    expect(out.intensity).toBeUndefined();
  });

  it('uses built-in default duration (50min) when nothing is supplied', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
    });
    expect(out.duration).toBe(50);
  });
});

describe('parsedWorkoutToLogPayload — empty/edge cases', () => {
  it('returns an empty exercises array when input has no exercises', () => {
    const out = parsedWorkoutToLogPayload({ exercises: [] });
    expect(out.exercises).toEqual([]);
    // Phase 16 (2026-04-16): envelope no longer guarantees intensity —
    // null-honest mapper omits it when the parser did not extract one.
    // Title / date / duration remain required envelope fields.
    expect(out.title).toBeTruthy();
    expect(out.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.duration).toBeGreaterThan(0);
    expect(out.intensity).toBeUndefined();
  });

  it('omits notes field when sessionNotes is blank', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
      sessionNotes: '   ',
    });
    expect(out.notes).toBeUndefined();
  });

  it('handles parser sending exercises field as undefined', () => {
    const out = parsedWorkoutToLogPayload({} as ParsedWorkout);
    expect(out.exercises).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 13 (2026-04-15): targetDate override + canonical tempo
// ─────────────────────────────────────────────────────────────
describe('parsedWorkoutToLogPayload — Phase 13 targetDate override', () => {
  it('uses targetDate over parsed.date when both are present', () => {
    const out = parsedWorkoutToLogPayload(baseParsed, { targetDate: '2026-04-15' });
    expect(out.date).toBe('2026-04-15');
  });

  it('uses targetDate over fallbackDate even when parsed.date is missing', () => {
    const out = parsedWorkoutToLogPayload(
      { exercises: baseParsed.exercises },
      { targetDate: '2026-04-15', fallbackDate: '2020-01-01' },
    );
    expect(out.date).toBe('2026-04-15');
  });

  it('treats empty/whitespace targetDate as unset (falls through to parser)', () => {
    const out = parsedWorkoutToLogPayload(baseParsed, { targetDate: '   ' });
    expect(out.date).toBe('2026-04-12');
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 15.0 (2026-04-15): preserve exercise-level performanceNotes as a
// first-class `exerciseNote` field on the exercise payload. Replaces the
// Phase 13.2 set-1 encoding, which silently lost data when set 1 was
// deleted and misclassified legitimate trainer set notes that started
// with `Coach: `.
// ─────────────────────────────────────────────────────────────
describe('parsedWorkoutToLogPayload — Phase 15.0 exerciseNote preservation', () => {
  it('preserves performanceNotes as exercise.exerciseNote (NOT on any set)', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Goblet Squat',
        sets: [
          { setNumber: 1, weight: 40, reps: 10 },
          { setNumber: 2, weight: 40, reps: 10 },
          { setNumber: 3, weight: 40, reps: 10 },
        ],
        performanceNotes: 'knees caved on last set',
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].exerciseNote).toBe('knees caved on last set');
    // Phase 15: the exercise note must NOT be encoded into any set's
    // notes field. Set notes remain strictly set-level.
    expect(out.exercises[0].sets[0].notes).toBeUndefined();
    expect(out.exercises[0].sets[1].notes).toBeUndefined();
    expect(out.exercises[0].sets[2].notes).toBeUndefined();
  });

  it('keeps set-level notes on the correct set alongside an exerciseNote', () => {
    // Real-world: "set 3 had tempo breakdown, knees caved throughout"
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Split Squat',
        sets: [
          { setNumber: 1, weight: 30, reps: 10 },
          { setNumber: 2, weight: 30, reps: 10 },
          { setNumber: 3, weight: 30, reps: 10, notes: 'tempo breakdown' },
        ],
        performanceNotes: 'knees caved throughout',
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].exerciseNote).toBe('knees caved throughout');
    expect(out.exercises[0].sets[0].notes).toBeUndefined();
    expect(out.exercises[0].sets[1].notes).toBeUndefined();
    expect(out.exercises[0].sets[2].notes).toBe('tempo breakdown');
  });

  it('ignores empty/whitespace-only performanceNotes', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Row',
        sets: [{ setNumber: 1, weight: 100, reps: 10 }],
        performanceNotes: '   ',
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].exerciseNote).toBeUndefined();
    expect(out.exercises[0].sets[0].notes).toBeUndefined();
  });

  it('preserves a set note that literally starts with "Coach:" as a SET note', () => {
    // Phase 15 anti-regression: a trainer-authored set note that happens
    // to start with "Coach:" must remain a set note, never reclassified
    // as an exercise note. The Phase 13.2 encoding contract made this
    // ambiguous; the Phase 15 field split resolves it cleanly.
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench Press',
        sets: [
          { setNumber: 1, weight: 185, reps: 5, notes: 'Coach: said this was heavy' },
        ],
        // No performanceNotes.
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].notes).toBe('Coach: said this was heavy');
    expect(out.exercises[0].exerciseNote).toBeUndefined();
  });

  it('ANTI-REGRESSION: exercise-level notes are not silently dropped', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'OHP',
        sets: [{ setNumber: 1, weight: 95, reps: 8 }],
        performanceNotes: 'shoulder clicking',
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].exerciseNote).toBe('shoulder clicking');
  });

  it('ANTI-REGRESSION: mapper no longer encodes " · Coach: " or "Coach: " into set notes on write', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Front Squat',
        sets: [
          { setNumber: 1, weight: 135, reps: 5 },
          { setNumber: 2, weight: 135, reps: 5, notes: 'upper back rounded' },
        ],
        performanceNotes: 'hip flexors tight',
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    for (const set of out.exercises[0].sets) {
      if (set.notes) {
        expect(set.notes).not.toContain(' · Coach: ');
        // The pure "Coach: <perf>" prefix is also gone from new writes;
        // a set note that begins with Coach: is the trainer's own words.
        expect(set.notes).not.toMatch(/^Coach: hip flexors tight$/);
      }
    }
    expect(out.exercises[0].exerciseNote).toBe('hip flexors tight');
  });
});

describe('parsedWorkoutToLogPayload — Phase 13 canonical tempo', () => {
  it('stamps every set with DEFAULT_TEMPO when parser emits no tempo', () => {
    const out = parsedWorkoutToLogPayload(baseParsed);
    for (const set of out.exercises[0].sets) {
      expect(set.tempo).toBe('1/1/0');
    }
  });

  it('preserves parser-extracted tempo when present and non-blank', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Tempo Squat',
        sets: [
          { setNumber: 1, weight: 135, reps: 10, tempo: '3/1/1' },
          { setNumber: 2, weight: 135, reps: 10, tempo: '4/2/2' },
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].tempo).toBe('3/1/1');
    expect(out.exercises[0].sets[1].tempo).toBe('4/2/2');
  });

  it('falls back to DEFAULT_TEMPO when parser emits empty tempo string', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Squat',
        sets: [
          { setNumber: 1, weight: 135, reps: 10, tempo: '' },
          { setNumber: 2, weight: 135, reps: 10, tempo: '   ' },
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].tempo).toBe('1/1/0');
    expect(out.exercises[0].sets[1].tempo).toBe('1/1/0');
  });

  it('mixes preserved parser tempo with defaults across sets', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench',
        sets: [
          { setNumber: 1, weight: 135, reps: 10, tempo: '3/0/1' },
          { setNumber: 2, weight: 135, reps: 10 },
          { setNumber: 3, weight: 135, reps: 10, tempo: '2/1/1' },
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].tempo).toBe('3/0/1');
    expect(out.exercises[0].sets[1].tempo).toBe('1/1/0');
    expect(out.exercises[0].sets[2].tempo).toBe('2/1/1');
  });
});
