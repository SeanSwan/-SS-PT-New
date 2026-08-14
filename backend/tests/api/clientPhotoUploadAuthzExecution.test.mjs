/**
 * ============================================================================
 * FILE: clientPhotoUploadAuthzExecution.test.mjs
 * PURPOSE: Drive POST /api/profile/clients/:clientId/photo and prove the
 *          fail-closed gate holds — including under the STRING actor id that
 *          production actually supplies.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-14 (executed-authz coverage slice)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The eighth and last handler the IDOR audit clears only INDIRECTLY, via
 * `controller profileController.mjs:uploadClientPhoto`. It writes to another
 * user's record and pushes bytes to R2, so an authorization miss here costs
 * storage and corrupts a client's profile, not just a read.
 *
 * THE STRING-ID ANGLE — the reason this needs EXECUTION, not inspection
 * `checkClientAccess` decides self-access with a strict `user.id === clientId`,
 * where clientId has been through `parseContextClientId` and is therefore a
 * NUMBER. Production's `protect` sets `req.user = { id: toStringId(user.id) }`
 * (authMiddleware.mjs:356-357) — a STRING. `'901' === 901` is false, so the
 * `self` branch cannot fire in production no matter who calls it.
 *
 * That is safe here, and this file pins WHY it is safe rather than assuming it:
 * a client/user role is refused by the `not_self` branch immediately below, so
 * the dead `self` branch changes nothing for them. But the same string/number
 * mismatch in a guard that compared the other way round would be a lockout, and
 * in a guard that used `==` would be a hole. Every test below therefore runs the
 * actor id as a STRING, the way the real middleware delivers it. A suite that
 * used numeric ids would be testing a request shape that never occurs.
 *
 * SUBJECT vs SCAFFOLD: `checkClientAccess` and its SQL are the subject and stay
 * real. Storage, models and auth middleware are stubbed — the gate runs BEFORE
 * `req.file` is inspected, so a denial cannot be a missing-file rejection in
 * disguise, and no upload is needed to prove one.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CLIENT_B_ID = 902;
const TRAINER_ID = 700;

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  findByPk: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}));

// `User.sequelize` is what checkClientAccess runs the assignment lookup through.
const sequelizeStub = { query: mocks.query, QueryTypes: { SELECT: 'SELECT' } };

vi.mock('../../models/User.mjs', () => ({
  default: { sequelize: sequelizeStub, findByPk: mocks.findByPk },
}));

vi.mock('../../models/social/index.mjs', () => ({ SocialPost: {}, Friendship: {} }));
vi.mock('../../models/UserAchievement.mjs', () => ({ default: {} }));
vi.mock('../../models/Achievement.mjs', () => ({ default: {} }));

vi.mock('../../services/photoStorageService.mjs', () => ({
  uploadPhoto: mocks.uploadPhoto,
  deletePhoto: mocks.deletePhoto,
}));

let currentUser = { id: '901', role: 'client' };
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  // Mirrors production: id arrives as a STRING, never a number.
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
  authorizeResourceAccess: () => (_req, _res, next) => next(),
  rateLimiter: () => (_req, _res, next) => next(),
}));

const profileRoutes = (await import('../../routes/profileRoutes.mjs')).default;

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/profile', profileRoutes);
  return a;
}

const upload = (clientId) =>
  request(app())
    .post(`/api/profile/clients/${clientId}/photo`)
    .attach('profilePhoto', Buffer.from('fake-jpeg-bytes'), 'headshot.jpg');

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: '901', role: 'client' };
  mocks.query.mockResolvedValue([]);            // no assignment, no shared session
  mocks.findByPk.mockResolvedValue({ id: CLIENT_B_ID, photo: null, update: vi.fn() });
  mocks.uploadPhoto.mockResolvedValue({ url: 'https://r2.test/p.jpg', storageKey: 'p.jpg' });
  mocks.deletePhoto.mockResolvedValue(undefined);
});

describe('client photo upload is fail-closed against the wrong actor', () => {
  it('a client cannot upload a photo onto another client', async () => {
    currentUser = { id: '901', role: 'client' };
    const res = await upload(CLIENT_B_ID);

    expect(res.status).toBe(403);
    // The gate must fire before any byte reaches storage — a denial that still
    // uploaded would cost money and leave an orphan object in R2.
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
    expect(mocks.findByPk).not.toHaveBeenCalled();
  });

  it('a plain `user` is refused the same way', async () => {
    currentUser = { id: '903', role: 'user' };
    const res = await upload(CLIENT_B_ID);

    expect(res.status).toBe(403);
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it('an UNASSIGNED trainer is refused, and the refusal survives an empty SQL result', async () => {
    currentUser = { id: String(TRAINER_ID), role: 'trainer' };
    mocks.query.mockResolvedValue([]);
    const res = await upload(CLIENT_B_ID);

    expect(res.status).toBe(403);
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it('a trainer is refused when the assignment lookup THROWS (fails closed, not open)', async () => {
    currentUser = { id: String(TRAINER_ID), role: 'trainer' };
    mocks.query.mockRejectedValue(new Error('connection reset'));
    const res = await upload(CLIENT_B_ID);

    expect(res.status).toBe(403);
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it('an unrecognised role is refused before the DB is consulted at all', async () => {
    currentUser = { id: '904', role: 'affiliate' };
    const res = await upload(CLIENT_B_ID);

    expect(res.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it('the assignment lookup is parameterised and scoped to BOTH ids plus active status', async () => {
    // A query missing clientId would clear a trainer against every client alive;
    // string interpolation instead of :replacements would be an injection point.
    currentUser = { id: String(TRAINER_ID), role: 'trainer' };
    await upload(CLIENT_B_ID);

    expect(mocks.query).toHaveBeenCalled();
    const [sql, options] = mocks.query.mock.calls[0];
    expect(sql).toContain(':trainerId');
    expect(sql).toContain(':clientId');
    expect(sql).toContain("status = 'active'");
    expect(options.replacements).toEqual(
      expect.objectContaining({ trainerId: String(TRAINER_ID), clientId: CLIENT_B_ID }),
    );
  });

  it('CONTROL — an ASSIGNED trainer CAN upload (the denials above are not blanket)', async () => {
    currentUser = { id: String(TRAINER_ID), role: 'trainer' };
    mocks.query.mockResolvedValue([{ '?column?': 1 }]); // one active assignment row
    const res = await upload(CLIENT_B_ID);

    expect(res.status).toBeLessThan(400);
    expect(mocks.uploadPhoto).toHaveBeenCalled();
  });

  it('CONTROL — an admin CAN upload without any assignment', async () => {
    currentUser = { id: '1', role: 'admin' };
    mocks.query.mockResolvedValue([]);
    const res = await upload(CLIENT_B_ID);

    expect(res.status).toBeLessThan(400);
    expect(mocks.uploadPhoto).toHaveBeenCalled();
  });

  /**
   * CRAFTED IDS — and what actually stops them.
   *
   * `parseContextClientId` is strict (/^[1-9]\d*$/), but on THIS route it never
   * sees the raw string: uploadClientPhoto does `Number(req.params.clientId)`
   * first (profileController.mjs:39) and hands the guard a number. Measured:
   *
   *   "0902" "+902" "902.0" "0x386" " 902" "902 "  ->  902   (reach the guard)
   *   "9e2"                                        ->  900   (A DIFFERENT USER)
   *   "902abc"                                     ->  NaN   -> 400 at controller
   *   "-902"                                       -> -902   -> 400 at controller
   *
   * So six spellings of "902" are the same endpoint as far as authorization is
   * concerned, and `9e2` silently addresses user 900. What refuses all of them is
   * the ROLE/OWNERSHIP check, not the id parser — which is worth stating plainly,
   * because it means any future "fast path" that skipped the ownership check for
   * a self-looking id would make this loose coercion immediately exploitable.
   * These assertions therefore pin the denial, and the two-bucket split below
   * pins WHERE it comes from, so a regression cannot quietly move between them.
   */
  const COERCED_TO_A_REAL_ID = ['0902', ' 902', '902 ', '+902', '902.0', '9e2', '0x386'];
  const REJECTED_BY_CONTROLLER = ['902abc', '-902'];

  const craftedUpload = (raw) =>
    request(app())
      .post(`/api/profile/clients/${encodeURIComponent(raw)}/photo`)
      .attach('profilePhoto', Buffer.from('fake-jpeg-bytes'), 'headshot.jpg');

  it.each(COERCED_TO_A_REAL_ID)('id %j reaches the guard and is refused there (403)', async (raw) => {
    currentUser = { id: '901', role: 'client' };
    const res = await craftedUpload(raw);

    expect(res.status).toBe(403);
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });

  it.each(REJECTED_BY_CONTROLLER)('id %j never gets as far as the guard (400)', async (raw) => {
    currentUser = { id: '901', role: 'client' };
    const res = await craftedUpload(raw);

    expect(res.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.uploadPhoto).not.toHaveBeenCalled();
  });
});
