/**
 * locationController — regression tests (SWA-74, gym-ops spine S0)
 *
 * Every case here pins a defect found by hostile review of the S0 slice. They are written against a
 * mocked model deliberately: they assert CONTROLLER LOGIC (validation, status codes, slug rules),
 * not persistence. Migration/index behaviour is verified separately against real Postgres.
 *
 * NOTE ON RUNNING: backend vitest does not execute on the Windows dev machine this was written on —
 * backend/node_modules/@rollup ships Linux-only binaries (pre-existing; reproduces on untouched
 * test files). These target CI. The same assertions were executed locally with plain `node`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Location from '../../models/Location.mjs';
import {
  listLocations,
  getLocationBySlug,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../../controllers/locationController.mjs';

/** Minimal express-like res that records the status/body the handler chose. */
function mockRes() {
  const res = { code: 0, payload: null };
  res.status = (code) => { res.code = code; return res; };
  res.json = (payload) => { res.payload = payload; return res; };
  return res;
}

const call = async (handler, req) => {
  const res = mockRes();
  await handler(req, res);
  return res;
};

/** In-memory stand-in for the model, including the unique-slug-among-live-rows rule. */
function installMockStore() {
  const rows = [];
  let nextId = 1;

  Location.create = vi.fn(async (values) => {
    if (rows.some((r) => r.slug === values.slug && !r.deletedAt)) {
      const err = new Error('duplicate slug');
      err.name = 'SequelizeUniqueConstraintError';
      throw err;
    }
    const row = { id: nextId++, deletedAt: null, ...values };
    row.update = async (patch) => { Object.assign(row, patch); return row; };
    row.destroy = async () => { row.deletedAt = new Date(); };
    rows.push(row);
    return row;
  });
  Location.findByPk = vi.fn(async (id) => rows.find((r) => r.id === Number(id) && !r.deletedAt) || null);
  Location.findOne = vi.fn(async (opts) => rows.find((r) => r.slug === opts?.where?.slug && !r.deletedAt) || null);
  Location.findAll = vi.fn(async (opts) => {
    const live = rows.filter((r) => !r.deletedAt);
    return opts?.where?.isActive ? live.filter((r) => r.isActive !== false) : live;
  });
  return rows;
}

beforeEach(() => { installMockStore(); });

describe('createLocation', () => {
  it('creates and derives a slug from the name', async () => {
    const res = await call(createLocation, { body: { name: 'Downtown Gym' } });
    expect(res.code).toBe(201);
    expect(res.payload.location.slug).toBe('downtown-gym');
  });

  it('transliterates accents rather than dropping them', async () => {
    // Regression: this slugged to "ber-fitness" — the Ü was deleted, not converted.
    const res = await call(createLocation, { body: { name: 'ÜBER Fitness' } });
    expect(res.payload.location.slug).toBe('uber-fitness');
  });

  it('rejects a name that cannot produce a usable slug', async () => {
    expect((await call(createLocation, { body: { name: '---' } })).code).toBe(400);
  });

  it('rejects an invalid IANA timezone', async () => {
    expect((await call(createLocation, { body: { name: 'A', timezone: 'Not/AZone' } })).code).toBe(400);
  });

  it('validates opensAt/closesAt but accepts null as "no restriction"', async () => {
    expect((await call(createLocation, { body: { name: 'B', opensAt: '24:00' } })).code).toBe(400);
    expect((await call(createLocation, { body: { name: 'C', opensAt: '6:30' } })).code).toBe(400);
    expect((await call(createLocation, { body: { name: 'D', opensAt: null } })).code).toBe(201);
  });

  it('bounds the free-form metadata blob', async () => {
    expect((await call(createLocation, { body: { name: 'E', metadata: { a: 'x'.repeat(20000) } } })).code).toBe(400);
    expect((await call(createLocation, { body: { name: 'F', metadata: 'nope' } })).code).toBe(400);
    expect((await call(createLocation, { body: { name: 'G', metadata: ['a'] } })).code).toBe(400);
    expect((await call(createLocation, { body: { name: 'H', metadata: { ok: true } } })).code).toBe(201);
  });

  it('ignores client-supplied id and deletedAt (mass assignment)', async () => {
    const res = await call(createLocation, { body: { name: 'Guarded', id: 424242, deletedAt: '2020-01-01' } });
    expect(res.code).toBe(201);
    expect(res.payload.location.id).not.toBe(424242);
    expect(res.payload.location.deletedAt).toBeNull();
  });

  it('maps a duplicate slug to 409, not 500', async () => {
    await call(createLocation, { body: { name: 'Dup Site' } });
    expect((await call(createLocation, { body: { name: 'Dup Site' } })).code).toBe(409);
  });
});

