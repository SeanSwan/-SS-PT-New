/**
 * ============================================================================
 * FILE: bootcampTemplatePersistence.integration.test.mjs
 * PURPOSE: H02 — REAL PostgreSQL proof for the atomic Bootcamp template save.
 *
 * WHAT IS REAL HERE
 *   - a real PostgreSQL 17 server, real transactions, real constraints
 *   - the REAL BootcampTemplate / BootcampStation / BootcampExercise /
 *     BootcampStretch / BootcampOverflowPlan / User model definitions, imported
 *     from production source (their `sequelize` import is mocked to the
 *     isolated connection, which is the only supported way to rebind them)
 *
 * WHAT IS SYNTHETIC (and clearly identified)
 *   - the `users` table is the production User model in an isolated schema; no
 *     real user rows exist or are created beyond one synthetic trainer
 *   - the database itself is the owned disposable fixture, never production
 *
 * OWNED FIXTURE: 127.0.0.1:55089, database rolodex_s06_test, role
 * rolodex_s06_client, data_directory under this worktree. The test refuses to
 * run unless every one of those is verified at connect time.
 *
 * Deliberately NOT run by the default suite: `vitest.config.mjs` excludes
 * tests/integration/**. Run with vitest.integration.config.mjs.
 * ============================================================================
 */

import { Sequelize } from 'sequelize';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const DB = Object.freeze({
  host: '127.0.0.1',
  port: 55089,
  database: 'rolodex_s06_test',
  username: 'rolodex_s06_client',
  // The least-privilege client deliberately CANNOT read data_directory, so the
  // identity guard runs on the synthetic admin connection and the writes run on
  // the client connection.
  adminUsername: 'rolodex_s06_admin',
  expectedDataDirectorySuffix: 'rolodex-postgres-s06-20260913',
});

const isolated = new Sequelize(DB.database, DB.username, null, {
  host: DB.host,
  port: DB.port,
  dialect: 'postgres',
  logging: false,
  pool: { max: 2, min: 0, idle: 1000 },
});

/** Guard-only connection. Never used for a write. */
const adminIsolated = new Sequelize(DB.database, DB.adminUsername, null, {
  host: DB.host,
  port: DB.port,
  dialect: 'postgres',
  logging: false,
  pool: { max: 1, min: 0, idle: 1000 },
});

vi.mock('../../database.mjs', () => ({ default: isolated, Op: Sequelize.Op }));

const Template = (await import('../../models/BootcampTemplate.mjs')).default;
const Station = (await import('../../models/BootcampStation.mjs')).default;
const Exercise = (await import('../../models/BootcampExercise.mjs')).default;
const Stretch = (await import('../../models/BootcampStretch.mjs')).default;
const Overflow = (await import('../../models/BootcampOverflowPlan.mjs')).default;
const User = (await import('../../models/User.mjs')).default;

vi.mock('../../models/index.mjs', () => ({
  getBootcampTemplate: () => Template,
  getBootcampStation: () => Station,
  getBootcampExercise: () => Exercise,
  getBootcampOverflowPlan: () => Overflow,
  getBootcampStretch: () => Stretch,
  getBootcampSpaceProfile: () => null,
  getEquipmentProfile: () => null,
  getExercise: () => null,
}));

const { saveBootcampTemplate } = await import('../../services/bootcamp/bootcampTemplateSave.mjs');
const { BootcampTemplateValidationError } =
  await import('../../services/bootcamp/bootcampTemplateContract.mjs');

const SYNTHETIC_TRAINER_ID = 990001;

let identity = null;
let fixtureReachable = false;
let connectError = null;

const validClass = (over = {}) => ({
  name: `Synthetic Persistence ${Date.now()}`,
  classFormat: 'stations_4x',
  dayType: 'full_body',
  targetDuration: 45,
  expectedParticipants: 12,
  stations: [{ stationIndex: 0, stationName: 'Rack' }, { stationIndex: 1, stationName: 'Floor' }],
  exercises: [
    { exerciseName: 'Back Squat', stationIndex: 0, sortOrder: 0, durationSec: 45, restSec: 0, setupTimeSec: 0 },
    { exerciseName: 'Step Jacks', stationIndex: 1, sortOrder: 1, durationSec: 60, restSec: 30 },
    { exerciseName: 'Plank', stationIndex: null, sortOrder: 2, durationSec: 30 },
  ],
  ...over,
});

