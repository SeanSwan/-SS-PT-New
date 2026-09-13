/**
 * ============================================================================
 * FILE: bootcampTemplateContract.test.mjs
 * PURPOSE: H01 admission contract — what may enter the database, and what may
 *          never be trusted from a `/api/bootcamp/save` payload.
 *
 * Authority: s06-architecture.md §"Service / route contract". These are pure
 * tests: no database, no models, no transaction.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  BootcampTemplateAuthorityError,
  BootcampTemplateValidationError,
  buildExerciseRow,
  buildOverflowRow,
  buildSelectionManifestV1,
  buildStationRow,
  buildStretchRow,
  buildTemplateRow,
  createOccurrenceId,
  FORBIDDEN_CHILD_KEYS,
  normalizeOptionalProfileId,
  pickAllowlisted,
  requireTrainerId,
  validateGeneratedClass,
} from '../../services/bootcamp/bootcampTemplateContract.mjs';

const validClass = (over = {}) => ({
  name: 'Synthetic Lower Body',
  // A REAL BOOTCAMP_CLASS_FORMAT_VALUES member. This fixture previously read
  // 'standard', which is a classStyle value — the fixture itself encoded the
  // BE-F3 defect (admission never checked the value, so it reached the enum).
  classFormat: 'stations_4x',
  dayType: 'lower_body',
  targetDuration: 45,
  expectedParticipants: 12,
  aiGenerated: true,
  stations: [
    { stationIndex: 0, stationName: 'Rack', format: 'standard' },
    { stationIndex: 1, stationName: 'Floor', format: 'standard' },
  ],
  exercises: [
    { exerciseName: 'Back Squat', stationIndex: 0, sortOrder: 0, durationSec: 45, restSec: 0, setupTimeSec: 0 },
    { exerciseName: 'Air Bike', stationIndex: 1, sortOrder: 1, durationSec: 60, restSec: 30, isCardioFinisher: true },
    { exerciseName: 'Plank', stationIndex: null, sortOrder: 2, durationSec: 30 },
  ],
  ...over,
});

describe('requireTrainerId', () => {
  it('accepts a positive safe integer or a complete decimal string', () => {
    expect(requireTrainerId(7)).toBe(7);
    expect(requireTrainerId('7')).toBe(7);
    expect(requireTrainerId(' 42 ')).toBe(42);
  });

  it('rejects zero, negatives, prefixes, blanks and non-integers', () => {
    for (const bad of [0, -1, 1.5, '0', '-3', '12abc', '', '   ', 'abc', null, undefined, {}, []]) {
      expect(() => requireTrainerId(bad)).toThrow(BootcampTemplateValidationError);
    }
  });
});

describe('normalizeOptionalProfileId', () => {
  it('returns null for absent values instead of coercing to zero', () => {
    expect(normalizeOptionalProfileId(undefined)).toBeNull();
    expect(normalizeOptionalProfileId(null)).toBeNull();
  });

  it('accepts positive integers and complete decimal strings only', () => {
    expect(normalizeOptionalProfileId(3)).toBe(3);
    expect(normalizeOptionalProfileId('3')).toBe(3);
  });

  it('never parses a prefix and never turns blank into zero', () => {
    for (const bad of ['3abc', '0', '0.5', '', '   ', -1, 0, 2.5, {}, true]) {
      expect(() => normalizeOptionalProfileId(bad)).toThrow(BootcampTemplateValidationError);
    }
  });
});

describe('pickAllowlisted', () => {
  it('ignores unknown keys and every forbidden child key', () => {
    const picked = pickAllowlisted({
      stationName: 'Rack',
      id: 999,
      templateId: 999,
      trainerId: 999,
      stationId: 999,
      manifest: { entries: [{ exerciseRowId: 1, verified: true }] },
      arbitrary: true,
    }, ['stationName', 'id', 'templateId', 'trainerId', 'stationId', 'manifest']);

    expect(picked).toEqual({ stationName: 'Rack' });
    expect(picked).not.toHaveProperty('arbitrary');
    for (const key of FORBIDDEN_CHILD_KEYS) expect(picked).not.toHaveProperty(key);
  });
});

describe('validateGeneratedClass', () => {
  it('accepts a well-formed class and preserves legitimate zeros', () => {
    const result = validateGeneratedClass(validClass());
    expect(result.stations).toHaveLength(2);
    expect(result.exercises).toHaveLength(3);
  });

  it('rejects non-objects, bad array shapes and missing required fields', () => {
    expect(() => validateGeneratedClass(null)).toThrow(BootcampTemplateValidationError);
    expect(() => validateGeneratedClass(validClass({ stations: {} }))).toThrow(/stations must be an array/);
    expect(() => validateGeneratedClass(validClass({ exercises: 'nope' }))).toThrow(/exercises must be an array/);
    expect(() => validateGeneratedClass(validClass({ stretches: 5 }))).toThrow(/stretches must be an array/);
    expect(() => validateGeneratedClass(validClass({ overflowPlan: [] }))).toThrow(/overflowPlan must be an object/);
    expect(() => validateGeneratedClass(validClass({ name: '  ' }))).toThrow(/name is required/);
    expect(() => validateGeneratedClass(validClass({ classFormat: undefined }))).toThrow(/classFormat is required/);
    expect(() => validateGeneratedClass(validClass({ targetDuration: Number.NaN }))).toThrow(/finite/);
  });

  it('rejects an exercise that references a station which will not exist', () => {
    // The baseline indexed stationMap with this value and silently produced a
    // full-group row instead of failing.
    for (const badIndex of [5, -1, 1.5, '0']) {
      expect(() => validateGeneratedClass(validClass({
        exercises: [{ exerciseName: 'Ghost', stationIndex: badIndex, sortOrder: 0 }],
      }))).toThrow(/unknown stationIndex/);
    }
  });

  it('rejects duplicate station indexes and duplicate occurrence references', () => {
    expect(() => validateGeneratedClass(validClass({
      stations: [{ stationIndex: 0 }, { stationIndex: 0 }],
    }))).toThrow(/duplicate stationIndex/);

    expect(() => validateGeneratedClass(validClass({
      exercises: [
        { exerciseName: 'A', occurrenceId: 'occ-1' },
        { exerciseName: 'B', occurrenceId: 'occ-1' },
      ],
    }))).toThrow(/duplicate occurrence reference/);
  });

  it('rejects malformed station and exercise members and negative timing', () => {
    expect(() => validateGeneratedClass(validClass({ stations: [null] }))).toThrow(/must be an object/);
    expect(() => validateGeneratedClass(validClass({ exercises: [{ sortOrder: 0 }] }))).toThrow(/needs an exerciseName/);
    expect(() => validateGeneratedClass(validClass({ exercises: [{ exerciseName: 'X', durationSec: -5 }] })))
      .toThrow(/must not be negative/);
  });
});

describe('row builders use explicit allowlists', () => {
  it('ignores a submitted id/trainerId/templateId on every child row', () => {
    const poison = { id: 999, templateId: 999, trainerId: 999, stationId: 999, stationIndex: 0 };

    const station = buildStationRow({ ...poison, stationName: 'Rack' }, 11);
    expect(station).toMatchObject({ templateId: 11, stationName: 'Rack' });
    expect(station.id).toBeUndefined();
    expect(station.trainerId).toBeUndefined();

    expect(buildExerciseRow({ ...poison, exerciseName: 'Row' }, 11, new Map([[0, 77]])).id).toBeUndefined();
    expect(buildStretchRow({ ...poison, stretchName: 'Calf' }, 11).id).toBeUndefined();
    expect(buildOverflowRow({ ...poison, bracket: 'A' }, 11).id).toBeUndefined();
  });

  it('derives the exercise stationId from the NEW station records only', () => {
    const stationIdByIndex = new Map([[0, 77], [1, 88]]);

    expect(buildExerciseRow({ exerciseName: 'Rack Row', stationIndex: 0 }, 11, stationIdByIndex).stationId).toBe(77);
    expect(buildExerciseRow({ exerciseName: 'Floor Row', stationIndex: 1 }, 11, stationIdByIndex).stationId).toBe(88);
    // null stationIndex is the explicit full-group row.
    expect(buildExerciseRow({ exerciseName: 'Plank', stationIndex: null }, 11, stationIdByIndex).stationId).toBeNull();
    // A submitted stationId is never consulted.
    expect(buildExerciseRow({ exerciseName: 'X', stationIndex: 0, stationId: 999 }, 11, stationIdByIndex).stationId).toBe(77);
  });

  it('keeps legitimate zeros instead of defaulting them away', () => {
    const row = buildExerciseRow(
      { exerciseName: 'Hold', stationIndex: null, durationSec: 0, restSec: 0, setupTimeSec: 0, sortOrder: 0 },
      11,
      new Map(),
    );
    expect(row.durationSec).toBe(0);
    expect(row.restSec).toBe(0);
    expect(row.setupTimeSec).toBe(0);
    expect(row.sortOrder).toBe(0);
  });

  it('always takes trainerId from the server, never from the payload', () => {
    const row = buildTemplateRow(validClass({ trainerId: 999, explanations: { x: 1 } }), 7);
    expect(row.trainerId).toBe(7);
    expect(row.metadata).toEqual({ explanations: { x: 1 }, relaxationSummary: null });
  });

  it('carries the work-interval progression into the saved template manifest', () => {
    // R-H20 / contract §6 line 266: provenance must reach the TEMPLATE, not only the
    // Sprint slot. `metadata` is rebuilt from a literal here and is excluded from the
    // allowlist pick, so `progression` used to be dropped on save.
    const progression = { policyVersion: 'progressionPolicyV1', mode: 'scheduled_work_duration', applied: true, baseWorkSec: 35, appliedWorkSec: 25, reason: 'scheduled_work_duration' };
    const row = buildTemplateRow(validClass({ progression }), 7);
    expect(row.metadata.progression).toEqual(progression);
    expect(row.metadata.relaxationSummary).toBeNull(); // pre-existing keys untouched
  });

  it('omits the key entirely when there is no progression, so the shape is unchanged', () => {
    // Every class generated outside the Sprint path has no modifier, and adding a
    // `progression: null` key to all of them would be a silent storage change.
    const row = buildTemplateRow(validClass({}), 7);
    expect('progression' in row.metadata).toBe(false);
    expect(row.metadata).toEqual({ explanations: null, relaxationSummary: null });
  });

  // ── Real-schema mappings found ONLY by the PostgreSQL run ────────────────
  // These lock the real column names so a refactor cannot silently drop them
  // back to the invented ones that a real INSERT rejected.

  it('maps the station ordinal onto the NOT NULL stationNumber and sortOrder', () => {
    const row = buildStationRow({ stationIndex: 3, stationName: 'Rack' }, 11);
    expect(row.stationNumber).toBe(3);
    expect(row.sortOrder).toBe(3);
    // An explicit value always wins over the derived one.
    expect(buildStationRow({ stationIndex: 3, stationNumber: 9, sortOrder: 7 }, 11))
      .toMatchObject({ stationNumber: 9, sortOrder: 7 });
  });

  it('writes the REAL bootcamp_stretches columns, not invented ones', () => {
    const row = buildStretchRow({ stretchName: 'Calf Stretch' }, 11, 2);
    expect(row.exerciseName).toBe('Calf Stretch');
    expect(row.sortOrder).toBe(2);
    expect(row.durationSec).toBe(30);
    for (const invented of ['stretchName', 'bodyPart', 'instructions', 'board']) {
      expect(row).not.toHaveProperty(invented);
    }
    // The real generator spelling is preferred when present.
    expect(buildStretchRow({ exerciseName: 'Hip Opener' }, 11, 0).exerciseName).toBe('Hip Opener');
  });

  it('writes the REAL bootcamp_overflow_plans columns and a valid strategy enum member', () => {
    const row = buildOverflowRow({ triggerCount: 4, strategy: 'split_groups' }, 11);
    expect(row.triggerCount).toBe(4);
    expect(row.strategy).toBe('split_groups');
    for (const invented of ['bracket', 'capacity', 'alternatives']) {
      expect(row).not.toHaveProperty(invented);
    }
    // An arbitrary string would be rejected by the Postgres enum.
    expect(buildOverflowRow({ strategy: 'A' }, 11).strategy).toBe('lap_rotation');
    expect(buildOverflowRow({ triggerCount: 2 }, 11).triggerCount).toBe(2);
    expect(buildOverflowRow({}, 11).triggerCount).toBe(0);
  });
});

describe('buildSelectionManifestV1', () => {
  it('is keyed only by persisted exercise row ids and never claims verification', () => {
    const manifest = buildSelectionManifestV1([
      { id: 501, occurrenceId: 'occ-a', exerciseName: 'Squat', stationId: 77 },
      { id: 502, occurrenceId: 'occ-b', exerciseName: 'Plank', stationId: null },
    ]);

    expect(manifest.version).toBe(1);
    expect(manifest.entries.map(entry => entry.exerciseRowId)).toEqual([501, 502]);
    expect(manifest.entries.every(entry => entry.verified === false)).toBe(true);
  });

  it('treats a caller-supplied manifest as non-authoritative', () => {
    // The builder only ever reads persisted rows; the payload's own manifest
    // cannot reach it, which is the point.
    const manifest = buildSelectionManifestV1([
      { id: 1, occurrenceId: 'occ', exerciseName: 'A', stationId: null, verified: true },
    ]);
    expect(manifest.entries[0].verified).toBe(false);
  });
});

describe('identity and error types', () => {
  it('generates a fresh server-side occurrence id each time', () => {
    const a = createOccurrenceId();
    const b = createOccurrenceId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('carries route-mappable statuses and non-disclosing authority text', () => {
    const invalid = new BootcampTemplateValidationError('nope');
    expect(invalid.status).toBe(400);
    expect(invalid.code).toBe('BOOTCAMP_TEMPLATE_INVALID');

    const denied = new BootcampTemplateAuthorityError();
    expect(denied.status).toBe(403);
    // Non-disclosing: it must not reveal whether the profile exists.
    expect(denied.message).not.toMatch(/exist|owner|another|not found|belongs/i);
  });
});
