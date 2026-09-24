/**
 * ============================================================================
 * FILE: notificationSettingsCoachNudgeConsent.test.mjs
 * PURPOSE: G10 consent WRITE path — packet 48's "Consent settings" row, the
 *          half of the capability the engine and the cron never had.
 *
 *          `services/coachProactiveNudgeCron.mjs:80` reads
 *          `notificationPreferences.coachProactiveNudges === true` and nothing
 *          in the tracked tree could ever set it: the key appears only in the
 *          cron and in its two unit suites. So the scheduler was live but
 *          UNREACHABLE — no client could opt in, and `=== true` meant every
 *          absent / malformed / string value stayed OFF forever.
 *
 *          This suite drives the REAL express chain (real router, real
 *          `express.json`, real `protect` where the test says so) so the
 *          consent surface is exercised, not described.
 * AUTHOR: Claude (DeepSeek Harness) | CREATED: 2026-09-13
 * ============================================================================
 *
 * ISOLATION: `config/database.mjs` loads repository env files, so `DATABASE_URL`
 * is removed and the model layer is mocked. The preload used by the runner
 * (tmp/coach-astra-hostile-20260912) additionally disables dotenv and denies
 * non-loopback TCP, so no remote database can be reached from here.
 *
 * THE ASSERTION THAT MATTERS MOST is the last describe: after a real opt-in
 * write through the route, the CRON'S OWN predicate must flip and its own tick
 * must deliver. A route that merely echoes a value back proves nothing.
 */

import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = 901;    // client-equivalent caller
const USER_ROLE_ID = 903; // 'user' — the DEFAULT self-registration role
const OTHER_ID = 902;   // a different person
const ADMIN_ID = 1;

const savedDatabaseUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL; // isolation: no remote DB target can be resolved

// The model layer is the DATABASE here; every middleware under test is real.
const holders = vi.hoisted(() => ({ User: null, WorkoutSession: null }));
vi.mock('../../models/index.mjs', () => ({
  getUser: () => holders.User,
  getWorkoutSession: () => holders.WorkoutSession,
  getModel: (name) => (name === 'User' ? holders.User : undefined),
  getAllModels: () => ({ User: holders.User }),
}));
vi.mock('../../controllers/notificationController.mjs', () => ({ createNotification: vi.fn() }));

const notificationSettingsRoutes = (await import('../../routes/notificationSettingsRoutes.mjs')).default;
const {
  hasCoachProactiveNudgeConsent,
  coachNudgeSnoozeUntil,
  runCoachProactiveNudgeTick,
} = await import('../../services/coachProactiveNudgeCron.mjs');

afterAll(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

// ── the in-memory row store the route writes and the cron reads ──────────────
let records;
let updateCalls;
let findByPkIds;

const seed = (id, over = {}) => {
  const record = {
    id, role: 'client', isActive: true, timeZone: 'UTC', notificationPreferences: null, ...over,
  };
  records.set(id, record);
  return record;
};

const prefsOf = (id) => records.get(id).notificationPreferences;

function installModels() {
  holders.User = {
    findAll: vi.fn(async () => [...records.values()]),
    findByPk: vi.fn(async (id) => {
      findByPkIds.push(Number(id));
      const record = records.get(Number(id));
      if (!record) return null;
      return {
        ...record,
        async update(values) {
          updateCalls.push({ id: record.id, values });
          Object.assign(record, values);
          return record;
        },
      };
    }),
  };
  holders.WorkoutSession = { findOne: vi.fn(async () => ({ id: 'session-1' })) };
}

// ── the app, with a switchable `protect` ────────────────────────────────────
let currentUser = null; // null = send no token and use the REAL protect

const patchedLayers = new Map();
const replacement = (req, _res, next) => { req.user = { ...currentUser }; next(); };
const walkProtect = (stack, visit) => {
  for (const layer of stack) {
    if (layer.route) {
      for (const inner of layer.route.stack) if (inner.name === 'protect') visit(inner);
    } else if (layer.handle?.stack) walkProtect(layer.handle.stack, visit);
    else if (layer.name === 'protect') visit(layer);
  }
};
walkProtect(notificationSettingsRoutes.stack, (layer) => {
  patchedLayers.set(layer, layer.handle);
  layer.handle = replacement;
});
const useRealProtect = (on) => {
  for (const [layer, original] of patchedLayers) layer.handle = on ? original : replacement;
};

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/notification-settings', notificationSettingsRoutes);
  return app;
};