beforeAll(async () => {
  try {
    await isolated.authenticate();
    // data_directory is admin-only; ask the guard connection, not the client.
    const [rows] = await adminIsolated.query(
      "select current_setting('data_directory') as dd, current_database() as db, current_setting('port') as port",
    );
    const [clientRows] = await isolated.query(
      "select current_database() as db, current_user as usr, current_setting('port') as port",
    );
    identity = { ...rows[0], usr: clientRows[0].usr };
    fixtureReachable = true;
  } catch (error) {
    connectError = error;
    fixtureReachable = false;
    return;
  }

  // Positive identification BEFORE any write.
  expect(String(identity.port)).toBe(String(DB.port));
  expect(identity.db).toBe(DB.database);
  expect(identity.usr).toBe(DB.username);
  expect(String(identity.dd).replace(/\\/g, '/')).toContain(DB.expectedDataDirectorySuffix);

  // Scoped sync only: named models, no global sync({ force: true }).
  await User.sync();

  // ── MINIMAL SYNTHETIC SUPPORTING TABLES (clearly identified) ──────────────
  // The production Bootcamp models declare FKs onto tables owned by other
  // subsystems. Only the referenced KEY columns are created here, and only in
  // this disposable fixture. No production table definition is duplicated and
  // no row beyond the synthetic trainer is ever written to them.
  //   bootcamp_templates.equipmentProfileId  -> equipment_profiles(id)
  //   bootcamp_templates.spaceProfileId      -> bootcamp_space_profiles(id)
  //   bootcamp_exercises.exerciseLibraryId   -> "Exercises"(id)  [UUID]
  await isolated.query('create table if not exists equipment_profiles (id serial primary key, "trainerId" integer, "isActive" boolean default true)');
  await isolated.query('create table if not exists bootcamp_space_profiles (id serial primary key, "trainerId" integer)');
  await isolated.query('create table if not exists "Exercises" (id uuid primary key)');

  await Template.sync();
  await Station.sync();
  await Exercise.sync();
  await Stretch.sync();
  await Overflow.sync();

  // Hostile-review R2-5: a constraint at the DATABASE level that admission
  // cannot foresee. Now that value domains are validated BEFORE the first write,
  // this is what keeps the late-child-write rollback path provable. Added only
  // to this disposable fixture; no production table definition is touched.
  await isolated.query('alter table bootcamp_exercises drop constraint if exists s06_late_write_probe');
  await isolated.query('alter table bootcamp_exercises add constraint s06_late_write_probe check ("durationSec" <= 7200)');

  await User.findOrCreate({
    where: { id: SYNTHETIC_TRAINER_ID },
    defaults: {
      id: SYNTHETIC_TRAINER_ID,
      username: `synthetic-s06-${SYNTHETIC_TRAINER_ID}`,
      email: `synthetic-s06-${SYNTHETIC_TRAINER_ID}@example.invalid`,
      password: 'not-a-real-credential',
      firstName: 'Synthetic',
      lastName: 'Trainer',
      role: 'trainer',
    },
  });
}, 120000);

afterAll(async () => {
  if (adminIsolated) await adminIsolated.close().catch(() => undefined);
  if (isolated) await isolated.close().catch(() => undefined);
});

const countFor = async (templateId) => {
  const where = { templateId };
  return {
    stations: await Station.count({ where }),
    exercises: await Exercise.count({ where }),
    stretches: await Stretch.count({ where }),
    overflow: await Overflow.count({ where }),
  };
};

beforeEach(() => {
  if (!fixtureReachable) {
    throw new Error(
      `Owned PostgreSQL fixture is not reachable at ${DB.host}:${DB.port} — ${connectError?.message}. `
      + 'Start it (see s06-summary.md) before running integration tests.',
    );
  }
});

