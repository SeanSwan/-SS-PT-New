/**
 * ============================================================================
 * FILE: coachMemoryRoutesAuthz.test.mjs
 * PURPOSE: Executed authorization + lifecycle matrix for the G09/S9 Coach memory
 *          HTTP surface (plan 43, contract T35-T37).
 * AUTHOR: Astra | CREATED: 2026-09-13
 * ============================================================================
 *
 * WHAT IS AND IS NOT MOCKED — this is the point of the file
 *   REAL: the route module, `protect` (real HS256 verify), `ensureClientAccess`
 *         and its `isClientEquivalentRole` helper, coachFactService,
 *         coachFactMemoryPolicy, coachContextCache, express routing.
 *   MOCK: the DATABASE ONLY (`models/index.mjs`) — an in-memory stand-in for the
 *         CoachFact model matching the adopted tests/unit harness, plus the User
 *         / ClientTrainerAssignment / WaiverRecord reads the gate makes. Nothing
 *         that makes a security decision is stubbed.
 *
 * THE LESSON THIS SUITE ENCODES
 * `'user'` is the DEFAULT role minted by public self-registration, so every
 * "is this the client themselves?" decision must route through
 * `isClientEquivalentRole`. The `user 43` cases below exist because a
 * hand-rolled `role === 'client'` check silently skips that account class:
 * 43 must reach their OWN memory and must NOT reach 42's.
 *
 * WHAT A BLANKET "ALLOW EVERYTHING" FIX WOULD HAVE TO SURVIVE
 * 42 -> 43 (403), user 43 -> 42 (403), unassigned trainer 8 -> 42 (403),
 * assigned trainer 7 -> 43 (403), no token (401), a fact id owned by another
 * client addressed through your OWN client id (404 with the row untouched).
 * No single allow-all gate passes all seven.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import {
  coachContextCacheKey,
  coachContextCacheKeys,
  clearCoachContextCache,
  setCachedCoachContext,
} from '../../services/ai/coachContextCache.mjs';

const SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

const holder = vi.hoisted(() => ({ box: null }));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => holder.box.getModel(name),
  getAllModels: () => holder.box.getAllModels(),
  getUser: () => holder.box.getUser(),
}));

import coachMemoryRoutes from '../../routes/coachMemoryRoutes.mjs';

/**
 * In-memory stand-in for the CoachFact Sequelize model — the same technique as
 * the adopted tests/unit/coachFactService.test.mjs and
 * tests/unit/coachFactMemoryPolicy.test.mjs harnesses, so the route is driven
 * against the model contract those suites already pin.
 */
function makeFakeModel(seed = []) {
  let nextId = seed.reduce((max, row) => Math.max(max, row.id || 0), 0) + 1;
  const makeInstance = (values) => {
    const inst = { validFrom: '2026-01-01', ...values };
    inst.update = vi.fn(async (patch) => {
      Object.assign(inst, patch);
      return inst;
    });
    return inst;
  };
  const rows = seed.map(makeInstance);
  const matches = (row, where = {}) =>
    Reflect.ownKeys(where).every((key) => {
      const want = where[key];
      if (key === Op.or) return want.some((branch) => matches(row, branch));
      const have = row[key];
      if (want && typeof want === 'object' && Op.gte in want) return have != null && new Date(have) >= new Date(want[Op.gte]);
      if (want === null) return have == null;
      if (want && typeof want === 'object' && Op.lte in want) return have != null && new Date(have) <= new Date(want[Op.lte]);
      if (want && typeof want === 'object' && Op.ne in want) return have != null;
      if (Array.isArray(want)) return want.includes(have);
      return have === want;
    });
  return {
    rows,
    async create(values) {
      const inst = makeInstance({ id: nextId++, ...values });
      rows.push(inst);
      return inst;
    },
    async findAll({ where = {}, limit } = {}) {
      const found = rows.filter((row) => matches(row, where));
      return typeof limit === 'number' ? found.slice(0, limit) : found;
    },
    async findByPk(id) {
      return rows.find((row) => row.id === Number(id)) || null;
    },
    async update(values, { where = {} } = {}) {
      const affected = rows.filter((row) => matches(row, where));
      affected.forEach((row) => Object.assign(row, values));
      return [affected.length];
    },
    async destroy({ where = {} } = {}) {
      const affected = rows.filter((row) => matches(row, where));
      for (const row of affected) rows.splice(rows.indexOf(row), 1);
      return affected.length;
    },
  };
}

