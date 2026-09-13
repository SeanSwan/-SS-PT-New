/**
 * ============================================================================
 * FILE: bootcampTemplateValueHardening.test.mjs
 *
 * PURPOSE: the locks for hostile-review findings #2, #3, #4 and #7 — the values
 * that still passed admission and then failed MID-WRITE (a 500 with a driver
 * message) rather than before the first row.
 *
 *   #2  `''` was treated as "absent" for enum fields while the row builders use
 *       `??`, which does not catch it — so `classStyle: ''` / `board: ''` were
 *       written as raw enum values. Sequelize does not stop it either:
 *       `Model.build({classStyle: ''}).validate()` passes.
 *   #3  `Number.isSafeInteger` admits int4 overflow (3e9 is a safe integer), and
 *       the `+8` derivative on maxParticipants was itself the overflow.
 *       BOOLEAN columns had no type guard at all.
 *   #4  Allowlisted station/stretch columns were copied with zero domain checks.
 *   #7  The duplicate-occurrence message interpolated client-controlled input.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  BootcampTemplateValidationError,
  validateGeneratedClass,
} from '../../services/bootcamp/bootcampTemplateContract.mjs';

const validClass = (over = {}) => ({
  name: 'Synthetic Hardening',
  classFormat: 'stations_4x',
  dayType: 'full_body',
  targetDuration: 45,
  expectedParticipants: 12,
  stations: [{ stationNumber: 1, stationName: 'Rack', setupTimeSec: 30, sortOrder: 1 }],
  exercises: [{ exerciseName: 'Goblet Squat', stationIndex: 0, sortOrder: 0, durationSec: 45 }],
  ...over,
});

const rejects = (over) => expect(() => validateGeneratedClass(validClass(over)))
  .toThrow(BootcampTemplateValidationError);

describe('#2 — an empty enum value is NOT absence', () => {
  it('rejects a blank classStyle, intensityCategory or dayType', () => {
    rejects({ classStyle: '' });
    rejects({ intensityCategory: '' });
    rejects({ dayType: '' });
  });

  it('rejects a blank exercise board', () => {
    rejects({ exercises: [{ exerciseName: 'Row', stationIndex: 0, board: '' }] });
  });

  it('still accepts the field being genuinely absent', () => {
    expect(() => validateGeneratedClass(validClass())).not.toThrow();
  });

  it('rejects a non-boolean for a BOOLEAN column', () => {
    rejects({ includeStretch: 'maybe' });
    rejects({ aiGenerated: 'yes' });
    rejects({ exercises: [{ exerciseName: 'Row', stationIndex: 0, isCardioFinisher: 'yes' }] });
  });

  it('accepts real booleans', () => {
    expect(() => validateGeneratedClass(validClass({
      includeStretch: false,
      aiGenerated: true,
      exercises: [{ exerciseName: 'Row', stationIndex: 0, isCardioFinisher: true }],
    }))).not.toThrow();
  });
});

describe('#3 — PostgreSQL INTEGER bounds', () => {
  it('rejects an int4 overflow on a direct column', () => {
    rejects({ targetDuration: 3e9 });
    rejects({ rounds: 3e9 });
    rejects({ exerciseDurationSec: 3e9 });
    rejects({ exercises: [{ exerciseName: 'Row', stationIndex: 0, durationSec: 3e9 }] });
  });

  it('rejects the value whose +8 DERIVATIVE would overflow', () => {
    // maxParticipants = expectedParticipants + 8, so the cap must leave room.
    rejects({ expectedParticipants: 2147483647 });
    expect(() => validateGeneratedClass(validClass({ expectedParticipants: 2147483639 })))
      .not.toThrow();
  });

  it('rejects an out-of-range station sortOrder / stationNumber', () => {
    rejects({ stations: [{ stationName: 'Rack', sortOrder: 2147483648 }] });
    rejects({ stations: [{ stationName: 'Rack', stationNumber: 2147483648 }] });
  });

  it('rejects a negative rounds value', () => {
    rejects({ rounds: -3 });
  });
});

describe('#4 — allowlisted columns are inspected, not just copied', () => {
  it('rejects a fractional station setupTimeSec', () => {
    rejects({ stations: [{ stationName: 'Rack', setupTimeSec: 1.5 }] });
  });

  it('rejects a non-numeric stretchDurationMin', () => {
    rejects({ stretchDurationMin: 'abc' });
  });

  it('rejects an oversized stretch targetMuscles', () => {
    rejects({ stretches: [{ exerciseName: 'Calf', targetMuscles: 'x'.repeat(201) }] });
  });

  it('rejects an oversized exercise muscleTargets', () => {
    rejects({
      exercises: [{ exerciseName: 'Row', stationIndex: 0, muscleTargets: 'x'.repeat(201) }],
    });
  });

  it('rejects an int4 overflow on the overflow plan', () => {
    rejects({ overflowPlan: { triggerCount: 9007199254740991 } });
  });
});

describe('#7 — validation errors never echo client input', () => {
  it('does not reflect the duplicate occurrenceId back to the caller', () => {
    const secret = '<script>alert(1)</script>';
    let message = '';
    try {
      validateGeneratedClass(validClass({
        exercises: [
          { exerciseName: 'A', stationIndex: 0, occurrenceId: secret },
          { exerciseName: 'B', stationIndex: 0, occurrenceId: secret },
        ],
      }));
    } catch (error) {
      message = error.message;
    }
    expect(message).toMatch(/duplicate occurrence reference/);
    expect(message).not.toContain(secret);
    expect(message).not.toContain('script');
  });
});