/**
 * H02 — PROVEN against real PostgreSQL (5/5, exit 0, s06-integration-run10.log).
 *
 * This suite is opt-in because it needs the owned disposable fixture running.
 * Run it with:
 *   $env:S06_INTEGRATION_READY='true'; vitest --config vitest.integration.config.mjs
 *
 * Four real defects were found ONLY by running against a real database and real
 * constraints — none of them were visible to the model-mocked tests:
 *   1. bootcamp_stations.stationNumber / .sortOrder are NOT NULL with no
 *      default and were missing from the station allowlist.
 *   2. bootcamp_stretches has NO stretchName/bodyPart/instructions/board columns;
 *      the real ones are exerciseName/targetMuscles/description/
 *      exerciseLibraryId, and exerciseName + sortOrder are NOT NULL.
 *   3. bootcamp_overflow_plans has NO bracket/capacity/alternatives columns; the
 *      real ones are triggerCount/strategy/lapExercises/lapDurationMin/notes,
 *      and triggerCount + strategy are NOT NULL.
 *   4. strategy is a Postgres ENUM — an arbitrary submitted string is rejected,
 *      so only a real enum member is accepted.
 *
 * Also fixed here: the identity guard must run on the synthetic ADMIN
 * connection, because the least-privilege client cannot read data_directory.
 */
