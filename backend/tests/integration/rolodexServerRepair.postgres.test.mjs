/**
 * ============================================================================
 * FILE: rolodexServerRepair.postgres.test.mjs — H29 / R-H04.
 *
 * PURPOSE: the REAL-PostgreSQL proof contract §5 line 306 requires for the taught-log
 *   operation identity: "Prove row locks with two connections, … unique taught-log race,
 *   … additive migration up/down/up and preexisting-null-row compatibility. … Schema
 *   inspection must prove the unique index actually exists in that fixture. These tests
 *   are NOT RUN here."
 *
 * WHAT IS REAL HERE
 *   - a real PostgreSQL 17 server, real transactions, real unique constraints
 *   - the REAL `logBootcampClass` service and the REAL `BootcampClassLog` model, with
 *     their `database.mjs` import rebound to the isolated connection
 *
 * WHAT IS SYNTHETIC
 *   - one synthetic trainer id; the database itself is the owned disposable fixture
 *
 * OWNED FIXTURE: 127.0.0.1:55089, database rolodex_s06_test, roles rolodex_s06_client /
 * rolodex_s06_admin, data_directory under this worktree. The suite REFUSES to run unless
 * the identity is positively verified at connect time.
 *
 * Deliberately NOT in the default suite: `vitest.config.mjs` excludes
 * tests/integration/**. Run with:
 *   $env:S06_INTEGRATION_READY='true'; vitest --config vitest.integration.config.mjs
 * ============================================================================
 */

import { Sequelize } from 'sequelize';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const DB = Object.freeze({
  host: '127.0.0.1',
  port: 55089,
  database: 'rolodex_s06_test',
  username: 'rolodex_s06_client',
  adminUsername: 'rolodex_s06_admin',
  expectedDataDirectorySuffix: 'rolodex-postgres-s06-20260913',
});

const isolated = new Sequelize(DB.database, DB.username, null, {
  host: DB.host, port: DB.port, dialect: 'postgres', logging: false,
  pool: { max: 4, min: 0, idle: 1000 },
});

/** Guard-only connection. Never used for a write. */
const adminIsolated = new Sequelize(DB.database, DB.adminUsername, null, {
  host: DB.host, port: DB.port, dialect: 'postgres', logging: false,
  pool: { max: 1, min: 0, idle: 1000 },
});

vi.mock('../../database.mjs', () => ({ default: isolated, Op: Sequelize.Op }));

const ClassLog = (await import('../../models/BootcampClassLog.mjs')).default;

vi.mock('../../models/index.mjs', () => ({
  getBootcampClassLog: () => ClassLog,
  // These writes carry no templateId, so the template lookup is never reached.
  getBootcampTemplate: () => null,
  // The H29b confirmation block's models. Each getter is an ARROW so the binding is read when
  // the service CALLS it, not when this factory runs — the consts below are initialized after
  // the first import that reaches this mock, which is exactly why a second `vi.mock` for this
  // path did not work: vitest hoists it, and one module gets ONE mock.
  getBootcampSprint: () => BootcampSprint,
  getSprintWeek: () => SprintWeekModel,
  getSprintClassSlot: () => SprintClassSlotModel,
  getSprintExerciseMemory: () => ({ findAll: async () => [], destroy: async () => 0 }),
  getBootcampSpaceProfile: () => null,
}));

const { logBootcampClass } = await import('../../services/bootcamp/bootcampCrud.mjs');
const migration = (await import('../../migrations/20260913000001-add-bootcamp-class-log-operation-key.cjs')).default;

const TABLE = 'bootcamp_class_log';
const UNIQUE_INDEX = 'uniq_bootcamp_log_trainer_operation_key';
const SYNTHETIC_TRAINER_ID = 990001;

let identity = null;
let fixtureReachable = false;
let connectError = null;

/** A minimal valid class-log row for the synthetic trainer. */
const logRow = (over = {}) => ({
  trainerId: SYNTHETIC_TRAINER_ID,
  classDate: '2026-08-03',
  dayType: 'full_body',
  exercisesUsed: [{ exerciseName: 'Goblet Squat', durationSec: 40 }],
  ...over,
});

