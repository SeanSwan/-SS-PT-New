import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataTypes, Sequelize } from '../../../backend/node_modules/sequelize/lib/index.js';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const AUDIT_DATABASE_URL = 'postgres://rolodex_audit@127.0.0.1:55479/rolodex_repair_test';
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE_ROOT = path.resolve(TEST_DIR, '../../../');
const EXPECTED_DATA_DIRECTORY = path.resolve(WORKTREE_ROOT, 'tmp/rolodex-postgres-20260913');
const SCHEMA = `rolodex_red_${process.pid}_${Date.now().toString(36)}`;

const databaseState = vi.hoisted(() => ({ current: null }));
const models = vi.hoisted(() => ({
  template: null,
  station: null,
  exercise: null,
  overflow: null,
  stretch: null,
  libraryExercise: null,
}));
const logger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));

// These mocks are installed before bootcampCrud is imported. The production
// helper receives real Sequelize models below, while database.mjs (which loads
// dotenv) is never imported by this fixture.
vi.mock('../../../backend/database.mjs', () => ({
  default: {
    transaction: (...args) => databaseState.current.transaction(...args),
  },
}));
vi.mock('../../../backend/utils/logger.mjs', () => ({ default: logger }));
vi.mock('../../../backend/models/index.mjs', () => ({
  getBootcampTemplate: () => models.template,
  getBootcampStation: () => models.station,
  getBootcampExercise: () => models.exercise,
  getBootcampOverflowPlan: () => models.overflow,
  getBootcampStretch: () => models.stretch,
  getExercise: () => models.libraryExercise,
  getBootcampClassLog: () => ({}),
  getBootcampSpaceProfile: () => ({}),
  getExerciseTrend: () => ({}),
}));

let sequelize;
let Template;
let Station;
let Exercise;
let Overflow;
let Stretch;
let saveBootcampTemplate;
let getTemplates;
let schemaCreated = false;

function comparable(value) {
  return path.normalize(String(value)).replaceAll('\\', '/').toLowerCase();
}

function table(name) {
  return `"${SCHEMA}"."${name}"`;
}

function fixture(name, overrides = {}) {
  return {
    name,
    classFormat: 'full_group',
    dayType: 'full_body',
    targetDuration: 45,
    expectedParticipants: 12,
    aiGenerated: false,
    equipmentProfileId: 17,
    spaceProfileId: 27,
    explanations: { fixture: 'postgres-red' },
    relaxationSummary: 'fixture summary',
    stations: [],
    exercises: [{
      stationIndex: null,
      exerciseName: 'PG Full Group Movement',
      sourceExerciseName: 'PG Source Movement',
      exerciseLibraryId: null,
      durationSec: 0,
      restSec: 0,
      sortOrder: 7,
      board: 'alternative',
      selectionReason: 'requested_region_mod',
      selectionChips: ['knee'],
      selectionRung: 'same_region',
      painCaution: 'review form',
      painSwap: 'Wall Sit',
      canonicalExerciseKey: 'pg-full-group-movement',
      detailsVerified: true,
    }],
    stretches: [],
    overflowPlan: null,
    ...overrides,
  };
}

async function clearFixtureTables() {
  await sequelize.query(`TRUNCATE TABLE ${[
    table('audit_stretches'),
    table('audit_overflow'),
    table('audit_exercises'),
    table('audit_stations'),
    table('audit_templates'),
  ].join(', ')} CASCADE`);
}

