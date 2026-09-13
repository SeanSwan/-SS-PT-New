/**
 * ============================================================================
 * FILE: bootcampSaveRoute.test.mjs — closes the register's coverage gap:
 *       "no supertest reaches POST /api/bootcamp/save".
 *
 * Every other test for this endpoint goes through the service or mocks the
 * models, so the ROUTE chain had never been exercised: auth -> body check ->
 * REAL saveBootcampTemplate -> inline error mapping -> response shape.
 *
 * The route carries its OWN error mapping (bootcampRoutes.mjs:148-159), separate
 * from getBootcampRouteErrorResponse used elsewhere in the file:
 *
 *     400 -> err.message verbatim      403 -> hardcoded 'Access denied'
 *     else -> generic 'Failed to save template'
 *
 * So the 400 branch DOES echo the service message. That is only safe because the
 * admission messages never interpolate submitted input — which is exactly what
 * these tests verify rather than assume.
 * ============================================================================
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 7, role: 'trainer' },
  template: null,
  station: null,
  exercise: null,
  overflow: null,
  stretch: null,
  spaceProfile: null,
  equipmentProfile: null,
  writes: [],
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

// One transaction, executed inline so the service's commits are observable.
vi.mock('../../database.mjs', () => ({
  default: { transaction: async (fn) => fn({ commit: async () => {}, rollback: async () => {} }) },
  Op: {},
}));

vi.mock('../../models/index.mjs', () => ({
  getBootcampTemplate: () => mocks.template,
  getBootcampStation: () => mocks.station,
  getBootcampExercise: () => mocks.exercise,
  getBootcampOverflowPlan: () => mocks.overflow,
  getBootcampStretch: () => mocks.stretch,
  getBootcampSpaceProfile: () => mocks.spaceProfile,
  getEquipmentProfile: () => mocks.equipmentProfile,
}));

// Everything else on the service stays stubbed; saveBootcampTemplate is the REAL
// implementation, so admission and the atomic write genuinely run.
vi.mock('../../services/bootcampService.mjs', async () => {
  const { saveBootcampTemplate } = await vi.importActual(
    '../../services/bootcamp/bootcampTemplateSave.mjs',
  );
  const noop = vi.fn();
  return {
    generateBootcampClass: noop,
    saveBootcampTemplate,
    logBootcampClass: noop,
    getClassHistory: noop,
    getTemplates: noop,
    createSpaceProfile: noop,
    getSpaceProfiles: noop,
    updateSpaceProfile: noop,
  };
});

const { default: bootcampRoutes } = await import('../../routes/bootcampRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/bootcamp', bootcampRoutes);

const validClass = (over = {}) => ({
  name: 'Route Synthetic',
  classFormat: 'stations_4x',
  dayType: 'full_body',
  targetDuration: 45,
  expectedParticipants: 12,
  // The real generator's station shape: no stationIndex.
  stations: [{ stationNumber: 1, stationName: 'Rack' }, { stationNumber: 2, stationName: 'Floor' }],
  exercises: [
    { exerciseName: 'Back Squat', stationIndex: 0, sortOrder: 0, durationSec: 45 },
    { exerciseName: 'Plank', stationIndex: null, sortOrder: 1, durationSec: 30 },
  ],
  ...over,
});

const post = (generatedClass) => request(app).post('/api/bootcamp/save').send({ generatedClass });

const model = (rows) => ({
  create: vi.fn(async (row) => {
    mocks.writes.push(row);
    return { id: 500, ...row };
  }),
  bulkCreate: vi.fn(async (rowList) => {
    rowList.forEach((row) => mocks.writes.push(row));
    return rowList.map((row, index) => ({ id: 600 + index, ...row }));
  }),
  findOne: vi.fn(async () => null),
  update: vi.fn(async () => undefined),
});

beforeEach(() => {
  mocks.currentUser = { id: 7, role: 'trainer' };
  mocks.writes.length = 0;
  // The returned template must be a MODEL INSTANCE, not a plain row: the service
  // calls `template.update({ metadata })` for the selection manifest.
  mocks.template = {
    ...model(),
    create: vi.fn(async (row) => ({ id: 501, ...row, update: vi.fn(async () => undefined) })),
  };
  mocks.station = model();
  mocks.exercise = model();
  mocks.overflow = model();
  mocks.stretch = model();
  mocks.spaceProfile = { findOne: vi.fn(async () => null) };
  mocks.equipmentProfile = { findOne: vi.fn(async () => null) };
});

describe('POST /api/bootcamp/save — real route, real admission', () => {
  it('saves a valid class and returns its id', async () => {
    const res = await post(validClass());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, templateId: 501 });
    // The whole class was written: 1 template + 2 stations + 2 exercises.
    expect(mocks.template.create).toHaveBeenCalledTimes(1);
    expect(mocks.station.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mocks.exercise.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing generatedClass with 400', async () => {
    const res = await request(app).post('/api/bootcamp/save').send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: 'generatedClass is required' });
  });

  it('turns an invalid enum into a 400, NOT a 500', async () => {
    // This is the end-to-end form of the BE-F3 fix: previously this reached
    // PostgreSQL mid-write and surfaced as a 500.
    const res = await post(validClass({ classFormat: 'not_a_format' }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BOOTCAMP_TEMPLATE_INVALID');
    expect(mocks.template.create).not.toHaveBeenCalled();
  });

  it('does NOT echo submitted input back in the 400 message', async () => {
    // The route returns err.message verbatim on 400, so a message that
    // interpolated client input would reflect it to the caller.
    const marker = 'zz-marker-<script>zz';
    const res = await post(validClass({ classFormat: marker }));
    expect(res.status).toBe(400);
    expect(res.body.error).not.toContain(marker);
    expect(res.body.error).not.toContain('script');
  });

  it('returns 403 with non-disclosing text when a profile is not the caller own', async () => {
    mocks.spaceProfile = { findOne: vi.fn(async () => ({ id: 5, trainerId: 999 })) };
    const res = await post(validClass({ spaceProfileId: 5 }));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, code: 'BOOTCAMP_PROFILE_DENIED', error: 'Access denied' });
    expect(mocks.template.create).not.toHaveBeenCalled();
  });

  it('fails loudly when RETURNING comes back REORDERED (R2-9)', async () => {
    // Same COUNT, wrong ORDER. Before this check the ordinals were paired with
    // whatever row happened to sit at that position, silently attaching every
    // exercise to the wrong station — with no error anywhere.
    mocks.station.bulkCreate = vi.fn(async (rowList) => (
      [...rowList].reverse().map((row, index) => ({ id: 700 + index, ...row }))
    ));

    const res = await post(validClass());
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Failed to save template' });
    // Nothing was attached to a mis-paired station.
    expect(mocks.exercise.bulkCreate).not.toHaveBeenCalled();
  });

  it('accepts a correctly ordered RETURNING set', async () => {
    // The negative control for the check above: in-order rows must pass.
    const res = await post(validClass());
    expect(res.status).toBe(200);
    expect(mocks.exercise.bulkCreate).toHaveBeenCalledTimes(1);
    const rows = mocks.exercise.bulkCreate.mock.calls[0][0];
    expect(rows[0].stationId).toBe(600);
    expect(rows[1].stationId).toBeNull();
  });

  it('hides an internal persistence fault behind the generic 500 text', async () => {
    // A short `returning` set is a SERVER fault, not a bad request. It must not
    // surface as a 400, and its internal message must not reach the client.
    mocks.station.bulkCreate = vi.fn(async () => []);
    const res = await post(validClass());
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Failed to save template' });
    expect(JSON.stringify(res.body)).not.toMatch(/persisted as submitted|Station rows/i);
  });

  it('takes the requester role from the AUTHENTICATED user, never the body', async () => {
    // A trainer body-claiming admin must still be denied a foreign profile.
    mocks.spaceProfile = { findOne: vi.fn(async () => ({ id: 5, trainerId: 999 })) };
    const res = await request(app).post('/api/bootcamp/save')
      .send({ generatedClass: validClass({ spaceProfileId: 5 }), requesterRole: 'admin', role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('lets a genuine ADMIN through the profile check', async () => {
    mocks.currentUser = { id: 99, role: 'admin' };
    mocks.spaceProfile = { findOne: vi.fn(async () => ({ id: 5, trainerId: 999 })) };
    const res = await post(validClass({ spaceProfileId: 5 }));
    expect(res.status).toBe(200);
  });
});