const countRows = async (where) => ClassLog.count({ where });

beforeAll(async () => {
  try {
    await isolated.authenticate();
    // data_directory is admin-only; ask the guard connection, not the client.
    const [rows] = await adminIsolated.query(
      "select current_setting('data_directory') as dd, current_database() as db, current_setting('port') as port",
    );
    const [clientRows] = await isolated.query(
      'select current_database() as db, current_user as usr, current_setting(\'port\') as port',
    );
    identity = { ...rows[0], usr: clientRows[0].usr };
    fixtureReachable = true;
  } catch (error) {
    connectError = error;
    fixtureReachable = false;
    return;
  }

  const dd = String(identity.dd ?? '');
  const port = String(identity.port ?? '');
  const db = String(identity.db ?? '');
  const good = dd.endsWith(DB.expectedDataDirectorySuffix)
    && port === String(DB.port)
    && db === DB.database;
  if (!good) {
    throw new Error(
      `refusing to run: fixture identity mismatch (db=${db} port=${port} dd=${dd})`,
    );
  }
}, 60000);

afterAll(async () => {
  if (fixtureReachable) {
    await ClassLog.destroy({ where: { trainerId: SYNTHETIC_TRAINER_ID } }).catch(() => {});
  }
  await isolated.close().catch(() => {});
  await adminIsolated.close().catch(() => {});
});

beforeEach(async () => {
  if (!fixtureReachable) return;
  await ClassLog.destroy({ where: { trainerId: SYNTHETIC_TRAINER_ID } });
});

describe.skipIf(process.env.S06_INTEGRATION_READY !== 'true')(
  'H29 — taught-log operation identity against real PostgreSQL',
  () => {
    it('reaches the OWNED fixture and refuses anything else', () => {
      expect(connectError).toBeNull();
      expect(fixtureReachable).toBe(true);
      expect(String(identity.dd)).toContain(DB.expectedDataDirectorySuffix);
      expect(identity.db).toBe(DB.database);
    });

    it('has the unique index ACTUALLY PRESENT in this fixture (schema inspection)', async () => {
      const indexes = await isolated.getQueryInterface().showIndex(TABLE);
      const unique = indexes.find((entry) => entry.name === UNIQUE_INDEX);
      expect(unique, `${UNIQUE_INDEX} missing from ${TABLE}`).toBeDefined();
      expect(unique.unique).toBe(true);
      expect(unique.fields.map((f) => f.attribute)).toEqual(['trainerId', 'operationKey']);
    });

    it('collapses a RETRY onto one row through the REAL service', async () => {
      const key = 'run:00000000-0000-4000-8000-000000000001';
      const first = await logBootcampClass(logRow({ operationKey: key }));
      const retry = await logBootcampClass(logRow({ operationKey: key }));

      expect(retry.id).toBe(first.id);
      expect(await countRows({ trainerId: SYNTHETIC_TRAINER_ID, operationKey: key })).toBe(1);
    });

    it('rejects the SAME key with a CHANGED payload (409) and writes nothing extra', async () => {
      const key = 'run:00000000-0000-4000-8000-000000000002';
      await logBootcampClass(logRow({ operationKey: key }));

      await expect(logBootcampClass(logRow({
        operationKey: key,
        exercisesUsed: [{ exerciseName: 'Completely Different', durationSec: 20 }],
      }))).rejects.toMatchObject({ status: 409 });

      expect(await countRows({ trainerId: SYNTHETIC_TRAINER_ID, operationKey: key })).toBe(1);
    });

    it('THE RACE: two concurrent writers under one key leave exactly ONE row', async () => {
      // Both lookups miss before either commits — the real double-submit shape. The
      // unique index decides; the loser re-reads and returns the winner's row.
      const key = 'run:00000000-0000-4000-8000-000000000003';
      const results = await Promise.allSettled([
        logBootcampClass(logRow({ operationKey: key })),
        logBootcampClass(logRow({ operationKey: key })),
      ]);

      const fulfilled = results.filter((entry) => entry.status === 'fulfilled');
      expect(fulfilled).toHaveLength(2);
      expect(await countRows({ trainerId: SYNTHETIC_TRAINER_ID, operationKey: key })).toBe(1);
    });

    it('keeps preexisting NULL-key rows compatible (legacy rows stay readable)', async () => {
      // "Old rows remain null and readable" — Postgres treats NULLs as distinct, so three
      // keyless rows coexist where a naive unique index would have blocked them.
      await ClassLog.bulkCreate([logRow(), logRow(), logRow()]);
      expect(await countRows({ trainerId: SYNTHETIC_TRAINER_ID, operationKey: null })).toBe(3);
    });

    it('the migration is reversible and re-appliable (up / down / up)', async () => {
      const qi = isolated.getQueryInterface();
      const columnsOf = async () => Object.keys(await qi.describeTable(TABLE));
      const indexNames = async () => (await qi.showIndex(TABLE)).map((entry) => entry.name);

      await migration.down(qi, Sequelize);
      expect(await columnsOf()).not.toContain('operationKey');
      expect(await indexNames()).not.toContain(UNIQUE_INDEX);

      await migration.up(qi, Sequelize);
      expect(await columnsOf()).toContain('operationKey');
      expect(await indexNames()).toContain(UNIQUE_INDEX);

      // Leaves the fixture in the migrated state the other tests assume.
      expect((await qi.describeTable(TABLE)).operationKey.allowNull).toBe(true);
    }, 60000);
  },
);