describe.skipIf(process.env.S06_INTEGRATION_READY !== 'true')('H02 — real PostgreSQL persistence', () => {
  it('persists one atomic class and reloads it with the saved shape, order and zeros', async () => {
    const template = await saveBootcampTemplate(validClass({
      stretches: [{ exerciseName: 'Calf Stretch', durationSec: 0, sortOrder: 0 }],
      overflowPlan: { triggerCount: 4, strategy: 'lap_rotation' },
    }), SYNTHETIC_TRAINER_ID);

    expect(template.id).toBeGreaterThan(0);

    // Real row counts, read back from the database.
    await expect(countFor(template.id)).resolves.toEqual({
      stations: 2, exercises: 3, stretches: 1, overflow: 1,
    });

    // Explicit queries rather than eager loading: the models are imported
    // directly (so their `database.mjs` binding is isolated), which means the
    // association aliases from models/index.mjs are not registered here.
    const templateRow = await Template.findByPk(template.id);
    const stationRows = await Station.findAll({
      where: { templateId: template.id }, order: [['sortOrder', 'ASC']],
    });
    const exerciseRows = await Exercise.findAll({
      where: { templateId: template.id }, order: [['sortOrder', 'ASC']],
    });

    expect(templateRow.trainerId).toBe(SYNTHETIC_TRAINER_ID);

    // Full-group rows are the ones with stationId null; station rows carry the
    // station id created in this same transaction.
    const rootExercises = exerciseRows.filter(row => row.stationId === null);
    expect(rootExercises.map(row => row.exerciseName)).toEqual(['Plank']);
    expect(rootExercises[0].durationSec).toBe(30);

    expect(stationRows.map(station => station.stationName)).toEqual(['Rack', 'Floor']);
    const byStation = (stationId) =>
      exerciseRows.filter(row => row.stationId === stationId).map(row => row.exerciseName);
    expect(byStation(stationRows[0].id)).toEqual(['Back Squat']);
    expect(byStation(stationRows[1].id)).toEqual(['Step Jacks']);

    // Legitimate zeros survived the round trip.
    const squat = exerciseRows.find(row => row.exerciseName === 'Back Squat');
    expect(squat.restSec).toBe(0);
    expect(squat.setupTimeSec).toBe(0);

    // The stretch row landed on the REAL column names.
    const stretchRows = await Stretch.findAll({ where: { templateId: template.id } });
    expect(stretchRows.map(row => row.exerciseName)).toEqual(['Calf Stretch']);
    expect(stretchRows[0].durationSec).toBe(0);

    // The overflow plan landed on the REAL columns and enum member.
    const overflowRows = await Overflow.findAll({ where: { templateId: template.id } });
    expect(overflowRows[0].triggerCount).toBe(4);
    expect(overflowRows[0].strategy).toBe('lap_rotation');

    // The persisted-ID manifest round-trips and is never verified.
    const persistedIds = [
      ...exerciseRows.map(row => row.id),
      ...rootExercises.map(row => row.id),
    ];
    const uniquePersistedIds = [...new Set(persistedIds)].sort((a, b) => a - b);
    const manifestIds = templateRow.metadata.selectionManifestV1.entries
      .map(entry => entry.exerciseRowId).sort((a, b) => a - b);
    expect(manifestIds).toEqual(uniquePersistedIds);
    expect(templateRow.metadata.selectionManifestV1.entries.every(entry => entry.verified === false)).toBe(true);
  }, 60000);

  it('rolls the WHOLE class back when a LATE child write violates a real constraint', async () => {
    const before = await Template.count({ where: { trainerId: SYNTHETIC_TRAINER_ID } });

    // R2-5: admission validates value domains now, so a mid-write failure must
    // be driven by something admission CANNOT foresee. The `s06_late_write_probe`
    // CHECK (see beforeAll) caps durationSec at 7200, and 99999 passes every
    // admission check. The rejection therefore lands AFTER the template and its
    // stations have been written — which is exactly the property under test.
    await expect(saveBootcampTemplate(validClass({
      exercises: [
        { exerciseName: 'Good Row', stationIndex: 0, sortOrder: 0, durationSec: 30 },
        { exerciseName: 'Too Long', stationIndex: 1, sortOrder: 1, durationSec: 99999 },
      ],
    }), SYNTHETIC_TRAINER_ID)).rejects.toThrow();

    // The parent is gone...
    const after = await Template.count({ where: { trainerId: SYNTHETIC_TRAINER_ID } });
    expect(after).toBe(before);

    // ...the late-failing row never persisted...
    expect(await Exercise.count({ where: { exerciseName: 'Too Long' } })).toBe(0);

    // ...and no station was left orphaned by the rollback. (The previous
    // assertion here was `count >= 0`, which is a tautology and proved nothing.)
    const survivors = await Template.findAll({ where: { trainerId: SYNTHETIC_TRAINER_ID } });
    const orphans = await Station.count({
      where: { templateId: { [Sequelize.Op.notIn]: survivors.map((row) => row.id) } },
    });
    expect(orphans).toBe(0);
  }, 60000);

  it('leaves nothing behind when a caller-owned transaction rolls back', async () => {
    const before = await Template.count({ where: { trainerId: SYNTHETIC_TRAINER_ID } });

    await expect(isolated.transaction(async (transaction) => {
      await saveBootcampTemplate(validClass({ name: `Caller rollback ${Date.now()}` }), SYNTHETIC_TRAINER_ID, {
        transaction,
      });
      throw new Error('caller decided to roll back');
    })).rejects.toThrow('caller decided to roll back');

    expect(await Template.count({ where: { trainerId: SYNTHETIC_TRAINER_ID } })).toBe(before);
  }, 60000);

  it('commits a caller-owned transaction that succeeds', async () => {
    const created = await isolated.transaction(async (transaction) =>
      saveBootcampTemplate(validClass({ name: `Caller commit ${Date.now()}` }), SYNTHETIC_TRAINER_ID, { transaction }));

    expect(created.id).toBeGreaterThan(0);
    await expect(countFor(created.id)).resolves.toMatchObject({ stations: 2, exercises: 3 });
  }, 60000);

  it('persists nothing at all for an invalid payload', async () => {
    const before = await Template.count({ where: { trainerId: SYNTHETIC_TRAINER_ID } });
    await expect(saveBootcampTemplate(validClass({ stations: 'nope' }), SYNTHETIC_TRAINER_ID))
      .rejects.toBeInstanceOf(BootcampTemplateValidationError);
    expect(await Template.count({ where: { trainerId: SYNTHETIC_TRAINER_ID } })).toBe(before);
  }, 60000);
});