const fact = (over) => ({
  structured: null,
  sourceRef: null,
  validTo: null,
  invalidatedAt: null,
  invalidatedByFactId: null,
  forgottenAt: null,
  purgeAfterAt: null,
  conflictMetadata: null,
  createdByUserId: 7,
  approvedByUserId: 7,
  approvedAt: new Date('2026-01-02T00:00:00Z'),
  ...over,
});

function seedFacts() {
  return [
    // 42 — the client under test (three states present so filters are meaningful)
    fact({ id: 101, userId: 42, category: 'preference', statement: 'prefers morning sessions', status: 'active', validFrom: '2026-01-01', sourceType: 'trainer_manual' }),
    fact({ id: 102, userId: 42, category: 'injury_constraint', statement: 'left knee discomfort on lunges', status: 'active', validFrom: '2026-02-01', sourceType: 'chat' }),
    fact({ id: 103, userId: 42, category: 'goal_context', statement: 'training for a spring half marathon', status: 'proposed', validFrom: '2026-03-01', sourceType: 'chat', approvedByUserId: null, approvedAt: null }),
    fact({ id: 104, userId: 42, category: 'lifestyle', statement: 'travels alternate weeks', status: 'invalidated', validFrom: '2025-12-01', sourceType: 'dictation' }),
    // 43 — a DIFFERENT client, and a 'user'-role (default self-registration) account
    fact({ id: 201, userId: 43, category: 'preference', statement: 'prefers evening sessions', status: 'active', validFrom: '2026-01-01', sourceType: 'trainer_manual' }),
  ];
}

function buildBox() {
  const users = new Map([
    [1, { id: 1, role: 'admin', username: 'admin', email: 'a@example.test', isActive: true, isLocked: false }],
    // 7 is actively assigned to 42; 8 is a trainer with NO assignment.
    [7, { id: 7, role: 'trainer', username: 'trainer7', email: 't7@example.test', isActive: true, isLocked: false }],
    [8, { id: 8, role: 'trainer', username: 'trainer8', email: 't8@example.test', isActive: true, isLocked: false }],
    [42, { id: 42, role: 'client', username: 'client42', email: 'c42@example.test', isActive: true, isLocked: false }],
    // 43 is the DEFAULT self-registration role — the account class a hand-rolled
    // `role === 'client'` check silently skips.
    [43, { id: 43, role: 'user', username: 'user43', email: 'u43@example.test', isActive: true, isLocked: false }],
  ]);

  const assignments = [{ clientId: 42, trainerId: 7, status: 'active' }];
  const linkedWaivers = new Set([42, 43]);

  const userModel = {
    async findByPk(id) {
      return users.get(Number(id)) || null;
    },
  };

  const coachFact = makeFakeModel(seedFacts());

  const waiver = {
    async findOne({ where } = {}) {
      return linkedWaivers.has(Number(where?.userId))
        ? { id: 1, status: 'linked', signedAt: new Date('2026-01-01T00:00:00Z') }
        : null;
    },
  };

  return {
    users,
    assignments,
    coachFact,
    getModel(name) {
      if (name === 'CoachFact') return coachFact;
      if (name === 'WaiverRecord') return waiver;
      throw new Error(`unexpected getModel(${name})`);
    },
    getAllModels() {
      return {
        User: userModel,
        ClientTrainerAssignment: {
          async findOne({ where } = {}) {
            return assignments.find((a) => (
              a.clientId === Number(where.clientId)
              && a.trainerId === Number(where.trainerId)
              && a.status === where.status
            )) || null;
          },
        },
      };
    },
    getUser: () => userModel,
  };
}

const app = express();
app.use(express.json());
app.use('/api/coach/memory', coachMemoryRoutes);

const bearer = (userId) => `Bearer ${jwt.sign({ id: userId, tokenType: 'access' }, SECRET, { algorithm: 'HS256', expiresIn: '15m' })}`;

/** A supertest agent pre-authenticated as `userId`. */
const as = (userId) => ({ get: (p) => request(app).get(p).set('Authorization', bearer(userId)), post: (p) => request(app).post(p).set('Authorization', bearer(userId)) });

const factById = (id) => holder.box.coachFact.rows.find((r) => r.id === id);

beforeEach(() => {
  holder.box = buildBox();
  clearCoachContextCache();
  setCachedCoachContext(
    coachContextCacheKey({ actorId: 7, targetClientId: 42, role: 'trainer', capability: 'brief' }),
    { state: 'ok', payload: ['stale context naming the morning preference'] },
  );
  setCachedCoachContext(
    coachContextCacheKey({ actorId: 7, targetClientId: 43, role: 'trainer', capability: 'brief' }),
    { state: 'ok', payload: ['other client context'] },
  );
});