/**
 * ============================================================================
 * H09 / R-H09 — EXECUTED save → reload round-trip (contract §5 line 295:
 * "manifest save/reload preserves identity").
 *
 * The unit suite proves the save mapper and the read rule, but it hands the read rule the
 * SAME in-memory object the mapper produced. This block puts a real PostgreSQL round-trip
 * between them: the row is created by the migration, written by the REAL save-side mapper,
 * read back by SQL, and only THEN handed to the real rejoin — with a real catalog query
 * behind it.
 * ============================================================================
 */
const EXERCISE_TABLE = 'bootcamp_exercises';
const CATALOG_TABLE = 'h09_exercise_catalog';
const SYNTHETIC_LIBRARY_ID = '11111111-1111-4111-8111-111111111111';

const sourceNameMigration = (await import('../../migrations/20260526000300-add-bootcamp-source-exercise-name.cjs')).default;
// Static imports, not `await import` inside the describe body: a top-level `await` is illegal
// inside a non-async callback, which is what a syntax error in an earlier version of this
// block proved the hard way.
const { buildExerciseRow } = await import('../../services/bootcamp/bootcampTemplateRows.mjs');
const { __testing__ } = await import('../../services/bootcamp/bootcampCrud.mjs');
const { generateBoard2 } = await import('../../services/bootcamp/classStyleModifiers.mjs');

