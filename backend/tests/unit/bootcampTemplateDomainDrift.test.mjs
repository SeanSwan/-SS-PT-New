/**
 * ============================================================================
 * FILE: bootcampTemplateDomainDrift.test.mjs — S06 / R-H01.
 *
 * PURPOSE: the rule-29 schema cross-check, as an executable lock.
 *
 * Hostile-review finding BE-F3 was that admission validated SHAPE but not
 * VALUE, so the value domains lived only in a reviewer's head. Finding BE-F3b
 * was worse: the station allowlist named eight columns that do not exist on
 * `bootcamp_stations` and missed the one real column carrying equipment.
 *
 * This test reads the REAL Sequelize models and asserts that every table and
 * every width in bootcampTemplateRules.mjs/bootcampTemplateFields.mjs still
 * matches them. A model edit that is not mirrored in the contract now fails
 * here, instead of reaching PostgreSQL and surfacing as a 500.
 * ============================================================================
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  getBootcampExercise,
  getBootcampOverflowPlan,
  getBootcampStation,
  getBootcampStretch,
  getBootcampTemplate,
  initializeModelsCache,
} from '../../models/index.mjs';
import {
  BOARDS,
  CLASS_FORMATS,
  CLASS_STYLES,
  DAY_TYPES,
  INTENSITY_CATEGORIES,
  MAX_LENGTHS,
  OVERFLOW_STRATEGIES,
} from '../../services/bootcamp/bootcampTemplateRules.mjs';
import {
  EXERCISE_FIELDS,
  OVERFLOW_PLAN_FIELDS,
  STATION_FIELDS,
  STRETCH_FIELDS,
  TEMPLATE_FIELDS,
} from '../../services/bootcamp/bootcampTemplateFields.mjs';

const TIMESTAMPS = ['id', 'createdAt', 'updatedAt'];

/** Sequelize exposes an ENUM's members on `.values` (or `.type.values`). */
const enumValuesOf = (model, column) => {
  const attr = model.rawAttributes[column];
  if (!attr) throw new Error(`${model.name}.${column} does not exist`);
  return attr.values ?? attr.type?.values ?? null;
};

/** `DataTypes.STRING(100)` stringifies to `VARCHAR(100)`. */
const lengthOf = (model, column) => {
  const attr = model.rawAttributes[column];
  if (!attr) throw new Error(`${model.name}.${column} does not exist`);
  const match = String(attr.type).match(/\((\d+)\)/);
  return match ? Number(match[1]) : null;
};

/** Every writable column: the model's own attributes minus id/timestamps. */
const writableColumns = (model) =>
  Object.keys(model.rawAttributes).filter((key) => !TIMESTAMPS.includes(key));

/**
 * The model getters resolve from the startup cache, so it must be populated
 * before any assertion reads `rawAttributes`. Same pattern as
 * tests/api/destructiveOwnershipMatrix.test.mjs.
 */
beforeAll(async () => {
  await initializeModelsCache();
});

describe('value domains match the real models', () => {
  it('enum tables are exactly the model enum members', () => {
    const Template = getBootcampTemplate();
    const Exercise = getBootcampExercise();
    const Overflow = getBootcampOverflowPlan();

    expect([...CLASS_FORMATS]).toEqual(enumValuesOf(Template, 'classFormat'));
    expect([...CLASS_STYLES]).toEqual(enumValuesOf(Template, 'classStyle'));
    expect([...DAY_TYPES]).toEqual(enumValuesOf(Template, 'dayType'));
    expect([...INTENSITY_CATEGORIES]).toEqual(enumValuesOf(Template, 'intensityCategory'));
    expect([...BOARDS]).toEqual(enumValuesOf(Exercise, 'board'));
    expect([...OVERFLOW_STRATEGIES]).toEqual(enumValuesOf(Overflow, 'strategy'));
  });

  it('length caps are exactly the model declared widths', () => {
    const Template = getBootcampTemplate();
    const Station = getBootcampStation();
    const Exercise = getBootcampExercise();
    const Stretch = getBootcampStretch();

    expect(MAX_LENGTHS.templateName).toBe(lengthOf(Template, 'name'));
    expect(MAX_LENGTHS.stationName).toBe(lengthOf(Station, 'stationName'));
    expect(MAX_LENGTHS.exerciseName).toBe(lengthOf(Exercise, 'exerciseName'));
    expect(MAX_LENGTHS.variation).toBe(lengthOf(Exercise, 'easyVariation'));
    expect(MAX_LENGTHS.url).toBe(lengthOf(Exercise, 'videoUrl'));
    expect(MAX_LENGTHS.pyramidStartWeight).toBe(lengthOf(Exercise, 'pyramidStartWeight'));
    expect(MAX_LENGTHS.stretchName).toBe(lengthOf(Stretch, 'exerciseName'));
    expect(MAX_LENGTHS.targetMuscles).toBe(lengthOf(Stretch, 'targetMuscles'));
  });
});

