/**
 * ============================================================================
 * FILE: bootcampTemplateSaveRealShape.test.mjs — hostile-review CRITICAL-1.
 *
 * THE DEFECT THIS LOCKS
 *   Admission REQUIRED `station.stationIndex` on every station. But the only
 *   producer of these objects — bootcampGenerator's buildStationWorkout — emits
 *   stations carrying stationNumber / stationName / equipmentNeeded /
 *   equipmentTokens / setupTimeSec / sortOrder / coverageStatus /
 *   coverageMessage and NO stationIndex. Its EXERCISES reference a station by
 *   ordinal, and HEAD's baseline resolved that positionally.
 *
 *   So the whole save path returned 400 for every station-based class, and only
 *   `full_group` (zero stations) could be saved. The suite stayed green because
 *   every other fixture HAND-SUPPLIED `stationIndex` — the fixtures encoded a
 *   property the real producer never emits, and nothing fed real shape in.
 *
 * This file is that missing test. The station object below is the generator's
 * verbatim key set; if it ever stops being admissible, this fails loudly instead
 * of the feature silently dying behind a green suite.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  BootcampTemplatePersistenceError,
  BootcampTemplateValidationError,
  buildExerciseRow,
  buildStationRow,
  validateGeneratedClass,
} from '../../services/bootcamp/bootcampTemplateContract.mjs';

/** The generator's station object, key for key. Note: NO stationIndex. */
const generatorStation = (stationNumber) => ({
  stationNumber,
  stationName: `Station ${stationNumber}`,
  equipmentNeeded: 'dumbbells, bench',
  equipmentTokens: ['dumbbells', 'bench'],
  setupTimeSec: 60,
  sortOrder: stationNumber,
  coverageStatus: 'covered',
  coverageMessage: null,
});

/** Exercises carry the station ORDINAL, exactly as the generator emits it. */
const generatorClass = (over = {}) => ({
  name: 'Synthetic Real Shape',
  classFormat: 'stations_4x',
  dayType: 'full_body',
  targetDuration: 45,
  expectedParticipants: 12,
  stations: [generatorStation(1), generatorStation(2)],
  exercises: [
    { exerciseName: 'Goblet Squat', stationIndex: 0, sortOrder: 0, durationSec: 45, restSec: 15 },
    { exerciseName: 'Step Jacks', stationIndex: 1, sortOrder: 1, durationSec: 60, restSec: 30, board: 'alternative' },
  ],
  stretches: [{ exerciseName: 'Hip Opener', targetMuscles: 'hips', durationSec: 30, sortOrder: 1 }],
  ...over,
});

describe('the REAL generator shape is admissible', () => {
  it('admits stations that carry no stationIndex at all', () => {
    const result = validateGeneratedClass(generatorClass());
    expect(result.stations).toHaveLength(2);
    // Ordinal falls back to array position.
    expect(result.stationOrdinals).toEqual([0, 1]);
  });

  it('admits every station-based format the generator can emit', () => {
    // The regression made ALL of these a 400 while only full_group could save.
    for (const classFormat of ['stations_4x', 'stations_3x5', '4x4_r2', 'circuit', 'amrap']) {
      expect(() => validateGeneratedClass(generatorClass({ classFormat }))).not.toThrow();
    }
  });

  it('still admits an explicit stationIndex, and honours it as the ordinal', () => {
    const result = validateGeneratedClass(generatorClass({
      stations: [{ stationIndex: 5, stationName: 'Rack' }, { stationIndex: 9, stationName: 'Floor' }],
      exercises: [
        { exerciseName: 'Rack Row', stationIndex: 5 },
        { exerciseName: 'Floor Row', stationIndex: 9 },
      ],
    }));
    expect(result.stationOrdinals).toEqual([5, 9]);
  });

  it('still refuses an exercise that references a station that is not there', () => {
    // Defect (2) must stay closed: an out-of-range reference cannot silently
    // become a full-group row.
    expect(() => validateGeneratedClass(generatorClass({
      exercises: [{ exerciseName: 'Orphan', stationIndex: 7 }],
    }))).toThrow(BootcampTemplateValidationError);
  });

  it('refuses a NEGATIVE or fractional explicit stationIndex', () => {
    for (const bad of [-1, 1.5]) {
      expect(() => validateGeneratedClass(generatorClass({
        stations: [{ stationName: 'Rack', stationIndex: bad }],
        exercises: [{ exerciseName: 'Row', stationIndex: bad }],
      }))).toThrow(BootcampTemplateValidationError);
    }
  });
});

describe('row building from the real shape', () => {
  it('fills the NOT NULL pair from the ordinal when the station omits both', () => {
    const bare = { stationName: 'Rack' };
    expect(buildStationRow(bare, 11, 3)).toMatchObject({ stationNumber: 3, sortOrder: 3 });
  });

  it('keeps an explicit stationNumber/sortOrder over the ordinal', () => {
    expect(buildStationRow({ ...generatorStation(9), sortOrder: 7 }, 11, 0))
      .toMatchObject({ stationNumber: 9, sortOrder: 7 });
  });

  it('resolves each exercise onto the station at its ordinal', () => {
    const { exercises, stationOrdinals } = validateGeneratedClass(generatorClass());
    const stationIdByIndex = new Map(stationOrdinals.map((ordinal, position) => [ordinal, 700 + position]));
    const rows = exercises.map((exercise) => buildExerciseRow(exercise, 11, stationIdByIndex));
    expect(rows[0].stationId).toBe(700);
    expect(rows[1].stationId).toBe(701);
  });

  it('fails loudly rather than demoting an unresolvable reference to full-group', () => {
    const { exercises } = validateGeneratedClass(generatorClass());
    // An EMPTY map stands in for a `returning` set that came back short. This is
    // an internal persistence fault, so it is a 500-class error, not a 400.
    expect(() => buildExerciseRow(exercises[0], 11, new Map()))
      .toThrow(BootcampTemplatePersistenceError);
  });
});