describe.skipIf(process.env.S06_INTEGRATION_READY !== 'true')(
  'H09 — a substitution identity survives a real save/reload',
  () => {
    const qi = () => isolated.getQueryInterface();

    beforeAll(async () => {
      if (!fixtureReachable) return;
      // A MINIMAL hand-built table in the PRE-migration shape — deliberately not
      // `BootcampExercise.sync()`, because that model carries foreign keys to
      // `bootcamp_templates`, `bootcamp_stations` and `Exercises`, none of which exist in this
      // fixture. What is under test here is the MIGRATION, the mapper's output values and the
      // read rule; the model's own column shape is locked separately by
      // `bootcampTemplateDomainDrift.test.mjs`. Disclosed rather than implied.
      await isolated.query(`drop table if exists "${EXERCISE_TABLE}"`);
      await isolated.query(`drop table if exists "${CATALOG_TABLE}"`);
      await isolated.query(
        `create table "${EXERCISE_TABLE}" (
           id serial primary key,
           "templateId" integer,
           "stationId" integer,
           "exerciseName" varchar(100) not null,
           "exerciseLibraryId" uuid,
           "videoUrl" text,
           "previewVideoUrl" text,
           "thumbnailUrl" text,
           "imageUrl" text,
           "description" text,
           "instructions" text
         )`,
      );
      await isolated.query(
        `create table "${CATALOG_TABLE}" (id uuid primary key, name varchar(120), "videoUrl" text, "description" text, "instructions" text, "previewVideoUrl" text, "thumbnailUrl" text, "imageUrl" text)`,
      );
    }, 60000);

    afterAll(async () => {
      if (!fixtureReachable) return;
      await isolated.query(`drop table if exists "${EXERCISE_TABLE}"`).catch(() => {});
      await isolated.query(`drop table if exists "${CATALOG_TABLE}"`).catch(() => {});
    });

    /**
     * The rejoin asks the real catalog table, so the join is a real query too.
     * `name` is selected because the read-time refusal COMPARES it (round 115 F6): without the
     * column the branch under test could never fire here, and its assertions would pass for the
     * wrong reason.
     */
    const catalogLoader = async (ids) => {
      const [rows] = await isolated.query(
        `select id, name, "videoUrl", "description", "instructions", "previewVideoUrl", "thumbnailUrl", "imageUrl"
           from "${CATALOG_TABLE}" where id in (:ids)`,
        { replacements: { ids } },
      );
      return rows;
    };

    it('the migration ADDS the marker column to a table that predates it', async () => {
      // The table is created in the PRE-migration shape, so `up` is the real upgrade path.
      // `down` runs SECOND: calling it first would fail, because there is no column to drop —
      // which is exactly what the previous version of this test did.
      expect(Object.keys(await qi().describeTable(EXERCISE_TABLE))).not.toContain('sourceExerciseName');

      await sourceNameMigration.up(qi(), Sequelize);
      const described = await qi().describeTable(EXERCISE_TABLE);
      expect(Object.keys(described)).toContain('sourceExerciseName');
      expect(described.sourceExerciseName.allowNull).toBe(true);

      // Reversible, and left in the migrated state the other tests assume.
      await sourceNameMigration.down(qi(), Sequelize);
      expect(Object.keys(await qi().describeTable(EXERCISE_TABLE))).not.toContain('sourceExerciseName');
      await sourceNameMigration.up(qi(), Sequelize);
      expect(Object.keys(await qi().describeTable(EXERCISE_TABLE))).toContain('sourceExerciseName');
    }, 60000);

    it('writes a generated alternative, reads it back, and finds NO inherited identity', async () => {
      // The F4 case end to end: the builder must not hand the substitute the source's
      // catalog id, so after a real reload there is nothing for the join to rehydrate.
      const [alternative] = generateBoard2([{
        exerciseName: 'Back Squat',
        board: 'main',
        stationIndex: 0,
        sortOrder: 1,
        durationSec: 30,
        restSec: 15,
        easyVariation: 'Step-Up',
        kneeMod: 'Low Box Step-Up',
        exerciseLibraryId: SYNTHETIC_LIBRARY_ID,
        videoUrl: 'https://cdn.test/source.mp4',
        instructions: 'Source instructions',
      }]);
      expect(alternative.sourceExerciseName).toBe('Back Squat');

      // The station map is the REAL save path's: admission proved every referenced index
      // exists, and `buildExerciseRow` fails loudly on a miss rather than silently demoting
      // the row to full-group (hostile-review BE-F7).
      const row = buildExerciseRow(alternative, 1, new Map([[0, 1]]));
      const [inserted] = await isolated.query(
        `insert into "${EXERCISE_TABLE}" ("templateId", "exerciseName", "sourceExerciseName", "exerciseLibraryId", "videoUrl", "instructions")
         values (:templateId, :exerciseName, :sourceExerciseName, :exerciseLibraryId, :videoUrl, :instructions) returning id`,
        {
          replacements: {
            templateId: 1,
            exerciseName: row.exerciseName,
            sourceExerciseName: row.sourceExerciseName,
            exerciseLibraryId: row.exerciseLibraryId,
            videoUrl: row.videoUrl,
            instructions: row.instructions,
          },
        },
      );

      const [[reloaded]] = await isolated.query(
        `select * from "${EXERCISE_TABLE}" where id = :id`, { replacements: { id: inserted[0].id } },
      );

      // The MARKER survived the round-trip (the fourth S-H09 expectation)…
      expect(reloaded.sourceExerciseName).toBe('Back Squat');
      // …and the substitute recorded no catalog identity it could borrow.
      expect(reloaded.exerciseLibraryId).toBeNull();

      // A catalog row EXISTS for the source, so an inherited id WOULD have resolved.
      await isolated.query(
        `insert into "${CATALOG_TABLE}" (id, "videoUrl", "instructions", "description")
         values (:id, 'https://cdn.test/source-live.mp4', 'Live source instructions', 'Live source description')`,
        { replacements: { id: SYNTHETIC_LIBRARY_ID } },
      );

      await __testing__.hydrateTemplateExerciseMedia(
        [{ exercises: [reloaded] }], catalogLoader,
      );

      expect(reloaded.exerciseLibraryId).toBeNull();
      expect(reloaded.instructions).toBeNull();
      expect(reloaded.videoUrl).toBeNull();
    }, 60000);

    it('REFUSES an inherited demo end to end when the resolving id is the replaced movement’s', async () => {
      // The pre-fix shape, which the producers stopped creating but legacy rows still carry: the
      // substitute RECORDED the source's catalog id, so the join resolves to the movement it
      // replaced. Before round 114 this re-served that movement's demo; the read path now refuses
      // it. Both reviewers of round 114/115 flagged that nothing exercised this END TO END —
      // the fixture had no `name` column, so the branch was inert here and the neighbouring
      // assertions passed through the already-null construction path.
      const inheritedId = '33333333-3333-4333-8333-333333333333';
      // The catalog row's media are DELIBERATELY DIFFERENT from the snapshot the row already
      // carries (hostile review, round 116 R3). With identical strings the copy loop would write
      // the same values, so the media assertions would pass even with the refusal deleted — they
      // did, and only the id assertion discriminated.
      await isolated.query(
        `insert into "${CATALOG_TABLE}" (id, name, "videoUrl", "instructions", "previewVideoUrl", "thumbnailUrl", "imageUrl", "description")
         values (:id, 'Barbell Back Squat', 'https://cdn.test/replaced-live.mp4', 'LIVE replaced instructions',
                 'https://cdn.test/replaced-loop.webm', 'https://cdn.test/replaced.jpg', 'https://cdn.test/replaced.png', 'LIVE replaced description')`,
        { replacements: { id: inheritedId } },
      );
      const [legacyRow] = await isolated.query(
        `insert into "${EXERCISE_TABLE}" ("templateId", "exerciseName", "sourceExerciseName", "exerciseLibraryId", "videoUrl", "instructions")
         values (1, 'Goblet Squat', 'Barbell Back Squat', :id, 'https://cdn.test/snapshot.mp4', 'Snapshot instructions')
         returning id`,
        { replacements: { id: inheritedId } },
      );

      const [[row]] = await isolated.query(
        `select * from "${EXERCISE_TABLE}" where id = :id`, { replacements: { id: legacyRow[0].id } },
      );
      expect(row.exerciseLibraryId).toBe(inheritedId); // the poisoned id is really recorded
      expect(row.videoUrl).toBe('https://cdn.test/snapshot.mp4'); // …and so is a stale snapshot

      await __testing__.hydrateTemplateExerciseMedia([{ exercises: [row] }], catalogLoader);

      // All six media fields and the id — the copied values would have been the LIVE ones, so each
      // assertion can only pass through the refusal.
      expect(row.videoUrl).toBeNull();
      expect(row.previewVideoUrl).toBeNull();
      expect(row.thumbnailUrl).toBeNull();
      expect(row.imageUrl).toBeNull();
      expect(row.description).toBeNull();
      expect(row.instructions).toBeNull();
      expect(row.exerciseLibraryId).toBeNull();
    }, 60000);

    it('still hydrates when the catalog name matches only by CASE (round 115 F4)', async () => {
      // `Exercise.name` is UNIQUE but case-SENSITIVE, so 'GOBLET SQUAT' and 'Goblet Squat' are
      // both legal rows. Two consequences, both normalised away by the fix:
      //   (a) a case-variant SOURCE must still be REFUSED — exact equality missed it and re-served
      //       the replaced demo;
      //   (b) a case-variant SELF (the row's own name equals sourceExerciseName but for case) was
      //       never renamed, so it must keep its media and its identity.
      const upperId = '44444444-4444-4444-8444-444444444444';
      await isolated.query(
        `insert into "${CATALOG_TABLE}" (id, name, "videoUrl", "instructions")
         values (:id, 'GOBLET SQUAT', 'https://cdn.test/upper.mp4', 'Uppercase catalog instructions')`,
        { replacements: { id: upperId } },
      );

      const [caseSource] = await isolated.query(
        `insert into "${EXERCISE_TABLE}" ("templateId", "exerciseName", "sourceExerciseName", "exerciseLibraryId")
         values (1, 'Box Squat', 'Goblet Squat', :id) returning id`,
        { replacements: { id: upperId } },
      );
      const [[caseSourceRow]] = await isolated.query(
        `select * from "${EXERCISE_TABLE}" where id = :id`, { replacements: { id: caseSource[0].id } },
      );
      // Assert the PRE-hydration value too (round 116 R4): without it the assertion below could be
      // satisfied by a row that never carried the id at all.
      expect(caseSourceRow.exerciseLibraryId).toBe(upperId);
      await __testing__.hydrateTemplateExerciseMedia([{ exercises: [caseSourceRow] }], catalogLoader);
      expect(caseSourceRow.exerciseLibraryId).toBeNull(); // (a) refused despite the case difference

      // (b) is a REGRESSION GUARD, not a pin on the normalisation: a case-only relabel read as "not
      // renamed" under the OLD exact-match code too (ownName !== sourceName was false), so this half
      // would pass either way. It is kept because the guard is the reason the normalisation cannot
      // over-clear, and it is labelled here rather than counted as evidence for it.
      const [caseSelf] = await isolated.query(
        `insert into "${EXERCISE_TABLE}" ("templateId", "exerciseName", "sourceExerciseName", "exerciseLibraryId")
         values (1, 'GOBLET SQUAT', 'Goblet Squat', :id) returning id`,
        { replacements: { id: upperId } },
      );
      const [[caseSelfRow]] = await isolated.query(
        `select * from "${EXERCISE_TABLE}" where id = :id`, { replacements: { id: caseSelf[0].id } },
      );
      expect(caseSelfRow.exerciseLibraryId).toBe(upperId);
      await __testing__.hydrateTemplateExerciseMedia([{ exercises: [caseSelfRow] }], catalogLoader);
      expect(caseSelfRow.exerciseLibraryId).toBe(upperId); // not renamed: keeps its own link
      expect(caseSelfRow.videoUrl).toBe('https://cdn.test/upper.mp4');
    }, 60000);

    it('leaves a NON-substitution row’s snapshot alone through the same round-trip', async () => {
      const row = buildExerciseRow({
        exerciseName: 'Goblet Squat',
        exerciseLibraryId: null,
        videoUrl: 'https://cdn.test/goblet.mp4',
        instructions: 'Hold the bell at the chest.',
      }, 1, new Map());

      const [inserted] = await isolated.query(
        `insert into "${EXERCISE_TABLE}" ("templateId", "exerciseName", "sourceExerciseName", "videoUrl", "instructions")
         values (1, :exerciseName, :sourceExerciseName, :videoUrl, :instructions) returning id`,
        {
          replacements: {
            exerciseName: row.exerciseName,
            sourceExerciseName: row.sourceExerciseName ?? null,
            videoUrl: row.videoUrl,
            instructions: row.instructions,
          },
        },
      );
      const [[reloaded]] = await isolated.query(
        `select * from "${EXERCISE_TABLE}" where id = :id`, { replacements: { id: inserted[0].id } },
      );

      await __testing__.hydrateTemplateExerciseMedia([{ exercises: [reloaded] }], catalogLoader);

      expect(reloaded.videoUrl).toBe('https://cdn.test/goblet.mp4');
      expect(reloaded.instructions).toBe('Hold the bell at the chest.');
    }, 60000);
  },
);