const CONSENT_PATH = '/api/notification-settings/coach-nudges';

beforeEach(() => {
  vi.clearAllMocks();
  records = new Map();
  updateCalls = [];
  findByPkIds = [];
  currentUser = { id: String(USER_ID), role: 'client' };
  useRealProtect(false);
  installModels();
});

// ── the cron harness (same shape as coachProactiveNudgeSchedule.test.mjs) ────
const makeLedger = () => {
  const rows = [];
  const query = vi.fn(async (sql, { bind }) => {
    if (/^INSERT INTO nudge_dispatches/.test(sql.trim())) {
      const [userId, nudgeType, localDate] = bind;
      if (rows.some((r) => r.userId === userId && r.nudgeType === nudgeType && r.localDate === localDate)) return [];
      rows.push({ userId, nudgeType, localDate, createdAt: new Date('2026-07-15T12:00:00Z') });
      return [{ id: rows.length }];
    }
    return [];
  });
  return { rows, sequelize: { query } };
};

const runTick = async () => {
  const ledger = makeLedger();
  const notify = vi.fn(async () => ({ success: true }));
  const out = await runCoachProactiveNudgeTick({
    User: holders.User,
    WorkoutSession: holders.WorkoutSession,
    sequelize: ledger.sequelize,
    notify,
    env: { ENABLE_COACH_PROACTIVE_NUDGES: 'true' },
    now: new Date('2026-07-15T12:00:00Z'), // 12:00 UTC — outside 20:00–08:00 quiet hours
  });
  return { out, notify, ledger };
};

describe('G10 consent — the self-service path is reachable and is not shadowed', () => {
  it('a client-equivalent caller reads its own consent state', async () => {
    seed(USER_ID);
    const res = await request(makeApp()).get(CONSENT_PATH);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { coachProactiveNudges: false, coachNudgeSnoozedUntil: null },
    });
  });

  it('the admin-only `/:id` route still serves ids — the new path did not swallow it', async () => {
    currentUser = { id: String(USER_ID), role: 'client' };
    const res = await request(makeApp()).get('/api/notification-settings/42');

    // `admin` is REAL here: a non-admin is refused by the EXISTING gate.
    expect(res.status).toBe(403);
  });

  it('there is no per-id consent path — consent cannot be addressed by user id', async () => {
    seed(USER_ID);
    seed(OTHER_ID);
    const app = makeApp();

    expect((await request(app).get(`${CONSENT_PATH}/${OTHER_ID}`)).status).toBe(404);
    expect((await request(app).put(`${CONSENT_PATH}/${OTHER_ID}`).send({ coachProactiveNudges: true })).status).toBe(404);
    expect(updateCalls).toEqual([]);
  });
});