describe('write allowlists match the real columns', () => {
  const cases = [
    ['TEMPLATE_FIELDS', TEMPLATE_FIELDS, getBootcampTemplate],
    ['STATION_FIELDS', STATION_FIELDS, getBootcampStation],
    ['EXERCISE_FIELDS', EXERCISE_FIELDS, getBootcampExercise],
    ['STRETCH_FIELDS', STRETCH_FIELDS, getBootcampStretch],
    ['OVERFLOW_PLAN_FIELDS', OVERFLOW_PLAN_FIELDS, getBootcampOverflowPlan],
  ];

  it.each(cases)('%s names only real columns', (_name, fields, getModel) => {
    const real = writableColumns(getModel());
    const invented = fields.filter((field) => !real.includes(field));
    expect(invented).toEqual([]);
  });

  it('STATION_FIELDS carries the real equipmentNeeded column', () => {
    // The regression: the old list had eight invented names and no
    // equipmentNeeded, so every station's equipment was silently discarded.
    expect(STATION_FIELDS).toContain('equipmentNeeded');
    for (const invented of ['stationIndex', 'stationType', 'format', 'durationMin', 'rounds', 'equipmentRequired', 'spaceProfileId', 'board']) {
      expect(STATION_FIELDS).not.toContain(invented);
    }
  });

  it('records that occurrenceId is manifest-only and NOT a column', () => {
    // `save.mjs` passes occurrenceId to Exercise.bulkCreate and the manifest
    // keys entries by it, but no model and no migration declares the column, so
    // PostgreSQL never receives it. This asserts the CURRENT truth so that
    // adding the column later forces a conscious decision to re-allowlist it
    // (and to make the manifest's identity genuinely durable).
    expect(writableColumns(getBootcampExercise())).not.toContain('occurrenceId');
    expect(EXERCISE_FIELDS).not.toContain('occurrenceId');
  });

  it('every column a single cap is applied to shares that one width (R2-10)', () => {
    // The caps above were each pinned against ONE representative column while
    // the contract applies them to sixteen, so a divergence on any of the other
    // twelve would have gone unnoticed.
    const Exercise = getBootcampExercise();
    const VARIATION_COLUMNS = [
      'easyVariation', 'mediumVariation', 'hardVariation', 'kneeMod', 'shoulderMod',
      'ankleMod', 'wristMod', 'elbowMod', 'footMod', 'hipMod', 'backMod',
      'equipmentRequired',
    ];
    for (const column of VARIATION_COLUMNS) {
      expect(lengthOf(Exercise, column)).toBe(MAX_LENGTHS.variation);
    }
    for (const column of ['videoUrl', 'previewVideoUrl', 'imageUrl', 'thumbnailUrl']) {
      expect(lengthOf(Exercise, column)).toBe(MAX_LENGTHS.url);
    }
    expect(lengthOf(Exercise, 'sourceExerciseName')).toBe(MAX_LENGTHS.exerciseName);

    // muscleTargets is TEXT, so its cap is a POLICY limit (an unbounded client
    // blob through a JSON body), not a column width. Asserted as such rather
    // than pretending it mirrors the column.
    expect(lengthOf(Exercise, 'muscleTargets')).toBeNull();
  });

  it('every real station column except the generated pair is writable', () => {
    // stationNumber/sortOrder are derived from stationIndex at build time, so
    // they are allowlisted; nothing else may be silently unreachable.
    const real = writableColumns(getBootcampStation());
    const unreachable = real.filter((column) => !STATION_FIELDS.includes(column));
    expect(unreachable).toEqual([]);
  });
});