/**
 * ============================================================================
 * H29b — the SPRINT CONFIRMATION against real PostgreSQL (contract §5 line 216, and
 * §8 line 306's "prove row locks with two connections … unique taught-log race").
 *
 * WHY THIS BLOCK EXISTS. Two separate reviews named the same gap: the confirmation's
 * exactly-once guarantee, its link and its counter were proven only against MOCKED models and a
 * mocked transaction, with a mocked `update` standing in for the row lock. A mock cannot prove a
 * row lock — the lock is enforced by the DATABASE, and the whole design rests on it (the
 * conditional UPDATE is the claim, but the `FOR UPDATE` read is what serializes two
 * confirmations).
 *
 * WHAT IS REAL HERE: three real tables in the owned disposable fixture, the real models bound to
 * it, the real service, and — in the concurrency case — two pooled connections genuinely
 * contending for the same row. The three tables are created from the models themselves
 * (`sync({ force: true })`), which is safe because none of them declares a foreign key.
 * ============================================================================
 */
const SPRINT_TRAINER_ID = 990002;

const { default: BootcampSprint } = await import('../../models/BootcampSprint.mjs');
const { default: SprintWeekModel } = await import('../../models/SprintWeek.mjs');
const { default: SprintClassSlotModel } = await import('../../models/SprintClassSlot.mjs');
const { confirmSlotUsed } = await import('../../services/bootcamp/sprintService.mjs');