describe('G10 consent — read reflects the cron’s OWN accessors', () => {
  it('defaults OFF for a user who never opted in', async () => {
    seed(USER_ID, { notificationPreferences: { sms: true } });

    const res = await request(makeApp()).get(CONSENT_PATH);

    expect(res.body.data).toEqual({ coachProactiveNudges: false, coachNudgeSnoozedUntil: null });
  });

  it('a stored opt-in and a stored snooze are reported verbatim', async () => {
    seed(USER_ID, {
      notificationPreferences: { coachProactiveNudges: true, coachNudgeSnoozedUntil: '2026-08-01T00:00:00.000Z' },
    });

    const res = await request(makeApp()).get(CONSENT_PATH);

    expect(res.body.data).toEqual({
      coachProactiveNudges: true,
      coachNudgeSnoozedUntil: '2026-08-01T00:00:00.000Z',
    });
  });

  it('non-boolean stored junk reads as NOT opted in, and the reader agrees', async () => {
    for (const junk of ['true', 1, 'yes', {}]) {
      records = new Map();
      seed(USER_ID, { notificationPreferences: { coachProactiveNudges: junk } });

      const res = await request(makeApp()).get(CONSENT_PATH);

      expect(res.body.data.coachProactiveNudges).toBe(false);
      expect(hasCoachProactiveNudgeConsent(records.get(USER_ID))).toBe(false);
    }
  });
});

describe('G10 consent — write', () => {
  it('opts in and reports the persisted state', async () => {
    seed(USER_ID);

    const res = await request(makeApp()).put(CONSENT_PATH).send({ coachProactiveNudges: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ coachProactiveNudges: true, coachNudgeSnoozedUntil: null });
    expect(prefsOf(USER_ID)).toEqual({ coachProactiveNudges: true });
    expect(hasCoachProactiveNudgeConsent(records.get(USER_ID))).toBe(true);
  });

  it('opts back out', async () => {
    seed(USER_ID, { notificationPreferences: { coachProactiveNudges: true } });

    const res = await request(makeApp()).put(CONSENT_PATH).send({ coachProactiveNudges: false });

    expect(res.status).toBe(200);
    expect(res.body.data.coachProactiveNudges).toBe(false);
    expect(hasCoachProactiveNudgeConsent(records.get(USER_ID))).toBe(false);
  });

  it('sets a snooze as a canonical ISO instant, without touching consent', async () => {
    seed(USER_ID, { notificationPreferences: { coachProactiveNudges: true } });

    const res = await request(makeApp()).put(CONSENT_PATH).send({ coachNudgeSnoozedUntil: '2026-08-01T00:00:00Z' });

    expect(res.status).toBe(200);
    expect(prefsOf(USER_ID)).toEqual({
      coachProactiveNudges: true,
      coachNudgeSnoozedUntil: '2026-08-01T00:00:00.000Z',
    });
    expect(coachNudgeSnoozeUntil(records.get(USER_ID))).toBe('2026-08-01T00:00:00.000Z');
  });

  it('clears a snooze with null', async () => {
    seed(USER_ID, {
      notificationPreferences: { coachProactiveNudges: true, coachNudgeSnoozedUntil: '2026-08-01T00:00:00.000Z' },
    });

    const res = await request(makeApp()).put(CONSENT_PATH).send({ coachNudgeSnoozedUntil: null });

    expect(res.status).toBe(200);
    expect(prefsOf(USER_ID)).toEqual({ coachProactiveNudges: true });
    expect(coachNudgeSnoozeUntil(records.get(USER_ID))).toBeNull();
  });

  it('preserves every sibling preference field — additive only', async () => {
    const existing = {
      sms: false,
      email: true,
      push: false,
      quietHours: { start: '22:00', end: '06:00' },
      autoShareWorkoutsToFeed: true,
    };
    seed(USER_ID, { notificationPreferences: { ...existing } });
    const asRead = records.get(USER_ID).notificationPreferences;
    const asReadSnapshot = JSON.parse(JSON.stringify(asRead));

    await request(makeApp()).put(CONSENT_PATH).send({ coachProactiveNudges: true });

    expect(prefsOf(USER_ID)).toEqual({ ...existing, coachProactiveNudges: true });
    // Read-modify-write must COPY: the object the model handed back is left
    // exactly as it was read, and a different object is what gets persisted.
    expect(asRead).toEqual(asReadSnapshot);
    expect(updateCalls[0].values.notificationPreferences).not.toBe(asRead);
  });

  it('merges into a JSON-string blob the way the cron parses it', async () => {
    seed(USER_ID, { notificationPreferences: '{"sms":false,"email":true}' });

    await request(makeApp()).put(CONSENT_PATH).send({ coachProactiveNudges: true });

    expect(prefsOf(USER_ID)).toEqual({ sms: false, email: true, coachProactiveNudges: true });
  });

  it('lets the DEFAULT self-registration role `user` manage its own consent', async () => {
    // A hand-rolled `role === 'client'` check would silently skip this account.
    seed(USER_ROLE_ID, { role: 'user' });
    currentUser = { id: String(USER_ROLE_ID), role: 'user' };

    const res = await request(makeApp()).put(CONSENT_PATH).send({ coachProactiveNudges: true });

    expect(res.status).toBe(200);
    expect(hasCoachProactiveNudgeConsent(records.get(USER_ROLE_ID))).toBe(true);
  });
});

