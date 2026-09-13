/**
 * ============================================================================
 * FILE: bootcampLogAndSpaceRoute.test.mjs — route-level coverage for the two
 *       endpoints repaired in round 13b (BE-F8a / BE-F8b).
 *
 * Both were fixed and tested at the SERVICE level only, so the route chain —
 * auth -> body -> real service -> error mapping -> response — had never run.
 * `POST /log` is where the error mapping changed (it previously returned a flat
 * 500 for everything); `PUT /spaces/:id` is where the mass-assignment fix lives.
 *
 * Real Express router, real service functions; only the ORM and auth are mocked.
 * ============================================================================
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 7, role: 'trainer' },
  classLog: null,
  template: null,
  spaceProfile: null,
  created: [],
  spaceUpdates: [],
  templateQueries: [],
  existingLog: null,
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

// The nine getters bootcampCrud.mjs imports; only three are exercised here.
vi.mock('../../models/index.mjs', () => ({
  getBootcampTemplate: () => mocks.template,
  getBootcampStation: () => ({}),
  getBootcampExercise: () => ({}),
  getBootcampOverflowPlan: () => ({}),
  getBootcampClassLog: () => mocks.classLog,
  getBootcampSpaceProfile: () => mocks.spaceProfile,
  getBootcampStretch: () => ({}),
  getExerciseTrend: () => ({}),
  getExercise: () => ({}),
}));

// Only the two functions under test are real; the rest stay stubbed.
vi.mock('../../services/bootcampService.mjs', async () => {
  const actual = await vi.importActual('../../services/bootcamp/bootcampCrud.mjs');
  const noop = vi.fn();
  return {
    generateBootcampClass: noop,
    saveBootcampTemplate: noop,
    logBootcampClass: actual.logBootcampClass,
    getClassHistory: noop,
    getTemplates: noop,
    createSpaceProfile: noop,
    getSpaceProfiles: noop,
    updateSpaceProfile: actual.updateSpaceProfile,
    getExerciseTrends: noop,
    approveExerciseTrend: noop,
    queryExercisesForBootcamp: noop,
  };
});

const { default: bootcampRoutes } = await import('../../routes/bootcampRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/bootcamp', bootcampRoutes);

beforeEach(() => {
  mocks.currentUser = { id: 7, role: 'trainer' };
  mocks.created.length = 0;
  mocks.spaceUpdates.length = 0;
  mocks.templateQueries.length = 0;
  mocks.existingLog = null;

  mocks.classLog = {
    create: vi.fn(async (row) => { mocks.created.push(row); return { id: 900, ...row }; }),
    // H29: the service looks up (trainerId, operationKey) before inserting. `null` means
    // "no prior write under this key", i.e. a first attempt.
    findOne: vi.fn(async () => mocks.existingLog ?? null),
  };
  // Only trainer 7's template 42 exists.
  mocks.template = {
    findOne: vi.fn(async ({ where }) => {
      mocks.templateQueries.push(where);
      return where.id === 42 && where.trainerId === 7 ? { id: 42, trainerId: 7 } : null;
    }),
  };
  mocks.spaceProfile = {
    findOne: vi.fn(async ({ where }) => (
      where.id === 9 && where.trainerId === 7
        ? { id: 9, trainerId: 7, update: vi.fn(async (values) => { mocks.spaceUpdates.push(values); return { id: 9, ...values }; }) }
        : null
    )),
  };
});

// H29: the endpoint now REQUIRES an operation key (§5 line 218), so every body carries one.
const logBody = (over = {}) => ({
  operationKey: 'run:test-0000-1111',
  classDate: '2026-09-13',
  exercisesUsed: [{ exerciseName: 'Squat' }],
  ...over,
});

describe('POST /api/bootcamp/log — real route and error mapping', () => {
  it('rejects a missing operationKey with 400 and writes nothing (H29)', async () => {
    const res = await request(app).post('/api/bootcamp/log')
      .send({ classDate: '2026-09-13', exercisesUsed: [{ exerciseName: 'Squat' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/operationKey is required/);
    expect(mocks.created).toHaveLength(0);
  });

  it('logs a class without a template reference', async () => {
    const res = await request(app).post('/api/bootcamp/log').send(logBody());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, logId: 900 });
    expect(mocks.created[0].templateId).toBeNull();
    expect(mocks.templateQueries).toHaveLength(0);
  });

  // ── H29: one stable identity survives retries ────────────────────────────────
  it('a RETRY under the same operationKey returns the ORIGINAL log and creates NOTHING', async () => {
    // §5 line 218 / R-H29: "same log ID; one taught count/link". A second class identity
    // is what used to defeat attendance deduplication downstream, because attendance
    // idempotency is keyed per class-log id.
    const first = await request(app).post('/api/bootcamp/log').send(logBody());
    expect(first.body.logId).toBe(900);
    expect(mocks.created).toHaveLength(1);
    const payloadHash = mocks.created[0].payloadHash;
    expect(typeof payloadHash).toBe('string');

    // A lost response means the client retries with the SAME key and SAME body.
    mocks.existingLog = { id: 900, payloadHash };
    mocks.created.length = 0;
    const retry = await request(app).post('/api/bootcamp/log').send(logBody());

    expect(retry.status).toBe(200);
    expect(retry.body.logId).toBe(900);
    expect(mocks.created).toHaveLength(0);
  });

  it('a CHANGED payload under an already-used key is a 409, not a silent overwrite', async () => {
    mocks.existingLog = { id: 900, payloadHash: 'hash-of-something-else' };
    const res = await request(app).post('/api/bootcamp/log').send(logBody());

    expect(res.status).toBe(409);
    expect(mocks.created).toHaveLength(0);
  });

  it('hashes AFTER schema normalization, so a re-serialized templateId is still a retry (F5)', async () => {
    // External review round 97 finding F5, and contract §5 line 220: "Canonical payloadHash
    // is computed AFTER SCHEMA NORMALIZATION and excludes receipt timestamps." The route
    // passes the RAW templateId by design (BE-F8a), and the service normalizes it — so
    // hashing the raw value made `'42'` and `42` two different payloads, and an honest retry
    // was rejected with a 409 for a body that persists to the identical row.
    const first = await request(app).post('/api/bootcamp/log').send(logBody({ templateId: '42' }));
    expect(first.status).toBe(200);
    expect(mocks.created[0].templateId).toBe(42); // normalized for the ROW…
    const payloadHash = mocks.created[0].payloadHash;

    // …and the same normalization must decide the HASH.
    mocks.existingLog = { id: 900, payloadHash };
    mocks.created.length = 0;
    const retry = await request(app).post('/api/bootcamp/log').send(logBody({ templateId: 42 }));

    expect(retry.status).toBe(200);
    expect(retry.body.logId).toBe(900);
    expect(mocks.created).toHaveLength(0);
  });

  it('a concurrent duplicate is settled by the unique index, returning the winner', async () => {
    // Both requests can pass the lookup before either commits; the unique index on
    // (trainerId, operationKey) decides, and the loser re-reads instead of failing.
    mocks.classLog.create = vi.fn(async () => {
      const err = new Error('duplicate key value violates unique constraint');
      err.name = 'SequelizeUniqueConstraintError';
      throw err;
    });
    mocks.classLog.findOne = vi.fn(async () => ({ id: 900, payloadHash: null }));

    const res = await request(app).post('/api/bootcamp/log').send(logBody());
    expect(res.status).toBe(200);
    expect(res.body.logId).toBe(900);
  });

  it('accepts the caller OWN template', async () => {
    const res = await request(app).post('/api/bootcamp/log').send(logBody({ templateId: '42' }));
    expect(res.status).toBe(200);
    expect(mocks.created[0].templateId).toBe(42);
    expect(mocks.templateQueries[0]).toEqual({ id: 42, trainerId: 7 });
  });

  it('reports an UNPARSEABLE classDate as a 400, not a 500 (round 108, MED-2)', async () => {
    // A hostile verification measured the old behaviour end to end: the route checked only
    // that `classDate` was truthy, the RAW value was persisted, and Sequelize's DATEONLY
    // stringifies anything unparseable as `'Invalid date'` — so each of these surfaced as
    // 500 "Failed to log class". A validation failure reported as a server fault is exactly
    // what §9 line 323 forbids.
    for (const classDate of ['not-a-date', '2026-02-30', '2026-13-01', 'yesterday', '']) {
      const res = await request(app).post('/api/bootcamp/log').send(logBody({ classDate }));
      expect(res.status, classDate).toBe(400);
      expect(res.body.error, classDate).toMatch(/classDate/);
      expect(mocks.created, classDate).toHaveLength(0);
    }
  });

  it('persists the CANONICAL classDate, so the row matches what was hashed', async () => {
    const res = await request(app).post('/api/bootcamp/log').send(logBody({ classDate: '2026-9-3' }));

    expect(res.status).toBe(200);
    expect(mocks.created[0].classDate).toBe('2026-09-03');
  });

  // ── §5 line 222: the log says WHICH kind of record it is ─────────────────────
  it('persists a KNOWN executionSummary kind and drops an unknown one', async () => {
    const summary = { kind: 'trainer_attested_prescription', expectedParticipants: 12 };

    const known = await request(app).post('/api/bootcamp/log').send(logBody({ executionSummary: summary }));
    expect(known.status).toBe(200);
    expect(mocks.created[0].executionSummary).toEqual(summary);

    // §5 line 222 wants a reader to be able to tell a prescription from a measurement. An
    // unrecognized kind has no honest label, so the row stores null instead of a claim whose
    // meaning is whatever the client decided.
    mocks.created.length = 0;
    await request(app).post('/api/bootcamp/log').send(logBody({ executionSummary: { kind: 'measured_ish', workSec: 900 } }));
    expect(mocks.created[0].executionSummary).toBeNull();

    mocks.created.length = 0;
    await request(app).post('/api/bootcamp/log').send(logBody({ executionSummary: 'trainer_attested_prescription' }));
    expect(mocks.created[0].executionSummary).toBeNull();
  });

  it('REFUSES a client-asserted runner_measured summary (round 99, LOW-1)', async () => {
    // A measurement requires a runner that measured. This endpoint is the UI's write path, so
    // a client asserting an observation nobody made is stored as nothing at all.
    const res = await request(app).post('/api/bootcamp/log')
      .send(logBody({ executionSummary: { kind: 'runner_measured', elapsedSec: 1800 } }));

    expect(res.status).toBe(200);
    expect(mocks.created[0].executionSummary).toBeNull();
  });

  it('RESERVES the sprint-slot: namespace so a caller cannot wedge a confirmation (round 99, HIGH-2)', async () => {
    // The Sprint confirmation mints `sprint-slot:<slotId>` itself. When this endpoint accepted
    // one, a caller could squat a slot's identity with an unrelated log; the confirmation then
    // hit the changed-payload 409, which is not a client-safe SPRINT error, so the trainer got
    // a generic 400 and the slot could never be confirmed or re-logged.
    const res = await request(app).post('/api/bootcamp/log')
      .send(logBody({ operationKey: 'sprint-slot:9' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reserved for Sprint confirmation/);
    expect(mocks.created).toHaveLength(0);
  });

  it('reports an OVER-LONG operationKey as a 400, not a 500 (round 99, MED-5)', async () => {
    // `requireOperationKey` threw with `statusCode` and no `exposeToClient`, while the route
    // requires BOTH `exposeToClient` and a status in {400,403,404,409} — so a validation
    // failure was reported as a server fault ("Failed to log class", 500).
    const res = await request(app).post('/api/bootcamp/log')
      .send(logBody({ operationKey: `run:${'x'.repeat(200)}` }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/operationKey exceeds/);
    expect(mocks.created).toHaveLength(0);
  });

  it('hashes AFTER schema normalization, so a re-serialized classDate is still a retry (round 99, MED-4)', async () => {
    // Sequelize's DATEONLY re-formats at write time, so '2026-9-13' and '2026-09-13' persist
    // to the identical row; hashing them differently made an honest retry a 409.
    const first = await request(app).post('/api/bootcamp/log').send(logBody({ classDate: '2026-9-13' }));
    expect(first.status).toBe(200);
    const payloadHash = mocks.created[0].payloadHash;

    mocks.existingLog = { id: 900, payloadHash };
    mocks.created.length = 0;
    const retry = await request(app).post('/api/bootcamp/log').send(logBody({ classDate: '2026-09-13' }));

    expect(retry.status).toBe(200);
    expect(retry.body.logId).toBe(900);
    expect(mocks.created).toHaveLength(0);
  });

  it('returns 404 — not a flat 500 — for a FOREIGN template, with no write', async () => {
    // Before the round-13b fix the route answered 500 for every failure.
    const res = await request(app).post('/api/bootcamp/log').send(logBody({ templateId: 43 }));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Template not found' });
    expect(mocks.created).toHaveLength(0);
  });

  it('returns 400 for a malformed templateId instead of writing NaN', async () => {
    for (const bad of ['abc', '12abc', '0', '-1', '1.5']) {
      const res = await request(app).post('/api/bootcamp/log').send(logBody({ templateId: bad }));
      expect(res.status, `templateId=${bad}`).toBe(400);
    }
    expect(mocks.created).toHaveLength(0);
  });

  it('does NOT echo the malformed templateId in the error body', async () => {
    const marker = 'zz-marker-<script>zz';
    const res = await request(app).post('/api/bootcamp/log').send(logBody({ templateId: marker }));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain(marker);
  });

  it('rejects a missing classDate or empty exercisesUsed with 400', async () => {
    expect((await request(app).post('/api/bootcamp/log').send({ exercisesUsed: [{ exerciseName: 'X' }] })).status).toBe(400);
    expect((await request(app).post('/api/bootcamp/log').send({ classDate: '2026-09-13', exercisesUsed: [] })).status).toBe(400);
  });

  it('normalizes dayType and clamps classRating through the route', async () => {
    await request(app).post('/api/bootcamp/log').send(logBody({ dayType: 'leg_day', classRating: 99 }));
    expect(mocks.created[0].dayType).toBeNull();
    expect(mocks.created[0].classRating).toBe(5);
  });
});

describe('PUT /api/bootcamp/spaces/:id — real route and mass-assignment guard', () => {
  it('updates allowlisted fields', async () => {
    const res = await request(app).put('/api/bootcamp/spaces/9').send({ name: 'Studio B', maxStations: 6 });
    expect(res.status).toBe(200);
    expect(mocks.spaceUpdates[0]).toEqual({ name: 'Studio B', maxStations: 6 });
  });

  it('CANNOT reassign trainerId or id from the request body', async () => {
    const res = await request(app).put('/api/bootcamp/spaces/9')
      .send({ name: 'Studio B', trainerId: 999, id: 1234 });
    expect(res.status).toBe(200);
    expect(mocks.spaceUpdates[0]).toEqual({ name: 'Studio B' });
    expect(mocks.spaceUpdates[0]).not.toHaveProperty('trainerId');
  });

  it('returns 400 for a malformed id without touching the model', async () => {
    for (const bad of ['abc', '0', '-1']) {
      const res = await request(app).put(`/api/bootcamp/spaces/${bad}`).send({ name: 'X' });
      expect(res.status, `id=${bad}`).toBe(400);
    }
    expect(mocks.spaceUpdates).toHaveLength(0);
  });

  it('returns 404 for a profile the caller does not own', async () => {
    const res = await request(app).put('/api/bootcamp/spaces/11').send({ name: 'X' });
    expect(res.status).toBe(404);
    expect(mocks.spaceUpdates).toHaveLength(0);
  });
});
