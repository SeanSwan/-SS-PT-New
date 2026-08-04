/**
 * equipmentRoutes S4 — all-roles ownership + IDOR/authz regression suite.
 * ============================================================================
 * S4 replaced the blanket `authorize(['admin','trainer'])` guard with
 * per-route policy: any authenticated role gets in, every handler enforces
 * per-row ownership (profile.trainerId === req.user.id — trainerId is the
 * GENERIC owner id since migration 20260804120000 — or role 'admin').
 * These tests lock the new policy surface:
 *   - client/user read/write their OWN rows only (cross-owner = 403)
 *   - trainers get READ-ONLY access to actively assigned clients' profiles
 *     (GET only; PUT/DELETE on an assigned client's profile still 403)
 *   - client/user creation: locationType home|park|custom only, max 3 active
 *     profiles, ownerRole stamped from the requester's role
 *   - scan rate limit: 5/hr for client/user, 10/hr for trainer/admin
 *   - default-profile auto-seed fires for trainer/admin own-list only —
 *     clients/users start empty, cross-owner views never seed
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: { id: 10, role: 'trainer' },
  equipmentProfile: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    bulkCreate: vi.fn(),
  },
  equipmentItem: { findAll: vi.fn(), findOne: vi.fn(), count: vi.fn(), create: vi.fn() },
  assignment: { findOne: vi.fn() },
  transaction: vi.fn(),
  scan: { isEquipmentScanConfigured: vi.fn(), scanEquipmentImageMulti: vi.fn() },
  matchExistingEquipment: vi.fn(),
  persistReview: vi.fn(),
  uploadPhoto: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...mocks.currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getEquipmentProfile: () => mocks.equipmentProfile,
  getEquipmentItem: () => mocks.equipmentItem,
  getEquipmentExerciseMap: () => ({}),
  getClientTrainerAssignment: () => mocks.assignment,
}));

vi.mock('../../database.mjs', () => ({ default: { transaction: mocks.transaction } }));

vi.mock('../../services/equipmentScanService.mjs', () => ({
  isEquipmentScanConfigured: mocks.scan.isEquipmentScanConfigured,
  scanEquipmentImageMulti: mocks.scan.scanEquipmentImageMulti,
}));

vi.mock('../../services/equipmentScanV2Support.mjs', () => ({
  matchExistingEquipment: mocks.matchExistingEquipment,
}));

vi.mock('../../services/equipmentScanReviewPersistence.mjs', () => ({
  persistEquipmentScanReviewSession: mocks.persistReview,
}));

vi.mock('../../services/equipmentScanReviewOutcomeService.mjs', () => ({
  recordEquipmentScanCandidateAction: vi.fn(),
  recordEquipmentScanCandidateReview: vi.fn(),
}));

vi.mock('../../services/photoStorageService.mjs', () => ({ uploadPhoto: mocks.uploadPhoto }));

const equipmentRoutes = (await import('../../routes/equipmentRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/equipment-profiles', equipmentRoutes);
  return app;
}

function postScan(profileId) {
  return request(makeApp())
    .post(`/api/equipment-profiles/${profileId}/scan`)
    .attach('photo', Buffer.from('fake-image-bytes'), { filename: 'gym.jpg', contentType: 'image/jpeg' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentUser = { id: 10, role: 'trainer' };
  mocks.equipmentProfile.findByPk.mockResolvedValue(null);
  mocks.equipmentProfile.findAll.mockResolvedValue([]);
  mocks.equipmentProfile.findOne.mockResolvedValue(null); // no duplicate name
  mocks.equipmentProfile.count.mockResolvedValue(0);
  mocks.equipmentProfile.create.mockImplementation(async (values) => ({ id: 900, ...values }));
  mocks.equipmentProfile.bulkCreate.mockResolvedValue([]);
  mocks.equipmentItem.findAll.mockResolvedValue([]);
  mocks.assignment.findOne.mockResolvedValue(null); // no active assignment
  mocks.scan.isEquipmentScanConfigured.mockReturnValue(true);
  // Rate-limit tests only need attempts to CONSUME quota; a 'could not
  // identify' rejection maps to 422 without touching further mocks.
  mocks.scan.scanEquipmentImageMulti.mockRejectedValue(new Error('AI could not identify the equipment'));
});

describe('S4 profile read ownership (per-row, any role)', () => {
  it('client reads their OWN profile → 200', async () => {
    mocks.currentUser = { id: 21, role: 'client' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 7, trainerId: 21, isActive: true });

    const res = await request(makeApp()).get('/api/equipment-profiles/7');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("client reads ANOTHER owner's profile → 403 (assignment path not consulted)", async () => {
    mocks.currentUser = { id: 21, role: 'client' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 8, trainerId: 99, isActive: true });

    const res = await request(makeApp()).get('/api/equipment-profiles/8');

    expect(res.status).toBe(403);
    // Read-through is a TRAINER-only privilege — clients never get it.
    expect(mocks.assignment.findOne).not.toHaveBeenCalled();
  });

  it("user reads ANOTHER owner's profile → 403", async () => {
    mocks.currentUser = { id: 22, role: 'user' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 8, trainerId: 99, isActive: true });

    const res = await request(makeApp()).get('/api/equipment-profiles/8');

    expect(res.status).toBe(403);
    expect(mocks.assignment.findOne).not.toHaveBeenCalled();
  });

  it('admin reads any profile → 200', async () => {
    mocks.currentUser = { id: 1, role: 'admin' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 7, trainerId: 55, isActive: true });

    const res = await request(makeApp()).get('/api/equipment-profiles/7');

    expect(res.status).toBe(200);
    expect(mocks.assignment.findOne).not.toHaveBeenCalled();
  });
});

describe('S4 trainer read-only access to assigned clients', () => {
  it("trainer reads an ASSIGNED client's profile → 200 (canonical active-assignment filter)", async () => {
    mocks.currentUser = { id: 10, role: 'trainer' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 7, trainerId: 55, isActive: true });
    mocks.assignment.findOne.mockResolvedValue({ id: 301 });

    const res = await request(makeApp()).get('/api/equipment-profiles/7');

    expect(res.status).toBe(200);
    expect(mocks.assignment.findOne).toHaveBeenCalledWith({
      where: { trainerId: 10, clientId: 55, status: 'active' },
    });
  });

  it("trainer reads an UNASSIGNED client's profile → 403", async () => {
    mocks.currentUser = { id: 10, role: 'trainer' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 7, trainerId: 66, isActive: true });
    mocks.assignment.findOne.mockResolvedValue(null);

    const res = await request(makeApp()).get('/api/equipment-profiles/7');

    expect(res.status).toBe(403);
  });

  it("trainer PUT on an assigned client's profile → 403 (read-only means READ only)", async () => {
    mocks.currentUser = { id: 10, role: 'trainer' };
    const update = vi.fn();
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 7, trainerId: 55, isActive: true, isDefault: false, name: 'Home', update });
    mocks.assignment.findOne.mockResolvedValue({ id: 301 }); // assigned — must STILL be denied

    const res = await request(makeApp()).put('/api/equipment-profiles/7').send({ name: 'Hijacked' });

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
    // Write paths never even consult the assignment table.
    expect(mocks.assignment.findOne).not.toHaveBeenCalled();
  });

  it("trainer DELETE on an assigned client's profile → 403", async () => {
    mocks.currentUser = { id: 10, role: 'trainer' };
    const update = vi.fn();
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 7, trainerId: 55, isActive: true, isDefault: false, update });
    mocks.assignment.findOne.mockResolvedValue({ id: 301 });

    const res = await request(makeApp()).delete('/api/equipment-profiles/7');

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("trainer LISTS an assigned client's profiles via ?trainerId → 200 and never seeds defaults", async () => {
    mocks.currentUser = { id: 10, role: 'trainer' };
    mocks.assignment.findOne.mockResolvedValue({ id: 301 });
    mocks.equipmentProfile.findAll.mockResolvedValue([]);

    const res = await request(makeApp()).get('/api/equipment-profiles?trainerId=55');

    expect(res.status).toBe(200);
    expect(res.body.profiles).toEqual([]);
    expect(mocks.equipmentProfile.bulkCreate).not.toHaveBeenCalled();
  });

  it('client requesting ?trainerId=<someone else> → 403', async () => {
    mocks.currentUser = { id: 21, role: 'client' };

    const res = await request(makeApp()).get('/api/equipment-profiles?trainerId=99');

    expect(res.status).toBe(403);
    expect(mocks.assignment.findOne).not.toHaveBeenCalled();
  });
});

describe('S4 limited-owner creation policy (client/user)', () => {
  it('client creating a 4th active profile → 409 cap', async () => {
    mocks.currentUser = { id: 21, role: 'client' };
    mocks.equipmentProfile.count.mockResolvedValue(3);

    const res = await request(makeApp()).post('/api/equipment-profiles').send({ name: 'Garage' });

    expect(res.status).toBe(409);
    expect(mocks.equipmentProfile.count).toHaveBeenCalledWith({
      where: { trainerId: 21, isActive: true },
    });
    expect(mocks.equipmentProfile.create).not.toHaveBeenCalled();
  });

  it("client creating locationType 'gym' → 400", async () => {
    mocks.currentUser = { id: 21, role: 'client' };

    const res = await request(makeApp()).post('/api/equipment-profiles').send({ name: 'Big Box', locationType: 'gym' });

    expect(res.status).toBe(400);
    expect(mocks.equipmentProfile.create).not.toHaveBeenCalled();
  });

  it("user creating locationType 'gym' → 400", async () => {
    mocks.currentUser = { id: 22, role: 'user' };

    const res = await request(makeApp()).post('/api/equipment-profiles').send({ name: 'Big Box', locationType: 'gym' });

    expect(res.status).toBe(400);
    expect(mocks.equipmentProfile.create).not.toHaveBeenCalled();
  });

  it('user creating a 4th active profile → 409 cap', async () => {
    mocks.currentUser = { id: 22, role: 'user' };
    mocks.equipmentProfile.count.mockResolvedValue(3);

    const res = await request(makeApp()).post('/api/equipment-profiles').send({ name: 'Garage' });

    expect(res.status).toBe(409);
    expect(mocks.equipmentProfile.create).not.toHaveBeenCalled();
  });

  it("client under the cap creates 201 with ownerRole 'client' stamped from the session role", async () => {
    mocks.currentUser = { id: 21, role: 'client' };
    mocks.equipmentProfile.count.mockResolvedValue(2);

    const res = await request(makeApp()).post('/api/equipment-profiles').send({ name: 'My Home Setup', locationType: 'home' });

    expect(res.status).toBe(201);
    expect(mocks.equipmentProfile.create).toHaveBeenCalledWith(expect.objectContaining({
      trainerId: 21,
      ownerRole: 'client',
      locationType: 'home',
      isDefault: false,
    }));
  });

  it("trainer creation is unchanged: no cap check, 'gym' allowed, ownerRole 'trainer'", async () => {
    mocks.currentUser = { id: 10, role: 'trainer' };

    const res = await request(makeApp()).post('/api/equipment-profiles').send({ name: 'Downtown Gym', locationType: 'gym' });

    expect(res.status).toBe(201);
    expect(mocks.equipmentProfile.count).not.toHaveBeenCalled();
    expect(mocks.equipmentProfile.create).toHaveBeenCalledWith(expect.objectContaining({
      trainerId: 10,
      ownerRole: 'trainer',
      locationType: 'gym',
    }));
  });

  it("client can't sidestep the location subset via PUT: locationType 'gym' update → 400", async () => {
    mocks.currentUser = { id: 21, role: 'client' };
    const update = vi.fn();
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 7, trainerId: 21, isActive: true, isDefault: false, name: 'Home', update });

    const res = await request(makeApp()).put('/api/equipment-profiles/7').send({ locationType: 'gym' });

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('S4 scan rate limit by role (shared limiter, per-role budget)', () => {
  it('client is capped at 5 scans/hr — 6th attempt is 429 and never reaches the AI service', async () => {
    mocks.currentUser = { id: 501, role: 'client' }; // unique id: limiter state is module-global
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 5, trainerId: 501, isActive: true });

    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const res = await postScan(5);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5)).toEqual([422, 422, 422, 422, 422]); // attempts consumed quota
    expect(statuses[5]).toBe(429);
    expect(mocks.scan.scanEquipmentImageMulti).toHaveBeenCalledTimes(5);

    const last = await postScan(5); // stays 429 once tripped
    expect(last.status).toBe(429);
    expect(last.body.error).toBe('Rate limit exceeded. Maximum 5 scans per hour.');
  });

  it('trainer keeps the 10/hr budget — 11th attempt is the first 429', async () => {
    mocks.currentUser = { id: 502, role: 'trainer' };
    mocks.equipmentProfile.findByPk.mockResolvedValue({ id: 6, trainerId: 502, isActive: true });

    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const res = await postScan(6);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(422)); // 6th did NOT trip at the client cap
    expect(statuses[10]).toBe(429);
    expect(mocks.scan.scanEquipmentImageMulti).toHaveBeenCalledTimes(10);

    const last = await postScan(6);
    expect(last.body.error).toBe('Rate limit exceeded. Maximum 10 scans per hour.');
  });
});

describe('S4 default-profile auto-seed gating', () => {
  it('trainer with zero profiles still gets the default seed on first list', async () => {
    mocks.currentUser = { id: 601, role: 'trainer' };
    mocks.equipmentProfile.findAll
      .mockResolvedValueOnce([]) // pre-seed filtered query
      .mockResolvedValueOnce([{ id: 1, name: 'Move Fitness' }]); // post-seed re-query
    mocks.equipmentProfile.count.mockResolvedValue(0);

    const res = await request(makeApp()).get('/api/equipment-profiles');

    expect(res.status).toBe(200);
    expect(mocks.equipmentProfile.bulkCreate).toHaveBeenCalledTimes(1);
    const seeded = mocks.equipmentProfile.bulkCreate.mock.calls[0][0];
    expect(seeded).toHaveLength(4);
    for (const row of seeded) {
      expect(row).toEqual(expect.objectContaining({ trainerId: 601, ownerRole: 'trainer', isDefault: true }));
    }
    expect(res.body.profiles).toEqual([{ id: 1, name: 'Move Fitness' }]);
  });

  it('client with zero profiles starts EMPTY — no default seed', async () => {
    mocks.currentUser = { id: 602, role: 'client' };
    mocks.equipmentProfile.findAll.mockResolvedValue([]);
    mocks.equipmentProfile.count.mockResolvedValue(0);

    const res = await request(makeApp()).get('/api/equipment-profiles');

    expect(res.status).toBe(200);
    expect(res.body.profiles).toEqual([]);
    expect(mocks.equipmentProfile.bulkCreate).not.toHaveBeenCalled();
  });

  it('user with zero profiles starts EMPTY — no default seed', async () => {
    mocks.currentUser = { id: 603, role: 'user' };
    mocks.equipmentProfile.findAll.mockResolvedValue([]);
    mocks.equipmentProfile.count.mockResolvedValue(0);

    const res = await request(makeApp()).get('/api/equipment-profiles');

    expect(res.status).toBe(200);
    expect(res.body.profiles).toEqual([]);
    expect(mocks.equipmentProfile.bulkCreate).not.toHaveBeenCalled();
  });
});