describe('G10 consent — junk is refused, never stored', () => {
  const refused = [
    ['a string "true"', { coachProactiveNudges: 'true' }],
    ['the number 1', { coachProactiveNudges: 1 }],
    ['null', { coachProactiveNudges: null }],
    ['an object', { coachProactiveNudges: {} }],
    ['a malformed timestamp', { coachNudgeSnoozedUntil: 'not-a-timestamp' }],
    ['a numeric timestamp', { coachNudgeSnoozedUntil: 1234 }],
    ['a boolean timestamp', { coachNudgeSnoozedUntil: true }],
    ['an empty body', {}],
    ['an unrelated preference', { sms: true }],
    ['a whole notificationPreferences blob', { notificationPreferences: { coachProactiveNudges: true } }],
  ];

  it.each(refused)('refuses %s', async (_label, body) => {
    seed(USER_ID, { notificationPreferences: { sms: false } });

    const res = await request(makeApp()).put(CONSENT_PATH).send(body);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(updateCalls).toEqual([]);                       // nothing was written
    expect(prefsOf(USER_ID)).toEqual({ sms: false });      // nor was anything mutated
    expect(hasCoachProactiveNudgeConsent(records.get(USER_ID))).toBe(false);
  });
});

describe('G10 consent — authorization', () => {
  it('an unauthenticated call is refused by the REAL protect middleware', async () => {
    seed(USER_ID);
    useRealProtect(true);
    const app = makeApp();

    const read = await request(app).get(CONSENT_PATH);
    const write = await request(app).put(CONSENT_PATH).send({ coachProactiveNudges: true });

    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
    // Pin WHICH layer refused. The handler also fails closed on a missing
    // `req.user`, so a bare 401 assertion would still pass with `protect`
    // deleted from the route — this message is the middleware's own reply.
    expect(read.body.message).toBe('Not authorized, no token');
    expect(write.body.message).toBe('Not authorized, no token');
    expect(updateCalls).toEqual([]);
    expect(prefsOf(USER_ID)).toBeNull();
  });

  it('a caller cannot read someone else’s consent, even by asking for it', async () => {
    seed(USER_ID, { notificationPreferences: { coachProactiveNudges: false } });
    seed(OTHER_ID, { notificationPreferences: { coachProactiveNudges: true } });

    const res = await request(makeApp()).get(`${CONSENT_PATH}?userId=${OTHER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.coachProactiveNudges).toBe(false); // the caller's own state
    expect(findByPkIds).not.toContain(OTHER_ID);
  });

  it('a caller cannot write someone else’s consent, even by naming them in the body', async () => {
    seed(USER_ID);
    seed(OTHER_ID);

    const res = await request(makeApp())
      .put(CONSENT_PATH)
      .send({ userId: OTHER_ID, coachProactiveNudges: true });

    expect(res.status).toBe(400);
    expect(updateCalls).toEqual([]);
    expect(prefsOf(OTHER_ID)).toBeNull();
    expect(prefsOf(USER_ID)).toBeNull();
  });

  it('a caller-supplied subject id in the query is IGNORED, not honoured', async () => {
    // The body vector above is refused by the field allowlist before any id is
    // used, so on its own it cannot prove the subject is `req.user.id`. This one
    // passes validation and therefore isolates the self-scoping guard: were the
    // handler to trust `req.query.userId`, the other account would be written.
    seed(USER_ID);
    seed(OTHER_ID);

    const res = await request(makeApp())
      .put(`${CONSENT_PATH}?userId=${OTHER_ID}`)
      .send({ coachProactiveNudges: true });

    expect(res.status).toBe(200);
    expect(prefsOf(USER_ID)).toEqual({ coachProactiveNudges: true });
    expect(prefsOf(OTHER_ID)).toBeNull();
    expect(updateCalls.map((call) => call.id)).toEqual([USER_ID]);
    expect(findByPkIds).not.toContain(OTHER_ID);
  });
});

describe('G10 consent — END-TO-END: the write path reaches the cron’s reader', () => {
  it('the cron predicate and a real tick delivery both flip ONLY after the opt-in write', async () => {
    // A client with training evidence, not yet opted in.
    seed(USER_ID, { role: 'client', timeZone: 'UTC', notificationPreferences: { sms: false } });

    // 1. BEFORE — the cron refuses, on its own predicate, with no route involved.
    expect(hasCoachProactiveNudgeConsent(records.get(USER_ID))).toBe(false);
    const before = await runTick();
    expect(before.out.nudged).toBe(0);
    expect(before.notify).not.toHaveBeenCalled();

    // 2. The real HTTP opt-in, through the real router and handler.
    const res = await request(makeApp()).put(CONSENT_PATH).send({ coachProactiveNudges: true });
    expect(res.status).toBe(200);

    // 3. AFTER — the SAME predicate the cron uses now reads the STORED row.
    expect(hasCoachProactiveNudgeConsent(records.get(USER_ID))).toBe(true);

    // 4. …and the cron's own tick, driven only by that stored row, delivers.
    const after = await runTick();
    expect(after.out.nudged).toBe(1);
    expect(after.notify).toHaveBeenCalledTimes(1);
    expect(after.notify.mock.calls[0][0]).toMatchObject({ userId: USER_ID, type: 'coach_proactive' });
    expect(after.ledger.rows).toHaveLength(1);
    expect(prefsOf(USER_ID)).toEqual({ sms: false, coachProactiveNudges: true });
  });

  it('an opt-out write switches delivery back off through the same path', async () => {
    seed(USER_ID, { role: 'client', timeZone: 'UTC', notificationPreferences: { coachProactiveNudges: true } });

    const res = await request(makeApp()).put(CONSENT_PATH).send({ coachProactiveNudges: false });

    expect(res.status).toBe(200);
    expect(hasCoachProactiveNudgeConsent(records.get(USER_ID))).toBe(false);
    const after = await runTick();
    expect(after.out.nudged).toBe(0);
    expect(after.notify).not.toHaveBeenCalled();
  });
});

describe('G10 consent — the guards are in the code, not only in the tests', () => {
  it('registers the consent path BEFORE the admin `/:id` route', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('../../routes/notificationSettingsRoutes.mjs', import.meta.url), 'utf8');

    const consentAt = source.indexOf("'/coach-nudges'");
    const idAt = source.indexOf("router.get('/:id'");

    expect(consentAt).toBeGreaterThan(-1);
    expect(idAt).toBeGreaterThan(-1);
    expect(consentAt).toBeLessThan(idAt); // reverse them and the client gets the admin 403
  });

  it('never hand-rolls a requester role comparison in the consent handler', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(
      new URL('../../controllers/notificationSettingsController.mjs', import.meta.url), 'utf8',
    ).replace(/\r\n/g, '\n');

    expect(source).not.toMatch(/role\s*[!=]==\s*'client'/);
  });
});