beforeAll(async () => {
  const parsed = new URL(AUDIT_DATABASE_URL);
  if (
    parsed.protocol !== 'postgres:'
    || parsed.hostname !== '127.0.0.1'
    || parsed.port !== '55479'
    || parsed.username !== 'rolodex_audit'
    || parsed.pathname !== '/rolodex_repair_test'
  ) {
    throw new Error('Refusing PostgreSQL RED fixture: audit URL guard mismatch');
  }

  sequelize = new Sequelize(AUDIT_DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: { min: 0, max: 2 },
  });
  databaseState.current = sequelize;
  await sequelize.authenticate();

  const [guard] = await sequelize.query(`
    SELECT current_database() AS database_name,
      current_user AS user_name,
      inet_server_port() AS server_port,
      current_setting('data_directory') AS data_directory
  `);
  const identity = guard[0];
  if (
    identity.database_name !== 'rolodex_repair_test'
    || identity.user_name !== 'rolodex_audit'
    || String(identity.server_port) !== '55479'
    || comparable(identity.data_directory) !== comparable(EXPECTED_DATA_DIRECTORY)
  ) {
    throw new Error(`Refusing PostgreSQL RED fixture: server guard mismatch ${JSON.stringify(identity)}`);
  }

  await sequelize.query(`CREATE SCHEMA "${SCHEMA}"`);
  schemaCreated = true;

  Template = sequelize.define('AuditBootcampTemplate', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    trainerId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    classFormat: { type: DataTypes.STRING, allowNull: false },
    dayType: { type: DataTypes.STRING },
    targetDurationMin: { type: DataTypes.INTEGER },
    maxParticipants: { type: DataTypes.INTEGER },
    optimalParticipants: { type: DataTypes.INTEGER },
    aiGenerated: { type: DataTypes.BOOLEAN },
    classStyle: { type: DataTypes.STRING },
    intensityCategory: { type: DataTypes.STRING },
    rounds: { type: DataTypes.INTEGER },
    exerciseDurationSec: { type: DataTypes.INTEGER },
    includeStretch: { type: DataTypes.BOOLEAN },
    stretchDurationMin: { type: DataTypes.INTEGER },
    equipmentProfileId: { type: DataTypes.INTEGER },
    spaceProfileId: { type: DataTypes.INTEGER },
    metadata: { type: DataTypes.JSONB },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'audit_templates', schema: SCHEMA });

  Station = sequelize.define('AuditBootcampStation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    templateId: { type: DataTypes.INTEGER, allowNull: false },
    stationIndex: { type: DataTypes.INTEGER },
    name: { type: DataTypes.STRING },
    sortOrder: { type: DataTypes.INTEGER },
  }, { tableName: 'audit_stations', schema: SCHEMA, timestamps: false });

  Exercise = sequelize.define('AuditBootcampExercise', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    templateId: { type: DataTypes.INTEGER, allowNull: false },
    stationId: { type: DataTypes.INTEGER },
    exerciseName: { type: DataTypes.STRING, allowNull: false },
    sourceExerciseName: { type: DataTypes.STRING },
    durationSec: { type: DataTypes.INTEGER },
    restSec: { type: DataTypes.INTEGER },
    sortOrder: { type: DataTypes.INTEGER },
    isCardioFinisher: { type: DataTypes.BOOLEAN },
    muscleTargets: { type: DataTypes.TEXT },
    easyVariation: { type: DataTypes.STRING },
    mediumVariation: { type: DataTypes.STRING },
    hardVariation: { type: DataTypes.STRING },
    kneeMod: { type: DataTypes.STRING },
    shoulderMod: { type: DataTypes.STRING },
    ankleMod: { type: DataTypes.STRING },
    wristMod: { type: DataTypes.STRING },
    elbowMod: { type: DataTypes.STRING },
    footMod: { type: DataTypes.STRING },
    hipMod: { type: DataTypes.STRING },
    backMod: { type: DataTypes.STRING },
    equipmentRequired: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    instructions: { type: DataTypes.TEXT },
    videoUrl: { type: DataTypes.STRING },
    previewVideoUrl: { type: DataTypes.STRING },
    imageUrl: { type: DataTypes.STRING },
    thumbnailUrl: { type: DataTypes.STRING },
    board: { type: DataTypes.STRING },
    setupTimeSec: { type: DataTypes.INTEGER },
    pyramidStartWeight: { type: DataTypes.STRING },
    pyramidDrops: { type: DataTypes.INTEGER },
    supersetOrder: { type: DataTypes.INTEGER },
    supersetGroupId: { type: DataTypes.INTEGER },
    exerciseLibraryId: { type: DataTypes.UUID },
  }, { tableName: 'audit_exercises', schema: SCHEMA, timestamps: false });

  Overflow = sequelize.define('AuditBootcampOverflow', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    templateId: { type: DataTypes.INTEGER, allowNull: false },
    exerciseName: { type: DataTypes.STRING },
    durationSec: { type: DataTypes.INTEGER },
    board: { type: DataTypes.STRING },
  }, { tableName: 'audit_overflow', schema: SCHEMA, timestamps: false });

  Stretch = sequelize.define('AuditBootcampStretch', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    templateId: { type: DataTypes.INTEGER, allowNull: false },
    stretchName: { type: DataTypes.STRING },
    durationSec: { type: DataTypes.INTEGER },
    sortOrder: { type: DataTypes.INTEGER },
  }, { tableName: 'audit_stretches', schema: SCHEMA, timestamps: false });

  Template.hasMany(Station, { as: 'stations', foreignKey: 'templateId' });
  Template.hasMany(Exercise, { as: 'exercises', foreignKey: 'templateId' });
  Template.hasMany(Overflow, { as: 'overflowPlans', foreignKey: 'templateId' });
  Template.hasMany(Stretch, { as: 'stretches', foreignKey: 'templateId' });
  Station.hasMany(Exercise, { as: 'exercises', foreignKey: 'stationId' });

  await sequelize.sync();
  await sequelize.query(`ALTER TABLE ${table('audit_stations')} ADD CONSTRAINT audit_stations_template_fk FOREIGN KEY ("templateId") REFERENCES ${table('audit_templates')} ("id")`);
  await sequelize.query(`ALTER TABLE ${table('audit_exercises')} ADD CONSTRAINT audit_exercises_template_fk FOREIGN KEY ("templateId") REFERENCES ${table('audit_templates')} ("id")`);
  await sequelize.query(`ALTER TABLE ${table('audit_exercises')} ADD CONSTRAINT audit_exercises_station_fk FOREIGN KEY ("stationId") REFERENCES ${table('audit_stations')} ("id")`);
  await sequelize.query(`ALTER TABLE ${table('audit_overflow')} ADD CONSTRAINT audit_overflow_template_fk FOREIGN KEY ("templateId") REFERENCES ${table('audit_templates')} ("id")`);
  await sequelize.query(`ALTER TABLE ${table('audit_stretches')} ADD CONSTRAINT audit_stretches_template_fk FOREIGN KEY ("templateId") REFERENCES ${table('audit_templates')} ("id")`);

  models.template = Template;
  models.station = Station;
  models.exercise = Exercise;
  models.overflow = Overflow;
  models.stretch = Stretch;
  models.libraryExercise = { findAll: vi.fn().mockResolvedValue([]) };
  ({ saveBootcampTemplate, getTemplates } = await import('../../../backend/services/bootcamp/bootcampCrud.mjs'));
});