describe('updateLocation', () => {
  let id;
  beforeEach(async () => {
    const res = await call(createLocation, { body: { name: 'Downtown Gym' } });
    id = res.payload.location.id;
  });

  it('tolerates a missing request body instead of throwing a 500', async () => {
    // Regression: req.body is undefined when no JSON is sent; dereferencing it threw a TypeError.
    const res = await call(updateLocation, { body: undefined, params: { id } });
    expect(res.code).toBe(200);
  });

  it('refuses a slug that slugifies to empty, and leaves the existing slug intact', async () => {
    // Regression: create guarded this, update did not — '' was persisted, silently breaking the
    // public identifier. Create and update now share one slug resolver.
    const res = await call(updateLocation, { body: { slug: '---' }, params: { id } });
    expect(res.code).toBe(400);
    const after = await call(getLocationById, { params: { id } });
    expect(after.payload.location.slug).toBe('downtown-gym');
  });

  it('does not move the slug when only the name changes', async () => {
    const res = await call(updateLocation, { body: { name: 'Renamed' }, params: { id } });
    expect(res.code).toBe(200);
    expect(res.payload.location.slug).toBe('downtown-gym');
  });

  it('applies an explicit valid slug', async () => {
    const res = await call(updateLocation, { body: { slug: 'New Name Here' }, params: { id } });
    expect(res.payload.location.slug).toBe('new-name-here');
  });
});

describe('path parameter handling', () => {
  // Regression: `id` is a SERIAL pk, so findByPk('abc') raised a Postgres integer-syntax error that
  // the generic catch turned into a 500 — a client error reported as a server failure.
  const hostile = ['abc', '1;DROP TABLE locations', '-1', '0', '1.5', '', 'null', '${7*7}'];

  it.each(hostile)('returns 404 (never 500) for GET with id=%j', async (bad) => {
    expect((await call(getLocationById, { params: { id: bad } })).code).toBe(404);
  });

  it.each(hostile)('returns 404 (never 500) for PUT with id=%j', async (bad) => {
    expect((await call(updateLocation, { params: { id: bad }, body: { city: 'x' } })).code).toBe(404);
  });

  it.each(hostile)('returns 404 (never 500) for DELETE with id=%j', async (bad) => {
    expect((await call(deleteLocation, { params: { id: bad } })).code).toBe(404);
  });

  it('still resolves a valid numeric id', async () => {
    const created = await call(createLocation, { body: { name: 'Real Site' } });
    const res = await call(getLocationById, { params: { id: String(created.payload.location.id) } });
    expect(res.code).toBe(200);
  });
});

describe('getLocationBySlug', () => {
  beforeEach(async () => { await call(createLocation, { body: { name: 'Downtown Gym' } }); });

  it('resolves by the public slug identifier', async () => {
    const res = await call(getLocationBySlug, { params: { slug: 'downtown-gym' } });
    expect(res.code).toBe(200);
    expect(res.payload.location.slug).toBe('downtown-gym');
  });

  it('is case-insensitive', async () => {
    expect((await call(getLocationBySlug, { params: { slug: 'DOWNTOWN-GYM' } })).code).toBe(200);
  });

  it('404s on unknown or hostile slugs rather than erroring', async () => {
    for (const bad of ['nope', '../../etc/passwd', 'DROP TABLE', '']) {
      expect((await call(getLocationBySlug, { params: { slug: bad } })).code).toBe(404);
    }
    expect((await call(getLocationBySlug, { params: {} })).code).toBe(404);
  });
});

describe('deleteLocation', () => {
  it('soft-deletes, hides the row, and frees the slug for reuse', async () => {
    const created = await call(createLocation, { body: { name: 'Downtown Gym' } });
    const id = created.payload.location.id;

    expect((await call(deleteLocation, { params: { id } })).code).toBe(200);
    expect((await call(getLocationById, { params: { id } })).code).toBe(404);
    // The partial unique index is WHERE deletedAt IS NULL, so the slug must be reusable.
    expect((await call(createLocation, { body: { name: 'Downtown Gym' } })).code).toBe(201);
    expect((await call(deleteLocation, { params: { id } })).code).toBe(404);
  });
});

describe('listLocations', () => {
  it('returns an array and tolerates a missing query object', async () => {
    const res = await call(listLocations, {});
    expect(res.code).toBe(200);
    expect(Array.isArray(res.payload.locations)).toBe(true);
  });
});