describe('T35 inspect — list a client memory with filters', () => {
  it('returns the client own facts, safety-critical category first', async () => {
    const res = await as(42).get('/api/coach/memory/42/facts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.clientId).toBe(42);
    expect(res.body.data.facts.map((f) => f.id)).toEqual([102, 103, 101, 104]);
    // No cross-client hit: 43's fact must never appear in 42's inspect.
    expect(res.body.data.facts.some((f) => f.userId !== 42)).toBe(false);
  });

  it('honours ?status= and ?category= filters', async () => {
    const active = await as(42).get('/api/coach/memory/42/facts?status=active');
    expect(active.status).toBe(200);
    expect(active.body.data.facts.map((f) => f.id)).toEqual([102, 101]);

    const pref = await as(42).get('/api/coach/memory/42/facts?category=preference');
    expect(pref.status).toBe(200);
    expect(pref.body.data.facts.map((f) => f.id)).toEqual([101]);

    const both = await as(42).get('/api/coach/memory/42/facts?status=active&category=injury_constraint');
    expect(both.body.data.facts.map((f) => f.id)).toEqual([102]);
  });

  it('honours ?limit= and never silently returns an empty page for a bad filter', async () => {
    const limited = await as(42).get('/api/coach/memory/42/facts?limit=1');
    expect(limited.status).toBe(200);
    expect(limited.body.data.facts).toHaveLength(1);

    // A typo'd status must be a 400, not a quiet `[]` that reads as "no memory".
    const bogusStatus = await as(42).get('/api/coach/memory/42/facts?status=actve');
    expect(bogusStatus.status).toBe(400);

    const bogusCategory = await as(42).get('/api/coach/memory/42/facts?category=injuries');
    expect(bogusCategory.status).toBe(400);
  });

  it('rejects a non-numeric client id without querying', async () => {
    const res = await as(42).get('/api/coach/memory/not-an-id/facts');
    expect(res.status).toBe(400);
    expect(holder.box.coachFact.rows).toHaveLength(5);
  });
});

describe('authentication — the real protect layer', () => {
  const paths = [
    ['get', '/api/coach/memory/42/facts'],
    ['post', '/api/coach/memory/42/facts'],
    ['post', '/api/coach/memory/42/facts/101/correct'],
    ['post', '/api/coach/memory/42/facts/101/forget'],
  ];

  it.each(paths)('401 for an unauthenticated %s %s', async (method, path) => {
    const res = await request(app)[method](path).send({ category: 'preference', statement: 'x' });
    expect(res.status).toBe(401);
  });

  it('401 for a non-access token type', async () => {
    const refresh = jwt.sign({ id: 42, tokenType: 'refresh' }, SECRET, { algorithm: 'HS256', expiresIn: '15m' });
    const res = await request(app).get('/api/coach/memory/42/facts').set('Authorization', `Bearer ${refresh}`);
    expect(res.status).toBe(401);
  });

  it('401 when the token names a user that does not exist', async () => {
    const res = await as(99999).get('/api/coach/memory/42/facts');
    expect(res.status).toBe(401);
  });
});

describe('T36 scoping — a client-equivalent actor reaches self only', () => {
  it("client 42 cannot inspect another client's memory", async () => {
    const res = await as(42).get('/api/coach/memory/43/facts');
    expect(res.status).toBe(403);
  });

  it("the DEFAULT 'user' role reaches its own memory", async () => {
    const res = await as(43).get('/api/coach/memory/43/facts');
    expect(res.status).toBe(200);
    expect(res.body.data.facts.map((f) => f.id)).toEqual([201]);
  });

  it("the DEFAULT 'user' role cannot reach client 42's memory", async () => {
    const res = await as(43).get('/api/coach/memory/42/facts');
    expect(res.status).toBe(403);
  });

  it("the DEFAULT 'user' role cannot write into client 42's memory", async () => {
    const remember = await as(43).post('/api/coach/memory/42/facts').send({ category: 'preference', statement: 'injected by another account' });
    expect(remember.status).toBe(403);

    const correct = await as(43).post('/api/coach/memory/42/facts/101/correct').send({ category: 'preference', statement: 'rewritten by another account' });
    expect(correct.status).toBe(403);

    const forget = await as(43).post('/api/coach/memory/42/facts/101/forget').send({});
    expect(forget.status).toBe(403);

    expect(holder.box.coachFact.rows).toHaveLength(5);
    expect(factById(101).status).toBe('active');
    expect(factById(101).statement).toBe('prefers morning sessions');
  });
});

describe('trainer scope — active assignment only', () => {
  it('an unassigned trainer is denied read and write on 42', async () => {
    const read = await as(8).get('/api/coach/memory/42/facts');
    expect(read.status).toBe(403);

    const remember = await as(8).post('/api/coach/memory/42/facts').send({ category: 'preference', statement: 'unassigned write' });
    expect(remember.status).toBe(403);

    const forget = await as(8).post('/api/coach/memory/42/facts/101/forget').send({});
    expect(forget.status).toBe(403);

    expect(holder.box.coachFact.rows).toHaveLength(5);
    expect(factById(101).forgottenAt).toBeNull();
  });

  it('the actively assigned trainer 7 reaches 42', async () => {
    const res = await as(7).get('/api/coach/memory/42/facts');
    expect(res.status).toBe(200);
    expect(res.body.data.facts).toHaveLength(4);
  });

  it('the assigned trainer 7 is still denied on client 43', async () => {
    const res = await as(7).get('/api/coach/memory/43/facts');
    expect(res.status).toBe(403);
  });

  it('admin reaches any client', async () => {
    const res = await as(1).get('/api/coach/memory/43/facts');
    expect(res.status).toBe(200);
    expect(res.body.data.facts.map((f) => f.id)).toEqual([201]);
  });
});

describe('T35 remember / correct / forget over HTTP', () => {
  it('remember creates an ACTIVE fact attributed to the human actor', async () => {
    const res = await as(7).post('/api/coach/memory/42/facts').send({
      category: 'schedule_pattern',
      statement: 'trains best before 09:00 local time',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const created = res.body.data.fact;
    expect(created.userId).toBe(42);
    expect(created.status).toBe('active');
    expect(created.createdByUserId).toBe(7);
    expect(created.approvedByUserId).toBe(7);
    expect(created.sourceType).toBe('trainer_manual');

    const reread = await as(42).get('/api/coach/memory/42/facts?status=active');
    expect(reread.body.data.facts.map((f) => f.id)).toContain(created.id);
  });

  it('remember rejects an unknown category and a blank statement with 400', async () => {
    const badCategory = await as(7).post('/api/coach/memory/42/facts').send({ category: 'diagnosis', statement: 'x' });
    expect(badCategory.status).toBe(400);

    const blank = await as(7).post('/api/coach/memory/42/facts').send({ category: 'preference', statement: '   ' });
    expect(blank.status).toBe(400);

    expect(holder.box.coachFact.rows).toHaveLength(5);
  });

  it('correct writes a NEW version and supersedes the old one with the link', async () => {
    const res = await as(7).post('/api/coach/memory/42/facts/101/correct').send({
      category: 'preference',
      statement: 'prefers early-afternoon sessions',
    });
    expect(res.status).toBe(201);

    const replacement = res.body.data.fact;
    expect(replacement.id).not.toBe(101);
    expect(replacement.status).toBe('active');
    expect(replacement.userId).toBe(42);

    const superseded = res.body.data.supersededFact;
    expect(superseded.id).toBe(101);
    expect(superseded.status).toBe('invalidated');
    expect(superseded.invalidatedByFactId).toBe(replacement.id);

    // The row really moved, not just the response.
    expect(factById(101).status).toBe('invalidated');
    expect(factById(101).invalidatedByFactId).toBe(replacement.id);

    // Retrieval now sees the corrected version and only it.
    const active = await as(42).get('/api/coach/memory/42/facts?status=active&category=preference');
    expect(active.body.data.facts.map((f) => f.id)).toEqual([replacement.id]);
  });

  it('correct refuses a non-active predecessor BEFORE writing anything', async () => {
    const proposed = await as(7).post('/api/coach/memory/42/facts/103/correct').send({ category: 'goal_context', statement: 'no longer training for a half marathon' });
    expect(proposed.status).toBe(409);

    const invalidated = await as(7).post('/api/coach/memory/42/facts/104/correct').send({ category: 'lifestyle', statement: 'travels weekly now' });
    expect(invalidated.status).toBe(409);

    expect(holder.box.coachFact.rows).toHaveLength(5);
  });

  it('forget tombstones, stamps the 24h purge clock and excludes retrieval immediately', async () => {
    const res = await as(7).post('/api/coach/memory/42/facts/101/forget').send({});
    expect(res.status).toBe(200);

    const forgotten = res.body.data.fact;
    expect(forgotten.status).toBe('invalidated');
    expect(forgotten.forgottenAt).toBeTruthy();
    expect(new Date(forgotten.purgeAfterAt).getTime() - new Date(forgotten.forgottenAt).getTime())
      .toBe(24 * 60 * 60 * 1000);

    const active = await as(42).get('/api/coach/memory/42/facts?status=active');
    expect(active.body.data.facts.map((f) => f.id)).not.toContain(101);
  });

  it('forget invalidates the coach context cache for THAT client in the same call', async () => {
    expect(coachContextCacheKeys().length).toBe(2);

    await as(7).post('/api/coach/memory/42/facts/101/forget').send({});

    const remaining = coachContextCacheKeys();
    // The forgotten client's cached context is gone...
    expect(remaining.some((k) => k.split(':')[1] === '42')).toBe(false);
    // ...and the invalidation is scoped, not a global flush.
    expect(remaining.some((k) => k.split(':')[1] === '43')).toBe(true);
  });

  it('the client can forget their own fact (deletion stays available to the subject)', async () => {
    const res = await as(42).post('/api/coach/memory/42/facts/102/forget').send({});
    expect(res.status).toBe(200);
    expect(factById(102).forgottenAt).toBeTruthy();
  });

  it('404 for unknown facts and unchanged state on a bad id', async () => {
    const correct = await as(7).post('/api/coach/memory/42/facts/9999/correct').send({ category: 'preference', statement: 'x' });
    expect(correct.status).toBe(404);

    const forget = await as(7).post('/api/coach/memory/42/facts/9999/forget').send({});
    expect(forget.status).toBe(404);

    expect(holder.box.coachFact.rows).toHaveLength(5);
  });
});

describe('IDOR — a fact id is not a capability', () => {
  it("client 42 cannot correct client 43's fact by addressing it through 42", async () => {
    const res = await as(42).post('/api/coach/memory/42/facts/201/correct').send({
      category: 'preference',
      statement: 'rewritten across the client boundary',
    });
    expect(res.status).toBe(404);

    // Nothing was written and 43's fact is untouched.
    expect(holder.box.coachFact.rows).toHaveLength(5);
    expect(factById(201).status).toBe('active');
    expect(factById(201).statement).toBe('prefers evening sessions');
  });

  it("client 42 cannot forget client 43's fact by addressing it through 42", async () => {
    const res = await as(42).post('/api/coach/memory/42/facts/201/forget').send({});
    expect(res.status).toBe(404);

    expect(holder.box.coachFact.rows).toHaveLength(5);
    expect(factById(201).status).toBe('active');
    expect(factById(201).forgottenAt).toBeNull();
    // And the other client's cached coach context was NOT invalidated.
    expect(coachContextCacheKeys().some((k) => k.split(':')[1] === '43')).toBe(true);
  });

  it("the assigned trainer of 42 cannot forget client 43's fact through 42", async () => {
    const res = await as(7).post('/api/coach/memory/42/facts/201/forget').send({});
    expect(res.status).toBe(404);
    expect(factById(201).forgottenAt).toBeNull();
  });
});

describe('the chokepoint is the shared gate, not a hand-rolled role check', () => {
  it('imports ensureClientAccess and never hand-rolls a bare client role test', () => {
    const raw = readFileSync(
      fileURLToPath(new URL('../../routes/coachMemoryRoutes.mjs', import.meta.url)),
      'utf8',
    );
    // The route's own doc comment NAMES the gates it rejects, so the negative
    // pins below must read CODE, not prose — otherwise this test fails on the
    // sentence explaining why it passes.
    const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    expect(raw.length).toBeGreaterThan(1000);
    expect(source).toContain("from '../utils/clientAccess.mjs'");
    expect(source).toContain('ensureClientAccess');
    // The looser Coach-lane gate grants an unassigned trainer with recent
    // session history; the denial matrix above requires that trainer to be denied.
    expect(source).not.toContain('checkClientAccess');
    // The launch-audit regression class: 'user' is the default self-registration
    // role, so a bare `role === 'client'` comparison silently skips it.
    expect(source).not.toMatch(/role\s*===\s*'client'/);
    // No DB model is reached except through the adopted service/policy.
    expect(source).not.toContain('getModel(');
  });
});