describe.skipIf(process.env.S06_INTEGRATION_READY !== 'true')(
  'H29b — one log, one link and one count per confirmation, proven on real PostgreSQL',
  () => {
    const ACTOR = { userId: SPRINT_TRAINER_ID, role: 'trainer' };

    beforeAll(async () => {
      if (!fixtureReachable) return;
      await BootcampSprint.sync({ force: true });
      await SprintWeekModel.sync({ force: true });
      await SprintClassSlotModel.sync({ force: true });
    }, 60000);

    beforeEach(async () => {
      if (!fixtureReachable) return;
      await SprintClassSlotModel.destroy({ where: { sprintId: { [Sequelize.Op.gt]: 0 } } });
      await SprintWeekModel.destroy({ where: { sprintId: { [Sequelize.Op.gt]: 0 } } });
      await BootcampSprint.destroy({ where: { trainerId: SPRINT_TRAINER_ID } });
      await ClassLog.destroy({ where: { trainerId: SPRINT_TRAINER_ID } });
    });

    afterAll(async () => {
      if (!fixtureReachable) return;
      // Leave the fixture as it was FOUND: the three sprint tables were created by this suite,
      // so they are dropped again rather than left as mystery schema for the next run. (This is
      // the owned disposable fixture; nothing here touches a dev or production database.)
      await SprintClassSlotModel.drop().catch(() => {});
      await SprintWeekModel.drop().catch(() => {});
      await BootcampSprint.drop().catch(() => {});
      await ClassLog.destroy({ where: { trainerId: SPRINT_TRAINER_ID } }).catch(() => {});
    }, 60000);

    /** A real sprint + week + generated slot, the shape generation leaves behind. */
    async function seedGeneratedSlot(over = {}) {
      const sprint = await BootcampSprint.create({
        trainerId: SPRINT_TRAINER_ID,
        name: 'Integration Sprint',
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        durationWeeks: 1,
        classesPerWeek: 1,
        status: 'draft',
        progressionStrategy: 'linear',
      });
      const week = await SprintWeekModel.create({
        sprintId: sprint.id, weekNumber: 1, startDate: '2026-09-01', endDate: '2026-09-07',
      });
      const slot = await SprintClassSlotModel.create({
        weekId: week.id,
        sprintId: sprint.id,
        dayOfWeek: 2,
        scheduledDate: '2026-09-01',
        dayType: 'full_body',
        classFormat: 'stations_4x',
        classStyle: 'standard',
        status: 'generated',
        wasUsed: false,
        generatedClassData: {
          exercises: [
            { exerciseName: 'Goblet Squat', stationIndex: 0, durationSec: 40, board: 'main' },
            { exerciseName: 'Step-Up', stationIndex: 0, durationSec: 40, board: 'lowImpact' },
          ],
        },
        ...over,
      });
      return { sprint, week, slot };
    }

    const logsFor = (slotId) => ClassLog.count({
      where: { trainerId: SPRINT_TRAINER_ID, operationKey: `sprint-slot:${slotId}` },
    });

    it('confirms a real slot: one log, keyed by the slot, LINKED, and counted once', async () => {
      const { sprint, slot } = await seedGeneratedSlot();

      const returned = await confirmSlotUsed(sprint.id, slot.id, ACTOR, {});

      // `query` resolves to [rows, metadata]; the DOUBLE destructure is what yields the row.
      const [[reloadedSlot]] = await isolated.query(
        'select * from sprint_class_slots where id = :id', { replacements: { id: slot.id } },
      );
      expect(reloadedSlot.status).toBe('taught');
      expect(reloadedSlot.wasUsed).toBe(true);
      expect(reloadedSlot.classLogId).not.toBeNull();
      expect(returned.classLogId).toBe(reloadedSlot.classLogId);

      const log = await ClassLog.findByPk(reloadedSlot.classLogId);
      expect(log.operationKey).toBe(`sprint-slot:${slot.id}`);
      expect(log.trainerId).toBe(SPRINT_TRAINER_ID);
      expect(log.executionSummary).toMatchObject({ kind: 'trainer_attested_prescription' });
      // The performed list is the main board: the lowImpact row is an OFFER.
      expect(log.exercisesUsed.map((e) => e.exerciseName)).toEqual(['Goblet Squat']);

      const reloadedSprint = await BootcampSprint.findByPk(sprint.id);
      expect(reloadedSprint.totalClassesCompleted).toBe(1);
      expect(await logsFor(slot.id)).toBe(1);
    }, 60000);

    it('a RETRY returns the linked log and adds nothing', async () => {
      const { sprint, slot } = await seedGeneratedSlot();
      const first = await confirmSlotUsed(sprint.id, slot.id, ACTOR, {});

      const retry = await confirmSlotUsed(sprint.id, slot.id, ACTOR, {});

      expect(retry.classLogId).toBe(first.classLogId);
      expect(await logsFor(slot.id)).toBe(1);
      expect((await BootcampSprint.findByPk(sprint.id)).totalClassesCompleted).toBe(1);
    }, 60000);

    it('TWO CONNECTIONS: a concurrent double-confirm still yields ONE log, ONE link, ONE count', async () => {
      // The row lock is the mechanism under test, and only the database can enforce it. Two
      // pooled connections contend for the same slot row: the second blocks on the `FOR UPDATE`
      // read, then sees the committed link and returns it instead of writing a second log.
      const { sprint, slot } = await seedGeneratedSlot();

      const results = await Promise.allSettled([
        confirmSlotUsed(sprint.id, slot.id, ACTOR, {}),
        confirmSlotUsed(sprint.id, slot.id, ACTOR, {}),
      ]);

      expect(results.every((entry) => entry.status === 'fulfilled')).toBe(true);
      const linked = results.map((entry) => entry.value.classLogId);
      expect(new Set(linked).size).toBe(1);
      expect(linked[0]).not.toBeNull();
      expect(await logsFor(slot.id)).toBe(1);
      expect((await BootcampSprint.findByPk(sprint.id)).totalClassesCompleted).toBe(1);
    }, 60000);

    it('a retry with a CHANGED date is a 409 against real rows', async () => {
      const { sprint, slot } = await seedGeneratedSlot();
      await confirmSlotUsed(sprint.id, slot.id, ACTOR, {});

      await expect(confirmSlotUsed(sprint.id, slot.id, ACTOR, { usedDate: '2026-08-30' }))
        .rejects.toMatchObject({ status: 409 });
      expect(await logsFor(slot.id)).toBe(1);
    }, 60000);

    it('a LEGACY taught slot with no log gets one, without a second count', async () => {
      const { sprint, slot } = await seedGeneratedSlot({ status: 'taught', wasUsed: true });

      const returned = await confirmSlotUsed(sprint.id, slot.id, ACTOR, {});

      expect(returned.classLogId).not.toBeNull();
      expect(await logsFor(slot.id)).toBe(1);
      expect((await BootcampSprint.findByPk(sprint.id)).totalClassesCompleted).toBe(0);
    }, 60000);
  },
);