beforeEach(async () => {
  await clearFixtureTables();
});

afterAll(async () => {
  if (!sequelize) return;
  if (schemaCreated) {
    await sequelize.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
  }
  await sequelize.close();
});

describe('server RED: guarded PostgreSQL H01/H02 fixture', () => {
  it('persists real full-group rows but currently loses root/profile/provenance round-trip data', async () => {
    const saved = await saveBootcampTemplate(fixture('pg-roundtrip'), 41);
    const persistedExercise = await Exercise.findOne({ where: { templateId: saved.id } });
    const loaded = await getTemplates(41, { classFormat: 'full_group' });
    const loadedTemplate = loaded.find((row) => row.id === saved.id);

    expect(persistedExercise).toBeTruthy();
    expect(persistedExercise.restSec).toBe(0);
    expect(persistedExercise.sortOrder).toBe(7);
    expect(persistedExercise.board).toBe('alternative');
    expect(loadedTemplate).toBeTruthy();
    expect(loadedTemplate.equipmentProfileId).toBe(17);
    expect(loadedTemplate.spaceProfileId).toBe(27);
    expect(loadedTemplate.metadata?.selectionManifestV1).toEqual(expect.objectContaining({ version: 1 }));
    expect(Array.isArray(loadedTemplate.exercises) ? loadedTemplate.exercises.length : 0).toBe(1);
  });

  it('does not let a submitted foreign key redirect persistence', async () => {
    const malicious = fixture('pg-fk-injection', {
      stations: [{ templateId: 999999, stationIndex: 0, name: 'Injected station', sortOrder: 0 }],
      exercises: [{
        stationIndex: 0,
        exerciseName: 'Station movement',
        durationSec: 35,
        restSec: 0,
        sortOrder: 0,
        board: 'main',
      }],
    });
    let thrown;
    let saved;
    try {
      saved = await saveBootcampTemplate(malicious, 41);
    } catch (error) {
      thrown = error;
    }

    if (thrown) {
      expect(await Template.count({ where: { name: 'pg-fk-injection' } })).toBe(0);
      expect(await Station.count()).toBe(0);
    } else {
      expect(saved).toBeTruthy();
      const persistedStation = await Station.findOne({ where: { templateId: saved.id } });
      expect(persistedStation).toBeTruthy();
      expect(persistedStation.templateId).toBe(saved.id);
    }
  });

  it('rolls back real parent and station rows after injected late child failure', async () => {
    const failure = fixture('pg-late-child-failure', {
      stations: [{ stationIndex: 0, name: 'Station before failure', sortOrder: 0 }],
      exercises: [{
        stationIndex: 0,
        exerciseName: 'Late failure movement',
        durationSec: 35,
        restSec: 0,
        sortOrder: 0,
        board: 'main',
      }],
    });
    const bulkCreate = vi.spyOn(Exercise, 'bulkCreate').mockRejectedValueOnce(new Error('synthetic PG child failure'));
    try {
      await expect(saveBootcampTemplate(failure, 41)).rejects.toThrow('synthetic PG child failure');
    } finally {
      bulkCreate.mockRestore();
    }

    expect(await Template.count({ where: { name: 'pg-late-child-failure' } })).toBe(0);
    expect(await Station.count()).toBe(0);
    expect(await Exercise.count()).toBe(0);
  });
});
